import type { Insight, KeyFinding } from '../types'
import EvidenceWhy, { insightsByIds } from './EvidenceWhy'

/**
 * Phase 2 — "Das solltest du wissen". Kompakte, ruhige Verdichtung der maximal 5
 * wichtigsten Kern-Erkenntnisse (backend-deterministisch). Position: NACH dem
 * wichtigsten Ergebnisbereich, VOR dem langen Detailbericht.
 *
 * Regeln: keine Angstmache (vier abgestufte Stufen), bestehendes VIRA-Design,
 * "Warum?" über die bestehende EvidenceWhy-Komponente (keine zweite Quellen-UI).
 * Alte Checks ohne key_findings -> Bereich wird gar nicht gerendert.
 */

// Ruhige, abgestufte Farbgebung — ein geringer Hinweis sieht NICHT aus wie ein Alarm.
const STUFE_STYLE: Record<string, { card: string; accent: string; badge: string; label: string }> = {
  kritisch: {
    card: 'bg-red-50/60 border-red-200',
    accent: 'text-red-700',
    badge: 'bg-red-100 text-red-700',
    label: 'Wichtig',
  },
  warnung: {
    card: 'bg-amber-50/60 border-amber-200',
    accent: 'text-amber-700',
    badge: 'bg-amber-100 text-amber-700',
    label: 'Beachten',
  },
  chance: {
    card: 'bg-emerald-50/50 border-emerald-200',
    accent: 'text-emerald-700',
    badge: 'bg-emerald-100 text-emerald-700',
    label: 'Pluspunkt',
  },
  info: {
    card: 'bg-white border-[#e6e1da]',
    accent: 'text-gray-600',
    badge: 'bg-gray-100 text-gray-600',
    label: 'Info',
  },
}

function FindingCard({
  finding, insights, shownInsightIds,
}: {
  finding: KeyFinding
  insights: Insight[]
  shownInsightIds: Set<string>
}) {
  const style = STUFE_STYLE[finding.stufe] ?? STUFE_STYLE.info
  const evidenceInsights = insightsByIds(insights, finding.evidence_ids)
  // §29: Insights, die bereits in einer eigenständigen "Warum"-Karte weiter oben auf
  // der Seite stehen (Preisstrategie/Verkaufsstrategie), hier NICHT nochmal komplett
  // rendern — nur ein kurzer Verweis, damit der Beleg trotzdem sichtbar bleibt, ohne
  // die identische Marktvergleichs-Karte ein drittes Mal zu zeigen.
  const neueInsights = evidenceInsights.filter((i) => !shownInsightIds.has(i.id))
  const alleBereitsGezeigt = evidenceInsights.length > 0 && neueInsights.length === 0

  return (
    <div className={`rounded-xl border p-4 ${style.card}`}>
      <div className="flex items-start gap-3">
        {finding.icon && <span className="text-lg leading-none mt-0.5 shrink-0">{finding.icon}</span>}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className={`text-sm font-semibold ${style.accent}`}>{finding.titel}</p>
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${style.badge}`}>
              {style.label}
            </span>
          </div>

          {finding.wert && (
            <p className={`mt-1 text-base font-bold tracking-tight ${style.accent}`}>{finding.wert}</p>
          )}

          <p className="mt-1 text-xs text-gray-600 leading-relaxed">{finding.beschreibung}</p>

          {finding.aktion && (
            <p className="mt-1.5 text-xs text-gray-700">
              <span className="font-medium">→ </span>{finding.aktion}
            </p>
          )}

          {neueInsights.length > 0 && (
            <div className="mt-2">
              <EvidenceWhy label="Warum?" insights={neueInsights} />
            </div>
          )}
          {alleBereitsGezeigt && (
            <p className="mt-2 text-[11px] text-gray-400">Begründung siehe oben.</p>
          )}
        </div>
      </div>
    </div>
  )
}

export default function KeyFindings({
  findings,
  insights,
  shownInsightIds,
}: {
  findings: KeyFinding[] | undefined
  insights: Insight[] | undefined
  // §29: IDs der Insights, die bereits in eigenständigen "Warum"-Blöcken weiter oben
  // (Preis-/Strategie-/Argument-Begründung) gerendert wurden. Optional — alte
  // Aufrufstellen ohne diese Prop verhalten sich wie zuvor (keine Deduplizierung).
  shownInsightIds?: Set<string>
}) {
  if (!findings?.length) return null // alte Checks / kein Befund -> nichts rendern

  return (
    <div className="space-y-2.5">
      <p className="text-[11px] font-bold tracking-[0.22em] uppercase text-[#a49c92]">Das solltest du wissen</p>
      <div className="grid gap-2.5 sm:grid-cols-2">
        {findings.map((f) => (
          <FindingCard key={f.id} finding={f} insights={insights ?? []} shownInsightIds={shownInsightIds ?? new Set()} />
        ))}
      </div>
    </div>
  )
}
