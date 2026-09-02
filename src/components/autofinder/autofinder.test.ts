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
  hatEchtesBild,
  waehleImageReady,
  aktualisiereGespeicherteBilder,
  resolveImageUrl,
  buildKaufCheckPrefill,
  sucheLabel,
  MAX_CARDS,
  KAUFCHECK_ROUTE,
  type AutoFinderForm,
  type AutoFinderKandidat,
  type AutoFinderResponse,
  type ImageEnsureResult,
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

test('L/M: buildKaufCheckPrefill übernimmt Marke/Modell/Generation/Motor/Baujahr/Leistung/Karosserie/IDs', () => {
  const pf = buildKaufCheckPrefill(KAND)
  assert.equal(pf.marke, 'BMW')
  assert.equal(pf.modell, '3er')
  assert.equal(pf.generation, 'G20')
  assert.equal(pf.motor, '320d')
  assert.equal(pf.baujahr, 2019)
  assert.equal(pf.quelle, 'autofinder')
  assert.equal(pf.kraftstoff, 'Diesel')
  assert.equal(pf.leistung_ps, 190)
  assert.equal(pf.karosserie, 'limousine')
  assert.equal(pf.baureihe_id, 'bmw-3er-g20')
  assert.equal(pf.variante_id, 'bmw-3er-g20-320d')
})

