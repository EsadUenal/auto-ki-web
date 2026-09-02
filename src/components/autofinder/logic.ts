// AutoFinder — framework-freie Logik (Payload-Bau, Ableitungen, Fehlertexte).
//
// Diese Datei importiert bewusst NICHTS aus React oder dem API-Client: sie ist
// die einzige Stelle mit fachlicher Logik und wird direkt per `node --test`
// geprüft (src/components/autofinder/autofinder.test.ts). Alles Fachliche kommt
// aus der Backend-Antwort — das Frontend erfindet keine Fahrzeugdaten und
// insbesondere KEINE Preise (siehe AGENTS.md "Data Safety").

// ── Backend-Vertrag (POST /api/v1/autofinder) ────────────────────────────────
// Enum-Werte 1:1 aus dem Backend (app/autofinder_norm.py, app/autofinder.py).
// Case-insensitiv im Backend, wir senden die kanonische Schreibweise.

export const KAROSSERIE_OPTIONS = [
  { value: 'kleinwagen', label: 'Kleinwagen' },
  { value: 'kompakt', label: 'Kompakt' },
  { value: 'limousine', label: 'Limousine' },
  { value: 'kombi', label: 'Kombi' },
  { value: 'suv', label: 'SUV' },
  { value: 'van', label: 'Van' },
  { value: 'coupe', label: 'Coupé' },
  { value: 'cabrio', label: 'Cabrio' },
  { value: 'pickup', label: 'Pickup' },
] as const

export const KRAFTSTOFF_OPTIONS = [
  { value: 'Benzin', label: 'Benzin' },
  { value: 'Diesel', label: 'Diesel' },
  { value: 'Elektro', label: 'Elektro' },
  { value: 'Mild-Hybrid', label: 'Mild-Hybrid' },
  { value: 'Plug-in-Hybrid', label: 'Plug-in-Hybrid' },
] as const

export const GETRIEBE_OPTIONS = [
  { value: 'manuell', label: 'Manuell' },
  { value: 'automatik', label: 'Automatik' },
] as const

export const ANTRIEB_OPTIONS = [
  { value: 'Front', label: 'Frontantrieb' },
  { value: 'Heck', label: 'Heckantrieb' },
  { value: 'Allrad', label: 'Allrad' },
] as const

export const NUTZUNG_OPTIONS = [
  { value: 'stadt', label: 'Überwiegend Stadt' },
  { value: 'gemischt', label: 'Gemischt' },
  { value: 'langstrecke', label: 'Viel Langstrecke' },
] as const

// Prioritäten: Backend wertet in Runde 3 nur sportlich/sparsam/fahranfaenger
// wirklich aus; praktisch/komfortabel/familie werden entgegengenommen, aber
// (noch) nicht gewichtet. Wir zeigen alle sechs, markieren die (noch) nicht
// wirksamen aber ehrlich NICHT als Fake — sie sind gültige Vertragsfelder.
export const PRIO_OPTIONS = [
  { key: 'sportlich', label: 'Sportlich', wirksam: true },
  { key: 'sparsam', label: 'Sparsam', wirksam: true },
  { key: 'fahranfaenger', label: 'Für Fahranfänger', wirksam: true },
  { key: 'praktisch', label: 'Praktisch', wirksam: false },
  { key: 'komfortabel', label: 'Komfortabel', wirksam: false },
  { key: 'familie', label: 'Familie', wirksam: false },
] as const

export type PrioKey = (typeof PRIO_OPTIONS)[number]['key']

export interface AutoFinderForm {
  budget_min: string
  budget_max: string
  baujahr_von: string
  baujahr_bis: string
  kilometer_max: string
  marken_bevorzugt: string
  marken_ausschliessen: string
  karosserie: string[]
  kraftstoff: string[]
  getriebe: string[]
  antrieb: string[]
  leistung_min_ps: string
  leistung_max_ps: string
  nutzung: string
  km_pro_jahr: string
  sportlich: boolean
  sparsam: boolean
  fahranfaenger: boolean
  praktisch: boolean
  komfortabel: boolean
  familie: boolean
}

