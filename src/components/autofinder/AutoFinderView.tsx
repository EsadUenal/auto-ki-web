import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Loader2, SlidersHorizontal, Sparkles, Car } from 'lucide-react'
import { apiAutoFinder } from '../../api/client'
import {
  EMPTY_FORM,
  KAROSSERIE_OPTIONS,
  KRAFTSTOFF_OPTIONS,
  GETRIEBE_OPTIONS,
  ANTRIEB_OPTIONS,
  NUTZUNG_OPTIONS,
  PRIO_OPTIONS,
  buildPayload,
  validateForm,
  coverageState,
  humanError,
  MAX_CARDS,
  type AutoFinderForm,
  type AutoFinderResponse,
} from './logic'
import ResultCard from './ResultCard'

type MultiKey = 'karosserie' | 'kraftstoff' | 'getriebe' | 'antrieb'

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        'text-sm rounded-full px-3 py-1.5 border transition-colors ' +
        (active
          ? 'bg-orange-500 border-orange-500 text-white'
          : 'bg-white border-gray-200 text-gray-700 hover:border-gray-300')
      }
      aria-pressed={active}
    >
      {children}
    </button>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-gray-500 mb-1">{label}</span>
      {children}
    </label>
  )
}

const inputCls =
  'w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300/50'

function GroupTitle({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <h2 className="text-[11px] font-bold tracking-[0.2em] uppercase text-gray-500 flex items-center gap-2">
      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-gray-100 text-gray-500 text-[10px]">{n}</span>
      {children}
    </h2>
  )
}

