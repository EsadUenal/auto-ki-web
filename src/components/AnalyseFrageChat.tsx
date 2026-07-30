import { useRef, useState } from 'react'
import { Send, Loader2, MessageCircleQuestion } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { streamAnalyseFrage, type VerlaufItem } from '../api/client'

interface QA {
  frage: string
  antwort: string
}

/**
 * Kontextgebundener Analyse-Chat: erscheint unter einem Check-Ergebnis und
 * beantwortet ausschließlich Fragen zur vorliegenden Analyse. Multi-Turn —
 * jede Frage schickt die bisherigen Q&A-Paare als Verlauf mit.
 */
export default function AnalyseFrageChat({
  analyseKontext,
  checkTyp = 'kauf',
}: {
  analyseKontext: string
  checkTyp?: 'kauf' | 'verkauf' | 'ersatzteil'
}) {
  const [qas, setQas] = useState<QA[]>([])
  const [input, setInput] = useState('')
  const [streaming, setStreaming] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const frage = input.trim()
    if (!frage || streaming) return

    setError(null)
    setInput('')

    // Verlauf aus den bisherigen Q&A-Paaren (Multi-Turn, baut aufeinander auf).
    const verlauf: VerlaufItem[] = qas.flatMap((qa) => [
      { rolle: 'user' as const, text: qa.frage },
      { rolle: 'ki' as const, text: qa.antwort },
    ])

    const idx = qas.length
    setQas((prev) => [...prev, { frage, antwort: '' }])
    setStreaming(true)

    const ctrl = new AbortController()
    abortRef.current = ctrl

    await streamAnalyseFrage(
      analyseKontext,
      frage,
      verlauf,
      checkTyp,
      {
        onToken: (t) =>
          setQas((prev) =>
            prev.map((qa, i) => (i === idx ? { ...qa, antwort: qa.antwort + t } : qa)),
          ),
        onError: (err) => setError(err),
        onDone: () => {},
      },
      ctrl.signal,
    )

    setStreaming(false)
    abortRef.current = null
  }

  return (
    <div className="mt-8 pt-8 border-t border-[#e6e1da]">
      <div className="flex items-center gap-2 mb-4">
        <MessageCircleQuestion size={16} className="text-blue-600" />
        <p className="text-[11px] font-bold tracking-[0.22em] uppercase text-[#a49c92]">
          Fragen zur Analyse
        </p>
      </div>

      {qas.length > 0 && (
        <div className="space-y-4 mb-4">
          {qas.map((qa, i) => (
            <div key={i} className="space-y-2">
              {/* Frage (rechts) */}
              <div className="flex justify-end">
                <div className="inline-block max-w-[min(88vw,520px)] bg-blue-600 text-white rounded-2xl rounded-br-sm px-4 py-2 text-sm leading-relaxed">
                  {qa.frage}
                </div>
              </div>
              {/* Antwort (links) */}
              <div className="flex justify-start">
                <div className="inline-block max-w-[min(88vw,560px)] bg-white border border-[#e6e1da] rounded-2xl rounded-bl-sm px-4 py-2.5 text-sm text-gray-800 shadow-[0_8px_24px_-20px_rgba(40,25,10,0.3)]">
                  {qa.antwort ? (
                    <div className="chat-prose">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>{qa.antwort}</ReactMarkdown>
                    </div>
                  ) : (
                    <Loader2 size={15} className="animate-spin text-gray-400" />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {error && (
        <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-3">{error}</p>
      )}

      <form onSubmit={handleSubmit} className="flex items-center gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={streaming}
          placeholder="Frage zur Analyse…"
          className="flex-1 text-sm bg-white border border-[#e6e1da] rounded-xl px-4 py-2.5 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-200/70 transition-colors placeholder-gray-400 disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={streaming || !input.trim()}
          aria-label="Frage senden"
          className="shrink-0 w-11 h-11 flex items-center justify-center rounded-xl text-white transition-all disabled:opacity-40 disabled:saturate-50"
          style={{ background: 'linear-gradient(180deg, #3b82f6 0%, #2563eb 100%)', boxShadow: '0 8px 18px -8px rgba(37,99,235,0.5)' }}
        >
          {streaming ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
        </button>
      </form>

      <p className="text-[11px] text-gray-400 mt-2.5">
        Beantwortet nur Fragen zu dieser Analyse. Für allgemeine Fragen den KI-Chat nutzen.
      </p>
    </div>
  )
}
