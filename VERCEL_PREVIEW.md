# Preview preparation (no deployment performed)

Use the existing `server.js` Express entry. Vercel receives the exported app;
local `node server.js` still listens on the configured port. No static directory
is exposed: HTML and allowlisted assets, including the public sample PDF, are
served through the existing Express routes. Font/license files are bundled for
server rendering, not added to the public asset allowlist.

`vercel.json` sets the function maxDuration to 300 seconds. Set the shared
model budget to 240000 milliseconds, leaving 60 seconds for validation,
typesetting and archive/DB work. `waitUntil` does not extend maxDuration.
Verify Fluid compute and the effective duration in Preview project settings.

Preview environment variable names:

- DATABASE_URL
- NODE_ENV
- SKIP_SCHEMA_INIT
- PDF_TEST_MODE
- PDF_LIVE_MODE
- DEEPSEEK_API_KEY
- DEEPSEEK_MODEL
- PDF_MODEL_BUDGET_MS
- PDF_ARCHIVE_BACKEND
- PDF_R2_ENDPOINT
- PDF_R2_BUCKET
- PDF_R2_ACCESS_KEY_ID
- PDF_R2_SECRET_ACCESS_KEY
- SHOPIER_URL_CALC (optional)
- SHOPIER_URL_FULL (optional)

Use an isolated Preview database and private R2 bucket. Initialize schema
separately, skip runtime schema initialization, disable sample mode, and select
R2 rather than the ephemeral/read-only deployment filesystem. VERCEL and PORT
are platform-provided. Do not upload/pull real environment files as part of
package checks. The application currently uses database-backed random sessions,
not SESSION_SECRET.

Before release, Preview must verify HTTPS cookies, authentication/ownership,
database connectivity/schema, the private R2 lifecycle, function asset tracing,
PDF downloads and Turkish fonts, plus waitUntil completion within the effective
300-second limit. These remote integration checks are not a local build proof.
