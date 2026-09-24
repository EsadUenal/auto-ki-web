import { useEffect, useRef, useState } from 'react'
import { Calculator, RotateCcw, Sparkles, ChevronDown, Info } from 'lucide-react'
import { apiKraftstoffReferenz } from '../../api/client'
import {
  EMPTY_FORM,
  BEISPIEL_FORM,
  KRAFTSTOFF_OPTIONS,
  berechne,
  validate,
  speichereForm,
  ladeForm,
  loescheForm,
  energiePreisFeld,
  type AutokostenForm,
  type AutokostenErgebnis as Ergebnis,
  type Kraftstoff,
  type FeldFehler,
} from './logic'
import {
  alsMap, referenzFuer, referenzLabel, uebernehmeReferenz, type Referenzen,
} from './kraftstoffReferenz'
import AutokostenErgebnis from './AutokostenErgebnis'

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
  label, suffix, value, onChange, placeholder, error, hint,
}: {
  label: string; suffix?: string; value: string
  onChange: (v: string) => void; placeholder?: string; error?: string; hint?: string
}) {
  return (
    <label className="block">
      <span className="block text-xs font-medium text-gray-500 mb-1">{label}</span>
      <div className="relative">
        <input
          inputMode="decimal"
          className={inputCls + (error ? ' border-red-300 focus:ring-red-200' : '') + (suffix ? ' pr-14' : '')}
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
      {!error && hint && <span className="mt-1 block text-[11px] text-gray-400">{hint}</span>}
    </label>
  )
}

