import { useEffect, useRef, useState } from 'react'
import { X, ShoppingBag, ZoomIn, Package, ArrowLeft, ChevronRight, CheckCircle, AlertCircle } from 'lucide-react'
import {
  apiListPosters, apiPosterCheckout, apiListBestellungen,
  apiGetAdresse, apiSaveAdresse,
  type ApiPoster, type ApiAdresse, type ApiBestellung,
} from '../api/client'

const PLACEHOLDER_COLORS: Record<string, string> = {
  'bmw-m3':              '#1a2438',
  'porsche-911':         '#2a1f2e',
  'mercedes-amg-gt':     '#161616',
  'audi-r8':             '#1f2a1a',
  'lamborghini-huracan': '#2e1a08',
  'ferrari-488':         '#2e0a0a',
  'mclaren-720s':        '#0a1a2e',
  'nissan-gtr':          '#0a0a1f',
}

const STATUS_LABEL: Record<string, string> = {
  offen:      'Offen',
  bezahlt:    'Bezahlt',
  versendet:  'Versendet',
  storniert:  'Storniert',
  erstattet:  'Erstattet',
}

const STATUS_CLS: Record<string, string> = {
  offen:      'bg-gray-100 text-gray-600',
  bezahlt:    'bg-green-100 text-green-700',
  versendet:  'bg-blue-100 text-blue-700',
  storniert:  'bg-red-100 text-red-600',
  erstattet:  'bg-orange-100 text-orange-700',
}

function PosterPlaceholder({ id, large = false }: { id: string; large?: boolean }) {
  const bg = PLACEHOLDER_COLORS[id] ?? '#1a1a1a'
  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-3 select-none" style={{ background: bg }}>
      <div
        className={`border border-white/10 rounded ${large ? 'w-24 h-24' : 'w-10 h-10'} flex items-center justify-center`}
        style={{ background: 'rgba(255,255,255,0.04)' }}
      >
        <div
          className={`border border-white/20 rounded-sm ${large ? 'w-14 h-14' : 'w-5 h-5'}`}
          style={{ background: 'rgba(255,255,255,0.06)' }}
        />
      </div>
      {large && <p className="text-white/20 text-xs tracking-widest uppercase">Vorschau folgt</p>}
    </div>
  )
}

function fmt(preis: number) {
  return preis.toLocaleString('de-DE', { minimumFractionDigits: 2 })
}

const EMPTY_ADRESSE: ApiAdresse = { name: '', strasse: '', plz: '', ort: '', land: 'DE' }

