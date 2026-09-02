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
  EMPTY_FORM,
  imageDisclosure,
  marketplaceFilters,
  coverageState,
  humanError,
  formatPriceRange,
  fehlendeBilder,
  resolveImageUrl,
  buildKaufCheckPrefill,
  sucheLabel,
  MAX_CARDS,
  KAUFCHECK_ROUTE,
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
  marke: 'BMW', modell: '3er', generation: 'G20', motor: '320d',
  baujahr_von: 2019, baujahr_bis: 2024, leistung_ps: 190, kraftstoff: 'Diesel',
  getriebe: ['automatik'], antrieb: 'Heck', karosserie: ['limousine'],
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

// ── D) Loading-State + Fortschrittsschritte (§Punkt 7) ─────────────────────
test('D: View zeigt einen klaren Loading-/Analyse-State mit Workflow-Schritten', () => {
  assert.match(viewTsx, /Suche läuft/)
  assert.match(viewTsx, /animate-spin/)
  // die 5 Workflow-Schritte spiegeln den echten Ablauf grob wider
  assert.match(viewTsx, /Passende Fahrzeuge werden gefiltert/)
  assert.match(viewTsx, /Motorvarianten werden verglichen/)
  assert.match(viewTsx, /Stärken und mögliche Nachteile werden geprüft/)
  assert.match(viewTsx, /Preisorientierung wird eingeordnet/)
  assert.match(viewTsx, /Fahrzeugdarstellungen werden vorbereitet/)
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

// ── G) KI-Disclosure ────────────────────────────────────────────────────────
test('G: generated_cached / ai_generated -> "KI-generierte Modelldarstellung"', () => {
  assert.equal(imageDisclosure({ image_type: 'generated_cached', ai_generated: true }), 'KI-generierte Modelldarstellung')
  assert.equal(imageDisclosure({ image_type: 'curated', ai_generated: true }), 'KI-generierte Modelldarstellung')
})

// ── H) Symbolbild-Disclosure ────────────────────────────────────────────────
test('H: generic_fallback -> "Symbolbild"; echtes Foto -> kein Zusatz', () => {
  assert.equal(imageDisclosure({ image_type: 'generic_fallback', ai_generated: false }), 'Symbolbild')
  assert.equal(imageDisclosure({ image_type: 'curated', ai_generated: false }), null)
})

// ── I) Fehlendes Bild bricht die UI nicht ───────────────────────────────────
test('I: Karte hat onError-Fallback auf die Platzhalter-Komponente', () => {
  assert.match(cardTsx, /onError={\(\) => setImgBroken\(true\)}/)
  assert.match(cardTsx, /CarPlaceholder/)
  assert.match(read('CarPlaceholder.tsx'), /<svg/)
})

// ── J) mobile.de / AutoScout24 Filterwerte ──────────────────────────────────
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

// ── K) Keine erfundenen Marktpreise ─────────────────────────────────────────
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

// ── L) KaufCheck-CTA mit Prefill (§Punkt 4) ────────────────────────────────
test('L: jede Karte hat eine KaufCheck-CTA, die das Formular vorbefüllt', () => {
  assert.equal(KAUFCHECK_ROUTE, '/kaufcheck')
  assert.match(cardTsx, /KaufCheck/)
  assert.match(cardTsx, /stageKaufCheckPrefill\(k\)/)
  assert.match(cardTsx, /navigate\(KAUFCHECK_ROUTE\)/)
  assert.doesNotMatch(cardTsx, /kaufcheck\?[a-z]/i) // keine Query-Parameter
})

test('L/M: buildKaufCheckPrefill übernimmt Marke/Modell/Generation/Motor/Baujahr', () => {
  const pf = buildKaufCheckPrefill(KAND)
  assert.equal(pf.marke, 'BMW')
  assert.equal(pf.modell, '3er')
  assert.equal(pf.generation, 'G20')
  assert.equal(pf.motor, '320d')
  assert.equal(pf.baujahr, 2019)
  assert.equal(pf.quelle, 'autofinder')
  assert.equal(pf.kraftstoff, 'Diesel')
})

test('N: Prefill überlebt den Login-Zwischenschritt -> sessionStorage, nicht Navigation-State', () => {
  // Übergabe via sessionStorage (überlebt Redirect zu /login und zurück)
  const logic = read('logic.ts')
  assert.match(logic, /KAUFCHECK_PREFILL_KEY = 'vira\.kaufcheck\.prefill'/)
  assert.match(logic, /sessionStorage\.setItem\(KAUFCHECK_PREFILL_KEY/)
  assert.match(logic, /sessionStorage\.getItem\(KAUFCHECK_PREFILL_KEY/)
  // consume löscht den Key wieder (kein Geister-Prefill)
  assert.match(logic, /sessionStorage\.removeItem\(KAUFCHECK_PREFILL_KEY/)
  // KEINE Navigation-State-Übergabe (die ginge beim Redirect verloren)
  assert.doesNotMatch(cardTsx, /navigate\([^)]*state:/)
})

test('O: KaufCheckView liest das Prefill NUR additiv (keine Logik-/Credits-/Preisänderung)', () => {
  const kc = readFileSync(join(here, '..', 'KaufCheckView.tsx'), 'utf8')
  assert.match(kc, /consumeKaufCheckPrefill\(\)/)
  // nur setForm mit Formularfeldern — kein Eingriff in runCheck/Credits/Trust
  const before = kc
  // die Prefill-Logik steht im else-Zweig des savedCheck-Effekts und ruft nur setForm
  assert.match(kc, /const pf = consumeKaufCheckPrefill\(\)[\s\S]{0,600}setForm\(\{/)
  assert.equal(before, kc)
  // runKaufCheck / apiSaveCheck etc. unverändert vorhanden, nicht angefasst
  assert.match(kc, /runKaufCheck\(form, screenshot, retry\)/)
})

// ── M) Responsives Grundlayout + geteilte VIRA-Shell-Sprache ────────────────
test('M: View nutzt die kanonische VIRA-Content-Sprache (wie Kauf-Check/Entdecken)', () => {
  // gleicher zentrierter Container wie die anderen Werkzeugseiten
  assert.match(viewTsx, /max-w-3xl mx-auto/)
  assert.match(viewTsx, /sm:/)
  assert.match(cardTsx, /sm:flex/)
  // kanonische Chrome-Bausteine
  assert.match(viewTsx, /h-full overflow-y-auto scrollbar-thin/)
  assert.match(viewTsx, /ez-rise/)
  assert.match(viewTsx, /ez-aurora/)
  assert.match(viewTsx, /Vira · AutoFinder/)
  // KEIN eigener Landingpage-Header mehr (Logo/Anmelden lebt in der Shell)
  assert.doesNotMatch(viewTsx, /<header/)
  assert.doesNotMatch(viewTsx, /\/logo\.svg/)
})

test('M2: Sidebar hat einen AutoFinder-Navigationseintrag', () => {
  const sidebar = readFileSync(join(here, '..', 'Sidebar.tsx'), 'utf8')
  assert.match(sidebar, /to: '\/autofinder'.*label: 'AutoFinder'/)
})

// ══════════════════════════════════════════════════════════════════════════
// Quality-Enrichment-Runde
// ══════════════════════════════════════════════════════════════════════════

// ── Fit-Score im UI (§Punkt 2) ────────────────────────────────────────────
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

// ── Preisorientierung (§Punkt 3) ──────────────────────────────────────────
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

// ── Why-Fits / Trade-offs / Bekannte Punkte (§Punkt 6) ────────────────────
test('Content: die Karte rendert why_fits, trade_offs und known_points', () => {
  assert.match(cardTsx, /k\.why_fits\.map/)
  assert.match(cardTsx, /k\.trade_offs\.map/)
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

// ── Bild-On-Demand + Skeleton (§Punkt 1) ─────────────────────────────────
test('Bild: fehlendeBilder liefert nur Kandidaten ohne echtes KI-Asset', () => {
  const mitAsset = { ...KAND, image_type: 'generated_cached' as const }
  const ohne = { ...KAND, visual_key: 'x--y--z--kombi', image_type: 'generic_fallback' as const }
  const items = fehlendeBilder([mitAsset, ohne])
  assert.equal(items.length, 1)
  assert.equal(items[0].visual_key, 'x--y--z--kombi')
  assert.equal(items[0].karosserie, 'limousine')  // erste Karosserieklasse
})
test('Bild: resolveImageUrl — /api/ -> Backend-Origin, /cars/ -> verbatim', () => {
  assert.equal(resolveImageUrl('/api/v1/autofinder/img/a--b', 'http://be:8000'), 'http://be:8000/api/v1/autofinder/img/a--b')
  assert.equal(resolveImageUrl('/cars/autofinder/a--b.webp', 'http://be:8000'), '/cars/autofinder/a--b.webp')
  assert.equal(resolveImageUrl('https://cdn/x.webp', 'http://be:8000'), 'https://cdn/x.webp')
})
test('Bild: View zieht fehlende Bilder über den separaten Endpunkt nach + zeigt Skeleton', () => {
  assert.match(viewTsx, /apiAutoFinderImagesEnsure/)
  assert.match(viewTsx, /fehlendeBilder\(r\.kandidaten\)/)
  assert.match(viewTsx, /Fahrzeugdarstellungen werden vorbereitet/)   // Progress-Schritt 5
  assert.match(cardTsx, /Fahrzeugdarstellung wird vorbereitet/)        // Skeleton-Text
  assert.match(cardTsx, /imagePending/)
  assert.match(cardTsx, /zeigeSkeleton/)
})
test('Bild: der API-Client schluckt Ensure-Fehler (Karte fällt aufs Symbolbild zurück)', () => {
  const fn = clientTs.slice(clientTs.indexOf('export async function apiAutoFinderImagesEnsure'))
  assert.match(fn.slice(0, 700), /catch\s*\{[\s\S]*return \[\]/)
  assert.match(fn.slice(0, 700), /images\/ensure/)
})
test('Bild: der Such-Client-Call und der Ensure-Call sind getrennte Endpunkte', () => {
  assert.match(clientTs, /\$\{BASE_URL\}\/api\/v1\/autofinder`/)              // Suche
  assert.match(clientTs, /\$\{BASE_URL\}\/api\/v1\/autofinder\/images\/ensure`/) // Bild-On-Demand
})

// ── Suchhistorie (§Punkt 5) ──────────────────────────────────────────────
import { ladeSuchen, speichereSuche, loescheSuchen } from './logic.ts'

test('History P/Q/R/S: speichern, max 20, Reload-Persistenz, Restore', () => {
  // frische, isolierte localStorage-Simulation
  const store: Record<string, string> = {}
  ;(globalThis as Record<string, unknown>).localStorage = {
    getItem: (k: string) => (k in store ? store[k] : null),
    setItem: (k: string, v: string) => { store[k] = String(v) },
    removeItem: (k: string) => { delete store[k] },
  }
  loescheSuchen()
  assert.deepEqual(ladeSuchen(), [])
  // P) Suche gespeichert
  const f1 = form({ karosserie: ['kombi'], kraftstoff: ['Benzin'], budget_max: '25000' })
  const after1 = speichereSuche(f1, resp())
  assert.equal(after1.length, 1)
  assert.match(after1[0].label, /Kombi/)
  // R) Reload -> weiterhin da
  assert.equal(ladeSuchen().length, 1)
  // Q) max 20
  for (let i = 0; i < 30; i++) speichereSuche(form({ marken_bevorzugt: `M${i}` }), resp())
  assert.ok(ladeSuchen().length <= 20)
  // S) Restore: die gespeicherte form ist vollständig wiederherstellbar
  const s = ladeSuchen()[0]
  assert.deepEqual(Object.keys(s.form).sort(), Object.keys(EMPTY_FORM).sort())
  assert.equal(s.fahrzeuge[0].user_fit, 91)
})
test('History: sucheLabel ist menschenlesbar', () => {
  assert.match(sucheLabel(form({ karosserie: ['kombi'], kraftstoff: ['Benzin'], budget_max: '25000' })),
    /Kombi.*Benzin.*bis 25\.000 €/)
  assert.equal(sucheLabel(EMPTY_FORM), 'Alle Fahrzeuge')
})
test('History: View hat eine "Letzte Suchen"-Ansicht mit Öffnen/Löschen', () => {
  assert.match(viewTsx, /Letzte Suchen/)
  assert.match(viewTsx, /restoreSuche/)
  assert.match(viewTsx, /Verlauf löschen/)
  assert.match(viewTsx, /speichereSuche\(f, r\)/)
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
