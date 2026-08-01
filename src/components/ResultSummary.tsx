import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { stripEvidenceIds } from './EvidenceWhy'
import type { Insight, KeyFinding, Marktanalyse } from '../types'

/**
 * Phase 3 — Informationshierarchie. Reine Darstellungs-Bausteine, die ausschließlich
 * BEREITS vorhandene strukturierte Daten (Marktanalyse, Insights, Key Findings)
 * kompakter anordnen. KEINE neuen Fakten, KEINE Fake-Scores, keine Backend-Logik.
 */

// ── Helfer ───────────────────────────────────────────────────────────────────

export function marktanalyseOf(insights: Insight[] | undefined): Marktanalyse | undefined {
  return insights?.find((i) => i.kategorie === 'marktvergleich')?.marktanalyse ?? undefined
}

function eur(n?: number | null): string {
  return n == null ? '–' : `${n.toLocaleString('de-DE')} €`
}

const QUALI_LABEL: Record<string, string> = { hoch: 'Hoch', mittel: 'Mittel', niedrig: 'Niedrig' }

// Ruhige, abgestufte Töne — bewusst zurückhaltend, kein Ampel-Gaming.
type Tone = 'gut' | 'mittel' | 'pruefen' | 'hoch' | 'unklar'
const TONE: Record<Tone, { text: string; dot: string }> = {
  gut: { text: 'text-emerald-700', dot: 'bg-emerald-500' },
  mittel: { text: 'text-amber-700', dot: 'bg-amber-500' },
  pruefen: { text: 'text-amber-700', dot: 'bg-amber-500' },
  hoch: { text: 'text-orange-700', dot: 'bg-orange-500' },
  unklar: { text: 'text-gray-500', dot: 'bg-gray-300' },
}

// ── Kennzahl (Label + Wert) ──────────────────────────────────────────────────

function Metric({ label, value, tone }: { label: string; value: React.ReactNode; tone?: 'amber' }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400">{label}</p>
      <p className={`text-sm font-semibold mt-0.5 break-words ${tone === 'amber' ? 'text-amber-700' : 'text-gray-900'}`}>
        {value}
      </p>
    </div>
  )
}

/**
 * Kompakte Markt-Kennzahlen für den Kauf-Entscheidungsbereich: Angebotspreis,
 * Marktspanne, Marktmedian, Abweichung, Datenqualität. Nur Werte anzeigen, die
 * wirklich vorhanden sind (kein Median -> keine Median-/Abweichungszeile).
 */
export function MarketMetrics({
  marktpreisMin,
  marktpreisMax,
  marktanalyse,
}: {
  marktpreisMin?: number | null
  marktpreisMax?: number | null
  marktanalyse?: Marktanalyse
}) {
  const ma = marktanalyse
  const hatSpanne = marktpreisMin != null || marktpreisMax != null
  const hatMedian = ma?.median_eur != null
  if (!ma?.angebot_eur && !hatSpanne && !hatMedian) return null

  const pct = ma?.differenz_pct
  const abweichung =
    hatMedian && pct != null
      ? `${pct <= 0 ? '↓' : '↑'} ca. ${Math.abs(pct).toFixed(1).replace('.', ',')} % ${pct <= 0 ? 'unter' : 'über'} Median`
      : null
  const q = (ma?.datenqualitaet ?? '').toLowerCase()
  const qualiLabel = QUALI_LABEL[q] ?? null

  return (
    <div className="mt-4 pt-4 border-t border-black/5 grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-3">
      {ma?.angebot_eur != null && <Metric label="Angebotspreis" value={eur(ma.angebot_eur)} />}
      {hatSpanne && (
        <Metric
          label="Marktspanne"
          value={`${marktpreisMin?.toLocaleString('de-DE') ?? '?'}–${eur(marktpreisMax)}`}
        />
      )}
      {hatMedian && <Metric label="Marktmedian" value={eur(ma!.median_eur)} />}
      {abweichung && <Metric label="Abweichung" value={abweichung} tone={pct != null && pct >= 8 ? 'amber' : undefined} />}
      {qualiLabel && (
        <Metric label="Datenqualität" value={qualiLabel} tone={q === 'niedrig' ? 'amber' : undefined} />
      )}
    </div>
  )
}

