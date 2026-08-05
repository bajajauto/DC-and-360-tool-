# Working with the database

The production database is `dc_tool` on the Azure Postgres flexible server
`psql-dc-and-360-tool-prod-ci-001`. Its schema is owned by **Prisma
migrations**, not by hand-written SQL. Read the first section before doing
anything that changes the schema.

## Changing the schema (the normal way)

Do this for anything the application reads or writes. You do **not** need
database access, Azure access, or the admin password for this route.

1. Add or edit the model in `server/prisma/schema.prisma`.
2. Generate the migration against your **local** database:
   ```
   npm run db:migrate
   ```
   This creates a folder under `server/prisma/migrations/` — commit it.
3. Open a PR against `develop`.
4. On merge, the deploy runs and `startup.sh` applies the migration to
   production via `prisma migrate deploy`.

### Why not just create the table by hand in prod

Prisma records applied migrations in a `_prisma_migrations` table. A table
created manually is invisible to it, which causes three problems:

- It exists only in production — not in your local DB, not in anyone else's.
- It is not in `schema.prisma`, so the generated Prisma client cannot see it.
  Application code would have to reach it with raw SQL.
- If a migration is later written that creates a table of the same name,
  `migrate deploy` fails. Because migrations run in `startup.sh`, **a failed
  migration is a failed startup** — the site does not come up.

The manual route is reasonable only for a genuinely throwaway table that the
app never touches and that gets dropped afterwards.

## Connecting directly (for queries, inspection, one-off work)

Two gates, and they are independent. Failing the second one does not look like
a permissions error.

1. **Credentials** — user `dctooladmin`, database `dc_tool`. Note this is the
   *server admin* account: full rights over every table, including drops.
2. **Firewall** — your machine's public IP needs its own rule on the server.

### Getting through the firewall

Run `scripts/dbdiag.ps1`. It opens the firewall briefly, asks the server what
IP it actually sees you as, and removes the temp rule in a `finally` block so
it cleans up even on Ctrl-C. With `-Pin` it also creates a rule for that IP.

```powershell
az login --tenant 09e813ed-65bb-43ec-8f6e-857ed24e997e
$env:PGPASSWORD = '<ask the team>'
.\scripts\dbdiag.ps1 -Pin
```

Requires the Azure permissions `flexibleServers/read` and
`firewallRules/{read,write,delete}`, and `psql` on PATH.

### If you do not have Azure tenant access

Someone who does must open a temporary rule while you connect, because the IP
has to be discovered from *your* machine. Coordinate so the window is minutes,
not hours — it accepts connections from any address while open:

1. They create a temporary `0.0.0.0`-`255.255.255.255` firewall rule.
2. You immediately run:
   ```
   psql "host=psql-dc-and-360-tool-prod-ci-001.postgres.database.azure.com port=5432 dbname=dc_tool user=dctooladmin sslmode=require" -tAc "select inet_client_addr();"
   ```
3. You send them that address; they pin it and delete the temp rule.

Getting proper tenant access is the better fix if you need this more than
once — these IPs are dynamic and rotate every day or two.

## Gotchas that have each cost someone an afternoon

- **No IP-echo service reports the address Azure sees.** ipify, ifconfig.me, a
  DNS TXT lookup, and portquiz.net over 5432 itself gave four different wrong
  answers and four useless firewall rules. Only `select inet_client_addr()`
  is trustworthy. This is what `dbdiag.ps1` exists for.
- **A timeout is a firewall miss, not a network block.** Azure drops rejected
  packets silently, so "corporate network is blocking 5432" and "your IP is not
  allowlisted" are indistinguishable from the client. Never infer a network
  block from a timeout alone — it has always been the firewall here.
- **`Test-NetConnection` is useless for this.** It returns False for hosts that
  `psql` connects to seconds later. Test with `psql` itself.
- **Run `.ps1` files from PowerShell, not the `!` shell in Claude Code.** That
  shell is bash and will interpret the script line by line. Beyond the noise,
  it can skip the `finally` block that closes the firewall.
- **`az login` without `--tenant` fails confusingly.** It defaults to the
  `bajajauto` tenant, which has no subscriptions.
- Never run `npm run db:seed` against production — it inserts demo
  participants and mock feedback. First boot self-seeds the real sign-in
  accounts via `server/prisma/bootstrapAccessAccounts.js`.
