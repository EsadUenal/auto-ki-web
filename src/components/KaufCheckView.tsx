import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ShoppingCart,
  ImagePlus,
  X,
  Loader2,
  CheckCircle,
  MinusCircle,
  XCircle,
  AlertTriangle,
  Wrench,
  History,
  Lock,
  ChevronDown,
} from 'lucide-react'
import { runKaufCheck, apiSaveCheck, PaymentRequiredError } from '../api/client'
import SourceBadge from './SourceBadge'
import AnalyseFrageChat from './AnalyseFrageChat'
import EvidenceWhy, { insightsByIds } from './EvidenceWhy'
import KeyFindings from './KeyFindings'
import {
  marktanalyseOf, MarketMetrics, RiskOverview, NextSteps, CollapsibleReport,
} from './ResultSummary'
import type { KaufCheckForm, KaufCheckResult, SavedKaufCheck } from '../types'

const EMPTY: KaufCheckForm = {
  marke: '',
  modell: '',
  baujahr: new Date().getFullYear() - 3,
  kilometerstand: 0,
  motor: '',
  ausstattung: '',
  preis: 0,
  beschreibung: '',
  unfallfrei: '',
  vorbesitzer: '',
  tuevBis: '',
  scheckheft: false,
}

interface KaufCheckViewProps {
  savedCheck?: SavedKaufCheck | null
  onCheckSaved?: () => void
  onClearSaved?: () => void
}

