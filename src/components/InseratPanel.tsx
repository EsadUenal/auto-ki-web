import { useState } from 'react'
import { ClipboardList, Sparkles, Copy, Check, Loader2, AlertTriangle, ChevronDown } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { optimiereInserat } from '../api/client'
import type { InseratOptimierung, ListingAnalyse, VerkaufsCheckForm } from '../types'

/**
 * Phase 4 — Bereich "Dein Inserat".
 *
 * Oben: deterministische Inseratsqualität (kein KI-Score) — Vollständigkeit als
 * transparenter Zählwert, fehlende Angaben (kategorisiert), Stärken/Verkaufsargumente,
 * Preis-Hinweis. Darunter: on-demand "Inserat optimieren" → LLM erzeugt (fakten-
 * geprüft) Titel + Beschreibung, mit Kopieren-Buttons.
 *
 * Trennung zu Phase 2 ("Das solltest du wissen"): dort die wichtigsten Dinge des
 * gesamten Checks — hier ausschließlich die konkrete Qualität des Inserats.
 */

const QUALI: Record<string, { label: string; text: string; dot: string; ring: string }> = {
  sehr_gut:       { label: 'Sehr gut',     text: 'text-emerald-700', dot: 'bg-emerald-500', ring: 'border-emerald-200 bg-emerald-50/50' },
  gut:            { label: 'Gut',          text: 'text-green-700',   dot: 'bg-green-500',   ring: 'border-green-200 bg-green-50/40' },
  verbesserbar:   { label: 'Verbesserbar', text: 'text-amber-700',   dot: 'bg-amber-500',   ring: 'border-amber-200 bg-amber-50/50' },
  unvollstaendig: { label: 'Unvollständig',text: 'text-orange-700',  dot: 'bg-orange-500',  ring: 'border-orange-200 bg-orange-50/50' },
}

const WICHTIGKEIT: Record<string, string> = {
  kritisch: 'bg-red-100 text-red-700',
  wichtig: 'bg-amber-100 text-amber-700',
  optional: 'bg-gray-100 text-gray-500',
}

// Für die Zwischenablage: Markdown leicht in sauberen Fließtext überführen
// (Portale wie mobile.de rendern kein Markdown).
function toPlainText(md: string): string {
  return md
    .replace(/^#{1,6}\s+/gm, '')       // Überschriften
    .replace(/\*\*(.*?)\*\*/g, '$1')   // fett
    .replace(/^\s*[-*]\s+/gm, '• ')    // Aufzählungen
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false)
  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      /* Zwischenablage nicht verfügbar — still ignorieren */
    }
  }
  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#e6e1da] bg-white text-xs font-medium text-gray-600 hover:text-gray-900 hover:border-gray-300 transition-colors"
    >
      {copied ? <Check size={13} className="text-green-600" /> : <Copy size={13} />}
      {copied ? 'Kopiert' : label}
    </button>
  )
}

