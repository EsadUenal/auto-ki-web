import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { X, ShoppingBag, BookOpen, Mail, CheckCircle, AlertCircle, Download } from 'lucide-react'
import {
  apiListEbooks, apiEbookCheckout, apiListEbookBestellungen, apiDownloadEbook,
  type ApiEbook, type ApiEbookBestellung,
} from '../api/client'

// ── E-Book Cover — inline SVG, skaliert via viewBox auf jede Containergröße ──

const COMING_SOON_IDS = new Set(['dein-erstes-auto', 'elektro-oder-verbrenner'])

function EbookCover({
  id,
}: {
  id: string; titel?: string; untertitel?: string; zielgruppe?: string; large?: boolean
}) {
  const [imgFailed, setImgFailed] = useState(false)

  // Book 1: echtes Cover-Bild, SVG als Fallback
  if (id === 'kauf-kein-risiko' && !imgFailed) {
    return (
      <img
        src="/ebooks/cover-ebook1.png"
        alt="Kauf kein Risiko"
        style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }}
        onError={() => setImgFailed(true)}
      />
    )
  }

  // Book 1 SVG-Fallback (falls Bild fehlt)
  if (id === 'kauf-kein-risiko') {
    return (
      <svg viewBox="0 0 200 300" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" style={{ display: 'block' }}>
        <defs>
          <linearGradient id="kkr-bg" x1="0" y1="0" x2="0.5" y2="1">
            <stop offset="0%" stopColor="#0a1628" />
            <stop offset="100%" stopColor="#0d2448" />
          </linearGradient>
        </defs>
        <rect width="200" height="300" fill="url(#kkr-bg)" />
        <rect width="200" height="2.5" fill="#3b82f6" />
        <polygon points="100,28 140,48 140,92 100,115 60,92 60,48"
          fill="none" stroke="#3b82f6" strokeWidth="1.2" opacity="0.22" />
        <polygon points="100,38 130,55 130,88 100,107 70,88 70,55"
          fill="#3b82f6" opacity="0.06" />
        <path d="M 85,70 L 96,83 L 118,60"
          fill="none" stroke="#3b82f6" strokeWidth="3.5" strokeLinecap="round" strokeLinejoin="round" opacity="0.55" />
        <circle cx="100" cy="72" r="46" fill="none" stroke="#3b82f6" strokeWidth="0.5" opacity="0.08" />
        <text x="20" y="145" fill="#3b82f6" fontSize="7" fontFamily="'Segoe UI',Arial,sans-serif"
          letterSpacing="3.5" fontWeight="700" opacity="0.9">E-BOOK</text>
        <rect x="20" y="151" width="30" height="1.5" fill="#3b82f6" opacity="0.7" />
        <text x="20" y="177" fill="white" fontSize="22" fontFamily="'Segoe UI',Arial,sans-serif" fontWeight="800">Kauf kein</text>
        <text x="20" y="201" fill="white" fontSize="22" fontFamily="'Segoe UI',Arial,sans-serif" fontWeight="800">Risiko</text>
        <text x="20" y="220" fill="#93c5fd" fontSize="9" fontFamily="'Segoe UI',Arial,sans-serif" opacity="0.9">Der ehrliche</text>
        <text x="20" y="232" fill="#93c5fd" fontSize="9" fontFamily="'Segoe UI',Arial,sans-serif" opacity="0.9">Gebrauchtwagen-Guide</text>
        <text x="20" y="257" fill="#60a5fa" fontSize="7.5" fontFamily="'Segoe UI',Arial,sans-serif" opacity="0.6">Gebrauchtwagenkäufer</text>
        <rect x="20" y="266" width="160" height="0.5" fill="#3b82f6" opacity="0.12" />
        <text x="20" y="284" fill="white" fontSize="7" fontFamily="'Segoe UI',Arial,sans-serif" opacity="0.2" letterSpacing="2.5">VIRA</text>
      </svg>
    )
  }

  // Book 2: "Dein erstes Auto" — Bald erhältlich, grüner Teaser mit Sanduhr
  if (id === 'dein-erstes-auto') {
    return (
      <svg viewBox="0 0 200 300" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" style={{ display: 'block' }}>
        <defs>
          <linearGradient id="dea-cs" x1="0" y1="0" x2="0.3" y2="1">
            <stop offset="0%" stopColor="#071410" />
            <stop offset="100%" stopColor="#0b2318" />
          </linearGradient>
        </defs>
        <rect width="200" height="300" fill="url(#dea-cs)" />
        <rect width="200" height="2.5" fill="#22c55e" />
        {/* "02" Wasserzeichen */}
        <text x="100" y="126" fill="#22c55e" fontSize="130" fontFamily="'Segoe UI',Arial,sans-serif"
          fontWeight="900" textAnchor="middle" opacity="0.04">02</text>
        {/* Sanduhr */}
        <rect x="66" y="36" width="68" height="5" rx="2.5" fill="#22c55e" opacity="0.28" />
        <rect x="66" y="119" width="68" height="5" rx="2.5" fill="#22c55e" opacity="0.28" />
        <path d="M 68,41 L 132,41 L 100,80 L 132,119 L 68,119 L 100,80 Z"
          fill="none" stroke="#22c55e" strokeWidth="1.4" opacity="0.28" />
        <path d="M 68,41 L 132,41 L 100,80 Z" fill="#22c55e" opacity="0.08" />
        {/* Sand-Tropfen */}
        <circle cx="100" cy="82" r="2.2" fill="#22c55e" opacity="0.55" />
        <circle cx="97" cy="89" r="1.5" fill="#22c55e" opacity="0.35" />
        <circle cx="103" cy="87" r="1.2" fill="#22c55e" opacity="0.25" />
        <circle cx="100" cy="95" r="0.9" fill="#22c55e" opacity="0.15" />
        {/* IN KÜRZE Label */}
        <text x="20" y="158" fill="#22c55e" fontSize="7" fontFamily="'Segoe UI',Arial,sans-serif"
          letterSpacing="4" fontWeight="700" opacity="0.9">IN KÜRZE</text>
        <rect x="20" y="164" width="30" height="1.5" fill="#22c55e" opacity="0.7" />
        {/* Titel gedimmt */}
        <text x="20" y="194" fill="white" fontSize="20" fontFamily="'Segoe UI',Arial,sans-serif"
          fontWeight="800" opacity="0.28">Dein</text>
        <text x="20" y="216" fill="white" fontSize="20" fontFamily="'Segoe UI',Arial,sans-serif"
          fontWeight="800" opacity="0.28">erstes Auto</text>
        {/* Release Badge */}
        <rect x="20" y="232" width="88" height="18" rx="9" fill="#22c55e" opacity="0.12" />
        <text x="64" y="244" fill="#22c55e" fontSize="8" fontFamily="'Segoe UI',Arial,sans-serif"
          fontWeight="700" textAnchor="middle" opacity="0.85">Erscheint 2026</text>
        <rect x="20" y="272" width="160" height="0.5" fill="#22c55e" opacity="0.12" />
        <text x="20" y="288" fill="white" fontSize="7" fontFamily="'Segoe UI',Arial,sans-serif"
          opacity="0.2" letterSpacing="2.5">VIRA</text>
      </svg>
    )
  }

  // Book 3: "Elektro oder Verbrenner?" — Bald erhältlich, amber Teaser mit Fragezeichen
  if (id === 'elektro-oder-verbrenner') {
    return (
      <svg viewBox="0 0 200 300" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" style={{ display: 'block' }}>
        <defs>
          <linearGradient id="eov-cs" x1="0" y1="0" x2="0.3" y2="1">
            <stop offset="0%" stopColor="#160c00" />
            <stop offset="100%" stopColor="#2c1800" />
          </linearGradient>
        </defs>
        <rect width="200" height="300" fill="url(#eov-cs)" />
        <rect width="200" height="2.5" fill="#f59e0b" />
        {/* "03" Wasserzeichen */}
        <text x="100" y="126" fill="#f59e0b" fontSize="130" fontFamily="'Segoe UI',Arial,sans-serif"
          fontWeight="900" textAnchor="middle" opacity="0.04">03</text>
        {/* Fragezeichen */}
        <path d="M 88,50 C 88,36 114,36 114,56 C 114,68 102,70 100,84"
          fill="none" stroke="#f59e0b" strokeWidth="5" strokeLinecap="round" opacity="0.3" />
        <circle cx="100" cy="95" r="3.5" fill="#f59e0b" opacity="0.35" />
        {/* Äußerer Glow-Ring */}
        <circle cx="100" cy="70" r="46" fill="none" stroke="#f59e0b" strokeWidth="0.8" opacity="0.1" strokeDasharray="4 6" />
        <circle cx="100" cy="70" r="36" fill="none" stroke="#f59e0b" strokeWidth="0.5" opacity="0.07" />
        {/* DEMNÄCHST Label */}
        <text x="20" y="158" fill="#f59e0b" fontSize="7" fontFamily="'Segoe UI',Arial,sans-serif"
          letterSpacing="4" fontWeight="700" opacity="0.9">DEMNÄCHST</text>
        <rect x="20" y="164" width="30" height="1.5" fill="#f59e0b" opacity="0.7" />
        {/* Titel gedimmt */}
        <text x="20" y="192" fill="white" fontSize="18" fontFamily="'Segoe UI',Arial,sans-serif"
          fontWeight="800" opacity="0.28">Elektro</text>
        <text x="20" y="212" fill="white" fontSize="18" fontFamily="'Segoe UI',Arial,sans-serif"
          fontWeight="800" opacity="0.28">oder</text>
        <text x="20" y="232" fill="white" fontSize="18" fontFamily="'Segoe UI',Arial,sans-serif"
          fontWeight="800" opacity="0.28">Verbrenner?</text>
        {/* Release Badge */}
        <rect x="20" y="248" width="88" height="18" rx="9" fill="#f59e0b" opacity="0.12" />
        <text x="64" y="260" fill="#f59e0b" fontSize="8" fontFamily="'Segoe UI',Arial,sans-serif"
          fontWeight="700" textAnchor="middle" opacity="0.85">Erscheint 2026</text>
        <rect x="20" y="272" width="160" height="0.5" fill="#f59e0b" opacity="0.12" />
        <text x="20" y="288" fill="white" fontSize="7" fontFamily="'Segoe UI',Arial,sans-serif"
          opacity="0.2" letterSpacing="2.5">VIRA</text>
      </svg>
    )
  }

  // Fallback
  return (
    <svg viewBox="0 0 200 300" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%" style={{ display: 'block' }}>
      <rect width="200" height="300" fill="#1a1a2e" />
      <text x="100" y="155" fill="white" fontSize="12" textAnchor="middle" fontFamily="sans-serif">E-Book</text>
    </svg>
  )
}

