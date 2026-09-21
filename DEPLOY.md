# smartsquad-bio — Deployment & Setup

## 1. GitHub Pages (required first time)

The build succeeds and the artifact is produced, but deployment to Pages fails until you enable it:

1. Go to: https://github.com/smartsquad/bio/settings/pages
2. Under "Build and deployment" → **Source** select **GitHub Actions**
3. Save.

After enabling, re-run the "Deploy site" workflow (or push to master). The site will be published at:

https://smartsquad.github.io/smartsquad-bio/

You will see the Pages URL in the Actions environment after the first successful run.

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

Current hosting: GitHub Pages at `https://smartsquad.github.io/smartsquad-bio/`

### Recommended simple setup (Redirects)

In Cloudflare for the `smartsquad.io` zone create **Redirect Rules** (or use a Worker):

Single Rule example (Dynamic Redirect):

- When: `(http.host eq "massimo.smartsquad.io" or http.host eq "cto.smartsquad.io")`
- Then: redirect to `https://smartsquad.github.io/smartsquad-bio/massimo` (301 or 302), preserve query string.

Do the same for `samuel` / `ceo` → `/samuel`

For the root of the subdomain you can also redirect `https://massimo.smartsquad.io/` → `/massimo`

### For clean URLs in the address bar (optional, more advanced)

Use a Cloudflare Worker that proxies the GitHub Pages origin and rewrites paths/assets if you want the visitor to stay on `massimo.smartsquad.io` without seeing the github.io path.

Or attach a custom domain to the Pages project (e.g. `bio.smartsquad.io`) and then use sub-sub paths or separate rules.

### Admin API

- Point `api.smartsquad.io` as **Custom Domain** on the Cloudflare Worker (`smartsquad-bio-admin`).
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
2. Set `VITE_ADMIN_API` repo variable to `https://api.smartsquad.io`.
3. Generate users with `bun worker/hash-password.ts`.

See the main README for full details.
