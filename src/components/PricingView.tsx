import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Check, Zap, Star, Crown, ShoppingCart, CheckCircle, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { apiCreateCheckoutSession } from '../api/client'

interface PlanConfig {
  id: 'light' | 'pro' | 'max'
  name: string
  preis: string
  preisHinweis: string
  checks: string
  features: string[]
  icon: React.ReactNode
  highlight?: boolean
  farbe: string
  bg: string
  border: string
}

const PLANS: PlanConfig[] = [
  {
    id: 'light',
    name: 'LIGHT',
    preis: '5,99 €',
    preisHinweis: 'pro Monat',
    checks: '3 Checks / Monat',
    features: [
      '3 Kauf- oder Verkaufs-Checks',
      'Besserer KI-Chat (mehr Anfragen)',
      'Längere Chat-Nachrichten',
      'Mehr Bilder im Chat',
    ],
    icon: <Zap size={22} />,
    farbe: 'text-blue-600',
    bg: 'bg-blue-50',
    border: 'border-blue-200',
  },
  {
    id: 'pro',
    name: 'PRO',
    preis: '19,99 €',
    preisHinweis: 'pro Monat',
    checks: '10 Checks / Monat',
    features: [
      '10 Kauf- oder Verkaufs-Checks',
      'Alle LIGHT-Features',
      'Poster-Features (Inserat-Optimierung)',
      'Prioritäts-Support',
    ],
    icon: <Star size={22} />,
    highlight: true,
    farbe: 'text-orange-600',
    bg: 'bg-orange-50',
    border: 'border-orange-400',
  },
  {
    id: 'max',
    name: 'MAX',
    preis: '49,99 €',
    preisHinweis: 'pro Monat',
    checks: 'Unbegrenzte Checks',
    features: [
      'Unbegrenzte Kauf- & Verkaufs-Checks',
      'Alle PRO-Features',
      'Frühzugang zu neuen Features',
      'Direkter Support',
    ],
    icon: <Crown size={22} />,
    farbe: 'text-purple-600',
    bg: 'bg-purple-50',
    border: 'border-purple-200',
  },
]

// Hover-Glow je Plan im jeweiligen Akzent-RGB — dieselbe Idee wie der
// fahrzeugeigene Glow auf der Entdecken-Seite (car.glow), konsistent übernommen.
const GLOW_RGB: Record<string, string> = {
  light:     '59,130,246',   // blau
  pro:       '249,115,22',   // orange
  max:       '168,85,247',   // lila
  einzelkauf: '17,24,39',    // neutral (grau-900)
}

// Hover-Signatur der Entdecken-Karten, konsistent übernommen (nicht stärker).
const CARD_TRANSITION =
  'transform 0.32s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.32s ease, border-color 0.2s ease'

function cardHoverStyle(id: string, hovered: boolean, restingShadow: string): React.CSSProperties {
  return {
    transform: hovered ? 'translateY(-6px) scale(1.02)' : 'translateY(0) scale(1)',
    boxShadow: hovered
      ? `0 24px 50px rgba(0,0,0,0.10), 0 0 40px rgba(${GLOW_RGB[id]},0.16)`
      : restingShadow,
    transition: CARD_TRANSITION,
    willChange: 'transform',
  }
}

