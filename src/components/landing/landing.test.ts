// Landingpage-Tests. Wie im übrigen Repo ohne Test-Framework (siehe AGENTS.md):
// Node-eigener Runner, strukturelle Prüfung der Quelldateien.
//
//     npm run test:landing
//
// Der Schwerpunkt liegt bewusst auf zwei Dingen, die eine Marketingseite
// kaputtmachen können, ohne dass es beim Draufschauen auffällt:
//   1. Zahlen, die vom eingefrorenen Pricing V1 abweichen
//   2. Behauptungen, die das Produkt nicht deckt (Fake-Claims), und Links
//      auf Routen oder Bereiche, die es nicht (mehr) gibt

import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const here = dirname(fileURLToPath(import.meta.url))
const lies = (p: string) => readFileSync(join(here, p), 'utf8')

const view = lies('LandingView.tsx')
const header = lies('LandingHeader.tsx')
const footer = lies('LandingFooter.tsx')
const links = lies('links.ts')
const fixture = lies('heroFixture.ts')
const appTsx = readFileSync(join(here, '..', '..', 'App.tsx'), 'utf8')

/** Alle Landing-Quellen zusammen — für Prüfungen, die nirgends zutreffen dürfen. */
const alles = [view, header, footer, links, fixture].join('\n')

/**
 * Dieselben Quellen OHNE Kommentare.
 *
 * Das ist kein Detail: diese Dateien ERKLAEREN ausfuehrlich, was sie bewusst
 * nicht tun — "keine Sidebar", "keine Testimonials, keine Marktfuehrerschaft",
 * "Parts, Entdecken und E-Books tauchen bewusst NICHT auf", "/register gibt es
 * nicht". Eine Wortsuche ueber den Rohtext findet genau diese Erklaerungen und
 * meldet damit das Gegenteil dessen, was sie pruefen soll. Geprueft gehoert,
 * was ausgeliefert wird.
 *
 * Bewusst einfacher Stripper (kein Parser): Blockkommentare und
 * Zeilenkommentare, wobei ein `//` nach einem Doppelpunkt stehen bleibt, damit
 * URLs nicht zerschnitten werden.
 */
const ohneKommentare = (q: string) =>
  q.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')

const codeAlles = [view, header, footer, links, fixture].map(ohneKommentare).join('\n')
const codeView = ohneKommentare(view)
const codeHeader = ohneKommentare(header)
const codeFooter = ohneKommentare(footer)

// ── A) Genau ein H1 ─────────────────────────────────────────────────────────

test('A: die Seite hat genau ein <h1>', () => {
  const h1 = alles.match(/<h1[\s>]/g) ?? []
  assert.equal(h1.length, 1, `gefunden: ${h1.length}`)
})

test('A: Überschriften-Hierarchie ohne Sprung (h2/h3 vorhanden, kein h4 ohne h3)', () => {
  assert.match(view, /<h2/)
  assert.match(view, /<h3/)
  assert.doesNotMatch(alles, /<h4/)
})

// ── B/C/T) CTAs ─────────────────────────────────────────────────────────────

test('B: der kostenlose Einstiegs-CTA ist vorhanden', () => {
  assert.match(view, /Kostenlos starten/)
})

test('C: der AutoFinder-CTA zeigt auf /autofinder', () => {
  assert.match(links, /AUTOFINDER_ROUTE = '\/autofinder'/)
  assert.match(view, /AutoFinder ausprobieren/)
  assert.match(view, /to=\{AUTOFINDER_ROUTE\}/)
})

