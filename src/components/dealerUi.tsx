import type { DealerStatus, DealerTriage } from '../types'

/**
 * Phase 5 — gemeinsame Dealer-UI-Bausteine: Label-/Farbzuordnung für Status und
 * Triage-Signale (KEIN Fake-Score) sowie Geldformatierung. Fehlende Werte -> "–".
 */

export function fmtEur(n?: number | null): string {
  return n == null ? '–' : `${n.toLocaleString('de-DE')} €`
}

export function fmtKm(n?: number | null): string {
  return n == null ? '–' : `${n.toLocaleString('de-DE')} km`
}

// Marge mit Vorzeichen/Farbe: negativ = rot, positiv = grün, null = grau "–".
export function margeClass(n?: number | null): string {
  if (n == null) return 'text-gray-400'
  if (n < 0) return 'text-red-600'
  return 'text-emerald-700'
}

export const STATUS_META: Record<DealerStatus, { label: string; cls: string; dot: string }> = {
  beobachtung:     { label: 'Beobachtung',     cls: 'bg-gray-100 text-gray-600',       dot: 'bg-gray-400' },
  einkauf_geplant: { label: 'Einkauf geplant', cls: 'bg-blue-100 text-blue-700',        dot: 'bg-blue-500' },
  im_bestand:      { label: 'Im Bestand',      cls: 'bg-emerald-100 text-emerald-700',  dot: 'bg-emerald-500' },
  verkauft:        { label: 'Verkauft',        cls: 'bg-purple-100 text-purple-700',    dot: 'bg-purple-500' },
}

export const STATUS_OPTIONS: { value: DealerStatus; label: string }[] = [
  { value: 'beobachtung', label: 'Beobachtung' },
  { value: 'einkauf_geplant', label: 'Einkauf geplant' },
  { value: 'im_bestand', label: 'Im Bestand' },
  { value: 'verkauft', label: 'Verkauft' },
]

const EMPF_META: Record<string, { label: string; cls: string }> = {
  kaufen:         { label: 'Kaufen',         cls: 'text-emerald-700' },
  nach_pruefung:  { label: 'Nach Prüfung',   cls: 'text-amber-700' },
  vorsicht:       { label: 'Vorsicht',       cls: 'text-orange-700' },
  nicht_empfohlen:{ label: 'Nicht empfohlen',cls: 'text-red-700' },
  unklar:         { label: 'Unklar',         cls: 'text-gray-400' },
}
const PREIS_META: Record<string, { label: string; cls: string }> = {
  guenstig:    { label: 'Günstig',      cls: 'text-emerald-700' },
  marktgerecht:{ label: 'Marktgerecht', cls: 'text-gray-600' },
  teuer:       { label: 'Teuer',        cls: 'text-orange-700' },
  unklar:      { label: 'Unklar',       cls: 'text-gray-400' },
}
const RISIKO_META: Record<string, { label: string; cls: string }> = {
  gering:  { label: 'Gering',  cls: 'text-emerald-700' },
  mittel:  { label: 'Mittel',  cls: 'text-amber-700' },
  erhoeht: { label: 'Erhöht',  cls: 'text-orange-700' },
  pruefen: { label: 'Prüfen',  cls: 'text-amber-700' },
  unklar:  { label: 'Unklar',  cls: 'text-gray-400' },
}

export function empfMeta(v?: string) { return EMPF_META[v ?? 'unklar'] ?? EMPF_META.unklar }
export function preisMeta(v?: string) { return PREIS_META[v ?? 'unklar'] ?? PREIS_META.unklar }
export function risikoMeta(v?: string) { return RISIKO_META[v ?? 'unklar'] ?? RISIKO_META.unklar }

export function StatusBadge({ status }: { status: DealerStatus }) {
  const m = STATUS_META[status] ?? STATUS_META.beobachtung
  return (
    <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${m.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${m.dot}`} />
      {m.label}
    </span>
  )
}

// Kompakte Triage-Signale (Empfehlung · Preis · Risiko) — ruhige Textmarker.
export function TriageSignals({ triage }: { triage: DealerTriage }) {
  const e = empfMeta(triage.empfehlung)
  const p = preisMeta(triage.preis)
  const r = risikoMeta(triage.risiko)
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-xs">
      <span className={e.cls}><span className="text-gray-400">VIRA </span>{e.label}</span>
      <span className={p.cls}><span className="text-gray-400">Preis </span>{p.label}</span>
      <span className={r.cls}><span className="text-gray-400">Risiko </span>{r.label}</span>
    </div>
  )
}

export function vehicleTitle(v: { marke?: string | null; modell?: string | null }): string {
  return [v.marke, v.modell].filter(Boolean).join(' ') || 'Fahrzeug'
}
