import { useState } from 'react'
import { TrendingUp, ImagePlus, X, Loader2, ChevronRight, Clock } from 'lucide-react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { runVerkaufsCheck } from '../api/client'
import SourceBadge from './SourceBadge'
import type { VerkaufsCheckForm, VerkaufsCheckResult } from '../types'

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
}

export default function VerkaufsCheckView() {
  const [form, setForm] = useState<VerkaufsCheckForm>(EMPTY)
  const [images, setImages] = useState<string[]>([])
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<VerkaufsCheckResult | null>(null)
  const [error, setError] = useState<string | null>(null)

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
    try {
      const res = await runVerkaufsCheck(form, images)
      setResult(res)
      setTimeout(
        () => document.getElementById('verk-result')?.scrollIntoView({ behavior: 'smooth' }),
        100
      )
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="h-full overflow-y-auto">
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-green-600 flex items-center justify-center">
            <TrendingUp size={20} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900">Verkaufs-Check</h1>
            <p className="text-sm text-gray-500">Dein Auto bewerten — Preisspanne und Tipps</p>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white border border-gray-200 rounded-2xl p-6 space-y-5">
            <h2 className="font-medium text-gray-800">Dein Fahrzeug</h2>
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
                        ? 'border-gray-900 bg-gray-900 text-white'
                        : 'border-gray-200 hover:border-gray-300 text-gray-700'
                    }`}>
                    <p className="font-medium">{opt.label}</p>
                    <p className={`text-xs mt-0.5 ${form.zustand === opt.value ? 'text-gray-300' : 'text-gray-400'}`}>
                      {opt.desc}
                    </p>
                  </button>
                ))}
              </div>
            </Field>
          </div>

          <div className="bg-white border border-gray-200 rounded-2xl p-6">
            <h2 className="font-medium text-gray-800 mb-1">Fotos (optional)</h2>
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

          {error && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4 text-sm text-red-700">{error}</div>
          )}

          <button type="submit" disabled={loading}
            className="w-full py-3 bg-gray-900 text-white rounded-xl font-medium text-sm hover:bg-gray-800 disabled:bg-gray-200 disabled:text-gray-400 transition-colors flex items-center justify-center gap-2">
            {loading
              ? <><Loader2 size={16} className="animate-spin" /> Berechne Preisspanne…</>
              : <><TrendingUp size={16} /> Verkaufswert ermitteln</>}
          </button>
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

      {/* Preisspanne — prominent */}
      {hasPreise && (
        <div className="bg-white border border-gray-200 rounded-2xl p-6">
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

      {/* Bericht (Markdown) */}
      <div className="bg-white border border-gray-200 rounded-2xl p-6">
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
        ? 'bg-gray-900 text-white ring-2 ring-gray-900'
        : 'bg-gray-50 border border-gray-200 text-gray-700'
    }`}>
      <p className={`text-xs font-medium mb-1 ${variant === 'primary' ? 'text-gray-300' : 'text-gray-500'}`}>
        {label}
      </p>
      <p className={`text-lg font-bold ${variant === 'primary' ? 'text-white' : 'text-gray-900'}`}>
        {price ? `${price.toLocaleString('de-DE')} €` : '–'}
      </p>
      <p className={`text-xs mt-0.5 ${variant === 'primary' ? 'text-gray-400' : 'text-gray-400'}`}>
        {subtitle}
      </p>
      {days && (
        <p className={`text-xs mt-1 flex items-center justify-center gap-0.5 ${variant === 'primary' ? 'text-gray-500' : 'text-gray-400'}`}>
          <Clock size={10} /> ~{days} Tage
        </p>
      )}
    </div>
  )
}

const inputCls =
  'w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 outline-none focus:border-gray-400 focus:ring-1 focus:ring-gray-200 transition-colors placeholder-gray-400'

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
