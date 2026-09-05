import { useEffect, useRef, useState } from 'react'
import {
  Calculator, RotateCcw, Sparkles, Fuel, ShieldCheck, Wrench as WrenchIcon, CircleDot,
  Warehouse, Landmark, TrendingDown, type LucideIcon,
} from 'lucide-react'
import {
  EMPTY_FORM,
  BEISPIEL_FORM,
  KRAFTSTOFF_OPTIONS,
  berechne,
  validate,
  parseZahl,
  formatEuro,
  formatProKm,
  formatMenge,
  energiePreisFeld,
  energieEinheit,
  speichereForm,
  ladeForm,
  loescheForm,
  type AutokostenForm,
  type AutokostenErgebnis,
  type Kraftstoff,
  type FeldFehler,
} from './logic'

const inputCls =
  'w-full rounded-lg border border-[#e6e1da] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300/50 focus:border-orange-300 transition-colors'

function GroupTitle({ n, children }: { n: number; children: React.ReactNode }) {
  return (
    <h2 className="text-[11px] font-bold tracking-[0.2em] uppercase text-gray-500 flex items-center gap-2">
      <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-orange-500/10 text-orange-600 text-[10px] font-bold">{n}</span>
      {children}
    </h2>
  )
}

function Field({
  label, suffix, value, onChange, placeholder, error,
}: {
  label: string; suffix?: string; value: string
  onChange: (v: string) => void; placeholder?: string; error?: string
}) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-gray-500 mb-1">{label}</span>
      <div className="relative">
        <input
          inputMode="decimal"
          className={inputCls + (error ? ' border-red-300 focus:ring-red-200' : '') + (suffix ? ' pr-12' : '')}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          aria-invalid={!!error}
        />
        {suffix && (
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 pointer-events-none">{suffix}</span>
        )}
      </div>
      {error && <span className="mt-1 block text-[11px] text-red-600">{error}</span>}
    </label>
  )
}

