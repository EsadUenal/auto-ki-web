import { useEffect, useRef, useState } from 'react'
import { Send, Square, ImagePlus, X } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { streamChat } from '../api/client'
import SourceBadge from './SourceBadge'
import type { Conversation, Message, SourceMeta } from '../types'

interface ChatViewProps {
  conversation: Conversation
  onMessagesUpdate: (messages: Message[]) => void
  autoMessage?: string | null
  onAutoMessageDone?: () => void
}

export default function ChatView({ conversation, onMessagesUpdate, autoMessage, onAutoMessageDone }: ChatViewProps) {
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [statusText, setStatusText] = useState('')

  // --- Lokaler Streaming-State (vermeidet React-18-Batching-Problem) ---
  const accumRef      = useRef('')
  const streamIdRef   = useRef<string | null>(null)
  const rafRef        = useRef<number | null>(null)
  const [liveText, setLiveText] = useState('')

  const abortRef      = useRef<AbortController | null>(null)
  const bottomRef     = useRef<HTMLDivElement>(null)
  const textareaRef   = useRef<HTMLTextAreaElement>(null)
  const autoSentRef   = useRef(false)
  // Always hold a ref to the latest handleSend to avoid stale closure in the auto-send effect
  const handleSendRef = useRef<(override?: string) => Promise<void>>(async () => {})

  // Auto-Scroll wenn neue Tokens ankommen
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [liveText, conversation.messages])

  // Keep ref current so the auto-send effect always calls the latest handleSend
  handleSendRef.current = handleSend

  // Auto-send a pre-loaded question (from Entdecken card click)
  useEffect(() => {
    if (!autoMessage || autoSentRef.current || isStreaming) return
    autoSentRef.current = true
    handleSendRef.current(autoMessage)
    onAutoMessageDone?.()
  }, [autoMessage]) // eslint-disable-line react-hooks/exhaustive-deps

  function scheduleRender() {
    // Genau ein RAF pro Frame — egal wie viele Tokens in einem Chunk ankommen
    if (rafRef.current !== null) return
    rafRef.current = requestAnimationFrame(() => {
      setLiveText(accumRef.current)
      rafRef.current = null
    })
  }

  function cancelPendingRaf() {
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current)
      rafRef.current = null
    }
  }

  function autoResize() {
    const el = textareaRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = Math.min(el.scrollHeight, 160) + 'px'
  }

  async function handleSend(overrideText?: string) {
    const text = (overrideText ?? input).trim()
    if (!text || isStreaming) return

    // Verlauf im Backend-Format aufbauen
    const verlauf = conversation.messages
      .filter((m) => m.content)
      .map((m) => ({
        rolle: m.role === 'user' ? ('user' as const) : ('ki' as const),
        text: m.content,
      }))

    const userMsg: Message = { id: crypto.randomUUID(), role: 'user', content: text }
    const assistantMsg: Message = { id: crypto.randomUUID(), role: 'assistant', content: '', streaming: true }
    const baseMessages = [...conversation.messages, userMsg, assistantMsg]

    // Sofort User-Nachricht + leeren Assistenten-Slot in Parent pushen
    onMessagesUpdate(baseMessages)
    setInput('')
    setImagePreview(null)
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
    setIsStreaming(true)

    // Lokalen Streaming-State initialisieren
    accumRef.current = ''
    streamIdRef.current = assistantMsg.id
    setLiveText('')
    setStatusText('Denke nach…')

    const ctrl = new AbortController()
    abortRef.current = ctrl

    await streamChat(
      text,
      verlauf,
      {
        onStatus(text) {
          setStatusText(text)
        },

        onToken(token) {
          setStatusText('')
          accumRef.current += token
          scheduleRender()
        },

        onDone(meta: SourceMeta) {
          cancelPendingRaf()
          const finalContent = accumRef.current

          streamIdRef.current = null
          setLiveText('')
          setStatusText('')
          setIsStreaming(false)

          // Jetzt einmal den Parent mit dem fertigen Text updaten
          onMessagesUpdate(
            baseMessages.map((m) =>
              m.id === assistantMsg.id
                ? { ...m, content: finalContent, streaming: false, meta }
                : m
            )
          )
        },

        onError(err: string) {
          cancelPendingRaf()
          streamIdRef.current = null
          setLiveText('')
          setStatusText('')
          setIsStreaming(false)
          onMessagesUpdate(
            baseMessages.map((m) =>
              m.id === assistantMsg.id
                ? { ...m, content: `**Fehler:** ${err}`, streaming: false }
                : m
            )
          )
        },
      },
      ctrl.signal
    )
  }

  function handleStop() {
    abortRef.current?.abort()
    cancelPendingRaf()
    const finalContent = accumRef.current
    streamIdRef.current = null
    setLiveText('')
    setStatusText('')
    setIsStreaming(false)
    onMessagesUpdate(
      conversation.messages.map((m) =>
        m.streaming ? { ...m, content: finalContent || m.content, streaming: false } : m
      )
    )
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }

  function handleImageUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => setImagePreview(reader.result as string)
    reader.readAsDataURL(file)
  }

  const displayMessages = conversation.messages.map((m) =>
    streamIdRef.current && m.id === streamIdRef.current
      ? { ...m, content: liveText, streaming: true, statusText: liveText ? '' : statusText }
      : m
  )

  const isEmpty = displayMessages.length === 0

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto">
        {isEmpty ? (
          <WelcomeScreen
            onSuggestion={(t) => {
              setInput(t)
              textareaRef.current?.focus()
            }}
          />
        ) : (
          <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">
            {displayMessages.map((msg) => (
              <MessageBubble key={msg.id} message={msg} />
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      <div className="border-t border-gray-100 bg-white px-4 py-3">
        <div className="max-w-3xl mx-auto">
          {imagePreview && (
            <div className="relative inline-block mb-2">
              <img
                src={imagePreview}
                className="h-16 rounded-lg border border-gray-200 object-cover"
                alt="Upload"
              />
              <button
                onClick={() => setImagePreview(null)}
                className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-gray-800 rounded-full flex items-center justify-center"
              >
                <X size={11} className="text-white" />
              </button>
            </div>
          )}
          <div className="flex items-end gap-2 bg-gray-50 border border-gray-200 rounded-2xl px-3 py-2 focus-within:border-gray-400 focus-within:ring-1 focus-within:ring-gray-300 transition-all">
            <label className="p-1 text-gray-400 hover:text-gray-600 cursor-pointer shrink-0 mb-0.5">
              <ImagePlus size={18} />
              <input type="file" accept="image/*" className="hidden" onChange={handleImageUpload} />
            </label>
            <textarea
              ref={textareaRef}
              value={input}
              onChange={(e) => { setInput(e.target.value); autoResize() }}
              onKeyDown={handleKeyDown}
              rows={1}
              placeholder="Stelle eine Frage zu deinem Auto…"
              className="flex-1 bg-transparent text-sm text-gray-900 placeholder-gray-400 resize-none outline-none leading-6 py-1 max-h-40"
            />
            {isStreaming ? (
              <button
                onClick={handleStop}
                className="p-1.5 bg-gray-800 rounded-lg text-white hover:bg-gray-700 shrink-0 mb-0.5 transition-colors"
              >
                <Square size={14} />
              </button>
            ) : (
              <button
                onClick={() => handleSend()}
                disabled={!input.trim()}
                className="p-1.5 bg-gray-900 rounded-lg text-white hover:bg-gray-700 disabled:bg-gray-200 disabled:text-gray-400 shrink-0 mb-0.5 transition-colors"
              >
                <Send size={14} />
              </button>
            )}
          </div>
          <p className="text-center text-xs text-gray-400 mt-2">
            KI-Antworten können Fehler enthalten — wichtige Entscheidungen bitte prüfen.
          </p>
        </div>
      </div>
    </div>
  )
}

function MessageBubble({ message }: { message: Message }) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] bg-gray-900 text-white rounded-2xl rounded-tr-sm px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap">
          {message.content}
        </div>
      </div>
    )
  }

  return (
    <div className="flex gap-3">
      <div className="w-7 h-7 rounded-full bg-orange-500 flex items-center justify-center shrink-0 mt-0.5">
        <span className="text-white text-xs font-bold">KI</span>
      </div>
      <div className="flex-1 min-w-0">
        {message.streaming && message.statusText && !message.content ? (
          <div className="flex items-center gap-2 text-sm text-gray-400 py-1">
            <span className="inline-flex gap-1">
              <span className="animate-bounce [animation-delay:0ms]">·</span>
              <span className="animate-bounce [animation-delay:150ms]">·</span>
              <span className="animate-bounce [animation-delay:300ms]">·</span>
            </span>
            <span>{message.statusText}</span>
          </div>
        ) : (
          <div className={`chat-prose${message.streaming ? ' cursor-blink' : ''}`}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {message.content || (message.streaming ? '​' : '')}
            </ReactMarkdown>
          </div>
        )}
        {!message.streaming && message.meta && (
          <SourceBadge meta={message.meta} />
        )}
      </div>
    </div>
  )
}

