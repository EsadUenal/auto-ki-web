import { Check, Loader2, Search, ShoppingCart, Sparkles } from 'lucide-react'
import VehicleIdentityPanel from '../autofinder/VehicleIdentityPanel'
import { useReducedMotion, usePhasen, useZaehler } from './motion'
import { SHOWCASE_ANFORDERUNGEN, SHOWCASE_FAHRZEUG, SHOWCASE_WEITERE } from './showcase'

/**
 * Die Produktdemo im Hero.
 *
 * Läuft von selbst durch die Phasen, die eine echte AutoFinder-Suche durchläuft:
 * Anforderungen → Analyse → Treffer → Fokus auf den besten → Passung →
 * Preisorientierung → Weg zum KaufCheck. Das ist keine Zierde, sondern die
 * kürzeste ehrliche Erklärung dessen, was das Produkt tut.
 *
 * KEIN NETZWERK. Die Sequenz ist rein lokal und deterministisch; sie zeigt
 * dieselben Daten, die eine reale Suche geliefert hat (siehe showcase.ts). Ein
 * echter Aufruf hier würde bei jedem Seitenaufruf Provider-Kosten verursachen
 * und dem anonymen Besucher seine eine kostenlose Demo-Suche wegnehmen, bevor
 * er überhaupt geklickt hat.
 *
 * Bei reduzierter Bewegung steht die Demo still auf der letzten Phase — dem
 * fertigen Ergebnis. Sichtbar ist dann alles, nur nicht der Weg dorthin.
 */

const PHASEN = 6
const PHASE_ANALYSE = 1
const PHASE_TREFFER = 2
const PHASE_FOKUS = 3
const PHASE_PREIS = 4
const PHASE_CTA = 5

