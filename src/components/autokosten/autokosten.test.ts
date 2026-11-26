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
  formatDelta,
  energiePreisFeld,
  speichereForm,
  ladeForm,
  loescheForm,
  baueInsights,
  budgetCheck,
  fehlendeLaufendeAngaben,
  vergleiche,
  starteVergleich,
  type AutokostenForm,
} from './logic.ts'
import {
  alsFeldwert, alsMap, referenzFuer, referenzLabel, uebernehmeReferenz,
} from './kraftstoffReferenz.ts'

const here = dirname(fileURLToPath(import.meta.url))
const read = (p: string) => readFileSync(join(here, p), 'utf8')
const logicSrc = read('logic.ts')
const viewSrc = read('AutokostenView.tsx')
const ergebnisSrc = read('AutokostenErgebnis.tsx')
const refSrc = read('kraftstoffReferenz.ts')
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
test('Route: /autokosten ist in der App-Shell registriert und bleibt ohne Login', () => {
  assert.match(appTsx, /path="\/autokosten" element=\{<AutokostenView \/>\}/)
  assert.match(appTsx, /import AutokostenView from '\.\/components\/autokosten\/AutokostenView'/)
  // kein <Guard> um die Route: der Rechner ist ein kostenloses Akquise-Werkzeug
  assert.doesNotMatch(appTsx, /path="\/autokosten"[^\n]*<Guard/)
})
test('Shell: View nutzt die kanonische ENFAL-Content-Sprache', () => {
  assert.match(viewSrc, /h-full overflow-y-auto scrollbar-thin/)
  assert.match(viewSrc, /ez-aurora/)
  assert.match(viewSrc, /ez-rise ez-page relative px-4 sm:px-6 py-10/)
  assert.match(viewSrc, /ENFAL · Autokosten/)
  assert.match(viewSrc, /Kosten berechnen/)
})
test('Sidebar: Autokosten-Navigationseintrag bei den Werkzeugen', () => {
  assert.match(sidebarTsx, /to: '\/autokosten',\s*Icon: Calculator,\s*label: 'Autokosten'/)
})

// ══════════════════════════════════════════════════════════════════════════
// §27 — DER BESTEHENDE RC1-TESTFALL MUSS EXAKT GLEICH BLEIBEN
// ══════════════════════════════════════════════════════════════════════════
test('RC1-Referenzfall: Zahlen unverändert (Product Upgrade bricht die Mathematik nicht)', () => {
  const f = form({
    kaufpreis: '20000', kmProJahr: '15000', kraftstoff: 'benzin', verbrauch: '6,5',
    preisBenzin: '1,75',
    versicherungJahr: '900', steuerJahr: '150', wartungJahr: '600', reifenJahr: '300',
    garageMonat: '', finanzierungMonat: '', wertverlustJahr: '2000',
  })
  assert.deepEqual(validate(f), [])
  const e = berechne(f)
  assert.ok(nahe(e.jahresverbrauch, 975), 'Energie: 975 l/Jahr')
  assert.ok(nahe(e.energieJahr, 1706.25), 'Kraftstoff: 1.706,25 €/Jahr')
  assert.ok(nahe(e.wirtschaftlichJahr, 5656.25), 'Gesamt: 5.656,25 €/Jahr')
  assert.ok(nahe(e.wirtschaftlichMonat, 471.35416666666663), 'Monat intern ungerundet')
  assert.ok(nahe(e.kostenProKm, 0.37708333333333333), '€/km intern ungerundet')
  // Anzeige: kaufmännisch gerundet
  assert.match(formatEuro(e.wirtschaftlichMonat), /^471,35\s?€$/)
  assert.match(formatProKm(e.kostenProKm), /^0,38 €$/)
  // §3: Projektion 1 / 3 / 5 Jahre
  assert.deepEqual(e.projektion.map((p) => p.jahre), [1, 3, 5])
  assert.ok(nahe(e.projektion[1].kosten, 16968.75))
  assert.ok(nahe(e.projektion[2].kosten, 28281.25))
})

// ── A) Benziner ────────────────────────────────────────────────────────────
test('A: Benziner-Beispiel wird korrekt gerechnet', () => {
  const f = form({ ...BASIS, kraftstoff: 'benzin', verbrauch: '6,5', wertverlustJahr: '2000' })
  assert.deepEqual(validate(f), [])
  const e = berechne(f)
  assert.ok(nahe(e.jahresverbrauch, 975))
  assert.ok(nahe(e.energieJahr, 1706.25))
  assert.ok(nahe(e.wirtschaftlichJahr, 5656.25))
  assert.ok(nahe(e.wirtschaftlichMonat, 5656.25 / 12))
  assert.ok(nahe(e.kostenProKm, 5656.25 / 15000))
})

// ── B) Diesel ──────────────────────────────────────────────────────────────
test('B: Diesel nutzt den Dieselpreis, nicht Benzin/Strom', () => {
  const f = form({ ...BASIS, kraftstoff: 'diesel', verbrauch: '5,0' })
  assert.deepEqual(validate(f), [])
  const e = berechne(f)
  assert.ok(nahe(e.jahresverbrauch, 750))
  assert.ok(nahe(e.energieJahr, 750 * 1.65))
  assert.ok(nahe(e.wirtschaftlichJahr, 750 * 1.65 + 1950))
})

// ── C) Elektro ─────────────────────────────────────────────────────────────
test('C: Elektro rechnet mit kWh und Ladepreis', () => {
  const f = form({ ...BASIS, kraftstoff: 'elektro', verbrauch: '17' })
  assert.deepEqual(validate(f), [])
  const e = berechne(f)
  assert.equal(e.energieEinheitMenge, 'kWh')
  assert.ok(nahe(e.jahresverbrauch, 2550))
  assert.ok(nahe(e.energieJahr, 2550 * 0.35))
  assert.equal(energiePreisFeld('elektro'), 'preisStrom')
  assert.equal(e.posten.find((p) => p.key === 'energie')?.label, 'Strom')
})

// ── D) Monat = Jahr / 12 ───────────────────────────────────────────────────
test('D: jede Monatskomponente ist der Jahreswert / 12', () => {
  const f = form({ ...BASIS, kraftstoff: 'benzin', verbrauch: '7', garageMonat: '80',
    wertverlustJahr: '1800' })
  const e = berechne(f)
  assert.ok(nahe(e.wirtschaftlichMonat, e.wirtschaftlichJahr / 12))
  assert.ok(nahe(e.energieMonat, e.energieJahr / 12))
  assert.ok(nahe(e.posten.find((p) => p.key === 'versicherung')!.monat, 900 / 12))
  assert.ok(nahe(e.posten.find((p) => p.key === 'wertverlust')!.monat, 1800 / 12))
  assert.ok(nahe(e.posten.find((p) => p.key === 'garage')!.monat, 80))
})