// ── Verkauf: Markt-Kennzahlen (Median + Datenqualität) ───────────────────────

export function VerkaufMarketMetrics({ marktanalyse }: { marktanalyse?: Marktanalyse }) {
  const ma = marktanalyse
  if (!ma || (ma.median_eur == null && !ma.datenqualitaet)) return null
  const q = (ma.datenqualitaet ?? '').toLowerCase()
  const qualiLabel = QUALI_LABEL[q] ?? null
  return (
    <div className="mt-4 pt-4 border-t border-[#efe9e0] grid grid-cols-2 gap-x-4 gap-y-3">
      {ma.median_eur != null && <Metric label="Marktmedian" value={eur(ma.median_eur)} />}
      {qualiLabel && (
        <Metric label="Datenqualität" value={qualiLabel} tone={q === 'niedrig' ? 'amber' : undefined} />
      )}
    </div>
  )
}

// ── Risikoübersicht (Kauf) — deterministisch, "Unklar" ohne Datenbasis ───────

type RiskRow = { k: string; label: string; tone: Tone }

function computeRiskRows(
  insights: Insight[],
  ma: Marktanalyse | undefined,
  baureiheErkannt: string | null | undefined,
  preisBewertung: string | undefined,
): RiskRow[] {
  const has = (kat: string) => insights.filter((i) => i.kategorie === kat)
  const rueckrufe = has('rueckruf')
  const relevantRecalls = rueckrufe.filter((i) => ['exakt', 'wahrscheinlich'].includes((i.applicability ?? '').toLowerCase()))
  const unclearRecalls = rueckrufe.filter((i) => (i.applicability ?? '').toLowerCase() === 'unklar')
  const schwHoch = has('schwachstelle').filter((i) => ['hoch', 'kritisch', 'sehr hoch'].includes((i.schweregrad ?? '').toLowerCase()))
  const schwMittel = has('schwachstelle').filter((i) => ['mittel', 'moderat'].includes((i.schweregrad ?? '').toLowerCase()))
  const motorprobleme = has('motorproblem')
  const hatProfil = !!baureiheErkannt

  // Technik
  let technik: RiskRow
  if (!hatProfil) technik = { k: 'Technik', label: 'Unklar', tone: 'unklar' }
  else if (motorprobleme.length || schwHoch.length) technik = { k: 'Technik', label: 'Erhöht', tone: 'hoch' }
  else if (schwMittel.length) technik = { k: 'Technik', label: 'Mittel', tone: 'mittel' }
  else technik = { k: 'Technik', label: 'Gering', tone: 'gut' }

  // Rückrufe
  let recalls: RiskRow
  if (relevantRecalls.length) recalls = { k: 'Rückrufe', label: 'Prüfen', tone: 'pruefen' }
  else if (unclearRecalls.length) recalls = { k: 'Rückrufe', label: 'Zu prüfen', tone: 'mittel' }
  else if (hatProfil) recalls = { k: 'Rückrufe', label: 'Keine', tone: 'gut' }
  else recalls = { k: 'Rückrufe', label: 'Unklar', tone: 'unklar' }

  // Preis
  let preis: RiskRow
  if (ma?.median_eur != null && ma.differenz_pct != null) {
    const p = ma.differenz_pct
    if (p <= -8) preis = { k: 'Preis', label: 'Gut', tone: 'gut' }
    else if (p >= 8) preis = { k: 'Preis', label: 'Hoch', tone: 'hoch' }
    else preis = { k: 'Preis', label: 'Marktgerecht', tone: 'gut' }
  } else {
    const pb = (preisBewertung ?? '').toLowerCase()
    if (['guenstig', 'extrem_guenstig'].includes(pb)) preis = { k: 'Preis', label: 'Gut', tone: 'gut' }
    else if (['teuer', 'extrem_teuer'].includes(pb)) preis = { k: 'Preis', label: 'Hoch', tone: 'hoch' }
    else if (pb === 'marktgerecht') preis = { k: 'Preis', label: 'Marktgerecht', tone: 'gut' }
    else preis = { k: 'Preis', label: 'Unklar', tone: 'unklar' }
  }

  // Datenlage
  let daten: RiskRow
  const q = (ma?.datenqualitaet ?? '').toLowerCase()
  if (q === 'hoch') daten = { k: 'Datenlage', label: 'Gut', tone: 'gut' }
  else if (q === 'mittel') daten = { k: 'Datenlage', label: 'Mittel', tone: 'mittel' }
  else if (q === 'niedrig') daten = { k: 'Datenlage', label: 'Niedrig', tone: 'mittel' }
  else daten = { k: 'Datenlage', label: 'Unklar', tone: 'unklar' }

  return [technik, recalls, preis, daten]
}

