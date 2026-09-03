// Autokosten-Rechner — framework-freie, VOLL DETERMINISTISCHE Logik.
//
// Diese Datei importiert bewusst NICHTS aus React oder dem API-Client: reine
// Arithmetik + Validierung + localStorage-Persistenz. Kein Gemini, kein Tavily,
// keine Marktdaten, kein Netz. Direkt per `node --test` geprüft
// (src/components/autokosten/autokosten.test.ts).

export type Kraftstoff = 'benzin' | 'diesel' | 'elektro'

export const KRAFTSTOFF_OPTIONS: { value: Kraftstoff; label: string; einheit: string }[] = [
  { value: 'benzin', label: 'Benzin', einheit: 'l/100 km' },
  { value: 'diesel', label: 'Diesel', einheit: 'l/100 km' },
  { value: 'elektro', label: 'Elektro', einheit: 'kWh/100 km' },
]

export interface AutokostenForm {
  kaufpreis: string
  kraftstoff: Kraftstoff
  verbrauch: string          // l/100km  ODER kWh/100km  (je nach kraftstoff)
  kmProJahr: string
  // Energiepreise — nur der zur gewählten Kraftstoffart passende wird geprüft/genutzt
  preisBenzin: string        // €/l
  preisDiesel: string        // €/l
  preisStrom: string         // €/kWh
  // Fixkosten pro Jahr
  versicherungJahr: string
  steuerJahr: string
  wartungJahr: string
  reifenJahr: string
  // Optional
  garageMonat: string        // €/Monat
  finanzierungMonat: string   // €/Monat — nur die Rate, KEINE Zinsrechnung
  wertverlustJahr: string     // €/Jahr
}

export const EMPTY_FORM: AutokostenForm = {
  kaufpreis: '', kraftstoff: 'benzin', verbrauch: '', kmProJahr: '',
  preisBenzin: '', preisDiesel: '', preisStrom: '',
  versicherungJahr: '', steuerJahr: '', wartungJahr: '', reifenJahr: '',
  garageMonat: '', finanzierungMonat: '', wertverlustJahr: '',
}

/** Sinnvolle Startwerte (deutscher Durchschnitt 2025, grob). Reine Platzhalter —
 *  der Nutzer überschreibt sie. */
export const BEISPIEL_FORM: AutokostenForm = {
  kaufpreis: '20000', kraftstoff: 'benzin', verbrauch: '6,5', kmProJahr: '15000',
  preisBenzin: '1,75', preisDiesel: '1,65', preisStrom: '0,35',
  versicherungJahr: '900', steuerJahr: '150', wartungJahr: '600', reifenJahr: '300',
  garageMonat: '', finanzierungMonat: '', wertverlustJahr: '2000',
}

// ── Zahl-Parsing (deutsche Eingabe: Komma als Dezimaltrenner) ────────────────

/** '1.234,56' / '1234,56' / '1234.56' -> 1234.56 ; leer/ungültig -> NaN. */
export function parseZahl(roh: string): number {
  const t = (roh ?? '').trim()
  if (!t) return NaN
  // Tausenderpunkte weg, Dezimalkomma -> Punkt
  const norm = t.replace(/\.(?=\d{3}(\D|$))/g, '').replace(',', '.')
  const n = Number(norm)
  return Number.isFinite(n) ? n : NaN
}

/** Optionales Feld: leer -> 0, sonst geparst (kann NaN sein -> Validierung fängt es). */
function parseOptional(roh: string): number {
  return (roh ?? '').trim() === '' ? 0 : parseZahl(roh)
}

// ── Validierung ─────────────────────────────────────────────────────────────

export interface FeldFehler { feld: keyof AutokostenForm; text: string }

