/**
 * Build-Prerender der öffentlichen Seiten (nur Build-Zeit, nie im Browser).
 *
 * `vite build --ssr src/entry-prerender.tsx` bündelt diese Datei; danach
 * schreibt scripts/prerender.mjs je öffentlicher Route eine statische HTML-Datei
 * mit dem gerenderten Seiteninhalt und den Head-Tags aus src/seo/seo.ts.
 *
 * Gerendert wird DERSELBE Routenbaum wie im Browser (AppRoutes) — der Inhalt
 * im ausgelieferten HTML entspricht damit dem, was Nutzer sehen. Der Client
 * rendert beim Start neu (createRoot), es gibt keinen Hydration-Abgleich.
 */
import { renderToString } from 'react-dom/server'
import { StaticRouter } from 'react-router-dom/server'
import { AppRoutes } from './App'
import { PrerenderContext } from './seo/prerender'
import {
  APP_SHELL_SEO, PUBLIC_ROUTES, headSeoFuer, headTagsHtml, sitemapXml,
} from './seo/seo'

export { PUBLIC_ROUTES, sitemapXml }

export function renderRoute(path: string): { head: string; html: string } {
  const html = renderToString(
    <PrerenderContext.Provider value={true}>
      <StaticRouter location={path}>
        <AppRoutes />
      </StaticRouter>
    </PrerenderContext.Provider>,
  )
  return { head: headTagsHtml(headSeoFuer(path)), html }
}

/** Head der App-Shell (Login, App, Legal-Platzhalter, unbekannte Pfade): noindex. */
export function appShellHead(): string {
  return headTagsHtml({ ...APP_SHELL_SEO, robots: 'noindex, nofollow', canonical: null, jsonLd: [] })
}