export default function PricingView() {
  const { user, refreshUser } = useAuth()
  const [searchParams, setSearchParams] = useSearchParams()
  const [loading, setLoading] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [hoveredCard, setHoveredCard] = useState<string | null>(null)

  const paymentParam = searchParams.get('payment')

  // Nach erfolgreicher Zahlung User-Daten aktualisieren
  useEffect(() => {
    if (paymentParam === 'success') {
      refreshUser()
      const t = setTimeout(() => {
        setSearchParams({}, { replace: true })
      }, 5000)
      return () => clearTimeout(t)
    }
  }, [paymentParam, refreshUser, setSearchParams])

  async function handleAbo(aboTyp: 'light' | 'pro' | 'max') {
    setLoading(aboTyp)
    setError(null)
    try {
      const { url } = await apiCreateCheckoutSession('abo', aboTyp)
      window.location.href = url
    } catch (e) {
      setError((e as Error).message)
      setLoading(null)
    }
  }

  async function handleEinzelkauf() {
    setLoading('einzelkauf')
    setError(null)
    try {
      const { url } = await apiCreateCheckoutSession('einzelkauf')
      window.location.href = url
    } catch (e) {
      setError((e as Error).message)
      setLoading(null)
    }
  }

  const aktuellerPlan = user?.abo_typ ?? 'none'

  return (
    <div
      className="relative h-full overflow-y-auto scrollbar-thin"
      style={{ background: 'radial-gradient(120% 60% at 50% 0%, #fdfaf6 0%, #faf7f3 40%, #f4f0ea 100%)' }}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-80 overflow-hidden">
        <div className="ez-aurora absolute left-1/2 -translate-x-1/2 -top-40 w-[720px] h-[440px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(249,115,22,0.09) 0%, transparent 68%)' }} />
      </div>

      <div className="ez-rise relative max-w-5xl mx-auto px-4 py-12">

        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center gap-2.5 mb-5">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-orange-500/10 border border-orange-400/25 text-orange-500">
              <Star size={12} />
            </span>
            <span className="text-[11px] font-bold tracking-[0.22em] uppercase text-gray-500">Vira · Preise</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-3 tracking-[-0.03em] leading-[1.0]">
            Ein Plan, <span className="text-gray-400">der mitwächst.</span>
          </h1>
          <p className="text-gray-500 text-base max-w-xl mx-auto">
            Wähle den Plan, der zu deiner Nutzung passt. Alle Pläne können monatlich gekündigt werden.
          </p>
          {user && aktuellerPlan !== 'none' && (
            <div className="mt-4 inline-flex items-center gap-2 bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-2 rounded-full">
              <CheckCircle size={15} />
              Aktueller Plan: <strong className="uppercase">{aktuellerPlan}</strong>
              {aktuellerPlan !== 'max' && (
                <span className="text-green-600">
                  · {user.checks_verbleibend} Check{user.checks_verbleibend !== 1 ? 's' : ''} verbleibend
                </span>
              )}
            </div>
          )}
          {user && aktuellerPlan === 'none' && user.checks_verbleibend > 0 && (
            <div className="mt-4 inline-flex items-center gap-2 bg-blue-50 border border-blue-200 text-blue-700 text-sm px-4 py-2 rounded-full">
              <CheckCircle size={15} />
              {user.checks_verbleibend} Gratis-Check noch verfügbar
            </div>
          )}
        </div>

        {/* Zahlung erfolgreich / abgebrochen */}
        {paymentParam === 'success' && (
          <div className="mb-8 bg-green-50 border border-green-200 rounded-2xl px-6 py-4 flex items-start gap-3">
            <CheckCircle size={20} className="text-green-600 shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-green-800">Zahlung erfolgreich!</p>
              <p className="text-sm text-green-700 mt-0.5">
                Dein Konto wird in Kürze freigeschaltet. Das kann einen Moment dauern.
              </p>
            </div>
          </div>
        )}
        {paymentParam === 'cancelled' && (
          <div className="mb-8 bg-gray-50 border border-gray-200 rounded-2xl px-6 py-4 flex items-start gap-3">
            <X size={20} className="text-gray-400 shrink-0 mt-0.5" />
            <p className="text-sm text-gray-600">Zahlung abgebrochen. Du kannst jederzeit erneut starten.</p>
          </div>
        )}

        {/* Fehler */}
        {error && (
          <div className="mb-6 bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Abo-Karten */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-8">
          {PLANS.map((plan) => {
            const istAktuell = aktuellerPlan === plan.id
            const istHighlight = plan.highlight

            return (
              <div
                key={plan.id}
                onMouseEnter={() => setHoveredCard(plan.id)}
                onMouseLeave={() => setHoveredCard(null)}
                className={`relative rounded-2xl border-2 p-6 flex flex-col ${plan.border} bg-white`}
                style={cardHoverStyle(
                  plan.id,
                  hoveredCard === plan.id,
                  istHighlight
                    ? '0 8px 24px rgba(249,115,22,0.10)'
                    : '0 1px 3px rgba(0,0,0,0.05)',
                )}
              >
                {istHighlight && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-orange-500 text-white text-xs font-bold px-3 py-1 rounded-full tracking-wide">
                    BELIEBT
                  </div>
                )}
                {istAktuell && (
                  <div className="absolute -top-3 right-4 bg-green-500 text-white text-xs font-bold px-3 py-1 rounded-full">
                    AKTIV
                  </div>
                )}

                {/* Icon + Name */}
                <div className={`w-11 h-11 rounded-xl ${plan.bg} ${plan.farbe} flex items-center justify-center mb-4`}>
                  {plan.icon}
                </div>
                <h2 className={`text-lg font-bold ${plan.farbe} mb-1`}>{plan.name}</h2>
                <div className="mb-1">
                  <span className="text-2xl font-bold text-gray-900">{plan.preis}</span>
                  <span className="text-sm text-gray-400 ml-1">{plan.preisHinweis}</span>
                </div>
                <p className="text-sm font-medium text-gray-600 mb-4">{plan.checks}</p>

                {/* Features */}
                <ul className="space-y-2 mb-6 flex-1">
                  {plan.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
                      <Check size={15} className={`${plan.farbe} shrink-0 mt-0.5`} />
                      {f}
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <button
                  onClick={() => handleAbo(plan.id)}
                  disabled={!!loading || istAktuell}
                  className={`w-full py-2.5 rounded-xl text-sm font-semibold transition-all ${
                    istAktuell
                      ? 'bg-gray-100 text-gray-400 cursor-default border border-transparent'
                      : istHighlight
                        ? 'bg-orange-500 hover:bg-orange-600 text-white shadow-sm border border-transparent'
                        : `${plan.bg} ${plan.farbe} hover:opacity-80 border ${plan.border}`
                  } disabled:opacity-60`}
                >
                  {loading === plan.id
                    ? 'Weiterleitung…'
                    : istAktuell
                      ? 'Aktueller Plan'
                      : `${plan.name} wählen`}
                </button>
              </div>
            )
          })}
        </div>

        {/* Einzelkauf */}
        <div
          onMouseEnter={() => setHoveredCard('einzelkauf')}
          onMouseLeave={() => setHoveredCard(null)}
          className="bg-white border border-[#e6e1da] rounded-2xl p-6 flex flex-col md:flex-row md:items-center gap-6"
          style={cardHoverStyle('einzelkauf', hoveredCard === 'einzelkauf', '0 8px 24px -16px rgba(40,25,10,0.2)')}
        >
          <div className="w-11 h-11 rounded-xl bg-gray-100 text-gray-600 flex items-center justify-center shrink-0">
            <ShoppingCart size={22} />
          </div>
          <div className="flex-1">
            <h2 className="text-base font-bold text-gray-900 mb-1">Einzelkauf — 12,99 €</h2>
            <p className="text-sm text-gray-500">
              Kein Abo nötig. Kaufe einen einzelnen Kauf- oder Verkaufs-Check als Einmalzahlung.
              Ideal für gelegentliche Nutzung.
            </p>
          </div>
          <button
            onClick={handleEinzelkauf}
            disabled={!!loading}
            className="shrink-0 px-6 py-2.5 rounded-xl bg-gray-900 hover:bg-gray-700 text-white text-sm font-semibold transition-colors disabled:opacity-60 whitespace-nowrap"
          >
            {loading === 'einzelkauf' ? 'Weiterleitung…' : '1 Check kaufen'}
          </button>
        </div>

        {/* Hinweis */}
        <p className="text-center text-xs text-gray-400 mt-6">
          Alle Preise inkl. MwSt. · Testmodus — keine echten Zahlungen · Abo monatlich kündbar
        </p>
      </div>
    </div>
  )
}