const PFLICHT_POSITIV: { feld: keyof AutokostenForm; label: string }[] = [
  { feld: 'verbrauch', label: 'Verbrauch' },
  { feld: 'kmProJahr', label: 'Fahrleistung' },
]
const OPTIONAL_NICHT_NEGATIV: { feld: keyof AutokostenForm; label: string }[] = [
  { feld: 'kaufpreis', label: 'Kaufpreis' },
  { feld: 'versicherungJahr', label: 'Versicherung' },
  { feld: 'steuerJahr', label: 'Kfz-Steuer' },
  { feld: 'wartungJahr', label: 'Wartung' },
  { feld: 'reifenJahr', label: 'Reifen' },
  { feld: 'garageMonat', label: 'Stellplatz' },
  { feld: 'finanzierungMonat', label: 'Finanzierungsrate' },
  { feld: 'wertverlustJahr', label: 'Wertverlust' },
]

export function energiePreisFeld(k: Kraftstoff): keyof AutokostenForm {
  return k === 'diesel' ? 'preisDiesel' : k === 'elektro' ? 'preisStrom' : 'preisBenzin'
}
export function energieEinheit(k: Kraftstoff): string {
  return k === 'elektro' ? '€/kWh' : '€/l'
}

/** Gibt die Liste der Feldfehler zurück (leer = valide). */
export function validate(form: AutokostenForm): FeldFehler[] {
  const fehler: FeldFehler[] = []

  for (const { feld, label } of PFLICHT_POSITIV) {
    const n = parseZahl(form[feld] as string)
    if (Number.isNaN(n)) fehler.push({ feld, text: `${label} bitte als Zahl eingeben.` })
    else if (n <= 0) fehler.push({ feld, text: `${label} muss größer als 0 sein.` })
  }

  const pFeld = energiePreisFeld(form.kraftstoff)
  const pWert = parseZahl(form[pFeld] as string)
  const pLabel = form.kraftstoff === 'elektro' ? 'Strompreis' : form.kraftstoff === 'diesel' ? 'Dieselpreis' : 'Benzinpreis'
  if (Number.isNaN(pWert)) fehler.push({ feld: pFeld, text: `${pLabel} bitte als Zahl eingeben.` })
  else if (pWert <= 0) fehler.push({ feld: pFeld, text: `${pLabel} muss größer als 0 sein.` })

  for (const { feld, label } of OPTIONAL_NICHT_NEGATIV) {
    const roh = (form[feld] as string).trim()
    if (roh === '') continue
    const n = parseZahl(roh)
    if (Number.isNaN(n)) fehler.push({ feld, text: `${label} bitte als Zahl eingeben.` })
    else if (n < 0) fehler.push({ feld, text: `${label} darf nicht negativ sein.` })
  }
  return fehler
}

// ── Berechnung (deterministisch) ────────────────────────────────────────────

export interface AutokostenErgebnis {
  jahresverbrauch: number       // l bzw. kWh pro Jahr
  energieEinheitMenge: string   // "l" | "kWh"
  energieJahr: number
  energieMonat: number
  versicherungMonat: number
  steuerMonat: number
  wartungMonat: number
  reifenMonat: number
  garageMonat: number
  finanzierungMonat: number
  wertverlustMonat: number
  gesamtMonat: number
  gesamtJahr: number
  kostenProKm: number
}

/**
 * Verbrenner:
 *   jahresverbrauch   = km_jahr / 100 * liter_100km
 *   kraftstoff_jahr   = jahresverbrauch * preis_liter
 * Elektro analog mit kWh / Strompreis.
 * Fixkosten: Jahreswerte / 12. Garage/Finanzierung sind Monatswerte.
 * gesamt_jahr  = energie + versicherung + steuer + wartung + reifen
 *                + garage*12 + finanzierung*12 + wertverlust
 * gesamt_monat = gesamt_jahr / 12
 * kosten_pro_km = gesamt_jahr / km_jahr
 *
 * Setzt eine zuvor bestandene `validate()` voraus.
 */
