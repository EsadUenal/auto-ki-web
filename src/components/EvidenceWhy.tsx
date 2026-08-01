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
// Rückruf-Betroffenheit — nutzerverständlich, getrennt von Datenqualität/Schweregrad.
const APPLICABILITY_LABEL: Record<string, string> = {
  exakt: 'Betrifft dein Fahrzeug',
  wahrscheinlich: 'Betrifft dein Fahrzeug wahrscheinlich',
  unklar: 'Betroffenheit unklar — FIN prüfen',
}
const APPLICABILITY_CLS: Record<string, string> = {
  exakt: 'bg-amber-100 text-amber-800',
  wahrscheinlich: 'bg-amber-50 text-amber-700',
  unklar: 'bg-gray-100 text-gray-600',
}
function fmtEur(n?: number | null): string {
  return n == null ? '—' : `${n.toLocaleString('de-DE')} €`
}

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

// Marktvergleich 2.0 — ehrliche Darstellung: verwertete Vergleichszahl, Median,
// typischer Marktbereich, Angebot-vs-Markt. KEINE allgemeine Suchseite als
// "Vergleichsfahrzeug"; die Beobachtungen sind aus Web-Snippets extrahierte
// Preis-Datenpunkte (mit ihrer Recherche-Domain), keine Fake-Einzelinserate.
function MarktanalysePanel({ m }: { m: NonNullable<Insight['marktanalyse']> }) {
  if (!m.median_eur) return null
  const kat: string[] = []
  if (m.anzahl_sehr_aehnlich) kat.push(`${m.anzahl_sehr_aehnlich} sehr ähnlich`)
  if (m.anzahl_aehnlich) kat.push(`${m.anzahl_aehnlich} ähnlich`)
  if (m.anzahl_bedingt) kat.push(`${m.anzahl_bedingt} bedingt`)
  const diffPos = (m.differenz_eur ?? 0) >= 0
  return (
    <div className="mt-2.5 rounded-lg bg-[#faf8f5] border border-[#eee7dd] p-2.5 space-y-1.5">
      <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
        <div>
          <span className="text-gray-400">Ausgewertet: </span>
          <span className="text-gray-700 font-medium">{m.verwendet} vergleichbare</span>
          {kat.length > 0 && <span className="text-gray-500"> ({kat.join(' · ')})</span>}
        </div>
        <div>
          <span className="text-gray-400">Median: </span>
          <span className="text-gray-900 font-semibold">{fmtEur(m.median_eur)}</span>
        </div>
        {m.spanne_min_eur != null && m.spanne_max_eur != null && (
          <div className="col-span-2">
            <span className="text-gray-400">Typischer Marktbereich: </span>
            <span className="text-gray-700 font-medium">
              {m.spanne_min_eur.toLocaleString('de-DE')}–{fmtEur(m.spanne_max_eur)}
            </span>
          </div>
        )}
        {m.angebot_eur != null && m.differenz_eur != null && (
          <div className="col-span-2">
            <span className="text-gray-400">Angebot ggü. Median: </span>
            <span className={diffPos ? 'text-orange-700 font-medium' : 'text-green-700 font-medium'}>
              {diffPos ? '+' : '−'}{Math.abs(m.differenz_eur).toLocaleString('de-DE')} €
              {m.differenz_pct != null && ` (${diffPos ? '+' : '−'}${Math.abs(m.differenz_pct).toFixed(1)} %)`}
            </span>
          </div>
        )}
      </div>
      {m.quellen_domains?.length > 0 && (
        <p className="text-[10px] text-gray-400 leading-snug">
          Datenbasis: Preisangaben aus {m.quellen_domains.join(', ')} — aus Web-Suchergebnissen
          extrahierte Vergleichspreise, keine einzeln geprüften Inserate.
        </p>
      )}
    </div>
  )
}

function EvidenceCard({ insight }: { insight: Insight }) {
  const conf = CONFIDENCE_LABEL[insight.confidence?.toLowerCase()] ?? insight.confidence
  const sev = insight.schweregrad
    ? (SCHWEREGRAD_LABEL[insight.schweregrad.toLowerCase()] ?? insight.schweregrad)
    : null
  const appKey = insight.applicability?.toLowerCase()
  const appLabel = appKey ? APPLICABILITY_LABEL[appKey] : null

  return (
    <div className="bg-white border border-[#e6e1da] rounded-xl p-3.5">
      <div className="flex items-start gap-2">
        <span className="mt-0.5 shrink-0">{kategorieIcon(insight.kategorie)}</span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-gray-900">{insight.titel}</p>
          {appLabel && (
            <span className={`inline-block mt-1 px-1.5 py-0.5 rounded text-[10px] font-medium ${APPLICABILITY_CLS[appKey!] ?? 'bg-gray-100 text-gray-600'}`}>
              {appLabel}
            </span>
          )}
          {insight.beschreibung && (
            <p className="text-xs text-gray-600 mt-0.5 leading-relaxed">{insight.beschreibung}</p>
          )}
          {insight.marktanalyse && <MarktanalysePanel m={insight.marktanalyse} />}
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