export const EMPTY_FORM: AutoFinderForm = {
  budget_min: '', budget_max: '', baujahr_von: '', baujahr_bis: '', kilometer_max: '',
  marken_bevorzugt: '', marken_ausschliessen: '',
  karosserie: [], kraftstoff: [], getriebe: [], antrieb: [],
  leistung_min_ps: '', leistung_max_ps: '', nutzung: '', km_pro_jahr: '',
  sportlich: false, sparsam: false, fahranfaenger: false,
  praktisch: false, komfortabel: false, familie: false,
}

export interface AutoFinderPayload {
  budget_min?: number
  budget_max?: number
  baujahr_von?: number
  baujahr_bis?: number
  kilometer_max?: number
  marken_bevorzugt?: string[]
  marken_ausschliessen?: string[]
  karosserie?: string[]
  kraftstoff?: string[]
  getriebe?: string[]
  antrieb?: string[]
  leistung_min_ps?: number
  leistung_max_ps?: number
  nutzung?: string
  km_pro_jahr?: number
  sportlich?: boolean
  sparsam?: boolean
  fahranfaenger?: boolean
  praktisch?: boolean
  komfortabel?: boolean
  familie?: boolean
}

function toInt(raw: string): number | undefined {
  const t = raw.trim()
  if (!t) return undefined
  const n = Number(t.replace(/[.\s]/g, ''))
  return Number.isFinite(n) && n >= 0 ? Math.round(n) : undefined
}

function toList(raw: string): string[] {
  return raw
    .split(/[,\n;]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 20) // Backend: _AUTOFINDER_MAX_LISTE
}

/** Baut den Backend-Request. Leere Felder werden weggelassen (nicht als null
 *  gesendet), damit die Pydantic-Defaults greifen. */
export function buildPayload(form: AutoFinderForm): AutoFinderPayload {
  const p: AutoFinderPayload = {}
  const bmin = toInt(form.budget_min)
  const bmax = toInt(form.budget_max)
  if (bmin !== undefined) p.budget_min = bmin
  if (bmax !== undefined) p.budget_max = bmax
  const bjv = toInt(form.baujahr_von)
  const bjb = toInt(form.baujahr_bis)
  if (bjv !== undefined) p.baujahr_von = bjv
  if (bjb !== undefined) p.baujahr_bis = bjb
  const kmMax = toInt(form.kilometer_max)
  if (kmMax !== undefined) p.kilometer_max = kmMax

  const mb = toList(form.marken_bevorzugt)
  const ma = toList(form.marken_ausschliessen)
  if (mb.length) p.marken_bevorzugt = mb
  if (ma.length) p.marken_ausschliessen = ma
  if (form.karosserie.length) p.karosserie = [...form.karosserie]
  if (form.kraftstoff.length) p.kraftstoff = [...form.kraftstoff]
  if (form.getriebe.length) p.getriebe = [...form.getriebe]
  if (form.antrieb.length) p.antrieb = [...form.antrieb]

  const lmin = toInt(form.leistung_min_ps)
  const lmax = toInt(form.leistung_max_ps)
  if (lmin !== undefined) p.leistung_min_ps = lmin
  if (lmax !== undefined) p.leistung_max_ps = lmax

  if (form.nutzung) p.nutzung = form.nutzung
  const kmJ = toInt(form.km_pro_jahr)
  if (kmJ !== undefined) p.km_pro_jahr = kmJ

  for (const prio of PRIO_OPTIONS) {
    if (form[prio.key]) p[prio.key] = true
  }
  return p
}

/** Clientseitige Vorprüfung — spiegelt die Backend-model_validator-Regeln,
 *  damit der Nutzer eine freundliche Meldung VOR dem Request bekommt. */
