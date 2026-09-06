import { useState } from 'react'
import type { ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Calculator,
  Car,
  Check,
  MessageSquare,
  Search,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  TrendingUp,
  User,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { PlusCheckout } from './PurchaseGate'
import { RETURN_TO_KEY } from './autofinder/logic'

const FREE_FEATURES = [
  { icon: <Search size={16} />, text: '5 AutoFinder-Suchen pro Monat' },
  { icon: <MessageSquare size={16} />, text: '20 KI-Chat-Nachrichten pro Monat' },
  { icon: <Calculator size={16} />, text: 'Autokosten unbegrenzt' },
  { icon: <User size={16} />, text: 'VIRA Account und gespeicherte Verläufe' },
]

const PLUS_FEATURES = [
  '5 KaufChecks pro Monat',
  '1 VerkaufsCheck pro Monat',
  '50 AutoFinder-Suchen pro Monat',
  '100 KI-Chat-Nachrichten pro Monat',
  'Autokosten unbegrenzt',
]

const KAUFCHECK_FEATURES = [
  'Fahrzeuganalyse mit Ergebnisübersicht',
  'Bekannte Schwachstellen der Baureihe',
  'Motor- und Baureihenprüfung',
  'Einordnung von Datenqualität und Quellenlage',
  'Konkrete kaufrelevante Hinweise',
]

const VERKAUFSCHECK_FEATURES = [
  'Fahrzeug- und Zustandsanalyse',
  'Preisorientierung bei ausreichender Datenlage',
  'Verkaufsstrategie und Ergebnisübersicht',
  'Prüfung des Inseratstexts',
  'Argumente für einen nachvollziehbaren Verkauf',
]

function FeatureList({ features, accent }: { features: string[]; accent: string }) {
  return (
    <ul className="space-y-2.5 mb-7 flex-1">
      {features.map((feature) => (
        <li key={feature} className="flex items-start gap-2.5 text-sm leading-relaxed text-gray-600">
          <Check size={16} className={`${accent} shrink-0 mt-0.5`} />
          <span>{feature}</span>
        </li>
      ))}
    </ul>
  )
}

function PaidCard({
  title,
  price,
  intro,
  features,
  icon,
  accent,
  iconClass,
  buttonClass,
  cta,
  onStart,
}: {
  title: string
  price: string
  intro: string
  features: string[]
  icon: ReactNode
  accent: string
  iconClass: string
  buttonClass: string
  cta: string
  onStart: () => void
}) {
  return (
    <article className="rounded-3xl border border-[#e6e1da] bg-white p-6 sm:p-7 shadow-[0_18px_48px_-30px_rgba(40,25,10,0.28)] flex flex-col">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-5 ${iconClass}`}>
        {icon}
      </div>
      <h2 className="text-xl font-bold tracking-[-0.02em] text-gray-900">{title}</h2>
      <p className="text-sm text-gray-500 mt-1 mb-5">{intro}</p>
      <div className="mb-6">
        <span className="text-4xl font-bold tracking-[-0.04em] text-gray-900">{price}</span>
        <span className="ml-2 text-sm text-gray-500">einmalig pro Check</span>
      </div>
      <FeatureList features={features} accent={accent} />
      <p className="text-xs text-gray-400 mb-4 -mt-3">Dein Guthaben verfällt nicht.</p>
      <button
        type="button"
        onClick={onStart}
        className={`w-full rounded-xl px-5 py-3 text-sm font-semibold transition-colors ${buttonClass}`}
      >
        {cta}
      </button>
    </article>
  )
}

export default function PricingView() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [plusCheckout, setPlusCheckout] = useState(false)

  // Plus laeuft ueber den bestehenden Checkout — anonym zuerst ueber Login mit
  // ReturnTo, damit der Nutzer nach der Anmeldung wieder hier landet.
  function startPlus() {
    if (!user) {
      sessionStorage.setItem(RETURN_TO_KEY, '/pricing')
      navigate('/login')
      return
    }
    setPlusCheckout(true)
  }

  function startCheck(path: '/kaufcheck' | '/verkaufscheck') {
    if (!user) {
      sessionStorage.setItem(RETURN_TO_KEY, path)
      navigate('/login')
      return
    }
    navigate(path)
  }

  return (
    <div
      className="relative h-full overflow-y-auto scrollbar-thin"
      style={{ background: 'radial-gradient(120% 60% at 50% 0%, #fdfaf6 0%, #faf7f3 40%, #f4f0ea 100%)' }}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-80 overflow-hidden">
        <div
          className="ez-aurora absolute left-1/2 -translate-x-1/2 -top-40 w-[720px] h-[440px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(249,115,22,0.09) 0%, transparent 68%)' }}
        />
      </div>

      <div className="ez-rise relative max-w-5xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
        <header className="text-center max-w-2xl mx-auto mb-9">
          <div className="inline-flex items-center gap-2.5 mb-5">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-orange-500/10 border border-orange-400/25 text-orange-500">
              <ShieldCheck size={13} />
            </span>
            <span className="text-[11px] font-bold tracking-[0.22em] uppercase text-gray-500">Vira · Preise</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 tracking-[-0.04em] leading-[1.02]">
            Einzeln kaufen oder <span className="text-gray-400">monatlich mehr bekommen.</span>
          </h1>
          <p className="text-gray-500 text-base mt-4 leading-relaxed">
            Starte kostenlos. Bezahle einzelne Checks nur bei Bedarf — oder hol dir mit
            VIRA Plus jeden Monat ein festes Kontingent.
          </p>
        </header>

        <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 mb-9 text-xs font-medium text-gray-600">
          {['Einzelchecks ohne Abo', 'Gekauftes Guthaben verfällt nicht', 'Plus monatlich kündbar'].map((item) => (
            <span key={item} className="inline-flex items-center gap-1.5">
              <Check size={14} className="text-emerald-600" />
              {item}
            </span>
          ))}
        </div>

        <section className="mb-6 rounded-3xl border border-emerald-200 bg-emerald-50/60 p-6 sm:p-7 shadow-[0_16px_40px_-30px_rgba(5,150,105,0.4)]">
          <div className="flex flex-col lg:flex-row lg:items-center gap-6">
            <div className="flex items-start gap-4 lg:w-64 shrink-0">
              <div className="w-11 h-11 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                <Car size={22} />
              </div>
              <div>
                <h2 className="text-xl font-bold text-gray-900">VIRA Free</h2>
                <p className="mt-1"><span className="text-3xl font-bold text-gray-900">0 €</span></p>
              </div>
            </div>
            <div className="grid sm:grid-cols-2 gap-x-8 gap-y-3 flex-1">
              {FREE_FEATURES.map(({ icon, text }) => (
                <div key={text} className="flex items-center gap-2.5 text-sm text-gray-700">
                  <span className="text-emerald-700 shrink-0">{icon}</span>
                  <span>{text}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <PaidCard
            title="KaufCheck"
            price="5,99 €"
            intro="Entscheidungshilfe vor dem Fahrzeugkauf"
            features={KAUFCHECK_FEATURES}
            icon={<ShoppingCart size={22} />}
            accent="text-blue-600"
            iconClass="bg-blue-50 text-blue-600"
            buttonClass="bg-blue-600 hover:bg-blue-700 text-white"
            cta="KaufCheck starten"
            onStart={() => startCheck('/kaufcheck')}
          />
          <PaidCard
            title="VerkaufsCheck"
            price="8,99 €"
            intro="Orientierung und Vorbereitung für deinen Verkauf"
            features={VERKAUFSCHECK_FEATURES}
            icon={<TrendingUp size={22} />}
            accent="text-emerald-600"
            iconClass="bg-emerald-50 text-emerald-600"
            buttonClass="bg-emerald-600 hover:bg-emerald-700 text-white"
            cta="VerkaufsCheck starten"
            onStart={() => startCheck('/verkaufscheck')}
          />
        </section>

        <section className="mt-6 rounded-3xl border border-orange-200 bg-white p-6 sm:p-7 shadow-[0_18px_48px_-30px_rgba(249,115,22,0.35)]">
          <div className="flex flex-col lg:flex-row lg:items-start gap-6">
            <div className="lg:w-72 shrink-0">
              <div className="w-11 h-11 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center mb-5">
                <Sparkles size={22} />
              </div>
              <h2 className="text-xl font-bold tracking-[-0.02em] text-gray-900">VIRA Plus</h2>
              <p className="text-sm text-gray-500 mt-1 mb-5">Für alle, die regelmäßig Autos prüfen</p>
              <div>
                <span className="text-4xl font-bold tracking-[-0.04em] text-gray-900">16,99 €</span>
                <span className="ml-2 text-sm text-gray-500">pro Monat</span>
              </div>
            </div>

            <div className="flex-1 min-w-0">
              <ul className="grid sm:grid-cols-2 gap-x-8 gap-y-2.5 mb-5">
                {PLUS_FEATURES.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5 text-sm leading-relaxed text-gray-600">
                    <Check size={16} className="text-orange-500 shrink-0 mt-0.5" />
                    <span>{feature}</span>
                  </li>
                ))}
              </ul>

              {/* Abo-Transparenz: fachlich korrekt formuliert. Stripe kuendigt zum
                  Periodenende, nicht sofort — deshalb steht hier kein "jederzeit
                  sofort beendbar". */}
              <p className="text-xs text-gray-500 leading-relaxed mb-5">
                16,99 € pro Monat. Verlängert sich automatisch um einen Monat, bis du kündigst.
                Nach der Kündigung läuft Plus bis zum Ende des bezahlten Monats weiter.
                Keine Mindestlaufzeit, keine Jahresbindung. Monatliche Kontingente verfallen
                zum Monatsende — <strong>einzeln gekaufte Checks behältst du dauerhaft.</strong>
              </p>

              <button
                type="button"
                onClick={startPlus}
                className="w-full sm:w-auto rounded-xl px-6 py-3 text-sm font-semibold text-white transition-all hover:opacity-90"
                style={{ background: 'linear-gradient(180deg, #fb923c 0%, #f97316 100%)', boxShadow: '0 10px 24px -8px rgba(249,115,22,0.5)' }}
              >
                VIRA Plus starten
              </button>

              {plusCheckout && <PlusCheckout onAbbrechen={() => setPlusCheckout(false)} />}
            </div>
          </div>
        </section>

        <p className="text-center text-xs text-gray-400 mt-7">
          Alle Preise inkl. MwSt.
        </p>
      </div>
    </div>
  )
}