// ── BUG 1: Prefill-Flow — returnTo + spät löschen ─────────────────────────
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
test('Bild: View zieht fehlende Bilder VOR dem Anzeigen nach (Progress-State)', () => {
  assert.match(viewTsx, /apiAutoFinderImagesEnsure/)
  assert.match(viewTsx, /fehlendeBilder\(r\.kandidaten\)/)
  assert.match(viewTsx, /Fahrzeugdarstellungen werden vorbereitet/)   // Progress-Schritt 5
  // das finale Result-Set wird EINMAL gesetzt (nach dem ensure), nicht vorher
  assert.match(viewTsx, /const finale = waehleImageReady\(r\.kandidaten, ensureResults, API_BASE_URL\)/)
  assert.match(viewTsx, /setResp\(finalResp\)/)
})
test('Bild: der API-Client schluckt Ensure-Fehler', () => {
  const fn = clientTs.slice(clientTs.indexOf('export async function apiAutoFinderImagesEnsure'))
  assert.match(fn.slice(0, 700), /catch\s*\{[\s\S]*return \[\]/)
  assert.match(fn.slice(0, 700), /images\/ensure/)
})
test('Bild: der Such-Client-Call und der Ensure-Call sind getrennte Endpunkte', () => {
  assert.match(clientTs, /\$\{BASE_URL\}\/api\/v1\/autofinder`/)              // Suche
  assert.match(clientTs, /\$\{BASE_URL\}\/api\/v1\/autofinder\/images\/ensure`/) // Bild-On-Demand
})

// ── FIX 3: Image-Guarantee — kein Symbolbild in finalen AutoFinder-Ergebnissen ──
const erg = (over: Partial<ImageEnsureResult> & { visual_key: string }): ImageEnsureResult => ({
  status: 'generated', image_url: `/api/v1/autofinder/img/${over.visual_key}`,
  image_type: 'generated_cached', ai_generated: true, ...over,
})
const poolKand = (vk: string, image_type: AutoFinderKandidat['image_type'], image_url = ''): AutoFinderKandidat =>
  ({ ...KAND, candidate_id: vk, variante_id: vk, visual_key: vk, image_type, image_url })

test('K: Kandidat mit gecachtem Bild wird direkt übernommen (kein ensure nötig)', () => {
  const k = poolKand('a', 'curated', '/cars/autofinder/a.webp')
  assert.ok(hatEchtesBild(k))
  const out = waehleImageReady([k], [], 'http://be:8000')
  assert.equal(out.length, 1)
  assert.equal(out[0].image_url, '/cars/autofinder/a.webp')
})
test('L: Kandidat ohne Bild landet als ensure-Item im Nachzieh-Batch', () => {
  const k = poolKand('b', 'generic_fallback')
  assert.equal(hatEchtesBild(k), false)
  assert.deepEqual(fehlendeBilder([k]).map((i) => i.visual_key), ['b'])
})
test('M: erst QA-Fail, dann Erfolg -> Kandidat bleibt im finalen Set', () => {
  const k = poolKand('c', 'generic_fallback')
  // 2. Versuch erfolgreich -> ensure liefert status "generated"
  const out = waehleImageReady([k], [erg({ visual_key: 'c', status: 'generated' })], 'http://be:8000')
  assert.equal(out.length, 1)
  assert.equal(out[0].image_type, 'generated_cached')
  assert.match(out[0].image_url, /^http:\/\/be:8000\/api\/v1\/autofinder\/img\/c$/)
})
test('N: zweimal fehlgeschlagen -> Kandidat wird NICHT final angezeigt', () => {
  const k = poolKand('d', 'generic_fallback')
  const out = waehleImageReady([k], [erg({ visual_key: 'd', status: 'failed', image_url: null })], 'http://be:8000')
  assert.equal(out.length, 0)
})
test('O: nächster qualifizierter Kandidat rückt für einen bildlosen nach', () => {
  const pool = [
    poolKand('p1', 'curated', '/cars/p1.webp'),
    poolKand('p2', 'generic_fallback'),                 // scheitert
    poolKand('p3', 'curated', '/cars/p3.webp'),
    poolKand('p4', 'curated', '/cars/p4.webp'),
    poolKand('p5', 'curated', '/cars/p5.webp'),
    poolKand('p6', 'curated', '/cars/p6.webp'),         // Nachrücker
  ]
  const out = waehleImageReady(pool, [erg({ visual_key: 'p2', status: 'failed', image_url: null })], 'http://be:8000')
  assert.equal(out.length, MAX_CARDS)
  assert.deepEqual(out.map((k) => k.visual_key), ['p1', 'p3', 'p4', 'p5', 'p6'])
})
test('P/Q: das finale Set enthält ausschließlich echte Bilder, kein generic_fallback', () => {
  const pool = [
    poolKand('q1', 'generic_fallback'),
    poolKand('q2', 'curated', '/cars/q2.webp'),
    poolKand('q3', 'generic_fallback'),
  ]
  const out = waehleImageReady(pool, [erg({ visual_key: 'q1' })], 'http://be:8000')
  assert.ok(out.every((k) => k.image_type === 'curated' || k.image_type === 'generated_cached'))
  assert.ok(out.every((k) => !!k.image_url))
  assert.ok(out.every((k) => k.image_type !== 'generic_fallback'))
})
test('R: weniger als 5 bildfertige -> weniger Resultate, KEIN Symbolbild aufgefüllt', () => {
  const pool = [
    poolKand('r1', 'curated', '/cars/r1.webp'),
    poolKand('r2', 'generic_fallback'),   // scheitert, kein ensure-Ergebnis
    poolKand('r3', 'generic_fallback'),   // scheitert
  ]
  const out = waehleImageReady(pool, [], 'http://be:8000')
  assert.equal(out.length, 1)
  assert.equal(out[0].visual_key, 'r1')
})
test('R: die View zeigt bei 0 bildfertigen einen kontrollierten Hinweis, keine leere Stille', () => {
  assert.match(viewTsx, /finale\.length === 0 && r\.kandidaten\.length > 0/)
  assert.match(viewTsx, /keine Fahrzeugdarstellung/)
})
test('S: der zweite gleiche ensure-Aufruf nutzt den Backend-Cache (status "ready")', () => {
  // "ready" (aus dem Manifest, ohne Neu-Generierung) zählt genauso als bildfertig
  const k = poolKand('s1', 'generic_fallback')
  const out = waehleImageReady([k], [erg({ visual_key: 's1', status: 'ready' })], 'http://be:8000')
  assert.equal(out.length, 1)
})
test('T: History-Restore lädt on-demand-Bilder frisch aus dem aktuellen Cache', async () => {
  const gespeichert: AutoFinderResponse = resp({
    kandidaten: [
      poolKand('t1', 'generated_cached', 'http://alt:8000/api/v1/autofinder/img/t1'),
      poolKand('t2', 'curated', '/cars/t2.webp'),
    ],
  })
  let gefragt: string[] = []
  const fakeEnsure = async (items: { visual_key: string }[]) => {
    gefragt = items.map((i) => i.visual_key)
    return [erg({ visual_key: 't1', status: 'ready', image_url: '/api/v1/autofinder/img/t1' })]
  }
  const upd = await aktualisiereGespeicherteBilder(gespeichert, fakeEnsure as never, 'http://neu:9000')
  assert.deepEqual(gefragt, ['t1'])                 // nur on-demand-Keys, nicht das kuratierte t2
  assert.ok(upd)
  assert.equal(upd!.kandidaten[0].image_url, 'http://neu:9000/api/v1/autofinder/img/t1')
  assert.equal(upd!.kandidaten[1].image_url, '/cars/t2.webp')   // kuratiert unangetastet
})
test('T: die View ruft beim Restore aktualisiereGespeicherteBilder auf', () => {
  assert.match(viewTsx, /aktualisiereGespeicherteBilder\(s\.response, apiAutoFinderImagesEnsure, API_BASE_URL\)/)
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
  assert.match(s, /renderCheckSection\('Kauf-Check', ShoppingCart, 'text-blue-400', kaufChecks, 'kauf'\)/)
  assert.match(s, /const kaufChecks = checks\.filter\(\(c\) => c\.typ === 'kauf'\)\.slice\(0, HISTORY_SIDEBAR_MAX\)/)
})
test('Sidebar C: eigener Verkaufs-Check-Historie-Bereich', () => {
  const s = sidebarSrc()
  assert.match(s, /renderCheckSection\('Verkaufs-Check', TrendingUp, 'text-green-400', verkaufChecks, 'verkauf'\)/)
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
  // Delete nutzt den bestehenden Callback (keine neue Produktlogik)
  assert.match(s, /onClick=\{\(e\) => \{ e\.stopPropagation\(\); onDeleteCheck\(check\.id\) \}\}/)
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
