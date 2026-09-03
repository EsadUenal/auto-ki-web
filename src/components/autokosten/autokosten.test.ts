// Autokosten-Rechner — Frontend-Tests. Kein Test-Framework im Repo (siehe
// AGENTS.md) — der in Node 20+/24 eingebaute Test-Runner ohne neue Dependency:
//
//     npm run test:autokosten
//
// Reine Logik wird direkt geprüft; Route/Shell/Verdrahtung strukturell an der
// Quelle (gleiches Muster wie autofinder.test.ts).

import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

import {
  EMPTY_FORM,
  BEISPIEL_FORM,
  berechne,
  validate,
  parseZahl,
  formatEuro,
  formatProKm,
  energiePreisFeld,
  speichereForm,
  ladeForm,
  loescheForm,
  type AutokostenForm,
} from './logic.ts'

const here = dirname(fileURLToPath(import.meta.url))
const read = (p: string) => readFileSync(join(here, p), 'utf8')
const logicSrc = read('logic.ts')
const viewSrc = read('AutokostenView.tsx')
const appTsx = readFileSync(join(here, '..', '..', 'App.tsx'), 'utf8')
const sidebarTsx = readFileSync(join(here, '..', 'Sidebar.tsx'), 'utf8')

const nahe = (a: number, b: number, eps = 1e-6) => Math.abs(a - b) < eps

function form(over: Partial<AutokostenForm> = {}): AutokostenForm {
  return { ...EMPTY_FORM, ...over }
}
const BASIS = {
  kaufpreis: '20000', kmProJahr: '15000',
  preisBenzin: '1,75', preisDiesel: '1,65', preisStrom: '0,35',
  versicherungJahr: '900', steuerJahr: '150', wartungJahr: '600', reifenJahr: '300',
} as const

function fakeStorage() {
  const store: Record<string, string> = {}
  ;(globalThis as Record<string, unknown>).localStorage = {
    getItem: (k: string) => (k in store ? store[k] : null),
    setItem: (k: string, v: string) => { store[k] = String(v) },
    removeItem: (k: string) => { delete store[k] },
  }
  return store
}

// ── Route / Shell / Sidebar ────────────────────────────────────────────────
test('Route: /autokosten ist in der App-Shell registriert', () => {
  assert.match(appTsx, /path="\/autokosten" element=\{<AutokostenView \/>\}/)
  assert.match(appTsx, /import AutokostenView from '\.\/components\/autokosten\/AutokostenView'/)
})
test('Shell: View nutzt die kanonische VIRA-Content-Sprache', () => {
  assert.match(viewSrc, /h-full overflow-y-auto scrollbar-thin/)
  assert.match(viewSrc, /ez-aurora/)
  assert.match(viewSrc, /ez-rise relative max-w-3xl mx-auto px-4 sm:px-6 py-10/)
  assert.match(viewSrc, /Vira · Autokosten/)
  assert.match(viewSrc, /Kosten berechnen/)
})
test('Sidebar: Autokosten-Navigationseintrag bei den Werkzeugen', () => {
  assert.match(sidebarTsx, /to: '\/autokosten',\s*Icon: Calculator,\s*label: 'Autokosten'/)
})

// ── A) Benziner ────────────────────────────────────────────────────────────
test('A: Benziner-Beispiel wird korrekt gerechnet', () => {
  const f = form({ ...BASIS, kraftstoff: 'benzin', verbrauch: '6,5', wertverlustJahr: '2000' })
  assert.deepEqual(validate(f), [])
  const e = berechne(f)
  assert.ok(nahe(e.jahresverbrauch, 975))            // 15000/100 * 6.5
  assert.ok(nahe(e.energieJahr, 1706.25))            // 975 * 1.75
  assert.ok(nahe(e.gesamtJahr, 5656.25))             // 1706.25 + 900+150+600+300 + 2000
  assert.ok(nahe(e.gesamtMonat, 5656.25 / 12))
  assert.ok(nahe(e.kostenProKm, 5656.25 / 15000))
})

// ── B) Diesel ──────────────────────────────────────────────────────────────
test('B: Diesel nutzt den Dieselpreis, nicht Benzin/Strom', () => {
  const f = form({ ...BASIS, kraftstoff: 'diesel', verbrauch: '5,0' })
  assert.deepEqual(validate(f), [])
  const e = berechne(f)
  assert.ok(nahe(e.jahresverbrauch, 750))
  assert.ok(nahe(e.energieJahr, 750 * 1.65))         // Dieselpreis
  assert.ok(nahe(e.gesamtJahr, 750 * 1.65 + 1950))   // + 900+150+600+300
})

