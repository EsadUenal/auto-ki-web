import { berechne, type AutokostenForm } from '../autokosten/logic'
import { HERO_KANDIDAT } from './heroFixture'

/**
 * Ein einziges Fahrzeug trägt die gesamte Scroll-Story: BMW 1er F40 118i.
 *
 * FINDEN → VERSTEHEN → PRÜFEN → ENTSCHEIDEN zeigen nacheinander dasselbe Auto.
 * Das ist die eigentliche Aussage der Seite — die Werkzeuge greifen ineinander,
 * statt nebeneinanderzustehen. Ein Wechsel des Fahrzeugs zwischen den Schritten
 * würde genau diesen Punkt zerstören.
 *
 * HERKUNFT DER DATEN — ALLES ECHT, NICHTS ERFUNDEN
 * ------------------------------------------------
 * - Kandidat, Passung, Preisspanne: reale Antwort von /api/v1/autofinder
 *   (siehe heroFixture.ts)
 * - Technische Werte und Schwachstellen: die kanonische Fahrzeugdatenbank
 *   (Tabellen `motorvariante`, `baureihe`, `schwachstelle_baureihe`)
 * - Autokosten: die ECHTE Rechenfunktion des Produkts (`autokosten/logic.ts`),
 *   nicht nachgebaute Zahlen. Ändert sich die Formel, ändert sich die
 *   Landingpage mit — sie kann gar nicht auseinanderlaufen.
 *
 * Die Schwachstelle „Bremsen (M135i/128ti)" steht bewusst NICHT hier: sie
 * betrifft die stärkeren Modelle, nicht den 118i. Sie auf der Startseite einem
 * Fahrzeug zuzuschreiben, für das sie nicht gilt, wäre eine Falschaussage über
 * ein reales Produkt — auch wenn es „nur Marketing" ist.
 *
 * KEINE PROVIDER-AUFRUFE. Diese Datei ist statisch; die Landingpage verursacht
 * keine variablen Kosten.
 */

export const SHOWCASE_FAHRZEUG = HERO_KANDIDAT

/** Technische Eckdaten des 118i aus `motorvariante`. */
export const SHOWCASE_TECHNIK = {
  hubraumCcm: 1499,
  zylinder: 3,
  leistungPs: 140,
  drehmomentNm: 220,
  verbrauchWltp: 5.9,
  verbrauchReal: 6.5,
  co2GKm: 135,
  neupreisCa: 32000,
} as const

/** Aus `baureihe` (bmw-1er-f40). */
export const SHOWCASE_BAUREIHE = {
  euroNcapSterne: 5,
  euroNcapJahr: 2019,
  wartungOelKm: 30000,
  huIntervall: 'Alle 2 Jahre',
} as const

/** Schwachstellen der Baureihe, die den 118i betreffen (Tabelle `schwachstelle_baureihe`). */
export const SHOWCASE_SCHWACHSTELLEN = [
  {
    bauteil: 'Software / Infotainment',
    baujahre: '2019–2021',
    schweregrad: 'gering' as const,
    kurz: 'Frühe Baujahre zeigen gelegentlich Bugs im iDrive 7, meist per Update behebbar.',
  },
  {
    bauteil: 'Fahrwerk (Knarzgeräusche)',
    baujahre: '2019–2022',
    schweregrad: 'gering' as const,
    kurz: 'Knarzen an der Vorderachse bei niedrigem Tempo, oft Gummilager oder Stabilisatoren.',
  },
]

/**
 * Eingaben der Beispielrechnung.
 *
 * Verbrauch und Kaufpreis stammen aus den echten Daten (Realverbrauch 6,5 l,
 * Mitte der ermittelten Preisspanne). Versicherung, Steuer, Wartung, Reifen
 * und Wertverlust sind ANNAHMEN — im Produkt gibt der Nutzer sie selbst ein.
 * Die Landingpage weist sie deshalb sichtbar als Annahmen aus, statt sie wie
 * ein Ergebnis aussehen zu lassen.
 */
export const SHOWCASE_KOSTEN_FORM: AutokostenForm = {
  kaufpreis: '20750',
  kraftstoff: 'benzin',
  verbrauch: '6,5',
  kmProJahr: '15000',
  preisBenzin: '1,75',
  preisDiesel: '',
  preisStrom: '',
  versicherungJahr: '780',
  steuerJahr: '112',
  wartungJahr: '540',
  reifenJahr: '260',
  garageMonat: '',
  finanzierungMonat: '',
  wertverlustJahr: '1900',
}

/** Ergebnis der ECHTEN Produktrechnung — einmal beim Laden des Moduls. */
export const SHOWCASE_KOSTEN = berechne(SHOWCASE_KOSTEN_FORM)

/** Die Kostenbestandteile für die Aufschlüsselung, absteigend nach Anteil. */
export const SHOWCASE_KOSTEN_TEILE = [
  { label: 'Wertverlust',  monat: SHOWCASE_KOSTEN.wertverlustMonat },
  { label: 'Kraftstoff',   monat: SHOWCASE_KOSTEN.energieMonat },
  { label: 'Versicherung', monat: SHOWCASE_KOSTEN.versicherungMonat },
  { label: 'Wartung',      monat: SHOWCASE_KOSTEN.wartungMonat },
  { label: 'Reifen',       monat: SHOWCASE_KOSTEN.reifenMonat },
  { label: 'Kfz-Steuer',   monat: SHOWCASE_KOSTEN.steuerMonat },
].sort((a, b) => b.monat - a.monat)

/** Die vier Schritte der Story — auch die Sprungmarken der Sticky-Navigation. */
export const STORY_SCHRITTE = [
  { id: 'finden',      label: 'Finden',      kicker: 'AutoFinder' },
  { id: 'verstehen',   label: 'Verstehen',   kicker: 'Autokosten' },
  { id: 'pruefen',     label: 'Prüfen',      kicker: 'KaufCheck' },
  { id: 'entscheiden', label: 'Entscheiden', kicker: 'Dein Ergebnis' },
] as const

/** Die Suchanforderungen, die im Hero sichtbar „eingegeben" werden. */
export const SHOWCASE_ANFORDERUNGEN = [
  { label: 'Budget',       wert: '12.000 – 22.000 €' },
  { label: 'Karosserie',   wert: 'Kompakt' },
  { label: 'Kraftstoff',   wert: 'Benzin' },
  { label: 'Nutzung',      wert: 'Gemischt' },
  { label: 'Wichtig',      wert: 'Sparsam · Praktisch' },
]

/** Die weiteren Treffer desselben realen Laufs — für die Ergebnisliste. */
export const SHOWCASE_WEITERE = [
  { marke: 'Hyundai', modell: 'i20',   generation: 'Dritte Generation', motor: '1.0 T-GDI',   ps: 100, fit: 93 },
  { marke: 'Opel',    modell: 'Corsa', generation: 'F',                 motor: '1.2 (100 PS)', ps: 100, fit: 93 },
  { marke: 'Audi',    modell: 'A1',    generation: 'GB',                motor: '25 TFSI',      ps: 95,  fit: 93 },
]

/** Was im Plus-Tarif monatlich enthalten ist (Pricing V1, unverändert). */
export const PLUS_KONTINGENTE = [
  { label: 'KaufChecks',        anzahl: 5,   einheit: 'pro Monat' },
  { label: 'VerkaufsCheck',     anzahl: 1,   einheit: 'pro Monat' },
  { label: 'AutoFinder-Suchen', anzahl: 50,  einheit: 'pro Monat' },
  { label: 'KI-Chat',           anzahl: 100, einheit: 'Nachrichten' },
] as const
