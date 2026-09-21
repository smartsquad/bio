/**
 * Cloudflare Worker: Clean subdomain proxy for smartsquad-bio
 *
 * FAI QUESTO PER FAR FUNZIONARE:
 * massimo.smartsquad.io   →  bio.smartsquad.io/massimo   (stesso contenuto, URL pulito)
 * cto.smartsquad.io       →  bio.smartsquad.io/massimo
 * samuel.smartsquad.io    →  bio.smartsquad.io/samuel
 * ceo.smartsquad.io       →  bio.smartsquad.io/samuel
 *
 * === PASSI ESATTI (copia-incolla) ===
 *
 * 1. Vai su https://dash.cloudflare.com
 * 2. Clicca "Workers & Pages" nel menu a sinistra
 * 3. Clicca "Create" → "Create a Worker"
 * 4. Nome: smartsquad-bio-proxy   (o quello che vuoi)
 * 5. Clicca "Create Worker"
 * 6. Cancella TUTTO il codice che c'è nell'editor
 * 7. Apri questo file nel tuo repo: cf/subdomain-proxy.js
 * 8. Copia TUTTO il codice qui sotto (da export default { ... in poi)
 * 9. Incolla nell'editor di Cloudflare
 *10. Clicca "Deploy" in alto a destra
 *11. Vai su "Triggers" (nel menu del Worker)
 *12. Clicca "Add Custom Domain"
 *13. Aggiungi questi 4 domini uno per uno:
 *    - massimo.smartsquad.io
 *    - cto.smartsquad.io
 *    - samuel.smartsquad.io
 *    - ceo.smartsquad.io
 *
 * Fatto. Ora i subdomains funzionano.
 */

const ORIGIN = 'https://bio.smartsquad.io';

// Paths that are shared assets (not person-specific)
const ASSET_PREFIXES = ['/assets', '/fonts', '/og', '/favicons', '/media'];
const ASSET_EXTENSIONS = ['.js', '.css', '.png', '.jpg', '.jpeg', '.webp', '.svg', '.ico', '.woff', '.woff2', '.map'];

function isAssetPath(pathname) {
  if (ASSET_PREFIXES.some(p => pathname.startsWith(p))) return true;
  if (ASSET_EXTENSIONS.some(ext => pathname.endsWith(ext))) return true;
  if (pathname === '/robots.txt' || pathname === '/sitemap.xml' || pathname === '/llms.txt' || pathname === '/llms-full.txt') return true;
  if (pathname === '/favicon.ico') return true;
  return false;
}

function getSlugForHost(host) {
  if (host === 'massimo.smartsquad.io' || host === 'cto.smartsquad.io') return 'massimo';
  if (host === 'samuel.smartsquad.io' || host === 'ceo.smartsquad.io') return 'samuel';
  return null;
}

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const host = url.hostname;
    const originalPath = url.pathname;

    const slug = getSlugForHost(host);

    if (!slug) {
      // Not one of our subdomains — pass through or 404
      return fetch(`${ORIGIN}${originalPath}${url.search}`, request);
    }

    let targetPath;

    if (isAssetPath(originalPath)) {
      // Shared assets always come from the root of the main domain
      targetPath = originalPath;
    } else {
      // Everything else on the person subdomain serves that person's bio page
      targetPath = `/${slug}`;
    }

    const targetUrl = new URL(`${ORIGIN}${targetPath}${url.search}`);
    const res = await fetch(targetUrl, {
      method: request.method,
      headers: request.headers,
      redirect: 'manual',
    });

    const contentType = res.headers.get('content-type') || '';

    if (contentType.includes('text/html')) {
      let html = await res.text();

      // Keep canonical and og:url on the path URL so they match the sitemap.
      html = html.replace(
        /<link[^>]+rel=["']canonical["'][^>]*>/gi,
        `<link rel="canonical" href="${ORIGIN}/${slug}">`
      );
      html = html.replace(
        /<meta[^>]+property=["']og:url["'][^>]*>/gi,
        `<meta property="og:url" content="${ORIGIN}/${slug}">`
      );

      return new Response(html, {
        status: res.status,
        headers: {
          ...Object.fromEntries(res.headers),
          'content-type': 'text/html; charset=utf-8',
        },
      });
    }

    // Non-HTML (assets, etc.) — pass through as-is
    return res;
  },
};
