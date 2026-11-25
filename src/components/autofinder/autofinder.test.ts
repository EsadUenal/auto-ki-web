// AutoFinder-Frontend-Tests. Kein Test-Framework im Repo (siehe AGENTS.md) —
// wir nutzen den in Node 20+/24 eingebauten Test-Runner ohne neue Dependency:
//
//     npm run test:autofinder      (== node --test …/autofinder.test.ts)
//
// Node 24 strippt TS-Typen nativ. Reine Logik wird direkt geprüft; für die
// render-/verdrahtungsnahen Punkte (Route, Form, Loading, Expand, Responsive)
// wird die Quelldatei strukturell geprüft — dasselbe Muster wie im Backend
// (test_autofinder_generation.py Matrix O).

import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

import {
  buildPayload,
  validateForm,
  hatKriterium,
  LEERE_SUCHE_HINWEIS,
  EMPTY_FORM,
  marketplaceFilters,
  coverageState,
  humanError,
  formatPriceRange,
  buildKaufCheckPrefill,
  sucheLabel,
  MAX_CARDS,
  KAUFCHECK_ROUTE,
  budgetChipText,
  baujahrAnzeige,
  kraftstoffAnzeige,
  kraftstoffKurz,
  kraftstoffAusPrefill,
  stageKaufCheckPrefill,
  motorzeitraumHinweis,
  MOTORZEITRAUM_HINWEIS,
  kiKennzeichnung,
  kartenZusammenfassung,
  type AutoFinderForm,
  type AutoFinderKandidat,
  type AutoFinderResponse,
} from './logic.ts'

const here = dirname(fileURLToPath(import.meta.url))
const read = (p: string) => readFileSync(join(here, p), 'utf8')
const appTsx = readFileSync(join(here, '..', '..', 'App.tsx'), 'utf8')
const viewTsx = read('AutoFinderView.tsx')
const cardTsx = read('ResultCard.tsx')
const clientTs = readFileSync(join(here, '..', '..', 'api', 'client.ts'), 'utf8')

function form(over: Partial<AutoFinderForm> = {}): AutoFinderForm {
  return { ...EMPTY_FORM, ...over }
}

const KAND: AutoFinderKandidat = {
  candidate_id: 'bmw-3er-g20-320d',
  baureihe_id: 'bmw-3er-g20', variante_id: 'bmw-3er-g20-320d',
  marke: 'BMW', modell: '3er', generation: 'G20', motor: '320d', motor_hergeleitet: false,
  baujahr_von: 2019, baujahr_bis: 2024, leistung_ps: 190, kraftstoff: 'Diesel',
  generation_baujahr_von: 2019, generation_baujahr_bis: 2024,
  getriebe: ['automatik'], getriebe_verfuegbar: ['automatik', 'manuell'],
  getriebe_konkret: true,
  antrieb: 'Heck', karosserie: ['limousine'],
  karosserie_verfuegbar: ['kombi', 'limousine'], karosserie_konkret: true,
  karosserie_quelle: 'nutzerwunsch',
  match_score: 9, datenqualitaet: 1, match_gruende: ['Diesel eignet sich für Langstrecke'],
  trade_offs: ['1 verifizierter KBA-Rückruf bekannt'],
  budget_status: 'UNKNOWN', budget_confidence: 'UNKNOWN', base_match_score: 9, budget_adjustment: 0,
  source_type: 'internal_db', visual_key: 'bmw--3er--g20',
  source_urls: [], evidence_count: 0, discovery_confidence: 'UNKNOWN', web_verified_fields: [],
  market_price_min: null, market_price_max: null, market_price_median: null,
  market_data_quality: null, market_sample_size: null,
  image_url: '/cars/autofinder/fallback/limousine.webp',
  image_type: 'generic_fallback', image_confidence: 'representative', ai_generated: false,
  user_fit: 91, user_fit_gruende: ['Nutzung: langstrecke', 'Sparsam'],
  why_fits: ['Sparsamer Diesel passt zur Langstrecke', 'Automatik wie gewünscht', 'Kombi-Alltag'],
  known_points: ['Bei frühen G20 Steuerkettenthema beachten'],
  enrichment_status: 'ok',
  estimated_price_min: 15000, estimated_price_max: 22000, price_confidence: 'MEDIUM',
}
const resp = (over: Partial<AutoFinderResponse> = {}): AutoFinderResponse => ({
  status: 'ok', kandidaten: [KAND], total_candidates_considered: 12,
  filters_applied: {}, warnings: [], data_scope_hint: '416 Baureihen',
  enrichment_notice: null, ...over,
})

// ── A) Öffentliche Route in der geteilten App-Shell, ohne Auth-Guard ─────────
test('A: /autofinder ist registriert, in der App-Shell und OHNE <Guard>', () => {
  assert.match(appTsx, /path="\/autofinder"/)
  // Die AutoFinder-Route rendert direkt <AutoFinderView />, nicht in <Guard> gewickelt.
  assert.match(appTsx, /path="\/autofinder" element=\{<AutoFinderView \/>\}/)
  // Die Shell (AppContent) hängt NICHT mehr unter einem Blanket-Auth-Wrapper.
  assert.match(appTsx, /path="\/\*" element=\{<AppContent \/>\}/)
  assert.doesNotMatch(appTsx, /<PrivateRoute>/)
})

test('A2: geschützte Routen behalten den <Guard>', () => {
  // /kaufcheck und /verkaufscheck müssen weiterhin hinter <Guard> liegen.
  for (const path of ['/chat', '/kaufcheck', '/verkaufscheck', '/entdecken', '/ersatzteile', '/pricing']) {
    const re = new RegExp(`path="${path.replace('/', '\\/')}"[\\s\\S]{0,120}?<Guard`)
    assert.match(appTsx, re, `${path} ohne <Guard>`)
  }
  // Der Guard leitet unangemeldete Nutzer auf /login.
  assert.match(appTsx, /Navigate to="\/login" replace/)
})

// ── B) Formular rendert (strukturell) ───────────────────────────────────────
test('B: View rendert ein Formular mit den vier Gruppen + CTA', () => {
  assert.match(viewTsx, /<form onSubmit={submit}/)
  assert.match(viewTsx, /Budget/)
  assert.match(viewTsx, /Fahrzeug/)
  assert.match(viewTsx, /Nutzung/)
  assert.match(viewTsx, /Was ist dir wichtig\?/)
  assert.match(viewTsx, /Autos für mich finden/)
})

// ── C) Request-Payload entspricht dem Backend-Contract ──────────────────────
test('C: leeres Formular -> leerer Payload (Backend-Defaults greifen)', () => {
  assert.deepEqual(buildPayload(EMPTY_FORM), {})
})
test('C: Felder werden korrekt gemappt und getypt', () => {
  const p = buildPayload(form({
    budget_min: '10.000', budget_max: '25000', baujahr_von: '2018',
    leistung_min_ps: '120', nutzung: 'langstrecke', km_pro_jahr: '30000',
    karosserie: ['kombi'], kraftstoff: ['Diesel'], getriebe: ['automatik'], antrieb: ['Allrad'],
    marken_bevorzugt: 'BMW, Audi', marken_ausschliessen: 'Tesla',
    sparsam: true, praktisch: true,
  }))
  assert.deepEqual(p, {
    budget_min: 10000, budget_max: 25000, baujahr_von: 2018,
    leistung_min_ps: 120, nutzung: 'langstrecke', km_pro_jahr: 30000,
    karosserie: ['kombi'], kraftstoff: ['Diesel'], getriebe: ['automatik'], antrieb: ['Allrad'],
    marken_bevorzugt: ['BMW', 'Audi'], marken_ausschliessen: ['Tesla'],
    sparsam: true, praktisch: true,
  })
})
test('C: nicht gesetzte Prioritäten / leere Listen werden weggelassen', () => {
  const p = buildPayload(form({ sportlich: false, karosserie: [] }))
  assert.ok(!('sportlich' in p))
  assert.ok(!('karosserie' in p))
})
test('C: der API-Client trifft genau den Endpunkt und schickt keinen Cookie', () => {
  assert.match(clientTs, /\/api\/v1\/autofinder/)
  const fn = clientTs.slice(clientTs.indexOf('export async function apiAutoFinder'))
  assert.doesNotMatch(fn.slice(0, 400), /credentials:\s*'include'/)
  assert.match(fn.slice(0, 400), /headers:\s*authHeaders\(\)/)
})

