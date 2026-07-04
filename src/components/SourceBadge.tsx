import { ShieldCheck, Globe, Layers, HelpCircle, Sparkles } from 'lucide-react'
import type { SourceMeta } from '../types'

interface SourceBadgeProps {
  meta: SourceMeta
}

export default function SourceBadge({ meta }: SourceBadgeProps) {
  // gespräch = reines KI-Wissen ohne DB/Web-Abruf → neutraler Badge statt null

  const links = extractLinks(meta.belege)

  return (
    <div className="flex flex-wrap items-center gap-2 mt-3 pt-2.5 border-t border-gray-100">
      <SourceChip source={meta.source} />

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
  if (s === 'gespräch') {
    return (
      <span className="inline-flex items-center gap-1 text-xs bg-purple-50 text-purple-700 border border-purple-200 rounded-full px-2.5 py-0.5">
        <Sparkles size={11} /> KI-Wissen
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
