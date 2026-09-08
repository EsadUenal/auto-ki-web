import {
  AlertTriangle, Check, Cog, Fuel, Gauge, PiggyBank, ShieldCheck, Wrench,
} from 'lucide-react'
import StageIdentitaet from './StageIdentitaet'
import StageUntergrund, { StageNaht } from './StageUntergrund'
import { formatEuro, formatProKm } from '../autokosten/logic'
import { useSequenz, useZaehler } from './motion'
import {
  SHOWCASE_BAUREIHE, SHOWCASE_FAHRZEUG, SHOWCASE_KOSTEN, SHOWCASE_KOSTEN_TEILE,
  SHOWCASE_SCHWACHSTELLEN, SHOWCASE_TECHNIK, SHOWCASE_WEITERE,
} from './showcase'

/**
 * Die vier Bühnenbilder der Scroll-Story.
 *
 * Jedes Panel zeigt DASSELBE Fahrzeug in einem anderen Werkzeug — das ist die
 * Aussage: die Werkzeuge greifen ineinander. Deshalb sind die Panels bewusst
 * keine abstrakten Illustrationen, sondern echte Produktoberflächen mit echten
 * Daten (siehe showcase.ts).
 *
 * Jedes Panel bekommt `aktiv`: erst wenn sein Schritt an der Reihe ist, laufen
 * Zähler und Sequenzen. Sonst würden alle vier gleichzeitig im Hintergrund
 * animieren, was niemand sieht und nur Rechenzeit kostet.
 */

interface PanelProps {
  aktiv: boolean
  reduziert: boolean
}

const k = SHOWCASE_FAHRZEUG

// ── 1. FINDEN ────────────────────────────────────────────────────────────────

