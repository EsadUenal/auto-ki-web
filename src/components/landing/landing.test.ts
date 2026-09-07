// Landingpage-Tests. Wie im übrigen Repo ohne Test-Framework (siehe AGENTS.md):
// Node-eigener Runner, strukturelle Prüfung der Quelldateien.
//
//     npm run test:landing
//
// Der Schwerpunkt liegt bewusst auf dem, was eine Marketingseite kaputtmachen
// kann, ohne dass es beim Draufschauen auffällt:
//   1. Zahlen, die vom eingefrorenen Pricing V1 abweichen
//   2. Behauptungen, die das Produkt nicht deckt, und Links auf Routen oder
//      Bereiche, die es nicht (mehr) gibt
//   3. Bewegung, die Inhalte verschluckt statt sie zu zeigen
//   4. Aufrufe, die auf einer Marketingseite Geld kosten würden

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
const showcase = lies('showcase.ts')
const motion = lies('motion.ts')
const heroDemo = lies('HeroDemo.tsx')
const storyStage = lies('StoryStage.tsx')
const storyPanels = lies('StoryPanels.tsx')
const plusStage = lies('PlusStage.tsx')
const styles = lies('styles.ts')
const appTsx = readFileSync(join(here, '..', '..', 'App.tsx'), 'utf8')

/**
 * ALLE Quellen der Landingpage.
 *
 * Bewusst die ganze Fläche und nicht nur LandingView.tsx: mit der zweiten
 * Fassung sind Hero-Demo, Story-Bühnen und Plus in eigene Dateien gewandert.
 * Eine Prüfung, die nur die Hauptdatei liest, würde ab jetzt grün melden, was
 * sie gar nicht mehr sieht.
 */
const DATEIEN = [
  view, header, footer, links, fixture, showcase,
  motion, heroDemo, storyStage, storyPanels, plusStage, styles,
]
const alles = DATEIEN.join('\n')

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

const codeAlles = DATEIEN.map(ohneKommentare).join('\n')
const codeView = ohneKommentare(view)
const codeHeader = ohneKommentare(header)
const codeFooter = ohneKommentare(footer)
const codeMotion = ohneKommentare(motion)

// ── A) Genau ein H1 ─────────────────────────────────────────────────────────

test('A: die Seite hat genau ein <h1>', () => {
  const h1 = alles.match(/<h1[\s>]/g) ?? []
  assert.equal(h1.length, 1, `gefunden: ${h1.length}`)
})

test('A: Überschriften-Hierarchie ohne Sprung (h2/h3 vorhanden, kein h4)', () => {
  assert.match(view, /<h2/)
  assert.match(alles, /<h3/)
  assert.doesNotMatch(alles, /<h4/)
})

// ── B/C/T) CTAs ─────────────────────────────────────────────────────────────

test('B: der kostenlose Einstiegs-CTA ist vorhanden', () => {
  assert.match(view, /Kostenlos starten/)
})

test('C: der AutoFinder-CTA zeigt auf /autofinder', () => {
  assert.match(links, /AUTOFINDER_ROUTE = '\/autofinder'/)
  assert.match(view, /AutoFinder ausprobieren/)
  assert.match(alles, /to=\{AUTOFINDER_ROUTE\}/)
})

test('T: der Register-CTA öffnet den Registrieren-Modus einer EXISTIERENDEN Route', () => {
  assert.match(links, /REGISTER_ROUTE = '\/login\?modus=register'/)
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
  assert.doesNotMatch(alles, /Demo-Suche pro Monat/)
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
  // wird das rohe Umfeld inklusive Markup: in PlusStage steht das Wort in einem
  // eigenen <span>, ein reines Buchstabenfenster davor waere leer.
  const quelle = ohneKommentare(alles)
  const stellen = [...quelle.matchAll(/unbegrenzt/g)]
  assert.ok(stellen.length > 0, 'keine Aussage zu "unbegrenzt" gefunden')
  for (const t of stellen) {
    const davor = quelle.slice(Math.max(0, t.index! - 160), t.index!)
    assert.match(davor, /Autokosten/,
      `"unbegrenzt" bezieht sich nicht auf Autokosten: …${davor.slice(-60)}unbegrenzt`)
  }
  assert.doesNotMatch(codeAlles, /(AutoFinder|KI-Chat)[^.]{0,25}unbegrenzt/)
})

// ── G/H/I) Preise ───────────────────────────────────────────────────────────

test('G: KaufCheck kostet 5,99 € einmalig', () => {
  assert.match(alles, /5,99 €/)
  assert.match(alles, /einmalig/)
})