export default function KaufCheckView({ savedCheck, onCheckSaved, onClearSaved }: KaufCheckViewProps) {
  const navigate = useNavigate()
  const [form, setForm] = useState<KaufCheckForm>(EMPTY)
  const [screenshot, setScreenshot] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<KaufCheckResult | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [paymentRequired, setPaymentRequired] = useState(false)
  const [showMore, setShowMore] = useState(false)
  // Check-ID für die Persistenz der Analyse-Rückfragen. Bei einem frisch
  // erstellten Check trifft sie erst nach dem Speichern ein. runId hält den
  // AnalyseFrageChat über die ID-Zuweisung hinweg stabil (kein Remount).
  const [freshCheckId, setFreshCheckId] = useState<number | undefined>(undefined)
  const [runId, setRunId] = useState(0)

  // Gespeicherten Check laden
  useEffect(() => {
    if (savedCheck) {
      setForm(savedCheck.eingabe)
      setResult(savedCheck.ergebnis)
      setError(null)
      setTimeout(
        () => document.getElementById('kauf-result')?.scrollIntoView({ behavior: 'smooth' }),
        100
      )
    } else {
      setForm(EMPTY)
      setResult(null)
      setError(null)
    }
  }, [savedCheck])

  function set<K extends keyof KaufCheckForm>(key: K, value: KaufCheckForm[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError(null)
    setResult(null)
    setPaymentRequired(false)
    setFreshCheckId(undefined)   // neue Prüfung → alte Check-ID verwerfen
    setRunId((n) => n + 1)        // frischen Chat-Kontext erzwingen
    try {
      const res = await runKaufCheck(form, screenshot)
      setResult(res)
      setTimeout(
        () => document.getElementById('kauf-result')?.scrollIntoView({ behavior: 'smooth' }),
        100
      )
      // Im Backend speichern; die zurückgegebene ID koppelt die Analyse-Rückfragen.
      const titel = [form.marke, form.modell, form.baujahr].filter(Boolean).join(' ')
      apiSaveCheck('kauf', titel, form, res)
        .then((saved) => {
          setFreshCheckId(saved.id)
          onCheckSaved?.()
        })
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
      {/* Eine ruhige warme Lichtquelle oben */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-80 overflow-hidden">
        <div className="ez-aurora absolute left-1/2 -translate-x-1/2 -top-40 w-[720px] h-[440px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.09) 0%, transparent 68%)' }} />
      </div>

      <div className="ez-rise relative max-w-3xl mx-auto px-4 sm:px-6 py-10">
        {/* Hero */}
        <div className="mb-8">
          <div className="flex items-center gap-2.5 mb-5">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-blue-500/10 border border-blue-400/25 text-blue-600">
              <ShoppingCart size={12} />
            </span>
            <span className="text-[11px] font-bold tracking-[0.22em] uppercase text-gray-500">Vira · Kauf-Check</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 tracking-[-0.03em] leading-[1.0]">
            Kauf mit Sicherheit.
            <br />
            <span className="text-gray-400">Bevor du bezahlst.</span>
          </h1>
        </div>

        {/* Banner für gespeicherten Check */}
        {savedCheck && (
          <div className="mb-6 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-sm text-blue-700">
              <History size={15} />
              <span>Gespeicherter Check</span>
            </div>
            <button
              onClick={onClearSaved}
              className="text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors whitespace-nowrap"
            >
              Neue Prüfung →
            </button>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="bg-white border border-[#e6e1da] rounded-2xl p-6 space-y-5 shadow-[0_16px_36px_-24px_rgba(40,25,10,0.28)]">
            <p className="text-[11px] font-bold tracking-[0.12em] uppercase text-[#a49c92]">Fahrzeugdaten</p>
            <div className="grid grid-cols-2 gap-4">
              <Field label="Marke" required>
                <input className={inputCls} value={form.marke}
                  onChange={(e) => set('marke', e.target.value)} placeholder="z. B. BMW" required />
              </Field>
              <Field label="Modell" required>
                <input className={inputCls} value={form.modell}
                  onChange={(e) => set('modell', e.target.value)} placeholder="z. B. 320d" required />
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
                placeholder="z. B. 2.0 TDI 150 PS, Diesel" />
            </Field>
            <Field label="Ausstattung">
              <textarea className={inputCls + ' resize-none'} rows={2} value={form.ausstattung}
                onChange={(e) => set('ausstattung', e.target.value)}
                placeholder="z. B. Navi, Sitzheizung, Panoramadach (kommagetrennt)" />
            </Field>
            <Field label="Angebotspreis" required>
              <div className="relative">
                <input className={inputCls + ' pr-8'} type="number" min={0}
                  value={form.preis || ''}
                  onChange={(e) => set('preis', parseInt(e.target.value) || 0)}
                  placeholder="0" required />
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">€</span>
              </div>
            </Field>
            <Field label="Inserat-Text / Beschreibung">
              <textarea className={inputCls + ' resize-none'} rows={4} value={form.beschreibung}
                onChange={(e) => set('beschreibung', e.target.value)}
                placeholder="Text aus dem Inserat einfügen, je mehr, desto besser…" />
            </Field>

            <button
              type="button"
              onClick={() => setShowMore((v) => !v)}
              className="flex items-center gap-1.5 text-sm text-blue-600 hover:text-blue-700 font-medium"
            >
              <ChevronDown size={15} className={`transition-transform ${showMore ? 'rotate-180' : ''}`} />
              Weitere Angaben (optional)
            </button>

            {showMore && (
              <div className="grid grid-cols-2 gap-4 pt-1">
                <Field label="Unfallfrei laut Inserat">
                  <select className={inputCls} value={form.unfallfrei}
                    onChange={(e) => set('unfallfrei', e.target.value as KaufCheckForm['unfallfrei'])}>
                    <option value="">Nicht angegeben</option>
                    <option value="ja">Ja, unfallfrei</option>
                    <option value="nein">Unfallschaden vorhanden</option>
                    <option value="unbekannt">Unklar/nicht erwähnt</option>
                  </select>
                </Field>
                <Field label="Anzahl Vorbesitzer">
                  <input className={inputCls} type="number" min={0} value={form.vorbesitzer}
                    onChange={(e) => set('vorbesitzer', e.target.value ? parseInt(e.target.value) : '')}
                    placeholder="z. B. 2" />
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
                    Scheckheftgepflegt laut Inserat
                  </label>
                </div>
              </div>
            )}
          </div>

          {!savedCheck && (
            <div className="bg-white border border-[#e6e1da] rounded-2xl p-6 shadow-[0_16px_36px_-24px_rgba(40,25,10,0.28)]">
              <p className="text-[11px] font-bold tracking-[0.12em] uppercase text-[#a49c92] mb-4">Inserat-Screenshot (optional)</p>
              {screenshot ? (
                <div className="relative inline-block">
                  <img src={screenshot} className="max-h-40 rounded-xl border border-gray-200" alt="Screenshot" />
                  <button type="button" onClick={() => setScreenshot(null)}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-gray-800 rounded-full flex items-center justify-center">
                    <X size={13} className="text-white" />
                  </button>
                </div>
              ) : (
                <label className="flex flex-col items-center gap-2 border-2 border-dashed border-gray-200 rounded-xl p-8 cursor-pointer hover:border-gray-300 transition-colors">
                  <ImagePlus size={24} className="text-gray-400" />
                  <span className="text-sm text-gray-500">Screenshot hochladen</span>
                  <input type="file" accept="image/*" className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0]
                      if (!f) return
                      const r = new FileReader()
                      r.onload = () => setScreenshot(r.result as string)
                      r.readAsDataURL(f)
                    }} />
                </label>
              )}
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
              style={{ background: 'linear-gradient(180deg, #3b82f6 0%, #2563eb 100%)', boxShadow: '0 10px 24px -8px rgba(37,99,235,0.5), inset 0 1px 0 rgba(255,255,255,0.3)' }}>
              {loading
                ? <><Loader2 size={16} className="animate-spin" /> Analysiere Inserat…</>
                : <><ShoppingCart size={16} /> Kauf-Check starten</>}
            </button>
          )}
        </form>

        {loading && !result && <ReportSkeleton kind="kauf" />}
        {result && (
          <KaufCheckReport
            result={result}
            checkId={savedCheck ? savedCheck.id : freshCheckId}
            chatKey={savedCheck ? `saved-${savedCheck.id}` : `fresh-${runId}`}
          />
        )}
      </div>
    </div>
  )
}

function ReportSkeleton({ kind }: { kind: 'kauf' | 'verkauf' }) {
  const cardCls =
    'rounded-2xl border border-[#e6e1da] bg-white p-6 shadow-[0_16px_36px_-24px_rgba(40,25,10,0.28)]'
  return (
    <div className="mt-10 space-y-4" aria-hidden="true">
      <div className="ez-skeleton h-2.5 w-28 rounded" />
      {kind === 'kauf' ? (
        <div className={`${cardCls} flex items-start gap-4`}>
          <div className="ez-skeleton w-10 h-10 rounded-lg shrink-0" />
          <div className="flex-1 space-y-2.5 pt-0.5">
            <div className="ez-skeleton h-2.5 w-24 rounded" />
            <div className="ez-skeleton h-6 w-48 rounded" />
            <div className="ez-skeleton h-3 w-40 rounded" />
          </div>
        </div>
      ) : (
        <div className={`${cardCls} space-y-4`}>
          <div className="ez-skeleton h-2.5 w-24 rounded" />
          <div className="grid grid-cols-3 gap-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="ez-skeleton h-24 rounded-xl" />
            ))}
          </div>
        </div>
      )}
      <div className={`${cardCls} space-y-3`}>
        <div className="ez-skeleton h-2.5 w-32 rounded" />
        <div className="ez-skeleton h-3 w-full rounded" />
        <div className="ez-skeleton h-3 w-11/12 rounded" />
        <div className="ez-skeleton h-3 w-full rounded" />
        <div className="ez-skeleton h-3 w-4/5 rounded" />
      </div>
    </div>
  )
}

