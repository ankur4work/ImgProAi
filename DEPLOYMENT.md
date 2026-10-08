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

## Shopify app

| | |
|---|---|
| Org | SDLC LIMITED (`232511680`) |
| App | "ImgPro Ai" (`433012834305`), client_id `c25c46bf…` |
| Handle | **`imgpro-ai`** |
| Active version | `imgpro-ai-4` |

Config was pushed with `shopify app deploy --allow-updates` and is the **active**
version — URLs, scopes and all four webhook subscriptions including the
mandatory compliance webhook.

> **Two name traps here, both already hit once.**
>
> `name` in `shopify.app.toml` must match the Dev Dashboard app name
> (`ImgPro Ai`). It is not the in-app brand — that is "ImgPro", set in
> `app/components/ui.jsx`. If the two disagree, every `shopify app deploy`
> silently renames the Dashboard app.
>
> The **handle is `imgpro-ai`**, derived by Shopify from the app name at
> creation and never changed since. It is unrelated to the `imgproai` DNS host
> and to this repo's name. Read it with `shopify app versions list`: Shopify
> tags versions `<handle>-<n>`. But note a push whose toml `name` disagrees with
> the Dashboard gets tagged from the *toml* name — an early push here with
> `name = "ImgPro"` produced the tag `imgpro-2`, which reads exactly like a
> handle of `imgpro` and is how a wrong `SHOPIFY_APP_HANDLE` gets adopted.

Releasing a version **overwrites whatever was active**, including changes made
by hand in the Dashboard. That happened once during setup: a Dashboard release
(`imgpro-ai-3`) landed after the first CLI push and deactivated it, leaving the
compliance webhook unregistered until `imgpro-ai-4` was pushed. If someone edits
the app in the Dashboard, re-push from the repo or the two drift.

## Secrets (NOT in git)

Set as environment variables on the `imgpro` application in Coolify:
`SHOPIFY_API_KEY`, `SHOPIFY_API_SECRET`, `SHOPIFY_APP_URL`, `SCOPES`,
`SHOPIFY_APP_HANDLE`, `DATABASE_URL`, `SUPPORT_EMAIL`, `OPENAI_API_KEY`. The
Postgres password is stored on the database resource in Coolify. None of these
live in the repo.

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
| `/privacy` content | ✅ shows `admin@swiftcart.live` and no fallback address; discloses both OpenAI and Google PageSpeed, as the App Store requires |
| Shopify config | ✅ `imgpro-ai-4` active: URLs, scopes, 4 webhook subs incl. compliance |
| `OPENAI_API_KEY` | ✅ verified with a real `gpt-4o-mini` completion **and** a real vision call (correctly described a test image) — not an auth check, so a `429 insufficient_quota` key would have been caught |

Not yet exercised, because they need a real store session: the five embedded
feature pages (dashboard, product optimization, alt text, page-speed reports,
billing) and the webhook endpoints. Install the app on a dev store to drive
those — and set `DEV_PLAN_OVERRIDE`, since dev stores cannot approve paid
managed-pricing plans.

## Still required

1. **Create the Managed Pricing plans** in the Dev Dashboard — `Free`,
   `Starter`, `Growth`, `Pro` (+ `… Annual`), names matching
   `app/plans.server.js` byte-for-byte. **The Free plan is mandatory**:
   `app/routes/app.jsx` gates the whole app on `hasActivePlan`, so without a
   Free plan a reviewer on a development store sees only a pricing wall they
   cannot get past — an automatic rejection. This is the one remaining blocker
   to installing the app and exercising the feature pages.
2. **Install on a dev store and drive the five feature pages** — nothing below
   the auth boundary has been exercised yet. Set `DEV_PLAN_OVERRIDE`, since dev
   stores cannot approve paid managed-pricing plans.
3. **Rotate `SHOPIFY_API_SECRET`** — it was shared in plaintext during setup,
   and see the build-ARG note above. Rotate in the Dev Dashboard and update the
   Coolify env var.
4. **Consider `GOOGLE_PAGESPEED_API_KEY`** — intentionally unset; the app uses
   the keyless PageSpeed endpoint, which has a low shared daily cap. Only set a
   key with the PageSpeed Insights API enabled: a 403 is not retryable, so a
   blocked key is worse than none (see README).
