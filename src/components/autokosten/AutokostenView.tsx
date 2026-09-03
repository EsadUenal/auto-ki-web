import { useEffect, useRef, useState } from 'react'
import { Calculator, RotateCcw, Sparkles } from 'lucide-react'
import {
  EMPTY_FORM,
  BEISPIEL_FORM,
  KRAFTSTOFF_OPTIONS,
  berechne,
  validate,
  formatEuro,
  formatProKm,
  formatMenge,
  energiePreisFeld,
  speichereForm,
  ladeForm,
  loescheForm,
  type AutokostenForm,
  type AutokostenErgebnis,
  type Kraftstoff,
  type FeldFehler,
} from './logic'

const inputCls =
  'w-full rounded-lg border border-[#e6e1da] bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300/50'

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

function ZeileMonat({ label, wert, stark = false }: { label: string; wert: number; stark?: boolean }) {
  return (
    <div className={'flex items-baseline justify-between gap-3 ' + (stark ? 'text-gray-900 font-semibold' : 'text-gray-600')}>
      <span className="text-sm">{label}</span>
      <span className="text-sm tabular-nums">{formatEuro(wert)}</span>
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
        {/* Hero */}
        <div className="mb-8">
          <div className="flex items-center gap-2.5 mb-5">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-orange-500/10 border border-orange-400/25 text-orange-500">
              <Calculator size={12} />
            </span>
            <span className="text-[11px] font-bold tracking-[0.22em] uppercase text-gray-500">Vira · Autokosten</span>
          </div>
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 tracking-[-0.03em] leading-[1.0]">
            Was kostet dein Auto
            <br />
            <span className="text-gray-400">wirklich im Monat?</span>
          </h1>
          <p className="mt-4 text-sm text-gray-500 max-w-md">
            Gib Fahrzeug- und Nutzungsdaten ein — VIRA rechnet dir daraus deine
            realistischen monatlichen und jährlichen Kosten aus. Rein deterministisch,
            ohne Live-Marktdaten, kostenlos.
          </p>
          <button
            type="button"
            onClick={beispielLaden}
            className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-gray-600 hover:text-gray-900"
          >
            <Sparkles size={14} /> Mit Beispielwerten füllen
          </button>
        </div>

        <form onSubmit={berechnen} className="space-y-8">
          {/* 1 — Fahrzeug & Nutzung */}
          <section className="space-y-3">
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
                      'text-sm rounded-full px-3 py-1.5 border transition-colors ' +
                      (form.kraftstoff === o.value
                        ? 'bg-orange-500 border-orange-500 text-white'
                        : 'bg-white border-[#e6e1da] text-gray-700 hover:border-[#d8d0c2]')
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
          <section className="space-y-3">
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
          <section className="space-y-3">
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
          <section className="space-y-3 rounded-xl border border-[#e6e1da] bg-[#faf8f5] p-4">
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

          {zeigeFehler && fehler.length > 0 && (
            <div role="alert" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              Bitte prüfe die markierten Felder ({fehler.length}).
            </div>
          )}

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button type="submit"
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-6 py-3 text-white font-semibold hover:bg-orange-600 transition-colors">
              <Calculator size={16} /> Kosten berechnen
            </button>
            <button type="button" onClick={zuruecksetzen}
              className="inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-gray-900">
              <RotateCcw size={13} /> Zurücksetzen
            </button>
          </div>
        </form>

        {/* Ergebnis */}
        <div id="ak-ergebnis" className="mt-10 scroll-mt-6">
          {ergebnis && (
            <div className="rounded-2xl border border-[#e6e1da] bg-white shadow-[0_16px_36px_-24px_rgba(40,25,10,0.28)] overflow-hidden">
              <div className="p-5 sm:p-6">
                <h2 className="text-lg font-bold text-gray-900 tracking-tight">Deine Autokosten</h2>
                <p className="mt-1 text-xs text-gray-400">
                  Deterministisch berechnet aus deinen Angaben · keine Live-Marktpreise
                </p>

                <div className="mt-5 space-y-2">
                  <ZeileMonat
                    label={`${kraftstoffOpt.label} (${formatMenge(ergebnis.jahresverbrauch, ergebnis.energieEinheitMenge)}/Jahr)`}
                    wert={ergebnis.energieMonat}
                  />
                  <ZeileMonat label="Versicherung" wert={ergebnis.versicherungMonat} />
                  <ZeileMonat label="Kfz-Steuer" wert={ergebnis.steuerMonat} />
                  <ZeileMonat label="Wartung / Inspektion" wert={ergebnis.wartungMonat} />
                  <ZeileMonat label="Reifen" wert={ergebnis.reifenMonat} />
                  {ergebnis.garageMonat > 0 && <ZeileMonat label="Stellplatz / Garage" wert={ergebnis.garageMonat} />}
                  {ergebnis.finanzierungMonat > 0 && <ZeileMonat label="Finanzierungsrate" wert={ergebnis.finanzierungMonat} />}
                  {ergebnis.wertverlustMonat > 0 && <ZeileMonat label="Wertverlust" wert={ergebnis.wertverlustMonat} />}
                </div>
              </div>

              <div className="border-t border-[#efe9df] bg-[#faf8f5] p-5 sm:p-6 grid sm:grid-cols-2 gap-4">
                <div>
                  <p className="text-[11px] font-bold tracking-[0.2em] uppercase text-gray-400">Gesamt pro Monat</p>
                  <p className="mt-1 text-3xl font-bold text-gray-900 tabular-nums">{formatEuro(ergebnis.gesamtMonat)}</p>
                </div>
                <div>
                  <p className="text-[11px] font-bold tracking-[0.2em] uppercase text-gray-400">Gesamt pro Jahr</p>
                  <p className="mt-1 text-3xl font-bold text-gray-900 tabular-nums">{formatEuro(ergebnis.gesamtJahr)}</p>
                </div>
                <div className="sm:col-span-2 pt-1 border-t border-[#efe9df]">
                  <p className="text-[11px] font-bold tracking-[0.2em] uppercase text-gray-400">Kosten pro Kilometer</p>
                  <p className="mt-1 text-xl font-semibold text-orange-600 tabular-nums">{formatProKm(ergebnis.kostenProKm)}</p>
                </div>
              </div>

              <div className="px-5 sm:px-6 py-3 text-[11px] text-gray-400">
                Richtwert auf Basis deiner Eingaben. Reale Kosten schwanken mit Fahrweise,
                Region, Fahrzeugzustand und Vertragskonditionen.
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