export default function AutoFinderView() {
  const [form, setForm] = useState<AutoFinderForm>(EMPTY_FORM)
  const [showMore, setShowMore] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [resp, setResp] = useState<AutoFinderResponse | null>(null)

  function set<K extends keyof AutoFinderForm>(key: K, value: AutoFinderForm[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }
  function toggleMulti(key: MultiKey, value: string) {
    setForm((f) => {
      const cur = f[key]
      return { ...f, [key]: cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value] }
    })
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (loading) return
    const vErr = validateForm(form)
    if (vErr) { setError(vErr); return }
    setLoading(true)
    setError(null)
    try {
      const r = await apiAutoFinder(buildPayload(form))
      setResp(r)
      setTimeout(() => document.getElementById('af-results')?.scrollIntoView({ behavior: 'smooth' }), 80)
    } catch (err) {
      setError(humanError(err))
      setResp(null)
    } finally {
      setLoading(false)
    }
  }

  const cov = resp ? coverageState(resp) : null
  const cards = resp?.kandidaten.slice(0, MAX_CARDS) ?? []

  return (
    <div className="min-h-screen bg-white">
      {/* Kopf */}
      <header className="border-b border-gray-100">
        <div className="max-w-5xl mx-auto px-5 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2">
            <img src="/logo.svg" alt="Vira" className="w-6 h-6 rounded-md" />
            <span className="font-semibold text-gray-900 tracking-tight">Vira</span>
          </Link>
          <Link to="/login" className="text-sm text-gray-500 hover:text-gray-800">Anmelden</Link>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-5 py-8 ez-rise">
        <div className="flex items-center gap-2 text-orange-600">
          <Sparkles size={16} />
          <span className="text-[11px] font-bold tracking-[0.22em] uppercase">AutoFinder</span>
        </div>
        <h1 className="mt-2 text-2xl sm:text-3xl font-bold text-gray-900 tracking-tight">
          Welches Auto passt zu dir?
        </h1>
        <p className="mt-2 text-gray-600 max-w-2xl">
          Sag uns dein Budget, wie du fährst und was dir wichtig ist. VIRA schlägt dir bis zu
          fünf Modelle aus seiner gepflegten Fahrzeugdatenbank vor — kostenlos und ohne Konto.
        </p>

        <form onSubmit={submit} className="mt-8 space-y-8">
          {/* 1 — Budget */}
          <section className="space-y-3">
            <GroupTitle n={1}>Budget</GroupTitle>
            <div className="grid grid-cols-2 gap-3 max-w-md">
              <Field label="von (€)">
                <input inputMode="numeric" className={inputCls} value={form.budget_min}
                  onChange={(e) => set('budget_min', e.target.value)} placeholder="10.000" />
              </Field>
              <Field label="bis (€)">
                <input inputMode="numeric" className={inputCls} value={form.budget_max}
                  onChange={(e) => set('budget_max', e.target.value)} placeholder="25.000" />
              </Field>
            </div>
            <p className="text-xs text-gray-400">
              Das Budget dient nur der groben Einordnung der Reihenfolge — VIRA nennt keinen Marktpreis.
            </p>
          </section>

          {/* 2 — Fahrzeug */}
          <section className="space-y-4">
            <GroupTitle n={2}>Fahrzeug</GroupTitle>
            <div>
              <span className="block text-xs font-medium text-gray-500 mb-1.5">Karosserie</span>
              <div className="flex flex-wrap gap-2">
                {KAROSSERIE_OPTIONS.map((o) => (
                  <Chip key={o.value} active={form.karosserie.includes(o.value)}
                    onClick={() => toggleMulti('karosserie', o.value)}>{o.label}</Chip>
                ))}
              </div>
            </div>
            <div>
              <span className="block text-xs font-medium text-gray-500 mb-1.5">Kraftstoff</span>
              <div className="flex flex-wrap gap-2">
                {KRAFTSTOFF_OPTIONS.map((o) => (
                  <Chip key={o.value} active={form.kraftstoff.includes(o.value)}
                    onClick={() => toggleMulti('kraftstoff', o.value)}>{o.label}</Chip>
                ))}
              </div>
            </div>
            <div>
              <span className="block text-xs font-medium text-gray-500 mb-1.5">Getriebe</span>
              <div className="flex flex-wrap gap-2">
                {GETRIEBE_OPTIONS.map((o) => (
                  <Chip key={o.value} active={form.getriebe.includes(o.value)}
                    onClick={() => toggleMulti('getriebe', o.value)}>{o.label}</Chip>
                ))}
              </div>
            </div>
          </section>

          {/* 3 — Nutzung */}
          <section className="space-y-3">
            <GroupTitle n={3}>Nutzung</GroupTitle>
            <div className="flex flex-wrap gap-2">
              {NUTZUNG_OPTIONS.map((o) => (
                <Chip key={o.value} active={form.nutzung === o.value}
                  onClick={() => set('nutzung', form.nutzung === o.value ? '' : o.value)}>{o.label}</Chip>
              ))}
            </div>
            <div className="max-w-xs">
              <Field label="Kilometer pro Jahr (optional)">
                <input inputMode="numeric" className={inputCls} value={form.km_pro_jahr}
                  onChange={(e) => set('km_pro_jahr', e.target.value)} placeholder="15.000" />
              </Field>
            </div>
          </section>

          {/* 4 — Prioritäten */}
          <section className="space-y-3">
            <GroupTitle n={4}>Was ist dir wichtig?</GroupTitle>
            <div className="flex flex-wrap gap-2">
              {PRIO_OPTIONS.map((p) => (
                <Chip key={p.key} active={form[p.key]} onClick={() => set(p.key, !form[p.key])}>
                  {p.label}
                </Chip>
              ))}
            </div>
          </section>

          {/* Mehr Filter */}
          <div>
            <button type="button" onClick={() => setShowMore((v) => !v)}
              className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900">
              <SlidersHorizontal size={14} />
              {showMore ? 'Weniger Filter' : 'Mehr Filter'}
            </button>
          </div>

          {showMore && (
            <section className="space-y-4 rounded-xl border border-gray-100 bg-gray-50/60 p-4">
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <Field label="Baujahr von">
                  <input inputMode="numeric" className={inputCls} value={form.baujahr_von}
                    onChange={(e) => set('baujahr_von', e.target.value)} placeholder="2016" />
                </Field>
                <Field label="Baujahr bis">
                  <input inputMode="numeric" className={inputCls} value={form.baujahr_bis}
                    onChange={(e) => set('baujahr_bis', e.target.value)} placeholder="2022" />
                </Field>
                <Field label="Leistung ab (PS)">
                  <input inputMode="numeric" className={inputCls} value={form.leistung_min_ps}
                    onChange={(e) => set('leistung_min_ps', e.target.value)} placeholder="120" />
                </Field>
                <Field label="Leistung bis (PS)">
                  <input inputMode="numeric" className={inputCls} value={form.leistung_max_ps}
                    onChange={(e) => set('leistung_max_ps', e.target.value)} placeholder="250" />
                </Field>
              </div>
              <div className="max-w-xs">
                <Field label="Kilometerstand max.">
                  <input inputMode="numeric" className={inputCls} value={form.kilometer_max}
                    onChange={(e) => set('kilometer_max', e.target.value)} placeholder="120.000" />
                </Field>
                <p className="mt-1 text-[11px] text-gray-400">
                  Kilometer fließen aktuell nicht in die Auswahl ein — nur zur Orientierung.
                </p>
              </div>
              <div>
                <span className="block text-xs font-medium text-gray-500 mb-1.5">Antrieb</span>
                <div className="flex flex-wrap gap-2">
                  {ANTRIEB_OPTIONS.map((o) => (
                    <Chip key={o.value} active={form.antrieb.includes(o.value)}
                      onClick={() => toggleMulti('antrieb', o.value)}>{o.label}</Chip>
                  ))}
                </div>
              </div>
              <div className="grid sm:grid-cols-2 gap-3">
                <Field label="Bevorzugte Marken (Komma-getrennt)">
                  <input className={inputCls} value={form.marken_bevorzugt}
                    onChange={(e) => set('marken_bevorzugt', e.target.value)} placeholder="BMW, Audi" />
                </Field>
                <Field label="Marken ausschließen">
                  <input className={inputCls} value={form.marken_ausschliessen}
                    onChange={(e) => set('marken_ausschliessen', e.target.value)} placeholder="z. B. Tesla" />
                </Field>
              </div>
            </section>
          )}

          {error && (
            <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="sticky bottom-0 -mx-5 px-5 py-3 bg-white/90 backdrop-blur border-t border-gray-100">
            <button type="submit" disabled={loading}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-6 py-3 text-white font-semibold hover:bg-orange-600 disabled:opacity-60">
              {loading ? <><Loader2 size={16} className="animate-spin" /> Suche läuft …</> : <><Car size={16} /> Autos für mich finden</>}
            </button>
          </div>
        </form>

        {/* Ergebnisse */}
        <div id="af-results" className="mt-10 scroll-mt-6">
          {loading && (
            <div className="flex items-center gap-3 text-gray-500">
              <Loader2 size={18} className="animate-spin text-orange-500" />
              VIRA gleicht deine Angaben mit der Fahrzeugdatenbank ab …
            </div>
          )}

          {!loading && resp && cov && (
            <>
              {cov.kind !== 'ok' && (
                <div className={
                  'rounded-xl border p-4 ' +
                  (cov.kind === 'none' ? 'border-gray-200 bg-gray-50' : 'border-amber-200 bg-amber-50')
                }>
                  <p className="font-semibold text-gray-900">{cov.headline}</p>
                  <p className="mt-1 text-sm text-gray-600">{cov.detail}</p>
                </div>
              )}

              {cards.length > 0 && (
                <>
                  <div className="flex items-baseline justify-between">
                    <h2 className="text-lg font-bold text-gray-900 tracking-tight">
                      {cards.length === 1 ? 'Ein Vorschlag' : `Top ${cards.length}`} für dich
                    </h2>
                  </div>
                  <div className="mt-4 space-y-4">
                    {cards.map((k, i) => (
                      <ResultCard key={k.candidate_id || `${k.marke}-${k.modell}-${i}`} k={k} rank={i + 1} />
                    ))}
                  </div>
                </>
              )}

              {resp.warnings.filter((w) => !cov.detail || w !== cov.detail).length > 0 && (
                <ul className="mt-4 space-y-1 text-xs text-gray-500 list-disc pl-5">
                  {resp.warnings.filter((w) => !cov.detail || w !== cov.detail).map((w, i) => <li key={i}>{w}</li>)}
                </ul>
              )}

              <p className="mt-6 text-xs text-gray-400">{resp.data_scope_hint}</p>
            </>
          )}
        </div>
      </main>
    </div>
  )
}
