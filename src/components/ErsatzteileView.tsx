import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Wrench, Search, Sparkles, ExternalLink, ShieldCheck, Tag,
  AlertCircle, X, Zap, Crown, Star, TrendingDown, PackageSearch,
} from 'lucide-react'
import {
  apiErsatzteilSuche, PaymentRequiredError,
  type ApiErsatzteilSuche, type ApiErsatzteilErgebnis, type ErsatzteilMarkeTyp,
} from '../api/client'
import { useAuth } from '../context/AuthContext'

const BEISPIEL = { fahrzeug: 'BMW M3 E92', bauteil: 'Bremsscheiben vorne' }

const MARKE_LABEL: Record<ErsatzteilMarkeTyp, string> = {
  oem:       'Original (OEM)',
  original:  'Erstausrüster',
  nachbau:   'Nachbau',
  unbekannt: 'Unbekannt',
}

const MARKE_CLS: Record<ErsatzteilMarkeTyp, string> = {
  oem:       'bg-blue-50 text-blue-700 border-blue-200',
  original:  'bg-emerald-50 text-emerald-700 border-emerald-200',
  nachbau:   'bg-gray-100 text-gray-600 border-gray-200',
  unbekannt: 'bg-gray-50 text-gray-400 border-gray-200',
}

const ABO_QUOTA: Record<string, number | null> = {
  none:  1,
  light: 5,
  pro:   20,
  max:   null, // unbegrenzt
}

function fmtPreis(p: number | null) {
  if (p === null) return 'Preis auf Anfrage'
  return `${p.toLocaleString('de-DE', { minimumFractionDigits: 2 })} €`
}