export function validateForm(form: AutoFinderForm): string | null {
  const p = buildPayload(form)
  if (p.budget_min !== undefined && p.budget_max !== undefined && p.budget_min > p.budget_max)
    return 'Das Mindestbudget darf nicht über dem Maximalbudget liegen.'
  if (p.leistung_min_ps !== undefined && p.leistung_max_ps !== undefined && p.leistung_min_ps > p.leistung_max_ps)
    return 'Die minimale Leistung darf nicht über der maximalen liegen.'
  if (p.baujahr_von !== undefined && p.baujahr_bis !== undefined && p.baujahr_von > p.baujahr_bis)
    return 'Das Baujahr „von“ darf nicht nach dem Baujahr „bis“ liegen.'
  return null
}

// ── Antwort-Typen (1:1 aus app/models.py AutoFinderKandidatOut / -Response) ──

export interface AutoFinderKandidat {
  candidate_id: string
  baureihe_id: string | null
  variante_id: string | null
  marke: string
  modell: string
  generation: string | null
  motor: string
  baujahr_von: number | null
  baujahr_bis: number | null
  leistung_ps: number | null
  kraftstoff: string
  getriebe: string[]
  antrieb: string | null
  karosserie: string[]
  match_score: number
  datenqualitaet: number
  match_gruende: string[]
  trade_offs: string[]
  budget_status: 'IN_BUDGET' | 'NEAR_BUDGET' | 'OUT_OF_BUDGET' | 'UNKNOWN'
  budget_confidence: 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN'
  base_match_score: number | null
  budget_adjustment: number
  source_type: 'internal_db' | 'web_discovered'
  visual_key: string
  source_urls: string[]
  evidence_count: number
  discovery_confidence: string
  web_verified_fields: string[]
  market_price_min: number | null
  market_price_max: number | null
  market_price_median: number | null
  market_data_quality: string | null
  market_sample_size: number | null
  image_url: string
  image_type: 'curated' | 'generated_cached' | 'generic_fallback'
  image_confidence: string
  ai_generated: boolean

  // Quality-Enrichment-Runde
  user_fit: number               // 0..99, im UI die Passungs-%; >= 80
  user_fit_gruende: string[]
  why_fits: string[]
  known_points: string[]
  enrichment_status: 'ok' | 'fallback' | 'unavailable'
  estimated_price_min: number | null
  estimated_price_max: number | null
  price_confidence: 'HIGH' | 'MEDIUM' | 'LOW' | 'UNKNOWN'
}

export interface AutoFinderResponse {
  status: 'ok' | 'no_internal_match' | 'no_strong_match'
  kandidaten: AutoFinderKandidat[]
  total_candidates_considered: number
  filters_applied: Record<string, unknown>
  warnings: string[]
  data_scope_hint: string
  enrichment_notice: string | null
}

export const MAX_CARDS = 5

// ── Bild-On-Demand (§Punkt 1) ──────────────────────────────────────────────

export interface ImageEnsureItem {
  visual_key: string
  marke: string
  modell: string
  generation: string | null
  karosserie: string
  baujahr_von: number | null
  baujahr_bis: number | null
}

export interface ImageEnsureResult {
  visual_key: string
  status: 'ready' | 'generated' | 'failed'
  image_url: string | null
  image_type: string | null
  ai_generated: boolean
}

/** Kandidat hat bereits ein echtes VIRA-Line-Art-Bild — kuratiert oder on-demand
 *  gecacht. KEIN generisches Symbolbild / keine Karosserie-Silhouette. */
export function hatEchtesBild(k: Pick<AutoFinderKandidat, 'image_type' | 'image_url'>): boolean {
  return !!k.image_url && (k.image_type === 'curated' || k.image_type === 'generated_cached')
}

/** Ein Ensure-Item aus einem Kandidaten bauen (für den On-Demand-Endpunkt). */
export function alsEnsureItem(k: AutoFinderKandidat): ImageEnsureItem {
  return {
    visual_key: k.visual_key,
    marke: k.marke,
    modell: k.modell,
    generation: k.generation,
    karosserie: k.karosserie[0] ?? 'unbekannt',
    baujahr_von: k.baujahr_von,
    baujahr_bis: k.baujahr_bis,
  }
}

