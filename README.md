# smartsquad-bio

**Link-in-bio** site for the Smart Squad founders (Massimo & Samuel) — one page per person, content in the repo as
JSON, edited through a small custom admin, with per-person SEO, OpenGraph images and favicons.

Used for `massimo.smartsquad.io`, `samuel.smartsquad.io` (with aliases `cto.smartsquad.io` and `ceo.smartsquad.io`).

Vue 3 + Vite 8 + Tailwind v4 + Pug + SCSS + i18next, prerendered with **vite-ssg**, deployed to
**GitHub Pages** (under the `smartsquad` org), with a **Cloudflare Worker** admin API and Cloudflare for subdomain routing.

## How it works

- **Content** lives in `content/bios/<slug>.json` (one per person), typed by `src/content/bio.ts`
  (`IBio`). It is loaded at build time (`src/composables/use-bios.ts`).
- **Routing** — each bio is `smartsquad.io/<slug>` (or `<slug>.smartsquad.io`). `BioView.vue` renders the resolved
  `IBio`. Subdomains (`massimo.smartsquad.io`, `samuel.smartsquad.io`, `cto.smartsquad.io`, `ceo.smartsquad.io`)
  are handled via Cloudflare (301 or proxy to the correct path on the GitHub Pages site).
- **Prerendering** — `vite-ssg` emits one static HTML per bio (`vite.config.ts` `includedRoutes`)
  so each `/<slug>` ships its own `<title>`/OG/`<meta>` (via `@unhead/vue`) for social scrapers.
- **OG images + favicons** — generated post-build into `dist/og/<slug>.png` and
  `dist/favicons/<slug>.svg` (`scripts/generate-og.ts`, `scripts/generate-favicons.ts`).
- **Theme per bio** — `IBio.theme` (primary/secondary colours, font, card radius, avatar
  radius/border) is applied via CSS variables in `BioView.vue` and configurable in the admin.

## Admin

`/admin` is a custom, client-only SPA (`src/views/AdminView.vue`). It talks only to the
Cloudflare Worker (`worker/`, served at `https://api.smartsquad.io` or equivalent), which is the trust boundary
holding every secret. The Worker **must** share a registrable domain with the site (not its `*.workers.dev`
URL): the SPA and API then share a registrable domain, so the httpOnly session cookie is first-party
and Safari sends it — a cross-site `*.workers.dev` API gets its cookie blocked and every call 401s.

- **Custom basic auth** — users are defined in the Worker's `ADMIN_USERS` secret. Each person logs
  in and is scoped to their own bio.
- **Stats home** — the Worker proxies the **PostHog** query API, scoped to that person's path, so the
  admin home shows their visits, unique visitors, views-per-day and clicks-by-link.
- **Editor** — edit your own bio (profile, appearance/theme, content, links, socials) with a live
  preview. Saving commits `content/bios/<slug>.json` to GitHub via the Worker, which triggers a
  rebuild. A person can only ever save their own slug (enforced server-side).

Generate an `ADMIN_USERS` entry:

```sh
bun worker/hash-password.ts <user> <slug> <password>
# -> {"user":"…","slug":"…","salt":"…","passHash":"…"}
```

## Analytics

Both run, behind one `track()` in `src/composables/use-analytics.ts`:

- **Google Tag Manager** — container `GTM-MCT4XSDM`, lazy-loaded; `<noscript>` fallback in
  `index.html`. Events: `page_view`, `link_click` (`{ link_id, link_url, location, bio }`),
  `share_open`, `share_native`.
- **PostHog** — `VITE_POSTHOG_KEY` (public). Autocapture + the same custom events. Powers the
  admin's per-person dashboard via the Worker (which holds the secret read key).

## Project setup

```sh
bun install
cp .env.example .env.local                 # public VITE_* values for local dev
cp worker/.dev.vars.example worker/.dev.vars # Worker secrets for local dev
```

### Develop

```sh
bun dev                  # public site + admin SPA
bun worker/dev-server.ts # admin API on :8787 (Bun — no wrangler needed locally)
```

Set `VITE_ADMIN_API=http://localhost:8787` in `.env.local`, then log into `/admin` with a
user from `worker/.dev.vars`. (Production deploys the Worker via wrangler.)

### Build / type-check / lint

```sh
bun run build      # type-check + vite-ssg + OG + favicons
bun run type-check
bun lint
```

## Deploy

Two GitHub Actions workflows (repo lives under the `smartsquad` GitHub org):

