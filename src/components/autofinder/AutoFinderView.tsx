import { useEffect, useRef, useState } from 'react'
import { Loader2, SlidersHorizontal, Car, Clock, RotateCcw, Check, ChevronRight } from 'lucide-react'
import { apiAutoFinder, apiAutoFinderImagesEnsure, API_BASE_URL } from '../../api/client'
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
  fehlendeBilder,
  waehleImageReady,
  aktualisiereGespeicherteBilder,
  ladeSuchen,
  speichereSuche,
  loescheSuchen,
  takeSucheRestore,
  HISTORY_EVENT,
  RESTORE_EVENT,
  MAX_CARDS,
  type AutoFinderForm,
  type AutoFinderResponse,
  type ImageEnsureResult,
  type GespeicherteSuche,
} from './logic'
import ResultCard from './ResultCard'

type MultiKey = 'karosserie' | 'kraftstoff' | 'getriebe' | 'antrieb'

const PROGRESS_STEPS = [
  'Passende Fahrzeuge werden gefiltert …',
  'Motorvarianten werden verglichen …',
  'Stärken und mögliche Nachteile werden geprüft …',
  'Preisorientierung wird eingeordnet …',
  'Fahrzeugdarstellungen werden vorbereitet …',
]

function Chip({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={
        'text-sm font-medium rounded-full px-3.5 py-1.5 border transition-all duration-150 ' +
        (active
          ? 'bg-orange-500 border-orange-500 text-white shadow-[0_8px_16px_-8px_rgba(249,115,22,0.6)]'
          : 'bg-white border-[#e6e1da] text-gray-600 hover:border-orange-300 hover:text-gray-900 hover:bg-orange-50/50')
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
  'w-full rounded-lg border border-[#e6e1da] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300/50 focus:border-orange-300 transition-colors'

function GroupTitle({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <h2 className="text-[11px] font-bold tracking-[0.2em] uppercase text-gray-500 flex items-center gap-2">
      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-orange-500/10 text-orange-600 text-[10px] font-bold">{n}</span>
      {children}
    </h2>
  )
}

export default function AutoFinderView() {
  const [form, setForm] = useState<AutoFinderForm>(EMPTY_FORM)
  const [showMore, setShowMore] = useState(false)
  const [loading, setLoading] = useState(false)
  const [progressStep, setProgressStep] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [resp, setResp] = useState<AutoFinderResponse | null>(null)
  const [pendingKeys, setPendingKeys] = useState<Set<string>>(new Set())
  const [historie, setHistorie] = useState<GespeicherteSuche[]>([])
  const [showHistorie, setShowHistorie] = useState(false)
  const [restauriert, setRestauriert] = useState(false)   // Ergebnisse aus dem Verlauf, nicht frisch gesucht
  const progressTimer = useRef<ReturnType<typeof setInterval> | null>(null)
  const restoreHandled = useRef(false)

  // Historie einlesen + auf Änderungen (auch aus der Sidebar) reagieren.
  useEffect(() => {
    const refresh = () => setHistorie(ladeSuchen())
    refresh()
    window.addEventListener(HISTORY_EVENT, refresh)
    return () => window.removeEventListener(HISTORY_EVENT, refresh)
  }, [])
  useEffect(() => () => { if (progressTimer.current) clearInterval(progressTimer.current) }, [])

  // §Punkt 6 / BUG 2: kommt der Nutzer über einen Sidebar-/Panel-Klick auf eine
  // gespeicherte Suche, Filter wiederherstellen und — falls vorhanden — die
  // gespeicherten Ergebnisse SOFORT zeigen (kein neuer Gemini-Call).
  // Funktioniert beim ersten Mount UND wenn die Seite schon offen ist
  // (navigate('/autofinder') auf sich selbst remountet nicht -> RESTORE_EVENT).
  useEffect(() => {
    const handleRestore = () => {
      const s = takeSucheRestore()
      if (!s) return
      setForm(s.form)
      setShowHistorie(false)
      setError(null)
      if (s.response) {
        setResp(s.response)
        setRestauriert(true)
        // §8: gespeicherte on-demand-Bilder frisch aus dem aktuellen Cache lösen
        void aktualisiereGespeicherteBilder(s.response, apiAutoFinderImagesEnsure, API_BASE_URL)
          .then((upd) => { if (upd) setResp(upd) })
        setTimeout(() => document.getElementById('af-results')?.scrollIntoView({ behavior: 'smooth' }), 120)
      } else {
        window.scrollTo({ top: 0, behavior: 'smooth' })
        void runSearch(s.form)
      }
    }
    if (!restoreHandled.current) {
      restoreHandled.current = true
      handleRestore()
    }
    window.addEventListener(RESTORE_EVENT, handleRestore)
    return () => window.removeEventListener(RESTORE_EVENT, handleRestore)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  function set<K extends keyof AutoFinderForm>(key: K, value: AutoFinderForm[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }
  function toggleMulti(key: MultiKey, value: string) {
    setForm((f) => {
      const cur = f[key]
      return { ...f, [key]: cur.includes(value) ? cur.filter((v) => v !== value) : [...cur, value] }
    })
  }

  function startProgress() {
    setProgressStep(0)
    if (progressTimer.current) clearInterval(progressTimer.current)
    progressTimer.current = setInterval(() => {
      // bis Schritt 4 automatisch weiterlaufen; Schritt 5 (Bilder) ist real.
      setProgressStep((s) => (s < 3 ? s + 1 : s))
    }, 3500)
  }
  function stopProgress() {
    if (progressTimer.current) { clearInterval(progressTimer.current); progressTimer.current = null }
  }

  async function runSearch(f: AutoFinderForm) {
    const vErr = validateForm(f)
    if (vErr) { setError(vErr); return }
    setLoading(true)
    setError(null)
    setResp(null)
    setRestauriert(false)
    setPendingKeys(new Set())
    startProgress()
    try {
      const r = await apiAutoFinder(buildPayload(f))

      // ── Image-Guarantee (FIX 3) ────────────────────────────────────────────
      // Das Backend liefert einen qualifizierten Pool (bis 8, alle >= Fit-
      // Schwelle). Fehlende Bilder werden JETZT — vor dem Anzeigen — über den
      // separaten Endpunkt nachgezogen. Danach wird nur das finale image-ready
      // Set (<= 5) gerendert: kein Symbolbild, keine Karte, die erst erscheint
      // und dann verschwindet (§Punkt 7).
      const fehlen = fehlendeBilder(r.kandidaten)
      let ensureResults: ImageEnsureResult[] = []
      if (fehlen.length > 0) {
        setProgressStep(4)
        setPendingKeys(new Set(fehlen.map((i) => i.visual_key)))
        ensureResults = await apiAutoFinderImagesEnsure(fehlen)
      }
      const finale = waehleImageReady(r.kandidaten, ensureResults, API_BASE_URL)
      const warnings = [...r.warnings]
      if (finale.length === 0 && r.kandidaten.length > 0) {
        warnings.push(
          'Für die besten Treffer konnte gerade keine Fahrzeugdarstellung ' +
          'vorbereitet werden. Bitte versuche es in einem Moment noch einmal.',
        )
      }
      const finalResp: AutoFinderResponse = { ...r, kandidaten: finale, warnings }

      stopProgress()
      setPendingKeys(new Set())
      setResp(finalResp)
      setHistorie(speichereSuche(f, finalResp))
      setTimeout(() => document.getElementById('af-results')?.scrollIntoView({ behavior: 'smooth' }), 80)
    } catch (err) {
      stopProgress()
      setError(humanError(err))
      setResp(null)
    } finally {
      stopProgress()
      setLoading(false)
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (loading) return
    await runSearch(form)
  }

  function restoreSuche(s: GespeicherteSuche) {
    setForm(s.form)
    setShowHistorie(false)
    if (s.response) {
      // gespeicherte Ergebnisse sofort zeigen — kein neuer Gemini-Call (§Punkt 6)
      setResp(s.response)
      setRestauriert(true)
      setError(null)
      // §8: on-demand-Bilder frisch aus dem aktuellen Cache lösen
      void aktualisiereGespeicherteBilder(s.response, apiAutoFinderImagesEnsure, API_BASE_URL)
        .then((upd) => { if (upd) setResp(upd) })
      setTimeout(() => document.getElementById('af-results')?.scrollIntoView({ behavior: 'smooth' }), 120)
    } else {
      window.scrollTo({ top: 0, behavior: 'smooth' })
      void runSearch(s.form)
    }
  }

  const cov = resp ? coverageState(resp) : null
  const cards = resp?.kandidaten.slice(0, MAX_CARDS) ?? []
  const notice = resp?.enrichment_notice ?? null
  const restWarnings = (resp?.warnings ?? []).filter(
    (w) => w !== notice && (!cov?.detail || w !== cov.detail),
  )

  return (
    <div
      className="relative h-full overflow-y-auto scrollbar-thin"
      style={{ background: 'radial-gradient(120% 60% at 50% 0%, #fdfaf6 0%, #faf7f3 40%, #f4f0ea 100%)' }}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-80 overflow-hidden">
        <div className="ez-aurora absolute left-1/2 -translate-x-1/2 -top-40 w-[720px] h-[440px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(249,115,22,0.09) 0%, transparent 68%)' }} />
      </div>

      <div className="ez-rise relative max-w-3xl mx-auto px-4 sm:px-6 py-8">
        {/* Hero — kompakt: eine Zeile Meta, eine Zeile Headline, kurzer Subtext */}
        <div className="mb-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-orange-500/10 border border-orange-400/25 text-orange-500">
                <Car size={12} />
              </span>
              <span className="text-[11px] font-bold tracking-[0.22em] uppercase text-gray-500">Vira · AutoFinder</span>
            </div>

            {historie.length > 0 && (
              <button
                type="button"
                onClick={() => setShowHistorie((v) => !v)}
                aria-expanded={showHistorie}
                className={
                  'inline-flex items-center gap-1.5 text-xs font-semibold rounded-full pl-3 pr-2.5 py-1.5 border transition-colors ' +
                  (showHistorie
                    ? 'bg-gray-900 border-gray-900 text-white'
                    : 'bg-white border-[#e6e1da] text-gray-600 hover:border-[#d8d0c2] hover:text-gray-900')
                }
              >
                <Clock size={13} /> Letzte Suchen
                <span className={
                  'inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-bold ' +
                  (showHistorie ? 'bg-white/20 text-white' : 'bg-orange-500/10 text-orange-600')
                }>{historie.length}</span>
              </button>
            )}
          </div>

          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-[-0.03em] leading-[1.05]">
            Welches Auto <span className="text-gray-400">passt zu dir?</span>
          </h1>
          <p className="mt-2 text-sm text-gray-500 max-w-md leading-relaxed">
            Budget, Fahrweise und Prioritäten — VIRA schlägt dir die am besten passenden
            Modelle aus seiner gepflegten Datenbank vor. Kostenlos, ohne Konto.
          </p>
        </div>

        {showHistorie && historie.length > 0 && (
          <div className="mb-6 rounded-2xl border border-[#e6e1da] bg-white p-4 sm:p-5 shadow-[0_16px_36px_-28px_rgba(40,25,10,0.22)] ez-rise">
            <div className="flex items-center justify-between mb-3">
              <span className="text-[11px] font-bold tracking-[0.2em] uppercase text-gray-500">Letzte Suchen</span>
              <button type="button" onClick={() => { loescheSuchen(); setHistorie([]); setShowHistorie(false) }}
                className="text-xs font-medium text-gray-400 hover:text-red-600 transition-colors">Verlauf löschen</button>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              {historie.map((s) => (
                <div key={s.id}
                  className="group rounded-xl border border-[#e6e1da] bg-[#faf8f5] hover:bg-white hover:border-orange-200 hover:shadow-[0_10px_22px_-16px_rgba(40,25,10,0.25)] transition-all p-3 flex items-center justify-between gap-3"
                >
                  <div className="min-w-0">
                    <p className="text-sm text-gray-800 font-semibold truncate">{s.label}</p>
                    <p className="mt-0.5 text-[11px] text-gray-400 truncate">
                      {s.fahrzeuge.length > 0
                        ? s.fahrzeuge.slice(0, 3).map((f) => f.user_fit ? `${f.titel} ${f.user_fit}%` : f.titel).join(' · ')
                        : 'kein starker Treffer'}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => restoreSuche(s)}
                    className="shrink-0 inline-flex items-center gap-1 text-xs font-semibold text-orange-600 bg-orange-50 border border-orange-200/80 rounded-lg px-2.5 py-1.5 hover:bg-orange-100 transition-colors"
                  >
                    <RotateCcw size={12} /> Öffnen
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <form onSubmit={submit} className="rounded-2xl border border-[#e6e1da] bg-white shadow-[0_20px_44px_-30px_rgba(40,25,10,0.24)] overflow-hidden">
          <div className="divide-y divide-[#efe9df]">
            {/* 1 — Budget */}
            <section className="p-5 sm:p-6 space-y-3">
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
                Das Budget steuert die Reihenfolge und die Preisorientierung. VIRA nennt bewusst
                keinen Live-Marktpreis.
              </p>
            </section>

            {/* 2 — Fahrzeug */}
            <section className="p-5 sm:p-6 space-y-4">
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
            <section className="p-5 sm:p-6 space-y-3">
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
            <section className="p-5 sm:p-6 space-y-3">
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
            <section className="p-5 sm:p-6">
              <button type="button" onClick={() => setShowMore((v) => !v)}
                className="inline-flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900">
                <SlidersHorizontal size={14} />
                {showMore ? 'Weniger Filter' : 'Mehr Filter'}
                <ChevronRight size={14} className={'transition-transform ' + (showMore ? 'rotate-90' : '')} />
              </button>

              {showMore && (
                <div className="mt-4 space-y-4 rounded-xl border border-[#e6e1da] bg-[#faf8f5] p-4">
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
                </div>
              )}
            </section>
          </div>

          {/* CTA-Leiste — bewusst abgesetzt, damit der Haupt-Call-to-Action klar heraussticht */}
          <div className="p-5 sm:p-6 bg-[#faf8f5] border-t border-[#efe9df]">
            {error && (
              <div role="alert" className="mb-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}
            <button type="submit" disabled={loading}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-7 py-3.5 text-white font-semibold text-[15px] shadow-[0_14px_28px_-12px_rgba(249,115,22,0.55)] hover:bg-orange-600 hover:shadow-[0_16px_32px_-10px_rgba(249,115,22,0.6)] disabled:opacity-60 disabled:shadow-none transition-all">
              {loading ? <><Loader2 size={16} className="animate-spin" /> Suche läuft …</> : <><Car size={16} /> Autos für mich finden</>}
            </button>
            <p className="mt-2 text-[11px] text-gray-400">
              Eine gründliche Suche dauert je nach Auslastung ca. 15–30 Sekunden.
            </p>
          </div>
        </form>

        {/* Ergebnisse */}
        <div id="af-results" className="mt-8 scroll-mt-6">
          {loading && (
            <div className="rounded-2xl border border-[#e6e1da] bg-white p-5 sm:p-6 shadow-[0_16px_36px_-28px_rgba(40,25,10,0.22)]">
              <div className="flex items-center gap-3 text-gray-800 font-semibold">
                <Loader2 size={18} className="animate-spin text-orange-500" />
                {PROGRESS_STEPS[Math.min(progressStep, PROGRESS_STEPS.length - 1)]}
              </div>
              <ol className="mt-4 space-y-2">
                {PROGRESS_STEPS.map((label, i) => (
                  <li key={i} className={
                    'flex items-center gap-2.5 text-sm transition-colors ' +
                    (i < progressStep ? 'text-gray-400' : i === progressStep ? 'text-gray-800 font-medium' : 'text-gray-300')
                  }>
                    {i < progressStep
                      ? <Check size={13} className="text-emerald-500 shrink-0" />
                      : <span className={'w-3 h-3 rounded-full shrink-0 ' + (i === progressStep ? 'bg-orange-400 animate-pulse' : 'bg-gray-200')} />}
                    {label}
                  </li>
                ))}
              </ol>
            </div>
          )}

          {!loading && resp && cov && (
            <>
              {restauriert && (
                <div className="mb-5 rounded-2xl border border-[#e6e1da] bg-[#faf8f5] p-4 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-sm text-gray-600 flex items-center gap-1.5">
                    <Clock size={14} className="text-gray-400" /> Gespeicherte Suche geöffnet
                  </p>
                  <button
                    type="button"
                    onClick={() => runSearch(form)}
                    className="inline-flex items-center gap-1.5 text-sm font-medium text-white bg-orange-500 rounded-lg px-3 py-1.5 hover:bg-orange-600 transition-colors"
                  >
                    <RotateCcw size={13} /> Neu suchen
                  </button>
                </div>
              )}

              {cov.kind !== 'ok' && (
                <div className={
                  'rounded-2xl border p-5 ' +
                  (cov.kind === 'none' ? 'border-[#e6e1da] bg-[#faf8f5]' : 'border-amber-200 bg-amber-50/70')
                }>
                  <p className="font-semibold text-gray-900">{cov.headline}</p>
                  <p className="mt-1 text-sm text-gray-600">{cov.detail}</p>
                </div>
              )}

              {cards.length > 0 && (
                <>
                  <div className="flex items-baseline justify-between gap-3 mb-4">
                    <h2 className="text-lg font-bold text-gray-900 tracking-tight">
                      {cards.length === 1 ? 'Ein Vorschlag' : `Top ${cards.length}`} für dich
                    </h2>
                    <span className="text-xs text-gray-400">sortiert nach Passung</span>
                  </div>
                  <div className="space-y-4">
                    {cards.map((k, i) => (
                      <ResultCard
                        key={k.candidate_id || `${k.marke}-${k.modell}-${i}`}
                        k={k} rank={i + 1}
                        imagePending={pendingKeys.has(k.visual_key)}
                      />
                    ))}
                  </div>
                </>
              )}

              {notice && (
                <p className="mt-4 text-xs text-gray-500 flex items-start gap-1.5">
                  <span className="mt-px">ℹ</span>{notice}
                </p>
              )}

              {restWarnings.length > 0 && (
                <ul className="mt-3 space-y-1 text-xs text-gray-500 list-disc pl-5">
                  {restWarnings.map((w, i) => <li key={i}>{w}</li>)}
                </ul>
              )}

              <p className="mt-6 text-xs text-gray-400">{resp.data_scope_hint}</p>
            </>
          )}
        </div>
      </div>
    </div>
  )
}
