import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { TrendingUp, ImagePlus, X, Loader2, Clock, History, Lock, ChevronDown } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { runVerkaufsCheck, apiSaveCheck, PaymentRequiredError } from '../api/client'
import SourceBadge from './SourceBadge'
import type { VerkaufsCheckForm, VerkaufsCheckResult, SavedVerkaufsCheck } from '../types'

const ZUSTAND_OPTIONS = [
  { value: 'sehr_gut', label: 'Sehr gut', desc: 'Kaum Gebrauchsspuren, gepflegt' },
  { value: 'gut', label: 'Gut', desc: 'Normale Gebrauchsspuren' },
  { value: 'maengel', label: 'Mit Mängeln', desc: 'Sichtbare Schäden oder Defekte' },
  { value: 'bastler', label: 'Bastlerfahrzeug', desc: 'Nicht fahrbereit / starke Mängel' },
]

const EMPTY: VerkaufsCheckForm = {
  marke: '',
  modell: '',
  baujahr: new Date().getFullYear() - 3,
  kilometerstand: 0,
  motor: '',
  ausstattung: '',
  zustand: 'gut',
  unfallfrei: '',
  vorbesitzer: '',
  tuevBis: '',
  scheckheft: false,
}

interface VerkaufsCheckViewProps {
  savedCheck?: SavedVerkaufsCheck | null
  onCheckSaved?: () => void
  onClearSaved?: () => void
}