const SUGGESTIONS = [
  'Woran erkenne ich einen Unfallschaden beim Gebrauchtwagen?',
  'Was sollte ich bei einer Probefahrt unbedingt prüfen?',
  'Wie viel km-Laufleistung ist für ein 5 Jahre altes Auto normal?',
  'Was bedeutet HU AU beim Fahrzeugkauf?',
]

function WelcomeScreen({ onSuggestion }: { onSuggestion: (text: string) => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full px-4 py-16 text-center">
      <div className="w-14 h-14 rounded-2xl bg-orange-500 flex items-center justify-center mb-5 shadow-lg">
        <span className="text-white text-2xl font-bold">KI</span>
      </div>
      <h1 className="text-2xl font-semibold text-gray-900 mb-2">Auto-KI</h1>
      <p className="text-gray-500 text-sm max-w-sm mb-8">
        Intelligente Beratung rund ums Auto — Kauf, Verkauf, technische Fragen.
        Transparente Quellen, ehrliche Einschätzungen.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 w-full max-w-lg">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            onClick={() => onSuggestion(s)}
            className="text-left text-sm text-gray-600 bg-gray-50 hover:bg-gray-100 border border-gray-200 rounded-xl px-4 py-3 transition-colors leading-snug"
          >
            {s}
          </button>
        ))}
      </div>
    </div>
  )
}