function ResultCard({
  ergebnis, isEmpfehlung, isGuenstigstes,
}: {
  ergebnis: ApiErsatzteilErgebnis
  isEmpfehlung: boolean
  isGuenstigstes: boolean
}) {
  const markeTyp = ergebnis.marke_typ in MARKE_LABEL ? ergebnis.marke_typ : 'unbekannt'

  return (
    <div
      className={`relative flex flex-col rounded-2xl border bg-white p-5 transition-all ${
        isEmpfehlung
          ? 'border-orange-300 shadow-[0_0_0_3px_rgba(249,115,22,0.12)]'
          : 'border-gray-200 hover:border-gray-300 hover:shadow-md'
      }`}
    >
      {isEmpfehlung && (
        <span className="absolute -top-3 left-4 inline-flex items-center gap-1 bg-orange-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-sm">
          <Sparkles size={10} /> Viras Empfehlung
        </span>
      )}
      {isGuenstigstes && !isEmpfehlung && (
        <span className="absolute -top-3 left-4 inline-flex items-center gap-1 bg-gray-900 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-sm">
          <TrendingDown size={10} /> Günstigstes Angebot
        </span>
      )}

      <div className="flex items-start justify-between gap-2 mt-1">
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${MARKE_CLS[markeTyp]}`}>
          {MARKE_LABEL[markeTyp]}
        </span>
      </div>

      <h3 className="text-sm font-semibold text-gray-900 mt-3 leading-snug line-clamp-2">
        {ergebnis.teilename}
      </h3>

      <div className="flex items-center gap-1.5 mt-1.5 text-xs text-gray-500">
        <span className="w-1.5 h-1.5 rounded-full bg-gray-300 shrink-0" />
        {ergebnis.anbieter}
      </div>

      {ergebnis.qualitaetsstufe && (
        <div className="flex items-center gap-1 mt-2 text-[11px] text-gray-500">
          <Tag size={11} className="shrink-0 text-gray-400" />
          {ergebnis.qualitaetsstufe}
        </div>
      )}

      {ergebnis.hinweis && (
        <p className="text-xs text-gray-400 mt-2 leading-relaxed line-clamp-2">{ergebnis.hinweis}</p>
      )}

      <div className="mt-auto pt-4 flex items-end justify-between gap-3">
        <span className="text-lg font-bold text-gray-900 tabular-nums">{fmtPreis(ergebnis.preis_eur)}</span>
        {ergebnis.url && (
          <a
            href={ergebnis.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs font-semibold text-gray-700 hover:text-orange-600 transition-colors shrink-0"
          >
            Zum Angebot <ExternalLink size={12} />
          </a>
        )}
      </div>
    </div>
  )
}

export default function ErsatzteileView() {
  const { user, refreshUser } = useAuth()
  const navigate = useNavigate()

  const [fahrzeug, setFahrzeug] = useState('')
  const [bauteil, setBauteil] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [paymentRequired, setPaymentRequired] = useState(false)
  const [result, setResult] = useState<ApiErsatzteilSuche | null>(null)

  const quota = user ? ABO_QUOTA[user.abo_typ] : null
  const verbleibend = user?.ersatzteil_suchen_verbleibend ?? 0

  async function handleSearch(e: React.FormEvent) {
    e.preventDefault()
    if (!fahrzeug.trim() || !bauteil.trim() || loading) return

    setLoading(true)
    setError(null)
    setPaymentRequired(false)
    try {
      const res = await apiErsatzteilSuche(fahrzeug.trim(), bauteil.trim())
      setResult(res)
      refreshUser()
    } catch (err) {
      if (err instanceof PaymentRequiredError) {
        setPaymentRequired(true)
      } else {
        setError((err as Error).message || 'Suche fehlgeschlagen.')
      }
    } finally {
      setLoading(false)
    }
  }

  function fillBeispiel() {
    setFahrzeug(BEISPIEL.fahrzeug)
    setBauteil(BEISPIEL.bauteil)
  }

  const guenstigsteIdx = result?.ergebnisse.length
    ? result.ergebnisse.reduce(
        (bestIdx, r, i, arr) =>
          r.preis_eur !== null && (arr[bestIdx].preis_eur === null || r.preis_eur < (arr[bestIdx].preis_eur ?? Infinity))
            ? i
            : bestIdx,
        0,
      )
    : -1

  return (
    <div className="h-full overflow-y-auto bg-white">
      {/* ── Hero: Showroom bei Nacht ─────────────────────────────────────── */}
      <div
        className="relative overflow-hidden px-6 sm:px-10 pt-10 sm:pt-14 pb-24 sm:pb-28"
        style={{
          background: 'radial-gradient(circle at 15% 0%, #241a10 0%, #14100c 35%, #0a0a0a 100%)',
        }}
      >
        {/* Ambient glows */}
        <div
          className="absolute -top-24 -right-24 w-96 h-96 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(249,115,22,0.16) 0%, transparent 70%)' }}
        />
        <div
          className="absolute bottom-0 left-1/3 w-72 h-72 rounded-full pointer-events-none"
          style={{ background: 'radial-gradient(circle, rgba(59,130,246,0.08) 0%, transparent 70%)' }}
        />

        {/* Weicher Übergang: dunkler Hero löst sich am unteren Rand in den warmen
            Ton des Ergebnisbereichs auf — kein harter Schnitt Dunkel ↔ Hell.
            Liegt unter dem Inhalt und im leeren Bodenbereich (kein Text betroffen). */}
        <div
          className="absolute inset-x-0 bottom-0 h-24 pointer-events-none"
          style={{ background: 'linear-gradient(to bottom, transparent, #f6f4f1)' }}
        />

        <div className="relative max-w-4xl mx-auto">
          <div className="flex items-start justify-between gap-4 mb-6">
            <div className="flex items-center gap-2 text-orange-400">
              <Wrench size={14} />
              <span className="text-[11px] font-bold tracking-[0.2em] uppercase">Preisvergleich</span>
            </div>

            {user && (
              <div className="flex items-center gap-2 shrink-0">
                {user.abo_typ !== 'none' && (
                  <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    user.abo_typ === 'light' ? 'bg-blue-500 text-white'
                    : user.abo_typ === 'pro' ? 'bg-orange-500 text-white'
                    : 'bg-purple-500 text-white'
                  }`}>
                    {user.abo_typ === 'light' && <Zap size={10} />}
                    {user.abo_typ === 'pro' && <Star size={10} />}
                    {user.abo_typ === 'max' && <Crown size={10} />}
                    {user.abo_typ.toUpperCase()}
                  </span>
                )}
                <span className="text-[11px] text-white/50 whitespace-nowrap">
                  {quota === null
                    ? 'Unbegrenzte Suchen'
                    : `${verbleibend} von ${quota} Suchen übrig`}
                </span>
              </div>
            )}
          </div>

          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight leading-tight mb-2">
            Das richtige Ersatzteil.<br className="hidden sm:block" /> Zum besten Preis.
          </h1>
          <p className="text-sm text-white/50 mb-8 max-w-lg leading-relaxed">
            Vira durchsucht Autodoc, kfzteile24, eBay, Amazon &amp; TecDoc gleichzeitig
            und sagt dir ehrlich, welches Teil sich wirklich lohnt.
          </p>

          <form onSubmit={handleSearch} className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1">
              <label className="block text-[11px] font-medium text-white/40 mb-1.5 uppercase tracking-wide">Fahrzeug</label>
              <input
                value={fahrzeug}
                onChange={e => setFahrzeug(e.target.value)}
                placeholder="z. B. BMW M3 E92"
                className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-white/30 bg-white/[0.06] border border-white/10 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/40 transition-all"
              />
            </div>
            <div className="flex-1">
              <label className="block text-[11px] font-medium text-white/40 mb-1.5 uppercase tracking-wide">Bauteil</label>
              <input
                value={bauteil}
                onChange={e => setBauteil(e.target.value)}
                placeholder="z. B. Bremsscheiben vorne"
                className="w-full px-4 py-3 rounded-xl text-sm text-white placeholder-white/30 bg-white/[0.06] border border-white/10 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/40 transition-all"
              />
            </div>
            <div className="sm:self-end">
              <label className="block text-[11px] mb-1.5 sm:hidden">&nbsp;</label>
              <button
                type="submit"
                disabled={loading || !fahrzeug.trim() || !bauteil.trim()}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 bg-orange-500 hover:bg-orange-400 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  <Search size={16} />
                )}
                Suchen
              </button>
            </div>
          </form>

          {!result && !loading && (
            <button
              onClick={fillBeispiel}
              className="mt-4 text-xs text-white/35 hover:text-orange-400 transition-colors inline-flex items-center gap-1.5"
            >
              Beispiel ausprobieren: <span className="text-white/55 underline decoration-white/20 underline-offset-2">{BEISPIEL.fahrzeug} · {BEISPIEL.bauteil}</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Ergebnisse ────────────────────────────────────────────────────── */}
      {/* Band entwickelt sich aus dem Hero-Fade heraus: startet im selben warmen
          Ton (#f6f4f1) und läuft weich nach Weiß aus — eine zusammenhängende Fläche. */}
      <div className="w-full" style={{ background: 'linear-gradient(180deg, #f6f4f1 0%, #ffffff 220px)' }}>
      <div className="max-w-4xl mx-auto px-6 py-8">

        {paymentRequired && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl mb-6 text-sm bg-amber-50 text-amber-800 border border-amber-200">
            <AlertCircle size={18} className="shrink-0 text-amber-500" />
            <span>Dein Suchkontingent für Ersatzteile ist aufgebraucht.</span>
            <button
              onClick={() => navigate('/pricing')}
              className="ml-auto shrink-0 text-xs font-semibold text-amber-900 underline underline-offset-2 hover:text-amber-700"
            >
              Zu den Tarifen
            </button>
          </div>
        )}

        {error && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl mb-6 text-sm bg-red-50 text-red-800 border border-red-200">
            <AlertCircle size={16} className="shrink-0 text-red-500" />
            <span>{error}</span>
            <button onClick={() => setError(null)} className="ml-auto p-0.5 hover:opacity-60 transition-opacity">
              <X size={14} />
            </button>
          </div>
        )}

        {loading && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="animate-pulse h-48 bg-gray-50 rounded-2xl border border-gray-100" />
            ))}
          </div>
        )}

        {!loading && !result && (
          <div className="flex flex-col items-center justify-center text-center min-h-[320px] py-10 text-gray-400">
            {/* Warmes Halo greift den Orange-Glow des Heros auf → visueller Bezug nach oben */}
            <div className="relative mb-4">
              <div
                aria-hidden
                className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full pointer-events-none"
                style={{ background: 'radial-gradient(circle, rgba(249,115,22,0.08) 0%, transparent 70%)' }}
              />
              <PackageSearch size={40} className="relative mx-auto opacity-40" />
            </div>
            <p className="text-sm font-medium text-gray-500 mb-1">Noch keine Suche gestartet.</p>
            <p className="text-xs text-gray-400 max-w-sm mx-auto leading-relaxed">
              Fahrzeug und Bauteil eingeben — Vira vergleicht in Sekunden mehrere
              Shops und gibt dir eine ehrliche Einschätzung.
            </p>
          </div>
        )}

        {!loading && result && (
          <>
            {/* KI-Einschätzung */}
            {result.empfehlung && (
              <div className="flex gap-3 p-4 rounded-2xl border border-orange-100 bg-orange-50/60 mb-6">
                <div className="shrink-0 w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center">
                  <Sparkles size={14} className="text-white" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-bold text-orange-700 mb-1">Viras Einschätzung</p>
                  <p className="text-sm text-gray-700 leading-relaxed">{result.empfehlung}</p>
                </div>
              </div>
            )}

            {result.ergebnisse.length === 0 ? (
              <div className="text-center py-14 text-gray-400">
                <ShieldCheck size={36} className="mx-auto mb-3 opacity-40" />
                <p className="text-sm">Keine passenden Angebote gefunden.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {result.ergebnisse.map((r, i) => (
                  <ResultCard
                    key={i}
                    ergebnis={r}
                    isEmpfehlung={result.empfohlener_index === i}
                    isGuenstigstes={i === guenstigsteIdx}
                  />
                ))}
              </div>
            )}

            <p className="text-center text-[11px] text-gray-300 mt-8">
              Beta — Ergebnisse werden laufend verbessert. Für garantierte Verfügbarkeit direkt beim Händler prüfen.
            </p>
          </>
        )}
      </div>
      </div>
    </div>
  )
}