const EMPFEHLUNG_CONFIG: Record<string, { label: string; bg: string; label_cls: string; icon: React.ReactNode }> = {
  kaufen: {
    label: 'Kaufen',
    bg: 'bg-green-50 border-green-200', label_cls: 'text-green-700',
    icon: <CheckCircle size={24} className="text-green-600 shrink-0 mt-0.5" />,
  },
  kaufen_nach_besichtigung: {
    label: 'Kaufen nach Besichtigung',
    bg: 'bg-green-50 border-green-200', label_cls: 'text-green-700',
    icon: <CheckCircle size={24} className="text-green-600 shrink-0 mt-0.5" />,
  },
  nur_mit_werkstattpruefung: {
    label: 'Nur mit Werkstattprüfung',
    bg: 'bg-yellow-50 border-yellow-200', label_cls: 'text-yellow-700',
    icon: <Wrench size={24} className="text-yellow-600 shrink-0 mt-0.5" />,
  },
  preis_nachverhandeln: {
    label: 'Preis nachverhandeln',
    bg: 'bg-yellow-50 border-yellow-200', label_cls: 'text-yellow-700',
    icon: <MinusCircle size={24} className="text-yellow-600 shrink-0 mt-0.5" />,
  },
  hohes_risiko: {
    label: 'Hohes Risiko',
    bg: 'bg-orange-50 border-orange-200', label_cls: 'text-orange-700',
    icon: <AlertTriangle size={24} className="text-orange-600 shrink-0 mt-0.5" />,
  },
  finger_weg: {
    label: 'Finger weg',
    bg: 'bg-red-50 border-red-200', label_cls: 'text-red-700',
    icon: <XCircle size={24} className="text-red-600 shrink-0 mt-0.5" />,
  },
  unbekannt: {
    label: 'Unbekannt',
    bg: 'bg-gray-50 border-gray-200', label_cls: 'text-gray-600',
    icon: <MinusCircle size={24} className="text-gray-400 shrink-0 mt-0.5" />,
  },
}