function QualityCard({ analyse }: { analyse: ListingAnalyse }) {
  const q = QUALI[analyse.qualitaet] ?? QUALI.verbesserbar
  const wichtig = analyse.fehlende_angaben.filter((f) => f.wichtigkeit !== 'optional')
  const optional = analyse.fehlende_angaben.filter((f) => f.wichtigkeit === 'optional')

  return (
    <div className={`rounded-2xl border p-5 ${q.ring}`}>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${q.dot}`} />
          <span className="text-[11px] font-bold tracking-[0.12em] uppercase text-[#a49c92]">Inseratsqualität</span>
        </div>
        <span className={`text-sm font-bold ${q.text}`}>{q.label}</span>
      </div>

      <p className="mt-2 text-sm text-gray-700">
        <span className="font-semibold text-gray-900">{analyse.vorhanden} von {analyse.gesamt}</span> wichtigen Angaben vorhanden
      </p>

      {analyse.probleme.length > 0 && (
        <div className="mt-3 space-y-1.5">
          {analyse.probleme.map((p, i) => (
            <p key={i} className="flex items-start gap-1.5 text-xs text-amber-800">
              <AlertTriangle size={13} className="mt-0.5 shrink-0 text-amber-500" />
              <span>{p}</span>
            </p>
          ))}
        </div>
      )}

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        {(wichtig.length > 0 || optional.length > 0) && (
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-1.5">Fehlt noch</p>
            <ul className="space-y-1">
              {wichtig.map((f, i) => (
                <li key={i} className="flex items-center gap-2 text-sm text-gray-700">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${WICHTIGKEIT[f.wichtigkeit] ?? WICHTIGKEIT.optional}`}>
                    {f.wichtigkeit === 'kritisch' ? 'kritisch' : 'wichtig'}
                  </span>
                  {f.feld}
                </li>
              ))}
              {optional.map((f, i) => (
                <li key={`o${i}`} className="flex items-center gap-2 text-sm text-gray-500">
                  <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${WICHTIGKEIT.optional}`}>optional</span>
                  {f.feld}
                </li>
              ))}
            </ul>
          </div>
        )}

        {(analyse.staerken.length > 0 || analyse.verkaufsargumente.length > 0) && (
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-1.5">Stärken</p>
            <ul className="space-y-1">
              {analyse.staerken.map((s, i) => (
                <li key={i} className="flex items-start gap-1.5 text-sm text-gray-700">
                  <Check size={14} className="mt-0.5 shrink-0 text-emerald-500" />{s}
                </li>
              ))}
              {analyse.verkaufsargumente.map((s, i) => (
                <li key={`a${i}`} className="flex items-start gap-1.5 text-sm text-gray-700">
                  <Sparkles size={13} className="mt-0.5 shrink-0 text-green-500" />{s}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {analyse.preis_hinweis && (
        <p className="mt-4 pt-3 border-t border-black/5 text-xs text-gray-600 leading-relaxed">{analyse.preis_hinweis}</p>
      )}
    </div>
  )
}

function OptimizedView({ opt }: { opt: InseratOptimierung }) {
  return (
    <div className="mt-3 space-y-4">
      <div>
        <div className="flex items-center justify-between gap-3 mb-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Optimierter Titel</p>
          <CopyButton text={opt.titel} label="Titel kopieren" />
        </div>
        <p className="text-sm font-semibold text-gray-900 bg-[#faf8f5] border border-[#eee7dd] rounded-lg px-3 py-2 break-words">
          {opt.titel}
        </p>
      </div>

      <div>
        <div className="flex items-center justify-between gap-3 mb-1.5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400">Optimierte Beschreibung</p>
          <CopyButton text={toPlainText(opt.beschreibung)} label="Beschreibung kopieren" />
        </div>
        <div className="chat-prose text-sm bg-[#faf8f5] border border-[#eee7dd] rounded-lg px-4 py-3 overflow-x-auto">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{opt.beschreibung}</ReactMarkdown>
        </div>
      </div>

      {opt.entfernte_behauptungen.length > 0 && (
        <details className="text-xs text-gray-500">
          <summary className="cursor-pointer inline-flex items-center gap-1 hover:text-gray-700">
            <ChevronDown size={12} /> {opt.entfernte_behauptungen.length} nicht belegte Aussage(n) automatisch entfernt
          </summary>
          <p className="mt-1.5 text-gray-400 leading-relaxed">
            VIRA fügt keine positiven Aussagen hinzu, die du nicht angegeben hast (z. B. Unfallfreiheit,
            TÜV, Scheckheft, Ausstattung).
          </p>
        </details>
      )}
    </div>
  )
}

export default function InseratPanel({
  analyse,
  form,
  checkId,
  initial,
}: {
  analyse?: ListingAnalyse | null
  form: VerkaufsCheckForm
  checkId?: number
  initial?: InseratOptimierung | null
}) {
  const [opt, setOpt] = useState<InseratOptimierung | null>(initial ?? null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Alte Checks ohne deterministische Analyse UND ohne bereits erzeugte Version:
  // Bereich sauber ausblenden (Backward Compatibility).
  if (!analyse && !opt) return null

  async function generate() {
    if (checkId == null) {
      setError('Der Check wird gerade gespeichert — bitte kurz warten und erneut versuchen.')
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await optimiereInserat(checkId, form)
      setOpt(res)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-2.5">
      <p className="text-[11px] font-bold tracking-[0.22em] uppercase text-[#a49c92]">Dein Inserat</p>

      {analyse && <QualityCard analyse={analyse} />}

      <div className="bg-white border border-[#e6e1da] rounded-2xl p-5 shadow-[0_16px_36px_-24px_rgba(40,25,10,0.28)]">
        <div className="flex items-center gap-2 mb-1">
          <ClipboardList size={15} className="text-green-600" />
          <p className="text-sm font-semibold text-gray-900">Inserat verbessern</p>
        </div>
        <p className="text-xs text-gray-500 mb-3">
          VIRA formuliert aus deinen Angaben einen professionellen Titel und eine Beschreibung —
          ganz ohne erfundene Fakten.
        </p>

        {!opt && (
          <button
            type="button"
            onClick={generate}
            disabled={loading}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-white text-sm font-semibold transition-all disabled:opacity-40"
            style={{ background: 'linear-gradient(180deg, #22c55e 0%, #16a34a 100%)', boxShadow: '0 10px 24px -8px rgba(22,163,74,0.5)' }}
          >
            {loading
              ? <><Loader2 size={15} className="animate-spin" /> Wird erstellt…</>
              : <><Sparkles size={15} /> Optimierte Version erstellen</>}
          </button>
        )}

        {error && <p className="mt-2 text-xs text-red-600">{error}</p>}

        {opt && <OptimizedView opt={opt} />}
      </div>
    </div>
  )
}