test('H: VerkaufsCheck kostet 8,99 € einmalig', () => {
  assert.match(view, /8,99 €/)
  assert.match(view, /einmalig pro Check/)
})

test('I: Vira Plus kostet 16,99 € pro Monat', () => {
  assert.match(alles, /16,99 €/)
  assert.match(alles, /pro Monat/)
})

// ── J/K/L/M) Plus-Kontingente ───────────────────────────────────────────────

test('J/K/L/M: Plus nennt 5 KaufChecks, 1 VerkaufsCheck, 50 AutoFinder, 100 Chat', () => {
  // Die Zahlen stehen zentral in showcase.ts und werden von PlusStage gerendert.
  assert.match(showcase, /label: 'KaufChecks',\s+anzahl: 5/)
  assert.match(showcase, /label: 'VerkaufsCheck',\s+anzahl: 1/)
  assert.match(showcase, /label: 'AutoFinder-Suchen', anzahl: 50/)
  assert.match(showcase, /label: 'KI-Chat',\s+anzahl: 100/)
  // und zusätzlich ausgeschrieben im Preisvergleich
  assert.match(view, /5 KaufChecks \/ Monat/)
  assert.match(view, /1 VerkaufsCheck \/ Monat/)
  assert.match(view, /50 AutoFinder-Suchen \/ Monat/)
  assert.match(view, /100 KI-Chat-Nachrichten \/ Monat/)
})

test('Plus: kein Übertrag wird ehrlich benannt, gekaufte Checks bleiben', () => {
  assert.match(plusStage, /sammeln\s+sich nicht an/)
  assert.match(plusStage, /gekaufte Checks behältst du dauerhaft/)
})

test('Plus: monatlich kündbar ohne unhaltbares "sofort"-Versprechen', () => {
  assert.match(plusStage, /[Mm]onatlich kündbar/)
  assert.match(plusStage, /keine Mindestlaufzeit/)
  assert.match(codeView, /bis zum Ende des bereits/)
  assert.match(codeView, /bezahlten Monats weiter/)
  assert.doesNotMatch(codeAlles, /jederzeit sofort (kündbar|beendbar)/)
})