- **`.github/workflows/deploy-site.yml`** — builds and deploys `dist/` to GitHub Pages on push to
  `master`. Public values come from repo **Variables** (`VITE_POSTHOG_KEY`, `VITE_POSTHOG_HOST`,
  `VITE_ADMIN_API`). A `404.html` SPA fallback is added.
- **`.github/workflows/deploy-worker.yml`** — `wrangler deploy` for `worker/` on changes, pushing
  secrets from repo **Secrets**: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `SESSION_SECRET`,
  `ADMIN_GITHUB_TOKEN` (→ Worker `GITHUB_TOKEN`), `POSTHOG_READ_KEY`, `ADMIN_USERS`. Non-secret
  config is in `worker/wrangler.toml` (`GITHUB_REPO = "smartsquad/bio"`, `POSTHOG_*`,
  `ALLOWED_ORIGIN`).

The site is published to GitHub Pages. Cloudflare is used for the custom subdomains
(`massimo.smartsquad.io`, `samuel.smartsquad.io`, `cto.smartsquad.io`, `ceo.smartsquad.io`) and
the admin API custom domain.

### DNS & Cloudflare setup (for massimo.smartsquad.io / samuel.smartsquad.io + aliases)

GitHub Pages hosts the static site at:
`https://smartsquad.github.io/smartsquad-bio/`

(After enabling GitHub Pages → "GitHub Actions" source in repo Settings.)

Cloudflare is used to provide the clean branded subdomains:

**DNS records (in Cloudflare for smartsquad.io zone):**
- `massimo`, `samuel`, `cto`, `ceo` → CNAME (or appropriate) pointing at the GH Pages host, or
- Use **Redirect Rules** (Dynamic or static) or a small CF Worker/Page to map:
  - `https://massimo.smartsquad.io/*` → `https://smartsquad.github.io/smartsquad-bio/massimo` (preserve path suffix or hard-map)
  - `https://cto.smartsquad.io/*` → same as massimo
  - `https://samuel.smartsquad.io/*` and `ceo...` likewise

**Admin API:**
- `api.smartsquad.io` → Custom Domain on the deployed Worker (`smartsquad-bio-admin`).

This way visitors see nice URLs like `massimo.smartsquad.io` while the content + assets come from the GitHub Pages build (which uses base `/smartsquad-bio/`).

After first successful Pages deploy you will also see the Pages URL in the Actions environment.

See the original de-luisa-bio repository for HSTS / SSL edge cert details if proxying everything through Cloudflare (orange cloud).

## Adding / updating a founder

A member needs two things: an **admin login** and a **bio**. The home grid and routes include any
`content/bios/*.json` automatically — no code changes.

### 1. Create the admin login (required)

Generate a salted PBKDF2 entry (username = slug):

```sh
bun worker/hash-password.ts <slug> <slug> <password>
# e.g. bun worker/hash-password.ts marco marco a-strong-password
# -> {"user":"marco","slug":"marco","salt":"…","passHash":"…"}
```

Add that object to the `ADMIN_USERS` JSON array:

- **Local**: in `worker/.dev.vars` (insert `,{…}` before the closing `]`), then restart `bun run dev`.
- **Production**: update the GitHub **Secret `ADMIN_USERS`** with the full array (all users).

Rules: the **slug** is the URL path and the preferred subdomain (e.g. `massimo`, `samuel`) — lowercase letters, digits and
hyphens only. Each user can edit **only** their own bio (enforced by the Worker).

### 2. Create the bio — two ways

- **Via the admin (easiest):** the person signs in at `/admin`, fills everything (name, colours,
  content, links, socials) with live preview, then **Save bio**. This creates / updates
  `content/bios/<slug>.json` (in production it commits to GitHub via the Worker).
- **Pre-seed / manual:** edit `content/bios/<slug>.json` directly in the repo (or copy an existing one and tweak `slug` / `name` / `theme`). Leave `avatar: ""` to show a letter glyph until a photo is added.

Avatars (optional) are square WebP sets under `public/media/<slug>-*.webp`; the JSON stores the base `/media/<slug>`.

After push the site rebuilds on GitHub Pages. Cloudflare routes the subdomains.

## Tech

Vue 3 (beta) · Vite 8 · vite-ssg · Tailwind CSS v4 · Pug + SCSS · i18next · @unhead/vue · VueUse ·
satori + resvg (OG) · PostHog + GTM · Cloudflare Workers · TypeScript · Bun.

Deployed to GitHub Pages under the Smart Squad GitHub organization. Subdomains managed with Cloudflare.
