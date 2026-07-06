import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Sparkles, ExternalLink, Tag, AlertCircle, X, Zap, Crown, Star,
  TrendingDown, ShieldCheck, ArrowRight, ChevronRight,
} from 'lucide-react'
import {
  apiErsatzteilSuche, PaymentRequiredError,
  type ApiErsatzteilSuche, type ApiErsatzteilErgebnis, type ErsatzteilMarkeTyp,
} from '../api/client'
import { useAuth } from '../context/AuthContext'

const BEISPIEL = { fahrzeug: 'BMW M3 E92', bauteil: 'Bremsscheiben vorne' }

// Quellen, die parallel durchsucht werden — als ruhige Kompetenz-Signatur.
const QUELLEN = ['Autodoc', 'kfzteile24', 'eBay', 'Amazon', 'TecDoc']

const MARKE_LABEL: Record<ErsatzteilMarkeTyp, string> = {
  oem:       'Original (OEM)',
  original:  'Erstausrüster',
  nachbau:   'Nachbau',
  unbekannt: 'Unbekannt',
}

// Dunkel-optimierte, dezente Badge-Töne (translucent statt Pastell).
const MARKE_CLS: Record<ErsatzteilMarkeTyp, string> = {
  oem:       'bg-sky-400/10 text-sky-300 border-sky-400/20',
  original:  'bg-emerald-400/10 text-emerald-300 border-emerald-400/20',
  nachbau:   'bg-white/[0.06] text-white/50 border-white/10',
  unbekannt: 'bg-white/[0.04] text-white/35 border-white/10',
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

// ─── Ergebnis-Karte (dunkles Glas) ──────────────────────────────────────────
function ResultCard({
  ergebnis, isEmpfehlung, isGuenstigstes, index,
}: {
  ergebnis: ApiErsatzteilErgebnis
  isEmpfehlung: boolean
  isGuenstigstes: boolean
  index: number
}) {
  const markeTyp = ergebnis.marke_typ in MARKE_LABEL ? ergebnis.marke_typ : 'unbekannt'

  return (
    <div
      className="ez-card ez-rise relative flex flex-col rounded-2xl p-5"
      style={{
        background: 'rgba(255,255,255,0.035)',
        border: `1px solid ${isEmpfehlung ? 'rgba(249,115,22,0.45)' : 'rgba(255,255,255,0.08)'}`,
        boxShadow: isEmpfehlung
          ? '0 0 0 1px rgba(249,115,22,0.25), 0 20px 48px rgba(0,0,0,0.45)'
          : '0 12px 32px rgba(0,0,0,0.35), inset 0 1px 0 rgba(255,255,255,0.05)',
        animationDelay: `${Math.min(index, 8) * 55}ms`,
      }}
    >
      {isEmpfehlung && (
        <span className="absolute -top-3 left-4 inline-flex items-center gap-1 bg-orange-500 text-white text-[10px] font-bold px-2.5 py-1 rounded-full shadow-lg shadow-orange-500/25">
          <Sparkles size={10} /> Viras Empfehlung
        </span>
      )}
      {isGuenstigstes && !isEmpfehlung && (
        <span className="absolute -top-3 left-4 inline-flex items-center gap-1 bg-white text-gray-900 text-[10px] font-bold px-2.5 py-1 rounded-full shadow-lg">
          <TrendingDown size={10} /> Günstigstes Angebot
        </span>
      )}

      <div className="flex items-start justify-between gap-2 mt-1">
        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${MARKE_CLS[markeTyp]}`}>
          {MARKE_LABEL[markeTyp]}
        </span>
      </div>

      <h3 className="text-sm font-semibold text-white/90 mt-3 leading-snug line-clamp-2">
        {ergebnis.teilename}
      </h3>

      <div className="flex items-center gap-1.5 mt-1.5 text-xs text-white/40">
        <span className="w-1.5 h-1.5 rounded-full bg-white/25 shrink-0" />
        {ergebnis.anbieter}
      </div>

      {ergebnis.qualitaetsstufe && (
        <div className="flex items-center gap-1 mt-2 text-[11px] text-white/40">
          <Tag size={11} className="shrink-0 text-white/30" />
          {ergebnis.qualitaetsstufe}
        </div>
      )}

      {ergebnis.hinweis && (
        <p className="text-xs text-white/35 mt-2 leading-relaxed line-clamp-2">{ergebnis.hinweis}</p>
      )}

      <div className="mt-auto pt-4 flex items-end justify-between gap-3 border-t border-white/[0.06]">
        <span className="text-xl font-bold text-white tabular-nums pt-4">{fmtPreis(ergebnis.preis_eur)}</span>
        {ergebnis.url && (
          <a
            href={ergebnis.url}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex items-center gap-1 text-xs font-semibold text-white/60 hover:text-orange-400 transition-colors shrink-0 pt-4"
          >
            Zum Angebot
            <ExternalLink size={12} className="transition-transform group-hover:translate-x-0.5" />
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

  const hatErgebnisansicht = loading || !!result || paymentRequired || !!error
  const kannSuchen = !!fahrzeug.trim() && !!bauteil.trim() && !loading

  // ── Kontingent-Pille (oben rechts) ──────────────────────────────────────
  const KontingentPille = user ? (
    <div className="flex items-center gap-2 shrink-0">
      {user.abo_typ !== 'none' && (
        <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full ${
          user.abo_typ === 'light' ? 'bg-sky-500/90 text-white'
          : user.abo_typ === 'pro' ? 'bg-orange-500/90 text-white'
          : 'bg-purple-500/90 text-white'
        }`}>
          {user.abo_typ === 'light' && <Zap size={10} />}
          {user.abo_typ === 'pro' && <Star size={10} />}
          {user.abo_typ === 'max' && <Crown size={10} />}
          {user.abo_typ.toUpperCase()}
        </span>
      )}
      <span className="inline-flex items-center gap-1.5 text-[11px] text-white/45 whitespace-nowrap px-2.5 py-1 rounded-full border border-white/10 bg-white/[0.03]">
        <span className={`w-1.5 h-1.5 rounded-full ${quota === null || verbleibend > 0 ? 'bg-emerald-400' : 'bg-red-400'}`} />
        {quota === null ? 'Unbegrenzt' : `${verbleibend} / ${quota}`}
      </span>
    </div>
  ) : null

  // ── Command-Bar: EIN Werkzeug, kein Formular ────────────────────────────
  // Zwei randlose Felder + KI-Glyph + Aktion in einer durchgehenden Glasfläche,
  // die beim Fokus als Ganzes "erwacht" (focus-within). condensed = Sticky-Variante.
  const CommandBar = ({ condensed }: { condensed: boolean }) => (
    <form
      onSubmit={handleSearch}
      className="relative rounded-[24px] transition-all duration-300 focus-within:ring-2 focus-within:ring-orange-500/30"
      style={{
        background: 'linear-gradient(180deg, rgba(255,255,255,0.075) 0%, rgba(255,255,255,0.03) 100%)',
        border: '1px solid rgba(255,255,255,0.1)',
        boxShadow: condensed
          ? '0 16px 40px -14px rgba(0,0,0,0.65), inset 0 1px 0 rgba(255,255,255,0.08)'
          : '0 50px 100px -34px rgba(0,0,0,0.9), 0 0 70px -30px rgba(249,115,22,0.22), inset 0 1px 0 rgba(255,255,255,0.1)',
        backdropFilter: 'blur(22px)',
        WebkitBackdropFilter: 'blur(22px)',
      }}
    >
      <div className={`flex flex-col md:flex-row md:items-center ${condensed ? 'p-2 md:pl-3.5' : 'p-2.5 md:pl-5'}`}>
        {/* KI-Glyph (Desktop) — signalisiert: hier arbeitet eine KI */}
        {!condensed && (
          <div className="hidden md:flex items-center justify-center w-11 h-11 rounded-xl shrink-0 mr-4 text-orange-300"
            style={{ background: 'rgba(249,115,22,0.12)', border: '1px solid rgba(249,115,22,0.22)' }}>
            <Sparkles size={19} className="ez-pulse" />
          </div>
        )}

        {/* Feld: Fahrzeug */}
        <input
          value={fahrzeug}
          onChange={e => setFahrzeug(e.target.value)}
          placeholder="Welches Fahrzeug?"
          aria-label="Fahrzeug"
          className={`flex-1 min-w-0 bg-transparent text-white placeholder-white/30 focus:outline-none px-4 ${
            condensed ? 'py-2.5 text-sm' : 'py-3.5 text-[15px]'
          }`}
        />

        {/* Trenner: Chevron (Desktop) / Linie (Mobile) */}
        <div className="hidden md:flex items-center px-1 text-white/20 shrink-0">
          <ChevronRight size={16} />
        </div>
        <div className="md:hidden h-px mx-3 my-0.5" style={{ background: 'rgba(255,255,255,0.08)' }} />

        {/* Feld: Bauteil */}
        <input
          value={bauteil}
          onChange={e => setBauteil(e.target.value)}
          placeholder="Welches Bauteil?"
          aria-label="Bauteil"
          className={`flex-1 min-w-0 bg-transparent text-white placeholder-white/30 focus:outline-none px-4 ${
            condensed ? 'py-2.5 text-sm' : 'py-3.5 text-[15px]'
          }`}
        />

        {/* Aktion */}
        <button
          type="submit"
          disabled={!kannSuchen}
          aria-label="Analysieren"
          className={`group shrink-0 flex items-center justify-center gap-2 rounded-2xl font-semibold text-white transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:saturate-50 mt-2 md:mt-0 md:ml-2 w-full md:w-auto ${
            condensed ? 'px-5 py-2.5 text-sm' : 'px-6 py-3.5 text-[15px]'
          }`}
          style={{
            background: 'linear-gradient(180deg, #fb923c 0%, #f97316 100%)',
            boxShadow: '0 10px 26px -6px rgba(249,115,22,0.5), inset 0 1px 0 rgba(255,255,255,0.3)',
          }}
        >
          {loading ? (
            <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
          ) : (
            <>
              <span>Analysieren</span>
              <ArrowRight size={16} className="transition-transform group-hover:translate-x-0.5" />
            </>
          )}
        </button>
      </div>
    </form>
  )

  // ── Quellen-Zeile: erzählt "welche Quellen, gleichzeitig" ohne Marketing ──
  const QuellenZeile = ({ scanning = false }: { scanning?: boolean }) => (
    <div className="flex flex-wrap items-center gap-x-2 gap-y-2 text-[12px]">
      <span className="text-white/30 mr-0.5">
        {scanning ? 'Durchsucht' : 'Durchsucht gleichzeitig'}
      </span>
      {QUELLEN.map((q, i) => (
        <span
          key={q}
          className={`px-2.5 py-1 rounded-full border font-medium ${
            scanning ? 'ez-scan' : 'border-white/[0.08] bg-white/[0.03] text-white/55'
          }`}
          style={scanning ? { animationDelay: `${i * 220}ms` } : undefined}
        >
          {q}
        </span>
      ))}
    </div>
  )

  return (
    <div
      className="relative h-full overflow-y-auto scrollbar-thin"
      style={{
        background:
          'radial-gradient(120% 80% at 50% -8%, #1b1512 0%, #0d0b0a 42%, #070605 100%)',
      }}
    >
      {/* ── Lichtführung: eine ruhige warme Quelle oben, kühler Bodenschein, Vignette ── */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="ez-aurora absolute left-1/2 -translate-x-1/2 -top-40 w-[820px] h-[520px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(249,115,22,0.16) 0%, rgba(249,115,22,0.05) 38%, transparent 68%)' }}
        />
        <div
          className="absolute -bottom-56 left-1/4 w-[620px] h-[420px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(56,110,220,0.06) 0%, transparent 70%)' }}
        />
        <div
          className="absolute inset-0"
          style={{ background: 'radial-gradient(130% 100% at 50% 0%, transparent 55%, rgba(0,0,0,0.5) 100%)' }}
        />
      </div>

      <div className="relative min-h-full flex flex-col">

        {/* ══ ZUSTAND 1: Ruhende Bühne (Landing) ══════════════════════════════ */}
        {!hatErgebnisansicht && (
          <div className="flex-1 flex flex-col justify-center px-6 py-16">
            <div className="w-full max-w-3xl mx-auto">
              {/* Kopf */}
              <div className="flex items-center justify-between gap-4 mb-9">
                <div className="flex items-center gap-2.5">
                  <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-orange-500/10 border border-orange-400/20 text-orange-400">
                    <Sparkles size={12} />
                  </span>
                  <span className="text-[11px] font-bold tracking-[0.25em] uppercase text-white/45">
                    Vira · Ersatzteil-Intelligenz
                  </span>
                </div>
                {KontingentPille}
              </div>

              {/* Headline — mutig, kurz */}
              <h1 className="text-[2.5rem] sm:text-6xl font-bold text-white tracking-[-0.035em] leading-[0.98] mb-5">
                Das beste Teil.
                <br />
                <span className="text-white/40">Ehrlich verglichen.</span>
              </h1>

              {/* Command-Bar — das Zentrum */}
              <div className="ez-rise" style={{ animationDelay: '60ms' }}>
                <CommandBar condensed={false} />
              </div>

              {/* Quellen + Beispiel */}
              <div className="mt-7 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 ez-rise" style={{ animationDelay: '140ms' }}>
                <QuellenZeile />
                <button
                  onClick={fillBeispiel}
                  className="group inline-flex items-center gap-1.5 text-xs text-white/40 hover:text-orange-400 transition-colors shrink-0"
                >
                  <span>Beispiel: <span className="text-white/60">{BEISPIEL.fahrzeug} · {BEISPIEL.bauteil}</span></span>
                  <ArrowRight size={12} className="transition-transform group-hover:translate-x-0.5" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ══ ZUSTAND 2: Analyse-Ansicht (Sticky-Command + Ergebnisse) ════════ */}
        {hatErgebnisansicht && (
          <>
            {/* Sticky-Command */}
            <div
              className="sticky top-0 z-30 px-4 sm:px-6 pt-5 pb-4"
              style={{
                background: 'linear-gradient(180deg, rgba(10,9,8,0.92) 0%, rgba(10,9,8,0.75) 70%, transparent 100%)',
                backdropFilter: 'blur(8px)',
                WebkitBackdropFilter: 'blur(8px)',
              }}
            >
              <div className="max-w-5xl mx-auto">
                <div className="flex items-center justify-between gap-4 mb-3">
                  <div className="flex items-center gap-2 text-white/45">
                    <Sparkles size={13} className="text-orange-400" />
                    <span className="text-[11px] font-bold tracking-[0.22em] uppercase">Ersatzteil-Intelligenz</span>
                  </div>
                  {KontingentPille}
                </div>
                <CommandBar condensed={true} />
              </div>
            </div>

            {/* Inhalt */}
            <div className="max-w-5xl mx-auto w-full px-4 sm:px-6 pb-16 pt-2">

              {paymentRequired && (
                <div className="ez-rise flex items-center gap-3 px-4 py-3.5 rounded-2xl mb-6 text-sm border border-amber-400/25 bg-amber-400/[0.07] text-amber-200">
                  <AlertCircle size={18} className="shrink-0 text-amber-400" />
                  <span>Dein Suchkontingent für Ersatzteile ist aufgebraucht.</span>
                  <button
                    onClick={() => navigate('/pricing')}
                    className="ml-auto shrink-0 text-xs font-semibold text-amber-100 underline underline-offset-2 hover:text-white"
                  >
                    Zu den Tarifen
                  </button>
                </div>
              )}

              {error && (
                <div className="ez-rise flex items-center gap-3 px-4 py-3.5 rounded-2xl mb-6 text-sm border border-red-400/25 bg-red-400/[0.07] text-red-200">
                  <AlertCircle size={16} className="shrink-0 text-red-400" />
                  <span>{error}</span>
                  <button onClick={() => setError(null)} className="ml-auto p-0.5 hover:opacity-60 transition-opacity">
                    <X size={14} />
                  </button>
                </div>
              )}

              {/* Loading = Analyse-Pipeline: erzählt "was jetzt passiert" durch Bewegung */}
              {loading && (
                <>
                  <div className="ez-rise flex flex-col items-center text-center py-8 mb-2">
                    <div className="flex items-center gap-2.5 mb-4 text-white/80">
                      <Sparkles size={16} className="ez-pulse text-orange-400" />
                      <span className="text-sm font-semibold tracking-wide">Vira analysiert das beste Angebot</span>
                    </div>
                    <QuellenZeile scanning />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {[1, 2, 3, 4, 5, 6].map(i => (
                      <div
                        key={i}
                        className="ez-skeleton h-52 rounded-2xl border border-white/[0.06]"
                        style={{ animationDelay: `${i * 90}ms` }}
                      />
                    ))}
                  </div>
                </>
              )}

              {!loading && result && (
                <>
                  {/* KI-Einschätzung */}
                  {result.empfehlung && (
                    <div
                      className="ez-rise flex gap-3.5 p-5 rounded-2xl mb-7"
                      style={{
                        background: 'linear-gradient(135deg, rgba(249,115,22,0.1) 0%, rgba(249,115,22,0.03) 100%)',
                        border: '1px solid rgba(249,115,22,0.22)',
                        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.05)',
                      }}
                    >
                      <div className="shrink-0 w-9 h-9 rounded-xl bg-orange-500 flex items-center justify-center shadow-lg shadow-orange-500/30">
                        <Sparkles size={16} className="text-white" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-xs font-bold text-orange-300 mb-1 tracking-wide uppercase">Viras Einschätzung</p>
                        <p className="text-sm text-white/75 leading-relaxed">{result.empfehlung}</p>
                      </div>
                    </div>
                  )}

                  {result.ergebnisse.length === 0 ? (
                    <div className="ez-rise flex flex-col items-center justify-center text-center min-h-[280px] py-12">
                      <div className="w-14 h-14 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center justify-center mb-4">
                        <ShieldCheck size={26} className="text-white/40" />
                      </div>
                      <p className="text-sm text-white/60">Keine passenden Angebote gefunden.</p>
                      <p className="text-xs text-white/35 mt-1">Prüfe die Schreibweise von Fahrzeug und Bauteil.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                      {result.ergebnisse.map((r, i) => (
                        <ResultCard
                          key={i}
                          index={i}
                          ergebnis={r}
                          isEmpfehlung={result.empfohlener_index === i}
                          isGuenstigstes={i === guenstigsteIdx}
                        />
                      ))}
                    </div>
                  )}

                  <p className="text-center text-[11px] text-white/25 mt-10">
                    Beta — Ergebnisse werden laufend verbessert. Für garantierte Verfügbarkeit direkt beim Händler prüfen.
                  </p>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
