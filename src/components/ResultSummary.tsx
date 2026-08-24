import { useEffect, useState } from 'react'
import { ChevronDown, RefreshCw, SearchX, Loader2 } from 'lucide-react'
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

// ── Fortschrittsstatus während der (vertiefenden) Marktrecherche (§14) ───────
// Der Check läuft als EIN Request; während VIRA die Recherche bis zur Qualitäts-
// schwelle vertieft, zeigen wir rotierende, ehrliche Status-Texte statt eines
// stummen Spinners. Kein voreiliges "fertig".

const DEEPENING_MESSAGES = [
  'VIRA durchsucht den Gebrauchtwagenmarkt …',
  'Vergleichbare Angebote werden gesammelt …',
  'VIRA erweitert die Marktrecherche …',
  'Weitere Vergleichsangebote werden geprüft …',
  'Preisdaten werden validiert …',
  'Marktwert und Preisbewertung werden berechnet …',
]

export function DeepeningStatus() {
  const [i, setI] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % DEEPENING_MESSAGES.length), 2600)
    return () => clearInterval(t)
  }, [])
  return (
    <div className="mt-6 flex items-center gap-2.5 text-sm text-gray-500" aria-live="polite">
      <Loader2 size={15} className="shrink-0 animate-spin text-gray-400" />
      <span className="transition-opacity">{DEEPENING_MESSAGES[i]}</span>
    </div>
  )
}

// ── Research-Failure (§4/§14): kein niedriges Ergebnis, Kontingent NICHT verbraucht ──

export function ResearchFailedCard({
  nachricht,
  onRetry,
  loading,
}: {
  nachricht?: string
  onRetry: () => void
  loading?: boolean
}) {
  return (
    <div id="kauf-result" className="mt-10">
      <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-6 sm:p-7 shadow-[0_16px_36px_-24px_rgba(40,25,10,0.28)]">
        <div className="flex items-start gap-3.5">
          <span className="shrink-0 mt-0.5 flex h-10 w-10 items-center justify-center rounded-xl bg-amber-100 text-amber-700">
            <SearchX size={20} />
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-amber-700/80 mb-1">
              Noch kein belastbares Ergebnis
            </p>
            <h3 className="text-lg font-bold text-amber-900 leading-tight">
              VIRA konnte keinen zuverlässigen Marktwert ermitteln
            </h3>
            <p className="mt-2 text-sm leading-relaxed text-amber-900/90">
              {nachricht ||
                'Für dieses Fahrzeug liegen aktuell zu wenige wirklich vergleichbare Angebote vor, um einen belastbaren Marktwert und eine verlässliche Preisbewertung zu erstellen.'}
            </p>
            <div className="mt-3 inline-flex items-center gap-2 rounded-lg bg-white/70 px-3 py-1.5 text-xs font-semibold text-emerald-700">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Dieser Check wurde nicht abgeschlossen — dein Kontingent bleibt erhalten.
            </div>
            <div className="mt-5">
              <button
                type="button"
                onClick={onRetry}
                disabled={loading}
                className="inline-flex items-center gap-2 rounded-xl bg-amber-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-amber-700 disabled:opacity-60"
              >
                <RefreshCw size={15} className={loading ? 'animate-spin' : ''} />
                {loading ? 'Recherche läuft …' : 'Erneut versuchen'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

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
