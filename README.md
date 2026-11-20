# VELYRA Control — deployment branch

This branch implements a secure Supabase-backed VELYRA creator dashboard at `/pagante`.

## What is built
- Public website: only **Streamers** and **Managers**; published profiles from Supabase.
- Private admin login with Supabase Auth (email and password).
- Admin-only create, edit, delete, publish/unpublish, reorder, search.
- Profile photo upload to a dedicated public Supabase Storage bucket.
- Row-level security restricting all writes and unpublished profiles to admins.
- No client-side hard-coded password, no public link to /pagante.

## Not live yet
**DO NOT merge to main** until a *dedicated* Supabase VELYRA project has been configured. The existing user's Supabase projects are unrelated. `assets/config.js` is intentionally blank.

## Setup
1. Create a **new VELYRA project** under the selected Supabase organization.
2. In Supabase SQL Editor, execute `supabase/velyra.sql` once. Inspect the results and security advisors.
3. Go to Supabase > Authentication > Users, create/invite a VELYRA administrator with a **strong unique password**. Do not allow public sign-up for admin accounts.
4. Copy that Auth user's UUID and execute in SQL Editor:
   `insert into public.velyra_admins(user_id) values ('THE-AUTH-USER-UUID');`
5. Get your **Project URL** and **publishable key** from Supabase settings. Fill ONLY these public values in `assets/config.js`:
   `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`.
   Never use a service-role or secret key.
6. Verify: anonymous visitors see only published profiles; unlisted and signed-in non-admin users cannot edit records; admin photo uploads work; login and logout work; check Supabase Security Advisors.
7. Remove the legacy `admin.*`, `app.js`, and `style.css` files before merge. This branch deletes them.
8. Merge branch to main once validated. The connected Vercel project deploys automatically.

## Files
- `index.html` / `assets/site.js`: public content.
- `pagante/index.html` / `assets/dashboard.js`: private login and CRUD interface.
- `assets/style.css` / `assets/dashboard.css`: visual identity.
- `assets/config.js`: public integration config (safe to commit).
- `supabase/velyra.sql`: initial database and RLS setup.
- `vercel.json`: static rewrites for `/pagante`.

Security note: An unlisted URL is not an access control. Supabase Auth and RLS enforce authorization; page HTML may be visited by anyone but private profile data and actions are blocked. Publicly published photos are intentionally readable by anyone with their URL.