export function berechne(form: AutokostenForm): AutokostenErgebnis {
  const kmJahr = parseZahl(form.kmProJahr)
  const verbrauch100 = parseZahl(form.verbrauch)
  const preis = parseZahl(form[energiePreisFeld(form.kraftstoff)] as string)

  const jahresverbrauch = (kmJahr / 100) * verbrauch100
  const energieJahr = jahresverbrauch * preis

  const versicherungJahr = parseOptional(form.versicherungJahr)
  const steuerJahr = parseOptional(form.steuerJahr)
  const wartungJahr = parseOptional(form.wartungJahr)
  const reifenJahr = parseOptional(form.reifenJahr)
  const garageMonat = parseOptional(form.garageMonat)
  const finanzierungMonat = parseOptional(form.finanzierungMonat)
  const wertverlustJahr = parseOptional(form.wertverlustJahr)

  const gesamtJahr =
    energieJahr + versicherungJahr + steuerJahr + wartungJahr + reifenJahr +
    garageMonat * 12 + finanzierungMonat * 12 + wertverlustJahr

  const gesamtMonat = gesamtJahr / 12
  const kostenProKm = kmJahr > 0 ? gesamtJahr / kmJahr : 0

  return {
    jahresverbrauch,
    energieEinheitMenge: form.kraftstoff === 'elektro' ? 'kWh' : 'l',
    energieJahr,
    energieMonat: energieJahr / 12,
    versicherungMonat: versicherungJahr / 12,
    steuerMonat: steuerJahr / 12,
    wartungMonat: wartungJahr / 12,
    reifenMonat: reifenJahr / 12,
    garageMonat,
    finanzierungMonat,
    wertverlustMonat: wertverlustJahr / 12,
    gesamtMonat,
    gesamtJahr,
    kostenProKm,
  }
}

// ── Formatierung ────────────────────────────────────────────────────────────

/** '1.234,56 €' — immer 2 Nachkommastellen, deutscher Stil. */
export function formatEuro(n: number): string {
  const sicher = Number.isFinite(n) ? n : 0
  return sicher.toLocaleString('de-DE', {
    style: 'currency', currency: 'EUR', minimumFractionDigits: 2, maximumFractionDigits: 2,
  })
}

/** Kosten pro Kilometer — sinnvoll auf Cent gerundet, z. B. '0,34 €'. */
export function formatProKm(n: number): string {
  const sicher = Number.isFinite(n) ? n : 0
  return `${sicher.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} €`
}

export function formatMenge(n: number, einheit: string): string {
  const sicher = Number.isFinite(n) ? n : 0
  return `${sicher.toLocaleString('de-DE', { maximumFractionDigits: 0 })} ${einheit}`
}

// ── Persistenz (localStorage) — nur EINE letzte Eingabe, keine History ──────

const FORM_KEY = 'vira.autokosten.form'

export function speichereForm(form: AutokostenForm): void {
  try { localStorage.setItem(FORM_KEY, JSON.stringify(form)) } catch { /* privat/voll: egal */ }
}

export function ladeForm(): AutokostenForm | null {
  try {
    const roh = localStorage.getItem(FORM_KEY)
    if (!roh) return null
    const obj = JSON.parse(roh)
    if (!obj || typeof obj !== 'object') return null
    // nur bekannte Felder übernehmen, Rest aus EMPTY_FORM
    const out: AutokostenForm = { ...EMPTY_FORM }
    for (const k of Object.keys(EMPTY_FORM) as (keyof AutokostenForm)[]) {
      if (typeof obj[k] === 'string') (out[k] as string) = obj[k]
    }
    if (obj.kraftstoff === 'benzin' || obj.kraftstoff === 'diesel' || obj.kraftstoff === 'elektro') {
      out.kraftstoff = obj.kraftstoff
    }
    return out
  } catch {
    return null
  }
}

export function loescheForm(): void {
  try { localStorage.removeItem(FORM_KEY) } catch { /* egal */ }
}