// ── C/validate) ─────────────────────────────────────────────────────────────
test('validate: min > max wird clientseitig abgefangen', () => {
  assert.match(validateForm(form({ budget_min: '30000', budget_max: '10000' }))!, /Mindestbudget/)
  assert.equal(validateForm(form({ budget_min: '10000', budget_max: '30000' })), null)
})

// ── RC1) leere Suche darf nicht abgeschickt werden ─────────────────────────
// Eine Suche ohne ein einziges auswertbares Kriterium kostet ein
// AutoFinder-Kontingent und einen Gemini-Aufruf, ohne etwas einzugrenzen.
// Das Backend weist sie mit 422 ab; hier wird sie gar nicht erst gestartet.
test('RC1: leeres Formular traegt kein Kriterium', () => {
  assert.equal(hatKriterium(EMPTY_FORM), false)
  assert.equal(validateForm(EMPTY_FORM), LEERE_SUCHE_HINWEIS)
})
test('RC1: leere Listen zaehlen nicht als Kriterium', () => {
  assert.equal(hatKriterium(form({ karosserie: [], kraftstoff: [], getriebe: [] })), false)
})
test('RC1: ein einziges Kriterium genuegt (nicht unnoetig streng)', () => {
  assert.equal(hatKriterium(form({ nutzung: 'gemischt' })), true)
  assert.equal(hatKriterium(form({ sparsam: true })), true)
  assert.equal(hatKriterium(form({ budget_max: '25000' })), true)
  assert.equal(validateForm(form({ nutzung: 'gemischt' })), null)
})

// ── RC1) Kilometerfilter ist restlos entfernt ──────────────────────────────
// Er hat die Auswahl nie eingeschraenkt (ENFAL hat dafuer keine Datenquelle),
// sah im Formular aber wie ein wirksamer Filter aus.
test('RC1: das Formular kennt kein kilometer_max mehr', () => {
  assert.ok(!('kilometer_max' in EMPTY_FORM))
})
test('RC1: der Payload kann kein kilometer_max mehr enthalten', () => {
  const p = buildPayload(form({ budget_max: '25000' })) as Record<string, unknown>
  assert.ok(!('kilometer_max' in p))
})
test('RC1: das Suchformular bietet kein Kilometerfeld mehr an', () => {
  assert.doesNotMatch(viewTsx, /kilometer_max/)
  assert.doesNotMatch(viewTsx, /Kilometerstand max\./)
})

// ── RC1) Karte zeigt die KONKRETE Variante, nicht das Baureihen-Aggregat ───
test('RC1: Suchhilfe uebernimmt genau die empfohlene Karosserie', () => {
  const f = marketplaceFilters(KAND)
  const typ = f.find((x) => x.label === 'Fahrzeugtyp')
  assert.equal(typ?.value, 'Limousine')
  const getr = f.find((x) => x.label === 'Getriebe')
  assert.equal(getr?.value, 'Automatik')
})
test('RC1: Suchhilfe nennt die fuer die Suche relevanten Baujahre (als Suchfenster des Nutzers, AF-03)', () => {
  const f = marketplaceFilters({ ...KAND, baujahr_von: 2020, baujahr_bis: 2022 })
  assert.equal(f.find((x) => x.label === 'Erstzulassung (dein Zeitraum)')?.value, '2020–2022')
})
test('RC1: der KaufCheck-Prefill traegt eine einzelne Karosserie', () => {
  assert.equal(buildKaufCheckPrefill(KAND).karosserie, 'limousine')
  assert.equal(buildKaufCheckPrefill(KAND).getriebe, 'Automatik')
})
test('RC1: die Karte behauptet keine fachliche Vollstaendigkeit mehr', () => {
  assert.doesNotMatch(cardTsx, /Datensatz, vollständig/)
  assert.match(cardTsx, /Kernfelder/)
})
test('RC1: die Karte macht die Herkunft der Karosserie-Zuordnung sichtbar', () => {
  assert.match(cardTsx, /karosserie_quelle/)
  assert.match(cardTsx, /nicht je Motor/)
})
test('RC1: die linke Fahrzeugflaeche traegt die volle Kartenhoehe', () => {
  // items-start liess sie an ihrer Inhaltshoehe enden -> weisser Block darunter.
  assert.doesNotMatch(cardTsx, /sm:items-start/)
  assert.match(cardTsx, /sm:items-stretch/)
})

// ── D) Loading-State + Fortschrittsschritte (§Punkt 7) ─────────────────────
test('D: View zeigt einen klaren Loading-/Analyse-State mit Workflow-Schritten', () => {
  assert.match(viewTsx, /Suche läuft/)
  assert.match(viewTsx, /animate-spin/)
  // die 5 Workflow-Schritte spiegeln den echten Ablauf grob wider
  assert.match(viewTsx, /Passende Fahrzeuge werden gefiltert/)
  assert.match(viewTsx, /Motorvarianten werden verglichen/)
  assert.match(viewTsx, /Stärken und mögliche Nachteile werden geprüft/)
  assert.match(viewTsx, /Preisorientierung wird eingeordnet/)
  // ehrliche Erwartungshaltung: 15–30 s
  assert.match(viewTsx, /15.?30 Sekunden/)
})

// ── E) Maximal 5 Karten ─────────────────────────────────────────────────────
test('E: MAX_CARDS == 5 und die View kappt hart darauf', () => {
  assert.equal(MAX_CARDS, 5)
  assert.match(viewTsx, /slice\(0,\s*MAX_CARDS\)/)
})

// ── F) Expand / Collapse ────────────────────────────────────────────────────
test('F: Karte ist auf-/zuklappbar', () => {
  assert.match(cardTsx, /useState\(false\)/)
  assert.match(cardTsx, /aria-expanded={open}/)
  assert.match(cardTsx, /Warum passt es\?/)
  assert.match(cardTsx, /Trade-offs/)
})

// ── G-T) Fahrzeugbilder: bewusst ENTFERNT ─────────────────────────────────
//
// PRODUKTENTSCHEIDUNG: AutoFinder zeigt keine modellgenauen Fahrzeugbilder
// mehr. Damit sind die frueheren Bildtests (Disclosure, On-Demand-Ensure,
// Image-Guarantee, Nachruecken bildloser Kandidaten) gegenstandslos — die
// zugehoerige Logik existiert nicht mehr. An ihrer Stelle stehen unten die
// Tests A-P der Vehicle-Identity-Runde: sie sichern zu, dass gar kein Bild
// mehr gerendert und kein Bild-Call mehr ausgeloest wird.


test('B: die ResultCard rendert KEIN <img> mehr (Vehicle Identity Panel statt Bild)', () => {
  assert.doesNotMatch(cardTsx, /<img/)
})