/** Kandidaten, deren Bild noch nachgezogen werden muss (kein echtes KI-Asset). */
export function fehlendeBilder(kandidaten: AutoFinderKandidat[]): ImageEnsureItem[] {
  return kandidaten.filter((k) => !hatEchtesBild(k) && k.visual_key).map(alsEnsureItem)
}

/** image_url aus dem Backend richtig auflösen: `/api/…` -> Backend-Origin,
 *  `/cars/…` (Starter-Library) -> Frontend-Origin (verbatim). */
export function resolveImageUrl(url: string, apiBase: string): string {
  if (!url) return ''
  if (/^https?:\/\//.test(url)) return url
  if (url.startsWith('/api/')) return apiBase.replace(/\/$/, '') + url
  return url
}

// ── Image-Guarantee (FIX 3) — kein Symbolbild in finalen AutoFinder-Ergebnissen ──
// Das Backend liefert einen etwas größeren qualifizierten Pool (alle >= Fit-
// Schwelle). Hier wird daraus das finale Set gebaut: nur Kandidaten mit echtem
// Line-Art-Bild — von Anfang an vorhanden ODER frisch erfolgreich erzeugt.
// Kandidaten ohne verwendbares Bild (auch nach dem 2-Versuch-ensure) fallen raus,
// der nächste geeignete Kandidat rückt nach. Reihenfolge = Backend-Ranking.

export function waehleImageReady(
  kandidaten: AutoFinderKandidat[],
  ensure: ImageEnsureResult[],
  apiBase: string,
): AutoFinderKandidat[] {
  const byKey = new Map(ensure.map((e) => [e.visual_key, e]))
  const out: AutoFinderKandidat[] = []
  for (const k of kandidaten) {
    if (out.length >= MAX_CARDS) break
    if (hatEchtesBild(k)) {
      out.push({ ...k, image_url: resolveImageUrl(k.image_url, apiBase) })
      continue
    }
    const hit = k.visual_key ? byKey.get(k.visual_key) : undefined
    if (hit && (hit.status === 'ready' || hit.status === 'generated') && hit.image_url) {
      out.push({
        ...k,
        image_url: resolveImageUrl(hit.image_url, apiBase),
        image_type: 'generated_cached',
        ai_generated: hit.ai_generated,
      })
    }
    // sonst: Kandidat wird NICHT final angezeigt (kein echtes Bild verfügbar)
  }
  return out
}

/** FIX 3 / §8: beim Öffnen einer gespeicherten Suche die on-demand-Bilder frisch
 *  aus dem aktuellen Cache/Manifest auflösen — nie einen alten Symbolbild-Snapshot
 *  erzwingen. Kuratierte Bilder bleiben unangetastet. `ensure` wird injiziert
 *  (diese Datei bleibt api-client-frei). Rückgabe: aktualisierte Antwort oder
 *  null, wenn nichts nachzuladen war. */
export async function aktualisiereGespeicherteBilder(
  resp: AutoFinderResponse,
  ensure: (items: ImageEnsureItem[]) => Promise<ImageEnsureResult[]>,
  apiBase: string,
): Promise<AutoFinderResponse | null> {
  const nachladen = resp.kandidaten.filter(
    (k) => k.visual_key && k.image_type === 'generated_cached',
  )
  if (nachladen.length === 0) return null
  let results: ImageEnsureResult[] = []
  try {
    results = await ensure(nachladen.map(alsEnsureItem))
  } catch {
    return null
  }
  if (results.length === 0) return null
  const byKey = new Map(results.map((e) => [e.visual_key, e]))
  return {
    ...resp,
    kandidaten: resp.kandidaten.map((k) => {
      const hit = byKey.get(k.visual_key)
      if (hit && (hit.status === 'ready' || hit.status === 'generated') && hit.image_url) {
        return { ...k, image_url: resolveImageUrl(hit.image_url, apiBase) }
      }
      return k
    }),
  }
}

// ── Bild-Disclosure (§ PRIO 6/10) ───────────────────────────────────────────

/** Pflichttext unter dem Bild — abhängig vom image_type des Backends.
 *  `generated_cached` / KI-Asset -> "KI-generierte Modelldarstellung"
 *  `generic_fallback`           -> "Symbolbild"
 *  `curated` (echtes Foto)      -> kein Zusatztext */
export function imageDisclosure(k: Pick<AutoFinderKandidat, 'image_type' | 'ai_generated'>): string | null {
  if (k.image_type === 'generated_cached' || k.ai_generated) return 'KI-generierte Modelldarstellung'
  if (k.image_type === 'generic_fallback') return 'Symbolbild'
  return null
}

// ── "So findest du dieses Auto" (§ PRIO 8) ──────────────────────────────────
// NUR Werte, die der Nutzer bei mobile.de / AutoScout24 selbst eintippen kann.
// KEINE Portal-API, KEIN Scraping, KEINE Links, KEIN erfundener Marktpreis.

export interface SuchWert {
  label: string
  value: string
}

const KAROSSERIE_LABEL: Record<string, string> = Object.fromEntries(
  KAROSSERIE_OPTIONS.map((o) => [o.value, o.label]),
)

export function marketplaceFilters(k: AutoFinderKandidat): SuchWert[] {
  const out: SuchWert[] = []
  if (k.marke) out.push({ label: 'Marke', value: k.marke })
  if (k.modell) out.push({ label: 'Modell', value: k.modell })
  if (k.generation) out.push({ label: 'Generation / Baureihe', value: k.generation })

  // Baujahr-Spanne nur aus belegten Backend-Feldern.
  if (k.baujahr_von && k.baujahr_bis) out.push({ label: 'Erstzulassung', value: `${k.baujahr_von}–${k.baujahr_bis}` })
  else if (k.baujahr_von) out.push({ label: 'Erstzulassung ab', value: String(k.baujahr_von) })

  if (k.motor) out.push({ label: 'Motor / Ausführung', value: k.motor })
  if (k.leistung_ps) out.push({ label: 'Leistung ab', value: `${k.leistung_ps} PS` })
  if (k.kraftstoff) out.push({ label: 'Kraftstoff', value: k.kraftstoff })
  if (k.getriebe.length) {
    out.push({
      label: 'Getriebe',
      value: k.getriebe.map((g) => (g === 'automatik' ? 'Automatik' : g === 'manuell' ? 'Schaltgetriebe' : g)).join(' / '),
    })
  }
  const karo = k.karosserie.map((c) => KAROSSERIE_LABEL[c] ?? c)
  if (karo.length) out.push({ label: 'Fahrzeugtyp', value: karo.join(' / ') })
  if (k.antrieb) out.push({ label: 'Antriebsart', value: k.antrieb })

  // Bewusst KEIN Preisfilter: das Backend liefert keinen belastbaren Marktpreis
  // (market_price_* immer null), also erfinden wir keinen. Siehe PRIO 8.
  return out
}

// ── Coverage / Fehlerzustände (§ PRIO 5 / PRIO 11 N+O) ──────────────────────

export interface CoverageState {
  kind: 'ok' | 'low' | 'none'
  headline: string
  detail: string
}

export function coverageState(resp: AutoFinderResponse): CoverageState {
  if (resp.status === 'no_strong_match') {
    return {
      kind: 'none',
      headline: 'Kein wirklich starker Treffer',
      detail:
        'Zu deinen Angaben gibt es aktuell keine Empfehlung, die richtig gut passt (mindestens 80 % Übereinstimmung). ' +
        'Versuche es mit weniger oder etwas weiteren Filtern — z. B. Budget, Baujahr oder Karosserie.',
    }
  }
  if (resp.status === 'no_internal_match' || resp.kandidaten.length === 0) {
    return {
      kind: 'none',
      headline: 'Noch kein passender Treffer',
      detail:
        'Für diese Kombination hat die VIRA-Vorauswahl aktuell kein passendes Fahrzeug gefunden. ' +
        'Versuche es mit weniger Filtern oder einer größeren Budget-/Baujahr-Spanne.',
    }
  }
  const lowHint = resp.warnings.find((w) => w.toLowerCase().includes('wenige'))
  if (lowHint) {
    return { kind: 'low', headline: 'Kleine Auswahl', detail: lowHint }
  }
  return { kind: 'ok', headline: '', detail: '' }
}

// ── Preisorientierung (§Punkt 3) — KI-Schätzung, NIE "Marktpreis" ──────────

const PRICE_CONF_LABEL: Record<string, string> = {
  HIGH: 'grobe Orientierung',
  MEDIUM: 'grobe Orientierung',
  LOW: 'sehr grobe Orientierung — bitte großzügig einplanen',
  UNKNOWN: '',
}

export function formatPriceRange(k: Pick<AutoFinderKandidat, 'estimated_price_min' | 'estimated_price_max' | 'price_confidence'>):
  { range: string; hint: string } | null {
  if (k.estimated_price_min == null || k.estimated_price_max == null) return null
  const fmt = (n: number) => n.toLocaleString('de-DE')
  const conf = PRICE_CONF_LABEL[k.price_confidence] ?? ''
  return {
    range: `ca. ${fmt(k.estimated_price_min)}–${fmt(k.estimated_price_max)} €`,
    hint: `KI-Schätzung · keine Live-Marktdaten${conf ? ` · ${conf}` : ''}`,
  }
}

// ── Suchhistorie (§Punkt 5) — nur localStorage, max 20, kein Account ───────

const HISTORY_KEY = 'vira.autofinder.searches'
const HISTORY_MAX = 20
export const HISTORY_SIDEBAR_MAX = 5
/** Custom-Event, damit die Sidebar (anderer Komponentenbaum) sofort auf
 *  gespeicherte/gelöschte Suchen reagiert — ohne Prop-Drilling/Context. */
export const HISTORY_EVENT = 'vira:af-history'

export interface GespeicherteSuche {
  id: string
  ts: number
  label: string
  form: AutoFinderForm
  fahrzeuge: { titel: string; user_fit: number; visual_key: string }[]
  /** Vollständige Antwort — damit "gespeicherte Suche öffnen" die Ergebnisse
   *  SOFORT zeigt, ohne einen neuen Gemini-Call (§Punkt 6). Bei sehr großem
   *  Storage wird sie beim Speichern für ältere Einträge verworfen. */
  response?: AutoFinderResponse
}

function fireHistoryEvent() {
  try { window.dispatchEvent(new CustomEvent(HISTORY_EVENT)) } catch { /* SSR/Tests */ }
}

export function sucheLabel(form: AutoFinderForm): string {
  const teile: string[] = []
  const karo = form.karosserie.map((c) => KAROSSERIE_LABEL[c] ?? c)
  if (karo.length) teile.push(karo.slice(0, 2).join('/'))
  if (form.kraftstoff.length) teile.push(form.kraftstoff.slice(0, 2).join('/'))
  if (form.getriebe.length) teile.push(form.getriebe.map((g) => (g === 'automatik' ? 'Automatik' : 'Schalt')).join('/'))
  const bmax = form.budget_max.trim()
  if (bmax) teile.push(`bis ${Number(bmax.replace(/[.\s]/g, '')).toLocaleString('de-DE')} €`)
  else if (form.budget_min.trim()) teile.push(`ab ${Number(form.budget_min.replace(/[.\s]/g, '')).toLocaleString('de-DE')} €`)
  if (form.nutzung) teile.push(NUTZUNG_OPTIONS.find((n) => n.value === form.nutzung)?.label ?? form.nutzung)
  return teile.length ? teile.join(' · ') : 'Alle Fahrzeuge'
}

export function ladeSuchen(): GespeicherteSuche[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY)
    if (!raw) return []
    const arr = JSON.parse(raw)
    return Array.isArray(arr) ? (arr as GespeicherteSuche[]).slice(0, HISTORY_MAX) : []
  } catch {
    return []
  }
}

