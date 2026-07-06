import { useEffect, useRef, useState } from 'react'
import { Send, Square, ImagePlus, X, Pencil } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { streamChat } from '../api/client'
import type { VerlaufItem } from '../api/client'
import SourceBadge from './SourceBadge'
import type { CarContext, Conversation, Message, SourceMeta } from '../types'

interface ChatViewProps {
  conversation: Conversation
  onMessagesUpdate: (messages: Message[]) => void
  onSaveExchange?: (userText: string, assistantText: string) => void
  autoMessage?: string | null
  onAutoMessageDone?: () => void
}

export default function ChatView({ conversation, onMessagesUpdate, onSaveExchange, autoMessage, onAutoMessageDone }: ChatViewProps) {
  const [input, setInput] = useState('')
  const [isStreaming, setIsStreaming] = useState(false)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [statusText, setStatusText] = useState('')

  // --- Lokaler Streaming-State (vermeidet React-18-Batching-Problem) ---
  const accumRef      = useRef('')
  const streamIdRef   = useRef<string | null>(null)
  const rafRef        = useRef<number | null>(null)
  const [liveText, setLiveText] = useState('')

  const [editingMsgId, setEditingMsgId] = useState<string | null>(null)
  const [editText, setEditText] = useState('')

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

  async function handleSendWithHistory(text: string, priorMessages: Message[]) {
    if (!text.trim() || isStreaming) return

    const car = conversation.carContext
    const historyItems: VerlaufItem[] = priorMessages
      .filter((m) => m.content)
      .map((m) => ({
        rolle: m.role === 'user' ? ('user' as const) : ('ki' as const),
        text: m.content,
      }))

    const verlauf: VerlaufItem[] = car
      ? [
          { rolle: 'user' as const, text: `Ich interessiere mich für den ${car.titel}.` },
          { rolle: 'ki' as const,   text: `Verstanden! Ich beantworte alle deine Fragen direkt bezogen auf den ${car.titel}.` },
          ...historyItems,
        ]
      : historyItems

    const userMsg: Message      = { id: crypto.randomUUID(), role: 'user',      content: text }
    const assistantMsg: Message = { id: crypto.randomUUID(), role: 'assistant', content: '', streaming: true }
    const baseMessages = [...priorMessages, userMsg, assistantMsg]

    onMessagesUpdate(baseMessages)
    setIsStreaming(true)
    accumRef.current    = ''
    streamIdRef.current = assistantMsg.id
    setLiveText('')
    setStatusText('Denke nach…')

    const ctrl = new AbortController()
    abortRef.current = ctrl

    await streamChat(text, verlauf, {
      onStatus(s) { setStatusText(s) },
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
        onMessagesUpdate(
          baseMessages.map((m) =>
            m.id === assistantMsg.id ? { ...m, content: finalContent, streaming: false, meta } : m
          )
        )
        if (finalContent) onSaveExchange?.(text, finalContent)
      },
      onError(err: string) {
        cancelPendingRaf()
        streamIdRef.current = null
        setLiveText('')
        setStatusText('')
        setIsStreaming(false)
        onMessagesUpdate(
          baseMessages.map((m) =>
            m.id === assistantMsg.id ? { ...m, content: `**Fehler:** ${err}`, streaming: false } : m
          )
        )
      },
    }, ctrl.signal)
  }

  async function handleSend(overrideText?: string) {
    const text = (overrideText ?? input).trim()
    if (!text) return
    setInput('')
    setImagePreview(null)
    if (textareaRef.current) textareaRef.current.style.height = 'auto'
    await handleSendWithHistory(text, conversation.messages)
  }

  async function handleEditAndResend(messageId: string, newText: string) {
    if (!newText.trim() || isStreaming) return
    const idx = conversation.messages.findIndex((m) => m.id === messageId)
    if (idx < 0) return
    setEditingMsgId(null)
    await handleSendWithHistory(newText.trim(), conversation.messages.slice(0, idx))
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
    <div
      className="flex flex-col h-full"
      style={{ background: 'radial-gradient(120% 80% at 50% -8%, #fefdfb 0%, #faf7f3 42%, #f3efe9 100%)' }}
    >
      <div className="flex-1 overflow-y-auto">
        {conversation.carContext && (
          <CarPanels
            car={conversation.carContext}
            onPanelClick={(prompt) => { if (!isStreaming) handleSend(prompt) }}
          />
        )}
        {isEmpty && !conversation.carContext && (
          <WelcomeScreen
            onSuggestion={(t) => {
              setInput(t)
              textareaRef.current?.focus()
            }}
          />
        )}
        {!isEmpty && (
          <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
            {displayMessages.map((msg) => (
              <MessageBubble
                key={msg.id}
                message={msg}
                isEditing={editingMsgId === msg.id}
                editText={editingMsgId === msg.id ? editText : ''}
                onEditStart={() => { setEditingMsgId(msg.id); setEditText(msg.content) }}
                onEditChange={setEditText}
                onEditCancel={() => setEditingMsgId(null)}
                onEditConfirm={() => handleEditAndResend(msg.id, editText)}
                editDisabled={isStreaming}
              />
            ))}
            <div ref={bottomRef} />
          </div>
        )}
      </div>

      <div className="border-t border-gray-100 bg-white px-4 py-3">
        <div className="max-w-4xl mx-auto">
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

interface MessageBubbleProps {
  message: Message
  isEditing?: boolean
  editText?: string
  onEditStart?: () => void
  onEditChange?: (v: string) => void
  onEditCancel?: () => void
  onEditConfirm?: () => void
  editDisabled?: boolean
}

function MessageBubble({
  message, isEditing, editText, onEditStart, onEditChange, onEditCancel, onEditConfirm, editDisabled,
}: MessageBubbleProps) {
  const editRef = useRef<HTMLTextAreaElement>(null)

  useEffect(() => {
    if (isEditing) {
      const el = editRef.current
      if (el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; el.focus() }
    }
  }, [isEditing])

  if (message.role === 'user') {
    if (isEditing) {
      return (
        <div className="flex flex-col items-end gap-2">
          <textarea
            ref={editRef}
            value={editText}
            onChange={(e) => { onEditChange?.(e.target.value); e.target.style.height = 'auto'; e.target.style.height = e.target.scrollHeight + 'px' }}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); onEditConfirm?.() }
              if (e.key === 'Escape') onEditCancel?.()
            }}
            className="w-full max-w-[88%] bg-gray-900 text-white rounded-2xl rounded-tr-sm px-4 py-3 text-sm leading-relaxed resize-none outline-none ring-2 ring-orange-400 overflow-hidden"
            rows={1}
          />
          <div className="flex gap-2 mr-0.5">
            <button
              onClick={onEditCancel}
              className="text-xs text-gray-400 hover:text-gray-600 px-3 py-1.5 rounded-lg border border-gray-200 hover:border-gray-300 transition-colors"
            >
              Abbrechen
            </button>
            <button
              onClick={onEditConfirm}
              disabled={!editText?.trim()}
              className="text-xs text-white bg-gray-900 hover:bg-gray-700 disabled:bg-gray-200 disabled:text-gray-400 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Send size={11} /> Senden
            </button>
          </div>
        </div>
      )
    }

    return (
      <div className="flex justify-end group/msg">
        <div className="relative">
          <div className="max-w-[88%] bg-gray-900 text-white rounded-2xl rounded-tr-sm px-4 py-3 text-sm leading-relaxed whitespace-pre-wrap">
            {message.content}
          </div>
          {!editDisabled && !message.streaming && (
            <button
              onClick={onEditStart}
              title="Bearbeiten"
              className="absolute -left-8 top-1/2 -translate-y-1/2 p-1.5 rounded-lg opacity-0 group-hover/msg:opacity-100 text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-all"
            >
              <Pencil size={12} />
            </button>
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex gap-3">
      <div className="w-7 h-7 rounded-full overflow-hidden shrink-0 mt-0.5 bg-orange-500 flex items-center justify-center">
        <img src="/logo.svg" alt="Vira" className="w-full h-full object-cover" />
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

// Glow-Farben — identisch mit EntdeckenView, damit Panels konsistent wirken
const GLOW_BY_ID: Record<string, string> = {
  'bmw-m3':         '#3b82f6',
  'bmw-m4':         '#60a5fa',
  'bmw-m5':         '#2563eb',
  'bmw-x5m':        '#1d4ed8',
  'amg-gt':         '#94a3b8',
  'g-klasse':       '#64748b',
  'c63-amg':        '#8b5cf6',
  'audi-r8':        '#ef4444',
  'audi-rs6':       '#f87171',
  'audi-rs3':       '#dc2626',
  'golf-gti':       '#22c55e',
  'golf-r':         '#16a34a',
  'supra':          '#f97316',
  'gr-yaris':       '#ea580c',
  'porsche-911':    '#eab308',
  'porsche-911t':   '#f59e0b',
  'cayenne':        '#d97706',
  'gtr':            '#a855f7',
  'mustang':        '#f43f5e',
  'huracan':        '#fbbf24',
  'ferrari-488':    '#ef4444',
  'mclaren-720s':   '#f97316',
}

const PANEL_PROMPTS: Record<string, (titel: string) => string> = {
  'Außenansicht': (t) =>
    `Erkläre mir ausführlich das **Design und die Außenansicht** des ${t}. Gehe dabei auf folgende Punkte ein:\n\n` +
    `- Karosserievarianten mit Baujahren und Generationsübersicht (wann kam welche Generation?)\n` +
    `- Abmessungen: Länge, Breite, Höhe, Radstand je Generation\n` +
    `- Designsprache und markante Erkennungsmerkmale (Scheinwerfer, Kühlergrill, Linienführung)\n` +
    `- Generationsunterschiede: woran erkennt man welchen Jahrgang auf den ersten Blick?\n` +
    `- Aerodynamik (cW-Wert, Spoiler, Diffusor), Felgengrößen, Lackfarbangebot\n\n` +
    `Bitte strukturiert mit Zwischenüberschriften, ausführlich aber übersichtlich.`,

  'Motor': (t) =>
    `Erkläre mir ausführlich den **Motor und die Motorisierungen** des ${t}. Gehe dabei auf folgende Punkte ein:\n\n` +
    `- Alle verfügbaren Motorvarianten (Benziner, Diesel, Hybrid, Elektro)\n` +
    `- Hubraum, Zylinderzahl, PS/kW, Drehmoment je Variante\n` +
    `- Technologien (Turbo, Direkteinspritzung, MHEV, Allrad etc.)\n` +
    `- Typische Stärken und Schwächen jeder Motorvariante\n` +
    `- Verbrauchswerte (WLTP), 0–100-Zeiten, Höchstgeschwindigkeit\n` +
    `- Besonderheiten und Empfehlungen\n\n` +
    `Bitte strukturiert mit Zwischenüberschriften, ausführlich aber übersichtlich.`,

  'Röntgen': (t) =>
    `Erkläre mir ausführlich das **Innenleben und den technischen Aufbau** des ${t}. Gehe dabei auf folgende Punkte ein:\n\n` +
    `- Interieur-Design: Materialien, Verarbeitung, Raumgefühl\n` +
    `- Infotainment: Display-Größe, Navigation, Konnektivität (Apple CarPlay, Android Auto)\n` +
    `- Fahrerassistenzsysteme (ADAS): Tempomat, Spurhalte, Notbremse etc.\n` +
    `- Fahrwerksaufbau: Vorder-/Hinterachskonstruktion, Federung, Dämpfer\n` +
    `- Karosseriestruktur und Sicherheitskonzept\n` +
    `- Kofferraumvolumen, Sitzkomfort, Besonderheiten\n\n` +
    `Bitte strukturiert mit Zwischenüberschriften, ausführlich aber übersichtlich.`,
}

function PanelCard({ label, img, glow = '#6b7280', ratio = '5/2', onClick }: {
  label: string; img?: string; glow?: string; ratio?: string; onClick?: () => void
}) {
  const [hovered, setHovered] = useState(false)
  const clickable = !!onClick

  return (
    <div
      className={`flex flex-col rounded-xl border border-gray-200 bg-gray-50 select-none overflow-hidden${clickable ? ' cursor-pointer' : ''}`}
      style={{
        transform: hovered ? 'translateY(-5px) scale(1.02)' : 'translateY(0) scale(1)',
        transition: 'transform 0.32s cubic-bezier(0.34,1.56,0.64,1)',
        boxShadow: hovered
          ? `0 12px 32px rgba(0,0,0,0.15), 0 0 28px ${glow}22`
          : '0 2px 8px rgba(0,0,0,0.06)',
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      onClick={onClick}
    >
      <div className="relative bg-gray-100 overflow-hidden" style={{ aspectRatio: ratio }}>
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            background: `radial-gradient(ellipse at 50% 58%, ${glow}35 0%, transparent 68%)`,
            opacity: hovered ? 0.75 : 0.18,
            transition: 'opacity 0.32s ease',
          }}
        />
        {img && (
          <img
            src={img}
            alt={label}
            className="absolute inset-0 w-full h-full object-contain"
            draggable={false}
            style={{
              filter: hovered ? 'brightness(1.12)' : 'brightness(1)',
              transition: 'filter 0.22s ease',
            }}
          />
        )}
        {/* Klick-Hinweis: erscheint nur wenn klickbar und auf hover */}
        {clickable && (
          <div
            className="absolute bottom-1.5 right-1.5 bg-orange-500 text-white text-[9px] font-semibold px-1.5 py-0.5 rounded-full pointer-events-none"
            style={{ opacity: hovered ? 1 : 0, transition: 'opacity 0.2s ease' }}
          >
            KI-Erklärung
          </div>
        )}
      </div>
      <div className="px-2 py-1.5 text-center border-t border-gray-100 relative">
        <span
          className="text-[10px] font-medium tracking-wide transition-colors duration-200"
          style={{ color: clickable && hovered ? '#f97316' : '#9ca3af' }}
        >
          {label}
        </span>
      </div>
    </div>
  )
}

function CarPanels({ car, onPanelClick }: { car: CarContext; onPanelClick: (prompt: string) => void }) {
  const glow = GLOW_BY_ID[car.id] ?? '#6b7280'
  const panels = [
    { label: 'Außenansicht', img: car.imgAussen ?? car.img, ratio: '5/2' },
    { label: 'Motor',        img: car.imgMotor,             ratio: '1/1' },
    { label: 'Röntgen',      img: car.imgInnen,             ratio: '5/2' },
  ]

  return (
    <div className="px-4 py-4 border-b border-gray-100">
      <div className="max-w-3xl mx-auto">
        <p className="text-[10px] font-semibold text-gray-400 tracking-widest uppercase mb-2">{car.titel}</p>
        <div className="grid grid-cols-3 gap-3 items-start">
          {panels.map(({ label, img, ratio }) => {
            const promptFn = PANEL_PROMPTS[label]
            return (
              <PanelCard
                key={label}
                label={label}
                img={img}
                glow={glow}
                ratio={ratio}
                onClick={promptFn ? () => onPanelClick(promptFn(car.titel)) : undefined}
              />
            )
          })}
        </div>
      </div>
    </div>
  )
}


function WelcomeScreen({ onSuggestion }: { onSuggestion: (text: string) => void }) {
  return (
    <div className="flex flex-col items-center justify-center h-full px-4 py-16 text-center">
      <div className="w-14 h-14 rounded-2xl overflow-hidden mb-5 shadow-lg">
        <img src="/logo.svg" alt="Vira" className="w-full h-full" />
      </div>
      <h1 className="text-2xl font-semibold text-gray-900 mb-2">Vira</h1>
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
