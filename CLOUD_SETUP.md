# Floppy account setup

## Local-first mode (current default)

You do not need Supabase to keep iterating. With `cloud-config.js` left blank, Floppy saves the project collection on this device using IndexedDB, with the existing browser snapshot as a fallback and migration path. Ideas, chapter drafts, notes, attachments, artwork, and crop choices should survive reloads and browser restarts on the same browser profile and URL. This is device-local storage—not a backup or coworker-sharing system—so export or copy the project data before clearing browser storage or changing origins.

The app remains a local preview while `cloud-config.js` has blank values. This is intentional: no account or production storage is claimed until a real Supabase project has been provisioned and verified. Existing `floppy-projects-v3` browser data is left untouched.

1. Create a Supabase project. Enable email Magic Link authentication and the Google provider. In Auth URL Configuration, add the exact hosted Floppy URL and any local preview URL used for testing (for example `http://127.0.0.1:8766/index.html`). Set the production Site URL to the hosted app. Google OAuth requires a Google Cloud OAuth web client whose redirect URI is the Supabase callback URL shown in the Supabase provider settings; the browser never receives a Google client secret.
2. Apply `supabase/migrations/20260925000000_floppy_accounts.sql`, then apply `supabase/migrations/20260926000000_floppy_workspaces.sql`. Check that only authenticated owners can read collections and that `anon` cannot read either table. The workspace migration is additive: the current app still uses the account snapshot until the project/version migration is enabled. `floppy_gemini_keys` must have no client read/write grant.
3. Generate a fresh, random 32-byte encryption key, encode it as base64, and set it as the Edge Function secret `FLOPPY_KEY_ENCRYPTION_SECRET`. Set `FLOPPY_ALLOWED_ORIGINS` to exact comma-separated origins (scheme, host, and optional port; no path or trailing slash). Never commit either secret. Deploy `supabase/functions/gemini-vault` with JWT verification enabled.
4. Put only the Supabase project URL and **publishable** key in `cloud-config.js`. Never put a Supabase secret/service-role key or a Gemini key in browser code. Host the static app over HTTPS.
5. Test a new account: request a Magic Link, open it, create a project, edit Idea, wait for “Saved to account,” refresh, sign out/in, and confirm the project returns. Test another account cannot read it. Test explicit import of an existing on-device project; confirm the original browser copy remains. Add a Gemini key through Settings, refresh, confirm the masked connection returns, generate a Working Idea and Project Art, and verify no plaintext key appears in project data or responses. Native Gemini image generation requires image-model access and a paid API project; a key that passes the text connection test can still be unable to generate images. Simulate a stale-tab conflict and a failed network save; confirm work is preserved and the user sees the warning.

6. Host the static preview with Cloudflare Workers using `wrangler.jsonc`. The repository uses Workers Static Assets and `.assetsignore` so tests, backups, migrations, and internal notes are not uploaded. Set the public Supabase URL and publishable key in `cloud-config.js` only; do not put secrets in the asset bundle. Cloudflare Access is not required for product login or future coworker membership; Supabase Auth and database policies own that boundary.

The cloud foundation stores each account's existing version-4 project collection as an account-owned JSON snapshot with an atomic revision. It also retains an account-scoped on-device pending backup for failed saves. This keeps the current data model intact during migration; large binary attachments should eventually move to private object storage with account-scoped access rules. The current 8 MiB snapshot ceiling is deliberate and must be tested with real project sizes before opening the app to users.

The repository has mocked account and vault journeys, but these do **not** verify a live Supabase deployment, real email delivery, encryption-secret configuration, or live Gemini. Those are release gates, not optional polish.

## What is needed from the founder

- A Supabase project URL and publishable key after provisioning.
- A Google Cloud OAuth web client configured for the Supabase callback URL, then Google enabled in Supabase Auth.
- A deployed hostname, or permission to choose one in the Cloudflare account.
- A Cloudflare account ID and permission to deploy the `floppy-v25` Worker, or a Cloudflare API token scoped to Workers deployment.
- A fresh 32-byte encryption secret for the Gemini vault, supplied through the Supabase Edge Function secret store rather than committed to this repository.

Do not send Gemini keys, Supabase service-role keys, Cloudflare API tokens, or encryption secrets in chat. Use them only in their provider dashboards or protected local secret prompts.
