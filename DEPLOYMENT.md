# Deploying to Azure App Service

The app ships as a **single** App Service: Express serves `/api/*` and also serves the
built Vite SPA from `dist/`, so there is one origin and no CORS to configure in prod.

| Resource | Value |
| --- | --- |
| Web App | `app-dc-and-360-tool-prod-ci-001` (Linux, Central India) |
| URL | https://dc-and-360-tool.bajajauto.com |
| Default hostname | `app-dc-and-360-tool-prod-ci-001-afgbgufyd8fgfsh9.centralindia-01.azurewebsites.net` |
| Postgres | `psql-dc-and-360-tool-prod-ci-001.postgres.database.azure.com` |
| Deploy trigger | push to `develop`, or **Run workflow** on `.github/workflows/azure-deploy.yml` |

`dc-and-360-tool.bajajauto.com` is the address users get. The azurewebsites.net default
hostname stays bound and working — the deploy smoke test uses it, and it is the way in if
the custom domain's DNS ever breaks. See [Custom domain](#custom-domain) below.

## One-time setup

Steps 2 and 3 below are automated by `scripts/azure-setup.ps1` — it is idempotent and
prompts for the DB password rather than storing it:

```powershell
winget install -e --id Microsoft.AzureCLI   # if az is missing; then reopen the shell
az login
./scripts/azure-setup.ps1 -AllowAzureServicesInsteadOfIps
```

Use `-AllowAzureServicesInsteadOfIps` when the Postgres server already has *Allow public
access from any Azure service* ticked, as this environment does. Without the switch the
script instead adds one firewall rule per possible App Service outbound IP — dozens of
rules, and unnecessary here.

The script discovers the resource groups itself, reuses an existing `JWT_SECRET` if one
is already set (so re-running does not sign everyone out), reads SMTP settings from your
local `.env`, and prompts for the three access account passwords. Step 1 stays manual on
purpose.

It also runs under a **Website Contributor** assignment scoped to just the web app, which
is the access level granted here. That role grants nothing on the Postgres server, so the
script detects it, warns, and skips database creation and firewall rules rather than
failing — both are already done for this environment. It also cannot read the App Service
Plan, so `Always On` must already be enabled (it is). Pass `-PgAdminUser` if the Postgres
admin login is ever something other than `dctooladmin`, since it can no longer be read
from the server. The rest of this section documents
what the script does, for when you need to check or change it by hand.

### 1. GitHub secret

Repo → *Settings* → *Secrets and variables* → *Actions* → *New repository secret*:

- **Name:** `AZURE_WEBAPP_PUBLISH_PROFILE`
- **Value:** the entire contents of `app-dc-and-360-tool-prod-ci-001.PublishSettings`
  (the whole `<publishData>…</publishData>` XML, one line is fine)

That file is now git-ignored — keep it out of the repo. If it ever leaks, reset it in the
portal with *Overview → Download publish profile → Reset publish profile credentials*.

### 2. App Service configuration

*Configuration → General settings*

| Setting | Value |
| --- | --- |
| Stack | Node |
| Major version | Node 22 LTS |
| Startup Command | `bash /home/site/wwwroot/startup.sh` |
| Always On | On (the app runs a `node-cron` notification scheduler that dies if the worker idles out) |
| HTTPS Only | On |

*Configuration → Application settings* — add each of these:

| Name | Value |
| --- | --- |
| `DATABASE_URL` | `postgresql://dctooladmin:<url-encoded-password>@psql-dc-and-360-tool-prod-ci-001.postgres.database.azure.com:5432/dc_tool?sslmode=require` |
| `JWT_SECRET` | a fresh 96-char random hex string — **do not reuse the dev value** |
| `APP_URL` | `https://dc-and-360-tool.bajajauto.com` (used to build invite and magic links in emails) |
| `CLIENT_ORIGIN` | `https://dc-and-360-tool.bajajauto.com,https://app-dc-and-360-tool-prod-ci-001-afgbgufyd8fgfsh9.centralindia-01.azurewebsites.net` |
| `REPORTS_DIR` | `/home/data/reports` |
| `EMAIL_MODE` | `smtp` |
| `EMAIL_FROM` | the Brevo-verified sender address |
| `SMTP_HOST` | `smtp-relay.brevo.com` |
| `SMTP_PORT` | `587` |
| `SMTP_SECURE` | `false` |
| `SMTP_USER` | Brevo SMTP login (`…@smtp-brevo.com`) |
| `SMTP_PASS` | Brevo SMTP key |
| `SCM_DO_BUILD_DURING_DEPLOYMENT` | `false` |
| `TD_ADMIN_PASSWORD` | password for `td.admin@bajajauto.co.in` (optional — see below) |
| `ASSESSOR_PASSWORD` | password for `assessor@bajajauto.co.in` (optional) |
| `BUHR_PASSWORD` | password for `buhr.ev@bajajauto.co.in` (optional) |