// ── C) Elektro ─────────────────────────────────────────────────────────────
test('C: Elektro rechnet mit kWh und Strompreis', () => {
  const f = form({ ...BASIS, kraftstoff: 'elektro', verbrauch: '17' })
  assert.deepEqual(validate(f), [])
  const e = berechne(f)
  assert.equal(e.energieEinheitMenge, 'kWh')
  assert.ok(nahe(e.jahresverbrauch, 2550))           // 150 * 17
  assert.ok(nahe(e.energieJahr, 2550 * 0.35))
  assert.equal(energiePreisFeld('elektro'), 'preisStrom')
})

// ── D) Monat = Jahr / 12 ───────────────────────────────────────────────────
test('D: jede Monatskomponente ist der Jahreswert / 12', () => {
  const f = form({ ...BASIS, kraftstoff: 'benzin', verbrauch: '7', garageMonat: '80',
    finanzierungMonat: '199', wertverlustJahr: '1800' })
  const e = berechne(f)
  assert.ok(nahe(e.gesamtMonat, e.gesamtJahr / 12))
  assert.ok(nahe(e.energieMonat, e.energieJahr / 12))
  assert.ok(nahe(e.versicherungMonat, 900 / 12))
  assert.ok(nahe(e.wertverlustMonat, 1800 / 12))
  // Garage/Finanzierung sind bereits Monatswerte -> unverändert
  assert.ok(nahe(e.garageMonat, 80))
  assert.ok(nahe(e.finanzierungMonat, 199))
})

// ── E) Kosten pro Kilometer ────────────────────────────────────────────────
test('E: kostenProKm = gesamtJahr / kmProJahr', () => {
  const f = form({ ...BASIS, kraftstoff: 'benzin', verbrauch: '6' })
  const e = berechne(f)
  assert.ok(nahe(e.kostenProKm, e.gesamtJahr / 15000))
  assert.match(formatProKm(e.kostenProKm), /^\d+,\d{2} €$/)   // auf Cent gerundet
})

// ── F) Finanzierung optional ───────────────────────────────────────────────
test('F: gesetzte Finanzierungsrate wird als 12x pro Jahr addiert (keine Zinsen)', () => {
  const ohne = berechne(form({ ...BASIS, kraftstoff: 'benzin', verbrauch: '6' }))
  const mit = berechne(form({ ...BASIS, kraftstoff: 'benzin', verbrauch: '6', finanzierungMonat: '250' }))
  assert.ok(nahe(mit.gesamtJahr - ohne.gesamtJahr, 250 * 12))
  assert.ok(nahe(mit.finanzierungMonat, 250))
})

// ── G) Wertverlust optional ────────────────────────────────────────────────
test('G: gesetzter Wertverlust (€/Jahr) wird 1:1 pro Jahr addiert', () => {
  const ohne = berechne(form({ ...BASIS, kraftstoff: 'benzin', verbrauch: '6' }))
  const mit = berechne(form({ ...BASIS, kraftstoff: 'benzin', verbrauch: '6', wertverlustJahr: '2400' }))
  assert.ok(nahe(mit.gesamtJahr - ohne.gesamtJahr, 2400))
  assert.ok(nahe(mit.wertverlustMonat, 200))
})

// ── H) Garage optional ─────────────────────────────────────────────────────
test('H: gesetzter Stellplatz (€/Monat) wird als 12x pro Jahr addiert', () => {
  const ohne = berechne(form({ ...BASIS, kraftstoff: 'benzin', verbrauch: '6' }))
  const mit = berechne(form({ ...BASIS, kraftstoff: 'benzin', verbrauch: '6', garageMonat: '95' }))
  assert.ok(nahe(mit.gesamtJahr - ohne.gesamtJahr, 95 * 12))
})

// ── I) Negative Werte ──────────────────────────────────────────────────────
test('I: negative Werte sind ungültig', () => {
  const negVerbrauch = validate(form({ ...BASIS, kraftstoff: 'benzin', verbrauch: '-6' }))
  assert.ok(negVerbrauch.some((e) => e.feld === 'verbrauch'))
  const negFix = validate(form({ ...BASIS, kraftstoff: 'benzin', verbrauch: '6', versicherungJahr: '-100' }))
  assert.ok(negFix.some((e) => e.feld === 'versicherungJahr'))
  const negPreis = validate(form({ ...BASIS, kraftstoff: 'benzin', verbrauch: '6', preisBenzin: '-1' }))
  assert.ok(negPreis.some((e) => e.feld === 'preisBenzin'))
})

// ── J) 0 km / 0 Verbrauch / 0 Preis ────────────────────────────────────────
test('J: Fahrleistung / Verbrauch / Energiepreis müssen > 0 sein', () => {
  assert.ok(validate(form({ ...BASIS, kraftstoff: 'benzin', verbrauch: '6', kmProJahr: '0' }))
    .some((e) => e.feld === 'kmProJahr'))
  assert.ok(validate(form({ ...BASIS, kraftstoff: 'benzin', verbrauch: '0' }))
    .some((e) => e.feld === 'verbrauch'))
  assert.ok(validate(form({ ...BASIS, kraftstoff: 'benzin', verbrauch: '6', preisBenzin: '0' }))
    .some((e) => e.feld === 'preisBenzin'))
})
test('J2: nur der Energiepreis der gewählten Kraftstoffart wird geprüft', () => {
  // Diesel gewählt, Benzinpreis leer -> trotzdem valide
  const f = form({ kraftstoff: 'diesel', verbrauch: '5', kmProJahr: '10000', preisDiesel: '1,60' })
  assert.deepEqual(validate(f), [])
})

