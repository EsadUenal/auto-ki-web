import { Check, Loader2, Search, ShoppingCart, Sparkles } from 'lucide-react'
import StageIdentitaet from './StageIdentitaet'
import StageUntergrund, { StageNaht } from './StageUntergrund'
import { useReducedMotion, usePhasen, useSequenz, useZaehler } from './motion'
import { SHOWCASE_ANFORDERUNGEN, SHOWCASE_FAHRZEUG, SHOWCASE_WEITERE } from './showcase'

/**
 * Die Produktdemo im Hero.
 *
 * Läuft von selbst durch die Phasen, die eine echte AutoFinder-Suche durchläuft:
 * Anforderungen, Analyse, Treffer, Fokus auf den besten, Passung,
 * Preisorientierung, Weg zum KaufCheck. Das ist keine Zierde, sondern die
 * kürzeste ehrliche Erklärung dessen, was das Produkt tut.
 *
 * KEIN NETZWERK. Die Sequenz ist rein lokal und deterministisch. Sie zeigt
 * dieselben Daten, die eine reale Suche geliefert hat (siehe showcase.ts). Ein
 * echter Aufruf hier würde bei jedem Seitenaufruf Provider-Kosten verursachen
 * und dem anonymen Besucher seine eine kostenlose Demo-Suche wegnehmen, bevor
 * er überhaupt geklickt hat.
 *
 * WARUM EIN GRID-STAPEL UND KEINE FESTE HÖHE
 * ------------------------------------------
 * Die beiden Phasen liegen übereinander, damit sie ineinander überblenden
 * können. Zuerst geschah das über `position: absolute` in einem Container mit
 * fester Mindesthöhe. Das war ein Fehler: sobald der Ergebnis-Zustand höher
 * wurde als diese Zahl, schnitt die Karte ihn unten ab, und „Weitere Treffer"
 * war nur noch halb zu sehen. Ein Grid, in dem beide Kinder dieselbe Zelle
 * belegen, ist genauso gestapelt, nimmt aber automatisch die Höhe des
 * grösseren an. Es kann gar nicht mehr abschneiden.
 *
 * EINE OBERFLÄCHE, ZWEI BEREICHE
 * ------------------------------
 * Identität links und Analyse rechts teilen sich Untergrund, Raster und
 * Wasserzeichen. Vorher brachte die Identität ihren eigenen Hintergrund, ihr
 * eigenes Raster und eine harte Trennkante mit; das las sich als Bild, das in
 * eine weisse Karte geklebt wurde. Jetzt liegt der Untergrund auf der Bühne,
 * das Wasserzeichen läuft über die Naht hinweg, und die Naht selbst ist ein
 * Verlauf statt einer Linie.
 *
 * Bei reduzierter Bewegung steht die Demo still auf der letzten Phase, dem
 * fertigen Ergebnis. Sichtbar ist dann alles, nur nicht der Weg dorthin.
 */

const PHASEN = 6
const PHASE_TREFFER = 2
const PHASE_FOKUS = 3
const PHASE_PREIS = 4
const PHASE_CTA = 5