test('T: der Register-CTA öffnet den Registrieren-Modus einer EXISTIERENDEN Route', () => {
  assert.match(links, /REGISTER_ROUTE = '\/login\?modus=register'/)
  // /register gibt es nicht — Registrieren ist ein Tab in LoginView.
  assert.doesNotMatch(codeAlles, /["'`]\/register["'`]/)
  assert.match(appTsx, /<Route path="\/login"/)
  assert.doesNotMatch(appTsx, /<Route path="\/register"/)
})

test('T: Header und Abschluss-CTA nutzen beide denselben Register-Weg', () => {
  assert.match(header, /to=\{REGISTER_ROUTE\}/)
  assert.match(view, /to=\{REGISTER_ROUTE\}/)
})

// ── D/E/F) Kostenlose Kontingente ───────────────────────────────────────────

test('D: die eine anonyme Demo-Suche wird korrekt erwähnt (pro Tag, ohne Konto)', () => {
  assert.match(view, /1 Suche kostenlos testen — ohne Konto/)
  assert.match(view, /1 Demo-Suche pro Tag ohne Konto/)
  // Keine Demo-Aussage, die ein Monatskontingent suggeriert.
  assert.doesNotMatch(view, /Demo-Suche pro Monat/)
})

test('E: Free-Konto nennt 5 AutoFinder-Suchen pro Monat', () => {
  assert.match(view, /5 Suchen pro Monat mit kostenlosem Konto/)
  assert.match(view, /5 AutoFinder-Suchen/)
})

test('F: Free-Konto nennt 20 KI-Chat-Nachrichten pro Monat', () => {
  assert.match(view, /20 Nachrichten pro Monat/)
  assert.match(view, /20 KI-Chat-Nachrichten/)
})

test('E/F: kein "unbegrenzt" bei AutoFinder oder Chat — nur bei Autokosten', () => {
  // Jede Nennung von "unbegrenzt" muss sich auf Autokosten beziehen. Geprueft
  // wird das unmittelbar vorangehende Satzglied, nicht ein Zeichenfenster: im
  // Fliesstext steht davor oft noch die (korrekt begrenzte) Chat-Zahl aus
  // demselben Satz — daran ist nichts falsch.
  const stellen = [...codeView.matchAll(/([A-Za-zÄÖÜäöüß -]{0,40})unbegrenzt/g)]
  assert.ok(stellen.length > 0, 'keine Aussage zu "unbegrenzt" gefunden')
  for (const t of stellen) {
    assert.match(t[1], /Autokosten/,
      `"unbegrenzt" bezieht sich nicht auf Autokosten: …${t[1]}unbegrenzt`)
  }
  assert.match(codeView, /Autokosten unbegrenzt/)
  // und nirgends eine unbegrenzte Zusage fuer die begrenzten Werkzeuge
  assert.doesNotMatch(codeView, /(AutoFinder|KI-Chat)[^.]{0,25}unbegrenzt/)
})

// ── G/H/I) Preise ───────────────────────────────────────────────────────────

test('G: KaufCheck kostet 5,99 € einmalig', () => {
  assert.match(view, /5,99 €/)
  assert.match(view, /einmalig pro Check/)
})

test('H: VerkaufsCheck kostet 8,99 € einmalig', () => {
  assert.match(view, /8,99 €/)
})

test('I: Vira Plus kostet 16,99 € pro Monat', () => {
  assert.match(view, /16,99 €/)
  assert.match(view, /pro Monat/)
})

// ── J/K/L/M) Plus-Kontingente ───────────────────────────────────────────────

test('J: Plus enthält 5 KaufChecks pro Monat', () => {
  assert.match(view, /5 KaufChecks pro Monat/)
})

test('K: Plus enthält 1 VerkaufsCheck pro Monat', () => {
  assert.match(view, /1 VerkaufsCheck pro Monat/)
})

test('L: Plus enthält 50 AutoFinder-Suchen pro Monat', () => {
  assert.match(view, /50 AutoFinder-Suchen pro Monat/)
})

test('M: Plus enthält 100 KI-Chat-Nachrichten pro Monat', () => {
  assert.match(view, /100 KI-Chat-Nachrichten pro Monat/)
})

test('Plus: kein Übertrag wird ehrlich benannt, gekaufte Checks bleiben', () => {
  assert.match(view, /sammeln\s+sich nicht an/)
  assert.match(view, /Einzeln\s+gekaufte Checks behältst du dauerhaft/)
})

test('Plus: monatlich kündbar ohne unhaltbares "sofort"-Versprechen', () => {
  assert.match(view, /[Mm]onatlich kündbar/)
  // Zwei Teile, weil der FAQ-Satz ueber eine String-Konkatenation umbricht.
  assert.match(codeView, /bis zum Ende des bereits/)
  assert.match(codeView, /bezahlten Monats weiter/)
  // und in der Plus-Sektion als ganzer Satz
  assert.match(codeView, /keine Mindestlaufzeit/)
  assert.doesNotMatch(codeView, /jederzeit sofort (kündbar|beendbar)/)
})

// ── N/O) Alte Preise ────────────────────────────────────────────────────────

test('N/O: die alten Consumer-Preise 9,99 / 7,99 kommen nicht mehr vor', () => {
  assert.doesNotMatch(alles, /9,99|7,99/)
})

// ── P/Q) Nicht-Consumer-Bereiche ────────────────────────────────────────────

test('P: kein Link auf Ersatzteile/Parts', () => {
  assert.doesNotMatch(codeAlles, /ersatzteile|Ersatzteil|\bParts\b/i)
})

test('Q: kein Link auf Entdecken', () => {
  assert.doesNotMatch(codeAlles, /entdecken/i)
})

test('P/Q: auch Dealer und E-Books werden nicht beworben', () => {
  assert.doesNotMatch(codeAlles, /\/dealer|E-Books|ebooks/i)
})

// ── R) Keine riskanten Fahrzeug-Assets ──────────────────────────────────────

test('R: keine fremden Fahrzeugbilder, Marktplatz- oder Stock-Assets', () => {
  assert.doesNotMatch(alles, /mobile\.de|autoscout|stock|unsplash|pexels|shutterstock/i)
  // Kein <img> ausser dem eigenen Logo.
  for (const m of alles.matchAll(/<img[^>]*src=["'{]([^"'}\s]*)/g)) {
    assert.match(m[1], /logo\.svg/, `unerwartetes Bild: ${m[1]}`)
  }
  // Keine Hintergrundbilder per URL.
  assert.doesNotMatch(alles, /background-image:\s*url\(/i)
  assert.doesNotMatch(alles, /url\(['"]?https?:/i)
})

test('R: das Produktvisual nutzt das echte VehicleIdentityPanel', () => {
  assert.match(view, /import VehicleIdentityPanel from '\.\.\/autofinder\/VehicleIdentityPanel'/)
  assert.match(view, /<VehicleIdentityPanel /)
})

test('R: die Vorschaudaten sind echt und ungeschönt übernommen', () => {
  // Aus einer realen /api/v1/autofinder-Antwort, inkl. des unbequemen
  // NEAR_BUDGET — eine Vorschau darf nicht besser aussehen als das Produkt.
  assert.match(fixture, /marke: 'BMW'/)
  assert.match(fixture, /user_fit: 93/)
  assert.match(fixture, /budget_status: 'NEAR_BUDGET'/)
  // Kein Fahrzeugbild, auch nicht im Fixture.
  assert.match(fixture, /image_url: ''/)
})

// ── S) Pricing-Route ────────────────────────────────────────────────────────

test('S: der Preis-Teaser verlinkt auf /pricing', () => {
  assert.match(links, /PRICING_ROUTE = '\/pricing'/)
  assert.match(view, /Alle Preise ansehen/)
  assert.match(view, /to=\{PRICING_ROUTE\}/)
  assert.match(appTsx, /<Route path="\/pricing"/)
})

test('S: alle Produkt-CTAs zeigen auf existierende Routen', () => {
  const routen = ['/autofinder', '/autokosten', '/kaufcheck', '/verkaufscheck', '/pricing', '/login']
  for (const r of routen) {
    assert.match(appTsx, new RegExp(`<Route path="${r}"`), `Route fehlt: ${r}`)
  }
})

// ── U) Footer ───────────────────────────────────────────────────────────────

test('U: der Footer führt alle Rechtsseiten und den Support', () => {
  for (const l of ['/impressum', '/datenschutz', '/agb', '/widerruf']) {
    assert.ok(footer.includes(l), `Footer-Link fehlt: ${l}`)
    assert.match(appTsx, new RegExp(`<Route path="${l}"`), `Route fehlt: ${l}`)
  }
  assert.match(links, /SUPPORT_MAILTO = 'mailto:/)
  assert.match(codeFooter, /href=\{SUPPORT_MAILTO\}/)
  assert.match(codeFooter, /Kontakt \/ Support/)
  assert.match(footer, /Preise/)
  assert.match(footer, /Hilfe/)
  assert.match(footer, /Anmelden/)
})

// ── V) Keine Fake-Claims ────────────────────────────────────────────────────

test('V: keine erfundenen Zahlen, Bewertungen oder Superlative', () => {
  const verboten = [
    /\d[\d.,]*\s*(\+\s*)?(zufriedene\s+)?(Nutzer|Kunden|Bewertungen|Downloads)/i,
    /\d+\s*%\s*(Genauigkeit|zufrieden|Trefferquote)/i,
    /Marktführer|Testsieger|Nummer 1|#1\b/i,
    /garantiert|Garantie|100\s*%\s*sicher/i,
    /Testimonial|Kundenstimme|„[^"]{10,}"\s*—\s*[A-Z]/,
    /5\s*Sterne|★/,
  ]
  for (const re of verboten) {
    assert.doesNotMatch(codeAlles, re, `unbelegbare Behauptung: ${re}`)
  }
})

test('V: keine Werkstattprüfung-Ersatz-Behauptung, sondern der Gegenteil-Hinweis', () => {
  assert.match(footer, /ersetzt keine technische Fahrzeugprüfung/)
})

// ── Struktur / Shell / SEO ──────────────────────────────────────────────────

test('Landingpage läuft auf "/" ausserhalb der App-Shell (keine Sidebar)', () => {
  assert.match(appTsx, /<Route path="\/" element=\{<Startseite \/>\}/)
  assert.doesNotMatch(codeView, /Sidebar/)
  assert.doesNotMatch(codeHeader, /Sidebar/)
})

test('eingeloggte Nutzer landen weiterhin im Chat (Verhalten unverändert)', () => {
  assert.match(appTsx, /if \(user\) return <Navigate to="\/chat" replace \/>/)
})

test('SEO: eigener Titel und Meta-Description werden gesetzt', () => {
  assert.match(view, /document\.title = SEITENTITEL/)
  assert.match(view, /meta\[name="description"\]/)
  // und beim Verlassen sauber zurückgesetzt.
  assert.match(view, /document\.title = vorherTitel/)
})

test('Performance: keine externen Fonts, Skripte oder Animationsbibliotheken', () => {
  assert.doesNotMatch(codeAlles, /fonts\.googleapis|fonts\.gstatic|@font-face/i)
  assert.doesNotMatch(codeAlles, /framer-motion|gsap|lottie|react-spring/i)
  assert.doesNotMatch(codeAlles, /<video|\.mp4|\.webm/i)
})

test('Accessibility: Icon-only-Buttons tragen ein aria-label, Deko ist versteckt', () => {
  // Die beiden Icon-Buttons des Drawers.
  assert.match(header, /aria-label="Menü öffnen"/)
  assert.match(header, /aria-label="Menü schließen"/)
  assert.match(header, /aria-expanded=\{offen\}/)
  assert.match(header, /role="dialog"/)
  // Dekorative Icons sind aus dem Accessibility-Baum genommen.
  const iconsOhneAria = view.match(/<(Search|Sparkles|Check|Gauge|ShoppingCart)\s+size=\{\d+\}(?![^>]*aria-hidden)/g)
  assert.equal(iconsOhneAria, null, `dekoratives Icon ohne aria-hidden: ${iconsOhneAria}`)
})

test('Scope: die Landingpage ändert keine Produkt-, Preis- oder Payment-Logik', () => {
  // Sie ruft nichts auf, was Kosten oder Kontingente auslöst.
  assert.doesNotMatch(codeAlles, /apiAutoFinder|apiChat|runKaufCheck|createCheckout|PurchaseGate/)
  assert.doesNotMatch(codeAlles, /from '\.\.\/\.\.\/api\/client'/)
})
