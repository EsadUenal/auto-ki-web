import { Link } from 'react-router-dom'
import { Calculator, Check } from 'lucide-react'
import { useInView, useReducedMotion, useZaehler } from './motion'
import { PLUS_KONTINGENTE } from './showcase'
import { PRICING_ROUTE } from './links'
import { FOKUS_RING } from './styles'

/**
 * Vira Plus als eigenständige, dunkle Fläche.
 *
 * Der Tarif war in der ersten Fassung eine Liste neben einer Liste und wirkte
 * dadurch wie eine Fussnote der Einzelkäufe. Plus ist aber das einzige
 * wiederkehrende Angebot — es braucht eine eigene Bühne.
 *
 * WICHTIG: Die Ringe zeigen den ENTHALTENEN UMFANG, keine Nutzung. Sie laufen
 * einmal auf voll und bleiben dort. Ein teilgefüllter Ring würde einen
 * Verbrauchsstand suggerieren, den es hier gar nicht geben kann — niemand ist
 * auf dieser Seite eingeloggt. Erfundene Nutzungsdaten wären genau die Art
 * Schaufensterlüge, die das Produkt sonst vermeidet.
 */

const RADIUS = 26
const UMFANG = 2 * Math.PI * RADIUS

function Ring({ anzahl, label, einheit, aktiv, reduziert, verzoegerung }: {
  anzahl: number; label: string; einheit: string
  aktiv: boolean; reduziert: boolean; verzoegerung: number
}) {
  const wert = useZaehler(anzahl, aktiv, reduziert, 1000)

  return (
    <div className="flex flex-col items-center text-center">
      <div className="relative h-[68px] w-[68px]">
        <svg viewBox="0 0 68 68" className="h-full w-full -rotate-90" aria-hidden="true">
          <circle cx="34" cy="34" r={RADIUS} fill="none" strokeWidth="4"
            stroke="rgba(255,255,255,0.10)" />
          <circle
            cx="34" cy="34" r={RADIUS} fill="none" strokeWidth="4" strokeLinecap="round"
            stroke="#f97316"
            strokeDasharray={UMFANG}
            strokeDashoffset={aktiv || reduziert ? 0 : UMFANG}
            style={{
              transition: reduziert ? undefined : 'stroke-dashoffset 1100ms cubic-bezier(0.22,1,0.36,1)',
              transitionDelay: reduziert ? undefined : `${verzoegerung}ms`,
            }}
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-lg font-extrabold tabular-nums text-white">
          {Math.round(wert)}
        </span>
      </div>
      <p className="mt-2.5 text-[13px] font-bold leading-tight text-white">{label}</p>
      <p className="text-[11px] text-white/40">{einheit}</p>
    </div>
  )
}

export default function PlusStage() {
  const reduziert = useReducedMotion()
  const [ref, sichtbar] = useInView<HTMLDivElement>({ schwelle: 0.25 })

  return (
    <section
      ref={ref}
      aria-labelledby="plus-titel"
      data-plus-stage
      className="relative overflow-hidden bg-[#111014]"
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-32 top-0 h-[34rem] w-[34rem] rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(249,115,22,0.18) 0%, transparent 70%)' }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.35]"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(255,255,255,0.035) 1px, transparent 1px),'
            + 'linear-gradient(to bottom, rgba(255,255,255,0.035) 1px, transparent 1px)',
          backgroundSize: '52px 52px',
        }}
      />

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 py-20 sm:py-24">
        <div className="grid gap-12 lg:grid-cols-[1fr_1.05fr] lg:items-center lg:gap-16">
          <div
            className="transition-all duration-700 ease-out"
            style={reduziert ? undefined : {
              opacity: sichtbar ? 1 : 0,
              transform: sichtbar ? 'none' : 'translateY(24px)',
            }}
          >
            <p className="text-[11px] font-bold uppercase tracking-[0.2em] text-orange-400">
              Für regelmäßige Nutzung
            </p>
            <h2 id="plus-titel" className="mt-3 text-4xl sm:text-5xl font-bold tracking-[-0.04em] text-white">
              Vira Plus
            </h2>
            <p className="mt-5 max-w-md text-[15px] leading-relaxed text-white/55">
              Wer mehrere Fahrzeuge vergleicht, bevor er sich entscheidet, prüft nicht
              einmal — sondern fünfmal. Plus macht daraus einen festen monatlichen
              Werkzeugkasten statt einer Reihe von Einzelkäufen.
            </p>

            <div className="mt-8 flex flex-wrap items-end gap-2.5">
              <span className="text-5xl font-bold tracking-[-0.045em] text-white">16,99 €</span>
              <span className="pb-1.5 text-sm font-medium text-white/45">pro Monat</span>
            </div>

            <p className="mt-4 max-w-md text-[13px] leading-relaxed text-white/40">
              Monatlich kündbar, keine Mindestlaufzeit. Die monatlichen Kontingente sammeln
              sich nicht an — nicht genutzte Plus-Checks verfallen zum Monatsende. Einzeln
              gekaufte Checks behältst du dauerhaft.
            </p>

            <Link
              to={PRICING_ROUTE}
              className={`mt-8 inline-flex items-center justify-center rounded-xl bg-orange-500 px-7 py-3.5 text-[15px] font-semibold text-white shadow-[0_16px_36px_-14px_rgba(249,115,22,0.8)] transition-colors hover:bg-orange-400 ${FOKUS_RING}`}
            >
              Vira Plus starten
            </Link>
          </div>

          {/* Werkzeugkasten */}
          <div
            className="rounded-3xl border border-white/10 bg-white/[0.03] p-7 sm:p-9 backdrop-blur-sm transition-all duration-700 ease-out"
            style={reduziert ? undefined : {
              opacity: sichtbar ? 1 : 0,
              transform: sichtbar ? 'none' : 'translateY(30px)',
              transitionDelay: '140ms',
            }}
          >
            <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-white/35">
              Jeden Monat enthalten
            </p>

            <div className="mt-7 grid grid-cols-2 gap-x-4 gap-y-8 sm:grid-cols-4">
              {PLUS_KONTINGENTE.map((p, i) => (
                <Ring
                  key={p.label}
                  anzahl={p.anzahl}
                  label={p.label}
                  einheit={p.einheit}
                  aktiv={sichtbar}
                  reduziert={reduziert}
                  verzoegerung={i * 130}
                />
              ))}
            </div>

            <div className="mt-8 flex items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3.5">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-orange-500/15 text-orange-400">
                <Calculator size={17} aria-hidden="true" />
              </span>
              <p className="text-sm font-semibold text-white">
                Autokosten <span className="font-normal text-white/45">unbegrenzt</span>
              </p>
              <Check size={16} aria-hidden="true" className="ml-auto text-orange-400" />
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