const PREIS_LABEL: Record<string, string> = {
  extrem_guenstig: 'Extrem günstig',
  guenstig: 'Günstig',
  marktgerecht: 'Marktgerecht',
  teuer: 'Teuer',
  extrem_teuer: 'Extrem teuer',
  unbekannt: 'Unbekannt',
}

// Falls das Backend einen von PREIS_LABEL nicht erfassten Wert liefert (z.B. eine
// unbekannte Kategorie), wird nie der rohe Snake-Case-Schlüssel angezeigt, sondern
// eine lesbare Notlösung ("guter_deal" -> "Guter deal").
function formatUnbekannterPreiswert(wert: string): string {
  const lesbar = wert.replace(/_/g, ' ')
  return lesbar.charAt(0).toUpperCase() + lesbar.slice(1)
}

function KaufCheckReport({
  result,
  checkId,
  chatKey,
}: {
  result: KaufCheckResult
  checkId?: number
  chatKey: string
}) {
  const empf = result.empfehlung?.toLowerCase() ?? 'unbekannt'
  const recStyle = EMPFEHLUNG_CONFIG[empf] ?? EMPFEHLUNG_CONFIG.unbekannt
  const preisKey = result.preis_bewertung?.toLowerCase()
  const preisLabel = preisKey ? (PREIS_LABEL[preisKey] ?? formatUnbekannterPreiswert(preisKey)) : null

  // Phase 1: nur die je Entscheidung referenzierten Insights (Backend-validiert).
  const empfehlungInsights = insightsByIds(result.insights, result.empfehlung_evidence_ids)
  const preisInsights = insightsByIds(result.insights, result.preis_evidence_ids)
  const risikoInsights = insightsByIds(result.insights, result.risiko_evidence_ids)
  const marktanalyse = marktanalyseOf(result.insights)

  return (
    <div id="kauf-result" className="mt-10 space-y-4">
      <p className="text-[11px] font-bold tracking-[0.22em] uppercase text-[#a49c92]">Analyse-Ergebnis</p>

      {/* Phase 3: kompakter Entscheidungsbereich — Empfehlung + Markt-Kennzahlen in EINER Karte. */}
      <div className={`rounded-2xl p-5 sm:p-6 border ${recStyle.bg}`}>
        <div className="flex items-start gap-3.5">
          {recStyle.icon}
          <div className="min-w-0 flex-1">
            <p className={`text-[11px] font-bold uppercase tracking-[0.18em] mb-1 opacity-80 ${recStyle.label_cls}`}>
              Entscheidung
            </p>
            <p className={`text-xl sm:text-2xl font-bold tracking-[-0.01em] leading-tight ${recStyle.label_cls}`}>
              {recStyle.label}
            </p>
          </div>
          {preisLabel && (
            <span className={`shrink-0 mt-1 px-2 py-1 rounded-lg text-xs font-semibold bg-white/60 ${recStyle.label_cls}`}>
              Preis: {preisLabel}
            </span>
          )}
        </div>
        <MarketMetrics
          marktpreisMin={result.marktpreis_min}
          marktpreisMax={result.marktpreis_max}
          marktanalyse={marktanalyse}
        />
      </div>

      {(empfehlungInsights.length > 0 || preisInsights.length > 0) && (
        <div className="space-y-2 px-1">
          <EvidenceWhy label="Warum diese Empfehlung?" insights={empfehlungInsights} />
          <EvidenceWhy label="Warum diese Preisbewertung?" insights={preisInsights} />
        </div>
      )}

      {/* Risiko-Kurzüberblick (deterministisch, "Unklar" ohne Datenbasis). */}
      <RiskOverview
        insights={result.insights}
        marktanalyse={marktanalyse}
        baureiheErkannt={result.baureihe_erkannt}
        preisBewertung={result.preis_bewertung}
      />
      {risikoInsights.length > 0 && (
        <div className="px-1">
          <EvidenceWhy label="Warum diese Risiken?" insights={risikoInsights} />
        </div>
      )}

      {/* Phase 2: verdichtete Kern-Erkenntnisse. */}
      <KeyFindings findings={result.key_findings} insights={result.insights} />

      {/* Konkreter nächster Schritt aus vorhandenen Key Findings. */}
      <NextSteps findings={result.key_findings} />

      {/* Vollständiger Bericht — unverändert, standardmäßig eingeklappt. */}
      <CollapsibleReport bericht={result.bericht} title="Vollständige Analyse anzeigen" />

      <SourceBadge meta={{ source: result.quelle as never, trust_level: result.vertrauen as never, belege: result.belege }} />

      <AnalyseFrageChat
        key={chatKey}
        analyseKontext={buildAnalyseKontext(result)}
        checkId={checkId}
        checkTyp="kauf"
      />
    </div>
  )
}