// ── Status-Labels ─────────────────────────────────────────────────────────────

const STATUS_LABEL: Record<string, string> = {
  offen:     'Ausstehend',
  bezahlt:   'Bezahlt',
  storniert: 'Storniert',
  erstattet: 'Erstattet',
}

const STATUS_CLS: Record<string, string> = {
  offen:     'bg-gray-100 text-gray-600',
  bezahlt:   'bg-green-100 text-green-700',
  storniert: 'bg-red-100 text-red-600',
  erstattet: 'bg-orange-100 text-orange-700',
}

function fmt(n: number) {
  return n.toLocaleString('de-DE', { minimumFractionDigits: 2 })
}

// ── Hauptkomponente ───────────────────────────────────────────────────────────

export default function EbookView() {
  const [ebooks, setEbooks] = useState<ApiEbook[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<ApiEbook | null>(null)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)
  const [agbChecked, setAgbChecked] = useState(false)
  const [widerrufChecked, setWiderrufChecked] = useState(false)
  const [tab, setTab] = useState<'bibliothek' | 'meine'>('bibliothek')
  const [bestellungen, setBestellungen] = useState<ApiEbookBestellung[]>([])
  const [bestellungenLoading, setBestellungenLoading] = useState(false)
  const [banner, setBanner] = useState<'success' | 'cancelled' | null>(null)
  const [downloadingId, setDownloadingId] = useState<string | null>(null)
  const [downloadError, setDownloadError] = useState<string | null>(null)

  useEffect(() => {
    apiListEbooks()
      .then(setEbooks)
      .catch(() => {})
      .finally(() => setLoading(false))

    const params = new URLSearchParams(window.location.search)
    const payment = params.get('payment')
    if (payment === 'success' || payment === 'cancelled') {
      setBanner(payment as 'success' | 'cancelled')
      if (payment === 'success') setTab('meine')
      window.history.replaceState({}, '', '/ebooks')
    }
  }, [])

  useEffect(() => {
    apiListEbookBestellungen().then(setBestellungen).catch(() => {})
  }, [])

  useEffect(() => {
    if (tab !== 'meine') return
    setBestellungenLoading(true)
    apiListEbookBestellungen()
      .then(setBestellungen)
      .catch(() => {})
      .finally(() => setBestellungenLoading(false))
  }, [tab])

  // Checkboxen zuruecksetzen, sobald ein anderes E-Book geoeffnet wird.
  useEffect(() => {
    setAgbChecked(false)
    setWiderrufChecked(false)
  }, [selected])

  async function handleDownload(ebook_id: string, titel: string) {
    setDownloadingId(ebook_id)
    setDownloadError(null)
    try {
      await apiDownloadEbook(ebook_id, titel)
    } catch (err) {
      setDownloadError((err as Error).message)
    } finally {
      setDownloadingId(null)
    }
  }

  async function handleCheckout() {
    if (!selected || !agbChecked || !widerrufChecked) return
    setCheckoutLoading(true)
    setCheckoutError(null)
    try {
      const { url } = await apiEbookCheckout(selected.id, agbChecked, widerrufChecked)
      window.location.href = url
    } catch (err) {
      setCheckoutError((err as Error).message || 'Checkout fehlgeschlagen.')
      setCheckoutLoading(false)
    }
  }

  const kaufSet = new Set(bestellungen.filter(b => b.status === 'bezahlt').map(b => b.ebook_id))

  return (
    <div
      className="relative h-full overflow-y-auto scrollbar-thin"
      style={{ background: 'radial-gradient(120% 60% at 50% 0%, #fdfaf6 0%, #faf7f3 40%, #f4f0ea 100%)' }}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-80 overflow-hidden">
        <div className="ez-aurora absolute left-1/2 -translate-x-1/2 -top-40 w-[720px] h-[440px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(249,115,22,0.09) 0%, transparent 68%)' }} />
      </div>

      <div className="ez-rise relative max-w-4xl mx-auto px-6 py-10">

        {/* Header */}
        <div className="mb-7">
          <div className="flex items-center gap-2.5 mb-5">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-orange-500/10 border border-orange-400/25 text-orange-500">
              <BookOpen size={12} />
            </span>
            <span className="text-[11px] font-bold tracking-[0.22em] uppercase text-gray-500">Vira · E-Books</span>
          </div>
          <h1 className="text-3xl sm:text-[2.6rem] font-bold text-gray-900 tracking-[-0.03em] leading-[1.0]">
            Wissen, das
            <br />
            <span className="text-gray-400">sich auszahlt.</span>
          </h1>
        </div>

        {/* Banner */}
        {banner && (
          <div className={`flex items-center gap-3 px-4 py-3 rounded-xl mb-6 text-sm ${
            banner === 'success'
              ? 'bg-green-50 text-green-800 border border-green-200'
              : 'bg-amber-50 text-amber-800 border border-amber-200'
          }`}>
            {banner === 'success'
              ? <CheckCircle size={18} className="shrink-0 text-green-600" />
              : <AlertCircle size={18} className="shrink-0 text-amber-500" />
            }
            <span>
              {banner === 'success'
                ? 'Zahlung erfolgreich! Dein E-Book wird dir per E-Mail zugeschickt.'
                : 'Zahlung abgebrochen. Du kannst es jederzeit erneut versuchen.'
              }
            </span>
            <button onClick={() => setBanner(null)} className="ml-auto p-0.5 hover:opacity-60 transition-opacity">
              <X size={15} />
            </button>
          </div>
        )}

        {/* Download-Fehler-Banner */}
        {downloadError && (
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl mb-4 text-sm bg-red-50 text-red-800 border border-red-200">
            <AlertCircle size={16} className="shrink-0 text-red-500" />
            <span>{downloadError}</span>
            <button onClick={() => setDownloadError(null)} className="ml-auto p-0.5 hover:opacity-60">
              <X size={14} />
            </button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 border-b border-[#e9e4dd] mb-6">
          {(['bibliothek', 'meine'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                tab === t
                  ? 'border-orange-500 text-gray-900'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              {t === 'bibliothek' ? 'Bibliothek' : 'Meine E-Books'}
            </button>
          ))}
        </div>


        {/* ── Bibliothek ── */}
        {tab === 'bibliothek' && (
          loading ? (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {[1, 2, 3].map(i => (
                <div key={i} className="animate-pulse">
                  <div className="w-full rounded-xl bg-gray-100" style={{ aspectRatio: '2/3' }} />
                  <div className="mt-3 space-y-2">
                    <div className="h-4 bg-gray-100 rounded w-3/4" />
                    <div className="h-3 bg-gray-100 rounded w-1/2" />
                    <div className="h-3 bg-gray-100 rounded w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
              {ebooks.map(ebook => {
                const comingSoon = COMING_SOON_IDS.has(ebook.id)

                if (comingSoon) {
                  return (
                    <div key={ebook.id} className="text-left select-none">
                      <div
                        className="relative w-full rounded-xl overflow-hidden"
                        style={{ aspectRatio: '2/3', border: '1px solid rgb(229,231,235)', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}
                      >
                        <EbookCover id={ebook.id} />
                        {/* "Bald erhältlich" Overlay-Badge oben rechts */}
                        <div className="absolute top-3 right-3 bg-black/60 backdrop-blur-sm rounded-full px-2.5 py-1">
                          <span className="text-[10px] font-bold text-white tracking-wide">Bald erhältlich</span>
                        </div>
                      </div>
                      <div className="mt-3 px-0.5">
                        <p className="text-sm font-semibold text-gray-400 leading-tight">{ebook.titel}</p>
                        <p className="text-xs text-gray-300 mt-0.5 leading-snug">{ebook.untertitel}</p>
                        <p className="text-xs text-gray-400 mt-1.5 font-medium">Erscheint 2026</p>
                      </div>
                    </div>
                  )
                }

                return (
                  <button
                    key={ebook.id}
                    onMouseEnter={() => setHoveredId(ebook.id)}
                    onMouseLeave={() => setHoveredId(null)}
                    onClick={() => {
                      if (kaufSet.has(ebook.id)) {
                        handleDownload(ebook.id, ebook.titel)
                      } else {
                        setSelected(ebook)
                        setCheckoutError(null)
                      }
                    }}
                    className="group text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 rounded-xl"
                  >
                    <div
                      className="relative w-full rounded-xl overflow-hidden"
                      style={{
                        aspectRatio: '2/3',
                        border: `1px solid ${hoveredId === ebook.id ? 'rgba(0,0,0,0.18)' : 'rgb(229,231,235)'}`,
                        transform: hoveredId === ebook.id ? 'translateY(-7px) scale(1.02)' : 'translateY(0) scale(1)',
                        boxShadow: hoveredId === ebook.id
                          ? '0 20px 48px rgba(0,0,0,0.18), 0 6px 16px rgba(0,0,0,0.1)'
                          : '0 1px 4px rgba(0,0,0,0.06)',
                        transition: 'transform 0.32s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.32s ease, border-color 0.2s ease',
                        willChange: 'transform',
                      }}
                    >
                      <EbookCover id={ebook.id} />
                      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors flex items-center justify-center">
                        <BookOpen size={28} className="text-white opacity-0 group-hover:opacity-90 transition-opacity drop-shadow" />
                      </div>
                    </div>
                    <div className="mt-3 px-0.5">
                      <p className="text-sm font-semibold text-gray-900 leading-tight">{ebook.titel}</p>
                      <p className="text-xs text-gray-400 mt-0.5 leading-snug">{ebook.untertitel}</p>
                      <div className="flex items-baseline gap-1.5 mt-1.5">
                        <span className="text-sm font-bold text-gray-900">{fmt(ebook.preis)} €</span>
                        {ebook.hat_rabatt && (
                          <span className="text-xs text-gray-400 line-through">{fmt(ebook.preis_normal)} €</span>
                        )}
                      </div>
                      {ebook.hat_rabatt && (
                        <span className="inline-block text-[10px] font-semibold bg-orange-100 text-orange-700 px-1.5 py-px rounded-full mt-0.5">
                          Abo-Preis
                        </span>
                      )}
                    </div>
                  </button>
                )
              })}
            </div>
          )
        )}

        {/* ── Meine E-Books ── */}
        {tab === 'meine' && (
          bestellungenLoading ? (
            <div className="space-y-3">
              {[1, 2].map(i => (
                <div key={i} className="animate-pulse h-20 bg-gray-50 rounded-xl border border-gray-100" />
              ))}
            </div>
          ) : bestellungen.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <BookOpen size={40} className="mx-auto mb-3 opacity-40" />
              <p className="text-sm font-medium mb-1">Noch keine E-Books gekauft.</p>
              <button
                onClick={() => setTab('bibliothek')}
                className="text-xs text-orange-500 hover:text-orange-600 transition-colors mt-1"
              >
                Zur Bibliothek →
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {bestellungen.map(b => (
                <div key={b.id} className="flex items-center gap-4 p-4 rounded-xl border border-[#e9e4dd] bg-white shadow-[0_8px_24px_-18px_rgba(40,25,10,0.2)]">
                  <div className="w-12 h-16 rounded-lg overflow-hidden shrink-0 border border-gray-200">
                    <EbookCover id={b.ebook_id} titel={b.titel} untertitel={b.untertitel} zielgruppe={b.zielgruppe} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{b.titel}</p>
                    <p className="text-xs text-gray-400 mt-0.5 truncate">{b.untertitel}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {new Date(b.created_at).toLocaleDateString('de-DE')}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${STATUS_CLS[b.status] ?? 'bg-gray-100 text-gray-500'}`}>
                      {STATUS_LABEL[b.status] ?? b.status}
                    </span>
                    <span className="text-sm font-semibold text-gray-900">{fmt(b.preis_bezahlt)} €</span>
                    {b.status === 'bezahlt' && (
                      <>
                        <button
                          onClick={() => handleDownload(b.ebook_id, b.titel)}
                          disabled={downloadingId === b.ebook_id}
                          className="flex items-center gap-1 text-[11px] font-semibold text-green-600 hover:text-green-700 transition-colors disabled:opacity-50"
                        >
                          {downloadingId === b.ebook_id
                            ? <span className="inline-block w-3 h-3 border border-green-400 border-t-transparent rounded-full animate-spin" />
                            : <Download size={12} />
                          }
                          PDF laden
                        </button>
                        <span className="flex items-center gap-1 text-[10px] text-green-600">
                          <Mail size={10} /> per E-Mail zugeschickt
                        </span>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )
        )}
      </div>

      {/* ── Detail-Modal ── */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.72)' }}
          onClick={() => setSelected(null)}
        >
          <div
            className="bg-white rounded-2xl overflow-hidden shadow-2xl w-full max-w-lg flex flex-col sm:flex-row max-h-[90vh]"
            onClick={e => e.stopPropagation()}
          >
            {/* Cover */}
            <div className="sm:w-48 shrink-0">
              <div className="w-full h-full" style={{ minHeight: 220 }}>
                <EbookCover
                  id={selected.id}
                  titel={selected.titel}
                  untertitel={selected.untertitel}
                  zielgruppe={selected.zielgruppe}
                  large
                />
              </div>
            </div>

            {/* Info */}
            <div className="flex-1 flex flex-col p-6 overflow-y-auto">
              <div className="flex items-start justify-between gap-3 mb-1">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 leading-snug">{selected.titel}</h2>
                  <p className="text-sm text-gray-500 mt-0.5">{selected.untertitel}</p>
                </div>
                <button
                  onClick={() => setSelected(null)}
                  className="shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <span className="inline-block text-xs text-gray-500 bg-gray-100 rounded-full px-2.5 py-0.5 mb-4 self-start">
                {selected.zielgruppe}
              </span>

              <p className="text-sm text-gray-600 leading-relaxed flex-1">{selected.beschreibung}</p>

              {/* Digital-Hinweis */}
              <div className="flex items-start gap-2 mt-4 p-3 bg-blue-50 rounded-xl border border-blue-100">
                <Download size={14} className="text-blue-500 mt-0.5 shrink-0" />
                <p className="text-xs text-blue-700 leading-relaxed">
                  Digitales Produkt — nach dem Kauf erhältst du den Download-Link per E-Mail.
                </p>
              </div>

              {/* Preis + Kaufen */}
              <div className="mt-4 pt-4 border-t border-gray-100">
                <div className="flex items-baseline gap-2 mb-1">
                  <span className="text-2xl font-bold text-gray-900">{fmt(selected.preis)} €</span>
                  {selected.hat_rabatt && (
                    <span className="text-base text-gray-400 line-through">{fmt(selected.preis_normal)} €</span>
                  )}
                </div>
                {selected.hat_rabatt && (
                  <p className="text-xs text-orange-600 font-medium mb-2">Dein Abo-Rabattpreis (10 % Rabatt)</p>
                )}
                <p className="text-xs text-gray-400 mb-4">inkl. MwSt. · sofort nach Kauf per E-Mail</p>

                {/* Pflicht-Zustimmungen vor digitalem Kauf */}
                <div className="space-y-2.5 mb-4">
                  <label className="flex items-start gap-2.5 cursor-pointer select-none">
                    <input type="checkbox" checked={agbChecked} onChange={(e) => setAgbChecked(e.target.checked)}
                      className="mt-0.5 shrink-0 w-4 h-4 accent-gray-900" />
                    <span className="text-xs text-gray-500 leading-relaxed">
                      Ich akzeptiere die <Link to="/agb" className="underline hover:text-gray-900">AGB</Link>
                      {' '}und die <Link to="/datenschutz" className="underline hover:text-gray-900">Datenschutzerklärung</Link>.
                    </span>
                  </label>
                  <label className="flex items-start gap-2.5 cursor-pointer select-none">
                    <input type="checkbox" checked={widerrufChecked} onChange={(e) => setWiderrufChecked(e.target.checked)}
                      className="mt-0.5 shrink-0 w-4 h-4 accent-gray-900" />
                    <span className="text-xs text-gray-500 leading-relaxed">
                      Ich stimme ausdrücklich zu, dass vor Ablauf der Widerrufsfrist mit der Ausführung des Vertrags
                      begonnen wird. Mir ist bekannt, dass ich dadurch mein{' '}
                      <Link to="/widerruf" className="underline hover:text-gray-900">Widerrufsrecht</Link> verliere.
                    </span>
                  </label>
                </div>

                {checkoutError && (
                  <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-3">{checkoutError}</p>
                )}

                <button
                  onClick={handleCheckout}
                  disabled={checkoutLoading || !agbChecked || !widerrufChecked}
                  className="w-full flex items-center justify-center gap-2 py-3 bg-gray-900 text-white rounded-xl text-sm font-semibold hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {checkoutLoading ? (
                    <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <ShoppingBag size={16} />
                      Jetzt kaufen
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