/** Behält die vollständige `response` nur für die jüngsten Einträge (Storage-
 *  Budget); ältere Einträge behalten nur Label + Fahrzeugliste. */
const RESPONSE_KEEP = 8

export function speichereSuche(form: AutoFinderForm, resp: AutoFinderResponse): GespeicherteSuche[] {
  const eintrag: GespeicherteSuche = {
    id: (typeof crypto !== 'undefined' && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now()),
    ts: Date.now(),
    label: sucheLabel(form),
    form,
    fahrzeuge: resp.kandidaten.map((k) => ({
      titel: [k.marke, k.modell].filter(Boolean).join(' '),
      user_fit: Number.isFinite(k.user_fit) ? k.user_fit : 0,
      visual_key: k.visual_key ?? '',
    })),
    response: resp,
  }
  const bestehend = ladeSuchen().filter((s) => s.label !== eintrag.label)
  let neu = [eintrag, ...bestehend].slice(0, HISTORY_MAX)
    .map((s, i) => (i < RESPONSE_KEEP ? s : { ...s, response: undefined }))
  try {
    localStorage.setItem(HISTORY_KEY, JSON.stringify(neu))
  } catch {
    // Speicher voll: erst die eingebetteten Antworten opfern, dann kürzen.
    try {
      neu = neu.map((s) => ({ ...s, response: undefined })).slice(0, 10)
      localStorage.setItem(HISTORY_KEY, JSON.stringify(neu))
    } catch { /* Historie ist ein Bonus, kein Muss */ }
  }
  fireHistoryEvent()
  return neu
}