// Baut den Analysetext, den die kontextgebundenen Rückfragen als Grundlage bekommen:
// Verdikt (Empfehlung/Preisbewertung/Marktpreis) + der vollständige Detailbericht.
function buildAnalyseKontext(result: KaufCheckResult): string {
  const empf = result.empfehlung?.toLowerCase() ?? 'unbekannt'
  const empfLabel = (EMPFEHLUNG_CONFIG[empf] ?? EMPFEHLUNG_CONFIG.unbekannt).label
  const preisKey = result.preis_bewertung?.toLowerCase()
  const preisLabel = preisKey ? (PREIS_LABEL[preisKey] ?? formatUnbekannterPreiswert(preisKey)) : null
  const marktpreis =
    result.marktpreis_min || result.marktpreis_max
      ? `${result.marktpreis_min?.toLocaleString('de-DE') ?? '?'} – ${result.marktpreis_max?.toLocaleString('de-DE') ?? '?'} €`
      : null

  return [
    `Empfehlung: ${empfLabel}`,
    preisLabel ? `Preisbewertung: ${preisLabel}` : '',
    marktpreis ? `Marktpreis-Einschätzung: ${marktpreis}` : '',
    '',
    '--- Detailbericht ---',
    result.bericht,
  ]
    .filter(Boolean)
    .join('\n')
}

const inputCls =
  'w-full text-sm bg-white border border-[#e6e1da] rounded-xl px-3 py-2.5 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-200/70 transition-colors placeholder-gray-400'

function Field({
  label,
  required,
  children,
}: {
  label: string
  required?: boolean
  children: React.ReactNode
}) {
  return (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1.5">
        {label}
        {required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  )
}
