/**
 * SEO-Grundlage (Google / ChatGPT Search / Gemini): robots.txt, Sitemap,
 * Canonicals, index/noindex, Metadaten, Structured Data und — nach
 * `npm run build` — das tatsächlich ausgelieferte HTML in dist/.
 *
 * Aufruf: npm run build && npm run test:seo
 */
import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'
import {
  PUBLIC_ROUTES, SITE_URL, canonicalUrl, headSeoFuer, jsonLdText, sitemapXml,
} from './seo.ts'

const here = dirname(fileURLToPath(import.meta.url))
const repo = join(here, '..', '..')
const lies = (...p: string[]) => readFileSync(join(repo, ...p), 'utf8')
const dist = join(repo, 'dist')
const HAT_DIST = existsSync(join(dist, 'spa.html'))

const appTsx = lies('src', 'App.tsx')
const robots = lies('public', 'robots.txt')
const nginx = lies('nginx.conf')

// Alle Routen aus App.tsx — jede muss klassifiziert sein (öffentlich ODER privat).
const APP_PFADE = [...appTsx.matchAll(/<Route\s+path="([^"]+)"/g)].map((m) => m[1]).filter((p) => p !== '/*' && p !== '*')
const PRIVAT = [
  '/login', '/chat', '/kaufcheck', '/verkaufscheck', '/dealer', '/dealer/:id', '/entdecken',
  '/ebooks', '/ersatzteile', '/settings', '/help',
  // Rechtstexte: bis zum Legal-Block unfertig -> noindex, nicht in der Sitemap.
  '/impressum', '/datenschutz', '/agb', '/widerruf',
  // Landeseite des Bestätigungslinks: persönlicher Einmal-Link, nie indexieren.
  '/email-bestaetigen',
]
const OEFFENTLICH = PUBLIC_ROUTES.map((r) => r.path)
const VERBOTEN = /localhost|127\.0\.0\.1|getvira|autoki\.de|\bvira\b|app\.getenfal\.de|api\.getenfal\.de/i

// ── robots.txt ──────────────────────────────────────────────────────────────