// ── E) Kosten pro Kilometer ────────────────────────────────────────────────
test('E: kostenProKm = wirtschaftlichJahr / kmProJahr', () => {
  const f = form({ ...BASIS, kraftstoff: 'benzin', verbrauch: '6' })
  const e = berechne(f)
  assert.ok(nahe(e.kostenProKm, e.wirtschaftlichJahr / 15000))
  assert.match(formatProKm(e.kostenProKm), /^\d+,\d{2} €$/)
})

// ══════════════════════════════════════════════════════════════════════════
// AK-02 — LAUFENDE AUSGABEN (Monatsdurchschnitt) vs. WIRTSCHAFTLICHE KOSTEN (inkl. Wertverlust)
// ══════════════════════════════════════════════════════════════════════════
// AK-02: Die frühere Finanzierungsrate ist entfernt (Produktregel). Die Tests F/F2 sicherten die Rate als
// "separate Kontobelastung" ab; gesichert wird jetzt die Trennung der beiden Kostengrößen ohne Rate.
test('F: laufende Ausgaben und wirtschaftliche Kosten sind getrennte Größen; der Wertverlust ist nur in der zweiten', () => {
  const ohne = berechne(form({ ...BASIS, kraftstoff: 'benzin', verbrauch: '6' }))
  const mit = berechne(form({ ...BASIS, kraftstoff: 'benzin', verbrauch: '6', wertverlustJahr: '2000' }))
  assert.ok(nahe(mit.laufendeCashMonat, ohne.laufendeCashMonat))            // Wertverlust ändert die laufenden Ausgaben nicht
  assert.ok(nahe(mit.wirtschaftlichMonat - ohne.wirtschaftlichMonat, 2000 / 12))
  assert.equal(mit.posten.find((p) => p.key === 'wertverlust')?.cash, false)  // Aufwand, keine Abbuchung
  assert.equal('cashBelastungMonat' in mit, false)
  assert.equal('finanzierungMonat' in mit, false)
})

test('F2: konkretes Auftragsbeispiel — 471 € wirtschaftlich, 305 € laufend (ohne Rate)', () => {
  const f = form({
    kmProJahr: '15000', kraftstoff: 'benzin', verbrauch: '6,5', preisBenzin: '1,75',
    versicherungJahr: '900', steuerJahr: '150', wartungJahr: '600', reifenJahr: '300',
    wertverlustJahr: '2000',
  })
  const e = berechne(f)
  assert.ok(nahe(e.wirtschaftlichMonat, 5656.25 / 12))          // 471,35 €
  assert.ok(nahe(e.laufendeCashMonat, (5656.25 - 2000) / 12))   // 304,69 €
})

test('F3: laufende Ausgaben sind wirtschaftliche Kosten minus Wertverlust', () => {
  const e = berechne(form({ ...BASIS, kraftstoff: 'benzin', verbrauch: '6', wertverlustJahr: '2400' }))
  assert.ok(nahe(e.laufendeCashJahr, e.wirtschaftlichJahr - 2400))
  assert.ok(nahe(e.laufendeCashMonat, e.laufendeCashJahr / 12))
})

// ── G) Wertverlust ─────────────────────────────────────────────────────────
test('G: gesetzter Wertverlust (€/Jahr) wird 1:1 pro Jahr addiert', () => {
  const ohne = berechne(form({ ...BASIS, kraftstoff: 'benzin', verbrauch: '6' }))
  const mit = berechne(form({ ...BASIS, kraftstoff: 'benzin', verbrauch: '6', wertverlustJahr: '2400' }))
  assert.ok(nahe(mit.wirtschaftlichJahr - ohne.wirtschaftlichJahr, 2400))
  assert.ok(nahe(mit.posten.find((p) => p.key === 'wertverlust')!.monat, 200))
  assert.equal(mit.hatWertverlust, true)
})

test('G2: leerer Wertverlust wird NICHT geschätzt und ausdrücklich gekennzeichnet', () => {
  const e = berechne(form({ ...BASIS, kraftstoff: 'benzin', verbrauch: '6', wertverlustJahr: '' }))
  assert.equal(e.hatWertverlust, false)
  assert.equal(e.wertverlustJahr, 0)
  assert.equal(e.posten.some((p) => p.key === 'wertverlust'), false)
  // kein automatischer Prozentsatz vom Kaufpreis
  assert.ok(nahe(e.wirtschaftlichJahr, e.energieJahr + 1950))
  // Die Ergebnisansicht weist die Lücke aus
  assert.match(ergebnisSrc, /Wertverlust nicht berücksichtigt/)
  const insights = baueInsights(e, form({ ...BASIS, verbrauch: '6' }))
  assert.ok(insights.some((i) => i.key === 'kein-wertverlust'))
})

test('G3: eine 0 beim Wertverlust ist eine Angabe, kein "unbekannt"', () => {
  const e = berechne(form({ ...BASIS, kraftstoff: 'benzin', verbrauch: '6', wertverlustJahr: '0' }))
  assert.equal(e.hatWertverlust, true)
  assert.equal(e.posten.some((p) => p.key === 'wertverlust'), false)   // 0 € wird nicht gelistet
})

// ── H) Garage ──────────────────────────────────────────────────────────────
test('H: gesetzter Stellplatz (€/Monat) wird als 12x pro Jahr addiert', () => {
  const ohne = berechne(form({ ...BASIS, kraftstoff: 'benzin', verbrauch: '6' }))
  const mit = berechne(form({ ...BASIS, kraftstoff: 'benzin', verbrauch: '6', garageMonat: '95' }))
  assert.ok(nahe(mit.wirtschaftlichJahr - ohne.wirtschaftlichJahr, 95 * 12))
})

// ── Validierung ────────────────────────────────────────────────────────────
test('I: negative Werte sind ungültig', () => {
  assert.ok(validate(form({ ...BASIS, kraftstoff: 'benzin', verbrauch: '-6' }))
    .some((e) => e.feld === 'verbrauch'))
  assert.ok(validate(form({ ...BASIS, kraftstoff: 'benzin', verbrauch: '6', versicherungJahr: '-100' }))
    .some((e) => e.feld === 'versicherungJahr'))
  assert.ok(validate(form({ ...BASIS, kraftstoff: 'benzin', verbrauch: '6', preisBenzin: '-1' }))
    .some((e) => e.feld === 'preisBenzin'))
  assert.ok(validate(form({ ...BASIS, kraftstoff: 'benzin', verbrauch: '6', budgetMonat: '-50' }))
    .some((e) => e.feld === 'budgetMonat'))
})

