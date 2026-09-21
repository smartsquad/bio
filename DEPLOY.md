# smartsquad-bio — Deployment & Setup

## 1. GitHub Pages (required first time)

The build succeeds and the artifact is produced, but deployment to Pages fails until you enable it:

1. Go to: https://github.com/smartsquad/bio/settings/pages
2. Under "Build and deployment" → **Source** select **GitHub Actions**
3. Save.

After enabling, re-run the "Deploy site" workflow (or push to master).

Then go to Settings → Pages and set **Custom domain** to `bio.smartsquad.io`.

After adding the custom domain (and GH verifies the DNS), re-run the deploy workflow.

The site will be published at:

https://bio.smartsquad.io/

## 2. PostHog (done)

Public key and host are set as Repository Variables:
- `VITE_POSTHOG_KEY=phc_vwZrEoPt7x9cosJTBSvYsJA7VNgJtv679oviK2mmvwha`
- `VITE_POSTHOG_HOST=https://eu.i.posthog.com`

Analytics (autocapture + custom events) will start working as soon as the next successful deploy lands.

If you want per-person stats in `/admin`, you will also need to set the **secret** `POSTHOG_READ_KEY` later.

## 3. Cloudflare subdomains (massimo / samuel + aliases)

Target public experience:
- `https://massimo.smartsquad.io`  (and `cto.smartsquad.io`)
- `https://samuel.smartsquad.io`   (and `ceo.smartsquad.io`)

The GitHub Pages project uses custom domain `bio.smartsquad.io`.

### Recommended simple setup (Redirects) - quick start

In Cloudflare → Rules → Redirect Rules, create two rules:

**Rule 1 - Massimo side**
- Name: massimo + cto
- When: `(http.host eq "massimo.smartsquad.io" or http.host eq "cto.smartsquad.io")`
- Then: Dynamic redirect → `https://bio.smartsquad.io/massimo`

**Rule 2 - Samuel side**
- When: `(http.host eq "samuel.smartsquad.io" or http.host eq "ceo.smartsquad.io")`
- Then: redirect to `https://bio.smartsquad.io/samuel`

For even cleaner experience (address bar stays on nice subdomain without seeing bio.smartsquad.io), use the Worker in `cf/subdomain-proxy.js`.

### For clean URLs in the address bar (experimental)

> Not deployed. Known issue: on the subdomain root the Vue router sees `/` and renders the home page after hydration. Use the Redirect Rules.

Use a small Cloudflare Worker so the address bar stays on the nice subdomain (e.g. massimo.smartsquad.io) instead of showing bio.smartsquad.io.

Example worker in `cf/subdomain-proxy.js` (already updated for bio.smartsquad.io origin).

Deploy steps:
1. Workers & Pages → Create Worker → paste the code.
2. Add routes for the four subdomains.
3. The Worker proxies from bio.smartsquad.io .

This way people see `massimo.smartsquad.io` while content is served from the custom domain.

### Admin API

- Point `api.bio.smartsquad.io` as **Custom Domain** on the Cloudflare Worker (`smartsquad-bio-admin`).
- This is required for the cookie to be first-party when using `/admin`.

## 4. Re-deploy

After enabling Pages or changing vars:

```bash
# In GitHub UI: Actions → "Deploy site" → Run workflow
```

Or push a commit to `master`.

## 5. Local development

```bash
bun install
cp .env.example .env.local
bun dev
```

## 6. Admin (optional)

If you want the live editor:

1. Deploy the Worker (needs secrets: `CLOUDFLARE_*`, `SESSION_SECRET`, `ADMIN_GITHUB_TOKEN`, `ADMIN_USERS`, `POSTHOG_READ_KEY`).
2. Set `VITE_ADMIN_API` repo variable to `https://api.bio.smartsquad.io`.
3. Generate users with `bun worker/hash-password.ts`.

See the main README for full details.
