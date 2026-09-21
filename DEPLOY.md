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

**Important for DNS (Cloudflare):**

For `bio.smartsquad.io` to work (Origin DNS error fix):

In Cloudflare DNS for smartsquad.io zone, create this record:

- Type: **CNAME**
- Name: `bio`
- Target: `smartsquad.github.io`
- Proxy status: **Proxied** (orange cloud)

This makes CF proxy to GitHub Pages.

Then the subdomains can use the Worker or redirect rules.

### Recommended: Clean subdomain mapping (massimo.smartsquad.io → bio.smartsquad.io/massimo)

**Goal**: `massimo.smartsquad.io` (and `cto.smartsquad.io`) must clearly serve the same content as `bio.smartsquad.io/massimo`, and `samuel.smartsquad.io` / `ceo.smartsquad.io` for Samuel.

#### Experimental: Cloudflare Worker proxy (not deployed)

> Not deployed. Known issue: on the subdomain root the Vue router sees `/` and renders the home page after hydration. Use the Redirect Rules.

Use the ready-made worker:

1. Go to Cloudflare → Workers & Pages → Create Worker
2. Name it e.g. `smartsquad-bio-subdomains`
3. Delete the default code and paste the entire content of `cf/subdomain-proxy.js`
4. Save and Deploy
5. Go to the Worker → **Triggers** → **Custom Domains** (or Routes) and add:
   - `massimo.smartsquad.io/*`
   - `cto.smartsquad.io/*`
   - `samuel.smartsquad.io/*`
   - `ceo.smartsquad.io/*`

This Worker does exactly:
- `massimo.smartsquad.io` → serves `bio.smartsquad.io/massimo`
- `cto.smartsquad.io` → same
- Same logic for Samuel side
- Assets are correctly loaded from the main domain
- Address bar stays on the subdomain

#### Recommended (live): Redirect Rules

Use Cloudflare Redirect Rules (the visitor will see `bio.smartsquad.io` in the URL after the click):

**Rule Massimo + CTO**
- When: `http.host in {"massimo.smartsquad.io" "cto.smartsquad.io"}`
- Then: Redirect to `https://bio.smartsquad.io/massimo` (Status 301 or 302)

**Rule Samuel + CEO**
- When: `http.host in {"samuel.smartsquad.io" "ceo.smartsquad.io"}`
- Then: Redirect to `https://bio.smartsquad.io/samuel`

### Clean subdomain experience (experimental)

> Not deployed. Known issue: on the subdomain root the Vue router sees `/` and renders the home page after hydration. Use the Redirect Rules.

The Worker in `cf/subdomain-proxy.js` is already written to achieve exactly what you asked:

**massimo.smartsquad.io** (and cto) serves the same page as **bio.smartsquad.io/massimo**  
**samuel.smartsquad.io** (and ceo) serves the same page as **bio.smartsquad.io/samuel**

Follow the steps in the section above ("Recommended: Clean subdomain mapping").

After adding the Custom Domains to the Worker, visiting `massimo.smartsquad.io` will load the correct content while keeping the clean subdomain in the browser.

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
