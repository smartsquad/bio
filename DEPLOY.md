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

### Per i subdomains (massimo.smartsquad.io → bio.smartsquad.io/massimo)

**Obiettivo**: Quando qualcuno visita `massimo.smartsquad.io` deve vedere esattamente il contenuto di `bio.smartsquad.io/massimo` (stesso per samuel/ceo e gli alias cto/ceo). L'URL nella barra deve rimanere pulito sul subdomain.

#### Sperimentale: Cloudflare Worker proxy (non deployato)

> Non deployato. Problema noto: sulla root del subdomain il router Vue vede `/` e dopo l'idratazione mostra la home. Usa le Redirect Rules.

Segui questi passi **esatti**:

1. Apri https://dash.cloudflare.com e vai nel tuo account.
2. Nel menu a sinistra clicca **Workers & Pages**.
3. Clicca il pulsante blu **Create** (o "Create a Worker").
4. Dai un nome al Worker, per esempio: `smartsquad-bio-proxy`
5. Clicca **Create Worker**.
6. Ora sei nell'editor del codice.
   - Cancella tutto il codice di default che c'è dentro.
   - Apri il file nel repo: `cf/subdomain-proxy.js`
   - Copia **tutto** il contenuto di quel file.
   - Incolla nel grande box dell'editor.
7. In alto a destra clicca **Deploy** (o Save and Deploy).
8. Aspetta che dica "Worker deployed successfully".
9. Ora vai su **Triggers** (nel menu del Worker, di solito in alto o a sinistra).
10. Clicca **Add Custom Domain** (o "Custom Domains").
11. Aggiungi uno per uno questi 4 domini (clicca Add dopo ognuno):
    - `massimo.smartsquad.io`
    - `cto.smartsquad.io`
    - `samuel.smartsquad.io`
    - `ceo.smartsquad.io`

Fatto. Cloudflare ora instrada automaticamente le richieste dai subdomains al Worker, che a sua volta prende il contenuto corretto da `bio.smartsquad.io/massimo` (o /samuel) e lo serve mantenendo l'URL pulito.

**Nota**: Assicurati che i domini siano "Proxied" (nuvola arancione) in DNS.

#### Consigliata (attiva): Redirect Rules (l'URL cambia)

Se non vuoi usare il Worker per ora, usa invece **Redirect Rules** (più facile ma l'utente vedrà bio.smartsquad.io nell'URL):

Vai su Cloudflare → il tuo dominio → Rules → Redirect Rules → Create Rule

**Regola per Massimo + CTO**:
- Rule name: Massimo mapping
- When incoming requests match: 
  - Field: Hostname
  - Operator: is in
  - Value: `massimo.smartsquad.io,cto.smartsquad.io`
- Then:
  - Redirect to: `https://bio.smartsquad.io/massimo`
  - Status: 301 (o 302)
  - Preserve query string: Yes

**Regola per Samuel + CEO**:
- Stessa cosa ma con `samuel.smartsquad.io,ceo.smartsquad.io`
- Redirect to: `https://bio.smartsquad.io/samuel`

Salva e testa.

---

Una volta fatto uno dei due metodi, apri in incognito:
- https://massimo.smartsquad.io
- https://bio.smartsquad.io/massimo

Devono mostrare lo stesso contenuto.

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
