# ImgPro — deployment

Live at **https://imgproai.onkra.online** on Coolify (`coolify.solnix.store`,
VPS `173.212.233.194`). Deployed 2026-10-08.

DNS is a single **A record `imgproai` → `173.212.233.194`** in the
`onkra.online` zone (Namecheap BasicDNS, `dns1`/`dns2.registrar-servers.com`).
There is **no wildcard** on the zone, so every app here needs its own record.

> The host is `imgproai`, not `imgpro` — it matches the GitHub repo name
> (`ImgProAi`). The app was initially configured for `imgpro.onkra.online`; when
> the DNS record turned out to be `imgproai`, the app was moved to the existing
> record rather than a second record being added. If you ever see
> `imgpro.onkra.online` referenced anywhere, it is stale: that name does not
> resolve.

## Coolify resources

| Resource | UUID | Notes |
|---|---|---|
| Project | `k7mqz4mxj74qyndfnaysikvf` | "ImgPro" |
| Environment | `nxh3r2gubsin78zdgrojsogx` | `production` |
| Server | `myfwitwdjhljv0ksumbn9vqq` | `localhost` (the Coolify host) |
| Application | `ivtdgptb05liqt5q1fxvdl5j` | `imgpro` |
| Database | `kixfpmdc295x2zvtci0mpl46` | `imgpro-postgres` (standalone PostgreSQL 16-alpine) |

## How it's wired

- **Source:** public GitHub repo `ankur4work/ImgProAi`, branch `main`, build
  pack **dockerfile**. No deploy key or GitHub App — the repo is public, so
  Coolify clones it anonymously. Pushing `main` does **not** auto-redeploy (no
  git webhook is configured); trigger a deploy explicitly (Coolify UI, or
  `POST /api/v1/deploy?uuid=ivtdgptb05liqt5q1fxvdl5j`).
- **Port:** container listens on `3000`; health check `GET /healthz`.
- **Migrations:** the container start command is `prisma migrate deploy &&
  react-router-serve` (see `Dockerfile` → `npm run docker-start`). Because the
  health check only passes once the server is serving, a healthy container is
  proof the migration applied. First deploy logged `Applying migration
  0001_init` → `All migrations have been successfully applied.`
- **Database URL:** set as a runtime env var in Coolify, using the Postgres
  resource's **internal** hostname (the container UUID above) over Coolify's
  Docker network. It is not reachable from outside the host.

## Secrets (NOT in git)

Set as environment variables on the `imgpro` application in Coolify:
`SHOPIFY_API_KEY`, `SHOPIFY_API_SECRET`, `SHOPIFY_APP_URL`, `SCOPES`,
`SHOPIFY_APP_HANDLE`, `DATABASE_URL`, `SUPPORT_EMAIL`. The Postgres password is
stored on the database resource in Coolify. None of these live in the repo.

> **Coolify injects every env var as a Docker build `ARG`**, regardless of the
> runtime/build-time flag — the first deploy log shows `ARG
> SHOPIFY_API_SECRET=…`. The app secret therefore persists in the built image's
> layer history. This is platform behaviour, not something the app config can
> opt out of (the API rejects `is_build_time` outright on this Coolify version,
> 4.3.23), and every sibling app here has the same exposure. It is a reason to
> rotate `SHOPIFY_API_SECRET` if an image is ever pushed to a shared registry.

## Verified on this deploy

All checks below are against the real public URL — real DNS, real TLS, no
client-side overrides.

| Check | Result |
|---|---|
| Docker build | ✅ `npm ci` → `prisma generate` → `react-router build` all clean |
| Migration | ✅ `0001_init` applied |
| Container | ✅ `running:healthy`, `react-router-serve` on `0.0.0.0:3000` |
| DNS | ✅ `imgproai.onkra.online` → `173.212.233.194` |
| TLS | ✅ Let's Encrypt, `CN=imgproai.onkra.online`, chain verifies, expires 2027-01-06 |
| `GET /healthz` | ✅ 200 `ok` |
| `GET /` and `/privacy` | ✅ 200, ImgPro branding, zero "PixelPro" strings, no stale `imgpro.` host |
| Theme shipped | ✅ `/assets/root-sFmkb1DU.css` (20.8 KB) serves indigo `#4F46E5`, `--ip-sh-1`, `--ip-r: 12px`; no teal `#0D9488` |
| `/app`, `/auth/login` | ✅ 410 without a Shopify session — identical to the working sibling app, this is the framework's response to direct non-embedded access |

Not yet exercised, because they need a real store session and the two pending
secrets: the five embedded feature pages (dashboard, product optimization, alt
text, page-speed reports, billing) and the webhook endpoints.

## Still required before the app works end to end

These are not deployable via the Coolify API and remain manual:

1. **Set `OPENAI_API_KEY`** in Coolify — currently unset, so AI alt text falls
   back to `"<product title> - product image"` for every image. Verify the key
   with a real completion, not an auth check: an unfunded key authenticates but
   returns `429 insufficient_quota` on every call (see README).
2. **Push Shopify app config** — `shopify.app.toml` (URLs, scopes, webhook
   subscriptions incl. the mandatory compliance webhook) only takes effect once
   pushed to Shopify: `shopify app deploy --allow-updates` with
   `SHOPIFY_APP_AUTOMATION_TOKEN` set. Until then the registered webhooks /
   redirect URLs are whatever the Dev Dashboard already has.
3. **Create the Managed Pricing plans** in the Dev Dashboard — `Free`,
   `Starter`, `Growth`, `Pro` (+ `… Annual`), names matching
   `app/plans.server.js` byte-for-byte. **The Free plan is mandatory** or a
   reviewer on a dev store hits an impassable pricing wall.
4. **Confirm `SHOPIFY_APP_HANDLE`** — set to the assumed `imgpro`. Shopify
   appends a numeric suffix on a name collision (previous builds became
   `optipix-3` and `imageboost-seo-1`), so verify against a real install URL
   (`/store/<store>/apps/<handle>/…`) and update the Coolify env var if it
   differs. A wrong handle 404s every pricing CTA. Note this is the *app
   handle*, which is independent of the `imgproai` DNS host.
5. **Rotate `SHOPIFY_API_SECRET`** — it was shared in plaintext during setup,
   and see the build-ARG note above. Rotate in the Dev Dashboard and update the
   Coolify env var.
