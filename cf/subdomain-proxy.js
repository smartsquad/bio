/**
 * Cloudflare Worker: Clean subdomain proxy for smartsquad-bio
 *
 * Deploy this as a Worker (or use it as inspiration for Page Rules / Transform Rules).
 *
 * Routes to configure on the Worker:
 *   massimo.smartsquad.io/*
 *   cto.smartsquad.io/*
 *   samuel.smartsquad.io/*
 *   ceo.smartsquad.io/*
 *
 * It fetches from the GitHub Pages origin and rewrites so the visitor
 * keeps seeing the nice subdomain in the address bar.
 */

const GH_PAGES_ORIGIN = 'https://smartsquad.github.io';
const BASE = '/smartsquad-bio';

export default {
  async fetch(request) {
    const url = new URL(request.url);
    const host = url.hostname;

    let targetPath = url.pathname;

    // Map subdomains to the correct bio path
    if (host === 'massimo.smartsquad.io' || host === 'cto.smartsquad.io') {
      if (targetPath === '/' || targetPath === '') targetPath = '/massimo';
      // otherwise keep the path the user typed (rare)
    } else if (host === 'samuel.smartsquad.io' || host === 'ceo.smartsquad.io') {
      if (targetPath === '/' || targetPath === '') targetPath = '/samuel';
    } else {
      // Fallback: serve home or let it 404
      return fetch(`${GH_PAGES_ORIGIN}${BASE}/`, request);
    }

    const targetUrl = new URL(`${GH_PAGES_ORIGIN}${BASE}${targetPath}${url.search}`);
    const res = await fetch(targetUrl, {
      ...request,
      redirect: 'manual',
    });

    // Rewrite the response so links and assets work under the subdomain
    // (simple HTML rewrite for canonicals / base if needed; for full SPA it's usually fine)
    const contentType = res.headers.get('content-type') || '';
    if (contentType.includes('text/html')) {
      let html = await res.text();

      // Optional: force canonical to the nice subdomain
      // html = html.replace(/https:\/\/smartsquad\.github\.io\/smartsquad-bio/g, `https://${host}`);

      return new Response(html, {
        status: res.status,
        headers: {
          ...Object.fromEntries(res.headers),
          'content-type': 'text/html; charset=utf-8',
          'x-robots-tag': 'noindex', // optional during initial testing
        },
      });
    }

    // Pass through assets, etc.
    return res;
  },
};