export function findeSuche(id: string): GespeicherteSuche | null {
  return ladeSuchen().find((s) => s.id === id) ?? null
}

export function loescheSuchen(): void {
  try { localStorage.removeItem(HISTORY_KEY) } catch { /* egal */ }
  fireHistoryEvent()
}

// Übergabe "diese gespeicherte Suche öffnen" von der Sidebar an die
// AutoFinder-Seite (frischer Mount bei Routewechsel -> sessionStorage).
const RESTORE_KEY = 'vira.autofinder.restore-id'
/** Damit die AutoFinder-Seite auch dann reagiert, wenn sie bereits offen ist
 *  (navigate('/autofinder') auf sich selbst remountet nicht). */
export const RESTORE_EVENT = 'vira:af-restore'

export function stageSucheRestore(id: string): void {
  try {
    sessionStorage.setItem(RESTORE_KEY, id)
    window.dispatchEvent(new CustomEvent(RESTORE_EVENT))
  } catch { /* egal */ }
}

export function takeSucheRestore(): GespeicherteSuche | null {
  try {
    const id = sessionStorage.getItem(RESTORE_KEY)
    if (!id) return null
    sessionStorage.removeItem(RESTORE_KEY)
    return findeSuche(id)
  } catch {
    return null
  }
}

/** Menschliche Fehlermeldung — trennt Backend-/Netzausfall von echten Fehlern
 *  (AGENTS.md "Externe Ausfälle getrennt berichten"). */
