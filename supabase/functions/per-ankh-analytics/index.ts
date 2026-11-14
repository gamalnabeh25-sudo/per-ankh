import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_ANON_KEY = Deno.env.get("SUPABASE_ANON_KEY")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const SITE_ORIGIN = "https://per-ankh-egypt.vercel.app";
const cors = {
  "Access-Control-Allow-Origin": SITE_ORIGIN,
  "Access-Control-Allow-Headers": "authorization, apikey, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Vary": "Origin",
};
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const service = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const authClient = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function getCaller(req: Request): Promise<string | null> {
  const bearer = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!bearer || bearer === SUPABASE_ANON_KEY || bearer.startsWith("sb_publishable_")) return null;
  const { data, error } = await authClient.auth.getUser(bearer);
  if (error || !data.user) throw new Error("Invalid session");
  return data.user.id;
}

async function isRateLimited(key: string, maxRequests: number): Promise<boolean> {
  const { data, error } = await service.rpc("consume_analytics_rate_limit", {
    p_rate_key: key,
    p_window_seconds: 60,
    p_max_requests: maxRequests,
  });
  if (error) throw new Error("Rate limiter unavailable");
  return data !== true;
}

async function adminAnalytics(userId: string) {
  const { data: role, error: roleError } = await service
    .from("user_roles").select("role").eq("user_id", userId).maybeSingle();
  if (roleError || role?.role !== "admin") throw new Error("Admin access required");

  const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const onlineSince = new Date(Date.now() - 90 * 1000).toISOString();
  const [sessionsCount, viewsCount, activeCount, activeGuestsCount, activeResult, viewResult] = await Promise.all([
    service.from("site_sessions").select("session_id", { count: "exact", head: true }),
    service.from("site_page_views").select("id", { count: "exact", head: true }),
    service.from("site_sessions").select("session_id", { count: "exact", head: true }).is("ended_at", null).gte("last_seen", onlineSince),
    service.from("site_sessions").select("session_id", { count: "exact", head: true }).is("ended_at", null).is("user_id", null).gte("last_seen", onlineSince),
    service.from("site_sessions").select("session_id,visitor_id,user_id,current_path,last_seen,started_at")
      .is("ended_at", null).gte("last_seen", onlineSince).order("last_seen", { ascending: false }).limit(250),
    service.from("site_page_views").select("visitor_id,path,viewed_at")
      .gte("viewed_at", since).order("viewed_at", { ascending: false }).limit(10000),
  ]);
  if (sessionsCount.error || viewsCount.error || activeCount.error || activeGuestsCount.error || activeResult.error || viewResult.error) {
    throw new Error("Analytics query failed");
  }

  const active = activeResult.data || [];
  const activeUserIds = [...new Set(active.map((s: any) => s.user_id).filter(Boolean))] as string[];
  const viewRows = viewResult.data || [];
  const uniqueVisitors30d = new Set(viewRows.map((v: any) => v.visitor_id));
  const pages = new Map<string, number>();
  for (const row of viewRows) pages.set(row.path, (pages.get(row.path) || 0) + 1);

  const profiles = activeUserIds.length
    ? await service.from("profiles").select("id,display_name").in("id", activeUserIds)
    : { data: [], error: null };
  if (profiles.error) throw new Error("Could not load active profiles");
  const profileMap = new Map((profiles.data || []).map((p: any) => [p.id, p.display_name]));

  // Fetch only currently online account records; never enumerate the full user directory.
  const userRecords = await Promise.all(activeUserIds.map(async (id) => {
    const { data, error } = await service.auth.admin.getUserById(id);
    if (error) return [id, ""] as const;
    return [id, data.user?.email || ""] as const;
  }));
  const emailMap = new Map(userRecords);

  const onlineUsers = activeUserIds.map((id) => {
    const session = active.find((s: any) => s.user_id === id);
    return {
      id,
      name: profileMap.get(id) || "عضو مسجل",
      email: emailMap.get(id) || "",
      last_seen: session?.last_seen || null,
      current_path: session?.current_path || "/",
    };
  });
  const topPages = [...pages.entries()]
    .map(([path, views]) => ({ path, views }))
    .sort((a, b) => b.views - a.views).slice(0, 10);

  return {
    online_sessions: activeCount.count || 0,
    online_registered: activeUserIds.length,
    online_guests: activeGuestsCount.count || 0,
    total_visits: sessionsCount.count || 0,
    total_page_views: viewsCount.count || 0,
    unique_visitors_30d: uniqueVisitors30d.size,
    unique_visitors_sampled: viewRows.length >= 10000,
    top_pages_30d: topPages,
    online_users: onlineUsers,
    online_users_limited: active.length >= 250,
    updated_at: new Date().toISOString(),
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return Response.json({ error: "Method not allowed" }, { status: 405, headers: cors });
  if (req.headers.get("origin") !== SITE_ORIGIN) return Response.json({ error: "Origin not allowed" }, { status: 403, headers: cors });

  let rawBody: string;
  try {
    rawBody = await req.text();
    if (new TextEncoder().encode(rawBody).length > 4096) {
      return Response.json({ error: "Payload too large" }, { status: 413, headers: cors });
    }
  } catch {
    return Response.json({ error: "Invalid request body" }, { status: 400, headers: cors });
  }

  let body: any;
  try { body = JSON.parse(rawBody); } catch {
    return Response.json({ error: "Invalid JSON" }, { status: 400, headers: cors });
  }

  let userId: string | null;
  try { userId = await getCaller(req); } catch {
    return Response.json({ error: "Invalid session" }, { status: 401, headers: cors });
  }

  if (body?.action === "admin_analytics") {
    if (!userId) return Response.json({ error: "Sign-in required" }, { status: 401, headers: cors });
    try {
      if (await isRateLimited("admin:" + userId, 30)) {
        return Response.json({ error: "Too many requests" }, { status: 429, headers: cors });
      }
      return Response.json(await adminAnalytics(userId), { headers: cors });
    } catch (e) {
      const message = e instanceof Error ? e.message : "Analytics unavailable";
      const status = message === "Admin access required" ? 403 : message === "Rate limiter unavailable" ? 503 : 500;
      return Response.json({ error: message }, { status, headers: cors });
    }
  }

  const { action, session_id, visitor_id } = body ?? {};
  if (!["heartbeat", "pageview", "end"].includes(action) ||
      !uuidPattern.test(session_id ?? "") || !uuidPattern.test(visitor_id ?? "")) {
    return Response.json({ error: "Invalid tracking request" }, { status: 400, headers: cors });
  }

  try {
    const limit = action === "pageview" ? 30 : action === "heartbeat" ? 90 : 3;
    if (await isRateLimited("track:" + action + ":" + session_id + ":" + visitor_id, limit)) {
      return Response.json({ error: "Too many requests" }, { status: 429, headers: cors });
    }
  } catch {
    return Response.json({ error: "Tracking temporarily unavailable" }, { status: 503, headers: cors });
  }

  // Guest sessions expire by inactivity; an unauthenticated caller cannot close another user's session.
  if (action === "end") {
    if (userId) {
      const now = new Date().toISOString();
      const { error } = await service.from("site_sessions")
        .update({ ended_at: now, last_seen: now })
        .eq("session_id", session_id).eq("visitor_id", visitor_id).eq("user_id", userId);
      if (error) return Response.json({ error: "Could not close session" }, { status: 500, headers: cors });
    }
    return Response.json({ ok: true }, { headers: cors });
  }

  const path = typeof body.path === "string" ? body.path.trim() : "/";
  const authMaterialPattern = /(?:access_token|refresh_token|id_token|provider_token|code=|state=|error_description|expires_in|scope=)/i;
  if (!path.startsWith("/") || path.startsWith("//") || path.length > 240 ||
      /[?#]/.test(path) || authMaterialPattern.test(path)) {
    return Response.json({ error: "Invalid page path" }, { status: 400, headers: cors });
  }

  const { data: existing, error: lookupError } = await service.from("site_sessions")
    .select("visitor_id,user_id").eq("session_id", session_id).maybeSingle();
  if (lookupError) return Response.json({ error: "Tracking lookup failed" }, { status: 500, headers: cors });
  if (existing && (existing.visitor_id !== visitor_id || (existing.user_id && userId && existing.user_id !== userId))) {
    return Response.json({ error: "Session ownership mismatch" }, { status: 403, headers: cors });
  }

  const now = new Date().toISOString();
  const row = {
    session_id, visitor_id, user_id: userId || existing?.user_id || null,
    current_path: path, last_seen: now, ended_at: null,
  };
  const write = existing
    ? await service.from("site_sessions").update({
        user_id: row.user_id, current_path: path, last_seen: now, ended_at: null,
      }).eq("session_id", session_id).eq("visitor_id", visitor_id)
    : await service.from("site_sessions").insert({ ...row, started_at: now });

  if (write.error) return Response.json({ error: "Could not record session" }, { status: 500, headers: cors });

  if (action === "pageview") {
    const { error } = await service.from("site_page_views").insert({
      session_id, visitor_id, user_id: row.user_id, path,
    });
    if (error) return Response.json({ error: "Could not record page view" }, { status: 500, headers: cors });
  }

  return Response.json({ ok: true }, { headers: cors });
});