// ENFAL — Produktions-Build-Wächter (läuft im Dockerfile vor und nach `npm run build`).
//
//   node scripts/verify-build.mjs env    Build-Variablen prüfen (vor dem Build)
//   node scripts/verify-build.mjs dist   fertiges dist/ prüfen (nach dem Build)
//
// Warum: Vite bettet VITE_*-Werte zur Build-Zeit ins öffentliche Bundle ein.
//  - Fehlt VITE_API_BASE_URL, fällt src/api/client.ts still auf
//    http://localhost:8000 zurück — die Produktion spräche mit niemandem.
//  - Jede VITE_-Variable ist für jeden Besucher lesbar. Ein Admin-Key, ein
//    Stripe-/Gemini-/Tavily-Key oder ein JWT-Secret darf dort NIE landen.
// Lokal (`npm run build` gegen localhost) läuft dieses Skript nicht mit.
import fs from 'node:fs'
import path from 'node:path'

const modus = process.argv[2]
const fehler = []

// Namen, die niemals als VITE_-Variable (= öffentlich) existieren dürfen.
const VERBOTENE_NAMEN = /ADMIN|SECRET|STRIPE|GEMINI|TAVILY|JWT|WEBHOOK|PASSWORD|PASSWORT|SMTP/i
// Werte-Muster echter Geheimnisse (Stripe, Google, Tavily).
const SECRET_MUSTER = [
  /\bsk_(?:live|test)_[0-9A-Za-z]{10,}/,
  /\brk_(?:live|test)_[0-9A-Za-z]{10,}/,
  /\bwhsec_[0-9A-Za-z]{10,}/,
  /\bAIza[0-9A-Za-z_-]{30,}/,
  /\btvly-[0-9A-Za-z-]{10,}/,
]
const PLATZHALTER = new Set(['', 'dein-api-key-hier', 'dev-key-change-in-prod'])

function istLokal(url) {
  return /localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\]/i.test(url)
}

if (modus === 'env') {
  const api = (process.env.VITE_API_BASE_URL || '').trim()
  if (!api) fehler.push('VITE_API_BASE_URL fehlt.')
  else if (!api.startsWith('https://')) fehler.push('VITE_API_BASE_URL muss mit https:// beginnen.')
  else if (istLokal(api)) fehler.push('VITE_API_BASE_URL zeigt auf eine lokale Adresse.')
  if (PLATZHALTER.has((process.env.VITE_API_KEY || '').trim())) {
    fehler.push('VITE_API_KEY fehlt oder ist ein Platzhalter (muss = AUTO_KI_API_KEY des Backends sein).')
  }
  for (const [name, wert] of Object.entries(process.env)) {
    if (!name.startsWith('VITE_')) continue
    if (VERBOTENE_NAMEN.test(name)) fehler.push(`${name}: dieser Name gehört nie in das öffentliche Bundle.`)
    if (SECRET_MUSTER.some((m) => m.test(wert || ''))) fehler.push(`${name}: Wert sieht nach einem echten Secret aus.`)
  }
} else if (modus === 'dist') {
  const dist = path.resolve('dist')
  const pflicht = ['index.html', 'spa.html', 'robots.txt', 'sitemap.xml',
    'autofinder/index.html', 'autokosten/index.html', 'pricing/index.html']
  for (const datei of pflicht) {
    if (!fs.existsSync(path.join(dist, datei))) fehler.push(`dist/${datei} fehlt.`)
  }
  // Lokales Bild-Backup (gitignored, ~100 MB) darf nie ins Image.
  if (fs.existsSync(path.join(dist, 'cars', '_backup'))) fehler.push('dist/cars/_backup ist im Build enthalten.')

  const TEXT = /\.(?:js|mjs|css|html|json|xml|txt|webmanifest)$/i
  const dateien = []
  const sammle = (dir) => {
    for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, e.name)
      if (e.isDirectory()) sammle(p)
      else if (TEXT.test(e.name)) dateien.push(p)
    }
  }
  if (fs.existsSync(dist)) sammle(dist)
  const api = (process.env.VITE_API_BASE_URL || '').trim()
  let apiGefunden = false
  for (const p of dateien) {
    const inhalt = fs.readFileSync(p, 'utf8')
    const rel = path.relative(dist, p)
    // Konkrete Entwicklungsadressen (nicht das Wort "localhost" allein: der
    // React-Router nutzt intern "http://localhost" als URL-Basis).
    if (/localhost:\d{2,5}|127\.0\.0\.1/.test(inhalt)) fehler.push(`${rel}: enthält eine lokale Entwicklungsadresse.`)
    if (/getvira/i.test(inhalt)) fehler.push(`${rel}: enthält eine alte getvira-Adresse.`)
    for (const m of SECRET_MUSTER) if (m.test(inhalt)) fehler.push(`${rel}: enthält ein Secret-Muster (${m.source}).`)
    if (api && inhalt.includes(api)) apiGefunden = true
  }
  if (api && !apiGefunden) fehler.push('Die Produktions-API-Adresse steht in keinem Bundle — VITE_API_BASE_URL wurde nicht eingebettet.')
  const start = fs.existsSync(path.join(dist, 'index.html')) ? fs.readFileSync(path.join(dist, 'index.html'), 'utf8') : ''
  if (!start.includes('<link rel="canonical" href="https://getenfal.de/"')) fehler.push('dist/index.html: Canonical https://getenfal.de/ fehlt.')
  const spa = fs.existsSync(path.join(dist, 'spa.html')) ? fs.readFileSync(path.join(dist, 'spa.html'), 'utf8') : ''
  if (!/<meta name="robots" content="noindex/.test(spa)) fehler.push('dist/spa.html: noindex fehlt.')
} else {
  console.error('Aufruf: node scripts/verify-build.mjs env|dist')
  process.exit(2)
}

if (fehler.length) {
  console.error(`verify-build (${modus}): ${fehler.length} Fehler`)
  for (const f of fehler) console.error('  - ' + f)
  process.exit(1)
}
console.log(`verify-build (${modus}): OK`)
