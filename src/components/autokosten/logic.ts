// Autokosten-Rechner — framework-freie, VOLL DETERMINISTISCHE Logik.
//
// Diese Datei importiert bewusst NICHTS aus React: reine Arithmetik + Validierung
// + localStorage-Persistenz. Kein Gemini, kein Tavily, keine Marktdaten. Direkt
// per `node --test` geprüft (src/components/autokosten/autokosten.test.ts).
//
// SINGLE SOURCE OF TRUTH
// ----------------------
// `berechne()` ist die EINZIGE Rechenstelle. Ergebnisanzeige, Was-wäre-wenn-
// Simulator und der A/B-Vergleich rufen alle exakt diese Funktion auf — es gibt
// keine zweite Formel, die auseinanderlaufen könnte. Gerundet wird ausschließlich
// in der Darstellung (`formatEuro` & Co.), nie im Rechenkern.
//
// LAUFENDE AUSGABEN ≠ WIRTSCHAFTLICHE KOSTEN
// ------------------------------------------
// Zwei getrennte Kennzahlen, beide direkt aus den Angaben:
//
//   laufendeCashMonat   = Energie + Fixkosten + Stellplatz, als MONATSDURCHSCHNITT
//                         (jährliche und unregelmäßige Zahlungen sind rechnerische Monatsanteile,
//                         keine tatsächliche monatliche Abbuchung)
//   wirtschaftlichMonat = laufende Ausgaben + Wertverlust
//                         (Wertverlust ist ein wirtschaftlicher Aufwand, keine Abbuchung)
//
// Fehlende Angaben: Versicherung, Steuer, Wartung und Reifen können leer sein (nicht angegeben)
// oder ausdrücklich 0 (fällt nicht an). Leer wird wie 0 gerechnet, aber als FEHLEND benannt: das
// Ergebnis ist dann eine Zwischensumme. Es wird nie ein Wert erfunden.

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
  wertverlustJahr: string     // €/Jahr — leer = nicht berücksichtigt
  budgetMonat: string         // €/Monat — optionales Monatsbudget für LAUFENDE Ausgaben
}

export const EMPTY_FORM: AutokostenForm = {
  kaufpreis: '', kraftstoff: 'benzin', verbrauch: '', kmProJahr: '',
  preisBenzin: '', preisDiesel: '', preisStrom: '',
  versicherungJahr: '', steuerJahr: '', wartungJahr: '', reifenJahr: '',
  garageMonat: '', wertverlustJahr: '', budgetMonat: '',
}

/** BEISPIELWERTE — ausdrücklich Demo-Zahlen, KEINE Marktdurchschnitte und keine
 *  aktuellen Preise. Die Energiepreise bleiben hier bewusst leer: dafür gibt es
 *  die amtliche Deutschland-Referenz (siehe `kraftstoffReferenz.ts`), und ein
 *  veralteter Platzhalter (früher 1,75 €/l) sah im Ergebnis wie ein echter Preis
 *  aus. Der Nutzer überschreibt ohnehin alles. */
