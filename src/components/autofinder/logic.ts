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
}

export interface AutoFinderResponse {
  status: 'ok' | 'no_internal_match'
  kandidaten: AutoFinderKandidat[]
  total_candidates_considered: number
  filters_applied: Record<string, unknown>
  warnings: string[]
  data_scope_hint: string
}

export const MAX_CARDS = 5

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

// ── KaufCheck-CTA (§ PRIO 9) ────────────────────────────────────────────────
// Additive Navigation OHNE Änderung der eingefrorenen KaufCheck-Logik: der
// KaufCheck liest KEINE Query-Parameter (das würde KaufCheckView ändern), also
// navigieren wir nur auf die Route. Ein späteres echtes Prefill braucht eine
// separate, ausdrücklich beauftragte KaufCheckView-Erweiterung.
export const KAUFCHECK_ROUTE = '/kaufcheck'
