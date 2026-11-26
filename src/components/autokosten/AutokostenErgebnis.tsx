import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  TrendingDown, Wallet, PiggyBank, CalendarClock, Lightbulb, SlidersHorizontal,
  GitCompareArrows, ArrowRight, Info, RotateCcw,
} from 'lucide-react'
import {
  baueInsights, berechne, budgetCheck, fehlendText, formatDelta, formatEuro, formatEuroKurz,
  formatMenge, formatProKm, formatProzent, starteVergleich, validate, vergleiche,
  type AutokostenErgebnis as Ergebnis, type AutokostenForm, type PostenKey,
} from './logic'

/**
 * Ergebnisteil des Autokosten-Rechners.
 *
 * Rechnet NICHTS selbst: jede Zahl kommt aus `logic.berechne()` — auch im
 * Was-wäre-wenn-Simulator und im A/B-Vergleich. Damit können Formular, Simulator
 * und Vergleich nie unterschiedliche Ergebnisse zeigen.
 *
 * Reihenfolge bewusst nach Erkenntniswert: Hero → Budget → 1/3/5 Jahre →
 * Aufschlüsselung → laufende vs. wirtschaftliche Kosten → Simulator → Vergleich → ENFAL-Wege.
 */

const cardCls = 'rounded-2xl border border-[#e6e1da] bg-white shadow-[0_16px_36px_-28px_rgba(40,25,10,0.22)]'

const POSTEN_FARBE: Record<PostenKey, string> = {
  energie: 'bg-orange-500',
  wertverlust: 'bg-gray-800',
  versicherung: 'bg-amber-400',
  wartung: 'bg-orange-300',
  steuer: 'bg-gray-400',
  reifen: 'bg-amber-600',
  garage: 'bg-gray-300',
}

function Abschnitt({ icon, titel, hinweis, children }: {
  icon: React.ReactNode; titel: string; hinweis?: string; children: React.ReactNode
}) {
  return (
    <section className={`${cardCls} p-5 sm:p-6`}>
      <div className="flex items-center gap-2 mb-1">
        <span className="text-gray-400">{icon}</span>
        <h2 className="text-[11px] font-bold tracking-[0.2em] uppercase text-gray-500">{titel}</h2>
      </div>
      {hinweis && <p className="text-xs text-gray-400 mb-3">{hinweis}</p>}
      <div className={hinweis ? '' : 'mt-3'}>{children}</div>
    </section>
  )
}

// ── Hero ────────────────────────────────────────────────────────────────────

function Hero({ e }: { e: Ergebnis }) {
  return (
    <div className="grid sm:grid-cols-3 gap-3">
      <div className="rounded-2xl bg-gray-900 text-white p-4 sm:p-5 shadow-[0_16px_36px_-24px_rgba(0,0,0,0.5)]">
        <p className="text-[11px] font-bold tracking-[0.2em] uppercase text-white/55">Pro Monat</p>
        <p className="mt-1.5 text-3xl font-bold tabular-nums">{formatEuro(e.wirtschaftlichMonat)}</p>
        <p className="mt-1 text-[11px] text-white/50">
          {e.wirtschaftlichUnvollstaendig
            ? 'Zwischensumme, wirtschaftliche Kosten unvollständig'
            : 'wirtschaftliche Kosten inklusive Wertverlust'}
        </p>
      </div>
      <div className={`${cardCls} p-4 sm:p-5`}>
        <p className="text-[11px] font-bold tracking-[0.2em] uppercase text-gray-400">Pro Jahr</p>
        <p className="mt-1.5 text-3xl font-bold text-gray-900 tabular-nums">{formatEuro(e.wirtschaftlichJahr)}</p>
        <p className="mt-1 text-[11px] text-gray-400">
          {formatMenge(e.jahresverbrauch, e.energieEinheitMenge)} Energie im Jahr
        </p>
      </div>
      <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4 sm:p-5">
        <p className="text-[11px] font-bold tracking-[0.2em] uppercase text-orange-500">Pro Kilometer</p>
        <p className="mt-1.5 text-3xl font-bold text-orange-600 tabular-nums">{formatProKm(e.kostenProKm)}</p>
        <p className="mt-1 text-[11px] text-orange-500/80">inkl. aller Angaben</p>
      </div>
    </div>
  )
}

// ── Budget ──────────────────────────────────────────────────────────────────