Notes:

- **Do not set `PORT`.** App Service injects it, and the server already reads
  `process.env.PORT`.
- The password must be **percent-encoded** inside `DATABASE_URL` — `#` → `%23`,
  `@` → `%40`, `&` → `%26`. An unencoded `@` or `#` truncates the URL and Prisma will
  fail with an authentication or "invalid port" error.
- `CLIENT_ORIGIN` is a **comma-separated list** (`server/src/index.js` splits on commas).
  Both hostnames are listed so the app keeps working on the default hostname while the
  custom domain's DNS is propagating, and so smoke tests are not blocked by CORS.
  `APP_URL` is a single value — it is what gets baked into emails, so it is the custom
  domain only.
- `REPORTS_DIR` points outside `/home/site/wwwroot` on purpose: each deploy replaces
  wwwroot, which would delete generated 360 reports. `/home` is persistent storage.
- `SCM_DO_BUILD_DURING_DEPLOYMENT=false` matters — the workflow already installs and
  builds, so letting Oryx rebuild on the host is slow and can regenerate the Prisma
  client for the wrong platform.
- The three `*_PASSWORD` settings are read **only when the database has no users**, i.e.
  on the very first boot. Leave one unset and that account is created with the built-in
  default from `server/prisma/accessAccounts.js` (`Admin@123`, `Assessor@123`,
  `Buhr@123`) — fine for a throwaway environment, not for production. Setting one
  afterwards has no effect; change the password in the app instead.

### 3. Database

The workflow does not touch the database. Everything happens on boot, in `startup.sh`:

1. `prisma migrate deploy` applies `server/prisma/migrations/` — a no-op once up to date.
2. `node server/prisma/bootstrapAccessAccounts.js` creates the TD Admin, Assessor and
   BUHR logins, but **only if the database contains no users at all**. Without this a
   fresh deploy comes up with nothing to sign in as. It skips on every subsequent boot,
   which matters because the underlying seeder rewrites `passwordHash` — running it
   unconditionally would silently undo an admin's password change.

No demo participants or mock feedback are created; real people come in through the app
or `npm run db:import-hr`.

The `dc_tool` database itself must exist first (the server only ships with a default
`postgres` DB). It has already been created for this environment; for a new one:

```bash
psql "postgresql://dctooladmin:<password>@psql-dc-and-360-tool-prod-ci-001.postgres.database.azure.com:5432/postgres?sslmode=require" \
  -c 'CREATE DATABASE dc_tool;'
```

Then allow the app to reach it — *Postgres server → Networking*:

1. Tick **Allow public access from any Azure service within Azure to this server**, or
2. (tighter) add one firewall rule per address listed in the Web App's
   *Networking → Outbound addresses*. Use **Possible outbound IP addresses**, not just
   the current ones, or the app breaks when App Service moves it.

Option 1 is what this environment uses.

Add your own IP too if you want to run `psql` or the import scripts from your machine —
and note it must be your **public egress** IP, which is often not what you expect on a
corporate network. Check it with `curl https://api.ipify.org` from the machine itself
rather than assuming.

Loading real participants (needs DB access from your machine, per above):

```bash
DATABASE_URL="<prod url>" HR_DATA_FILE="<path to master data template.xlsx>" npm run db:import-hr
```

`HR_DATA_FILE` is not optional in practice — the built-in default path in
`server/prisma/importHrData.js` points at a specific developer's Documents folder.

`npm run db:seed` is **development only** — it inserts demo participants and mock
feedback. Do not point it at production.

## Custom domain

The app is served at `https://dc-and-360-tool.bajajauto.com`. On the Azure side this is
done — the hostname is bound to the web app and TLS is bound to it (SNI SSL, thumbprint
`4C26A7A1…6564`). What remains is DNS, which `bajajauto.com` owns.

**DNS records the Bajaj network team needs to create:**