// ── keine NaN / Infinity ───────────────────────────────────────────────────
test('Safety: Ergebnis enthält nie NaN oder Infinity; formatEuro fängt Unfug ab', () => {
  const e = berechne(form({ ...BASIS, kraftstoff: 'benzin', verbrauch: '6' }))
  for (const v of Object.values(e)) {
    if (typeof v === 'number') assert.ok(Number.isFinite(v), `nicht endlich: ${v}`)
  }
  assert.equal(formatEuro(Number.NaN), formatEuro(0))
  assert.equal(formatEuro(Number.POSITIVE_INFINITY), formatEuro(0))
  assert.match(formatEuro(1234.5), /1\.234,50\s?€/)
})
test('parseZahl: deutsche Eingabe (Komma, Tausenderpunkt)', () => {
  assert.equal(parseZahl('1.234,56'), 1234.56)
  assert.equal(parseZahl('6,5'), 6.5)
  assert.equal(parseZahl('20000'), 20000)
  assert.ok(Number.isNaN(parseZahl('')))
  assert.ok(Number.isNaN(parseZahl('abc')))
})

// ── K) localStorage Restore ────────────────────────────────────────────────
test('K: Form wird gespeichert und beim Reload wiederhergestellt', () => {
  fakeStorage()
  loescheForm()
  assert.equal(ladeForm(), null)
  const f = form({ ...BASIS, kraftstoff: 'diesel', verbrauch: '5,2' })
  speichereForm(f)
  const wieder = ladeForm()
  assert.ok(wieder)
  assert.equal(wieder!.kraftstoff, 'diesel')
  assert.equal(wieder!.verbrauch, '5,2')
  assert.equal(wieder!.kmProJahr, '15000')
  loescheForm()
  assert.equal(ladeForm(), null)
})
test('K2: die View stellt die letzte Berechnung beim Mount wieder her', () => {
  assert.match(viewSrc, /const gespeichert = ladeForm\(\)/)
  assert.match(viewSrc, /if \(validate\(gespeichert\)\.length === 0\)/)
  assert.match(viewSrc, /setErgebnis\(berechne\(gespeichert\)\)/)
  assert.match(viewSrc, /speichereForm\(form\)/)          // beim Berechnen speichern
})

// ── L) keine externen Calls ────────────────────────────────────────────────
test('L: rein deterministisch — kein Netz, kein api-client, kein Provider-Aufruf', () => {
  // Kommentare mit dem WORT "Gemini" sind ok — es zählt nur echter Code:
  const codeOnly = (s: string) => s.replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '')
  for (const src of [codeOnly(logicSrc), codeOnly(viewSrc)]) {
    assert.doesNotMatch(src, /\bfetch\s*\(/)
    assert.doesNotMatch(src, /XMLHttpRequest|WebSocket|EventSource/)
    assert.doesNotMatch(src, /call_gemini|apiAutoFinder|apiKaufCheck|tavily/i)
  }
  // keinerlei Import aus dem api-client oder anderen Tool-Logiken
  assert.doesNotMatch(logicSrc, /from ['"][^'"]*\/api\/client['"]/)
  assert.doesNotMatch(viewSrc, /from ['"][^'"]*\/api\/client['"]/)
  assert.doesNotMatch(viewSrc, /from ['"][^'"]*\/(autofinder|kaufcheck|verkaufscheck)\//i)
})

// ── Beispielwerte ──────────────────────────────────────────────────────────
test('Beispiel: BEISPIEL_FORM ist valide und rechnet sauber', () => {
  assert.deepEqual(validate(BEISPIEL_FORM), [])
  const e = berechne(BEISPIEL_FORM)
  assert.ok(e.gesamtMonat > 0 && Number.isFinite(e.gesamtMonat))
  assert.match(viewSrc, /Mit Beispielwerten füllen/)
  assert.match(viewSrc, /Zurücksetzen/)
})

// ── Ausgabe-Vollständigkeit ────────────────────────────────────────────────
test('Ausgabe: alle geforderten Posten + GESAMT + Kosten/km sind in der View', () => {
  assert.match(viewSrc, /Gesamt pro Monat/)
  assert.match(viewSrc, /Gesamt pro Jahr/)
  assert.match(viewSrc, /Kosten pro Kilometer/)
  assert.match(viewSrc, /Versicherung/)
  assert.match(viewSrc, /Kfz-Steuer/)
  assert.match(viewSrc, /Wartung/)
  assert.match(viewSrc, /Reifen/)
})