function Budget({ e, form }: { e: Ergebnis; form: AutokostenForm }) {
  const b = budgetCheck(e, form)
  if (!b) return null
  const farbe = b.status === 'ueber' ? 'text-amber-700' : b.status === 'unter' ? 'text-emerald-700' : 'text-gray-700'
  return (
    <Abschnitt
      icon={<PiggyBank size={14} />}
      titel="Budget-Check"
      hinweis="Verglichen werden deine laufenden Ausgaben im Monatsdurchschnitt mit deinem Monatsbudget für laufende Ausgaben."
    >
      <div className="grid grid-cols-3 gap-3 text-center">
        <div className="rounded-xl border border-[#e6e1da] bg-[#faf8f5] py-3 px-1">
          <p className="text-[11px] text-gray-500">Dein Monatsbudget</p>
          <p className="mt-0.5 text-lg font-bold text-gray-900 tabular-nums">{formatEuro(b.budgetMonat)}</p>
        </div>
        <div className="rounded-xl border border-[#e6e1da] bg-[#faf8f5] py-3 px-1">
          <p className="text-[11px] text-gray-500">{b.unvollstaendig ? 'Laufend (Zwischensumme)' : 'Laufende Ausgaben'}</p>
          <p className="mt-0.5 text-lg font-bold text-gray-900 tabular-nums">{formatEuro(b.laufendMonat)}</p>
        </div>
        <div className="rounded-xl border border-[#e6e1da] bg-[#faf8f5] py-3 px-1">
          <p className="text-[11px] text-gray-500">Abstand</p>
          <p className={`mt-0.5 text-lg font-bold tabular-nums ${farbe}`}>{formatDelta(b.differenz, false)}</p>
        </div>
      </div>
      <p className="mt-3 text-sm text-gray-700 leading-relaxed">{b.text}</p>
      <p className="mt-2 text-xs text-gray-500 leading-relaxed">
        Daneben: wirtschaftliche Kosten inklusive Wertverlust {formatEuro(b.wirtschaftlichMonat)} pro Monat
        {e.wirtschaftlichUnvollstaendig ? ' (Zwischensumme, unvollständig)' : ''}. Der Wertverlust ist ein
        wirtschaftlicher Aufwand und wird nicht monatlich abgebucht.
      </p>
      <p className="mt-1 text-[11px] text-gray-400">
        Das ist ein Abgleich mit deiner eigenen Zahl, keine Finanzberatung.
      </p>
    </Abschnitt>
  )
}

// ── Projektion ──────────────────────────────────────────────────────────────

function Projektion({ e }: { e: Ergebnis }) {
  return (
    <Abschnitt
      icon={<CalendarClock size={14} />}
      titel="Bei gleichbleibenden Annahmen kostet dich dieses Auto"
      hinweis="Hochrechnung deiner Jahreskosten. Keine Prognose von Kraftstoffpreisen, Reparaturen oder Wertverlaufskurven."
    >
      <div className="grid grid-cols-3 gap-3 text-center">
        {e.projektion.map((p) => (
          <div key={p.jahre} className="rounded-xl border border-[#e6e1da] bg-[#faf8f5] py-3 px-1">
            <p className="text-[11px] text-gray-500">{p.jahre} {p.jahre === 1 ? 'Jahr' : 'Jahre'}</p>
            <p className="mt-0.5 text-lg sm:text-xl font-bold text-gray-900 tabular-nums">
              {formatEuroKurz(p.kosten)}
            </p>
          </div>
        ))}
      </div>
      <p className="mt-3 text-[11px] text-gray-400">
        Der Kaufpreis ist hier nicht zusätzlich enthalten
        {e.hatWertverlust ? '. Sein Verzehr steckt bereits im Wertverlust.' : '.'}
      </p>
    </Abschnitt>
  )
}

// ── Aufschlüsselung ─────────────────────────────────────────────────────────