| Type | Name | Value |
| --- | --- | --- |
| `CNAME` | `dc-and-360-tool` | `app-dc-and-360-tool-prod-ci-001-afgbgufyd8fgfsh9.centralindia-01.azurewebsites.net` |
| `TXT` | `asuid.dc-and-360-tool` | `DDEB94FDAD5DDD59E21809F98928A69E043D4571ECB0716438441F48EC0C8086` |

Notes for that conversation:

- Prefer `CNAME` over an `A` record. App Service's inbound IP is not contractually
  stable; an `A` record silently breaks the day Azure moves the site.
- The `asuid` TXT record is Azure's domain-ownership proof. The binding already exists,
  so it is not needed to *create* it, but Azure re-checks ownership and an absent record
  can cause the binding to be dropped later. Cheap to add, so add it.
- If the record is published only on Bajaj's **internal** DNS, the site is reachable from
  the Bajaj network and nowhere else. That is the intent here, but it has two
  consequences worth knowing up front:
  - The GitHub Actions smoke test cannot resolve the name and therefore checks the
    azurewebsites.net hostname instead. That is intentional; see the workflow comment.
  - **An App Service Managed Certificate cannot renew against private-only DNS** — its
    validation comes from the public internet. If the bound certificate is a managed one
    it will fail to auto-renew and HTTPS will break, silently, at expiry. Confirm with
    whoever created the binding that it is a Bajaj-issued/uploaded certificate, and if
    so put its expiry date in a calendar. This could not be verified from here: the
    deploy account is Website Contributor scoped to the web app and cannot read
    certificate resources.

Nothing in the application needs a rebuild or redeploy for the domain change — the
hostname lives entirely in App Service settings (`APP_URL`, `CLIENT_ORIGIN`), which are
already set.

## What the pipeline does

`.github/workflows/azure-deploy.yml`, on every push to `develop`:

1. `npm ci` — installs everything; `postinstall` generates the Prisma client.
2. `npm run build` — Vite build into `dist/`.
3. `npm prune --omit=dev` — drops Vite/Tailwind from the package. `prisma` is a
   **runtime** dependency (not dev) precisely so `startup.sh` can still call its CLI.
4. `npx prisma generate` — re-run because pruning can remove the generated client.
   `schema.prisma` declares `debian-openssl-3.0.x` / `1.1.x` binary targets so a client
   generated on the Ubuntu runner works on the Debian-based App Service image.
5. Deletes `.git`, `.github`, `.vscode`, `.env`, `*.PublishSettings`.
6. `azure/webapps-deploy@v3` zip-deploys the folder using the publish profile.
7. Polls `/api/health` (which runs `SELECT 1`) for up to 5 minutes, so a deploy that
   boots but can't reach Postgres fails the run instead of going unnoticed.

`src/` is deployed even though it is client source — `server/src/reports/` imports
`src/data/surveyConfig.js` at runtime.

## Troubleshooting

- **Log stream:** Web App → *Monitoring → Log stream*, or
  `https://app-dc-and-360-tool-prod-ci-001-afgbgufyd8fgfsh9.scm.centralindia-01.azurewebsites.net/api/logs/docker`.
- **Site 503s after a green deploy** — usually `prisma migrate deploy` or the access
  account bootstrap failing in `startup.sh`, which runs under `set -e` and stops boot.
  The log stream shows the error; a connection timeout means the Postgres firewall does
  not include the app's outbound IPs.
- **Deploy is green but you cannot log in** — look for `[bootstrap]` in the log stream.
  `skipping access account seed` means the database already had users, so the built-in
  logins were never created; sign in with an existing account or load data with
  `db:import-hr`.
- **Custom domain does not resolve** — check from inside the Bajaj network; the record is
  expected to be internal-only. `nslookup dc-and-360-tool.bajajauto.com`. The
  azurewebsites.net hostname stays bound and always works, so use it to tell "DNS is
  missing" apart from "the app is down".
- **Certificate warning on the custom domain** — the bound certificate expired or was
  replaced. `az webapp config hostname list -g rg-hrtraining-ci-01 --webapp-name
  app-dc-and-360-tool-prod-ci-001` shows the thumbprint currently bound.
- **CORS errors after a hostname change** — `CLIENT_ORIGIN` must contain the exact
  scheme+host the browser is using, comma-separated. A trailing slash does not match.
- **`P1001 Can't reach database server`** — firewall, or `sslmode=require` missing.
- **Blank page, 404s on `/assets/*`** — `dist/` did not ship; check the build step ran.
- **Deep links 404** — the SPA fallback only activates when `dist/index.html` exists;
  the boot log prints `No client build found at …` when it doesn't.