test('J: Fahrleistung / Verbrauch / Energiepreis müssen > 0 sein', () => {
  assert.ok(validate(form({ ...BASIS, kraftstoff: 'benzin', verbrauch: '6', kmProJahr: '0' }))
    .some((e) => e.feld === 'kmProJahr'))
  assert.ok(validate(form({ ...BASIS, kraftstoff: 'benzin', verbrauch: '0' }))
    .some((e) => e.feld === 'verbrauch'))
  assert.ok(validate(form({ ...BASIS, kraftstoff: 'benzin', verbrauch: '6', preisBenzin: '0' }))
    .some((e) => e.feld === 'preisBenzin'))
})
test('J2: nur der Energiepreis der gewählten Kraftstoffart wird geprüft', () => {
  const f = form({ kraftstoff: 'diesel', verbrauch: '5', kmProJahr: '10000', preisDiesel: '1,60' })
  assert.deepEqual(validate(f), [])
})

// ══════════════════════════════════════════════════════════════════════════
// §26 — EDGE CASES
// ══════════════════════════════════════════════════════════════════════════
test('Edge: km = 0 erzeugt keine Division durch 0', () => {
  const e = berechne(form({ ...BASIS, kraftstoff: 'benzin', verbrauch: '6', kmProJahr: '0' }))
  assert.equal(e.kostenProKm, 0)
  assert.ok(Number.isFinite(e.wirtschaftlichJahr))
})
test('Edge: alles leer bleibt endlich (keine NaN-Kaskade)', () => {
  const e = berechne(EMPTY_FORM)
  for (const [k, v] of Object.entries(e)) {
    if (typeof v === 'number') assert.ok(Number.isFinite(v), `nicht endlich: ${k}=${v}`)
  }
  assert.equal(e.posten.length, 0)
})
test('Edge: kein Kaufpreis ändert die Kosten nicht (er geht nie in die Summe ein)', () => {
  const mit = berechne(form({ ...BASIS, kraftstoff: 'benzin', verbrauch: '6' }))
  const ohne = berechne(form({ ...BASIS, kaufpreis: '', kraftstoff: 'benzin', verbrauch: '6' }))
  assert.ok(nahe(mit.wirtschaftlichJahr, ohne.wirtschaftlichJahr))
})
test('Edge: sehr hohe Fahrleistung bleibt exakt', () => {
  const e = berechne(form({ ...BASIS, kraftstoff: 'benzin', verbrauch: '6', kmProJahr: '250000' }))
  assert.ok(nahe(e.jahresverbrauch, 15000))
  assert.ok(nahe(e.energieJahr, 15000 * 1.75))
  assert.ok(Number.isFinite(e.kostenProKm))
})
test('Edge: Dezimal-Komma und -Punkt liefern dasselbe Ergebnis', () => {
  const komma = berechne(form({ ...BASIS, kraftstoff: 'benzin', verbrauch: '6,5' }))
  const punkt = berechne(form({ ...BASIS, kraftstoff: 'benzin', verbrauch: '6.5' }))
  assert.ok(nahe(komma.wirtschaftlichJahr, punkt.wirtschaftlichJahr))
})
test('Safety: Ergebnis enthält nie NaN oder Infinity; formatEuro fängt Unfug ab', () => {
  const e = berechne(form({ ...BASIS, kraftstoff: 'benzin', verbrauch: '6' }))
  for (const v of Object.values(e)) {
    if (typeof v === 'number') assert.ok(Number.isFinite(v), `nicht endlich: ${v}`)
  }
  assert.equal(formatEuro(Number.NaN), formatEuro(0))
  assert.equal(formatEuro(Number.POSITIVE_INFINITY), formatEuro(0))
  assert.match(formatEuro(1234.5), /1\.234,50\s?€/)
  assert.equal(formatDelta(0), '±0 €')
  assert.match(formatDelta(127), /^\+/)
  assert.match(formatDelta(-34), /^−/)
})
test('parseZahl: deutsche Eingabe (Komma, Tausenderpunkt)', () => {
  assert.equal(parseZahl('1.234,56'), 1234.56)
  assert.equal(parseZahl('6,5'), 6.5)
  assert.equal(parseZahl('20000'), 20000)
  assert.ok(Number.isNaN(parseZahl('')))
  assert.ok(Number.isNaN(parseZahl('abc')))
})

// ══════════════════════════════════════════════════════════════════════════
// §4/§19 — KOSTENANTEILE UND INSIGHTS
// ══════════════════════════════════════════════════════════════════════════
test('Anteile: Posten sind absteigend sortiert und summieren sich auf 100 %', () => {
  const e = berechne(form({ ...BASIS, kraftstoff: 'benzin', verbrauch: '6,5', wertverlustJahr: '2000' }))
  const summe = e.posten.reduce((s, p) => s + p.anteil, 0)
  assert.ok(nahe(summe, 100, 1e-9))
  for (let i = 1; i < e.posten.length; i++) {
    assert.ok(e.posten[i - 1].jahr >= e.posten[i].jahr, 'absteigend nach Jahreskosten')
  }
  assert.equal(e.posten[0].key, 'wertverlust')   // 2000 € > 1706,25 € Kraftstoff
  assert.equal(e.posten[1].key, 'energie')
  // Wertverlust ist kein Kontoabgang und wird so markiert
  assert.equal(e.posten.find((p) => p.key === 'wertverlust')!.cash, false)
  assert.equal(e.posten.find((p) => p.key === 'energie')!.cash, true)
})

test('Insights: nennen größten und zweitgrößten Block sowie deren Summe', () => {
  const f = form({ ...BASIS, kraftstoff: 'benzin', verbrauch: '6,5', wertverlustJahr: '2000' })
  const e = berechne(f)
  const texte = baueInsights(e, f).map((i) => i.text).join(' ')
  assert.match(texte, /größter Kostenblock ist Wertverlust/)
  assert.match(texte, /166,67\s?€/)                    // 2000/12
  assert.match(texte, /Wertverlust und Kraftstoff machen zusammen/)
  assert.match(texte, /je 100 km/)
  // keine Bevölkerungs-/Community-Vergleiche
  assert.doesNotMatch(texte, /Durchschnitt der|Nutzer|Deutschen|Prozent der/)
})