function Aufschluesselung({ e, form }: { e: Ergebnis; form: AutokostenForm }) {
  const insights = baueInsights(e, form)
  return (
    <Abschnitt
      icon={<TrendingDown size={14} />}
      titel="Wo geht dein Geld hin?"
      hinweis="Anteile an deinen wirtschaftlichen Autokosten, deterministisch aus deinen Angaben."
    >
      {/* Gestapelter Balken — ein Bild, keine Chart-Library */}
      <div className="flex h-3 w-full overflow-hidden rounded-full bg-[#efe9df]">
        {e.posten.map((p) => (
          <div
            key={p.key}
            className={POSTEN_FARBE[p.key] ?? 'bg-gray-300'}
            style={{ width: `${p.anteil}%` }}
            title={`${p.label}: ${formatProzent(p.anteil)}`}
          />
        ))}
      </div>

      <div className="mt-4 divide-y divide-[#efe9df]">
        {e.posten.map((p) => (
          <div key={p.key} className="flex items-baseline justify-between gap-3 py-2">
            <span className="flex items-center gap-2 text-sm text-gray-700 min-w-0">
              <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${POSTEN_FARBE[p.key] ?? 'bg-gray-300'}`} />
              <span className="truncate">{p.label}</span>
              {!p.cash && (
                <span className="shrink-0 rounded-full bg-gray-100 px-1.5 py-0.5 text-[10px] text-gray-500">
                  kein Kontoabgang
                </span>
              )}
            </span>
            <span className="shrink-0 text-right">
              <span className="text-sm font-semibold text-gray-900 tabular-nums">{formatEuro(p.monat)}</span>
              <span className="ml-2 text-xs text-gray-400 tabular-nums">{formatProzent(p.anteil)}</span>
            </span>
          </div>
        ))}
      </div>

      <ul className="mt-4 space-y-2">
        {insights.map((i) => (
          <li key={i.key} className="flex items-start gap-2 text-sm text-gray-700 leading-relaxed">
            <Lightbulb size={14} className="mt-0.5 shrink-0 text-orange-400" />
            <span>{i.text}</span>
          </li>
        ))}
      </ul>
    </Abschnitt>
  )
}

// ── Laufende Ausgaben vs. wirtschaftliche Kosten ────────────────────────────

function Kostenarten({ e }: { e: Ergebnis }) {
  return (
    <Abschnitt icon={<Wallet size={14} />} titel="Laufende Ausgaben und wirtschaftliche Kosten">
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="rounded-xl border border-orange-200 bg-orange-50 p-4">
          <p className="text-[11px] uppercase tracking-wide text-orange-500">Laufende Ausgaben im Monatsdurchschnitt</p>
          <p className="mt-1 text-2xl font-bold text-orange-600 tabular-nums">{formatEuro(e.laufendeCashMonat)}</p>
          <p className="mt-1 text-xs text-orange-500/80">
            {e.laufendUnvollstaendig ? `Zwischensumme. ${fehlendText(e.fehlendLaufend)}` : 'ohne Wertverlust'}
          </p>
        </div>
        <div className="rounded-xl border border-[#e6e1da] bg-[#faf8f5] p-4">
          <p className="text-[11px] uppercase tracking-wide text-gray-400">Wirtschaftliche Kosten inklusive Wertverlust</p>
          <p className="mt-1 text-2xl font-bold text-gray-900 tabular-nums">{formatEuro(e.wirtschaftlichMonat)}</p>
          <p className="mt-1 text-xs text-gray-500">
            {e.wirtschaftlichUnvollstaendig
              ? 'Zwischensumme: ' + (e.hatWertverlust ? 'laufende Positionen fehlen.' : 'Wertverlust nicht angegeben.')
              : 'laufende Ausgaben plus Wertverlust'}
          </p>
        </div>
      </div>
      <p className="mt-3 flex items-start gap-2 text-xs text-gray-500 leading-relaxed">
        <Info size={13} className="mt-0.5 shrink-0 text-gray-400" />
        <span>
          Jährliche und unregelmäßige Zahlungen (Versicherung, Steuer, Wartung, Reifen) sind hier rechnerische
          Monatsanteile, keine tatsächliche monatliche Abbuchung. Der Wertverlust ist ein wirtschaftlicher
          Aufwand, kein Kontoabgang.
        </span>
      </p>
    </Abschnitt>
  )
}

// ── Was wäre, wenn? ─────────────────────────────────────────────────────────

const SIM_FELDER: { feld: keyof AutokostenForm; label: string; suffix: string }[] = [
  { feld: 'kmProJahr', label: 'Fahrleistung pro Jahr', suffix: 'km' },
  { feld: 'verbrauch', label: 'Verbrauch', suffix: '' },
  { feld: 'wertverlustJahr', label: 'Wertverlust', suffix: '€/Jahr' },
]

function WasWaereWenn({ basisForm, basis }: { basisForm: AutokostenForm; basis: Ergebnis }) {
  const [sim, setSim] = useState<AutokostenForm>(basisForm)
  const preisFeld = sim.kraftstoff === 'diesel' ? 'preisDiesel'
    : sim.kraftstoff === 'elektro' ? 'preisStrom' : 'preisBenzin'
  const preisLabel = sim.kraftstoff === 'elektro' ? 'Ladepreis' : 'Energiepreis'
  const einheit = sim.kraftstoff === 'elektro' ? 'kWh/100 km' : 'l/100 km'

  // Derselbe Rechenkern wie oben — kein zweiter Request, keine zweite Formel.
  const simErgebnis = useMemo(
    () => (validate(sim).length === 0 ? berechne(sim) : null),
    [sim],
  )
  const delta = simErgebnis ? simErgebnis.wirtschaftlichMonat - basis.wirtschaftlichMonat : 0
  const veraendert = JSON.stringify(sim) !== JSON.stringify(basisForm)

  return (
    <Abschnitt
      icon={<SlidersHorizontal size={14} />}
      titel="Was wäre, wenn?"
      hinweis="Werte ändern, das Ergebnis rechnet sofort mit. Deine ursprüngliche Eingabe oben bleibt unangetastet."
    >
      <div className="grid sm:grid-cols-2 gap-3">
        {SIM_FELDER.map(({ feld, label, suffix }) => (
          <label key={feld} className="block">
            <span className="block text-xs font-medium text-gray-500 mb-1">
              {label}{feld === 'verbrauch' ? ` (${einheit})` : ''}
            </span>
            <div className="relative">
              <input
                inputMode="decimal"
                className="w-full rounded-lg border border-[#e6e1da] bg-white px-3 py-2 text-sm pr-16 focus:outline-none focus:ring-2 focus:ring-orange-300/50 focus:border-orange-300"
                value={sim[feld] as string}
                onChange={(ev) => setSim((f) => ({ ...f, [feld]: ev.target.value }))}
              />
              {suffix && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">{suffix}</span>
              )}
            </div>
          </label>
        ))}
        <label className="block">
          <span className="block text-xs font-medium text-gray-500 mb-1">{preisLabel}</span>
          <div className="relative">
            <input
              inputMode="decimal"
              className="w-full rounded-lg border border-[#e6e1da] bg-white px-3 py-2 text-sm pr-16 focus:outline-none focus:ring-2 focus:ring-orange-300/50 focus:border-orange-300"
              value={sim[preisFeld] as string}
              onChange={(ev) => setSim((f) => ({ ...f, [preisFeld]: ev.target.value }))}
            />
            <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">
              {sim.kraftstoff === 'elektro' ? '€/kWh' : '€/l'}
            </span>
          </div>
        </label>
      </div>

      <div className="mt-4 rounded-xl border border-[#e6e1da] bg-[#faf8f5] p-4">
        {simErgebnis ? (
          <>
            <div className="flex flex-wrap items-baseline justify-between gap-2">
              <span className="text-sm text-gray-600">
                Neu pro Monat{simErgebnis.wirtschaftlichUnvollstaendig ? ' (Zwischensumme)' : ''}
              </span>
              <span className="text-2xl font-bold text-gray-900 tabular-nums">
                {formatEuro(simErgebnis.wirtschaftlichMonat)}
              </span>
            </div>
            <div className="mt-1 flex flex-wrap items-baseline justify-between gap-2">
              <span className="text-sm text-gray-600">Unterschied zu oben</span>
              <span className={`text-lg font-semibold tabular-nums ${
                Math.abs(delta) < 0.005 ? 'text-gray-500' : delta > 0 ? 'text-amber-700' : 'text-emerald-700'
              }`}>
                {formatDelta(delta, false)} pro Monat
              </span>
            </div>
            {simErgebnis.laufendUnvollstaendig && (
              <p className="mt-2 text-xs text-amber-800">
                Zwischensumme: {fehlendText(simErgebnis.fehlendLaufend)}
              </p>
            )}
            <p className="mt-2 text-xs text-gray-500">
              {formatEuroKurz(simErgebnis.wirtschaftlichJahr)} pro Jahr ·
              {' '}{formatProKm(simErgebnis.kostenProKm)} pro km
            </p>
          </>
        ) : (
          <p className="text-sm text-gray-500">
            Bitte Fahrleistung, Verbrauch und Energiepreis größer als 0 lassen.
          </p>
        )}
        {veraendert && (
          <button
            type="button"
            onClick={() => setSim(basisForm)}
            className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-900"
          >
            <RotateCcw size={12} /> Auf deine Eingabe zurücksetzen
          </button>
        )}
      </div>
    </Abschnitt>
  )
}

// ── A/B-Vergleich ───────────────────────────────────────────────────────────

const B_FELDER: { feld: keyof AutokostenForm; label: string; suffix: string }[] = [
  { feld: 'kaufpreis', label: 'Kaufpreis', suffix: '€' },
  { feld: 'verbrauch', label: 'Verbrauch', suffix: '' },
  { feld: 'versicherungJahr', label: 'Versicherung', suffix: '€/Jahr' },
  { feld: 'steuerJahr', label: 'Kfz-Steuer', suffix: '€/Jahr' },
  { feld: 'wartungJahr', label: 'Wartung', suffix: '€/Jahr' },
  { feld: 'reifenJahr', label: 'Reifen', suffix: '€/Jahr' },
  { feld: 'wertverlustJahr', label: 'Wertverlust', suffix: '€/Jahr' },
]

function Vergleich({ formA, a }: { formA: AutokostenForm; a: Ergebnis }) {
  const [offen, setOffen] = useState(false)
  const [formB, setFormB] = useState<AutokostenForm>(() => starteVergleich(formA))
  const preisFeldB = formB.kraftstoff === 'diesel' ? 'preisDiesel'
    : formB.kraftstoff === 'elektro' ? 'preisStrom' : 'preisBenzin'
  const b = useMemo(() => (validate(formB).length === 0 ? berechne(formB) : null), [formB])
  const d = useMemo(() => (b ? vergleiche(a, b) : null), [a, b])

  if (!offen) {
    return (
      <button
        type="button"
        onClick={() => setOffen(true)}
        className={`${cardCls} w-full p-5 text-left hover:border-orange-300 transition-colors`}
      >
        <span className="flex items-center gap-2.5">
          <GitCompareArrows size={16} className="text-orange-500 shrink-0" />
          <span className="min-w-0">
            <span className="block text-sm font-semibold text-gray-900">Mit einem anderen Auto vergleichen</span>
            <span className="block text-xs text-gray-500 mt-0.5">
              Du gibst das zweite Auto selbst ein. ENFAL schlägt keines vor.
            </span>
          </span>
          <ArrowRight size={15} className="ml-auto shrink-0 text-gray-300" />
        </span>
      </button>
    )
  }

  return (
    <Abschnitt
      icon={<GitCompareArrows size={14} />}
      titel="Auto A gegen Auto B"
      hinweis="Fahrleistung, Energiepreis, Stellplatz und Budget sind übernommen. Fahrzeugwerte gibst du für Auto B selbst ein."
    >
      <div className="grid sm:grid-cols-2 gap-3">
        <label className="block sm:col-span-2">
          <span className="block text-xs font-medium text-gray-500 mb-1">Kraftstoffart Auto B</span>
          <div className="flex flex-wrap gap-2">
            {(['benzin', 'diesel', 'elektro'] as const).map((k) => (
              <button
                key={k}
                type="button"
                onClick={() => setFormB((f) => ({ ...f, kraftstoff: k }))}
                className={'text-sm font-medium rounded-full px-3.5 py-1.5 border transition-colors '
                  + (formB.kraftstoff === k
                    ? 'bg-orange-500 border-orange-500 text-white'
                    : 'bg-white border-[#e6e1da] text-gray-600 hover:border-orange-300')}
              >
                {k === 'benzin' ? 'Benzin' : k === 'diesel' ? 'Diesel' : 'Elektro'}
              </button>
            ))}
          </div>
        </label>
        <label className="block">
          <span className="block text-xs font-medium text-gray-500 mb-1">
            {formB.kraftstoff === 'elektro' ? 'Ladepreis (€/kWh)' : 'Energiepreis (€/l)'}
          </span>
          <input
            inputMode="decimal"
            className="w-full rounded-lg border border-[#e6e1da] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300/50"
            value={formB[preisFeldB] as string}
            onChange={(ev) => setFormB((f) => ({ ...f, [preisFeldB]: ev.target.value }))}
          />
        </label>
        {B_FELDER.map(({ feld, label, suffix }) => (
          <label key={feld} className="block">
            <span className="block text-xs font-medium text-gray-500 mb-1">
              {label}{feld === 'verbrauch' ? ` (${formB.kraftstoff === 'elektro' ? 'kWh' : 'l'}/100 km)` : ''}
            </span>
            <div className="relative">
              <input
                inputMode="decimal"
                className="w-full rounded-lg border border-[#e6e1da] bg-white px-3 py-2 text-sm pr-16 focus:outline-none focus:ring-2 focus:ring-orange-300/50"
                value={formB[feld] as string}
                onChange={(ev) => setFormB((f) => ({ ...f, [feld]: ev.target.value }))}
              />
              {suffix && (
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">{suffix}</span>
              )}
            </div>
          </label>
        ))}
      </div>

      {b && d ? (
        <>
          {/* Mobile: untereinander. Desktop: nebeneinander. */}
          <div className="mt-5 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
            <div className="hidden sm:block" />
            <div className="hidden sm:block text-center text-[11px] font-bold uppercase tracking-wide text-gray-400">Auto A</div>
            <div className="hidden sm:block text-center text-[11px] font-bold uppercase tracking-wide text-gray-400">Auto B</div>
            {([
              ['Pro Monat', formatEuro(a.wirtschaftlichMonat), formatEuro(b.wirtschaftlichMonat)],
              ['Pro Jahr', formatEuroKurz(a.wirtschaftlichJahr), formatEuroKurz(b.wirtschaftlichJahr)],
              ['3 Jahre', formatEuroKurz(a.wirtschaftlichJahr * 3), formatEuroKurz(b.wirtschaftlichJahr * 3)],
              ['5 Jahre', formatEuroKurz(a.wirtschaftlichJahr * 5), formatEuroKurz(b.wirtschaftlichJahr * 5)],
              ['Pro km', formatProKm(a.kostenProKm), formatProKm(b.kostenProKm)],
            ] as const).map(([label, va, vb]) => (
              <div key={label} className="contents">
                <div className="text-xs text-gray-500 sm:self-center pt-2 sm:pt-0">{label}</div>
                <div className="rounded-lg border border-[#e6e1da] bg-[#faf8f5] px-3 py-2 flex justify-between sm:justify-center gap-2">
                  <span className="sm:hidden text-xs text-gray-400">Auto A</span>
                  <span className="font-semibold text-gray-900 tabular-nums">{va}</span>
                </div>
                <div className="rounded-lg border border-orange-200 bg-orange-50 px-3 py-2 flex justify-between sm:justify-center gap-2">
                  <span className="sm:hidden text-xs text-orange-500/80">Auto B</span>
                  <span className="font-semibold text-orange-700 tabular-nums">{vb}</span>
                </div>
              </div>
            ))}
          </div>

          {(a.wirtschaftlichUnvollstaendig || b.wirtschaftlichUnvollstaendig) && (
            <p className="mt-4 text-xs text-amber-800 leading-relaxed">
              Zwischensumme, nicht vollständig vergleichbar.
              {a.fehlendLaufend.length > 0 && ` Auto A: ${fehlendText(a.fehlendLaufend)}`}
              {!a.hatWertverlust && ' Auto A: Wertverlust nicht angegeben.'}
              {b.fehlendLaufend.length > 0 && ` Auto B: ${fehlendText(b.fehlendLaufend)}`}
              {!b.hatWertverlust && ' Auto B: Wertverlust nicht angegeben.'}
              {' '}Ein fehlender Betrag zählt als 0; trage 0 ausdrücklich ein, wenn die Position nicht anfällt.
            </p>
          )}

          <div className="mt-4 rounded-xl border border-[#e6e1da] bg-[#faf8f5] p-4">
            <p className="text-sm text-gray-700">
              Auto B kostet <span className="font-semibold">{formatDelta(d.monat, false)} pro Monat</span>,
              {' '}{formatDelta(d.jahr)} pro Jahr und {formatDelta(d.fuenfJahre)} über fünf Jahre.
            </p>
            {d.treiber.length > 0 && (
              <>
                <p className="mt-3 text-[11px] font-bold uppercase tracking-wide text-gray-400">
                  Woher kommt der Unterschied?
                </p>
                {/* Alle Treiber, nicht nur die größten: bei höchstens sieben
                    Kostenarten passt die Liste, und sie summiert sich sichtbar
                    genau auf die Gesamtdifferenz darüber. */}
                <ul className="mt-1.5 space-y-1">
                  {d.treiber.map((t) => (
                    <li key={t.key} className="flex items-baseline justify-between gap-3 text-sm">
                      <span className="text-gray-600">{t.label}</span>
                      <span className={`tabular-nums font-medium ${t.differenzMonat > 0 ? 'text-amber-700' : 'text-emerald-700'}`}>
                        {formatDelta(t.differenzMonat, false)} / Monat
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}
            <p className="mt-3 text-[11px] text-gray-400">
              Reine Differenz deiner beiden Eingaben. Welches Auto besser zu dir passt, entscheidest du.
            </p>
          </div>
        </>
      ) : (
        <p className="mt-4 text-sm text-gray-500">
          Für Auto B fehlen noch Verbrauch, Fahrleistung oder Energiepreis.
        </p>
      )}
    </Abschnitt>
  )
}

// ── ENFAL-Wege (kontextbezogen, unter dem echten Ergebnis) ──────────────────

function Wege() {
  return (
    <div className="grid sm:grid-cols-2 gap-3">
      <Link to="/kaufcheck" className={`${cardCls} p-5 block hover:border-orange-300 transition-colors`}>
        <p className="text-sm font-semibold text-gray-900">Du überlegst, dieses Auto zu kaufen?</p>
        <p className="mt-1 text-xs text-gray-500 leading-relaxed">
          Die laufenden Kosten kennst du jetzt. Mit dem KaufCheck prüfst du das konkrete Fahrzeug
          auf bekannte Schwachstellen, Rückrufe und Kauf-Risiken.
        </p>
        <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-orange-600">
          KaufCheck starten <ArrowRight size={14} />
        </span>
      </Link>
      <Link to="/verkaufscheck" className={`${cardCls} p-5 block hover:border-orange-300 transition-colors`}>
        <p className="text-sm font-semibold text-gray-900">Du möchtest dein aktuelles Auto verkaufen?</p>
        <p className="mt-1 text-xs text-gray-500 leading-relaxed">
          Der VerkaufsCheck macht daraus einen Verkaufsfahrplan: Inserat, Fotos, Verhandlung
          und Übergabe.
        </p>
        <span className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-orange-600">
          VerkaufsCheck starten <ArrowRight size={14} />
        </span>
      </Link>
    </div>
  )
}

// ── Zusammenbau ─────────────────────────────────────────────────────────────

export default function AutokostenErgebnis({ ergebnis, form }: {
  ergebnis: Ergebnis; form: AutokostenForm
}) {
  return (
    <div className="space-y-4">
      <Hero e={ergebnis} />

      {ergebnis.laufendUnvollstaendig && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-900">Laufende Ausgaben unvollständig</p>
          <p className="mt-0.5 text-xs text-amber-800 leading-relaxed">
            {fehlendText(ergebnis.fehlendLaufend)} Alle Ergebnisse sind eine Zwischensumme. ENFAL setzt keine
            Werte ein. Fällt eine Position nicht an, trage ausdrücklich 0 ein.
          </p>
        </div>
      )}
      {!ergebnis.hatWertverlust && (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4">
          <p className="text-sm font-semibold text-amber-900">Wertverlust nicht berücksichtigt</p>
          <p className="mt-0.5 text-xs text-amber-800 leading-relaxed">
            Du hast keinen Wertverlust angegeben. Die wirtschaftliche Gesamtsicht ist dadurch unvollständig;
            deine laufenden Ausgaben sind davon nicht betroffen. ENFAL setzt hier bewusst keinen geschätzten
            Wert ein.
          </p>
        </div>
      )}

      <Budget e={ergebnis} form={form} />
      <Projektion e={ergebnis} />
      <Aufschluesselung e={ergebnis} form={form} />
      <Kostenarten e={ergebnis} />
      <WasWaereWenn basisForm={form} basis={ergebnis} />
      <Vergleich formA={form} a={ergebnis} />
      <Wege />

      <p className="px-1 text-[11px] text-gray-400 leading-relaxed">
        Richtwert auf Basis deiner Eingaben. Reale Kosten schwanken mit Fahrweise, Region,
        Fahrzeugzustand und Vertragskonditionen.
      </p>
    </div>
  )
}