export default function AutokostenView() {
  const [form, setForm] = useState<AutokostenForm>(EMPTY_FORM)
  const [ergebnis, setErgebnis] = useState<Ergebnis | null>(null)
  const [fehler, setFehler] = useState<FeldFehler[]>([])
  const [zeigeFehler, setZeigeFehler] = useState(false)
  const [showMore, setShowMore] = useState(false)
  const [beispielAktiv, setBeispielAktiv] = useState(false)
  const [referenz, setReferenz] = useState<Referenzen>({})
  const restoreHandled = useRef(false)

  // Letzte Eingabe + Berechnung beim Reload wiederherstellen.
  useEffect(() => {
    if (restoreHandled.current) return
    restoreHandled.current = true
    const gespeichert = ladeForm()
    if (!gespeichert) return
    setForm(gespeichert)
    if (validate(gespeichert).length === 0) setErgebnis(berechne(gespeichert))
  }, [])

  // Amtliche Kraftstoff-Referenz nachladen. Rein additiv: schlägt der Abruf fehl,
  // bleibt der Rechner unverändert benutzbar und die Felder leer/editierbar.
  useEffect(() => {
    let aktiv = true
    apiKraftstoffReferenz()
      .then((liste) => {
        if (!aktiv) return
        const map = alsMap(liste)
        setReferenz(map)
        // Nur LEERE Felder füllen — eine bereits getippte Zahl gewinnt immer.
        setForm((f) => uebernehmeReferenz(f, map))
      })
      .catch(() => { /* ohne Referenz weiterrechnen */ })
    return () => { aktiv = false }
  }, [])

  function set<K extends keyof AutokostenForm>(key: K, value: AutokostenForm[K]) {
    setForm((f) => ({ ...f, [key]: value }))
    if (key !== 'budgetMonat') setBeispielAktiv(false)
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
    setErgebnis(berechne(form))
    speichereForm(form)
    setTimeout(() => document.getElementById('ak-ergebnis')?.scrollIntoView({ behavior: 'smooth' }), 60)
  }

  function beispielLaden() {
    // Beispielwerte sind Demo-Zahlen. Die Energiepreise bleiben die echte
    // Referenz (bzw. leer) — ein Beispielpreis würde wie ein Marktpreis aussehen.
    const mitReferenz = uebernehmeReferenz({ ...BEISPIEL_FORM }, referenz)
    const fs = validate(mitReferenz)
    setForm(mitReferenz)
    setFehler(fs)
    setBeispielAktiv(true)
    if (fs.length === 0) {
      setZeigeFehler(false)
      setErgebnis(berechne(mitReferenz))
      speichereForm(mitReferenz)
    } else {
      // Liegt keine amtliche Referenz vor, fehlt genau der Energiepreis. Das Feld
      // wird dann markiert, statt dass stillschweigend kein Ergebnis erscheint.
      setZeigeFehler(true)
      setErgebnis(null)
    }
  }

  function zuruecksetzen() {
    setForm(uebernehmeReferenz({ ...EMPTY_FORM }, referenz))
    setErgebnis(null)
    setFehler([])
    setZeigeFehler(false)
    setBeispielAktiv(false)
    loescheForm()
  }

  const kraftstoffOpt = KRAFTSTOFF_OPTIONS.find((o) => o.value === form.kraftstoff)!
  const preisFeld = energiePreisFeld(form.kraftstoff)
  const aktuelleReferenz = referenzFuer(form.kraftstoff, referenz)
  const referenzText = referenzLabel(aktuelleReferenz)

  return (
    <div
      className="relative h-full overflow-y-auto scrollbar-thin"
      style={{ background: 'radial-gradient(120% 60% at 50% 0%, #fdfaf6 0%, #faf7f3 40%, #f4f0ea 100%)' }}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-80 overflow-hidden">
        <div className="ez-aurora absolute left-1/2 -translate-x-1/2 -top-40 w-[720px] h-[440px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(249,115,22,0.09) 0%, transparent 68%)' }} />
      </div>

      <div className="ez-rise ez-page relative px-4 sm:px-6 py-10">
        {/* Hero */}
        <div className="mb-6">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2.5">
              <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-orange-500/10 border border-orange-400/25 text-orange-500">
                <Calculator size={12} />
              </span>
              <span className="text-[11px] font-bold tracking-[0.22em] uppercase text-gray-500">ENFAL · Autokosten</span>
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
            Autokosten berechnen: <span className="text-gray-400">Was kostet dein Auto wirklich im Monat?</span>
          </h1>
          <p className="mt-2 text-sm text-gray-500 max-w-lg leading-relaxed">
            Kosten pro Monat, pro Jahr und pro Kilometer — inklusive Wertverlust, Budget-Abgleich
            und Vergleich mit einem zweiten Auto. Kostenlos, ohne Anmeldung, deterministisch gerechnet.
          </p>
        </div>

        {beispielAktiv && (
          <div className="mb-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <Info size={14} className="mt-0.5 shrink-0 text-amber-500" />
            <p className="text-xs text-amber-900 leading-relaxed">
              <span className="font-semibold">Beispieldaten.</span> Versicherung, Steuer, Wartung,
              Reifen und Wertverlust sind frei gewählte Demo-Zahlen, keine Marktdurchschnitte.
              Ersetze sie durch deine eigenen Werte.
            </p>
          </div>
        )}

        <form onSubmit={berechnen} className="ez-form rounded-2xl border border-[#e6e1da] bg-white shadow-[0_20px_44px_-30px_rgba(40,25,10,0.24)] overflow-hidden">
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
                  onChange={(v) => set('preisBenzin', v)} placeholder="2,35"
                  error={preisFeld === 'preisBenzin' ? fehlerFuer('preisBenzin') : undefined}
                  hint={referenzLabel(referenz.benzin) ?? undefined} />
                <Field label="Dieselpreis" suffix="€/l" value={form.preisDiesel}
                  onChange={(v) => set('preisDiesel', v)} placeholder="2,45"
                  error={preisFeld === 'preisDiesel' ? fehlerFuer('preisDiesel') : undefined}
                  hint={referenzLabel(referenz.diesel) ?? undefined} />
                <Field label="Strompreis / dein Ladepreis" suffix="€/kWh" value={form.preisStrom}
                  onChange={(v) => set('preisStrom', v)} placeholder="z. B. 0,39"
                  error={preisFeld === 'preisStrom' ? fehlerFuer('preisStrom') : undefined} />
              </div>
              {form.kraftstoff === 'elektro' ? (
                <p className="text-[11px] text-gray-400 leading-relaxed">
                  Trage deinen durchschnittlichen Ladepreis ein. Heimladen und öffentliches
                  Schnellladen können stark abweichen — einen allgemeingültigen deutschen
                  Ladepreis gibt es nicht, deshalb gibt ENFAL hier keinen vor.
                </p>
              ) : aktuelleReferenz ? (
                <p className="text-[11px] text-gray-400 leading-relaxed">
                  {referenzText ? `${referenzText}. ` : ''}{aktuelleReferenz.hinweis}
                  {' '}Quelle: {aktuelleReferenz.quelle}. Du kannst den Wert jederzeit überschreiben.
                </p>
              ) : (
                <p className="text-[11px] text-gray-400 leading-relaxed">
                  Aktuell keine amtliche Referenz verfügbar — trage deinen eigenen Preis ein.
                </p>
              )}
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
              <button
                type="button"
                onClick={() => setShowMore((v) => !v)}
                className="flex items-center gap-1.5 text-sm text-orange-600 hover:text-orange-700 font-medium"
              >
                <ChevronDown size={15} className={`transition-transform ${showMore ? 'rotate-180' : ''}`} />
                Budget-Check (optional)
              </button>
              {showMore && (
                <div className="sm:max-w-[50%]">
                  <Field label="Dein maximales Autobudget pro Monat" suffix="€/Monat"
                    value={form.budgetMonat} onChange={(v) => set('budgetMonat', v)}
                    placeholder="400" error={fehlerFuer('budgetMonat')}
                    hint="Nur für den Abgleich mit dem Ergebnis. Keine Finanzberatung." />
                </div>
              )}
              <p className="text-[11px] text-gray-400 leading-relaxed">
                Wertverlust als Betrag pro Jahr. Wenn du ihn nicht kennst, lass das Feld leer —
                die Kosten werden dann ohne Wertverlust berechnet und ausdrücklich so gekennzeichnet.
                ENFAL setzt keine geschätzte Quote ein.
              </p>
            </section>
          </div>

          {/* CTA-Leiste */}
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
          {ergebnis && <AutokostenErgebnis ergebnis={ergebnis} form={form} />}
        </div>
      </div>
    </div>
  )
}