test('Insights: Energiekosten je 100 km sind Verbrauch × Preis', () => {
  const e = berechne(form({ ...BASIS, kraftstoff: 'benzin', verbrauch: '6,5' }))
  assert.ok(nahe(e.energieJe100km, 6.5 * 1.75))
})

// ══════════════════════════════════════════════════════════════════════════
// §6 — BUDGET-CHECK
// ══════════════════════════════════════════════════════════════════════════
test('Budget: ohne Eingabe gibt es den Bereich nicht', () => {
  const f = form({ ...BASIS, kraftstoff: 'benzin', verbrauch: '6,5', wertverlustJahr: '2000' })
  assert.equal(budgetCheck(berechne(f), f), null)
})
// AK-02: Bezugsgröße ist jetzt der Monatsdurchschnitt der LAUFENDEN Ausgaben (304,69 € im BASIS-Fall), nicht mehr die
// wirtschaftlichen Kosten inklusive Wertverlust (471,35 €). Die Erwartungen unten sind darauf umgestellt, nicht abgeschwächt.
const BUDGET_BASIS = { ...BASIS, kraftstoff: 'benzin' as const, verbrauch: '6,5', wertverlustJahr: '2000' }
test('Budget: über Budget wird sachlich beziffert, ohne Bewertung der Person', () => {
  const f = form({ ...BUDGET_BASIS, budgetMonat: '250' })
  const b = budgetCheck(berechne(f), f)!
  assert.equal(b.status, 'ueber')
  assert.ok(nahe(b.differenz, (5656.25 - 2000) / 12 - 250))     // ~54,69 €
  assert.match(b.text, /über deinem Monatsbudget/)
  assert.doesNotMatch(b.text, /kannst du dir nicht leisten|leisten/)
})
test('Budget: unter und exakt gleich werden unterschieden', () => {
  const unter = form({ ...BUDGET_BASIS, budgetMonat: '600' })
  const bu = budgetCheck(berechne(unter), unter)!
  assert.equal(bu.status, 'unter')
  assert.match(bu.text, /unter deinem Monatsbudget/)
  const gleichForm = form({ ...BUDGET_BASIS, budgetMonat: String((5656.25 - 2000) / 12).replace('.', ',') })
  assert.equal(budgetCheck(berechne(gleichForm), gleichForm)!.status, 'gleich')
})
test('Budget: Bezugsgröße sind die laufenden Ausgaben; die wirtschaftlichen Kosten stehen daneben', () => {
  const f = form({ ...BUDGET_BASIS, budgetMonat: '400' })
  const e = berechne(f)
  const b = budgetCheck(e, f)!
  assert.ok(nahe(b.laufendMonat, e.laufendeCashMonat))
  assert.ok(nahe(b.wirtschaftlichMonat, e.wirtschaftlichMonat))
  assert.equal(b.status, 'unter')            // 304,69 < 400, obwohl 471,35 über 400 läge
})
test('AK-02 Kontrollfall: laufend 350 €, wirtschaftlich 550 €, Budget 600 €, Abstand 250 €', () => {
  const f = form({ ...EMPTY_FORM, kmProJahr: '8000', verbrauch: '10', preisBenzin: '1,50', versicherungJahr: '1200',
    steuerJahr: '240', wartungJahr: '600', reifenJahr: '360', garageMonat: '50', wertverlustJahr: '2400',
    budgetMonat: '600', kaufpreis: '20000' })
  assert.deepEqual(validate(f), [])
  const e = berechne(f)
  assert.ok(nahe(e.energieJahr, 1200))
  assert.ok(nahe(e.laufendeCashJahr, 4200) && nahe(e.laufendeCashMonat, 350))
  assert.ok(nahe(e.wirtschaftlichJahr, 6600) && nahe(e.wirtschaftlichMonat, 550))
  assert.equal(e.laufendUnvollstaendig, false)
  assert.equal(e.wirtschaftlichUnvollstaendig, false)
  const b = budgetCheck(e, f)!
  assert.equal(b.status, 'unter')
  assert.ok(nahe(b.differenz, -250))
  assert.match(b.text.replace(/ /g, ' '), /250,00 € unter deinem Monatsbudget/)
  assert.ok(nahe(b.wirtschaftlichMonat, 550))
})

// ══════════════════════════════════════════════════════════════════════════
// §7/§8/§29 — A/B-VERGLEICH
// ══════════════════════════════════════════════════════════════════════════
const A_FORM = form({
  kmProJahr: '15000', kraftstoff: 'benzin', verbrauch: '6,5', preisBenzin: '1,75',
  versicherungJahr: '900', steuerJahr: '150', wartungJahr: '600', reifenJahr: '300',
  wertverlustJahr: '2000',
})

test('Vergleich: identische Autos ergeben exakt 0 Differenz', () => {
  const a = berechne(A_FORM)
  const d = vergleiche(a, berechne(A_FORM))
  assert.equal(d.monat, 0)
  assert.equal(d.jahr, 0)
  assert.equal(d.fuenfJahre, 0)
  assert.deepEqual(d.treiber, [])
})

test('Vergleich: Monats-, Jahres-, 3- und 5-Jahres-Differenz sind konsistent', () => {
  const a = berechne(A_FORM)
  const b = berechne(form({ ...A_FORM, verbrauch: '9', versicherungJahr: '1300', wertverlustJahr: '2600' }))
  const d = vergleiche(a, b)
  assert.ok(nahe(d.monat, b.wirtschaftlichMonat - a.wirtschaftlichMonat))
  assert.ok(nahe(d.jahr, d.monat * 12, 1e-9))
  assert.ok(nahe(d.dreiJahre, d.jahr * 3))
  assert.ok(nahe(d.fuenfJahre, d.jahr * 5))
  assert.ok(d.monat > 0, 'Auto B ist teurer')
})

test('Vergleich: die Treiber erklären die Differenz vollständig', () => {
  const a = berechne(A_FORM)
  const b = berechne(form({ ...A_FORM, verbrauch: '9', versicherungJahr: '1300', wertverlustJahr: '2600' }))
  const d = vergleiche(a, b)
  const summe = d.treiber.reduce((s, t) => s + t.differenzMonat, 0)
  assert.ok(nahe(summe, d.monat, 1e-9), 'Summe der Treiber = Gesamtdifferenz')
  // absteigend nach Betrag
  for (let i = 1; i < d.treiber.length; i++) {
    assert.ok(Math.abs(d.treiber[i - 1].differenzMonat) >= Math.abs(d.treiber[i].differenzMonat))
  }
  assert.ok(d.treiber.some((t) => t.key === 'energie'))
  assert.ok(d.treiber.some((t) => t.key === 'versicherung'))
})