export default function HeroDemo() {
  const reduziert = useReducedMotion()
  const phase = usePhasen(PHASEN, reduziert, 1700)

  const k = SHOWCASE_FAHRZEUG
  const zeigeFit = phase >= PHASE_FOKUS
  const fit = useZaehler(k.user_fit, zeigeFit, reduziert, 800)

  const preisVon = (k.estimated_price_min ?? 0).toLocaleString('de-DE')
  const preisBis = (k.estimated_price_max ?? 0).toLocaleString('de-DE')

  return (
    <div
      className="relative rounded-3xl border border-[#e6e1da] bg-white shadow-[0_36px_70px_-32px_rgba(40,25,10,0.42)] overflow-hidden"
      aria-label="Produktvorschau: eine AutoFinder-Suche von der Eingabe bis zum Ergebnis"
      role="img"
    >
      {/* Fensterleiste */}
      <div className="flex items-center gap-2 border-b border-[#efe9df] bg-[#faf8f5] px-4 py-2.5">
        <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-[#e6ded2]" />
        <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-[#e6ded2]" />
        <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-[#e6ded2]" />
        <span className="ml-2 text-[11px] font-semibold tracking-wide text-gray-400">
          Vira · AutoFinder
        </span>
        <span className="ml-auto flex items-center gap-1.5 text-[11px] font-semibold text-gray-400">
          {phase < PHASE_TREFFER
            ? <><Loader2 size={11} aria-hidden="true" className={reduziert ? '' : 'animate-spin'} /> Analyse</>
            : <><Check size={11} aria-hidden="true" className="text-emerald-500" /> 5 Treffer</>}
        </span>
      </div>

      <div className="relative min-h-[430px] sm:min-h-[460px]">
        {/* ── Phase 0/1: Anforderungen + Analyse ─────────────────────────── */}
        <div
          className="absolute inset-0 p-5 transition-all duration-700 ease-out"
          style={{
            opacity: phase < PHASE_TREFFER ? 1 : 0,
            transform: phase < PHASE_TREFFER ? 'none' : 'translateY(-14px)',
            pointerEvents: phase < PHASE_TREFFER ? 'auto' : 'none',
          }}
          aria-hidden={phase >= PHASE_TREFFER}
        >
          <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-gray-400">
            <Search size={12} aria-hidden="true" className="text-orange-500" />
            Deine Anforderungen
          </p>

          <dl className="mt-4 space-y-2.5">
            {SHOWCASE_ANFORDERUNGEN.map((a, i) => (
              <div
                key={a.label}
                className="flex items-center justify-between gap-4 rounded-xl border border-[#efe9df] bg-[#faf8f5] px-3.5 py-2.5 transition-all duration-500 ease-out"
                style={reduziert ? undefined : {
                  opacity: phase >= PHASE_ANALYSE ? 1 : 0,
                  transform: phase >= PHASE_ANALYSE ? 'none' : 'translateX(-12px)',
                  transitionDelay: `${i * 90}ms`,
                }}
              >
                <dt className="text-xs font-semibold text-gray-500">{a.label}</dt>
                <dd className="text-sm font-bold tabular-nums text-gray-900">{a.wert}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-5 flex items-center gap-2.5 text-sm font-semibold text-gray-500">
            <Loader2 size={15} aria-hidden="true" className={reduziert ? 'text-orange-500' : 'animate-spin text-orange-500'} />
            Vergleicht Baureihen, Motoren und Generationen …
          </div>
        </div>

        {/* ── Phase 2+: Ergebnis ─────────────────────────────────────────── */}
        <div
          className="absolute inset-0 transition-all duration-700 ease-out"
          style={{
            opacity: phase >= PHASE_TREFFER ? 1 : 0,
            transform: phase >= PHASE_TREFFER ? 'none' : 'translateY(16px)',
            pointerEvents: phase >= PHASE_TREFFER ? 'auto' : 'none',
          }}
          aria-hidden={phase < PHASE_TREFFER}
        >
          <div className="sm:flex sm:items-stretch">
            <div
              className="transition-all duration-700 ease-out"
              style={reduziert ? undefined : {
                opacity: phase >= PHASE_FOKUS ? 1 : 0.45,
                filter: phase >= PHASE_FOKUS ? 'none' : 'saturate(0.4)',
              }}
            >
              <VehicleIdentityPanel k={k} rank={1} />
            </div>

            <div className="min-w-0 flex-1 p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="truncate text-lg font-bold tracking-tight text-gray-900">
                    {k.marke} {k.modell}
                  </h3>
                  <p className="mt-0.5 text-xs font-medium text-gray-400">
                    {k.generation} · {k.motor} · Baujahre {k.baujahr_von} →
                  </p>
                </div>

                {/* Passung zählt sichtbar hoch */}
                <div
                  className="shrink-0 rounded-2xl border border-orange-200/80 bg-orange-50 px-3 py-1.5 text-center transition-all duration-500 ease-out"
                  style={reduziert ? undefined : {
                    opacity: zeigeFit ? 1 : 0,
                    transform: zeigeFit ? 'scale(1)' : 'scale(0.82)',
                  }}
                >
                  <span className="block text-xl font-extrabold leading-none tabular-nums text-orange-600">
                    {Math.round(fit)}%
                  </span>
                  <span className="mt-0.5 block text-[9px] font-bold uppercase tracking-wider text-orange-400">
                    Passung
                  </span>
                </div>
              </div>

              <p
                className="mt-3.5 text-sm leading-relaxed text-gray-600 transition-all duration-500 ease-out"
                style={reduziert ? undefined : {
                  opacity: phase >= PHASE_FOKUS ? 1 : 0,
                  transform: phase >= PHASE_FOKUS ? 'none' : 'translateY(8px)',
                }}
              >
                {k.why_fits[1]}
              </p>

              {/* Preisorientierung */}
              <div
                className="mt-4 rounded-xl border border-[#efe9df] bg-[#faf8f5] px-3.5 py-3 transition-all duration-500 ease-out"
                style={reduziert ? undefined : {
                  opacity: phase >= PHASE_PREIS ? 1 : 0,
                  transform: phase >= PHASE_PREIS ? 'none' : 'translateY(10px)',
                }}
              >
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-gray-400">
                  Preisorientierung
                </p>
                <p className="mt-1 text-sm font-bold tabular-nums text-gray-900">
                  {preisVon} – {preisBis} €
                </p>
                <p className="mt-0.5 text-[11px] text-gray-500">Nahe am Budget · Datenlage hoch</p>
              </div>

              {/* Weg zum KaufCheck */}
              <div
                className="mt-4 flex items-center gap-2 rounded-xl bg-orange-500 px-3.5 py-2.5 text-sm font-semibold text-white transition-all duration-500 ease-out"
                style={reduziert ? undefined : {
                  opacity: phase >= PHASE_CTA ? 1 : 0,
                  transform: phase >= PHASE_CTA ? 'none' : 'translateY(10px)',
                }}
              >
                <ShoppingCart size={15} aria-hidden="true" />
                Mit KaufCheck prüfen
                <Sparkles size={13} aria-hidden="true" className="ml-auto opacity-70" />
              </div>
            </div>
          </div>

          {/* Die übrigen Treffer fahren gestaffelt ein */}
          <div className="border-t border-[#efe9df] px-5 py-3.5">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-gray-400">
              Weitere Treffer
            </p>
            <ul className="mt-2.5 space-y-1.5">
              {SHOWCASE_WEITERE.map((w, i) => (
                <li
                  key={w.marke}
                  className="flex items-center justify-between gap-3 text-xs transition-all duration-500 ease-out"
                  style={reduziert ? undefined : {
                    opacity: phase >= PHASE_TREFFER ? 1 : 0,
                    transform: phase >= PHASE_TREFFER ? 'none' : 'translateY(10px)',
                    transitionDelay: `${120 + i * 110}ms`,
                  }}
                >
                  <span className="truncate font-semibold text-gray-700">
                    {w.marke} {w.modell}
                    <span className="ml-1.5 font-normal text-gray-400">{w.motor} · {w.ps} PS</span>
                  </span>
                  <span className="shrink-0 tabular-nums font-bold text-gray-400">{w.fit}%</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>

      {/* Fortschrittsbalken der Demo — macht sichtbar, dass sie läuft */}
      {!reduziert && (
        <div aria-hidden="true" className="h-0.5 w-full bg-[#f1ece4]">
          <div
            className="h-full bg-orange-400 transition-all duration-700 ease-linear"
            style={{ width: `${((phase + 1) / PHASEN) * 100}%` }}
          />
        </div>
      )}
    </div>
  )
}
