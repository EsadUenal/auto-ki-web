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
  TrendingUp,
  User,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { RETURN_TO_KEY } from './autofinder/logic'

const FREE_FEATURES = [
  { icon: <Search size={16} />, text: 'AutoFinder' },
  { icon: <Calculator size={16} />, text: 'Autokosten' },
  { icon: <MessageSquare size={16} />, text: 'KI-Chat im kostenlosen Zugang' },
  { icon: <User size={16} />, text: 'VIRA Account und gespeicherte Verläufe' },
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
            Nur zahlen, wenn du <span className="text-gray-400">einen Check brauchst.</span>
          </h1>
          <p className="text-gray-500 text-base mt-4 leading-relaxed">
            AutoFinder, Autokosten und der Basiszugang bleiben kostenlos. KaufCheck und
            VerkaufsCheck bezahlst du jeweils nur bei konkretem Bedarf.
          </p>
        </header>

        <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 mb-9 text-xs font-medium text-gray-600">
          {['Einmalige Zahlung pro Check', 'Keine automatische Verlängerung', 'Kein verstecktes Abo'].map((item) => (
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
            price="9,99 €"
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
            price="7,99 €"
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

        <p className="text-center text-xs text-gray-400 mt-7">
          Preise inkl. MwSt. · Der KI-Chat ist im kostenlosen Zugang enthalten.
        </p>
      </div>
    </div>
  )
}