export function humanError(err: unknown): string {
  const msg = err instanceof Error ? err.message : String(err ?? '')
  if (/failed to fetch|networkerror|load failed|verbindung/i.test(msg))
    return 'Der VIRA-Server ist gerade nicht erreichbar. Bitte versuche es in einem Moment noch einmal.'
  if (/\b(429|rate)\b/i.test(msg))
    return 'Gerade sind viele Anfragen unterwegs. Bitte warte kurz und versuche es erneut.'
  if (/\b5\d\d\b/.test(msg))
    return 'Beim Suchen ist auf dem Server etwas schiefgelaufen. Bitte versuche es erneut.'
  if (/\b422\b/.test(msg) || /ist kein bekannter wert|darf nicht/i.test(msg))
    return 'Eine Eingabe wurde nicht akzeptiert. Bitte prüfe die Filter und versuche es erneut.'
  return 'Die Suche ist fehlgeschlagen. Bitte versuche es erneut.'
}

// ── KaufCheck-CTA + Prefill (§Punkt 4) ─────────────────────────────────────
// Additiv: NUR das KaufCheck-FORMULAR wird vorbefüllt. Auswertung, Credits,
// Preislogik, Trust, Backend, Freeze-Logik bleiben unangetastet. Übergabe via
// sessionStorage — überlebt den Login-Zwischenschritt eines anonymen Nutzers
// (Navigation-State ginge beim Redirect verloren).
export const KAUFCHECK_ROUTE = '/kaufcheck'
const KAUFCHECK_PREFILL_KEY = 'vira.kaufcheck.prefill'
/** Wohin nach erfolgreichem Login zurückspringen (LoginView liest das). */
export const RETURN_TO_KEY = 'vira.returnTo'

