# Technical Audit — 2026-11-17

## Scope and method
Read-only inspection of the GitHub branch `audit/2026-11-17` and the linked Supabase project `per-ankh`. No database writes, schema changes, Edge Function deployments, production deployments, or edits to `main` were made.

Inspected:
- Recursive Git tree for the audit branch (376 tracked paths; 180 HTML files; tree response not truncated).
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
- 376 tracked paths in the recursive tree, including 180 HTML files. The earlier file-type count is superseded by this current tree inventory.
- Main folders include `kings/`, `eras/`, `sites/`, `assets/`, `supabase/`, and `docs/`.
- The sitemap contains 179 URLs (1 home, 150 kings, 16 sites, 9 eras, and 3 section indexes). A direct path-to-tree comparison resolved all 179 URLs to tracked files when directory URLs are mapped to their `index.html` files. One additional HTML file, `google50cca9201ac901b3.html`, is not listed in the sitemap; it appears to be a search-engine verification file and should remain outside the content inventory unless its purpose is disproven.
- The two remaining files under `assets/` are `per-ankh-favicon-v2.png` (432,029 bytes) and `per-ankh-social-preview(1).jpg` (184,716 bytes). The founder-image file is absent from the current tree. A repository code-search request for `founder` returned zero matches but was marked incomplete, so it is not proof that no textual references remain.
- `index.html` is 978,060 bytes (about 955 KiB), much larger than the other HTML pages. It combines substantial page markup, styles, data, and JavaScript; consider modularization only after mapping dependencies and regression behavior.
- `kings/index.html` is 50,665 bytes. Several individual king pages exceed 10 KB.

## Supabase project and schema
- Linked project: `per-ankh`, region `eu-central-1`, status `ACTIVE_HEALTHY`.
- Eleven applied migrations were listed, ending with `20261115064142 visitor_account_management`.
- The public schema contains 12 tables, all with RLS enabled:
  `profiles`, `user_roles`, `favorites`, `comments`, `suggestions`, `content_items`, `quiz_attempts`, `site_sessions`, `site_page_views`, `analytics_rate_limits`, `site_account_activity`, and `site_account_events`.

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
4. Continue with page-template checks for missing references, metadata, accessibility, and content depth; the 179 sitemap URLs now all map to tracked files.
5. Plan the home-page modularization only after documenting its data structures, event handlers, and dependencies.
6. Decide whether editorial content will remain static HTML or move to `content_items`; do not migrate until the content model, publishing workflow, and rollback plan are agreed.

## Sitemap-to-file comparison
- Parsed `sitemap.xml` from the audit branch and compared all 179 URL paths against the recursive Git tree.
- Result: 0 missing files after mapping `/kings/`, `/sites/`, and `/eras/` to their respective `index.html` files.
- One tracked HTML file is not in the sitemap: `google50cca9201ac901b3.html`. It was not treated as a missing content page.
- This is a repository path check only; it does not test deployed HTTP status, redirects, canonical tags, or page rendering.

## Safety boundary
This report records findings only. No production code, database schema, RLS policy, Auth setting, Edge Function, or Vercel deployment was changed.


## Sampled editorial-page review
A first structural/content sample was read from these pages: Narmer, Hatshepsut, Akhenaten, Beni Hasan, and the Middle Kingdom.

- The sampled pages share a lightweight static HTML template with title, description, canonical URL, Open Graph metadata, and JSON-LD Article/WebPage markup.
- The main article content is currently very short: king pages contain a brief paragraph plus a small fact grid; the Beni Hasan and Middle Kingdom pages contain only a few short sections.
- The sampled pages do not display a bibliography or itemized source list. The CSS includes a source presentation class, but the inspected page bodies do not use it to cite specific references.
- The generic footer note says interpretations may vary, but it does not identify which claims are disputed or provide a source for dates and historical statements.
- This is a content-quality gap, not a reason to add unverified filler. Enrichment should proceed in batches, with each significant historical/archaeological claim linked to a named source and confidence note.
- The shared favicon is referenced by all sampled pages. The social-preview image is referenced by the home page metadata. Binary visual inspection and dimension verification remain pending.


## Follow-up work — 2026-11-17

### First content expansion: Beni Hasan
- Expanded `sites/07-bny-hsn/index.html` from a short introductory stub into a structured Arabic article covering location, rock-cut architecture, interior spaces, wall painting, historical/archaeological value, and a method for reading scenes.
- Added an explicit methodological warning that general site-level observations must not be treated as descriptions of every individual tomb.
- Added a bibliographic entry for Percy E. Newberry, `Beni Hasan, Part I` (Archaeological Survey of Egypt, First Memoir, Egypt Exploration Fund, London, 1893).
- No page numbers, direct quotations, precise measurements, or tomb-specific architectural claims were invented. The article explicitly flags page-level verification and tomb-by-tomb attribution as outstanding.
- This is a first editorial draft, not a final scholarly sign-off. The repository contains no primary excavation publication or scanned source file at this time, so the reference has not yet been checked against the original scan in this work session.

### Asset and founder-reference follow-up
- GitHub returned the PNG and JPEG assets as base64 text, but the available GitHub fetch wrapper does not provide a binary image inspection/rendering path. Therefore visual quality, decoded dimensions, perceptual duplicates, and visual content remain unverified; no asset was modified.
- An exact GitHub code-search request for `gamal-founder-image` returned zero matches but `incomplete_results=true`. This is not conclusive evidence that all founder-image references are absent. The previously deleted asset remains absent from the audit branch; no replacement was added.
- No production branch, backup branch, Supabase schema/data, authentication settings, or Vercel deployment was changed.

### Remaining validation
- Review all HTML/CSS/JS references for the deleted founder asset using a complete repository scan.
- Validate the expanded Beni Hasan article against the original Newberry publication and add precise page references only after checking the source.
- Continue expanding the next pages in small, source-backed batches; do not publish or merge without explicit approval.