test('Vergleich: Benzin gegen Elektro rechnet beide Einheiten sauber', () => {
  const a = berechne(A_FORM)
  const b = berechne(form({ ...A_FORM, kraftstoff: 'elektro', verbrauch: '17', preisStrom: '0,39',
    steuerJahr: '0' }))
  const d = vergleiche(a, b)
  assert.ok(Number.isFinite(d.monat))
  assert.equal(b.energieEinheitMenge, 'kWh')
  assert.ok(nahe(b.energieJahr, 2550 * 0.39))
  assert.ok(d.treiber.some((t) => t.key === 'energie'))
})

test('Vergleich-Start: gemeinsame Nutzung übernommen, Fahrzeugwerte NICHT', () => {
  const a = form({ ...A_FORM, garageMonat: '80', budgetMonat: '400', kaufpreis: '20000' })
  const b = starteVergleich(a)
  // übernommen: Nutzungsannahmen
  assert.equal(b.kmProJahr, '15000')
  assert.equal(b.garageMonat, '80')
  assert.equal(b.budgetMonat, '400')
  assert.equal(b.preisBenzin, '1,75')
  assert.equal(b.kraftstoff, 'benzin')
  // NICHT übernommen: alles Fahrzeugspezifische
  for (const feld of ['kaufpreis', 'verbrauch', 'versicherungJahr', 'steuerJahr', 'wartungJahr',
    'reifenJahr', 'wertverlustJahr'] as const) {
    assert.equal(b[feld], '', `${feld} darf nicht kopiert werden`)
  }
})

test('Vergleich: kein automatisches Urteil, kein vorgeschlagenes Auto B', () => {
  assert.doesNotMatch(ergebnisSrc, /ist besser|empfehlen wir|Empfehlung:/i)
  assert.match(ergebnisSrc, /entscheidest du/)
  assert.match(ergebnisSrc, /ENFAL schlägt keines vor/)
})