export function PanelFinden({ aktiv, reduziert }: PanelProps) {
  const fit = useZaehler(k.user_fit, aktiv, reduziert, 900)
  const frei = useSequenz(SHOWCASE_WEITERE.length + 1, aktiv, reduziert, 180)

  return (
    <div className="overflow-hidden rounded-3xl border border-[#e6e1da] bg-gradient-to-r from-[#fdfbf8] via-white to-white shadow-[0_30px_60px_-34px_rgba(40,25,10,0.4)]">
      <div className="flex items-center gap-2 border-b border-[#efe9df] bg-[#faf8f5] px-4 py-2.5">
        <span className="text-[11px] font-semibold tracking-wide text-gray-400">
          Vira · AutoFinder · 5 Treffer
        </span>
      </div>

      <div className="relative">
        <StageUntergrund wasserzeichen={k.generation} />
        <StageNaht />

        <div className="relative sm:flex sm:items-stretch">
        <StageIdentitaet k={k} rank={1} />
        <div className="min-w-0 flex-1 p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate text-lg font-bold tracking-tight text-gray-900">
                {k.marke} {k.modell}
              </h3>
              <p className="mt-0.5 text-xs font-medium text-gray-400">
                {k.generation} · {k.motor} · {k.leistung_ps} PS
              </p>
            </div>
            <div className="shrink-0 rounded-2xl border border-orange-200/80 bg-orange-50 px-3 py-1.5 text-center">
              <span className="block text-xl font-extrabold leading-none tabular-nums text-orange-600">
                {Math.round(fit)}%
              </span>
              <span className="mt-0.5 block text-[9px] font-bold uppercase tracking-wider text-orange-400">
                Passung
              </span>
            </div>
          </div>

          <ul className="mt-4 space-y-2">
            {k.why_fits.slice(0, 2).map((w, i) => (
              <li
                key={w}
                className="flex items-start gap-2 text-sm leading-relaxed text-gray-600 transition-all duration-500 ease-out"
                style={reduziert ? undefined : {
                  opacity: frei > i ? 1 : 0,
                  transform: frei > i ? 'none' : 'translateY(8px)',
                }}
              >
                <Check size={15} aria-hidden="true" className="mt-0.5 shrink-0 text-orange-500" />
                {w}
              </li>
            ))}
          </ul>
        </div>
        </div>
      </div>

      <div className="px-5 py-3.5" style={{ borderTop: '1px solid rgba(40,25,10,0.06)' }}>
        <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-gray-400">Weitere Treffer</p>
        <ul className="mt-2.5 space-y-1.5">
          {SHOWCASE_WEITERE.map((w, i) => (
            <li
              key={w.marke}
              className="flex items-center justify-between gap-3 text-xs transition-all duration-500 ease-out"
              style={reduziert ? undefined : {
                opacity: frei > i ? 1 : 0,
                transform: frei > i ? 'none' : 'translateX(14px)',
              }}
            >
              <span className="truncate font-semibold text-gray-700">
                {w.marke} {w.modell}
                <span className="ml-1.5 font-normal text-gray-400">{w.motor}</span>
              </span>
              <span className="shrink-0 font-bold tabular-nums text-gray-400">{w.fit}%</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

// ── 2. VERSTEHEN ─────────────────────────────────────────────────────────────

export function PanelVerstehen({ aktiv, reduziert }: PanelProps) {
  const monat = useZaehler(SHOWCASE_KOSTEN.gesamtMonat, aktiv, reduziert, 1100)
  const jahr = useZaehler(SHOWCASE_KOSTEN.gesamtJahr, aktiv, reduziert, 1100)
  const proKm = useZaehler(SHOWCASE_KOSTEN.kostenProKm, aktiv, reduziert, 1100)
  const groesster = SHOWCASE_KOSTEN_TEILE[0].monat

  return (
    <div className="overflow-hidden rounded-3xl border border-[#e6e1da] bg-white shadow-[0_30px_60px_-34px_rgba(40,25,10,0.4)]">
      <div className="flex items-center gap-2 border-b border-[#efe9df] bg-[#faf8f5] px-4 py-2.5">
        <span className="text-[11px] font-semibold tracking-wide text-gray-400">
          Vira · Autokosten · {k.marke} {k.modell} {k.motor}
        </span>
      </div>

      <div className="p-5 sm:p-6">
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: 'pro Monat', wert: formatEuro(monat), gross: true },
            { label: 'pro Jahr', wert: formatEuro(jahr), gross: false },
            { label: 'pro km', wert: formatProKm(proKm), gross: false },
          ].map((z) => (
            <div key={z.label} className="rounded-2xl border border-[#efe9df] bg-[#faf8f5] px-3 py-3.5 text-center">
              <p className={`font-bold tabular-nums tracking-[-0.03em] text-gray-900 ${z.gross ? 'text-xl sm:text-2xl' : 'text-base sm:text-lg'}`}>
                {z.wert}
              </p>
              <p className="mt-1 text-[10px] font-bold uppercase tracking-[0.12em] text-gray-400">{z.label}</p>
            </div>
          ))}
        </div>

        <p className="mt-5 text-[10px] font-bold uppercase tracking-[0.14em] text-gray-400">
          Woraus sich das zusammensetzt
        </p>
        <ul className="mt-3 space-y-2.5">
          {SHOWCASE_KOSTEN_TEILE.map((t, i) => (
            <li key={t.label}>
              <div className="flex items-baseline justify-between gap-3 text-sm">
                <span className="font-medium text-gray-600">{t.label}</span>
                <span className="font-bold tabular-nums text-gray-900">{formatEuro(t.monat)}</span>
              </div>
              <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[#f1ece4]">
                <div
                  className="h-full rounded-full bg-orange-400 transition-all duration-1000 ease-out"
                  style={{
                    width: aktiv || reduziert ? `${(t.monat / groesster) * 100}%` : '0%',
                    transitionDelay: reduziert ? undefined : `${i * 90}ms`,
                  }}
                />
              </div>
            </li>
          ))}
        </ul>

        <p className="mt-5 border-t border-[#efe9df] pt-3.5 text-[11px] leading-relaxed text-gray-400">
          Beispielrechnung: 15.000 km/Jahr, 6,5 l/100 km (Realverbrauch), 1,75 €/l.
          Versicherung, Steuer, Wartung, Reifen und Wertverlust sind Annahmen. Im
          Rechner gibst du deine eigenen Werte ein.
        </p>
      </div>
    </div>
  )
}

// ── 3. PRÜFEN ────────────────────────────────────────────────────────────────

const PRUEF_BLOECKE = [
  {
    icon: <Cog size={15} aria-hidden="true" />,
    titel: 'Motor',
    inhalt: `${SHOWCASE_TECHNIK.hubraumCcm} cm³ · ${SHOWCASE_TECHNIK.zylinder} Zylinder · `
      + `${SHOWCASE_TECHNIK.leistungPs} PS · ${SHOWCASE_TECHNIK.drehmomentNm} Nm`,
  },
  {
    icon: <AlertTriangle size={15} aria-hidden="true" />,
    titel: 'Bekannte Schwachstellen der Baureihe',
    inhalt: SHOWCASE_SCHWACHSTELLEN
      .map((s) => `${s.bauteil} (${s.baujahre}, ${s.schweregrad})`)
      .join(' · '),
  },
  {
    icon: <Wrench size={15} aria-hidden="true" />,
    titel: 'Wartung',
    inhalt: `Ölwechsel alle ${SHOWCASE_BAUREIHE.wartungOelKm.toLocaleString('de-DE')} km · `
      + `HU ${SHOWCASE_BAUREIHE.huIntervall.replace(/^Alle/, 'alle')}`,
  },
  {
    icon: <ShieldCheck size={15} aria-hidden="true" />,
    titel: 'Datenqualität',
    inhalt: `Baureihe vollständig erfasst · Euro NCAP ${SHOWCASE_BAUREIHE.euroNcapSterne}/5 `
      + `(${SHOWCASE_BAUREIHE.euroNcapJahr}) · Verbrauch WLTP und real hinterlegt`,
  },
  {
    icon: <Check size={15} aria-hidden="true" />,
    titel: 'Kaufrelevanter Hinweis',
    inhalt: 'Software-Stand des iDrive prüfen lassen und beim Fahren auf Knarzen der '
      + 'Vorderachse achten. Beides betrifft frühe Baujahre und ist vor dem Kauf feststellbar.',
  },
]

export function PanelPruefen({ aktiv, reduziert }: PanelProps) {
  const frei = useSequenz(PRUEF_BLOECKE.length, aktiv, reduziert, 300)

  return (
    <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#16151a] shadow-[0_40px_80px_-40px_rgba(0,0,0,0.9)]">
      <div className="flex items-center justify-between gap-2 border-b border-white/10 px-4 py-2.5">
        <span className="text-[11px] font-semibold tracking-wide text-white/40">
          Vira · KaufCheck · {k.marke} {k.modell} {k.motor}
        </span>
        <span className="rounded-full bg-orange-500/15 px-2 py-0.5 text-[10px] font-bold text-orange-300">
          5,99 €
        </span>
      </div>

      <ul className="divide-y divide-white/[0.07]">
        {PRUEF_BLOECKE.map((b, i) => (
          <li
            key={b.titel}
            className="flex items-start gap-3.5 px-5 py-4 transition-all duration-600 ease-out"
            style={reduziert ? undefined : {
              opacity: frei > i ? 1 : 0,
              transform: frei > i ? 'none' : 'translateX(-16px)',
            }}
          >
            <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.06] text-orange-400">
              {b.icon}
            </span>
            <div className="min-w-0">
              <p className="text-[13px] font-bold tracking-tight text-white">{b.titel}</p>
              <p className="mt-1 text-[13px] leading-relaxed text-white/55">{b.inhalt}</p>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}

// ── 4. ENTSCHEIDEN ───────────────────────────────────────────────────────────

export function PanelEntscheiden({ aktiv, reduziert }: PanelProps) {
  const fit = useZaehler(k.user_fit, aktiv, reduziert, 900)
  const monat = useZaehler(SHOWCASE_KOSTEN.gesamtMonat, aktiv, reduziert, 900)
  const frei = useSequenz(4, aktiv, reduziert, 200)

  const zeilen = [
    { icon: <Gauge size={15} aria-hidden="true" />, label: 'Passung', wert: `${Math.round(fit)} %`, quelle: 'AutoFinder' },
    { icon: <PiggyBank size={15} aria-hidden="true" />, label: 'Laufende Kosten', wert: `${formatEuro(monat)} / Monat`, quelle: 'Autokosten' },
    { icon: <AlertTriangle size={15} aria-hidden="true" />, label: 'Bekannte Schwachstellen', wert: `${SHOWCASE_SCHWACHSTELLEN.length} · beide gering`, quelle: 'KaufCheck' },
    { icon: <Fuel size={15} aria-hidden="true" />, label: 'Datenlage', wert: 'Baureihe vollständig erfasst', quelle: 'KaufCheck' },
  ]

  return (
    <div className="overflow-hidden rounded-3xl border border-white/10 bg-[#16151a] shadow-[0_40px_80px_-40px_rgba(0,0,0,0.9)]">
      <div className="relative border-b border-white/10">
        <StageUntergrund wasserzeichen={k.generation} dunkel />
        <div className="relative px-5 py-4">
          <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-orange-400">Dein Ergebnis</p>
          <p className="mt-1 text-lg font-bold tracking-tight text-white">
            {k.marke} {k.modell} <span className="text-white/40">{k.generation} · {k.motor}</span>
          </p>
        </div>
      </div>

      <ul className="divide-y divide-white/[0.07]">
        {zeilen.map((z, i) => (
          <li
            key={z.label}
            className="flex items-center gap-3.5 px-5 py-3.5 transition-all duration-500 ease-out"
            style={reduziert ? undefined : {
              opacity: frei > i ? 1 : 0,
              transform: frei > i ? 'none' : 'translateY(10px)',
            }}
          >
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/[0.06] text-orange-400">
              {z.icon}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-semibold text-white">{z.label}</p>
              <p className="text-[11px] text-white/35">aus {z.quelle}</p>
            </div>
            <span className="shrink-0 text-sm font-bold tabular-nums text-white">{z.wert}</span>
          </li>
        ))}
      </ul>

      <p className="border-t border-white/10 px-5 py-3.5 text-[11px] leading-relaxed text-white/40">
        Vira trifft die Entscheidung nicht für dich. Aber du triffst sie mit dem, was
        vorher niemand zusammengetragen hatte.
      </p>
    </div>
  )
}
