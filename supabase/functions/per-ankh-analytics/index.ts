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

type Caller = { id: string; email: string; displayName: string };

async function getCaller(req: Request): Promise<Caller | null> {
  const bearer = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  if (!bearer || bearer === SUPABASE_ANON_KEY || bearer.startsWith("sb_publishable_")) return null;
  const { data, error } = await authClient.auth.getUser(bearer);
  if (error || !data.user) throw new Error("Invalid session");
  return {
    id: data.user.id,
    email: data.user.email || "",
    displayName: String(data.user.user_metadata?.display_name || data.user.user_metadata?.full_name || ""),
  };
}

function parseDevice(req: Request) {
  const ua = req.headers.get("user-agent") || "";
  const browser = /Edg\//.test(ua) ? "Microsoft Edge"
    : /OPR\//.test(ua) ? "Opera"
    : /Firefox\//.test(ua) ? "Firefox"
    : /Chrome\//.test(ua) ? "Google Chrome"
    : /Safari\//.test(ua) ? "Safari" : "متصفح غير محدد";
  const os = /Android/i.test(ua) ? "Android"
    : /iPhone|iPad|iPod/i.test(ua) ? "iOS"
    : /Windows/i.test(ua) ? "Windows"
    : /Mac OS|Macintosh/i.test(ua) ? "macOS"
    : /Linux/i.test(ua) ? "Linux" : "نظام غير محدد";
  const type = /iPad|Tablet/i.test(ua) ? "جهاز لوحي"
    : /Mobile|Android|iPhone|iPod/i.test(ua) ? "هاتف"
    : "كمبيوتر";
  return {
    device_type: type,
    browser_name: browser,
    os_name: os,
    device_label: type + " · " + os,
    language: (req.headers.get("accept-language") || "").split(",")[0].slice(0, 24),
  };
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

  const now = new Date();
  const since = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const onlineSince = new Date(now.getTime() - 90 * 1000).toISOString();
  const cairoParts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Africa/Cairo", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(now);
  const part = (type: string) => cairoParts.find((p) => p.type === type)?.value || "01";
  const offsetText = new Intl.DateTimeFormat("en-US", {
    timeZone: "Africa/Cairo", timeZoneName: "longOffset",
  }).formatToParts(now).find((p) => p.type === "timeZoneName")?.value || "GMT+02:00";
  const offsetMatch = offsetText.match(/GMT([+-])(\d{2}):(\d{2})/);
  const offsetMinutes = offsetMatch ? (offsetMatch[1] === "+" ? 1 : -1) *
    (Number(offsetMatch[2]) * 60 + Number(offsetMatch[3])) : 120;
  const todayStart = new Date(Date.UTC(Number(part("year")), Number(part("month")) - 1, Number(part("day"))) - offsetMinutes * 60000).toISOString();

  const [sessionsCount, viewsCount, activeResult, todaySessions, viewResult, visitorResult] = await Promise.all([
    service.from("site_sessions").select("session_id", { count: "exact", head: true }),
    service.from("site_page_views").select("id", { count: "exact", head: true }),
    service.from("site_sessions")
      .select("session_id,visitor_id,user_id,current_path,last_seen,started_at,device_type,browser_name,os_name,device_label,language")
      .is("ended_at", null).gte("last_seen", onlineSince).order("last_seen", { ascending: false }).limit(1000),
    service.from("site_sessions").select("visitor_id,session_id", { count: "exact" })
      .gte("started_at", todayStart).limit(10000),
    service.from("site_page_views").select("visitor_id,path,viewed_at")
      .gte("viewed_at", since).order("viewed_at", { ascending: false }).limit(10000),
    service.from("site_sessions")
      .select("session_id,visitor_id,user_id,current_path,last_seen,started_at,ended_at,device_type,browser_name,os_name,device_label,language")
      .order("last_seen", { ascending: false }).limit(150),
  ]);
  if (sessionsCount.error || viewsCount.error || activeResult.error || todaySessions.error || viewResult.error || visitorResult.error) {
    throw new Error("Analytics query failed");
  }

  const active = activeResult.data || [];
  const guestActive = active.filter((s: any) => !s.user_id);
  const onlineVisitors = new Set(active.map((s: any) => s.visitor_id));
  const onlineGuestVisitors = new Set(guestActive.map((s: any) => s.visitor_id));
  const viewRows = viewResult.data || [];
  const uniqueVisitors30d = new Set(viewRows.map((v: any) => v.visitor_id));
  const uniqueVisitorsToday = new Set((todaySessions.data || []).map((v: any) => v.visitor_id));
  const pages = new Map<string, number>();
  for (const row of viewRows) pages.set(row.path, (pages.get(row.path) || 0) + 1);

  const authUsers: any[] = [];
  for (let page = 1; page <= 5; page++) {
    const { data, error } = await service.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw new Error("Could not load registered accounts");
    authUsers.push(...(data.users || []));
    if ((data.users || []).length < 1000) break;
  }
  const accountIds = authUsers.map((u: any) => u.id);
  const [profileResult, activityResult, eventResult] = await Promise.all([
    accountIds.length
      ? service.from("profiles").select("id,display_name").in("id", accountIds)
      : Promise.resolve({ data: [], error: null }),
    accountIds.length
      ? service.from("site_account_activity").select("*").in("user_id", accountIds)
      : Promise.resolve({ data: [], error: null }),
    service.from("site_account_events")
      .select("user_id,email_snapshot,display_name_snapshot,event_type,session_id,event_at,current_path")
      .order("event_at", { ascending: false }).limit(100),
  ]);
  if (profileResult.error || activityResult.error || eventResult.error) throw new Error("Could not load account history");
  const profileMap = new Map((profileResult.data || []).map((p: any) => [p.id, p.display_name]));
  const activityMap = new Map((activityResult.data || []).map((a: any) => [a.user_id, a]));
  const accounts = authUsers.map((u: any) => {
    const activity: any = activityMap.get(u.id) || {};
    const lastSeen = activity.last_seen_at || u.last_sign_in_at || null;
    const isOnline = !!lastSeen && new Date(lastSeen).getTime() >= now.getTime() - 90 * 1000 &&
      activity.last_status === "active";
    const status = isOnline ? "active" : activity.last_status === "logged_out" ? "logged_out" : "inactive";
    return {
      id: u.id,
      name: profileMap.get(u.id) || activity.display_name_snapshot || u.user_metadata?.display_name || u.email || "عضو مسجل",
      email: u.email || activity.email_snapshot || "",
      status,
      created_at: u.created_at || activity.first_seen_at || null,
      last_login_at: activity.last_login_at || u.last_sign_in_at || null,
      last_logout_at: activity.last_logout_at || null,
      last_seen_at: lastSeen,
      login_count: Number(activity.login_count || 0),
      last_path: activity.last_path || "/",
    };
  }).sort((a: any, b: any) => new Date(b.last_seen_at || b.created_at || 0).getTime() - new Date(a.last_seen_at || a.created_at || 0).getTime());
  const onlineUsers = accounts.filter((a: any) => a.status === "active");
  const topPages = [...pages.entries()]
    .map(([path, views]) => ({ path, views }))
    .sort((a, b) => b.views - a.views).slice(0, 10);

  return {
    online_sessions: active.length,
    online_visitors: onlineVisitors.size,
    online_registered: onlineUsers.length,
    online_guests: onlineGuestVisitors.size,
    visitors_today: uniqueVisitorsToday.size,
    visitors_today_sampled: (todaySessions.data || []).length >= 10000,
    sessions_today: todaySessions.count || 0,
    total_visits: sessionsCount.count || 0,
    total_page_views: viewsCount.count || 0,
    unique_visitors_30d: uniqueVisitors30d.size,
    unique_visitors_sampled: viewRows.length >= 10000,
    top_pages_30d: topPages,
    online_users: onlineUsers,
    accounts,
    accounts_limited: authUsers.length >= 5000,
    visitors: visitorResult.data || [],
    visitors_limited: (visitorResult.data || []).length >= 150,
    account_events: eventResult.data || [],
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

  let caller: Caller | null;
  try { caller = await getCaller(req); } catch {
    return Response.json({ error: "Invalid session" }, { status: 401, headers: cors });
  }
  const userId = caller?.id || null;

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
  if (!["heartbeat", "pageview", "end", "login", "logout"].includes(action) ||
      !uuidPattern.test(session_id ?? "") || !uuidPattern.test(visitor_id ?? "")) {
    return Response.json({ error: "Invalid tracking request" }, { status: 400, headers: cors });
  }
  if ((action === "login" || action === "logout") && !userId) {
    return Response.json({ error: "Sign-in required" }, { status: 401, headers: cors });
  }

  try {
    const limit = action === "pageview" ? 30 : action === "heartbeat" ? 90 : 3;
    if (await isRateLimited("track:" + action + ":" + session_id + ":" + visitor_id, limit)) {
      return Response.json({ error: "Too many requests" }, { status: 429, headers: cors });
    }
  } catch {
    return Response.json({ error: "Tracking temporarily unavailable" }, { status: 503, headers: cors });
  }

  const now = new Date().toISOString();

  if (action === "logout") {
    const { error: sessionError } = await service.from("site_sessions")
      .update({ ended_at: now, last_seen: now })
      .eq("session_id", session_id).eq("visitor_id", visitor_id).eq("user_id", userId);
    if (sessionError) return Response.json({ error: "Could not close session" }, { status: 500, headers: cors });
    const { error: accountError } = await service.rpc("record_site_account_logout", {
      p_user_id: userId, p_session_id: session_id, p_seen_at: now,
    });
    if (accountError) return Response.json({ error: "Could not save sign-out status" }, { status: 500, headers: cors });
    return Response.json({ ok: true }, { headers: cors });
  }

  if (action === "end") {
    if (userId) {
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
  if (existing && (existing.visitor_id !== visitor_id || (existing.user_id && existing.user_id !== userId))) {
    return Response.json({ error: "Session ownership mismatch" }, { status: 403, headers: cors });
  }

  const device = parseDevice(req);
  let displayName = caller?.displayName || "";
  if (userId && !displayName) {
    const { data: profile } = await service.from("profiles").select("display_name").eq("id", userId).maybeSingle();
    displayName = profile?.display_name || "عضو بر عنخ";
  }
  const row = {
    session_id, visitor_id, user_id: userId || existing?.user_id || null,
    current_path: path, last_seen: now, ended_at: null, ...device,
  };
  const write = existing
    ? await service.from("site_sessions").update({
        user_id: row.user_id, current_path: path, last_seen: now, ended_at: null, ...device,
      }).eq("session_id", session_id).eq("visitor_id", visitor_id)
    : await service.from("site_sessions").insert({ ...row, started_at: now });

  if (write.error) return Response.json({ error: "Could not record session" }, { status: 500, headers: cors });

  if (userId) {
    const rpcName = action === "login" ? "record_site_account_login" : "touch_site_account_activity";
    const { error } = await service.rpc(rpcName, {
      p_user_id: userId, p_email: caller?.email || "", p_display_name: displayName,
      p_session_id: session_id, p_path: path, p_seen_at: now,
    });
    if (error) return Response.json({ error: "Could not save account activity" }, { status: 500, headers: cors });
  }

  if (action === "pageview") {
    const { error } = await service.from("site_page_views").insert({
      session_id, visitor_id, user_id: row.user_id, path,
    });
    if (error) return Response.json({ error: "Could not record page view" }, { status: 500, headers: cors });
  }

  return Response.json({ ok: true }, { headers: cors });;
});