import { ShieldCheck, Globe, Layers, HelpCircle } from 'lucide-react'
import type { SourceMeta, TrustLevel } from '../types'

const TRUST_CONFIG: Record<TrustLevel, { label: string; textColor: string; dotColor: string; dots: number }> = {
  hoch:      { label: 'Hohes Vertrauen',    textColor: 'text-green-700',  dotColor: 'bg-green-500',  dots: 3 },
  mittel:    { label: 'Mittleres Vertrauen', textColor: 'text-yellow-700', dotColor: 'bg-yellow-500', dots: 2 },
  niedrig:   { label: 'Niedriges Vertrauen', textColor: 'text-red-600',    dotColor: 'bg-red-500',    dots: 1 },
  keine:     { label: '',                    textColor: 'text-gray-400',   dotColor: 'bg-gray-300',   dots: 0 },
  unbekannt: { label: '',                    textColor: 'text-gray-400',   dotColor: 'bg-gray-300',   dots: 0 },
}

interface SourceBadgeProps {
  meta: SourceMeta
}

export default function SourceBadge({ meta }: SourceBadgeProps) {
  // Kein Badge bei reiner Konversation (keine DB- oder Web-Daten)
  if (meta.source === 'gespräch') return null

  const trust = TRUST_CONFIG[meta.trust_level] ?? TRUST_CONFIG.unbekannt
  const links = extractLinks(meta.belege)

  return (
    <div className="flex flex-wrap items-center gap-2 mt-3 pt-2.5 border-t border-gray-100">
      <SourceChip source={meta.source} />

      {trust.dots > 0 && (
        <div className={`flex items-center gap-1.5 text-xs ${trust.textColor}`}>
          <span className="flex gap-0.5">
            {[1, 2, 3].map((i) => (
              <span
                key={i}
                className={`inline-block w-2 h-2 rounded-full ${i <= trust.dots ? trust.dotColor : 'bg-gray-200'}`}
              />
            ))}
          </span>
          <span>{trust.label}</span>
        </div>
      )}

      {links.map((link, i) => (
        <a
          key={i}
          href={link}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-blue-500 hover:underline truncate max-w-[180px]"
        >
          {safeHostname(link)}
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
        <Globe size={11} /> Web (ungeprüft)
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
  return (
    <span className="inline-flex items-center gap-1 text-xs bg-gray-50 text-gray-500 border border-gray-200 rounded-full px-2.5 py-0.5">
      <HelpCircle size={11} /> Quelle unbekannt
    </span>
  )
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