export default function VerkaufsCheckView({ savedCheck, onCheckSaved, onClearSaved }: VerkaufsCheckViewProps) {
  const navigate = useNavigate()
  const [form, setForm] = useState<VerkaufsCheckForm>(EMPTY)
  const [images, setImages] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<VerkaufsCheckResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [paymentRequired, setPaymentRequired] = useState(false)
  const [showMore, setShowMore] = useState(false)

  // Gespeicherten Check laden
  useEffect(() => {
    if (savedCheck) {
      setForm(savedCheck.eingabe)
      setResult(savedCheck.ergebnis)
      setError(null)
      setTimeout(
        () => document.getElementById('verk-result')?.scrollIntoView({ behavior: 'smooth' }),
        100
      )
    } else {
      setForm(EMPTY)
      setResult(null)
      setError(null)
    }
  }, [savedCheck])

  function set<K extends keyof VerkaufsCheckForm>(key: K, value: VerkaufsCheckForm[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  function addImages(e: React.ChangeEvent<HTMLInputElement>) {
    Array.from(e.target.files ?? []).forEach((file) => {
      const reader = new FileReader()
      reader.onload = () => setImages((prev) => [...prev, reader.result as string])
      reader.readAsDataURL(file)
    })
    e.target.value = ''
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setResult(null)
    setPaymentRequired(false)
    try {
      const res = await runVerkaufsCheck(form, images)
      setResult(res)
      setTimeout(
        () => document.getElementById('verk-result')?.scrollIntoView({ behavior: 'smooth' }),
        100
      )
      // Im Backend speichern (fire & forget — Fotos werden nicht gespeichert)
      const titel = [form.marke, form.modell, form.baujahr].filter(Boolean).join(' ')
      apiSaveCheck('verkauf', titel, form, res)
        .then(() => onCheckSaved?.())
        .catch(() => {})
    } catch (err) {
      if (err instanceof PaymentRequiredError) {
        setPaymentRequired(true)
      } else {
        setError((err as Error).message)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      className="relative h-full overflow-y-auto scrollbar-thin"
      style={{ background: 'radial-gradient(120% 60% at 50% 0%, #fdfaf6 0%, #faf7f3 40%, #f4f0ea 100%)' }}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-80 overflow-hidden">
        <div className="ez-aurora absolute left-1/2 -translate-x-1/2 -top-40 w-[720px] h-[440px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(34,197,94,0.09) 0%, transparent 68%)' }} />
      </div>

      <div className="relative max-w-3xl mx-auto px-4 sm:px-6 py-10">
        {/* Hero */}
        <div className="mb-8">
          <div className="flex items-center gap-2.5 mb-5">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-green-500/10 border border-green-400/25 text-green-600">
              <TrendingUp size={12} />
            </span>
            <span className="text-[11px] font-bold tracking-[0.22em] uppercase text-gray-500">Vira · Verkaufs-Check</span>
          </div>
          <h1 className="text-3xl sm:text-[2.6rem] font-bold text-gray-900 tracking-[-0.03em] leading-[1.0]">
            Was dein Auto
            <br />
            <span className="text-gray-400">wirklich wert ist.</span>
          </h1>
        </div>

        {/* Banner für gespeicherten Check */}
        {savedCheck && (
          <div className="mb-6 bg-green-50 border border-green-200 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm text-green-700">
              <History size={15} />
              <span>Gespeicherter Check</span>
            </div>
            <button
              onClick={onClearSaved}
              className="text-sm font-medium text-green-600 hover:text-green-800 transition-colors whitespace-nowrap"
            >
              Neue Prüfung →
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white border border-[#e6e1da] rounded-2xl p-6 space-y-5 shadow-[0_16px_36px_-24px_rgba(40,25,10,0.28)]">
            <p className="text-[11px] font-bold tracking-[0.12em] uppercase text-[#a49c92]">Dein Fahrzeug</p>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Marke" required>
                <input className={inputCls} value={form.marke}
                  onChange={(e) => set('marke', e.target.value)} placeholder="z. B. VW" required />
              </Field>
              <Field label="Modell" required>
                <input className={inputCls} value={form.modell}
                  onChange={(e) => set('modell', e.target.value)} placeholder="z. B. Golf GTI" required />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Baujahr" required>
                <input className={inputCls} type="number" min={1980} max={new Date().getFullYear() + 1}
                  value={form.baujahr} onChange={(e) => set('baujahr', parseInt(e.target.value))} required />
              </Field>
              <Field label="Kilometerstand" required>
                <div className="relative">
                  <input className={inputCls + ' pr-10'} type="number" min={0}
                    value={form.kilometerstand || ''}
                    onChange={(e) => set('kilometerstand', parseInt(e.target.value) || 0)}
                    placeholder="0" required />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">km</span>
                </div>
              </Field>
            </div>
            <Field label="Motor / Antrieb">
              <input className={inputCls} value={form.motor}
                onChange={(e) => set('motor', e.target.value)}
                placeholder="z. B. 2.0 TSI 245 PS, Benzin, DSG" />
            </Field>
            <Field label="Ausstattung">
              <textarea className={inputCls + ' resize-none'} rows={2} value={form.ausstattung}
                onChange={(e) => set('ausstattung', e.target.value)}
                placeholder="z. B. Navi, Sport-Sitze, Keyless (kommagetrennt)" />
            </Field>
            <Field label="Fahrzeugzustand" required>
              <div className="grid grid-cols-2 gap-2">
                {ZUSTAND_OPTIONS.map((opt) => (
                  <button key={opt.value} type="button" onClick={() => set('zustand', opt.value)}
                    className={`text-left p-3 rounded-xl border text-sm transition-colors ${
                      form.zustand === opt.value
                        ? 'border-green-500 bg-green-50 text-green-700'
                        : 'border-[#e6e1da] hover:border-gray-300 text-gray-700'
                    }`}>
                    <p className="font-medium">{opt.label}</p>
                    <p className={`text-xs mt-0.5 ${form.zustand === opt.value ? 'text-green-600/80' : 'text-gray-400'}`}>
                      {opt.desc}
                    </p>
                  </button>
                ))}
              </div>
            </Field>

            <button
              type="button"
              onClick={() => setShowMore((v) => !v)}
              className="flex items-center gap-1.5 text-sm text-green-600 hover:text-green-700 font-medium"
            >
              <ChevronDown size={15} className={`transition-transform ${showMore ? 'rotate-180' : ''}`} />
              Weitere Angaben (optional)
            </button>

            {showMore && (
              <div className="grid grid-cols-2 gap-4 pt-1">
                <Field label="Unfallfrei">
                  <select className={inputCls} value={form.unfallfrei}
                    onChange={(e) => set('unfallfrei', e.target.value as VerkaufsCheckForm['unfallfrei'])}>
                    <option value="">Nicht angegeben</option>
                    <option value="ja">Ja, unfallfrei</option>
                    <option value="nein">Unfallschaden vorhanden</option>
                    <option value="unbekannt">Unklar</option>
                  </select>
                </Field>
                <Field label="Anzahl Vorbesitzer">
                  <input className={inputCls} type="number" min={0} value={form.vorbesitzer}
                    onChange={(e) => set('vorbesitzer', e.target.value ? parseInt(e.target.value) : '')}
                    placeholder="z. B. 1" />
                </Field>
                <Field label="TÜV bis">
                  <input className={inputCls} value={form.tuevBis}
                    onChange={(e) => set('tuevBis', e.target.value)}
                    placeholder="z. B. 06/2027" />
                </Field>
                <div className="flex items-end pb-2.5">
                  <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
                    <input type="checkbox" checked={form.scheckheft}
                      onChange={(e) => set('scheckheft', e.target.checked)} />
                    Scheckheftgepflegt
                  </label>
                </div>
              </div>
            )}
          </div>

          {!savedCheck && (
            <div className="bg-white border border-[#e6e1da] rounded-2xl p-6 shadow-[0_16px_36px_-24px_rgba(40,25,10,0.28)]">
              <p className="text-[11px] font-bold tracking-[0.12em] uppercase text-[#a49c92] mb-1">Fotos (optional)</p>
              <p className="text-xs text-gray-500 mb-4">Fotos helfen bei der Zustandsbewertung.</p>
              <div className="flex flex-wrap gap-2">
                {images.map((img, i) => (
                  <div key={i} className="relative">
                    <img src={img} className="w-20 h-20 object-cover rounded-xl border border-gray-200" alt={`Foto ${i + 1}`} />
                    <button type="button" onClick={() => setImages(images.filter((_, j) => j !== i))}
                      className="absolute -top-1.5 -right-1.5 w-5 h-5 bg-gray-800 rounded-full flex items-center justify-center">
                      <X size={11} className="text-white" />
                    </button>
                  </div>
                ))}
                <label className="w-20 h-20 flex flex-col items-center justify-center border-2 border-dashed border-gray-200 rounded-xl cursor-pointer hover:border-gray-300 transition-colors">
                  <ImagePlus size={18} className="text-gray-400" />
                  <span className="text-xs text-gray-400 mt-1">Foto</span>
                  <input type="file" accept="image/*" multiple className="hidden" onChange={addImages} />
                </label>
              </div>
            </div>
          )}

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">{error}</div>
          )}

          {paymentRequired && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
                  <Lock size={18} className="text-amber-600" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-amber-900 mb-1">Kein Check-Kontingent mehr</p>
                  <p className="text-sm text-amber-700 mb-3">
                    Du hast alle verfügbaren Checks verbraucht. Kaufe einen Einzelcheck oder schließe ein Abo ab.
                  </p>
                  <div className="flex gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={() => navigate('/pricing')}
                      className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-sm font-medium transition-colors"
                    >
                      Preise & Abo ansehen
                    </button>
                    <button
                      type="button"
                      onClick={() => setPaymentRequired(false)}
                      className="px-4 py-2 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded-lg text-sm transition-colors"
                    >
                      Schließen
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {!savedCheck && (
            <button type="submit" disabled={loading}
              className="w-full py-3.5 text-white rounded-xl font-semibold text-sm transition-all disabled:opacity-40 disabled:saturate-50 flex items-center justify-center gap-2"
              style={{ background: 'linear-gradient(180deg, #22c55e 0%, #16a34a 100%)', boxShadow: '0 10px 24px -8px rgba(22,163,74,0.5), inset 0 1px 0 rgba(255,255,255,0.3)' }}>
              {loading
                ? <><Loader2 size={16} className="animate-spin" /> Berechne Preisspanne…</>
                : <><TrendingUp size={16} /> Verkaufswert ermitteln</>}
            </button>
          )}
        </form>

        {result && <VerkaufsReport result={result} />}
      </div>
    </div>
  )
}

function VerkaufsReport({ result }: { result: VerkaufsCheckResult }) {
  const hasPreise = result.schnellverkaufs_preis || result.empfohlener_preis || result.maximal_preis

  return (
    <div id="verk-result" className="mt-8 space-y-4">
      <h2 className="font-semibold text-gray-900 text-lg">Ergebnis</h2>

      {hasPreise && (
        <div className="bg-white border border-[#e6e1da] rounded-2xl p-6 shadow-[0_16px_36px_-24px_rgba(40,25,10,0.28)]">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-4">Preisspanne</p>
          <div className="grid grid-cols-3 gap-3 mb-4">
            <PriceCard label="Schnellverkauf" subtitle="Sofort verkaufen" price={result.schnellverkaufs_preis} days={result.verkaufsdauer_tage_schnell} variant="muted" />
            <PriceCard label="Empfohlen" subtitle="Bester Kompromiss" price={result.empfohlener_preis} variant="primary" />
            <PriceCard label="Maximum" subtitle="Geduld nötig" price={result.maximal_preis} days={result.verkaufsdauer_tage_maximal} variant="muted" />
          </div>
          {(result.marktpreis_min || result.marktpreis_max) && (
            <p className="text-xs text-gray-400">
              Marktpreis-Spanne (Referenz): {result.marktpreis_min?.toLocaleString('de-DE')} € – {result.marktpreis_max?.toLocaleString('de-DE')} €
            </p>
          )}
        </div>
      )}

      <div className="bg-white border border-[#e6e1da] rounded-2xl p-6 shadow-[0_16px_36px_-24px_rgba(40,25,10,0.28)]">
        <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-4">Detailbericht & Tipps</p>
        <div className="chat-prose">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{result.bericht}</ReactMarkdown>
        </div>
      </div>

      <SourceBadge meta={{ source: result.quelle as never, trust_level: result.vertrauen as never, belege: result.belege }} />
    </div>
  )
}

function PriceCard({
  label, subtitle, price, days, variant,
}: {
  label: string; subtitle: string; price?: number; days?: number; variant: 'primary' | 'muted'
}) {
  return (
    <div className={`rounded-xl p-4 text-center ${
      variant === 'primary'
        ? 'text-white'
        : 'bg-[#faf7f3] border border-[#e6e1da] text-gray-700'
    }`}
      style={variant === 'primary'
        ? { background: 'linear-gradient(180deg, #22c55e 0%, #16a34a 100%)', boxShadow: '0 14px 30px -12px rgba(22,163,74,0.55)' }
        : undefined}>
      <p className={`text-xs font-medium mb-1 ${variant === 'primary' ? 'text-green-100' : 'text-gray-500'}`}>
        {label}
      </p>
      <p className={`text-lg font-bold ${variant === 'primary' ? 'text-white' : 'text-gray-900'}`}>
        {price ? `${price.toLocaleString('de-DE')} €` : '–'}
      </p>
      <p className={`text-xs mt-0.5 ${variant === 'primary' ? 'text-green-100/90' : 'text-gray-400'}`}>
        {subtitle}
      </p>
      {days && (
        <p className={`text-xs mt-1 flex items-center justify-center gap-0.5 ${variant === 'primary' ? 'text-green-100/80' : 'text-gray-400'}`}>
          <Clock size={10} /> ~{days} Tage
        </p>
      )}
    </div>
  )
}

const inputCls =
  'w-full text-sm bg-white border border-[#e6e1da] rounded-xl px-3 py-2.5 outline-none focus:border-green-400 focus:ring-2 focus:ring-green-200/70 transition-colors placeholder-gray-400'

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1.5">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}