function robotsGruppen(txt: string): Map<string, string[]> {
  const gruppen = new Map<string, string[]>()
  let agents: string[] = []
  let inRegeln = false
  for (const roh of txt.split(/\r?\n/)) {
    const zeile = roh.replace(/#.*/, '').trim()
    if (!zeile) continue
    const [feld, ...rest] = zeile.split(':')
    const wert = rest.join(':').trim()
    const f = feld.trim().toLowerCase()
    if (f === 'user-agent') {
      if (inRegeln) { agents = []; inRegeln = false }
      agents.push(wert.toLowerCase())
      if (!gruppen.has(wert.toLowerCase())) gruppen.set(wert.toLowerCase(), [])
    } else if (f === 'allow' || f === 'disallow') {
      inRegeln = true
      for (const a of agents) gruppen.get(a)!.push(`${f}:${wert}`)
    }
  }
  return gruppen
}
const G = robotsGruppen(robots)

test('robots: Googlebot darf alles crawlen', () => {
  assert.deepEqual(G.get('googlebot'), ['allow:/'])
})
test('robots: Google-Extended erlaubt (Gemini-Grounding gewünscht)', () => {
  assert.deepEqual(G.get('google-extended'), ['allow:/'])
})
test('robots: OAI-SearchBot erlaubt (ChatGPT Search)', () => {
  assert.deepEqual(G.get('oai-searchbot'), ['allow:/'])
})
test('robots: GPTBot blockiert (nur Training, für ChatGPT Search nicht nötig)', () => {
  assert.deepEqual(G.get('gptbot'), ['disallow:/'])
})
test('robots: Standardgruppe erlaubt, keine öffentliche Seite blockiert', () => {
  assert.deepEqual(G.get('*'), ['allow:/'])
  for (const [agent, regeln] of G) {
    if (agent === 'gptbot') continue
    assert.ok(!regeln.some((r) => r.startsWith('disallow:') && r !== 'disallow:'), `${agent}: ${regeln}`)
  }
})
test('robots: referenziert genau die Produktions-Sitemap', () => {
  const sm = robots.split(/\r?\n/).filter((l) => /^sitemap:/i.test(l.trim()))
  assert.deepEqual(sm.map((l) => l.trim()), ['Sitemap: https://getenfal.de/sitemap.xml'])
})

// ── Routen-Klassifikation / index-noindex ───────────────────────────────────

test('Routen: jede App-Route ist genau einer Klasse zugeordnet', () => {
  for (const p of APP_PFADE) {
    const pub = OEFFENTLICH.includes(p), priv = PRIVAT.includes(p)
    assert.ok(pub !== priv, `Route ${p} ist nicht eindeutig klassifiziert`)
  }
  for (const p of OEFFENTLICH) assert.ok(APP_PFADE.includes(p), `öffentliche Route ${p} existiert nicht in App.tsx`)
})
test('Routen: öffentliche Seiten liegen NICHT hinter dem Login-Guard', () => {
  for (const p of OEFFENTLICH.filter((x) => x !== '/')) {
    const zeile = appTsx.split('\n').find((l) => l.includes(`path="${p}"`))!
    assert.doesNotMatch(zeile, /Guard/, p)
  }
})
test('index/noindex: öffentlich = index + Canonical, privat/unbekannt = noindex ohne Canonical', () => {
  for (const p of OEFFENTLICH) {
    const s = headSeoFuer(p)
    assert.equal(s.robots, 'index, follow', p)
    assert.equal(s.canonical, canonicalUrl(p))
  }
  for (const p of [...PRIVAT.map((x) => x.replace(':id', '42')), '/gibt-es-nicht', '/checks/1', '/payment-success']) {
    const s = headSeoFuer(p)
    assert.equal(s.robots, 'noindex, nofollow', p)
    assert.equal(s.canonical, null, p)
    assert.equal(s.jsonLd.length, 0, p)
  }
})
test('index/noindex: Query-Strings und Slash am Ende ändern den Canonical nicht', () => {
  assert.equal(headSeoFuer('/pricing?plan=plus').canonical, 'https://getenfal.de/pricing')
  assert.equal(headSeoFuer('/pricing/').canonical, 'https://getenfal.de/pricing')
  assert.equal(headSeoFuer('/').canonical, 'https://getenfal.de/')
})

// ── Metadaten ───────────────────────────────────────────────────────────────

test('Metadaten: Titel eindeutig, mit ENFAL, sinnvolle Länge', () => {
  const titel = PUBLIC_ROUTES.map((r) => r.title)
  assert.equal(new Set(titel).size, titel.length)
  for (const t of titel) {
    assert.match(t, /ENFAL/)
    assert.ok(t.length >= 20 && t.length <= 70, `${t} (${t.length})`)
  }
})
test('Metadaten: Descriptions eindeutig, 70–170 Zeichen', () => {
  const d = PUBLIC_ROUTES.map((r) => r.description)
  assert.equal(new Set(d).size, d.length)
  for (const x of d) assert.ok(x.length >= 70 && x.length <= 170, `${x.length}: ${x}`)
})
test('Metadaten: keine Altmarken, localhost oder App-/API-Domains', () => {
  const alles = JSON.stringify(PUBLIC_ROUTES) + robots + sitemapXml() + lies('index.html')
  assert.doesNotMatch(alles, VERBOTEN)
  assert.equal(SITE_URL, 'https://getenfal.de')
})

// ── Sitemap ─────────────────────────────────────────────────────────────────

function locs(xml: string): string[] {
  return [...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1])
}
test('Sitemap: gültige Struktur, genau die öffentlichen Seiten', () => {
  const xml = sitemapXml()
  assert.match(xml, /^<\?xml version="1\.0" encoding="UTF-8"\?>\n<urlset xmlns="http:\/\/www\.sitemaps\.org\/schemas\/sitemap\/0\.9">/)
  assert.equal((xml.match(/<url>/g) || []).length, (xml.match(/<\/url>/g) || []).length)
  assert.deepEqual(locs(xml), OEFFENTLICH.map(canonicalUrl))
})
test('Sitemap: keine privaten Routen, keine Query-Strings, nur https://getenfal.de', () => {
  for (const l of locs(sitemapXml())) {
    assert.ok(l.startsWith('https://getenfal.de/'), l)
    assert.doesNotMatch(l, /[?#]/)
    const pfad = l.slice(SITE_URL.length) || '/'
    assert.ok(!PRIVAT.some((p) => pfad === p || pfad.startsWith(p.replace(':id', ''))), l)
  }
  assert.doesNotMatch(sitemapXml(), /lastmod/) // keine erfundenen Zeitstempel
})

// ── Structured Data ─────────────────────────────────────────────────────────

test('Structured Data: parsebar, schema.org, keine erfundenen Bewertungen/Firmendaten', () => {
  for (const r of PUBLIC_ROUTES) {
    assert.ok(r.jsonLd.length > 0, r.path)
    for (const o of r.jsonLd) {
      const j = JSON.parse(jsonLdText(o))
      assert.equal(j['@context'], 'https://schema.org')
      assert.ok(typeof j['@type'] === 'string')
      const s = JSON.stringify(j)
      assert.doesNotMatch(s, /aggregateRating|"review|ratingValue|address|telephone|vatID|foundingDate|numberOfEmployees|sameAs/)
    }
  }
})
test('Structured Data: Preise entsprechen exakt Pricing V1', () => {
  const preise = new Set<string>()
  for (const r of PUBLIC_ROUTES) {
    for (const m of JSON.stringify(r.jsonLd).matchAll(/"price":"([^"]+)"/g)) preise.add(m[1])
  }
  assert.deepEqual([...preise].sort(), ['0', '16.99', '5.99', '8.99'])
})

// ── Hosting-Routing (nginx) ─────────────────────────────────────────────────

test('nginx: vorgerenderte Seiten direkt, alles andere auf die noindex-App-Shell', () => {
  assert.match(nginx, /try_files \$uri \$uri\/index\.html \/spa\.html;/)
  assert.doesNotMatch(nginx, /try_files[^;]*\/index\.html;\s*$/m)
  assert.match(nginx, /expires \$enfal_html_expires;/)
})
test('nginx: Security-Header gelten in JEDER location (add_header wird nicht vererbt)', () => {
  const snippet = lies('nginx-security-headers.conf')
  for (const h of ['X-Content-Type-Options', 'X-Frame-Options', 'Referrer-Policy', 'Permissions-Policy',
    'Strict-Transport-Security', 'Cross-Origin-Opener-Policy', 'Cross-Origin-Resource-Policy']) {
    assert.match(snippet, new RegExp(`^add_header ${h} .* always;$`, 'm'), h)
  }
  // Ohne Kommentare: jede location mit eigenem add_header muss das Snippet einbinden.
  const code = nginx.replace(/#.*$/gm, '')
  const include = 'include /etc/nginx/snippets/enfal-security-headers.conf;'
  assert.ok(code.split('\n').some((l) => l.trim() === include), 'server-weites include fehlt')
  for (const block of code.split(/\blocation\b/).slice(1)) {
    const rumpf = block.slice(0, block.indexOf('}'))
    if (/add_header/.test(rumpf)) assert.ok(rumpf.includes(include), `location ohne Snippet: ${rumpf.split('{')[0].trim()}`)
  }
  assert.doesNotMatch(code, /add_header (X-Content-Type-Options|Strict-Transport-Security)/, 'Header nur im Snippet pflegen')
  assert.match(lies('Dockerfile'), /COPY nginx-security-headers\.conf \/etc\/nginx\/snippets\/enfal-security-headers\.conf/)
})
test('Image: lokales Bild-Backup und Build-Output nie im Docker-Kontext', () => {
  const ignore = lies('.dockerignore').split(/\r?\n/).map((l) => l.trim())
  for (const e of ['public/cars/_backup/', 'dist/', 'dist-ssr/', '.env', '.env.*']) assert.ok(ignore.includes(e), e)
  assert.match(lies('Dockerfile'), /node scripts\/verify-build\.mjs env[\s\S]*npm run build[\s\S]*node scripts\/verify-build\.mjs dist/)
})

// ── Gebautes HTML (dist/) ───────────────────────────────────────────────────

/** Nachbildung von `try_files $uri $uri/index.html /spa.html` (Dateien in dist/). */
function nginxDatei(pfad: string): string {
  const u = decodeURIComponent(pfad.split(/[?#]/)[0])
  const kandidaten = [u, `${u.replace(/\/$/, '')}/index.html`]
  for (const k of kandidaten) {
    const f = join(dist, k)
    if (existsSync(f) && statSync(f).isFile()) return f
  }
  return join(dist, 'spa.html')
}
function head(html: string) { return html.slice(0, html.indexOf('</head>')) }
function zaehle(s: string, re: RegExp) { return (s.match(re) || []).length }

test('dist: Build vorhanden (npm run build vor test:seo)', { skip: HAT_DIST ? false : 'kein dist/ — erst npm run build' }, () => {
  assert.ok(HAT_DIST)
})

test('dist: öffentliche Seiten sind vorgerendert mit korrektem Head', { skip: !HAT_DIST }, () => {
  for (const r of PUBLIC_ROUTES) {
    const html = readFileSync(nginxDatei(r.path), 'utf8')
    const h = head(html)
    assert.equal(zaehle(h, /<title>/g), 1, r.path)
    assert.equal(zaehle(h, /name="description"/g), 1, r.path)
    assert.equal(zaehle(h, /name="robots"/g), 1, r.path)
    assert.equal(zaehle(h, /rel="canonical"/g), 1, r.path)
    assert.ok(h.includes(`<link rel="canonical" href="${canonicalUrl(r.path)}" />`), r.path)
    assert.ok(h.includes('<meta name="robots" content="index, follow" />'), r.path)
    assert.ok(h.includes(`<meta property="og:url" content="${canonicalUrl(r.path)}" />`), r.path)
    for (const og of ['og:title', 'og:description', 'og:type']) assert.ok(h.includes(`property="${og}"`), `${r.path} ${og}`)
    for (const m of h.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) JSON.parse(m[1])
    assert.doesNotMatch(h, VERBOTEN)
  }
})

test('dist: wesentlicher sichtbarer Inhalt steht im initialen HTML', { skip: !HAT_DIST }, () => {
  const erwartet: Record<string, RegExp[]> = {
    '/': [/<h1[^>]*>Finde das Auto,/, /KaufCheck/, /VerkaufsCheck/, /ENFAL Plus/, /AutoFinder/, /16,99/, /keine Mindestlaufzeit/],
    '/autofinder': [/<h1[^>]*>Welches Auto/, /gepflegten Datenbank/],
    '/autokosten': [/<h1[^>]*>Was kostet dein Auto/, /monatlichen und jährlichen Kosten/],
    '/pricing': [/<h1[^>]*>Einzeln kaufen oder/, /5,99/, /8,99/, /16,99/],
  }
  for (const [pfad, muster] of Object.entries(erwartet)) {
    const html = readFileSync(nginxDatei(pfad), 'utf8')
    const body = html.slice(html.indexOf('<div id="root">'))
    assert.equal(zaehle(body, /<h1[\s>]/g), 1, `${pfad}: genau eine H1`)
    for (const m of muster) assert.match(body, m, `${pfad}: ${m}`)
  }
})

test('dist: App-/Login-/Legal-/unbekannte Pfade bekommen die noindex-Shell', { skip: !HAT_DIST }, () => {
  for (const p of ['/login', '/chat', '/kaufcheck', '/verkaufscheck', '/ebooks', '/settings', '/dealer/7',
    '/impressum', '/datenschutz', '/agb', '/widerruf', '/gibt-es-nicht', '/checks/1']) {
    const f = nginxDatei(p)
    assert.ok(f.endsWith('spa.html'), `${p} -> ${f}`)
  }
  const spa = readFileSync(join(dist, 'spa.html'), 'utf8')
  assert.ok(head(spa).includes('<meta name="robots" content="noindex, nofollow" />'))
  assert.doesNotMatch(spa, /rel="canonical"|og:url|ld\+json/)
  assert.ok(spa.includes('<div id="root"></div>'))
})

test('dist: sitemap.xml und robots.txt liegen im Build und sind korrekt', { skip: !HAT_DIST }, () => {
  assert.equal(readFileSync(join(dist, 'sitemap.xml'), 'utf8'), sitemapXml())
  assert.equal(readFileSync(join(dist, 'robots.txt'), 'utf8'), robots)
})

test('dist: keine Altmarke oder localhost in HTML/XML/TXT', { skip: !HAT_DIST }, () => {
  const dateien: string[] = []
  const lauf = (d: string) => {
    for (const n of readdirSync(d)) {
      const f = join(d, n)
      if (statSync(f).isDirectory()) lauf(f)
      else if (/\.(html|xml|txt)$/.test(n)) dateien.push(f)
    }
  }
  lauf(dist)
  assert.ok(dateien.length >= 7)
  for (const f of dateien) assert.doesNotMatch(readFileSync(f, 'utf8'), VERBOTEN, f)
})