test('J: marketplaceFilters liefert eintippbare Werte, keine Links', () => {
  const f = marketplaceFilters(KAND)
  const labels = f.map((x) => x.label)
  assert.ok(labels.includes('Marke'))
  assert.ok(labels.includes('Modell'))
  assert.ok(labels.includes('Kraftstoff'))
  assert.ok(labels.includes('Getriebe'))
  const blob = JSON.stringify(f)
  assert.doesNotMatch(blob, /https?:\/\//)
  assert.doesNotMatch(blob, /mobile\.de|autoscout/i)
})

test('K: weder Payload noch Suchhilfe enthalten je einen Preis/€-Wert', () => {
  const f = marketplaceFilters({
    ...KAND, market_price_min: 15000, market_price_median: 20000, market_price_max: 25000,
  })
  const blob = JSON.stringify(f)
  assert.doesNotMatch(blob, /€|EUR|\bpreis/i)
  assert.ok(!f.some((x) => /price|preis/i.test(x.label)), 'kein Preis-Feld in der Suchhilfe')
  assert.doesNotMatch(blob, /15000|20000|25000/) // die Backend-Marktpreise tauchen nirgends auf
  assert.doesNotMatch(cardTsx, /market_price/)
  assert.doesNotMatch(viewTsx, /market_price/)
})

test('L: jede Karte hat eine KaufCheck-CTA, die das Formular vorbefüllt', () => {
  assert.equal(KAUFCHECK_ROUTE, '/kaufcheck')
  assert.match(cardTsx, /KaufCheck/)
  assert.match(cardTsx, /stageKaufCheckPrefill\(k\)/)
  assert.match(cardTsx, /navigate\(KAUFCHECK_ROUTE\)/)
  assert.doesNotMatch(cardTsx, /kaufcheck\?[a-z]/i) // keine Query-Parameter
})

test('L/M: buildKaufCheckPrefill übernimmt Marke/Modell/Generation/Motor/Baujahr/Leistung/Karosserie/IDs', () => {
  const pf = buildKaufCheckPrefill(KAND)
  assert.equal(pf.marke, 'BMW')
  assert.equal(pf.modell, '3er')
  assert.equal(pf.generation, 'G20')
  assert.equal(pf.motor, '320d')
  assert.equal(pf.baujahr, null)   // Beginn der Bauzeit/des Suchfensters ist kein bekanntes Baujahr (AF-03)
  assert.equal(pf.quelle, 'autofinder')
  assert.equal(pf.kraftstoff, 'Diesel')
  assert.equal(pf.leistung_ps, 190)
  assert.equal(pf.karosserie, 'limousine')
  assert.equal(pf.baureihe_id, 'bmw-3er-g20')
  assert.equal(pf.variante_id, 'bmw-3er-g20-320d')
})

test('BUG1: der CTA setzt returnTo=/kaufcheck (Rücksprung nach Login)', () => {
  const logic = read('logic.ts')
  assert.match(logic, /RETURN_TO_KEY = 'vira\.returnTo'/)
  assert.match(logic, /sessionStorage\.setItem\(RETURN_TO_KEY, KAUFCHECK_ROUTE\)/)
})

test('BUG1: der Guard merkt sich das Ziel vor dem Login-Redirect', () => {
  assert.match(appTsx, /setReturnTo\(location\.pathname/)
  assert.match(appTsx, /Navigate to="\/login" replace/)
})

test('BUG1: LoginView springt nach erfolgreichem Login zum returnTo (statt immer /chat)', () => {
  const lv = readFileSync(join(here, '..', 'LoginView.tsx'), 'utf8')
  assert.match(lv, /navigate\(takeReturnTo\(\) \?\? '\/chat'/)
  assert.doesNotMatch(lv, /navigate\('\/chat'\)\s*\n/)   // kein hartes navigate('/chat') mehr
})

test('BUG1: Prefill wird NUR gelesen, nicht beim CTA/Login/Redirect gelöscht', () => {
  const logic = read('logic.ts')
  // readKaufCheckPrefill enthält KEIN removeItem
  const readFn = logic.slice(logic.indexOf('export function readKaufCheckPrefill'), logic.indexOf('export function clearKaufCheckPrefill'))
  assert.doesNotMatch(readFn, /removeItem/)
  // clearKaufCheckPrefill ist eine eigene Funktion
  assert.match(logic, /export function clearKaufCheckPrefill\(\): void/)
})

test('O/BUG1: KaufCheckView übernimmt Prefill additiv + löscht erst NACH Übernahme (StrictMode-fest)', () => {
  const kc = readFileSync(join(here, '..', 'KaufCheckView.tsx'), 'utf8')
  assert.match(kc, /readKaufCheckPrefill\(\)/)
  assert.match(kc, /clearKaufCheckPrefill\(\)/)
  // Ref-Guard gegen doppelte Effekt-Ausführung (StrictMode würde sonst mit EMPTY überschreiben)
  assert.match(kc, /prefillDone = useRef\(false\)/)
  assert.match(kc, /prefillDone\.current = true[\s\S]{0,200}clearKaufCheckPrefill\(\)/)
  // erst LESEN, dann clearen (nicht in der Lesefunktion)
  assert.match(kc, /const pf = readKaufCheckPrefill\(\)[\s\S]{0,120}clearKaufCheckPrefill\(\)/)
  // KaufCheck-Kernlogik unverändert
  assert.match(kc, /runKaufCheck\(form, screenshot, retry\)/)
  assert.doesNotMatch(kc, /consumeKaufCheckPrefill/)
})

test('BUG1: KaufCheckView räumt das returnTo weg, wenn es das Prefill übernimmt (kein Altlast-Redirect)', () => {
  const kc = readFileSync(join(here, '..', 'KaufCheckView.tsx'), 'utf8')
  // im Prefill-Zweig wird takeReturnTo() aufgerufen (liest+entfernt)
  assert.match(kc, /clearKaufCheckPrefill\(\)\s*\n\s*takeReturnTo\(\)/)
})

test('M: View nutzt die kanonische ENFAL-Content-Sprache (wie Kauf-Check/Entdecken)', () => {
  // gleicher zentrierter Container wie die anderen Werkzeugseiten — seit dem
  // Sidebar-/Layout-Pass die gemeinsame, mitwachsende Breite `.ez-page`
  assert.match(viewTsx, /ez-page/)
  assert.match(viewTsx, /sm:/)
  assert.match(cardTsx, /sm:flex/)
  // kanonische Chrome-Bausteine
  assert.match(viewTsx, /h-full overflow-y-auto scrollbar-thin/)
  assert.match(viewTsx, /ez-rise/)
  assert.match(viewTsx, /ez-aurora/)
  assert.match(viewTsx, /ENFAL · AutoFinder/)
  // KEIN eigener Landingpage-Header mehr (Logo/Anmelden lebt in der Shell)
  assert.doesNotMatch(viewTsx, /<header/)
  assert.doesNotMatch(viewTsx, /\/logo\.svg/)
})

test('M2: Sidebar hat einen AutoFinder-Navigationseintrag', () => {
  const sidebar = readFileSync(join(here, '..', 'Sidebar.tsx'), 'utf8')
  assert.match(sidebar, /to: '\/autofinder'.*label: 'AutoFinder'/)
})

test('Fit: die Karte zeigt user_fit als Passungs-%, nicht mehr den internen Score', () => {
  assert.match(cardTsx, /\{k\.user_fit\}%/)
  assert.match(cardTsx, /Passung/)
  assert.doesNotMatch(cardTsx, /scorePercent/)
  assert.doesNotMatch(cardTsx, /match_score \/ 12/)
})

test('Fit: no_strong_match -> ehrlicher Zustand, keine Karten', () => {
  const c = coverageState(resp({ status: 'no_strong_match', kandidaten: [] }))
  assert.equal(c.kind, 'none')
  assert.match(c.detail, /80 ?%|richtig gut/)
})

test('Preis: formatPriceRange gibt Spanne + KI-Hinweis, nie "Marktpreis"', () => {
  const p = formatPriceRange(KAND)!
  assert.match(p.range, /ca\. 15\.000–22\.000 €/)
  assert.match(p.hint, /KI-Schätzung/)
  assert.match(p.hint, /keine Live-Marktdaten/)
  assert.doesNotMatch(p.hint, /Marktpreis|Marktwert/)
})

test('Preis: keine Range -> null (nichts erfinden)', () => {
  assert.equal(formatPriceRange({ ...KAND, estimated_price_min: null, estimated_price_max: null }), null)
})

test('Preis: die Karte behauptet nirgends einen echten Marktpreis/Marktwert', () => {
  // Ein Disclaimer "nennt keinen Marktpreis" ist erlaubt; eine BEHAUPTUNG nicht.
  assert.doesNotMatch(cardTsx, /Marktwert|aktueller (Markt)?[Pp]reis|mobile\.de[- ]?Preis|Marktpreis:\s*\d/)
  assert.match(cardTsx, /Preisorientierung/)
  assert.match(cardTsx, /keinen Marktpreis/)  // der Disclaimer
})

test('Content: die Karte rendert why_fits, trade_offs und known_points', () => {
  assert.match(cardTsx, /k\.why_fits\.map/)
  // trade_offs werden seit AF-02 nach Herkunft getrennt gerendert; kein Eintrag geht verloren
  // (Vollstaendigkeit der Aufteilung: Test 'AF-02: Aufteilung verliert keinen Trade-off').
  assert.match(cardTsx, /ki\.tradeOffsOhneKi\.map/)
  assert.match(cardTsx, /ki\.tradeOffsKi\.map/)
  assert.match(cardTsx, /k\.known_points\.map/)
})

test('Content: "(ungeprüft)" kommt im Consumer-UI nicht vor (Backend strippt, Frontend erfindet nichts)', () => {
  assert.doesNotMatch(cardTsx, /ungeprüft/)
  assert.doesNotMatch(viewTsx, /ungeprüft/)
})

test('Content: enrichment_notice wird angezeigt, wenn gesetzt', () => {
  assert.match(viewTsx, /enrichment_notice/)
  assert.match(viewTsx, /\{notice\}/)
})




// ── Suchhistorie (§Punkt 5 / BUG 2) ──────────────────────────────────────
import {
  ladeSuchen, speichereSuche, loescheSuchen, findeSuche,
  stageSucheRestore, takeSucheRestore, HISTORY_SIDEBAR_MAX,
} from './logic.ts'

function fakeStorage() {
  const store: Record<string, string> = {}
  const api = {
    getItem: (k: string) => (k in store ? store[k] : null),
    setItem: (k: string, v: string) => { store[k] = String(v) },
    removeItem: (k: string) => { delete store[k] },
  }
  ;(globalThis as Record<string, unknown>).localStorage = api
  ;(globalThis as Record<string, unknown>).sessionStorage = { ...api }
  if (!(globalThis as Record<string, unknown>).window) {
    ;(globalThis as Record<string, unknown>).window = { dispatchEvent: () => true, addEventListener: () => {}, removeEventListener: () => {} }
  }
  return store
}

test('History J/Q: speichern, max 20 im localStorage', () => {
  fakeStorage()
  loescheSuchen()
  assert.deepEqual(ladeSuchen(), [])
  const after1 = speichereSuche(form({ karosserie: ['kombi'], kraftstoff: ['Benzin'], budget_max: '25000' }), resp())
  assert.equal(after1.length, 1)
  assert.match(after1[0].label, /Kombi/)
  for (let i = 0; i < 30; i++) speichereSuche(form({ marken_bevorzugt: `M${i}` }), resp())
  assert.ok(ladeSuchen().length <= 20, 'max 20')
})
test('History G/R: Reload -> Eintrag bleibt (localStorage-Persistenz)', () => {
  fakeStorage()
  loescheSuchen()
  speichereSuche(form({ karosserie: ['suv'] }), resp())
  assert.equal(ladeSuchen().length, 1)   // "Reload" = erneutes ladeSuchen()
})
test('History H/S: Restore stellt die vollständige Form wieder her + volle Response ist dabei', () => {
  fakeStorage()
  loescheSuchen()
  const f1 = form({ karosserie: ['kombi'], kraftstoff: ['Benzin'], budget_max: '25000' })
  const [s] = speichereSuche(f1, resp())
  assert.deepEqual(Object.keys(s.form).sort(), Object.keys(EMPTY_FORM).sort())
  assert.ok(s.response, 'die vollständige Antwort ist eingebettet -> Öffnen ohne neuen Gemini-Call')
  assert.equal(s.response!.kandidaten[0].user_fit, 91)
  // stage -> take (Sidebar -> AutoFinder-Seite)
  stageSucheRestore(s.id)
  const wieder = takeSucheRestore()
  assert.equal(wieder?.id, s.id)
  assert.equal(takeSucheRestore(), null, 'nur einmal')
  assert.equal(findeSuche(s.id)?.label, s.label)
})
test('History I: Sidebar-Limit ist 5', () => {
  assert.equal(HISTORY_SIDEBAR_MAX, 5)
  const sidebar = readFileSync(join(here, '..', 'Sidebar.tsx'), 'utf8')
  assert.match(sidebar, /\.slice\(0, HISTORY_SIDEBAR_MAX\)/)
})
test('History F/K: Sidebar zeigt AutoFinder-Suchen + Löschen aktualisiert sofort (Event)', () => {
  const sidebar = readFileSync(join(here, '..', 'Sidebar.tsx'), 'utf8')
  assert.match(sidebar, /AutoFinder/)                       // eigener Sidebar-Bereich
  assert.match(sidebar, /ladeSuchen\(\)/)
  assert.match(sidebar, /HISTORY_EVENT, refresh/)           // reagiert sofort
  assert.match(sidebar, /loescheSuchen\(\)/)                // Löschen-Button
  assert.match(sidebar, /stageSucheRestore\(s\.id\)[\s\S]{0,80}navigate\('\/autofinder'\)/)
  const logic = read('logic.ts')
  assert.match(logic, /fireHistoryEvent\(\)/)               // speichern + löschen feuern das Event
})

// ── FIX 1: KaufCheck- / VerkaufsCheck-Historie in der kanonischen Sidebar ────
const sidebarSrc = () => readFileSync(join(here, '..', 'Sidebar.tsx'), 'utf8')
test('Sidebar A: AutoFinder-Historie-Bereich bleibt vorhanden', () => {
  assert.match(sidebarSrc(), /<Car size=\{11\} \/> AutoFinder/)
})
test('Sidebar B: eigener Kauf-Check-Historie-Bereich (aus der bestehenden checks-Liste)', () => {
  const s = sidebarSrc()
  assert.match(s, /renderCheckSection\('KaufCheck', ShoppingCart, 'text-blue-400', kaufChecks, 'kauf'\)/)
  assert.match(s, /const kaufChecks = checks\.filter\(\(c\) => c\.typ === 'kauf'\)\.slice\(0, HISTORY_SIDEBAR_MAX\)/)
})
test('Sidebar C: eigener Verkaufs-Check-Historie-Bereich', () => {
  const s = sidebarSrc()
  assert.match(s, /renderCheckSection\('VerkaufsCheck', TrendingUp, 'text-green-400', verkaufChecks, 'verkauf'\)/)
  assert.match(s, /const verkaufChecks = checks\.filter\(\(c\) => c\.typ === 'verkauf'\)\.slice\(0, HISTORY_SIDEBAR_MAX\)/)
})
test('Sidebar D: max. 5 Einträge je Bereich (HISTORY_SIDEBAR_MAX)', () => {
  assert.equal(HISTORY_SIDEBAR_MAX, 5)
  const s = sidebarSrc()
  // AutoFinder + KaufCheck + VerkaufsCheck: alle drei kappen auf HISTORY_SIDEBAR_MAX
  assert.equal((s.match(/\.slice\(0, HISTORY_SIDEBAR_MAX\)/g) || []).length >= 3, true)
})
test('Sidebar E/F: Klick öffnet den RICHTIGEN bestehenden Check (onSelectCheck mit typ)', () => {
  const s = sidebarSrc()
  // ein gemeinsamer Renderer, der den typ 1:1 an den bestehenden Callback gibt
  assert.match(s, /onClick=\{\(\) => \{ onSelectCheck\(check\.id, typ\); onMobileClose\?\.\(\) \}\}/)
  // Delete nutzt weiterhin denselben Callback (keine neue Produktlogik) — seit
  // dem UX-Pass aber erst nach Bestaetigung: der Papierkorb merkt sich nur das Ziel.
  assert.match(s, /e\.stopPropagation\(\); setLoeschZiel\(\{ art: 'check', id: check\.id/)
  assert.match(s, /onDeleteCheck\(ziel\.id\)/)
  // KEINE zweite parallele Check-History: Datenquelle bleibt die prop `checks`
  assert.doesNotMatch(s, /localStorage[\s\S]{0,40}check/i)
})

// ── FIX 2: Ersatzteile aus dem Consumer-UI entfernt ────────────────────────
test('Ersatzteile H: KEIN Ersatzteile-Eintrag in der Sidebar-Navigation', () => {
  const s = sidebarSrc()
  assert.doesNotMatch(s, /label: 'Ersatzteile'/)
  assert.doesNotMatch(s, /to: '\/ersatzteile'/)
  assert.doesNotMatch(s, /\bWrench\b/)   // Icon-Import ebenfalls entfernt
})
test('Ersatzteile I: keine andere sichtbare Consumer-Navigation zu /ersatzteile', () => {
  const s = sidebarSrc()
  // keine aktive Navigation (NavLink to / navigate / goTo) auf die Route
  assert.doesNotMatch(s, /(to:|to=|navigate\(|goTo\()\s*['"]\/ersatzteile['"]/)
  // App.tsx: die Route bleibt (geparkt, Direkt-URL), aber KEIN <NavLink>/Menüeintrag
  assert.doesNotMatch(appTsx, /(to=|navigate\()\s*['"]\/ersatzteile['"]/)
  assert.doesNotMatch(appTsx, /label:\s*['"]Ersatzteile['"]/)
})
test('Ersatzteile J: Route bleibt technisch erhalten (geparkt, nur nicht in der Nav)', () => {
  assert.match(appTsx, /path="\/ersatzteile" element=\{<Guard[\s\S]{0,80}<ErsatzteileView \/>/)
})

test('History BUG2: Restore feuert ein Event, die Seite reagiert auch wenn schon offen', () => {
  const logic = read('logic.ts')
  // stageSucheRestore dispatcht RESTORE_EVENT (navigate('/autofinder') auf sich
  // selbst remountet nicht -> ohne Event bliebe der Klick wirkungslos)
  assert.match(logic, /export const RESTORE_EVENT = 'vira:af-restore'/)
  assert.match(logic, /stageSucheRestore[\s\S]{0,160}dispatchEvent\(new CustomEvent\(RESTORE_EVENT\)\)/)
  // AutoFinderView hört auf das Event UND verarbeitet den Mount-Fall
  assert.match(viewTsx, /addEventListener\(RESTORE_EVENT, handleRestore\)/)
  assert.match(viewTsx, /removeEventListener\(RESTORE_EVENT, handleRestore\)/)
  assert.match(viewTsx, /restoreHandled\.current/)
})
test('History: sucheLabel ist menschenlesbar', () => {
  assert.match(sucheLabel(form({ karosserie: ['kombi'], kraftstoff: ['Benzin'], budget_max: '25000' })),
    /Kombi.*Benzin.*bis 25\.000 €/)
  assert.equal(sucheLabel(EMPTY_FORM), 'Alle Fahrzeuge')
})
test('History H/§6: "gespeicherte Suche öffnen" zeigt die alten Ergebnisse ohne neuen Call', () => {
  assert.match(viewTsx, /takeSucheRestore\(\)/)
  assert.match(viewTsx, /setResp\(s\.response\)/)
  assert.match(viewTsx, /setRestauriert\(true\)/)
  assert.match(viewTsx, /Neu suchen/)
  // restoreSuche (In-Page-Panel) nutzt ebenfalls die eingebettete Antwort
  assert.match(viewTsx, /if \(s\.response\)[\s\S]{0,120}setResp\(s\.response\)/)
})

// ── N) Fehlerzustand ────────────────────────────────────────────────────────
test('N: humanError trennt Ausfall von echtem Fehler; View rendert role="alert"', () => {
  assert.match(humanError(new Error('Failed to fetch')), /nicht erreichbar/)
  assert.match(humanError(new Error('500 Internal')), /schiefgelaufen|erneut/)
  assert.match(humanError(new Error('422 karosserie: x ist kein bekannter wert')), /Eingabe/)
  assert.match(viewTsx, /role="alert"/)
})

// ── O) Low-Coverage / No-Match ─────────────────────────────────────────────
test('O: coverageState bildet no_internal_match und Low-Coverage ab', () => {
  assert.equal(coverageState(resp({ status: 'no_internal_match', kandidaten: [] })).kind, 'none')
  assert.equal(coverageState(resp({ kandidaten: [] })).kind, 'none')
  assert.equal(coverageState(resp({ warnings: ['Nur wenige passende Fahrzeuge im internen Bestand gefunden — die Auswahl ist entsprechend klein.'] })).kind, 'low')
  assert.equal(coverageState(resp()).kind, 'ok')
})

// ══════════════════════════════════════════════════════════════════════════
// VEHICLE IDENTITY RUNDE — AutoFinder ohne Fahrzeugbilder (Matrix A-P)
//
// Produktentscheidung: keine modellgenauen Fahrzeugbilder mehr. Statt eines
// Bildes trägt jede Karte links das gestaltete ENFAL Vehicle Identity Panel.
// Diese Tests sichern beides zu: dass das Panel die Fahrzeugidentität wirklich
// zeigt — und dass nirgends mehr ein Bild gerendert oder nachgeladen wird.
// ══════════════════════════════════════════════════════════════════════════

const panelTsx = read('VehicleIdentityPanel.tsx')

test('A: die ResultCard rendert ohne jede Bildangabe (liest keine Bildfelder)', () => {
  // Bildfelder dürfen im Contract bleiben — die Karte darf sie nur nicht lesen.
  const codeOhneKommentare = cardTsx
    .replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '')
  for (const feld of ['image_url', 'image_type', 'image_confidence', 'ai_generated']) {
    assert.doesNotMatch(codeOhneKommentare, new RegExp(`k\.${feld}`), `${feld} wird noch gelesen`)
  }
  assert.doesNotMatch(codeOhneKommentare, /imagePending|imgBroken|CarPlaceholder/)
})

test('B: kein <img> und kein Bild-Asset in der AutoFinder-ResultCard', () => {
  assert.doesNotMatch(cardTsx, /<img/)
  assert.doesNotMatch(panelTsx, /<img/)
  assert.doesNotMatch(panelTsx, /\.webp|\.png|\.jpg/)
})

test('C-G: das Identity Panel zeigt Marke, Modell, Generation, Motor und Leistung', () => {
  assert.match(panelTsx, /\{k\.marke\}/)          // C: Marke
  assert.match(panelTsx, /\{k\.modell\}/)         // D: Modell
  assert.match(panelTsx, /k\.generation/)         // E: Generation
  assert.match(panelTsx, /k\.motor/)              // F: Motor
  assert.match(panelTsx, /k\.leistung_ps/)        // G: Leistung
  assert.match(panelTsx, /PS/)
})

test('H: das Panel zeigt Karosserie-, Kraftstoff- und Getriebe-Chips', () => {
  assert.match(panelTsx, /k\.karosserie/)
  assert.match(panelTsx, /kraftstoffKurz\(k\)/)   // Kraftstoff-Chip (bei Gas: Gasantrieb statt "Benzin")
  assert.match(panelTsx, /k\.getriebe/)
  assert.match(panelTsx, /KAROSSERIE_LABEL/)
  assert.match(panelTsx, /GETRIEBE_LABEL/)
})

test('I: der Fit-Score bleibt sichtbar in der Karte', () => {
  assert.match(cardTsx, /\{k\.user_fit\}%/)
  assert.match(cardTsx, /Passung/)
})

test('J/K: keine Bild-Disclosure mehr — weder KI-Hinweis noch Symbolbild', () => {
  for (const quelle of [cardTsx, panelTsx, viewTsx]) {
    assert.doesNotMatch(quelle, /KI-generierte Modelldarstellung/)
    assert.doesNotMatch(quelle, /Symbolbild/)
  }
  assert.doesNotMatch(read('logic.ts').replace(/\/\/[^\n]*/g, ''), /imageDisclosure/)
})

test('L: die Suche löst KEINEN Image-Ensure-Call aus', () => {
  assert.doesNotMatch(viewTsx, /ImagesEnsure/)
  assert.doesNotMatch(viewTsx, /images\/ensure/)
  // auch der API-Client hat keinen Ensure-Pfad mehr (nur noch ein Kommentar)
  const clientCode = clientTs.replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '')
  assert.doesNotMatch(clientCode, /images\/ensure/)
  assert.doesNotMatch(clientCode, /apiAutoFinderImagesEnsure/)
})

test('M: History-Restore löst KEINEN Image-Call aus (0 Provider-Requests)', () => {
  assert.doesNotMatch(viewTsx, /aktualisiereGespeicherteBilder/)
  const logic = read('logic.ts').replace(/\/\/[^\n]*/g, '')
  assert.doesNotMatch(logic, /export async function aktualisiereGespeicherteBilder/)
  // Restore setzt die gespeicherte Antwort direkt — ohne Nachladeschritt
  assert.match(viewTsx, /setResp\(s\.response\)/)
})

test('N: maximal 5 fachliche Ergebnisse, ohne Image-Gate', () => {
  assert.equal(MAX_CARDS, 5)
  assert.match(viewTsx, /slice\(0,\s*MAX_CARDS\)/)
  // die Antwort wird unverändert übernommen — kein Aussortieren wegen Bildern
  assert.match(viewTsx, /setResp\(r\)/)
  assert.doesNotMatch(viewTsx, /waehleImageReady|fehlendeBilder/)
})

test('N: keine Fake-Wartephase "Fahrzeugdarstellungen" mehr im Fortschritt', () => {
  assert.doesNotMatch(viewTsx, /Fahrzeugdarstellungen werden vorbereitet/)
  // die vier fachlichen Schritte bleiben
  assert.match(viewTsx, /Passende Fahrzeuge werden gefiltert/)
  assert.match(viewTsx, /Motorvarianten werden verglichen/)
  assert.match(viewTsx, /Stärken und mögliche Nachteile werden geprüft/)
  assert.match(viewTsx, /Preisorientierung wird eingeordnet/)
})

test('O: History-Restore funktioniert unverändert (Filter + Ergebnisse)', () => {
  assert.match(viewTsx, /takeSucheRestore\(\)/)
  assert.match(viewTsx, /setForm\(s\.form\)/)
  assert.match(viewTsx, /setRestauriert\(true\)/)
  assert.match(viewTsx, /Neu suchen/)
})

test('P: die KaufCheck-CTA funktioniert weiterhin aus jeder Karte', () => {
  assert.match(cardTsx, /stageKaufCheckPrefill\(k\)/)
  assert.match(cardTsx, /navigate\(KAUFCHECK_ROUTE\)/)
  assert.match(cardTsx, /Mit KaufCheck prüfen/)
})

test('Panel: nutzt das Identity Panel statt einer Bildspalte', () => {
  assert.match(cardTsx, /<VehicleIdentityPanel k=\{k\} rank=\{rank\} \/>/)
  assert.match(panelTsx, /data-testid="vehicle-identity-panel"/)
  // Wasserzeichen wird nie erfunden: ohne Generation kein Kürzel
  assert.match(panelTsx, /wasserzeichenText/)
  assert.match(panelTsx, /return ''/)
})

test('Panel: responsive — links auf Desktop, oben auf Mobile', () => {
  assert.match(panelTsx, /sm:w-64|sm:w-72/)
  assert.match(panelTsx, /sm:border-b-0/)
  assert.match(cardTsx, /sm:flex/)
})

// ── Anonyme Demo vs. Konto-Kontingent ───────────────────────────────────────
// Der Server unterscheidet zwei Kontingent-Zustaende mit unterschiedlichem Weg
// nach vorn. Das Frontend darf sie nicht zusammenwerfen: nach der verbrauchten
// Demo hat der Nutzer sein Free-Kontingent noch vollstaendig vor sich — ein
// Plus-Angebot waere dort sachlich falsch.

// `clientTs` und `viewTsx` sind oben bereits eingelesen und werden hier
// wiederverwendet — kein zweites Einlesen derselben Dateien.
const loginTsx = readFileSync(join(here, '..', 'LoginView.tsx'), 'utf8')

test('Demo: der Client erkennt beide Kontingent-Codes', () => {
  assert.match(clientTs, /'monatslimit_erreicht'/)
  assert.match(clientTs, /'demo_limit_erreicht'/)
})

test('Demo: der Fehlertyp traegt anmeldenHilft und den Subtext', () => {
  assert.match(clientTs, /readonly anmeldenHilft: boolean/)
  assert.match(clientTs, /readonly hinweis: string/)
  // Beide Signale kommen VOM SERVER — das Frontend leitet sie nicht selbst ab.
  assert.match(clientTs, /f\.anmelden_hilft === true/)
})

test('Demo: die Ansicht zeigt "Kostenlos anmelden" statt der Plus-CTA', () => {
  assert.match(viewTsx, /anmeldenHilft \? \(/)
  assert.match(viewTsx, /Kostenlos anmelden/)
  assert.match(viewTsx, /ENFAL Plus ansehen/)
})

test('Demo: die Anmelde-CTA zeigt auf eine EXISTIERENDE Route', () => {
  // '/register' gibt es nicht — Registrieren ist ein Tab in '/login'.
  assert.doesNotMatch(viewTsx, /navigate\('\/register'\)/)
  assert.match(viewTsx, /navigate\('\/login\?modus=register'\)/)
  assert.match(appTsx, /<Route path="\/login"/)
  assert.doesNotMatch(appTsx, /<Route path="\/register"/)
})

test('Demo: LoginView oeffnet bei ?modus=register direkt den Registrieren-Tab', () => {
  assert.match(loginTsx, /suchparameter\.get\('modus'\) === 'register' \? 'register' : 'login'/)
})

test('Demo: der Rueckweg nach der Anmeldung fuehrt zum AutoFinder', () => {
  assert.match(viewTsx, /setReturnTo\('\/autofinder'\)/)
})

test('Demo: der Subtext des Servers wird angezeigt, nicht neu erfunden', () => {
  assert.match(viewTsx, /\{limitHinweis\}/)
  // Kein im Frontend hartkodierter Kontingent-Satz.
  assert.doesNotMatch(viewTsx, /5 AutoFinder-Suchen pro Monat/)
})

test('Demo: das Limit ist serverseitig — kein localStorage als Autoritaet', () => {
  const zaehlerVerdacht = /(localStorage|sessionStorage)[^\n]*(demo|limit|kontingent|counter|verbrauch)/i
  assert.doesNotMatch(viewTsx, zaehlerVerdacht)
  assert.doesNotMatch(read('logic.ts'), zaehlerVerdacht)
})

// ── AF-02: Herkunft sichtbar machen (KI-Einschätzung vs. deterministisch) ────
const OHNE_KI = { ...KAND, enrichment_status: 'fallback' as const,
  why_fits: ['Nutzung: langstrecke', 'Sparsam'], trade_offs: ['1 verifizierter KBA-Rückruf bekannt'] }

test('AF-02: Budget-Chip nennt Herkunft; ohne Budgeturteil kein Chip', () => {
  assert.equal(budgetChipText({ budget_status: 'IN_BUDGET' }), 'Im Budget · grobe KI-Einschätzung')
  assert.equal(budgetChipText({ budget_status: 'NEAR_BUDGET' }), 'Nahe am Budget · grobe KI-Einschätzung')
  assert.equal(budgetChipText({ budget_status: 'OUT_OF_BUDGET' }), 'Über Budget · grobe KI-Einschätzung')
  assert.equal(budgetChipText({ budget_status: 'UNKNOWN' }), null)
  assert.equal(budgetChipText(KAND), null)   // Fixture ohne Budget
})

test('AF-02: Modelltexte (enrichment ok) werden gekennzeichnet', () => {
  const m = kiKennzeichnung({ ...KAND, trade_offs: ['Verbrauch', 'Unterhalt'] })
  assert.equal(m.whyFitsKi, true)
  assert.deepEqual(m.tradeOffsKi, ['Verbrauch', 'Unterhalt'])
  assert.deepEqual(m.tradeOffsOhneKi, [])
})

test('AF-02: Fallback-Texte (deterministisch/DB) werden NICHT als KI gekennzeichnet', () => {
  for (const status of ['fallback', 'unavailable'] as const) {
    const m = kiKennzeichnung({ ...OHNE_KI, enrichment_status: status })
    assert.equal(m.whyFitsKi, false)
    assert.deepEqual(m.tradeOffsKi, [])
    assert.deepEqual(m.tradeOffsOhneKi, ['1 verifizierter KBA-Rückruf bekannt'])
  }
})

test('AF-02: leere Modellliste ergibt keine leere Kennzeichnung', () => {
  const m = kiKennzeichnung({ ...KAND, why_fits: [], trade_offs: [] })
  assert.equal(m.whyFitsKi, false)
  assert.deepEqual(m.tradeOffsKi, [])
  assert.deepEqual(m.tradeOffsOhneKi, [])
})

test('AF-02: regelbasierter Trade-off (Einsteiger-Hinweis) bleibt neben KI-Texten unmarkiert', () => {
  const regel = '190 PS sind für den Einstieg viel Leistung: Versicherung.'
  const m = kiKennzeichnung({ ...KAND, trade_offs: [regel, 'Verbrauch'], trade_offs_regelbasiert: [regel] })
  assert.deepEqual(m.tradeOffsOhneKi, [regel])
  assert.deepEqual(m.tradeOffsKi, ['Verbrauch'])
})

test('AF-02: Kurzzeile — KI nur bei Modelltext, sonst deterministischer Grund ohne Marke', () => {
  assert.deepEqual(kartenZusammenfassung(KAND), { text: KAND.why_fits[0], ki: true })
  assert.deepEqual(kartenZusammenfassung(OHNE_KI), { text: 'Nutzung: langstrecke', ki: false })
  assert.deepEqual(kartenZusammenfassung({ ...OHNE_KI, why_fits: [] }), { text: 'Nutzung: langstrecke', ki: false })
  assert.equal(kartenZusammenfassung({ ...OHNE_KI, why_fits: [], user_fit_gruende: [], match_gruende: [] }), null)
})

test('AF-02: Karte nutzt die Kennzeichnungslogik, DB-Hinweise ("Bekannte Punkte") bleiben unmarkiert', () => {
  assert.match(cardTsx, /budgetChipText\(k\)/)
  assert.match(cardTsx, /kiKennzeichnung\(k\)/)
  assert.match(cardTsx, /kartenZusammenfassung\(k\)/)
  const bekannt = cardTsx.slice(cardTsx.indexOf('Bekannte Punkte') - 200, cardTsx.indexOf('Bekannte Punkte') + 60)
  assert.doesNotMatch(bekannt, /KiMarke/)
})

test('AF-02: Budget-Hinweis im Formular — KI-Einschätzung, beeinflusst Reihenfolge und Passung, keine Marktpreisprüfung', () => {
  assert.match(viewTsx, /per KI grob ein/)
  assert.match(viewTsx, /Reihenfolge und angezeigte Passung/)
  assert.match(viewTsx, /keine Live-Marktpreisprüfung/)
})

test('AF-02: Markenfeld heißt "Nur diese Marken"; Verhalten unverändert (leer = keine Beschränkung)', () => {
  assert.match(viewTsx, /Nur diese Marken/)
  assert.doesNotMatch(viewTsx, /Bevorzugte Marken/)
  assert.match(viewTsx, /Leer lassen: keine Markenbeschränkung/)
  const leer = buildPayload(form({ budget_max: '25000' })) as Record<string, unknown>
  assert.equal('marken_bevorzugt' in leer, false)
  const mit = buildPayload(form({ marken_bevorzugt: 'BMW, Audi' })) as Record<string, unknown>
  assert.deepEqual(mit.marken_bevorzugt, ['BMW', 'Audi'])
})

test('AF-02: Aufteilung verliert keinen Trade-off (alle Status)', () => {
  const regel = 'Einsteiger-Hinweis'
  for (const status of ['ok', 'fallback', 'unavailable'] as const) {
    const k = { ...KAND, enrichment_status: status, trade_offs: [regel, 'A', 'B'], trade_offs_regelbasiert: [regel] }
    const m = kiKennzeichnung(k)
    assert.deepEqual([...m.tradeOffsKi, ...m.tradeOffsOhneKi].sort(), [...k.trade_offs].sort())
  }
})

// ── AF-03: Generationsjahre, Motorzeitraum und Suchfenster getrennt ─────────
const GEN = { generation_baujahr_von: 2011, generation_baujahr_bis: 2019 }

test('AF-03: Datensatz-Kandidat zeigt Generationsjahre; das Suchfenster ist separat und nur bei Abweichung da', () => {
  const eng = baujahrAnzeige({ ...GEN, baujahr_von: 2016, baujahr_bis: 2019 })
  assert.deepEqual(eng, { nurGeneration: true, zeitraum: '2011–2019', motorzeitraum: null, suchfenster: '2016–2019' })
  const ohne = baujahrAnzeige({ ...GEN, baujahr_von: 2011, baujahr_bis: 2019 })
  assert.equal(ohne.suchfenster, null)
  assert.equal(ohne.zeitraum, '2011–2019')
  assert.equal(baujahrAnzeige({ generation_baujahr_von: 2019, generation_baujahr_bis: null, baujahr_von: 2019, baujahr_bis: null }).zeitraum, '2019 →')
})

test('AF-03: Web-Kandidat mit belegter Bauzeit bleibt unverändert (kein Generationsbezug)', () => {
  const web = baujahrAnzeige({ generation_baujahr_von: null, generation_baujahr_bis: null, baujahr_von: 2018, baujahr_bis: 2022 })
  assert.deepEqual(web, { nurGeneration: false, zeitraum: '2018–2022', motorzeitraum: null, suchfenster: null })
})

test('AF-03: Suchhilfe kennzeichnet das Fenster als dein Zeitraum, ohne Fenster die Baureihe, nie einen Motorzeitraum', () => {
  const mit = marketplaceFilters({ ...KAND, ...GEN, baujahr_von: 2016, baujahr_bis: 2019 })
  assert.equal(mit.find((x) => x.label === 'Erstzulassung (dein Zeitraum)')?.value, '2016–2019')
  const ohne = marketplaceFilters({ ...KAND, ...GEN, baujahr_von: 2011, baujahr_bis: 2019 })
  assert.equal(ohne.find((x) => x.label === 'Erstzulassung (dein Zeitraum)'), undefined)
  assert.equal(ohne.find((x) => x.label === 'Baureihe gebaut (Motorzeitraum unbekannt)')?.value, '2011–2019')
  const web = marketplaceFilters({ ...KAND, generation_baujahr_von: null, generation_baujahr_bis: null, baujahr_von: 2018, baujahr_bis: 2022 })
  assert.equal(web.find((x) => x.label === 'Erstzulassung')?.value, '2018–2022')
})

test('AF-03: Karte nennt Baureihenjahre, fehlenden Motorzeitraum, Suchfenster und erklärt den Jahresfilter', () => {
  assert.doesNotMatch(cardTsx, /Passende Baujahre/)
  assert.doesNotMatch(cardTsx, /Generation gebaut/)
  assert.match(cardTsx, /Motorzeitraum \$\{bj\.motorzeitraum/)
  assert.match(cardTsx, /'nicht hinterlegt'/)
  assert.match(cardTsx, /Dein Suchfenster/)
  assert.match(cardTsx, /motorzeitraumHinweis\(bj\)/)
  assert.match(MOTORZEITRAUM_HINWEIS, /nicht die der einzelnen Motorisierung/)
  assert.match(MOTORZEITRAUM_HINWEIS, /Leistung oder welches Getriebe/)
  assert.match(cardTsx, /Leistung und Getriebe bitte im Angebot/)
})

test('AF-03: Getriebe aus dem Nutzerwunsch wird als "laut Datensatz wählbar" benannt, nicht als feste Ausstattung', () => {
  assert.match(cardTsx, /laut Datensatz wählbar/)
  assert.match(cardTsx, /nicht je Ausführung geprüft/)
  assert.doesNotMatch(cardTsx, /Diese Motorisierung gab es auch mit/)
})

test('AF-03: der Jahresfilter im Formular erklärt seine begrenzte Aussage', () => {
  assert.match(viewTsx, /Der Jahresfilter prüft die Bauzeit der Baureihe, nicht die der einzelnen Motorisierung/)
})

// ── AF-03: belegte Motorgrenzen, nicht bestätigte Getriebe, KaufCheck-Übergabe ──
test('AF-03: belegte Motorgrenze wird als solche genannt; das Suchfenster vergleicht gegen den eingeengten Zeitraum', () => {
  const alt = baujahrAnzeige({ ...GEN, motor_bauzeit_bis: 2015, baujahr_von: 2011, baujahr_bis: 2015 })
  assert.deepEqual(alt, { nurGeneration: true, zeitraum: '2011–2019', motorzeitraum: 'bis 2015', suchfenster: null })
  const neu = baujahrAnzeige({ ...GEN, motor_bauzeit_von: 2015, baujahr_von: 2015, baujahr_bis: 2019 })
  assert.deepEqual(neu, { nurGeneration: true, zeitraum: '2011–2019', motorzeitraum: 'ab 2015', suchfenster: null })
  const mitFenster = baujahrAnzeige({ ...GEN, motor_bauzeit_von: 2015, baujahr_von: 2016, baujahr_bis: 2017 })
  assert.equal(mitFenster.suchfenster, '2016–2017')
})

test('AF-03: der Jahres-Hinweis bleibt ehrlich: ohne Motorgrenze "nicht hinterlegt", mit Grenze nur diese Grenze', () => {
  const ohne = baujahrAnzeige({ ...GEN, baujahr_von: 2011, baujahr_bis: 2019 })
  assert.equal(motorzeitraumHinweis(ohne), MOTORZEITRAUM_HINWEIS)
  const mit = baujahrAnzeige({ ...GEN, motor_bauzeit_bis: 2015, baujahr_von: 2011, baujahr_bis: 2015 })
  assert.match(motorzeitraumHinweis(mit), /nur die genannte Grenze, keinen vollständigen Zeitraum/)
  assert.doesNotMatch(motorzeitraumHinweis(mit), /steht nicht im ENFAL-Datensatz\. Welche/)
})

test('AF-03: Suchhilfe nennt bei belegter Motorgrenze diese Grenze, nie einen Motorzeitraum aus der Generation', () => {
  const f = marketplaceFilters({ ...KAND, ...GEN, motor_bauzeit_bis: 2015, baujahr_von: 2011, baujahr_bis: 2015 })
  assert.equal(f.find((x) => x.label === 'Baureihe gebaut (Motor: bis 2015)')?.value, '2011–2019')
})

test('AF-03: Karte zeigt belegte Motorgrenze und nicht bestätigte Getriebe', () => {
  assert.match(cardTsx, /\(laut Datensatz\)/)
  assert.match(cardTsx, /bj\.motorzeitraum \?\? 'nicht hinterlegt'/)
  assert.match(cardTsx, /getriebe_unbestaetigt/)
  assert.match(cardTsx, /Das ist nicht bestätigt und zählt deshalb nicht für deine Suche/)
})

test('AF-03: KaufCheck-Übergabe trägt kein Baujahr; das Feld bleibt leer und der Nutzer muss es eintragen', () => {
  assert.equal(buildKaufCheckPrefill(KAND).baujahr, null)
  assert.equal(buildKaufCheckPrefill({ ...KAND, baujahr_von: 2016, baujahr_bis: 2019 }).baujahr, null)
  const kc = readFileSync(join(here, '..', 'KaufCheckView.tsx'), 'utf8')
  assert.match(kc, /baujahr: pf\.baujahr \?\? Number\.NaN/)
  assert.doesNotMatch(kc, /baujahr: pf\.baujahr \?\? EMPTY\.baujahr/)
  assert.match(kc, /Number\.isNaN\(form\.baujahr\) \? '' : form\.baujahr/)
  assert.match(kc, /Bitte das Baujahr des konkreten Angebots eintragen/)
  assert.match(kc, /required/)
})

// ── AF-10: Gasantrieb wird als solcher angezeigt, nicht als gewöhnlicher Benziner ──
test('AF-10: Kraftstoffanzeige nennt bei Gasfahrzeugen den Hinweis, sonst die Datensatzklasse', () => {
  assert.equal(kraftstoffAnzeige({ kraftstoff: 'Benzin', kraftstoff_hinweis: 'primär Erdgas (CNG), Benzin nur als Reserve' }),
    'primär Erdgas (CNG), Benzin nur als Reserve')
  assert.equal(kraftstoffAnzeige({ kraftstoff: 'Benzin' }), 'Benzin')
  assert.equal(kraftstoffAnzeige({ kraftstoff: 'Diesel', kraftstoff_hinweis: null }), 'Diesel')
})

test('AF-10: Suchhilfe führt für Gasfahrzeuge den Hinweis statt "Benzin"; reguläre Benziner unverändert', () => {
  const gas = marketplaceFilters({ ...KAND, kraftstoff: 'Benzin', kraftstoff_hinweis: 'primär Erdgas (CNG), Benzin nur als Reserve' })
  assert.equal(gas.find((x) => x.label === 'Kraftstoff')?.value, 'primär Erdgas (CNG), Benzin nur als Reserve')
  const benzin = marketplaceFilters({ ...KAND, kraftstoff: 'Benzin' })
  assert.equal(benzin.find((x) => x.label === 'Kraftstoff')?.value, 'Benzin')
})

test('AF-10: Karte zeigt den Kraftstoff über kraftstoffAnzeige (Chip und Details)', () => {
  assert.equal((cardTsx.match(/kraftstoffAnzeige\(k\)/g) ?? []).length, 2)
  assert.doesNotMatch(cardTsx, /\{k\.kraftstoff\}/)
})

// ── AF-11: die Überschrift stimmt, wenn die Karten nach der angezeigten Passung kommen ──
test('AF-11: die Überschrift "sortiert nach Passung" bleibt; das Frontend sortiert nicht um (das tut das Backend nach user_fit)', () => {
  assert.match(viewTsx, /sortiert nach Passung/)
  assert.doesNotMatch(viewTsx, /\.sort\(/)
})

// ── GAS-1: verlustfreie KaufCheck-Übergabe für Gasfahrzeuge ──
// Vorher (AF-10) war die Übergabe gesperrt, weil der KaufCheck keinen Gasantrieb kannte. Seit GAS-1
// führt der KaufCheck Gasart und Unsicherheit durch Eingabe, Zuordnung, Bericht, Verkäuferfragen und
// Unterlagen (Backend: test_kaufcheck_gas.py). Gesichert wird jetzt die richtige Aussage: die Gasart
// kommt ohne Verlust an, eine unbekannte Gasart wird nicht geraten, normale Fahrzeuge bleiben unverändert.
test('GAS-1: Gasfahrzeug wird übergeben: Prefill trägt Gasart und Kraftstoff-Hinweis statt "Benzin"', () => {
  const store: Record<string, string> = {}
  ;(globalThis as any).sessionStorage = {
    setItem: (k: string, v: string) => { store[k] = v }, getItem: (k: string) => store[k] ?? null,
    removeItem: (k: string) => { delete store[k] },
  }
  const tgi = { ...KAND, antriebsgas: 'CNG', kraftstoff: 'Benzin', kraftstoff_hinweis: 'primär Erdgas (CNG), Benzin nur als Reserve' }
  stageKaufCheckPrefill(tgi)
  const pf = JSON.parse(store['vira.kaufcheck.prefill'])
  assert.equal(pf.antriebsgas, 'CNG')
  assert.equal(pf.kraftstoff, 'primär Erdgas (CNG), Benzin nur als Reserve')
  assert.equal(pf.baujahr, null)
  const unbekannt = buildKaufCheckPrefill({ ...KAND, antriebsgas: 'Gas', kraftstoff: 'Benzin',
    kraftstoff_hinweis: 'Gasfahrzeug laut Variantenbezeichnung (Gasart, Primärkraftstoff und Verbrauchseinheit nicht geprüft)' })
  assert.equal(unbekannt.antriebsgas, 'Gas')
  assert.doesNotMatch(unbekannt.kraftstoff, /^Benzin$/)
  const normal = buildKaufCheckPrefill(KAND)
  assert.equal(normal.antriebsgas, null)
  assert.equal(normal.kraftstoff, KAND.kraftstoff)      // normaler Fall unverändert
})

test('GAS-1: Kraftstofffeld im KaufCheck: CNG -> Erdgas, "Gas" -> Gasart unbekannt (nicht geraten), sonst leer wie bisher', () => {
  assert.equal(kraftstoffAusPrefill({ antriebsgas: 'CNG' }), 'cng')
  assert.equal(kraftstoffAusPrefill({ antriebsgas: 'LPG' }), 'lpg')
  assert.equal(kraftstoffAusPrefill({ antriebsgas: 'Gas' }), 'gas')
  assert.equal(kraftstoffAusPrefill({ antriebsgas: null }), '')
  assert.equal(kraftstoffAusPrefill({}), '')            // älteres Prefill ohne Feld
  const kc = readFileSync(join(here, '..', 'KaufCheckView.tsx'), 'utf8')
  assert.match(kc, /kraftstoff: kraftstoffAusPrefill\(pf\)/)
})

test('GAS-1: Karte bietet beide KaufCheck-Schaltflächen für jedes Fahrzeug an, ohne Sperrhinweis', () => {
  assert.equal((cardTsx.match(/onClick=\{toKaufCheck\}/g) ?? []).length, 2)
  assert.doesNotMatch(cardTsx, /kaufcheckMoeglich|KAUFCHECK_GAS_HINWEIS|kennt noch keinen Gasantrieb/)
})

test('AF-10: Kurzform für das Kennungs-Panel: Gas nie als "Benzin", normaler Benziner unverändert', () => {
  assert.equal(kraftstoffKurz({ kraftstoff: 'Benzin', antriebsgas: 'CNG' }), 'Erdgas (CNG)')
  assert.equal(kraftstoffKurz({ kraftstoff: 'Benzin', antriebsgas: 'Gas' }), 'Gasfahrzeug')
  assert.equal(kraftstoffKurz({ kraftstoff: 'Benzin', antriebsgas: null }), 'Benzin')
  assert.match(readFileSync(join(here, 'VehicleIdentityPanel.tsx'), 'utf8'), /kraftstoffKurz\(k\)/)
})