// ══════════════════════════════════════════════════════════════════════════
// §5 — WAS-WÄRE-WENN (ein Rechenkern, keine zweite Formel)
// ══════════════════════════════════════════════════════════════════════════
test('Was-wäre-wenn: Simulator nutzt exakt denselben Rechenkern', () => {
  // Strukturell: der Simulator ruft berechne() auf und macht keine eigene Arithmetik.
  assert.match(ergebnisSrc, /const simErgebnis = useMemo\(\s*\(\) => \(validate\(sim\)\.length === 0 \? berechne\(sim\) : null\)/)
  assert.doesNotMatch(ergebnisSrc, /\/\s*12\s*\)\s*\*\s*/)      // keine eigene Monatsrechnung
  assert.doesNotMatch(ergebnisSrc, /\bfetch\s*\(/)              // kein zusätzlicher Request
})
test('Was-wäre-wenn: dieselben Eingaben ergeben dasselbe Ergebnis wie das Formular', () => {
  const e1 = berechne(A_FORM)
  const e2 = berechne({ ...A_FORM })
  assert.deepEqual(e1, e2)
  const teurer = berechne({ ...A_FORM, kmProJahr: '20000' })
  assert.ok(teurer.wirtschaftlichMonat > e1.wirtschaftlichMonat)
})

// ══════════════════════════════════════════════════════════════════════════
// §10–§13 — KRAFTSTOFF-REFERENZ
// ══════════════════════════════════════════════════════════════════════════
const REF_OK = {
  kraftstoff: 'benzin' as const, produkt: 'Euro-Super 95 (E5)', preis: 2.348, einheit: 'EUR/l',
  land: 'DE', quelle: 'Europäische Kommission, Weekly Oil Bulletin',
  quelle_datum: '2026-09-21', abgerufen_am: '2026-09-23T10:00:00+00:00',
  status: 'ok' as const, hinweis: 'Deutschland-Referenz (nationaler Wochenwert), kein Livepreis.',
}
const REF_DIESEL = { ...REF_OK, kraftstoff: 'diesel' as const, preis: 2.457, produkt: 'Dieselkraftstoff' }

test('Referenz: leere Preisfelder werden vorbelegt, Datenstand ist sichtbar', () => {
  const ref = alsMap([REF_OK, REF_DIESEL])
  const f = uebernehmeReferenz(EMPTY_FORM, ref)
  assert.equal(f.preisBenzin, alsFeldwert(2.348))
  assert.equal(f.preisDiesel, alsFeldwert(2.457))
  assert.match(referenzLabel(ref.benzin)!, /Deutschland-Referenz · Stand 21\.09\.2026/)
})

test('Referenz: eine Nutzereingabe wird NIE überschrieben', () => {
  const ref = alsMap([REF_OK, REF_DIESEL])
  const getippt = { ...EMPTY_FORM, preisBenzin: '1,99' }
  const f = uebernehmeReferenz(getippt, ref)
  assert.equal(f.preisBenzin, '1,99')
  assert.equal(f.preisDiesel, alsFeldwert(2.457))   // leeres Feld darf gefüllt werden
})

test('Referenz: veralteter Stand wird angezeigt, aber nicht ins Feld übernommen', () => {
  const alt = { ...REF_OK, status: 'veraltet' as const, quelle_datum: '2026-05-04' }
  const ref = alsMap([alt])
  assert.equal(uebernehmeReferenz(EMPTY_FORM, ref), EMPTY_FORM)   // unverändert
  assert.match(referenzLabel(alt)!, /Älterer Stand: 04\.05\.2026/)
  assert.doesNotMatch(referenzLabel(alt)!, /Deutschland-Referenz ·/)
})

test('Referenz: Ersatzwert wird als nicht amtlich gekennzeichnet', () => {
  const fb = { ...REF_OK, status: 'fallback' as const, quelle: 'ENFAL-Konfiguration (Ersatzwert)',
    quelle_datum: null }
  assert.match(referenzLabel(fb)!, /Ersatzwert \(nicht amtlich\)/)
  assert.equal(uebernehmeReferenz(EMPTY_FORM, alsMap([fb])), EMPTY_FORM)
})

test('Referenz: ohne Wert bleibt das Feld leer und editierbar', () => {
  const leer = { ...REF_OK, preis: null, status: 'nicht_verfuegbar' as const, quelle_datum: null }
  assert.equal(referenzLabel(leer), null)
  assert.equal(uebernehmeReferenz(EMPTY_FORM, alsMap([leer])), EMPTY_FORM)
})

test('Referenz: Benzin und Diesel werden getrennt gehalten, Elektro hat keine', () => {
  const ref = alsMap([REF_OK, REF_DIESEL])
  assert.equal(referenzFuer('benzin', ref)?.preis, 2.348)
  assert.equal(referenzFuer('diesel', ref)?.preis, 2.457)
  assert.equal(referenzFuer('elektro', ref), undefined)
})

test('Referenz: Strompreis-UX gibt keinen "aktuellen" Ladepreis vor', () => {
  assert.match(viewSrc, /Strompreis \/ dein Ladepreis/)
  assert.match(viewSrc, /Heimladen und öffentliches\s*\n?\s*Schnellladen können stark abweichen/)
  assert.doesNotMatch(refSrc, /elektro.*preis|strompreis/i)
})

test('§10: die veralteten Platzhalter 1,75 / 1,65 stehen nirgends mehr als Vorgabewert', () => {
  assert.equal(BEISPIEL_FORM.preisBenzin, '')
  assert.equal(BEISPIEL_FORM.preisDiesel, '')
  assert.equal(BEISPIEL_FORM.preisStrom, '')
  assert.doesNotMatch(viewSrc, /placeholder="1,75"/)
  assert.doesNotMatch(viewSrc, /placeholder="1,65"/)
  assert.doesNotMatch(viewSrc, /placeholder="0,35"/)
})

// ══════════════════════════════════════════════════════════════════════════
// §17/§22/§31 — BEISPIELDATEN, KOSTENLOS, KEINE KI-PROVIDER
// ══════════════════════════════════════════════════════════════════════════
test('Beispieldaten: sind valide gerechnet, sobald ein Energiepreis vorliegt', () => {
  // Ohne Energiepreis fehlt bewusst genau dieses eine Feld …
  const fehler = validate(BEISPIEL_FORM)
  assert.deepEqual(fehler.map((f) => f.feld), ['preisBenzin'])
  // … mit Preis rechnet der Beispieldatensatz sauber durch.
  const mitPreis = { ...BEISPIEL_FORM, preisBenzin: '2,35' }
  assert.deepEqual(validate(mitPreis), [])
  const e = berechne(mitPreis)
  assert.ok(e.wirtschaftlichMonat > 0 && Number.isFinite(e.wirtschaftlichMonat))
})
test('Beispieldaten: werden in der Oberfläche als solche gekennzeichnet', () => {
  assert.match(viewSrc, /Beispieldaten/)
  assert.match(viewSrc, /keine Marktdurchschnitte/)
  assert.match(viewSrc, /Mit Beispielwerten füllen/)
  assert.match(viewSrc, /Zurücksetzen/)
})

test('L: der Rechenkern ist netzfrei — der einzige Request ist die Kraftstoffreferenz', () => {
  const codeOnly = (s: string) => s.replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '')
  // logic.ts: keinerlei Netz, kein api-client
  assert.doesNotMatch(codeOnly(logicSrc), /\bfetch\s*\(/)
  assert.doesNotMatch(logicSrc, /from ['"][^'"]*\/api\/client['"]/)
  // Ergebnisansicht (inkl. Simulator und Vergleich): ebenfalls kein Request
  assert.doesNotMatch(codeOnly(ergebnisSrc), /\bfetch\s*\(/)
  assert.doesNotMatch(ergebnisSrc, /from ['"][^'"]*\/api\/client['"]/)
  // View: genau EIN erlaubter Aufruf, und zwar die Referenz
  const viewCode = codeOnly(viewSrc)
  assert.doesNotMatch(viewCode, /\bfetch\s*\(/)
  const apiAufrufe = viewCode.match(/api[A-Z]\w+\(/g) ?? []
  assert.deepEqual([...new Set(apiAufrufe)], ['apiKraftstoffReferenz('])
  // Keine KI-/Search-Provider irgendwo im Autokosten-Pfad
  for (const src of [codeOnly(logicSrc), codeOnly(viewSrc), codeOnly(ergebnisSrc), codeOnly(refSrc)]) {
    assert.doesNotMatch(src, /call_gemini|apiAutoFinder|apiKaufCheck|apiVerkaufsCheck|tavily|carapi/i)
  }
})

test('§22: die Berechnung hängt nicht am Referenz-Abruf (Tool bleibt nutzbar)', () => {
  // Der Abruf ist rein additiv: Fehler werden verschluckt, das Formular bleibt.
  assert.match(viewSrc, /\.catch\(\(\) => \{ \/\* ohne Referenz weiterrechnen \*\/ \}\)/)
  // Kein Login-Zwang, kein Kontingent, keine Bezahlschranke im Rechner
  assert.doesNotMatch(viewSrc, /PaymentRequired|PurchaseGate|useAuth|require/i)
})

test('§21: die ENFAL-Wege stehen UNTER dem Ergebnis, nicht davor', () => {
  assert.match(ergebnisSrc, /KaufCheck starten/)
  assert.match(ergebnisSrc, /VerkaufsCheck starten/)
  const heroPos = ergebnisSrc.indexOf('<Hero e={ergebnis} />')
  const wegePos = ergebnisSrc.indexOf('<Wege />')
  assert.ok(heroPos > -1 && wegePos > heroPos, 'CTAs erst nach dem Ergebnis')
  // Keine erfundenen Plus-Funktionen
  assert.doesNotMatch(ergebnisSrc, /ENFAL Plus/)
})

// ── K) localStorage Restore ────────────────────────────────────────────────
test('K: Form wird gespeichert und beim Reload wiederhergestellt', () => {
  fakeStorage()
  loescheForm()
  assert.equal(ladeForm(), null)
  const f = form({ ...BASIS, kraftstoff: 'diesel', verbrauch: '5,2', budgetMonat: '400' })
  speichereForm(f)
  const wieder = ladeForm()
  assert.ok(wieder)
  assert.equal(wieder!.kraftstoff, 'diesel')
  assert.equal(wieder!.verbrauch, '5,2')
  assert.equal(wieder!.kmProJahr, '15000')
  assert.equal(wieder!.budgetMonat, '400')
  loescheForm()
  assert.equal(ladeForm(), null)
})
test('K2: die View stellt die letzte Berechnung beim Mount wieder her', () => {
  assert.match(viewSrc, /const gespeichert = ladeForm\(\)/)
  assert.match(viewSrc, /if \(validate\(gespeichert\)\.length === 0\) setErgebnis\(berechne\(gespeichert\)\)/)
  assert.match(viewSrc, /speichereForm\(form\)/)
})

// ── §23 Ergebnisstruktur ───────────────────────────────────────────────────
test('§23: Ergebnis folgt der geforderten Reihenfolge', () => {
  const reihenfolge = ['<Hero', '<Budget', '<Projektion', '<Aufschluesselung', '<Kostenarten',
    '<WasWaereWenn', '<Vergleich', '<Wege']
  let letzte = -1
  for (const marke of reihenfolge) {
    const pos = ergebnisSrc.lastIndexOf(marke)
    assert.ok(pos > letzte, `${marke} steht an der falschen Stelle`)
    letzte = pos
  }
})
test('§3: Hero zeigt Monat, Jahr, km und die 1/3/5-Jahres-Sicht mit Annahme-Hinweis', () => {
  assert.match(ergebnisSrc, /Pro Monat/)
  assert.match(ergebnisSrc, /Pro Jahr/)
  assert.match(ergebnisSrc, /Pro Kilometer/)
  assert.match(ergebnisSrc, /Bei gleichbleibenden Annahmen/)
  // Gross-/Kleinschreibung offen: geprueft wird die ZUSAGE (keine Prognose),
  // nicht die Zeichensetzung davor. Der Satz begann frueher nach einem
  // Gedankenstrich klein und beginnt jetzt nach einem Punkt gross.
  assert.match(ergebnisSrc, /keine Prognose von Kraftstoffpreisen/i)
  assert.match(ergebnisSrc, /Kaufpreis ist hier nicht zusätzlich enthalten/)
})
test('§2: die Erklärung zu Monatsanteilen und Wertverlust steht in der Oberfläche', () => {
  assert.match(ergebnisSrc, /rechnerische\s+Monatsanteile, keine tatsächliche monatliche Abbuchung/)
  assert.match(ergebnisSrc, /Wertverlust ist ein wirtschaftlicher\s+Aufwand, kein Kontoabgang/)
})

// ══════════════════════════════════════════════════════════════════════════
// AK-01 bis AK-03
// ══════════════════════════════════════════════════════════════════════════
const KONTROLL = form({ ...EMPTY_FORM, kmProJahr: '8000', verbrauch: '10', preisBenzin: '1,50', versicherungJahr: '1200',
  steuerJahr: '240', wartungJahr: '600', reifenJahr: '360', garageMonat: '50', wertverlustJahr: '2400',
  budgetMonat: '600', kaufpreis: '20000' })

test('AK-02: die Finanzierungsrate ist aus Formular, Berechnung, Ergebnis, Vergleich und Demo entfernt', () => {
  const showcaseSrc = readFileSync(join(here, '..', 'landing', 'showcase.ts'), 'utf8')
  const code = (src: string) => src.replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '')
  for (const [name, src] of [['logic', logicSrc], ['view', viewSrc], ['ergebnis', ergebnisSrc], ['showcase', showcaseSrc]] as const) {
    assert.doesNotMatch(code(src), /finanzier|kredit|leasing|zins|tilgung|\bRate\b|Raten/i, `${name}: Finanzierungsbezug übrig`)
  }
  assert.equal('finanzierungMonat' in EMPTY_FORM, false)
  assert.equal('finanzierungMonat' in BEISPIEL_FORM, false)
  assert.equal(validate({ ...KONTROLL, finanzierungMonat: 'abc' } as unknown as AutokostenForm).length, 0)  // Alt-Schlüssel wird nicht geprüft
})

test('AK-02: alter Speicherstand mit Rate — gleiche Rechnung, übrige Angaben erhalten, Rate nach dem Speichern entfernt', () => {
  const store = fakeStorage()
  const alt = { ...KONTROLL, finanzierungMonat: '350' }
  store['vira.autokosten.form'] = JSON.stringify(alt)                 // so lag er früher im localStorage
  const geladen = ladeForm()!
  assert.equal('finanzierungMonat' in geladen, false)                 // keine Wiederanzeige
  assert.equal(geladen.kmProJahr, '8000')                             // übrige Angaben bleiben
  assert.equal(geladen.wartungJahr, '600')
  assert.equal(geladen.budgetMonat, '600')
  const e = berechne(geladen), ohne = berechne(KONTROLL)
  assert.deepEqual(e, ohne)                                           // keine Weiterberechnung
  assert.ok(nahe(e.laufendeCashMonat, 350))                           // nicht 700
  speichereForm(geladen)
  assert.equal('finanzierungMonat' in JSON.parse(store['vira.autokosten.form']), false)
  assert.equal(JSON.parse(store['vira.autokosten.form']).kmProJahr, '8000')
  // kein pauschales Löschen: ein fremder Schlüssel bleibt unberührt
  store['anderer.schluessel'] = 'bleibt'
  speichereForm(geladen)
  assert.equal(store['anderer.schluessel'], 'bleibt')
})

test('AK-02: Beschriftungen — beide Kostengrößen unabhängig sichtbar, Budgetfeld als Monatsbudget für laufende Ausgaben', () => {
  assert.match(ergebnisSrc, /Laufende Ausgaben im Monatsdurchschnitt/)
  assert.match(ergebnisSrc, /Wirtschaftliche Kosten inklusive Wertverlust/)
  assert.match(ergebnisSrc, /<Kostenarten e=\{ergebnis\} \/>/)
  assert.doesNotMatch(ergebnisSrc, /if \(!e\.hat/)                    // Abschnitt hängt an keiner Bedingung mehr
  assert.match(viewSrc, /Dein Monatsbudget für laufende Ausgaben/)
  assert.doesNotMatch(viewSrc, /Dein maximales Autobudget/)
  assert.match(ergebnisSrc, /keine tatsächliche monatliche Abbuchung/)
})

test('AK-03: Versicherung/Steuer/Wartung/Reifen — ausgefüllt, leer und ausdrücklich 0', () => {
  const felder = [['versicherungJahr', 1200, 'Versicherung'], ['steuerJahr', 240, 'Kfz-Steuer'],
    ['wartungJahr', 600, 'Wartung / Inspektion'], ['reifenJahr', 360, 'Reifen']] as const
  const vollMonat = berechne(KONTROLL).wirtschaftlichMonat
  for (const [feld, wert, label] of felder) {
    const leer = form({ ...KONTROLL, [feld]: '' })
    const null0 = form({ ...KONTROLL, [feld]: '0' })
    assert.deepEqual(validate(leer), []); assert.deepEqual(validate(null0), [])      // beides gültig
    const el = berechne(leer), en = berechne(null0)
    assert.ok(nahe(el.wirtschaftlichMonat, vollMonat - wert / 12))                     // keine erfundenen Kosten
    assert.ok(nahe(en.wirtschaftlichMonat, el.wirtschaftlichMonat))                    // gleiche Rechnung ...
    assert.deepEqual(el.fehlendLaufend, [label]); assert.equal(el.laufendUnvollstaendig, true)   // ... leer ist FEHLEND
    assert.deepEqual(en.fehlendLaufend, []); assert.equal(en.laufendUnvollstaendig, false)       // 0 ist eine Angabe
  }
  assert.deepEqual(fehlendeLaufendeAngaben(form({ ...KONTROLL, versicherungJahr: '', reifenJahr: '' })), ['Versicherung', 'Reifen'])
})

test('AK-03: Budget bei fehlenden laufenden Kosten — kein uneingeschränktes "unter Budget"', () => {
  const f = form({ ...KONTROLL, wartungJahr: '', reifenJahr: '' })        // laufend bekannt: 4200 - 960 = 3240 -> 270 €/Monat
  const b = budgetCheck(berechne(f), f)!
  assert.equal(b.unvollstaendig, true)
  assert.equal(b.status, 'offen')
  assert.deepEqual(b.fehlend, ['Wartung / Inspektion', 'Reifen'])
  assert.match(b.text, /Zwischensumme/)
  assert.match(b.text, /Es fehlen: Wartung \/ Inspektion, Reifen\./)
  assert.doesNotMatch(b.text, /liegen im Monatsdurchschnitt etwa [\d.,]+ € unter deinem Monatsbudget\./)
  // Liegen schon die bekannten Ausgaben über dem Budget, darf das eingeschränkt gesagt werden.
  const knapp = form({ ...f, budgetMonat: '200' })
  const bk = budgetCheck(berechne(knapp), knapp)!
  assert.equal(bk.status, 'ueber')
  assert.match(bk.text, /Schon die bekannten laufenden Ausgaben liegen/)
  assert.match(bk.text, /Zwischensumme/)
})

test('AK-03: fehlender Wertverlust ist getrennt von fehlenden laufenden Kosten', () => {
  const nurWertverlust = berechne(form({ ...KONTROLL, wertverlustJahr: '' }))
  assert.equal(nurWertverlust.laufendUnvollstaendig, false)               // laufende Ausgaben vollständig
  assert.equal(nurWertverlust.wirtschaftlichUnvollstaendig, true)         // wirtschaftliche Gesamtsicht nicht
  assert.equal(nurWertverlust.hatWertverlust, false)
  const f = form({ ...KONTROLL, wertverlustJahr: '' })
  const b = budgetCheck(berechne(f), f)!
  assert.equal(b.status, 'unter')                                          // laufend vollständig -> klare Aussage
  assert.equal(b.unvollstaendig, false)
  const nurLaufend = berechne(form({ ...KONTROLL, steuerJahr: '' }))
  assert.equal(nurLaufend.laufendUnvollstaendig, true)
  assert.equal(nurLaufend.hatWertverlust, true)
  assert.match(ergebnisSrc, /deine laufenden Ausgaben sind davon nicht betroffen/)
})

test('AK-01/05: kaufpreis-relation — vollständiger Satz, richtige Rechengröße, Zwischensumme bei Lücken', () => {
  const text = (f: AutokostenForm) => baueInsights(berechne(f), f).find((i) => i.key === 'kaufpreis-relation')!.text.replace(/ /g, ' ')
  const voll = text(KONTROLL)                                              // 6600 x 5 = 33000 = 1,7 x 20000
  assert.equal(voll, 'Bei gleichbleibenden Annahmen summieren sich die wirtschaftlichen Kosten inklusive Wertverlust in '
    + 'fünf Jahren auf 33.000,00 €. Das ist das 1,7-fache des Kaufpreises.')
  assert.doesNotMatch(voll, /laufenden Kosten/)
  assert.doesNotMatch(voll, /\. das /)                                    // kein Satzanfang in Kleinschreibung
  const ohneWert = text(form({ ...KONTROLL, wertverlustJahr: '' }))        // 4200 x 5 = 21000
  assert.match(ohneWert, /bisher erfassten Kosten/); assert.match(ohneWert, /Zwischensumme, keine vollständigen wirtschaftlichen Gesamtkosten/)
  assert.doesNotMatch(ohneWert, /inklusive Wertverlust/)
  const luecke = text(form({ ...KONTROLL, steuerJahr: '' }))
  assert.match(luecke, /Zwischensumme/)
  const einsichten = baueInsights(berechne(form({ ...KONTROLL, wertverlustJahr: '' })), KONTROLL)
  assert.ok(einsichten.some((i) => i.key === 'kein-wertverlust' && /fehlt die wirtschaftliche Gesamtsicht/.test(i.text)))
  assert.match(ergebnisSrc, /Bei gleichbleibenden Annahmen/)               // Hinweis zur konstanten Hochrechnung bleibt
})

test('AK-03: Simulator und A/B-Vergleich behalten die Unterscheidung leer / 0', () => {
  // Simulator: derselbe Rechenkern, die Zwischensumme wird angezeigt
  const sim = berechne(form({ ...KONTROLL, versicherungJahr: '' }))
  assert.equal(sim.laufendUnvollstaendig, true)
  assert.match(ergebnisSrc, /simErgebnis\.wirtschaftlichUnvollstaendig \? ' \(Zwischensumme\)'/)
  assert.match(ergebnisSrc, /simErgebnis\.laufendUnvollstaendig/)
  // Vergleich: Auto B startet ohne Fixkosten -> fehlend, nicht 0
  const b0 = berechne({ ...starteVergleich(KONTROLL), verbrauch: '6', preisBenzin: '1,50' })
  assert.deepEqual(b0.fehlendLaufend, ['Versicherung', 'Kfz-Steuer', 'Wartung / Inspektion', 'Reifen'])
  const b1 = berechne({ ...starteVergleich(KONTROLL), verbrauch: '6', preisBenzin: '1,50', versicherungJahr: '0',
    steuerJahr: '0', wartungJahr: '0', reifenJahr: '0' })
  assert.deepEqual(b1.fehlendLaufend, [])
  assert.match(ergebnisSrc, /a\.wirtschaftlichUnvollstaendig \|\| b\.wirtschaftlichUnvollstaendig/)
  assert.match(ergebnisSrc, /Zwischensumme, nicht vollständig vergleichbar/)
  assert.match(ergebnisSrc, /trage 0 ausdrücklich ein/)
})

test('AK-03: das Formular erklärt leer gegenüber 0 und erfindet nichts', () => {
  assert.match(viewSrc, /Leere Felder gelten als nicht angegeben/)
  assert.match(viewSrc, /trage ausdrücklich 0 ein/)
  assert.equal(BEISPIEL_FORM.garageMonat, '')                               // Demo setzt keine Zusatzwerte
})
