import { ShieldCheck, Globe, Layers, Scissors } from 'lucide-react'
import type { SourceMeta } from '../types'

interface SourceBadgeProps {
  meta: SourceMeta
}

/**
 * Quellenarten, hinter denen eine ECHTE, nachpruefbare Herkunft steht. Alles
 * andere — reines Modellwissen ("gespräch"), Fehlerantworten, unbekannt —
 * bekommt KEINEN Chip: ein "KI-Wissen"- oder "Quelle unbekannt"-Chip sah aus
 * wie eine Citation, war aber keine.
 */
export const BELEGTE_QUELLEN = ['datenbank', 'web', 'gemischt'] as const

export function hatBelegteQuelle(source: string | undefined): boolean {
  return (BELEGTE_QUELLEN as readonly string[]).includes(source?.toLowerCase() ?? '')
}

export default function SourceBadge({ meta }: SourceBadgeProps) {
  const links = extractLinks(meta.belege)
  const belegt = hatBelegteQuelle(meta.source)

  // Ohne belegte Quelle, ohne Links und ohne Kuerzungshinweis gibt es nichts
  // Wahres anzuzeigen — dann auch keine leere Trennlinie.
  if (!belegt && links.length === 0 && !meta.abgeschnitten) return null

  return (
    <div className="flex flex-wrap items-center gap-2 mt-3 pt-2.5 border-t border-[#ece7e0]">
      {belegt && <SourceChip source={meta.source} />}

      {meta.abgeschnitten && (
        <span
          className="inline-flex items-center gap-1 text-xs bg-amber-50 text-amber-700 border border-amber-200 rounded-full px-2.5 py-0.5"
          title="Das Modell hat die maximale Antwortlänge erreicht. Frag gezielt nach dem fehlenden Teil."
        >
          <Scissors size={11} /> Antwort gekürzt
        </span>
      )}

      {links.map((link, i) => (
        <a
          key={i}
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 text-xs text-gray-500 hover:text-orange-600 hover:border-orange-200 bg-white border border-[#e6e1da] rounded-full pl-1.5 pr-2.5 py-0.5 transition-colors max-w-[200px]"
        >
          <Globe size={11} className="shrink-0 text-gray-400" />
          <span className="truncate">{safeHostname(link)}</span>
        </a>
      ))}
    </div>
  )
}

function SourceChip({ source }: { source: string }) {
  const s = source?.toLowerCase()
  if (s === 'datenbank') {
    return (
      <span className="inline-flex items-center gap-1 text-xs bg-green-50 text-green-700 border border-green-200 rounded-full px-2.5 py-0.5">
        <ShieldCheck size={11} /> Geprüfte Datenbank
      </span>
    )
  }
  if (s === 'web') {
    return (
      <span className="inline-flex items-center gap-1 text-xs bg-yellow-50 text-yellow-700 border border-yellow-200 rounded-full px-2.5 py-0.5">
        <Globe size={11} /> Web-Recherche
      </span>
    )
  }
  if (s === 'gemischt') {
    return (
      <span className="inline-flex items-center gap-1 text-xs bg-blue-50 text-blue-700 border border-blue-200 rounded-full px-2.5 py-0.5">
        <Layers size={11} /> Datenbank + Web
      </span>
    )
  }
  return null
}

function extractLinks(belege: unknown[] | undefined): string[] {
  if (!belege?.length) return []
  return belege
    .map((b) => {
      if (typeof b === 'string') return b
      if (b && typeof b === 'object') {
        const obj = b as Record<string, unknown>
        return (obj.url ?? obj.link ?? obj.quelle ?? '') as string
      }
      return ''
    })
    .filter((s) => s.startsWith('http'))
}

function safeHostname(url: string): string {
  try { return new URL(url).hostname }
  catch { return url }
}
