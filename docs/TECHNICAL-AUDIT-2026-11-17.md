# Technical Audit — 2026-11-17

## Scope and method
Read-only inspection of the GitHub branch `audit/2026-11-17` and the linked Supabase project `per-ankh`. No database writes, schema changes, Edge Function deployments, production deployments, or edits to `main` were made.

Inspected:
- Recursive Git tree for the audit branch (192 files; tree response not truncated).
- Supabase public-schema table inventory with columns, keys, row estimates, and RLS flags.
- Applied Supabase migration list.
- Public-schema RLS policies and table grants for `anon`, `authenticated`, and `service_role`.
- Supabase security and performance advisor output.
- Source migration `supabase/migrations/20261115000100_visitor_account_management.sql`.
- Source Edge Function `supabase/functions/per-ankh-analytics/index.ts`.
- Main page integration points for Supabase and analytics.

Not inspected exhaustively:
- Every HTML page's content, image references, accessibility, or rendering.
- Runtime browser behavior, Lighthouse/Core Web Vitals, deployed HTTP headers, and real user flows.
- Every asset's decoded file format, dimensions, visual quality, licensing, and duplicate status.
- Full performance-advisor output beyond the reported finding summary.
- Authentication provider settings beyond the advisor warning.
- Deployed Edge Function source independently; source in Git was reviewed, but the deployed-function retrieval did not provide readable source in this inspection.

## Repository inventory
- 192 tracked files: 180 HTML, 5 Markdown, 2 TXT, 1 PNG, 1 JPG, 1 XML, 1 TypeScript, and 1 SQL.
- Main folders include `kings/`, `eras/`, `sites/`, `assets/`, `supabase/`, and `docs/`.
- The sitemap inventory previously recorded 179 URLs (1 home, 150 kings, 16 sites, 9 eras, and 3 section indexes). A sitemap URL is not proof that its page is complete, reachable, or indexed.
- The three files under `assets/` total 1,077,957 bytes:
  - `gamal-founder-image.txt`: 461,212 bytes. Its extension is unusual for an image-like asset; determine its actual content/usage before renaming or converting.
  - `per-ankh-favicon-v2.png`: 432,029 bytes; unusually large for a favicon and a likely optimization candidate after visual verification.
  - `per-ankh-social-preview(1).jpg`: 184,716 bytes.
- `index.html` is 978,060 bytes (about 955 KiB), much larger than the other HTML pages. It combines substantial page markup, styles, data, and JavaScript; consider modularization only after mapping dependencies and regression behavior.
- `kings/index.html` is 50,665 bytes. Several individual king pages exceed 10 KB.

## Supabase project and schema
- Linked project: `per-ankh`, region `eu-central-1`, status `ACTIVE_HEALTHY`.
- Eleven applied migrations were listed, ending with `20261115064142 visitor_account_management`.
- The public schema contains 11 tables, all with RLS enabled:
  `profiles`, `user_roles`, `favorites`, `comments`, `suggestions`, `content_items`, `quiz_attempts`, `site_sessions`, `site_page_views`, `analytics_rate_limits`, `site_account_activity`, and `site_account_events`.
  (The live table inventory returned 12 names; confirm the final count from the raw table list before using it as a KPI. The names above are the complete returned list.)
- The current inventory reports activity in the analytics tables: 258 sessions, 465 page views, 8 account activity snapshots, and 47 account events. These are database row counts, not validated unique people or audited traffic totals.
- `content_items` currently has zero rows in the returned inventory. This means the CMS-style table is present but does not currently hold content rows.
- User-facing account features include profiles, roles, favorites, comments, suggestions, and quiz history.

## Security findings — priority
1. **Security advisor warning: two private account tables have RLS enabled but no policies.** The affected tables are `public.site_account_activity` and `public.site_account_events`. The grants inventory showed `service_role` access for these tables and no `anon` or `authenticated` table grants. This may be intentional server-only isolation, not automatically a data leak; verify that only the Edge Function/service role accesses them and that no future client-side query depends on them. Do not add broad policies to silence the warning.
2. **Auth advisor warning: leaked-password protection is disabled.** Enable it in Supabase Auth settings after confirming the desired user sign-in experience. This is an actionable account-security improvement.
3. **Edge Function has `verify_jwt=false`, but source performs explicit bearer-token validation** using Supabase Auth `getUser`; it also checks the exact configured site origin, rate-limits requests, and separately verifies the admin role for analytics. This is a compensating application-level control. It deserves focused negative testing (missing/invalid token, wrong origin, non-admin analytics request, oversized/invalid body, rate-limit exhaustion) before relying on it.
4. The function uses a server-side service-role key from environment configuration. No secret value is recorded in this report. Keep it exclusively in Edge Function secrets; never place it in browser code or commit it.
5. Device analytics are based on coarse browser user-agent parsing (device type/OS/browser label). The schema comment explicitly says no IP address, phone contents, fingerprint, or precise device identifier. Do not describe this as identifying a person's exact phone.
6. Admin account history and online status are inferred from heartbeat/session records; status accuracy depends on heartbeat timing and cleanup/expiry behavior. Test multi-device sign-in and abrupt browser closure.

## RLS policy shape observed
- Public/anonymous reads are limited by policy to approved comments and published content items.
- Authenticated users can access their own profiles, favorites, quiz attempts, and suggestions, with admin exceptions where defined.
- Admin-only reads exist for session and page-view analytics.
- Account activity/event tables intentionally have no client policies in the current database state.
- The analytics rate-limit table has a service-role-only policy.

## Performance and maintainability observations
- Performance advisor reported 10 unused-index findings (INFO level); do not delete indexes automatically. Compare query plans and workload before considering removal.
- The oversized home page and large favicon are clear investigation/optimization candidates, but no changes are recommended until asset references, visual output, and loading behavior are mapped.
- The repository has no README-level setup documentation (README is only 29 bytes in the inspected tree). Add setup/deployment/runbook documentation before a larger refactor.
- The current static HTML structure may be serving the published experience while Supabase supplies account/community/analytics functions. Do not assume the database is the primary content store: the live `content_items` table is empty.

## Recommended next actions
1. Review the exact account-table access path and run controlled security tests against the Edge Function without changing production configuration.
2. Enable leaked-password protection after confirming the setting and user impact.
3. Inventory asset references, actual file signatures/dimensions, and duplicates; optimize only verified assets on the audit branch.
4. Build a page-by-page sitemap-to-file audit, then sample page templates for missing references, metadata, accessibility, and content depth.
5. Plan the home-page modularization only after documenting its data structures, event handlers, and dependencies.
6. Decide whether editorial content will remain static HTML or move to `content_items`; do not migrate until the content model, publishing workflow, and rollback plan are agreed.

## Safety boundary
This report records findings only. No production code, database schema, RLS policy, Auth setting, Edge Function, or Vercel deployment was changed.