export function RiskOverview({
  insights,
  marktanalyse,
  baureiheErkannt,
  preisBewertung,
}: {
  insights: Insight[] | undefined
  marktanalyse?: Marktanalyse
  baureiheErkannt?: string | null
  preisBewertung?: string
}) {
  // Alte Checks ohne strukturierte Insights: keinen (leeren) Dashboard-Bereich zeigen.
  if (!insights?.length) return null
  const rows = computeRiskRows(insights, marktanalyse, baureiheErkannt, preisBewertung)

  return (
    <div className="bg-white border border-[#e6e1da] rounded-2xl p-5 shadow-[0_16px_36px_-24px_rgba(40,25,10,0.28)]">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Risikoübersicht</p>
      <div className="grid grid-cols-2 gap-x-6 gap-y-2.5">
        {rows.map((r) => (
          <div key={r.k} className="flex items-center justify-between gap-3">
            <span className="text-sm text-gray-600">{r.k}</span>
            <span className={`inline-flex items-center gap-1.5 text-sm font-medium ${TONE[r.tone].text}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${TONE[r.tone].dot}`} />
              {r.label}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── "Was jetzt?" — konkrete nächste Schritte aus vorhandenen Key Findings ────

export function NextSteps({ findings }: { findings: KeyFinding[] | undefined }) {
  // Nur echte, bereits vorhandene Handlungsempfehlungen (finding.aktion) — dedupliziert,
  // in Prioritätsreihenfolge, max. 4. Keine erfundenen Schritte.
  const schritte: string[] = []
  for (const f of findings ?? []) {
    const a = f.aktion?.trim()
    if (a && !schritte.includes(a)) schritte.push(a)
    if (schritte.length >= 4) break
  }
  if (!schritte.length) return null

  return (
    <div className="bg-white border border-[#e6e1da] rounded-2xl p-5 shadow-[0_16px_36px_-24px_rgba(40,25,10,0.28)]">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-3">Was jetzt?</p>
      <ol className="space-y-2">
        {schritte.map((s, i) => (
          <li key={i} className="flex items-start gap-2.5 text-sm text-gray-700">
            <span className="shrink-0 mt-0.5 w-5 h-5 rounded-full bg-gray-100 text-gray-500 text-xs font-semibold flex items-center justify-center">
              {i + 1}
            </span>
            <span className="leading-relaxed">{s}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}

// ── Detailbericht — standardmäßig eingeklappt, Inhalt UNVERÄNDERT ────────────

export function CollapsibleReport({ bericht, title }: { bericht: string; title: string }) {
  const [open, setOpen] = useState(false)
  if (!bericht) return null

  return (
    <div className="bg-white border border-[#e6e1da] rounded-2xl shadow-[0_16px_36px_-24px_rgba(40,25,10,0.28)] overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="w-full flex items-center justify-between gap-3 px-6 py-4 text-left hover:bg-[#faf7f3]/60 transition-colors"
      >
        <span className="text-sm font-medium text-gray-700">
          {open ? 'Vollständige Analyse ausblenden' : title}
        </span>
        <ChevronDown size={17} className={`shrink-0 text-gray-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="px-6 pb-6 pt-1 border-t border-[#efe9e0]">
          <div className="chat-prose">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{stripEvidenceIds(bericht)}</ReactMarkdown>
          </div>
        </div>
      )}
    </div>
  )
}