export default function HeroDemo() {
  const reduziert = useReducedMotion()
  const phase = usePhasen(PHASEN, reduziert, 1700)

  const k = SHOWCASE_FAHRZEUG
  const zeigeFit = phase >= PHASE_FOKUS
  // Die Anforderungszeilen laufen ab dem ERSTEN Takt gestaffelt ein, nicht erst
  // im zweiten. Sonst steht die Karte zu Beginn jedes Durchlaufs fast leer da,
  // und das ist der erste Eindruck der ganzen Seite.
  const zeilenFrei = useSequenz(SHOWCASE_ANFORDERUNGEN.length, phase < PHASE_TREFFER, reduziert, 110)
  const fit = useZaehler(k.user_fit, zeigeFit, reduziert, 800)

  const preisVon = (k.estimated_price_min ?? 0).toLocaleString('de-DE')
  const preisBis = (k.estimated_price_max ?? 0).toLocaleString('de-DE')

  return (
    <div
      className="relative overflow-hidden rounded-3xl border border-[#e6e1da] bg-gradient-to-r from-[#fdfbf8] via-white to-white shadow-[0_36px_70px_-32px_rgba(40,25,10,0.42)]"
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

      {/* Beide Phasen in DERSELBEN Gitterzelle: gestapelt, aber ohne feste Höhe. */}
      <div className="grid">
        {/* ── Phase 0/1: Anforderungen + Analyse ─────────────────────────── */}
        <div
          className="col-start-1 row-start-1 flex flex-col px-5 py-6 transition-all duration-700 ease-out"
          style={{
            opacity: phase < PHASE_TREFFER ? 1 : 0,
            transform: phase < PHASE_TREFFER ? 'none' : 'translateY(-14px)',
            pointerEvents: phase < PHASE_TREFFER ? 'auto' : 'none',
          }}
          aria-hidden={phase >= PHASE_TREFFER}
        >
          {/* Oben ausgerichtet statt zentriert: die Gitterzelle ist so hoch wie
              der spaetere Ergebnis-Zustand, und ein mittig schwebender Block
              liesse die Karte oben leer aussehen. So sitzt die Ueberschrift am
              Kartenkopf, wo sie in einer echten Oberflaeche auch saesse. */}
          <p className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-[0.16em] text-gray-400">
            <Search size={12} aria-hidden="true" className="text-orange-500" />
            Deine Anforderungen
          </p>

          <dl className="mt-4 space-y-2">
            {SHOWCASE_ANFORDERUNGEN.map((a, i) => (
              <div
                key={a.label}
                className="flex items-center justify-between gap-4 rounded-xl border border-[#efe9df] bg-[#faf8f5] px-3.5 py-2.5 transition-all duration-500 ease-out"
                style={reduziert ? undefined : {
                  opacity: zeilenFrei > i ? 1 : 0,
                  transform: zeilenFrei > i ? 'none' : 'translateX(-12px)',
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
          className="col-start-1 row-start-1 flex flex-col transition-all duration-700 ease-out"
          style={{
            opacity: phase >= PHASE_TREFFER ? 1 : 0,
            transform: phase >= PHASE_TREFFER ? 'none' : 'translateY(16px)',
            pointerEvents: phase >= PHASE_TREFFER ? 'auto' : 'none',
          }}
          aria-hidden={phase < PHASE_TREFFER}
        >
          <div className="relative">
            <StageUntergrund wasserzeichen={k.generation} />
            <StageNaht />

            <div className="relative sm:flex sm:items-stretch">
              <div
                className="transition-all duration-700 ease-out"
                style={reduziert ? undefined : {
                  opacity: phase >= PHASE_FOKUS ? 1 : 0.5,
                }}
              >
                <StageIdentitaet k={k} rank={1} />
              </div>

            <div className="min-w-0 flex-1 p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="text-lg font-bold leading-tight tracking-tight text-gray-900">
                    {k.marke} {k.modell}
                  </h3>
                  <p className="mt-1 text-xs font-medium leading-relaxed text-gray-400">
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

              <div className="mt-3 flex flex-wrap gap-1.5">
                <span className="inline-flex items-center rounded-full bg-[#f4f0ea] px-2.5 py-1 text-xs font-medium text-gray-600">
                  {k.leistung_ps} PS
                </span>
                <span className="inline-flex items-center rounded-full bg-[#f4f0ea] px-2.5 py-1 text-xs font-medium text-gray-600">
                  {k.kraftstoff}
                </span>
                <span className="inline-flex items-center rounded-full bg-[#f4f0ea] px-2.5 py-1 text-xs font-medium text-gray-600">
                  Automatik / Schaltgetriebe
                </span>
              </div>

              <p
                className="mt-3 text-sm leading-relaxed text-gray-600 transition-all duration-500 ease-out"
                style={reduziert ? undefined : {
                  // Bewusst schon ab dem Treffer-Takt, nicht erst mit der
                  // Passung: der Platz fuer Text, Preis und CTA bleibt ohnehin
                  // reserviert, damit die Karte nicht springt. Bliebe er zwei
                  // Takte lang komplett leer, saehe die Vorschau unfertig aus.
                  opacity: phase >= PHASE_TREFFER ? 1 : 0,
                  transform: phase >= PHASE_TREFFER ? 'none' : 'translateY(8px)',
                }}
              >
                {k.why_fits[1]}
              </p>

              {/* Preisorientierung */}
              <div
                className="mt-3.5 rounded-xl border border-[#efe9df] bg-[#faf8f5] px-3.5 py-2.5 transition-all duration-500 ease-out"
                style={reduziert ? undefined : {
                  opacity: phase >= PHASE_PREIS ? 1 : 0,
                  transform: phase >= PHASE_PREIS ? 'none' : 'translateY(10px)',
                }}
              >
                <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-gray-400">
                  Preisorientierung
                </p>
                <p className="mt-0.5 text-sm font-bold tabular-nums text-gray-900">
                  {preisVon}–{preisBis} €
                </p>
                <p className="mt-0.5 text-[11px] text-gray-500">Nahe am Budget · Datenlage hoch</p>
              </div>

              {/* Weg zum KaufCheck */}
              <div
                className="mt-3.5 flex items-center gap-2 rounded-xl bg-orange-500 px-3.5 py-2.5 text-sm font-semibold text-white transition-all duration-500 ease-out"
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
          </div>

          {/* Die übrigen Treffer: dieselbe Oberfläche, nur dezent abgesetzt.
              Kein eigener Kasten und keine kräftige Kante, sonst wirken sie wie
              ein angehängter Fusszeilenblock. */}
          <div
            className="px-5 py-3.5"
            style={{ borderTop: '1px solid rgba(40,25,10,0.06)' }}
          >
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-gray-400">
              Weitere Treffer
            </p>
            <ul className="mt-2 space-y-1.5">
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

      {/* Fortschrittsbalken der Demo: macht sichtbar, dass sie läuft */}
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
