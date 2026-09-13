// Schreibt nach `vite build` die öffentlichen Seiten als statisches HTML.
//
//   dist/index.html              → /            (vorgerendert, indexierbar)
//   dist/<route>/index.html      → /<route>     (vorgerendert, indexierbar)
//   dist/spa.html                → alle übrigen Pfade (App, Login, Legal,
//                                  unbekannt): leere App-Shell mit noindex
//   dist/sitemap.xml             → nur die öffentlichen Routen
//
// Hosting-Zuordnung (nginx.conf): try_files $uri $uri/index.html /spa.html
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const dist = join(root, 'dist')
const ssrDir = join(root, 'dist-ssr')

const mod = await import(pathToFileURL(join(ssrDir, 'entry-prerender.js')).href)
const template = readFileSync(join(dist, 'index.html'), 'utf8')

// Platzhalter-Head aus index.html (Titel + Description) wird je Seite ersetzt.
const HEAD_RE = /<!--seo-head-->[\s\S]*?<!--\/seo-head-->/
const ROOT_TAG = '<div id="root"></div>'
if (!HEAD_RE.test(template) || !template.includes(ROOT_TAG)) {
  throw new Error('index.html: SEO-Platzhalter oder <div id="root"></div> fehlt')
}

function seite(head, body) {
  return template
    .replace(HEAD_RE, `<!--seo-head-->\n${head}\n    <!--/seo-head-->`)
    .replace(ROOT_TAG, `<div id="root">${body}</div>`)
}

// App-Shell ZUERST aus der unveränderten Vorlage — index.html wird gleich überschrieben.
writeFileSync(join(dist, 'spa.html'), seite(mod.appShellHead(), ''))

for (const route of mod.PUBLIC_ROUTES) {
  const { head, html } = mod.renderRoute(route.path)
  if (!html || html.length < 500) {
    throw new Error(`Prerender ${route.path}: kaum Inhalt (${html.length} Zeichen)`)
  }
  const ziel = route.path === '/' ? join(dist, 'index.html') : join(dist, route.path.slice(1), 'index.html')
  mkdirSync(dirname(ziel), { recursive: true })
  writeFileSync(ziel, seite(head, html))
  console.log(`prerender ${route.path.padEnd(12)} → ${ziel.slice(root.length + 1)} (${html.length} Zeichen)`)
}

writeFileSync(join(dist, 'sitemap.xml'), mod.sitemapXml())
rmSync(ssrDir, { recursive: true, force: true })
console.log('prerender: spa.html + sitemap.xml geschrieben')