export const BEISPIEL_FORM: AutokostenForm = {
  kaufpreis: '20000', kraftstoff: 'benzin', verbrauch: '6,5', kmProJahr: '15000',
  preisBenzin: '', preisDiesel: '', preisStrom: '',
  versicherungJahr: '900', steuerJahr: '150', wartungJahr: '600', reifenJahr: '300',
  garageMonat: '', wertverlustJahr: '2000', budgetMonat: '',
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

/** Optionales Feld, bei dem "leer" etwas anderes bedeutet als "0". */
function parseLeerbar(roh: string): number | null {
  return (roh ?? '').trim() === '' ? null : parseZahl(roh)
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
  { feld: 'wertverlustJahr', label: 'Wertverlust' },
  { feld: 'budgetMonat', label: 'Monatsbudget' },
]

export function energiePreisFeld(k: Kraftstoff): keyof AutokostenForm {
  return k === 'diesel' ? 'preisDiesel' : k === 'elektro' ? 'preisStrom' : 'preisBenzin'
}
export function energieEinheit(k: Kraftstoff): string {
  return k === 'elektro' ? '€/kWh' : '€/l'
}
export function energieLabel(k: Kraftstoff): string {
  return k === 'elektro' ? 'Strompreis / dein Ladepreis' : k === 'diesel' ? 'Dieselpreis' : 'Benzinpreis'
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
  const pLabel = form.kraftstoff === 'elektro' ? 'Ladepreis' : form.kraftstoff === 'diesel' ? 'Dieselpreis' : 'Benzinpreis'
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

// ── Fehlende Angaben ────────────────────────────────────────────────────────

/** Positionen, deren Fehlen das Ergebnis zur Zwischensumme macht. Leer = nicht angegeben,
 *  ausdrücklich 0 = gültige Nutzerannahme (fällt nicht an). */
export const LAUFEND_PFLICHT: { feld: keyof AutokostenForm; label: string }[] = [
  { feld: 'versicherungJahr', label: 'Versicherung' },
  { feld: 'steuerJahr', label: 'Kfz-Steuer' },
  { feld: 'wartungJahr', label: 'Wartung / Inspektion' },
  { feld: 'reifenJahr', label: 'Reifen' },
]

export function fehlendeLaufendeAngaben(form: AutokostenForm): string[] {
  return LAUFEND_PFLICHT.filter(({ feld }) => ((form[feld] as string) ?? '').trim() === '').map((p) => p.label)
}

/** Satz zu fehlenden Positionen, "" wenn nichts fehlt. */
export function fehlendText(fehlend: string[]): string {
  return fehlend.length === 0 ? '' : `Es fehlen: ${fehlend.join(', ')}.`
}

// ── Berechnung (deterministisch) ────────────────────────────────────────────

export type PostenKey =
  | 'energie' | 'versicherung' | 'steuer' | 'wartung' | 'reifen' | 'garage' | 'wertverlust'

export interface Posten {
  key: PostenKey
  label: string
  jahr: number
  monat: number
  /** Anteil an den wirtschaftlichen Kosten in Prozent (0–100, ungerundet). */
  anteil: number
  /** false = Wertverlust: wirtschaftlich real, fließt aber nicht monatlich vom Konto. */
  cash: boolean
}

export interface AutokostenErgebnis {
  // Energie
  jahresverbrauch: number       // l bzw. kWh pro Jahr
  energieEinheitMenge: 'l' | 'kWh'
  energieJahr: number
  energieMonat: number
  energieJe100km: number        // € je 100 km

  // Aufschlüsselung
  posten: Posten[]              // absteigend nach Jahreskosten, nur > 0

  // A) wirtschaftliche Kosten — laufende Ausgaben PLUS Wertverlust
  wirtschaftlichJahr: number
  wirtschaftlichMonat: number
  kostenProKm: number
  hatWertverlust: boolean
  wertverlustJahr: number

  // B) laufende Ausgaben im Monatsdurchschnitt (ohne Wertverlust)
  laufendeCashJahr: number      // wirtschaftlich minus Wertverlust
  laufendeCashMonat: number

  // Vollständigkeit: fehlende (leere) Pflichtpositionen und was daraus folgt
  fehlendLaufend: string[]              // z. B. ['Versicherung', 'Wartung'], leer = vollständig
  laufendUnvollstaendig: boolean        // laufende Ausgaben sind eine Zwischensumme
  wirtschaftlichUnvollstaendig: boolean // Wertverlust oder laufende Position fehlt

  // Projektion unter unveränderten Annahmen
  projektion: { jahre: number; kosten: number }[]
}

const PROJEKTIONS_JAHRE = [1, 3, 5]

/**
 * Verbrenner:
 *   jahresverbrauch = km_jahr / 100 * liter_100km
 *   energie_jahr    = jahresverbrauch * preis_liter
 * Elektro analog mit kWh / Ladepreis.
 *
 * wirtschaftlich_jahr = energie + versicherung + steuer + wartung + reifen
 *                       + garage*12 + wertverlust
 * wirtschaftlich_monat = wirtschaftlich_jahr / 12
 * kosten_pro_km        = wirtschaftlich_jahr / km_jahr   (km_jahr > 0)
 * laufende_ausgaben_monat = (wirtschaftlich_jahr - wertverlust)/12   (Monatsdurchschnitt)
 *
 * Setzt eine zuvor bestandene `validate()` voraus.
 */
export function berechne(form: AutokostenForm): AutokostenErgebnis {
  const kmJahr = parseZahl(form.kmProJahr)
  const verbrauch100 = parseZahl(form.verbrauch)
  const preis = parseZahl(form[energiePreisFeld(form.kraftstoff)] as string)

  const kmSicher = Number.isFinite(kmJahr) ? kmJahr : 0
  const verbrauchSicher = Number.isFinite(verbrauch100) ? verbrauch100 : 0
  const preisSicher = Number.isFinite(preis) ? preis : 0

  const jahresverbrauch = (kmSicher / 100) * verbrauchSicher
  const energieJahr = jahresverbrauch * preisSicher
  const energieJe100km = verbrauchSicher * preisSicher

  const versicherungJahr = parseOptional(form.versicherungJahr) || 0
  const steuerJahr = parseOptional(form.steuerJahr) || 0
  const wartungJahr = parseOptional(form.wartungJahr) || 0
  const reifenJahr = parseOptional(form.reifenJahr) || 0
  const garageMonat = parseOptional(form.garageMonat) || 0
  const wertverlustRoh = parseLeerbar(form.wertverlustJahr)
  const hatWertverlust = wertverlustRoh !== null && Number.isFinite(wertverlustRoh)
  const wertverlustJahr = hatWertverlust ? (wertverlustRoh as number) : 0

  const wirtschaftlichJahr =
    energieJahr + versicherungJahr + steuerJahr + wartungJahr + reifenJahr +
    garageMonat * 12 + wertverlustJahr

  const wirtschaftlichMonat = wirtschaftlichJahr / 12
  const kostenProKm = kmSicher > 0 ? wirtschaftlichJahr / kmSicher : 0

  const laufendeCashJahr = wirtschaftlichJahr - wertverlustJahr
  const fehlendLaufend = fehlendeLaufendeAngaben(form)
  const laufendeCashMonat = laufendeCashJahr / 12

  const roh: { key: PostenKey; label: string; jahr: number; cash: boolean }[] = [
    { key: 'energie', label: form.kraftstoff === 'elektro' ? 'Strom' : 'Kraftstoff', jahr: energieJahr, cash: true },
    { key: 'versicherung', label: 'Versicherung', jahr: versicherungJahr, cash: true },
    { key: 'steuer', label: 'Kfz-Steuer', jahr: steuerJahr, cash: true },
    { key: 'wartung', label: 'Wartung / Inspektion', jahr: wartungJahr, cash: true },
    { key: 'reifen', label: 'Reifen', jahr: reifenJahr, cash: true },
    { key: 'garage', label: 'Stellplatz / Garage', jahr: garageMonat * 12, cash: true },
    { key: 'wertverlust', label: 'Wertverlust', jahr: wertverlustJahr, cash: false },
  ]
  const posten: Posten[] = roh
    .filter((p) => p.jahr > 0)
    .map((p) => ({
      ...p,
      monat: p.jahr / 12,
      anteil: wirtschaftlichJahr > 0 ? (p.jahr / wirtschaftlichJahr) * 100 : 0,
    }))
    .sort((a, b) => b.jahr - a.jahr)

  return {
    jahresverbrauch,
    energieEinheitMenge: form.kraftstoff === 'elektro' ? 'kWh' : 'l',
    energieJahr,
    energieMonat: energieJahr / 12,
    energieJe100km,
    posten,
    wirtschaftlichJahr,
    wirtschaftlichMonat,
    kostenProKm,
    hatWertverlust,
    wertverlustJahr,
    laufendeCashJahr,
    laufendeCashMonat,
    fehlendLaufend,
    laufendUnvollstaendig: fehlendLaufend.length > 0,
    wirtschaftlichUnvollstaendig: fehlendLaufend.length > 0 || !hatWertverlust,
    projektion: PROJEKTIONS_JAHRE.map((jahre) => ({ jahre, kosten: wirtschaftlichJahr * jahre })),
  }
}

// ── Erkenntnisse (rein aus den berechneten Zahlen) ──────────────────────────

export interface Insight { key: string; text: string }

/**
 * Deterministische Aussagen über DIESE Rechnung — keine Vergleichswerte anderer
 * Nutzer, keine Bevölkerungsdaten, kein Score. Jede Zahl stammt aus `berechne()`.
 */
export function baueInsights(e: AutokostenErgebnis, form: AutokostenForm): Insight[] {
  const out: Insight[] = []
  const [top, zweit] = e.posten
  if (top) {
    out.push({
      key: 'top1',
      text: `Dein größter Kostenblock ist ${top.label}: ${formatEuro(top.monat)} pro Monat `
        + `(${formatProzent(top.anteil)} deiner wirtschaftlichen Autokosten).`,
    })
  }
  if (top && zweit) {
    const zusammen = top.anteil + zweit.anteil
    out.push({
      key: 'top2',
      text: `${top.label} und ${zweit.label} machen zusammen rund ${formatProzent(zusammen)} aus `
        + `(${formatEuro(top.monat + zweit.monat)} pro Monat).`,
    })
  }
  if (e.energieJahr > 0) {
    const mengeLabel = e.energieEinheitMenge === 'kWh' ? 'kWh' : 'Liter'
    out.push({
      key: 'energie',
      text: `Energie kostet dich ${formatEuro(e.energieJe100km)} je 100 km. `
        + `${formatMenge(e.jahresverbrauch, mengeLabel)} im Jahr.`,
    })
  }
  if (e.hatWertverlust) {
    out.push({
      key: 'cash',
      text: `Deine laufenden Ausgaben liegen im Monatsdurchschnitt bei ${formatEuro(e.laufendeCashMonat)}. `
        + `Der Wertverlust ist ein wirtschaftlicher Aufwand, keine monatliche Abbuchung; mit ihm kostet `
        + `dich das Auto wirtschaftlich ${formatEuro(e.wirtschaftlichMonat)} pro Monat.`,
    })
  } else {
    out.push({
      key: 'kein-wertverlust',
      text: 'Ohne Angabe zum Wertverlust fehlt die wirtschaftliche Gesamtsicht. Angezeigt werden nur die '
        + 'laufenden Ausgaben; der tatsächliche wirtschaftliche Aufwand liegt höher.',
    })
  }
  const kaufpreis = parseZahl(form.kaufpreis)
  if (Number.isFinite(kaufpreis) && kaufpreis > 0) {
    const fuenf = e.wirtschaftlichJahr * 5
    const faktor = formatFaktor(fuenf / kaufpreis)
    // Die Rechengröße ist wirtschaftlichJahr x 5. Vollständig nur mit Wertverlust UND allen Pflichtpositionen.
    const text = e.wirtschaftlichUnvollstaendig
      ? `Bei gleichbleibenden Annahmen summieren sich die bisher erfassten Kosten in fünf Jahren auf `
        + `${formatEuro(fuenf)}. Das ist eine Zwischensumme, keine vollständigen wirtschaftlichen Gesamtkosten. `
        + `Sie ist das ${faktor} des Kaufpreises.`
      : `Bei gleichbleibenden Annahmen summieren sich die wirtschaftlichen Kosten inklusive Wertverlust in `
        + `fünf Jahren auf ${formatEuro(fuenf)}. Das ist das ${faktor} des Kaufpreises.`
    out.push({ key: 'kaufpreis-relation', text })
  }
  return out
}

// ── Budget-Check ────────────────────────────────────────────────────────────

export interface BudgetCheck {
  budgetMonat: number
  /** Laufende Ausgaben im Monatsdurchschnitt (Bezugsgröße des Status). */
  laufendMonat: number
  /** Wirtschaftliche Kosten inklusive Wertverlust — zur Orientierung daneben, nicht Bezugsgröße. */
  wirtschaftlichMonat: number
  differenz: number            // laufend minus Budget; + = über Budget
  /** 'offen' = laufende Ausgaben unvollständig und nicht schon über dem Budget: kein "unter Budget". */
  status: 'unter' | 'gleich' | 'ueber' | 'offen'
  unvollstaendig: boolean
  fehlend: string[]
  text: string
}

/**
 * Vergleicht die LAUFENDEN Ausgaben im Monatsdurchschnitt mit dem selbst gesetzten Monatsbudget für
 * laufende Ausgaben. Der Wertverlust ist ein wirtschaftlicher Aufwand und bleibt daneben sichtbar.
 * Fehlen laufende Positionen, ist der Wert eine Zwischensumme: "unter Budget" wird dann nicht
 * behauptet, "über Budget" nur als Aussage über die bekannten Ausgaben. Keine Finanzberatung.
 * `null`, wenn kein Budget eingegeben wurde — dann entfällt der ganze Bereich.
 */
export function budgetCheck(e: AutokostenErgebnis, form: AutokostenForm): BudgetCheck | null {
  const budget = parseLeerbar(form.budgetMonat)
  if (budget === null || !Number.isFinite(budget) || budget <= 0) return null
  const laufend = e.laufendeCashMonat
  const differenz = laufend - budget
  const unvollstaendig = e.laufendUnvollstaendig
  const rohStatus: 'unter' | 'gleich' | 'ueber' =
    Math.abs(differenz) < 0.005 ? 'gleich' : differenz > 0 ? 'ueber' : 'unter'
  const status: BudgetCheck['status'] = unvollstaendig && rohStatus !== 'ueber' ? 'offen' : rohStatus
  const fehlt = fehlendText(e.fehlendLaufend)
  let text: string
  if (status === 'ueber') {
    text = unvollstaendig
      ? `Schon die bekannten laufenden Ausgaben liegen im Monatsdurchschnitt etwa ${formatEuro(differenz)} über `
        + `deinem Monatsbudget. Das ist eine Zwischensumme, mit den fehlenden Positionen wird es mehr. ${fehlt}`
      : `Deine laufenden Ausgaben liegen im Monatsdurchschnitt etwa ${formatEuro(differenz)} über deinem Monatsbudget.`
  } else if (status === 'offen') {
    text = `Die bekannten laufenden Ausgaben liegen im Monatsdurchschnitt bei ${formatEuro(laufend)} und damit `
      + `${formatEuro(Math.abs(differenz))} ${differenz < 0 ? 'unter' : 'genau auf'} deinem Monatsbudget. `
      + `Das ist eine Zwischensumme: ein Restbudget lässt sich erst mit allen Angaben nennen. ${fehlt}`
  } else if (status === 'unter') {
    text = `Deine laufenden Ausgaben liegen im Monatsdurchschnitt etwa ${formatEuro(-differenz)} unter deinem Monatsbudget.`
  } else {
    text = 'Deine laufenden Ausgaben treffen dein Monatsbudget im Monatsdurchschnitt genau.'
  }
  return {
    budgetMonat: budget, laufendMonat: laufend, wirtschaftlichMonat: e.wirtschaftlichMonat,
    differenz, status, unvollstaendig, fehlend: e.fehlendLaufend, text,
  }
}

// ── A/B-Vergleich ───────────────────────────────────────────────────────────

export interface VergleichPosten { key: PostenKey; label: string; differenzMonat: number }

export interface Vergleich {
  monat: number                 // B minus A
  jahr: number
  dreiJahre: number
  fuenfJahre: number
  proKm: number
  /** Größte Treiber der Differenz, absteigend nach Betrag. Nur ≠ 0. */
  treiber: VergleichPosten[]
}

/** Reine Differenzrechnung aus zwei `berechne()`-Ergebnissen. Kein Urteil,
 *  keine Empfehlung: welches Auto "besser" ist, entscheidet der Nutzer. */
export function vergleiche(a: AutokostenErgebnis, b: AutokostenErgebnis): Vergleich {
  const keys = new Set<PostenKey>([...a.posten.map((p) => p.key), ...b.posten.map((p) => p.key)])
  const treiber: VergleichPosten[] = []
  for (const key of keys) {
    const pa = a.posten.find((p) => p.key === key)
    const pb = b.posten.find((p) => p.key === key)
    const differenzMonat = (pb?.monat ?? 0) - (pa?.monat ?? 0)
    if (Math.abs(differenzMonat) < 0.005) continue
    treiber.push({ key, label: pb?.label ?? pa?.label ?? key, differenzMonat })
  }
  treiber.sort((x, y) => Math.abs(y.differenzMonat) - Math.abs(x.differenzMonat))
  const monat = b.wirtschaftlichMonat - a.wirtschaftlichMonat
  const jahr = b.wirtschaftlichJahr - a.wirtschaftlichJahr
  return {
    monat, jahr, dreiJahre: jahr * 3, fuenfJahre: jahr * 5,
    proKm: b.kostenProKm - a.kostenProKm,
    treiber,
  }
}

/** Auto B vorbelegen: gemeinsame NUTZUNGSannahmen übernehmen, fahrzeugspezifische
 *  Werte (Preis, Verbrauch, Versicherung, Steuer, Wartung, Reifen, Wertverlust)
 *  bewusst NICHT — die gehören zum anderen Auto. */
export function starteVergleich(a: AutokostenForm): AutokostenForm {
  return {
    ...EMPTY_FORM,
    kraftstoff: a.kraftstoff,
    kmProJahr: a.kmProJahr,
    garageMonat: a.garageMonat,
    budgetMonat: a.budgetMonat,
    preisBenzin: a.preisBenzin,
    preisDiesel: a.preisDiesel,
    preisStrom: a.preisStrom,
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

/** Ohne Nachkommastellen — für große Summen (Projektion, Vergleich). */
export function formatEuroKurz(n: number): string {
  const sicher = Number.isFinite(n) ? n : 0
  return sicher.toLocaleString('de-DE', {
    style: 'currency', currency: 'EUR', minimumFractionDigits: 0, maximumFractionDigits: 0,
  })
}

/** Mit Vorzeichen — für Differenzen ('+127 €', '−34 €'). */
export function formatDelta(n: number, kurz = true): string {
  const sicher = Number.isFinite(n) ? n : 0
  if (Math.abs(sicher) < 0.005) return '±0 €'
  const betrag = kurz ? formatEuroKurz(Math.abs(sicher)) : formatEuro(Math.abs(sicher))
  return `${sicher > 0 ? '+' : '−'}${betrag}`
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

export function formatProzent(n: number): string {
  const sicher = Number.isFinite(n) ? n : 0
  return `${sicher.toLocaleString('de-DE', { maximumFractionDigits: 0 })} %`
}

function formatFaktor(n: number): string {
  const sicher = Number.isFinite(n) ? n : 0
  return `${sicher.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}-fache`
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
    // Nur bekannte Felder übernehmen, Rest aus EMPTY_FORM. Alte, nicht mehr bekannte Schlüssel (z. B. eine
    // früher gespeicherte Rate) werden hier ignoriert und beim nächsten Speichern nicht mehr geschrieben.
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