export default function PosterView() {
  const [posters, setPosters] = useState<ApiPoster[]>([])
  const [loading, setLoading] = useState(true)
  const [selected, setSelected] = useState<ApiPoster | null>(null)
  const [modalStep, setModalStep] = useState<'info' | 'adresse'>('info')
  const [adresse, setAdresse] = useState<ApiAdresse>(EMPTY_ADRESSE)
  const [adresseSpeichern, setAdresseSpeichern] = useState(false)
  const [checkoutLoading, setCheckoutLoading] = useState(false)
  const [checkoutError, setCheckoutError] = useState<string | null>(null)
  const [tab, setTab] = useState<'galerie' | 'bestellungen'>('galerie')
  const [bestellungen, setBestellungen] = useState<ApiBestellung[]>([])
  const [bestellungenLoading, setBestellungenLoading] = useState(false)
  const [banner, setBanner] = useState<'success' | 'cancelled' | null>(null)
  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    apiListPosters()
      .then(setPosters)
      .catch(() => {})
      .finally(() => setLoading(false))

    const params = new URLSearchParams(window.location.search)
    const payment = params.get('payment')
    if (payment === 'success' || payment === 'cancelled') {
      setBanner(payment)
      if (payment === 'success') setTab('bestellungen')
      window.history.replaceState({}, '', '/poster')
    }
  }, [])

  useEffect(() => {
    if (tab !== 'bestellungen') return
    setBestellungenLoading(true)
    apiListBestellungen()
      .then(setBestellungen)
      .catch(() => {})
      .finally(() => setBestellungenLoading(false))
  }, [tab])

  function openModal(poster: ApiPoster) {
    setSelected(poster)
    setModalStep('info')
    setCheckoutError(null)
  }

  function closeModal() {
    setSelected(null)
    setModalStep('info')
    setCheckoutError(null)
  }

  async function handleKaufenClick() {
    setModalStep('adresse')
    setCheckoutError(null)
    // Gespeicherte Adresse laden
    const saved = await apiGetAdresse().catch(() => null)
    if (saved) setAdresse(saved)
    else setAdresse(EMPTY_ADRESSE)
    setTimeout(() => nameRef.current?.focus(), 50)
  }

  async function handleCheckout(e: React.FormEvent) {
    e.preventDefault()
    if (!selected) return
    if (!adresse.name.trim() || !adresse.strasse.trim() || !adresse.plz.trim() || !adresse.ort.trim()) {
      setCheckoutError('Bitte alle Pflichtfelder ausfüllen.')
      return
    }
    setCheckoutLoading(true)
    setCheckoutError(null)
    try {
      if (adresseSpeichern) {
        await apiSaveAdresse(adresse).catch(() => {})
      }
      const { url } = await apiPosterCheckout(selected.id, adresse, adresseSpeichern)
      window.location.href = url
    } catch (err) {
      setCheckoutError((err as Error).message || 'Checkout fehlgeschlagen.')
      setCheckoutLoading(false)
    }
  }

  function field(key: keyof ApiAdresse, label: string, opts?: { half?: boolean; placeholder?: string }) {
    return (
      <div className={opts?.half ? 'flex-1 min-w-0' : ''}>
        <label className="block text-xs font-medium text-gray-500 mb-1">{label}</label>
        <input
          ref={key === 'name' ? nameRef : undefined}
          type="text"
          value={adresse[key]}
          onChange={e => setAdresse(a => ({ ...a, [key]: e.target.value }))}
          placeholder={opts?.placeholder ?? ''}
          className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-300 bg-white"
          required={key !== 'land'}
        />
      </div>
    )
  }

  return (
    <div className="h-full overflow-y-auto bg-white">
      <div className="max-w-5xl mx-auto px-6 py-8">

        {/* Header */}
        <div className="flex items-end justify-between mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight mb-1">Poster</h1>
            <p className="text-sm text-gray-500">Hochwertige Kunstdrucke für Autobegeisterte</p>
          </div>
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
                ? 'Zahlung erfolgreich! Deine Bestellung wurde aufgenommen.'
                : 'Zahlung abgebrochen. Du kannst es jederzeit erneut versuchen.'
              }
            </span>
            <button onClick={() => setBanner(null)} className="ml-auto p-0.5 hover:opacity-60 transition-opacity">
              <X size={15} />
            </button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 border-b border-gray-100 mb-6">
          {(['galerie', 'bestellungen'] as const).map(t => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-4 py-2 text-sm font-medium transition-colors border-b-2 -mb-px ${
                tab === t
                  ? 'border-gray-900 text-gray-900'
                  : 'border-transparent text-gray-400 hover:text-gray-600'
              }`}
            >
              {t === 'galerie' ? 'Galerie' : 'Meine Bestellungen'}
            </button>
          ))}
        </div>

        {/* ── Galerie ── */}
        {tab === 'galerie' && (
          loading ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="animate-pulse">
                  <div className="w-full rounded-xl bg-gray-100" style={{ aspectRatio: '2/3' }} />
                  <div className="mt-2.5 space-y-1.5">
                    <div className="h-3.5 bg-gray-100 rounded w-3/4" />
                    <div className="h-3 bg-gray-100 rounded w-1/3" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
              {posters.map((poster) => (
                <button
                  key={poster.id}
                  onClick={() => openModal(poster)}
                  className="poster-tile group text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-400 rounded-xl"
                >
                  <div
                    className="poster-img-wrap relative w-full rounded-xl overflow-hidden border border-gray-200 group-hover:border-gray-400"
                    style={{ aspectRatio: '2 / 3' }}
                  >
                    {poster.bildpfad ? (
                      <img src={poster.bildpfad} alt={poster.titel} className="w-full h-full object-cover" draggable={false} />
                    ) : (
                      <PosterPlaceholder id={poster.id} />
                    )}
                    <div className="poster-shine" />
                    <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors flex items-center justify-center">
                      <ZoomIn size={28} className="text-white opacity-0 group-hover:opacity-100 transition-opacity drop-shadow" />
                    </div>
                  </div>
                  <div className="mt-2.5 px-0.5">
                    <p className="text-sm font-medium text-gray-900 leading-tight line-clamp-2">{poster.titel}</p>
                    <div className="flex items-baseline gap-1.5 mt-0.5">
                      <p className="text-sm text-gray-900 font-semibold">{fmt(poster.preis)} €</p>
                      {poster.hat_rabatt && (
                        <p className="text-xs text-gray-400 line-through">{fmt(poster.preis_normal)} €</p>
                      )}
                    </div>
                    {poster.hat_rabatt && (
                      <span className="inline-block text-[10px] font-semibold bg-orange-100 text-orange-700 px-1.5 py-px rounded-full mt-0.5">
                        Abo-Preis
                      </span>
                    )}
                  </div>
                </button>
              ))}
            </div>
          )
        )}

        {/* ── Bestellungen ── */}
        {tab === 'bestellungen' && (
          bestellungenLoading ? (
            <div className="space-y-3">
              {[1, 2].map(i => (
                <div key={i} className="animate-pulse h-20 bg-gray-50 rounded-xl border border-gray-100" />
              ))}
            </div>
          ) : bestellungen.length === 0 ? (
            <div className="text-center py-20 text-gray-400">
              <Package size={40} className="mx-auto mb-3 opacity-40" />
              <p className="text-sm">Noch keine Bestellungen.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {bestellungen.map(b => (
                <div key={b.id} className="flex items-center gap-4 p-4 rounded-xl border border-gray-100 bg-gray-50">
                  <div className="w-12 h-16 rounded-lg overflow-hidden shrink-0 border border-gray-200">
                    {b.bildpfad
                      ? <img src={b.bildpfad} alt={b.poster_titel} className="w-full h-full object-cover" />
                      : <PosterPlaceholder id={b.poster_id} />
                    }
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">{b.poster_titel}</p>
                    <p className="text-xs text-gray-400 mt-0.5">
                      {b.adresse_name} · {b.adresse_plz} {b.adresse_ort}
                    </p>
                    <p className="text-xs text-gray-400">{new Date(b.created_at).toLocaleDateString('de-DE')}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${STATUS_CLS[b.status] ?? 'bg-gray-100 text-gray-500'}`}>
                      {STATUS_LABEL[b.status] ?? b.status}
                    </span>
                    <span className="text-sm font-semibold text-gray-900">{fmt(b.preis_bezahlt)} €</span>
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
          style={{ background: 'rgba(0,0,0,0.7)' }}
          onClick={closeModal}
        >
          <div
            className="bg-white rounded-2xl overflow-hidden shadow-2xl w-full max-w-2xl flex flex-col sm:flex-row max-h-[90vh]"
            onClick={e => e.stopPropagation()}
          >
            {/* Bild-Seite */}
            <div className="sm:w-56 shrink-0">
              <div className="w-full h-full" style={{ aspectRatio: '2/3', minHeight: '200px' }}>
                {selected.bildpfad
                  ? <img src={selected.bildpfad} alt={selected.titel} className="w-full h-full object-cover" draggable={false} />
                  : <PosterPlaceholder id={selected.id} large />
                }
              </div>
            </div>

            {/* Info / Adress-Seite */}
            <div className="flex-1 flex flex-col p-6 overflow-y-auto">

              {/* Schritt: Info */}
              {modalStep === 'info' && (
                <>
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <h2 className="text-lg font-semibold text-gray-900 leading-snug">{selected.titel}</h2>
                    <button onClick={closeModal} className="shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
                      <X size={18} />
                    </button>
                  </div>

                  <p className="text-sm text-gray-600 leading-relaxed mb-6">{selected.beschreibung}</p>

                  <div className="mt-auto">
                    <div className="flex items-baseline gap-2 mb-1">
                      <span className="text-2xl font-bold text-gray-900">{fmt(selected.preis)} €</span>
                      {selected.hat_rabatt && (
                        <span className="text-base text-gray-400 line-through">{fmt(selected.preis_normal)} €</span>
                      )}
                    </div>
                    {selected.hat_rabatt && (
                      <p className="text-xs text-orange-600 font-medium mb-3">Dein Abo-Rabattpreis</p>
                    )}
                    <span className="block text-xs text-gray-400 mb-4">inkl. MwSt.</span>

                    <div className="space-y-2">
                      <button
                        onClick={handleKaufenClick}
                        className="w-full flex items-center justify-center gap-2 py-3 bg-gray-900 text-white rounded-xl text-sm font-semibold hover:bg-gray-700 transition-colors"
                      >
                        <ShoppingBag size={16} />
                        Kaufen
                        <ChevronRight size={15} className="opacity-60" />
                      </button>
                      <p className="text-center text-xs text-gray-400">
                        Druck auf Premium-Papier · DIN A2 · Versand in 3–5 Werktagen
                      </p>
                    </div>
                  </div>
                </>
              )}

              {/* Schritt: Adresse */}
              {modalStep === 'adresse' && (
                <form onSubmit={handleCheckout} className="flex flex-col h-full">
                  <div className="flex items-center gap-2 mb-4">
                    <button type="button" onClick={() => setModalStep('info')} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
                      <ArrowLeft size={16} />
                    </button>
                    <h2 className="text-base font-semibold text-gray-900">Lieferadresse</h2>
                    <button type="button" onClick={closeModal} className="ml-auto p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
                      <X size={18} />
                    </button>
                  </div>

                  <div className="space-y-3 flex-1">
                    {field('name', 'Vor- & Nachname', { placeholder: 'Max Mustermann' })}
                    {field('strasse', 'Straße & Hausnummer', { placeholder: 'Musterstraße 1' })}
                    <div className="flex gap-3">
                      <div className="w-28">
                        {field('plz', 'PLZ', { placeholder: '12345' })}
                      </div>
                      <div className="flex-1">
                        {field('ort', 'Ort', { placeholder: 'Musterstadt' })}
                      </div>
                    </div>
                    {field('land', 'Land', { placeholder: 'DE' })}

                    <label className="flex items-center gap-2 cursor-pointer mt-1">
                      <input
                        type="checkbox"
                        checked={adresseSpeichern}
                        onChange={e => setAdresseSpeichern(e.target.checked)}
                        className="rounded"
                      />
                      <span className="text-xs text-gray-500">Adresse für nächstes Mal merken</span>
                    </label>
                  </div>

                  {checkoutError && (
                    <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2 mt-3">{checkoutError}</p>
                  )}

                  <div className="mt-4 pt-4 border-t border-gray-100">
                    <div className="flex items-baseline gap-2 mb-3">
                      <span className="text-lg font-bold text-gray-900">{fmt(selected.preis)} €</span>
                      <span className="text-xs text-gray-400">inkl. MwSt.</span>
                    </div>
                    <button
                      type="submit"
                      disabled={checkoutLoading}
                      className="w-full flex items-center justify-center gap-2 py-3 bg-gray-900 text-white rounded-xl text-sm font-semibold hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {checkoutLoading ? (
                        <span className="inline-block w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      ) : (
                        <>
                          <ShoppingBag size={16} />
                          Weiter zur Zahlung
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