export interface KaufCheckPrefill {
  marke: string
  modell: string
  motor: string
  baujahr: number | null
  quelle: 'autofinder'
  generation: string | null
  kraftstoff: string
  getriebe: string
  leistung_ps: number | null
  karosserie: string
  baureihe_id: string | null
  variante_id: string | null
}

export function buildKaufCheckPrefill(k: AutoFinderKandidat): KaufCheckPrefill {
  return {
    marke: k.marke,
    modell: k.modell,
    motor: k.motor,
    baujahr: k.baujahr_von,
    quelle: 'autofinder',
    generation: k.generation,
    kraftstoff: k.kraftstoff,
    getriebe: k.getriebe.map((g) => (g === 'automatik' ? 'Automatik' : g === 'manuell' ? 'Schaltgetriebe' : g)).join(' / '),
    leistung_ps: k.leistung_ps,
    karosserie: k.karosserie.join(' / '),
    baureihe_id: k.baureihe_id,
    variante_id: k.variante_id,
  }
}

/** Vom AutoFinder-CTA aufgerufen: Prefill + Rücksprungziel merken, DANN erst
 *  navigieren (der Aufrufer macht die Navigation). */
export function stageKaufCheckPrefill(k: AutoFinderKandidat): void {
  try {
    sessionStorage.setItem(KAUFCHECK_PREFILL_KEY, JSON.stringify(buildKaufCheckPrefill(k)))
    sessionStorage.setItem(RETURN_TO_KEY, KAUFCHECK_ROUTE)
  } catch { /* privat / voll -> CTA navigiert trotzdem, nur ohne Prefill */ }
}

/** Prefill NUR LESEN — nicht löschen. KaufCheckView löscht erst NACH der
 *  erfolgreichen Übernahme via `clearKaufCheckPrefill()` (nie beim CTA, beim
 *  Login oder beim Redirect). */
export function readKaufCheckPrefill(): KaufCheckPrefill | null {
  try {
    const raw = sessionStorage.getItem(KAUFCHECK_PREFILL_KEY)
    if (!raw) return null
    const p = JSON.parse(raw)
    if (p && typeof p === 'object' && p.quelle === 'autofinder') return p as KaufCheckPrefill
    return null
  } catch {
    return null
  }
}

export function clearKaufCheckPrefill(): void {
  try { sessionStorage.removeItem(KAUFCHECK_PREFILL_KEY) } catch { /* egal */ }
}

/** LoginView / Guard: Rücksprungziel setzen bzw. abholen (+ löschen). */
export function setReturnTo(path: string): void {
  try {
    if (path && path !== '/login') sessionStorage.setItem(RETURN_TO_KEY, path)
  } catch { /* egal */ }
}

export function takeReturnTo(): string | null {
  try {
    const p = sessionStorage.getItem(RETURN_TO_KEY)
    if (p) sessionStorage.removeItem(RETURN_TO_KEY)
    return p && p !== '/login' ? p : null
  } catch {
    return null
  }
}
