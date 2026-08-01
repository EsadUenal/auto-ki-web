import { useState } from 'react'
import {
  HelpCircle, ChevronDown, AlertTriangle, ShieldAlert, Wrench, TrendingUp, Globe,
} from 'lucide-react'
import type { Insight, EvidenceQuelle } from '../types'

/**
 * Phase 1 — sichtbare Provenance. Dezenter "Warum?"-Toggle, der AUSSCHLIESSLICH
 * die übergebenen Insights zeigt (bereits nach den evidence_ids gefiltert).
 * Standard: eingeklappt. Wird von Kauf- UND Verkaufscheck genutzt.
 *
 * Regeln: nutzerfreundliche Quellennamen (keine internen Typen), keine Fake-Links
 * (nur echte URLs sind klickbar), Schweregrad und Datenqualität getrennt.
 */

// Nur existierende Insights zu den gegebenen IDs — Fake-/fehlende IDs erzeugen keinen
// Eintrag; fehlende insights/ids (alte Checks) ergeben eine leere Liste.
export function insightsByIds(insights: Insight[] | undefined, ids: string[] | undefined): Insight[] {
  if (!insights?.length || !ids?.length) return []
  const set = new Set(ids)
  return insights.filter((i) => set.has(i.id))
}

// Interne Evidence-IDs gehören in die *_evidence_ids-Felder, nicht in den sichtbaren
// Bericht. Manche Modelle streuen sie dennoch in den Fließtext ("(Evidence-ID:
// [schwachstelle-1])"). Rein für die ANZEIGE herausfiltern — keine technischen
// internen Namen im UI (Analyse-Daten selbst bleiben unberührt).
export function stripEvidenceIds(text: string): string {
  if (!text) return text
  return text
    .replace(/\s*\(Evidence[-\s]?IDs?:[^)]*\)/gi, '')
    .replace(
      /\s*\[(?:(?:schwachstelle|rueckruf|motorproblem|marktvergleich)-\d+)(?:\s*,\s*(?:schwachstelle|rueckruf|motorproblem|marktvergleich)-\d+)*\]/gi,
      '',
    )
}

const QUELLE_LABEL: Record<string, string> = {
  datenbank: 'VIRA-Datenbank',
  rueckruf_kba: 'KBA-Rückrufdaten',
  motorvarianten: 'Motor-Daten',
  web: 'Webrecherche',
  marktvergleich: 'Marktvergleich',
}
const CONFIDENCE_LABEL: Record<string, string> = { hoch: 'Hoch', mittel: 'Mittel', niedrig: 'Niedrig' }
const SCHWEREGRAD_LABEL: Record<string, string> = { hoch: 'Hoch', mittel: 'Mittel', gering: 'Gering' }

function kategorieIcon(kategorie: string) {
  switch (kategorie) {
    case 'rueckruf':      return <ShieldAlert size={15} className="text-amber-600" />
    case 'schwachstelle': return <AlertTriangle size={15} className="text-amber-600" />
    case 'motorproblem':  return <Wrench size={15} className="text-orange-600" />
    case 'marktvergleich': return <TrendingUp size={15} className="text-blue-600" />
    default:              return <HelpCircle size={15} className="text-gray-500" />
  }
}

function safeHostname(url: string): string {
  try { return new URL(url).hostname } catch { return url }
}

function Quelle({ q }: { q: EvidenceQuelle }) {
  // Echte URL -> klickbar. Sonst NIE einen Link erfinden.
  if (q.url && q.url.startsWith('http')) {
    return (
      <a
        href={q.url}
        target="_blank"
        rel="noopener noreferrer"
        className="inline-flex items-center gap-1 text-blue-600 hover:underline break-all"
      >
        <Globe size={11} className="shrink-0" />
        {q.titel || safeHostname(q.url)}
      </a>
    )
  }
  if (q.typ === 'rueckruf_kba') {
    return <span>KBA-Rückrufdaten{q.ref ? ` · Referenz ${q.ref}` : ''}</span>
  }
  return <span>{QUELLE_LABEL[q.typ] ?? 'VIRA-Datenbank'}</span>
}

function EvidenceCard({ insight }: { insight: Insight }) {
  const conf = CONFIDENCE_LABEL[insight.confidence?.toLowerCase()] ?? insight.confidence
  const sev = insight.schweregrad
    ? (SCHWEREGRAD_LABEL[insight.schweregrad.toLowerCase()] ?? insight.schweregrad)
    : null

  return (
    <div className="bg-white border border-[#e6e1da] rounded-xl p-3.5">
      <div className="flex items-start gap-2">
        <span className="mt-0.5 shrink-0">{kategorieIcon(insight.kategorie)}</span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-gray-900">{insight.titel}</p>
          {insight.beschreibung && (
            <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">{insight.beschreibung}</p>
          )}
          <div className="mt-2 space-y-0.5 text-[11px] text-gray-500">
            <p>
              <span className="text-gray-400">Quelle: </span>
              {insight.quellen.length
                ? insight.quellen.map((q, i) => (
                    <span key={i}>
                      {i > 0 && ', '}
                      <Quelle q={q} />
                    </span>
                  ))
                : 'VIRA-Datenbank'}
            </p>
            {sev && (
              <p><span className="text-gray-400">Schweregrad: </span>{sev}</p>
            )}
            <p><span className="text-gray-400">Datenqualität: </span>{conf}</p>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function EvidenceWhy({
  label = 'Warum diese Einschätzung?',
  insights,
}: {
  label?: string
  insights: Insight[]
}) {
  const [open, setOpen] = useState(false)
  if (!insights.length) return null   // keine Evidence -> Element gar nicht anzeigen

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-gray-800 transition-colors"
      >
        <HelpCircle size={13} className="shrink-0" />
        <span>{label}</span>
        <ChevronDown size={13} className={`shrink-0 transition-transform ${open ? '' : '-rotate-90'}`} />
      </button>

      {open && (
        <div className="mt-2 space-y-2">
          {insights.map((i) => (
            <EvidenceCard key={i.id} insight={i} />
          ))}
        </div>
      )}
    </div>
  )
}