test('Plus: die Ringe zeigen den enthaltenen Umfang, keine erfundene Nutzung', () => {
  // Voller Ring = enthaltenes Kontingent. Ein teilgefüllter Ring wäre ein
  // Verbrauchsstand, den es ohne Login gar nicht geben kann.
  assert.match(plusStage, /strokeDashoffset=\{aktiv \|\| reduziert \? 0 : UMFANG\}/)
  // Der Ring laeuft immer auf VOLL — er zeigt den enthaltenen Umfang.
  const code = ohneKommentare(plusStage)
  // Die angezeigte Zahl ist der ENTHALTENE Umfang aus der Tarifkonstante —
  // nicht ein Restwert. (Eine Bruchsuche waere hier untauglich: Tailwind
  // schreibt Deckkraft als "orange-500/15".)
  assert.match(code, /const wert = useZaehler\(anzahl,/)
  assert.match(code, /\{Math\.round\(wert\)\}/)
  assert.match(code, /anzahl=\{p\.anzahl\}/)
  assert.match(showcase, /export const PLUS_KONTINGENTE/)
  assert.doesNotMatch(code, /verbleibend|genutzt_|usage|kontingent_rest/i)
  // und keine Datenquelle, aus der ein Verbrauch ueberhaupt stammen koennte
  assert.doesNotMatch(code, /useAuth|apiPayments|entitlement/i)
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
  for (const m of alles.matchAll(/<img[^>]*src=["'{]([^"'}\s]*)/g)) {
    assert.match(m[1], /logo\.svg/, `unerwartetes Bild: ${m[1]}`)
  }
  assert.doesNotMatch(alles, /background-image:\s*url\(/i)
  assert.doesNotMatch(alles, /url\(['"]?https?:/i)
})

test('R: die Produktvisuals nutzen das echte VehicleIdentityPanel', () => {
  assert.match(heroDemo, /import VehicleIdentityPanel from '\.\.\/autofinder\/VehicleIdentityPanel'/)
  assert.match(storyPanels, /import VehicleIdentityPanel from '\.\.\/autofinder\/VehicleIdentityPanel'/)
  assert.match(heroDemo, /<VehicleIdentityPanel /)
  assert.match(storyPanels, /<VehicleIdentityPanel /)
})

test('R: die Vorschaudaten sind echt und ungeschönt übernommen', () => {
  assert.match(fixture, /marke: 'BMW'/)
  assert.match(fixture, /user_fit: 93/)
  // auch das Unbequeme: NEAR_BUDGET statt eines glatten Treffers
  assert.match(fixture, /budget_status: 'NEAR_BUDGET'/)
  assert.match(fixture, /image_url: ''/)
})

test('R: die Autokosten der Story kommen aus der ECHTEN Produktrechnung', () => {
  // Nicht nachgebaute Zahlen: ändert sich die Formel, ändert sich die Seite mit.
  assert.match(showcase, /import \{ berechne.*\} from '\.\.\/autokosten\/logic'/)
  assert.match(showcase, /export const SHOWCASE_KOSTEN = berechne\(SHOWCASE_KOSTEN_FORM\)/)
  assert.doesNotMatch(showcase, /gesamtMonat:\s*\d/)   // kein hartkodiertes Ergebnis
})

test('R: die Beispielrechnung weist ihre Annahmen aus', () => {
  assert.match(storyPanels, /Beispielrechnung/)
  assert.match(storyPanels, /sind Annahmen/)
})

// ── S) Routen ───────────────────────────────────────────────────────────────

test('S: der Preis-Teaser verlinkt auf /pricing', () => {
  assert.match(links, /PRICING_ROUTE = '\/pricing'/)
  assert.match(view, /Alle Preise ansehen/)
  assert.match(alles, /to=\{PRICING_ROUTE\}/)
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
    /Testimonial|Kundenstimme/i,
    /5\s*Sterne|★/,
  ]
  for (const re of verboten) {
    assert.doesNotMatch(codeAlles, re, `unbelegbare Behauptung: ${re}`)
  }
})

test('V: keine Werkstattprüfung-Ersatz-Behauptung, sondern der Gegenteil-Hinweis', () => {
  assert.match(footer, /ersetzt keine technische Fahrzeugprüfung/)
})

test('V: die Schwachstelle der stärkeren Modelle wird dem 118i NICHT zugeschrieben', () => {
  // In der Datenbank steht eine Bremsen-Schwachstelle, die nur M135i/128ti
  // betrifft. Sie hier zu zeigen wäre eine Falschaussage über ein reales
  // Fahrzeug — auch auf einer Marketingseite.
  assert.doesNotMatch(codeAlles, /M135i|128ti/)
})

// ── Motion ──────────────────────────────────────────────────────────────────

test('Motion: die Seite bringt sichtbare Bewegung mit', () => {
  assert.match(motion, /export function useInView/)
  assert.match(motion, /export function useScrollFortschritt/)
  assert.match(motion, /export function useZaehler/)
  assert.match(motion, /export function useSequenz/)
  assert.match(motion, /export function usePhasen/)
  // und sie wird auch benutzt
  assert.match(heroDemo, /usePhasen\(/)
  assert.match(storyStage, /useScrollFortschritt</)
  assert.match(storyPanels, /useZaehler\(/)
  assert.match(storyPanels, /useSequenz\(/)
  assert.match(plusStage, /useZaehler\(/)
  assert.match(view, /useInView</)
})

test('Motion: die Sticky-Story hat vier Schritte und eine Scrollstrecke', () => {
  assert.match(showcase, /STORY_SCHRITTE = \[/)
  for (const s of ['finden', 'verstehen', 'pruefen', 'entscheiden']) {
    assert.match(showcase, new RegExp(`id: '${s}'`), `Story-Schritt fehlt: ${s}`)
  }
  assert.match(storyStage, /className="sticky top-0/)
  // (anzahl + 1), weil die klebende Buehne selbst einen Bildschirm hoch ist:
  // nur so bekommt jeder Schritt eine volle Bildschirmhoehe Scrollstrecke.
  assert.match(storyStage, /height: `\$\{\(anzahl \+ 1\) \* 100\}vh`/)
  // der aktive Schritt haengt am Scrollfortschritt, nicht an einem Timer
  assert.match(storyStage, /Math\.floor\(fortschritt \* anzahl/)
  assert.match(storyStage, /aria-current=\{ist \? 'step' : undefined\}/)
})

test('Motion: der Hintergrund wechselt bei "Prüfen" ins Dunkle', () => {
  assert.match(storyStage, /const dunkel = aktiv >= 2/)
  assert.match(storyStage, /backgroundColor: dunkel \? '#111014'/)
})

test('Motion: bewegt werden nur transform und opacity', () => {
  // Kein Animieren von width/height/top/left — das erzwingt Layout pro Frame.
  const verdaechtig = /transition(-property)?:\s*(width|height|top|left|margin)/i
  assert.doesNotMatch(codeAlles, verdaechtig)
  assert.match(codeMotion, /transform:/)
  assert.match(codeMotion, /opacity:/)
})

test('Motion: der Fortschritt haengt NICHT an Scroll-Ereignissen', () => {
  // Ein `scroll`-Listener waere naheliegend, aber nicht verlaesslich: in
  // eingebetteten oder nicht sichtbaren Ansichten aendert sich scrollY, ohne
  // dass ein Ereignis zugestellt wird — die Story bliebe dann auf Schritt 1
  // stehen. Genau das ist in der Browser-Pruefung passiert.
  const fortschritt = codeMotion.slice(codeMotion.indexOf('export function useScrollFortschritt'))
  assert.doesNotMatch(fortschritt, /addEventListener\('scroll'/)
  // Gemessen wird in einer rAF-Schleife …
  assert.match(fortschritt, /requestAnimationFrame\(messen\)/)
  // … die nur laeuft, solange die Story sichtbar ist.
  assert.match(fortschritt, /new IntersectionObserver/)
  assert.match(fortschritt, /isIntersecting \? starten\(\) : stoppen\(\)/)
  assert.match(fortschritt, /cancelAnimationFrame/)
  // und nur bei spuerbarer Aenderung neu rendert
  assert.match(fortschritt, /Math\.abs\(roh - letzter\.current\) > 0\.002/)
})

test('Motion: die Sticky-Story haengt an keinem Vorfahren mit overflow', () => {
  // `overflow-x: hidden` zwingt `overflow-y` auf `auto`. Der Container wird
  // dadurch zum Scroll-Kontext, und `position: sticky` klebt an ihm statt am
  // Fenster — also gar nicht mehr. Das hat die Story einmal lautlos gekippt.
  assert.doesNotMatch(codeView, /overflow-x-hidden/)
  assert.match(view, /KEIN `overflow-x-hidden`/)
})

// ── Reduzierte Bewegung ─────────────────────────────────────────────────────

test('Reduced Motion: wird erkannt und überall berücksichtigt', () => {
  assert.match(motion, /prefers-reduced-motion: reduce/)
  // Die Komponenten mit eigenem Zustand fragen selbst ab …
  for (const [name, quelle] of Object.entries({
    HeroDemo: heroDemo, StoryStage: storyStage, PlusStage: plusStage, LandingView: view,
  })) {
    assert.match(quelle, /useReducedMotion\(\)/, `${name} fragt reduzierte Bewegung nicht ab`)
  }
  // … die vier Buehnen bekommen den Wert als Prop gereicht (ein Hook je Buehne
  // waere vierfach dieselbe Abfrage) und reichen ihn an jede Animation weiter.
  assert.match(storyPanels, /interface PanelProps \{[\s\S]*?reduziert: boolean/)
  assert.match(storyPanels, /reduziert \? undefined :/)
  assert.match(storyStage, /reduziert=\{reduziert\}/)
})

test('Reduced Motion: der Ruhezustand zeigt den ENDzustand, nicht einen leeren', () => {
  // Zähler stehen sofort auf dem Zielwert …
  assert.match(motion, /useState\(reduziert \? ziel : 0\)/)
  assert.match(motion, /if \(reduziert\) \{ setWert\(ziel\); return \}/)
  // … Sequenzen sind sofort vollständig …
  assert.match(motion, /useState\(reduziert \? anzahl : 0\)/)
  // … und die Hero-Demo steht auf der letzten, aussagekräftigen Phase.
  assert.match(motion, /useState\(reduziert \? anzahl - 1 : 0\)/)
  // Reveal blendet nichts aus, wenn Bewegung reduziert ist.
  assert.match(motion, /if \(reduziert\) return \{ className: '', style: \{\} \}/)
})

test('Reduced Motion: kein Dauer-Autoplay', () => {
  // Das Intervall der Hero-Demo startet bei reduzierter Bewegung gar nicht.
  const phasen = motion.slice(motion.indexOf('export function usePhasen'))
  assert.match(phasen, /if \(reduziert\) \{ setPhase\(anzahl - 1\); return \}/)
  assert.match(phasen.indexOf('setInterval') > phasen.indexOf('if (reduziert)') ? 'ok' : 'falsch', /ok/)
})

// ── Inhalte bleiben im DOM (SEO) ────────────────────────────────────────────

test('SEO: Inhalte werden nicht durch Animation aus dem DOM entfernt', () => {
  // Reveal setzt Opazität/Transform — es rendert NICHT bedingt.
  assert.doesNotMatch(view, /sichtbar &&\s*</)
  assert.doesNotMatch(storyStage, /aktiv &&\s*</)
  // Kein Canvas, kein Text nur in Bildern.
  assert.doesNotMatch(codeAlles, /<canvas|getContext\(/)
})

test('SEO: die tragenden Texte stehen als echter Fliesstext in der Seite', () => {
  assert.match(view, /Finde das Auto,/)
  assert.match(storyStage, /Nicht irgendein Auto\. Das passende\./)
  assert.match(storyStage, /Der Kaufpreis ist nicht die ganze Wahrheit\./)
  assert.match(storyStage, /Bevor du kaufst: prüf genauer hin\./)
  assert.match(storyStage, /Mehr Informationen\. Weniger Bauchgefühl\./)
  assert.match(view, /Und wenn du verkaufen willst\?/)
  assert.match(view, /Dein nächstes Auto beginnt mit einer besseren Entscheidung\./)
})

test('SEO: eigener Titel und Meta-Description werden gesetzt und zurückgesetzt', () => {
  assert.match(view, /document\.title = SEITENTITEL/)
  assert.match(view, /meta\[name="description"\]/)
  assert.match(view, /document\.title = vorherTitel/)
})

// ── Keine Kosten ────────────────────────────────────────────────────────────

test('Kosten: die Landingpage löst keinen einzigen Provider-Aufruf aus', () => {
  assert.doesNotMatch(codeAlles, /apiAutoFinder|apiChat|runKaufCheck|runVerkaufsCheck|createCheckout|PurchaseGate/)
  assert.doesNotMatch(codeAlles, /from '\.\.\/\.\.\/api\/client'/)
  assert.doesNotMatch(codeAlles, /\bfetch\s*\(|XMLHttpRequest|EventSource|WebSocket/)
  // Die einzige Produktlogik, die importiert wird, ist der rein lokale
  // Autokosten-Rechner — er rechnet, er ruft nichts auf.
  const importe = [...codeAlles.matchAll(/from '(\.\.\/[^']+)'/g)].map((m) => m[1])
  const erlaubt = /autofinder\/(logic|VehicleIdentityPanel)|autokosten\/logic/
  for (const i of importe) {
    assert.match(i, erlaubt, `unerwarteter Import aus dem Produktcode: ${i}`)
  }
})

// ── Struktur / Shell / Performance ──────────────────────────────────────────

test('Landingpage läuft auf "/" ausserhalb der App-Shell (keine Sidebar)', () => {
  assert.match(appTsx, /<Route path="\/" element=\{<Startseite \/>\}/)
  assert.doesNotMatch(codeView, /Sidebar/)
  assert.doesNotMatch(codeHeader, /Sidebar/)
})

test('eingeloggte Nutzer landen weiterhin im Chat (Verhalten unverändert)', () => {
  assert.match(appTsx, /if \(user\) return <Navigate to="\/chat" replace \/>/)
})

test('Performance: keine externen Fonts, Skripte, Videos oder Motion-Bibliothek', () => {
  assert.doesNotMatch(codeAlles, /fonts\.googleapis|fonts\.gstatic|@font-face/i)
  assert.doesNotMatch(codeAlles, /framer-motion|gsap|lottie|react-spring|animejs/i)
  assert.doesNotMatch(codeAlles, /<video|\.mp4|\.webm|WebGL|three\.js/i)
})

test('Performance: die Bewegung kommt ohne neue Abhängigkeit aus', () => {
  const pkg = JSON.parse(readFileSync(join(here, '..', '..', '..', 'package.json'), 'utf8'))
  const deps = Object.keys(pkg.dependencies ?? {})
  for (const verboten of ['framer-motion', 'gsap', 'lottie-web', 'react-spring', '@react-spring/web']) {
    assert.ok(!deps.includes(verboten), `neue Motion-Abhängigkeit: ${verboten}`)
  }
})

test('Accessibility: Icon-only-Buttons tragen ein aria-label, Deko ist versteckt', () => {
  assert.match(header, /aria-label="Menü öffnen"/)
  assert.match(header, /aria-label="Menü schließen"/)
  assert.match(header, /aria-expanded=\{offen\}/)
  assert.match(header, /role="dialog"/)
  const iconsOhneAria = alles.match(/<(Search|Sparkles|Check|Gauge|ShoppingCart|ArrowRight|Loader2)\s+size=\{\d+\}(?![^>]*aria-hidden)/g)
  assert.equal(iconsOhneAria, null, `dekoratives Icon ohne aria-hidden: ${iconsOhneAria}`)
})

test('Accessibility: die ausgeblendeten Story-Schritte sind aria-hidden', () => {
  // Sonst läse ein Screenreader vier Schritte gleichzeitig vor.
  assert.match(storyStage, /aria-hidden=\{i !== aktiv\}/)
})