function KostenZeile({
  label, wert, anteil, icon: Icon,
}: { label: string; wert: number; anteil: number; icon: LucideIcon }) {
  const pct = anteil > 0 ? Math.min(100, Math.max(0, (wert / anteil) * 100)) : 0
  return (
    <div className="py-2">
      <div className="flex items-baseline justify-between gap-3">
        <span className="text-sm text-gray-600 flex items-center gap-1.5">
          <Icon size={13} className="text-gray-400" />{label}
        </span>
        <span className="text-sm font-semibold text-gray-900 tabular-nums">{formatEuro(wert)}</span>
      </div>
      <div className="mt-1.5 h-1.5 rounded-full bg-[#efe9df] overflow-hidden">
        <div className="h-full rounded-full bg-orange-400" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export default function AutokostenView() {
  const [form, setForm] = useState<AutokostenForm>(EMPTY_FORM)
  const [ergebnis, setErgebnis] = useState<AutokostenErgebnis | null>(null)
  const [fehler, setFehler] = useState<FeldFehler[]>([])
  const [zeigeFehler, setZeigeFehler] = useState(false)
  const restoreHandled = useRef(false)

  // §Extras: letzte Eingabe + Berechnung beim Reload wiederherstellen.
  useEffect(() => {
    if (restoreHandled.current) return
    restoreHandled.current = true
    const gespeichert = ladeForm()
    if (!gespeichert) return
    setForm(gespeichert)
    if (validate(gespeichert).length === 0) {
      setErgebnis(berechne(gespeichert))
    }
  }, [])

  function set<K extends keyof AutokostenForm>(key: K, value: AutokostenForm[K]) {
    setForm((f) => ({ ...f, [key]: value }))
  }
  function fehlerFuer(feld: keyof AutokostenForm): string | undefined {
    return zeigeFehler ? fehler.find((e) => e.feld === feld)?.text : undefined
  }

  function berechnen(e?: React.FormEvent) {
    e?.preventDefault()
    const fs = validate(form)
    setFehler(fs)
    setZeigeFehler(true)
    if (fs.length > 0) {
      setErgebnis(null)
      return
    }
    const erg = berechne(form)
    setErgebnis(erg)
    speichereForm(form)
    setTimeout(() => document.getElementById('ak-ergebnis')?.scrollIntoView({ behavior: 'smooth' }), 60)
  }

  function beispielLaden() {
    setForm(BEISPIEL_FORM)
    setFehler([])
    setZeigeFehler(false)
    setErgebnis(berechne(BEISPIEL_FORM))
    speichereForm(BEISPIEL_FORM)
  }

  function zuruecksetzen() {
    setForm(EMPTY_FORM)
    setErgebnis(null)
    setFehler([])
    setZeigeFehler(false)
    loescheForm()
  }

  const kraftstoffOpt = KRAFTSTOFF_OPTIONS.find((o) => o.value === form.kraftstoff)!
  const preisFeld = energiePreisFeld(form.kraftstoff)

  // Rein darstellungsbezogene Ableitung für "So rechnet VIRA" — dieselben
  // Eingaben, die berechne() ohnehin verwendet; keine neue Fachlogik.
  const kmJahrZahl = parseZahl(form.kmProJahr)
  const preisZahl = parseZahl(form[preisFeld] as string)

  return (
    <div
      className="relative h-full overflow-y-auto scrollbar-thin"
      style={{ background: 'radial-gradient(120% 60% at 50% 0%, #fdfaf6 0%, #faf7f3 40%, #f4f0ea 100%)' }}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-80 overflow-hidden">
        <div className="ez-aurora absolute left-1/2 -translate-x-1/2 -top-40 w-[720px] h-[440px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(249,115,22,0.09) 0%, transparent 68%)' }} />
      </div>

      <div className="ez-rise relative max-w-3xl mx-auto px-4 sm:px-6 py-10">
        {/* Hero — kompakt */}
        <div className="mb-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-orange-500/10 border border-orange-400/25 text-orange-500">
                <Calculator size={12} />
              </span>
              <span className="text-[11px] font-bold tracking-[0.22em] uppercase text-gray-500">Vira · Autokosten</span>
            </div>
            <button
              type="button"
              onClick={beispielLaden}
              className="inline-flex items-center gap-1.5 text-xs font-semibold rounded-full pl-3 pr-3 py-1.5 border border-[#e6e1da] bg-white text-gray-600 hover:border-orange-300 hover:text-gray-900 hover:bg-orange-50/50 transition-colors"
            >
              <Sparkles size={13} className="text-orange-500" /> Mit Beispielwerten füllen
            </button>
          </div>
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-[-0.03em] leading-[1.05]">
            Was kostet dein Auto <span className="text-gray-400">wirklich im Monat?</span>
          </h1>
          <p className="mt-2 text-sm text-gray-500 max-w-md leading-relaxed">
            Fahrzeug- und Nutzungsdaten eingeben — VIRA rechnet deine realistischen
            monatlichen und jährlichen Kosten aus. Deterministisch, ohne Live-Marktdaten.
          </p>
        </div>

        <form onSubmit={berechnen} className="rounded-2xl border border-[#e6e1da] bg-white shadow-[0_20px_44px_-30px_rgba(40,25,10,0.24)] overflow-hidden">
          <div className="divide-y divide-[#efe9df]">
            {/* 1 — Fahrzeug & Nutzung */}
            <section className="p-5 sm:p-6 space-y-3">
              <GroupTitle n={1}>Fahrzeug &amp; Nutzung</GroupTitle>
              <div className="grid sm:grid-cols-2 gap-3">
                <Field label="Kaufpreis" suffix="€" value={form.kaufpreis}
                  onChange={(v) => set('kaufpreis', v)} placeholder="20.000" error={fehlerFuer('kaufpreis')} />
                <Field label="Fahrleistung pro Jahr" suffix="km" value={form.kmProJahr}
                  onChange={(v) => set('kmProJahr', v)} placeholder="15.000" error={fehlerFuer('kmProJahr')} />
              </div>
              <div>
                <span className="block text-xs font-medium text-gray-500 mb-1.5">Kraftstoffart</span>
                <div className="flex flex-wrap gap-2">
                  {KRAFTSTOFF_OPTIONS.map((o) => (
                    <button
                      key={o.value}
                      type="button"
                      onClick={() => set('kraftstoff', o.value as Kraftstoff)}
                      className={
                        'text-sm font-medium rounded-full px-3.5 py-1.5 border transition-all duration-150 ' +
                        (form.kraftstoff === o.value
                          ? 'bg-orange-500 border-orange-500 text-white shadow-[0_8px_16px_-8px_rgba(249,115,22,0.6)]'
                          : 'bg-white border-[#e6e1da] text-gray-600 hover:border-orange-300 hover:text-gray-900 hover:bg-orange-50/50')
                      }
                      aria-pressed={form.kraftstoff === o.value}
                    >
                      {o.label}
                    </button>
                  ))}
                </div>
              </div>
              <div className="sm:max-w-[50%]">
                <Field
                  label={`Verbrauch (${kraftstoffOpt.einheit})`}
                  value={form.verbrauch}
                  onChange={(v) => set('verbrauch', v)}
                  placeholder={form.kraftstoff === 'elektro' ? '17' : '6,5'}
                  error={fehlerFuer('verbrauch')}
                />
              </div>
            </section>

            {/* 2 — Energie */}
            <section className="p-5 sm:p-6 space-y-3">
              <GroupTitle n={2}>Energiepreis</GroupTitle>
              <p className="text-xs text-gray-400">
                Nur der Preis für deine gewählte Kraftstoffart ({kraftstoffOpt.label}) fließt in die Rechnung ein.
              </p>
              <div className="grid sm:grid-cols-3 gap-3">
                <Field label="Benzinpreis" suffix="€/l" value={form.preisBenzin}
                  onChange={(v) => set('preisBenzin', v)} placeholder="1,75"
                  error={preisFeld === 'preisBenzin' ? fehlerFuer('preisBenzin') : undefined} />
                <Field label="Dieselpreis" suffix="€/l" value={form.preisDiesel}
                  onChange={(v) => set('preisDiesel', v)} placeholder="1,65"
                  error={preisFeld === 'preisDiesel' ? fehlerFuer('preisDiesel') : undefined} />
                <Field label="Strompreis" suffix="€/kWh" value={form.preisStrom}
                  onChange={(v) => set('preisStrom', v)} placeholder="0,35"
                  error={preisFeld === 'preisStrom' ? fehlerFuer('preisStrom') : undefined} />
              </div>
            </section>

            {/* 3 — Fixkosten */}
            <section className="p-5 sm:p-6 space-y-3">
              <GroupTitle n={3}>Fixkosten pro Jahr</GroupTitle>
              <div className="grid sm:grid-cols-2 gap-3">
                <Field label="Versicherung" suffix="€/Jahr" value={form.versicherungJahr}
                  onChange={(v) => set('versicherungJahr', v)} placeholder="900" error={fehlerFuer('versicherungJahr')} />
                <Field label="Kfz-Steuer" suffix="€/Jahr" value={form.steuerJahr}
                  onChange={(v) => set('steuerJahr', v)} placeholder="150" error={fehlerFuer('steuerJahr')} />
                <Field label="Wartung / Inspektion" suffix="€/Jahr" value={form.wartungJahr}
                  onChange={(v) => set('wartungJahr', v)} placeholder="600" error={fehlerFuer('wartungJahr')} />
                <Field label="Reifen" suffix="€/Jahr" value={form.reifenJahr}
                  onChange={(v) => set('reifenJahr', v)} placeholder="300" error={fehlerFuer('reifenJahr')} />
              </div>
            </section>

            {/* 4 — Optional */}
            <section className="p-5 sm:p-6 space-y-3">
              <GroupTitle n={4}>Optional</GroupTitle>
              <div className="grid sm:grid-cols-3 gap-3">
                <Field label="Stellplatz / Garage" suffix="€/Monat" value={form.garageMonat}
                  onChange={(v) => set('garageMonat', v)} placeholder="0" error={fehlerFuer('garageMonat')} />
                <Field label="Finanzierungsrate" suffix="€/Monat" value={form.finanzierungMonat}
                  onChange={(v) => set('finanzierungMonat', v)} placeholder="0" error={fehlerFuer('finanzierungMonat')} />
                <Field label="Wertverlust" suffix="€/Jahr" value={form.wertverlustJahr}
                  onChange={(v) => set('wertverlustJahr', v)} placeholder="2.000" error={fehlerFuer('wertverlustJahr')} />
              </div>
              <p className="text-[11px] text-gray-400">
                Die Finanzierungsrate wird nur als vorhandener Betrag übernommen — VIRA rechnet
                bewusst keine Zinsen. Wertverlust bitte als Betrag pro Jahr in Euro.
              </p>
            </section>
          </div>

          {/* CTA-Leiste — abgesetzt, damit der Haupt-Call-to-Action klar heraussticht */}
          <div className="p-5 sm:p-6 bg-[#faf8f5] border-t border-[#efe9df]">
            {zeigeFehler && fehler.length > 0 && (
              <div role="alert" className="mb-3 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                Bitte prüfe die markierten Felder ({fehler.length}).
              </div>
            )}
            <div className="flex flex-wrap items-center gap-3">
              <button type="submit"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-7 py-3.5 text-white font-semibold text-[15px] shadow-[0_14px_28px_-12px_rgba(249,115,22,0.55)] hover:bg-orange-600 hover:shadow-[0_16px_32px_-10px_rgba(249,115,22,0.6)] transition-all">
                <Calculator size={16} /> Kosten berechnen
              </button>
              <button type="button" onClick={zuruecksetzen}
                className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-900 transition-colors">
                <RotateCcw size={13} /> Zurücksetzen
              </button>
            </div>
          </div>
        </form>

        {/* Ergebnis */}
        <div id="ak-ergebnis" className="mt-8 scroll-mt-6">
          {ergebnis && (
            <div className="space-y-4">
              {/* 3 starke KPI-Blöcke */}
              <div className="grid sm:grid-cols-3 gap-3">
                <div className="rounded-2xl bg-gray-900 text-white p-4 sm:p-5 shadow-[0_16px_36px_-24px_rgba(0,0,0,0.5)]">
                  <p className="text-[11px] font-bold tracking-[0.2em] uppercase text-white/55">Gesamt pro Monat</p>
                  <p className="mt-1.5 text-3xl font-bold tabular-nums">{formatEuro(ergebnis.gesamtMonat)}</p>
                </div>
                <div className="rounded-2xl border border-[#e6e1da] bg-white p-4 sm:p-5 shadow-[0_16px_36px_-28px_rgba(40,25,10,0.22)]">
                  <p className="text-[11px] font-bold tracking-[0.2em] uppercase text-gray-400">Gesamt pro Jahr</p>
                  <p className="mt-1.5 text-3xl font-bold text-gray-900 tabular-nums">{formatEuro(ergebnis.gesamtJahr)}</p>
                </div>
                <div className="rounded-2xl border border-orange-200 bg-orange-50 p-4 sm:p-5">
                  <p className="text-[11px] font-bold tracking-[0.2em] uppercase text-orange-500">Kosten pro Kilometer</p>
                  <p className="mt-1.5 text-3xl font-bold text-orange-600 tabular-nums">{formatProKm(ergebnis.kostenProKm)}</p>
                </div>
              </div>

              <div className="rounded-2xl border border-[#e6e1da] bg-white shadow-[0_16px_36px_-24px_rgba(40,25,10,0.28)] overflow-hidden">
                {/* Kostenaufschlüsselung */}
                <div className="p-5 sm:p-6">
                  <h2 className="text-lg font-bold text-gray-900 tracking-tight">Kostenaufschlüsselung</h2>
                  <p className="mt-1 text-xs text-gray-400">
                    Deterministisch berechnet aus deinen Angaben · keine Live-Marktpreise
                  </p>
                  <div className="mt-4 divide-y divide-[#efe9df]">
                    <KostenZeile
                      label={`${kraftstoffOpt.label} (${formatMenge(ergebnis.jahresverbrauch, ergebnis.energieEinheitMenge)}/Jahr)`}
                      wert={ergebnis.energieMonat} anteil={ergebnis.gesamtMonat} icon={Fuel}
                    />
                    <KostenZeile label="Versicherung" wert={ergebnis.versicherungMonat} anteil={ergebnis.gesamtMonat} icon={ShieldCheck} />
                    <KostenZeile label="Kfz-Steuer" wert={ergebnis.steuerMonat} anteil={ergebnis.gesamtMonat} icon={Landmark} />
                    <KostenZeile label="Wartung / Inspektion" wert={ergebnis.wartungMonat} anteil={ergebnis.gesamtMonat} icon={WrenchIcon} />
                    <KostenZeile label="Reifen" wert={ergebnis.reifenMonat} anteil={ergebnis.gesamtMonat} icon={CircleDot} />
                    {ergebnis.garageMonat > 0 && <KostenZeile label="Stellplatz / Garage" wert={ergebnis.garageMonat} anteil={ergebnis.gesamtMonat} icon={Warehouse} />}
                    {ergebnis.finanzierungMonat > 0 && <KostenZeile label="Finanzierungsrate" wert={ergebnis.finanzierungMonat} anteil={ergebnis.gesamtMonat} icon={Landmark} />}
                    {ergebnis.wertverlustMonat > 0 && <KostenZeile label="Wertverlust" wert={ergebnis.wertverlustMonat} anteil={ergebnis.gesamtMonat} icon={TrendingDown} />}
                  </div>
                </div>

                {/* So rechnet VIRA — kurzer, nachvollziehbarer Rechenweg für die Energiekosten */}
                <div className="border-t border-[#efe9df] bg-[#faf8f5] p-5 sm:p-6">
                  <p className="text-[11px] font-bold tracking-[0.2em] uppercase text-gray-400 mb-3">So rechnet VIRA</p>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-center">
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-gray-400">Fahrleistung</p>
                      <p className="mt-1 text-sm font-semibold text-gray-800 tabular-nums">{formatMenge(kmJahrZahl, 'km')}/Jahr</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-gray-400">Verbrauch</p>
                      <p className="mt-1 text-sm font-semibold text-gray-800 tabular-nums">{form.verbrauch} {kraftstoffOpt.einheit}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-gray-400">{ergebnis.energieEinheitMenge}/Jahr</p>
                      <p className="mt-1 text-sm font-semibold text-gray-800 tabular-nums">{formatMenge(ergebnis.jahresverbrauch, ergebnis.energieEinheitMenge)}</p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-gray-400">Preis</p>
                      <p className="mt-1 text-sm font-semibold text-gray-800 tabular-nums">
                        {preisZahl.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {energieEinheit(form.kraftstoff)}
                      </p>
                    </div>
                    <div>
                      <p className="text-[10px] uppercase tracking-wide text-gray-400">Jahreskosten</p>
                      <p className="mt-1 text-sm font-bold text-orange-600 tabular-nums">{formatEuro(ergebnis.energieJahr)}</p>
                    </div>
                  </div>
                </div>

                <div className="px-5 sm:px-6 py-3 text-[11px] text-gray-400 border-t border-[#efe9df]">
                  Richtwert auf Basis deiner Eingaben. Reale Kosten schwanken mit Fahrweise,
                  Region, Fahrzeugzustand und Vertragskonditionen.
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
