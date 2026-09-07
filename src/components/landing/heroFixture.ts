import type { AutoFinderKandidat } from '../autofinder/logic'

/**
 * Produktvorschau der Landingpage — ECHTE AutoFinder-Daten, keine Erfindung.
 *
 * Dieser Datensatz stammt 1:1 aus einer realen Antwort von
 * POST /api/v1/autofinder (Budget 12.000–22.000 €, Kompaktklasse, Benzin,
 * gemischte Nutzung, Prioritäten sparsam + praktisch). Marke, Modell,
 * Generation, Motor, Leistung, Baujahr, Passung und die Begründungen sind
 * unverändert übernommen.
 *
 * WARUM EINE FESTE KOPIE UND KEIN LIVE-CALL
 * -----------------------------------------
 * Die Landingpage darf keine Suche auslösen: das wären Provider-Kosten und
 * eine Wartezeit bei jedem Seitenaufruf — und beim anonymen Besucher würde es
 * seine eine kostenlose Demo-Suche verbrauchen, bevor er überhaupt geklickt
 * hat. Die Vorschau ist deshalb statisch.
 *
 * WAS HIER NICHT PASSIEREN DARF
 * -----------------------------
 * Keine geschönten Werte. Die Passung von 93 %, die Preisspanne und der
 * Budget-Status sind genau die berechneten — auch der Umstand, dass dieses
 * Fahrzeug NEAR_BUDGET ist und nicht glatt im Budget liegt. Eine Vorschau,
 * die besser aussieht als das Produkt, ist ein Versprechen, das die Software
 * danach nicht hält.
 *
 * Die Bildfelder tragen leere Werte: AutoFinder zeigt keine Fahrzeugbilder,
 * und die Landingpage verwendet ausschliesslich das VehicleIdentityPanel.
 */
export const HERO_KANDIDAT: AutoFinderKandidat = {
  candidate_id: 'bmw-1er-f40-118i',
  baureihe_id: 'bmw-1er-f40',
  variante_id: 'bmw-1er-f40-118i',
  marke: 'BMW',
  modell: '1er',
  generation: 'F40',
  motor: '118i',
  baujahr_von: 2019,
  baujahr_bis: null,
  leistung_ps: 140,
  kraftstoff: 'Benzin',
  getriebe: ['automatik', 'manuell'],
  antrieb: 'Front',
  karosserie: ['kompakt'],
  match_score: 8.5,
  datenqualitaet: 1.0,
  match_gruende: [],
  trade_offs: [],
  budget_status: 'NEAR_BUDGET',
  budget_confidence: 'HIGH',
  base_match_score: 8.0,
  budget_adjustment: 0.5,
  source_type: 'internal_db',
  visual_key: 'bmw--1er--f40',
  source_urls: [],
  evidence_count: 0,
  discovery_confidence: '',
  web_verified_fields: [],
  market_price_min: null,
  market_price_max: null,
  market_price_median: null,
  market_data_quality: null,
  market_sample_size: null,
  image_url: '',
  image_type: 'generic_fallback',
  image_confidence: '',
  ai_generated: false,
  user_fit: 93,
  user_fit_gruende: [],
  why_fits: [
    'Erfüllt den Wunsch nach einem vollwertigen Kompaktklasse-Benziner mit solider Verarbeitungsqualität.',
    'Mit 140 PS und 220 Nm Drehmoment sehr agil und souverän für das gemischte Nutzungsprofil.',
    'Passt als junger Gebrauchter gut in den oberen Bereich des Budgets (bis 22.000 EUR).',
  ],
  known_points: [],
  enrichment_status: 'ok',
  estimated_price_min: 18000,
  estimated_price_max: 23500,
  price_confidence: 'HIGH',
}
