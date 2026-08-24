export type SourceType = 'datenbank' | 'web' | 'gemischt' | 'gespräch' | 'unbekannt'
export type TrustLevel = 'hoch' | 'mittel' | 'niedrig' | 'keine' | 'unbekannt'

export interface SourceMeta {
  source: SourceType
  trust_level: TrustLevel
  belege?: unknown[]
}

export interface Message {
  id: string
  role: 'user' | 'assistant'
  content: string
  meta?: SourceMeta
  streaming?: boolean
  statusText?: string
}

export interface CarContext {
  id: string
  titel: string
  img?: string        // Karten-Thumbnail in Entdecken
  imgAussen?: string  // Außenansicht-Panel im Chat
  imgMotor?: string   // Motor-Panel im Chat
  imgInnen?: string   // Röntgen/Innen-Panel im Chat
}

export interface Conversation {
  id: string
  backendId?: number   // gesetzt sobald die Konversation in der DB existiert
  title: string
  messages: Message[]
  createdAt: Date
  carContext?: CarContext  // gesetzt wenn aus Entdecken geöffnet
}

// ---- Provenance / Evidence (Phase 1) ----
// Spiegelt app/models.py (EvidenceQuelle / Insight). Alle Felder optional an den
// Check-Results, damit ALTE gespeicherte Checks ohne Evidence weiter funktionieren.
export interface EvidenceQuelle {
  typ: string
  ref?: string | null
  url?: string | null
  titel?: string | null
  qualitaet?: string | null
}

// Marktvergleich 2.0 — deterministisch berechnete Preisbewertung. Nur am
// Marktvergleich-Insight gesetzt. Alle Felder optional/backward-compatible.
export interface Preisbeobachtung {
  preis_eur: number
  kilometerstand?: number | null
  baujahr?: number | null
  quelle_domain?: string | null
  quelle_url?: string | null
  vergleichbarkeit: string   // "sehr_aehnlich" | "aehnlich" | "bedingt" | "ungeeignet"
  gruende: string[]
  // Reliability-Sprint 3 (§10-§13): Herkunftsart der Recherche-Seite — "listing"
  // (Einzelinserat) | "category" (Such-/Übersichtsseite) | "unknown". Optional, da
  // alte gespeicherte Checks das Feld nicht kennen.
  source_type?: string
}

export interface Marktanalyse {
  gefunden: number
  verwendet: number
  anzahl_sehr_aehnlich: number
  anzahl_aehnlich: number
  anzahl_bedingt: number
  median_eur?: number | null
  spanne_min_eur?: number | null
  spanne_max_eur?: number | null
  angebot_eur?: number | null
  differenz_eur?: number | null
  differenz_pct?: number | null
  datenqualitaet: string
  methode?: string | null
  quellen_domains: string[]
  beobachtungen: Preisbeobachtung[]
}

// Reliability-Sprint: kanonisches, deterministisches Preisurteil (§6/§7/§13).
// Genau EINE Quelle für alle Preis-Ausgaben (Zusammenfassung, Bericht, Findings).
export interface PriceAssessment {
  verdict: 'deutlich_unter' | 'unter' | 'marktgerecht' | 'oberes_segment' | 'ueber' | 'deutlich_ueber' | 'unbekannt' | string
  label: string
  median_eur?: number | null
  lower_bound_eur?: number | null
  upper_bound_eur?: number | null
  difference_eur?: number | null
  difference_percent?: number | null
  position_in_range?: string
  confidence?: string
  recommendation?: string
  begruendung?: string
}

// Reliability-Sprint / P0-1: Ergebnis der Quality-Gate-Pipeline.
// Aktuell vom Backend ausgeliefert: "completed_high" | "completed_medium" |
// "completed_no_market" (P0-1 — Check technisch vollständig, kein belastbarer
// Marktpreis; KEIN Fehler). "research_failed" ist ein LEGACY-Wert: er kann in
// alten gespeicherten Checks noch vorkommen, wird vom aktuellen Backend-Pfad für
// den Kaufcheck aber praktisch nicht mehr ausgeliefert (siehe
// app/routers/kaufcheck.py — der Zweig bleibt nur als Sicherheitsnetz stehen).
// Frontend-Code darf sich NICHT mehr auf "research_failed" als Normalfall
// verlassen — nur noch als defensiver Alt-Daten-Fall behandeln.
export type ResearchStatus =
  | 'completed_high'
  | 'completed_medium'
  | 'completed_no_market'
  | 'research_failed' // legacy — alte gespeicherte Checks
  | string

// Identity-Trust-Gate (car_lookup.find_baureihe_mit_vertrauen): wie verlässlich
// die erkannte Baureihe ist. "niedrig" -> keine fahrzeugspezifischen Aussagen.
export type IdentitaetKonfidenz = 'hoch' | 'niedrig' | string

// Technischer Web-Fallback: woher die TECHNISCHEN Fahrzeugdaten stammen.
// Getrennt von `quelle` (Gesamtlage inkl. Marktdaten) und `vertrauen`.
export type TechnicalCoverage = 'db' | 'db_plus_web' | 'web' | 'partial' | string

// Die per Webrecherche BELEGTE Fahrzeugidentität (nur wenn der DB-Pfad kein
// belastbares Profil liefert und die Recherche das Fahrzeug als reales
// Serienfahrzeug bestätigt). `belegt=false` -> alle Detailfelder leer, keine
// fahrzeugspezifische Aussage möglich (z.B. Fantasiebezeichnung).
export interface WebVehicleIdentity {
  belegt: boolean
  marke?: string | null
  modell?: string | null
  generation?: string | null
  bauzeitraum_von?: number | null
  bauzeitraum_bis?: number | null
  motor?: string | null
  kraftstoff?: string | null
  leistung_ps?: number | null
  confidence?: string | null
  belegende_domains?: number | null
  quellen?: EvidenceQuelle[]
}

// P1-4 — ergänzender Fahrzeugkontext aus der VIRA-Fahrzeugdatenbank. KEINE
// Evidence, KEINE Bewertung des Fahrzeugzustands — beschreibt die Baureihe
// allgemein (Segment, Erkennungsmerkmale, Herstellerintervalle). Alle Felder
// optional, nur echte Werte werden vom Backend gesetzt.
export interface Fahrzeugkontext {
  baureihe_id?: string | null
  generation?: string | null
  segment?: string | null
  vorgaenger?: string | null
  erkennung_generation?: string | null
  facelift_merkmale?: string | null
  wartung_oel_km?: number | null
  wartung_hu_intervall?: string | null
}

// P2-5 — EIN Wartungspunkt, dessen hinterlegtes Intervall in der Nähe der
// tatsächlichen Laufleistung liegt. AUSDRÜCKLICH KEINE Fälligkeitsaussage —
// VIRA weiß nicht, wann der letzte Service war. `hinweis` ist der bereits vom
// Backend fertig formulierte, P2-5-konforme Text (nie "fällig"/"überfällig").
export interface Wartungshinweis {
  bauteil: string
  status: 'naehert_sich' | 'im_bereich' | 'darueber' | string
  punkt_km: number
  punkt_bis_km?: number | null
  differenz_km: number
  intervall_text: string
  hinweis: string
  herkunft: 'db_wartung' | 'web_wartung' | string
  evidence_id: string
  quellen?: EvidenceQuelle[]
}

// P2-5 — Kilometerstand/Alter eingeordnet, plus relevante Wartungspunkte. KEINE
// Preisaussage, KEINE Modulo-Fälligkeit, KEINE Bewertung von km_pro_jahr
// (niedrig/hoch etc. — dafür gibt es bewusst keine belastbare Schwelle).
export interface Laufleistungskontext {
  kilometerstand?: number | null
  fahrzeugalter_jahre?: number | null
  km_pro_jahr?: number | null
  wartungshinweise: Wartungshinweis[]
  letzter_service_bekannt: boolean
}

// P1-3 — EINE konkrete, deterministisch abgeleitete Handlung vor dem Kauf.
// KEIN LLM beteiligt. `typ` trennt fahrzeugspezifisch (echte Evidence zu DIESEM
// Fahrzeug) von "basis" (allgemeiner Prüfstandard, behauptet nichts Konkretes).
export interface Kaufaktion {
  id: string
  bereich: 'besichtigung' | 'probefahrt' | 'verkaeuferfragen' | 'dokumente' | string
  typ: 'fahrzeugspezifisch' | 'basis' | string
  titel: string
  aktion: string
  prioritaet: 'kritisch' | 'hoch' | 'mittel' | 'basis' | string
  gruppe?: string | null
  hinweis?: string | null
  evidence_ids: string[]
  kategorie?: string | null
  schweregrad?: string | null
  kostenhinweis?: string | null
  rang: number
}

// EINE der vier Checklisten — fahrzeugspezifische Punkte ZUERST, dann der
// allgemeine Prüfstandard. Bewusst getrennt, nicht vorab zusammengeworfen.
export interface Pruefliste {
  bereich: string
  export_title: string
  fahrzeug?: string | null
  fahrzeugspezifisch: Kaufaktion[]
  basis: Kaufaktion[]
}

// P1-3 — der vollständige Prüfplan: vier eigenständige Checklisten. Additiv:
// alte gespeicherte Checks ohne dieses Feld -> vier leere Prüflisten (Backend-
// Default), niemals `undefined` beim aktuellen Backend — trotzdem optional
// getypt, damit sehr alte Checks (vor P1-3) nicht brechen.
export interface Kaufaktionen {
  besichtigung: Pruefliste
  probefahrt: Pruefliste
  verkaeuferfragen: Pruefliste
  dokumente: Pruefliste
}

export interface Insight {
  id: string
  kategorie: string
  titel: string
  beschreibung: string
  quellen_typen: string[]
  quellen: EvidenceQuelle[]
  confidence: string
  schweregrad?: string | null
  // Nur Rückrufe: wie sicher der Rückruf GENAU DIESES Fahrzeug betrifft — getrennt
  // von confidence & schweregrad. Reliability-Sprint 3 (§27/§28): "confirmed_by_vin"
  // (aktuell nie erzeugt, keine VIN-Prüfung im System) | "variant_match" |
  // "series_only" | "unclear" | "incompatible" (wird backend-seitig ausgeblendet).
  // Alte gespeicherte Checks können noch "exakt"|"wahrscheinlich"|"unklar" enthalten.
  applicability?: string | null
  einfluss?: string | null
  // Nur Marktvergleich-Insight: strukturierter deterministischer Marktvergleich.
  marktanalyse?: Marktanalyse | null
}

// Phase 2 — verdichtete Kern-Erkenntnis ("Das solltest du wissen"). Alle Felder
// optional an den Results, damit alte gespeicherte Checks weiter funktionieren.
export interface KeyFinding {
  id: string
  kategorie: string
  stufe: 'kritisch' | 'warnung' | 'chance' | 'info' | string
  icon?: string | null
  titel: string
  beschreibung: string
  wert?: string | null
  aktion?: string | null
  evidence_ids: string[]
  prioritaet: number
}

// ---- Phase 5: VIRA Dealer ----
export type DealerStatus = 'beobachtung' | 'einkauf_geplant' | 'im_bestand' | 'verkauft'

export interface DealerFinance {
  einkaufspreis?: number | null
  nebenkosten?: number | null
  gesamteinsatz?: number | null
  geplanter_verkaufspreis?: number | null
  moegliche_bruttomarge?: number | null
  moegliche_marge_pct?: number | null
  tatsaechlicher_verkaufspreis?: number | null
  realisierte_bruttomarge?: number | null
  realisierte_marge_pct?: number | null
  hinweis: string
}

export interface DealerViraKauf {
  vorhanden: boolean
  kaufcheck_id?: number | null
  empfehlung?: string | null
  preis_bewertung?: string | null
  markt_median?: number | null
  markt_min?: number | null
  markt_max?: number | null
  risiko_hinweise: string[]
  key_findings_count: number
}

export interface DealerViraVerkauf {
  vorhanden: boolean
  verkaufscheck_id?: number | null
  empfohlener_preis?: number | null
  markt_median?: number | null
  inserat_qualitaet?: string | null
  hat_optimierung: boolean
}

export interface DealerTriage {
  empfehlung: string   // kaufen | nach_pruefung | vorsicht | nicht_empfohlen | unklar
  preis: string        // guenstig | marktgerecht | teuer | unklar
  risiko: string       // gering | mittel | erhoeht | pruefen | unklar
  marge_eur?: number | null
}

export interface DealerVehicle {
  id: number
  marke?: string | null
  modell?: string | null
  baureihe?: string | null
  motor?: string | null
  baujahr?: number | null
  kilometerstand?: number | null
  status: DealerStatus
  interne_notiz?: string | null
  kaufcheck_id?: number | null
  verkaufscheck_id?: number | null
  created_at?: string | null
  updated_at?: string | null
  sold_at?: string | null
  finanzen: DealerFinance
  vira: DealerViraKauf
  verkauf: DealerViraVerkauf
  triage: DealerTriage
  braucht_aufmerksamkeit: boolean
  aufmerksamkeit_gruende: string[]
}

export interface DealerSummary {
  fahrzeuge_gesamt: number
  beobachtung: number
  einkauf_geplant: number
  im_bestand: number
  verkauft: number
  gebundenes_kapital?: number | null
  geplante_bruttomarge?: number | null
  realisierte_bruttomarge?: number | null
  braucht_aufmerksamkeit: number
}

export interface DealerVehicleCreate {
  marke?: string
  modell?: string
  baureihe?: string
  motor?: string
  baujahr?: number
  kilometerstand?: number
  status?: DealerStatus
  einkaufspreis?: number
  nebenkosten?: number
  geplanter_verkaufspreis?: number
  interne_notiz?: string
}

export interface DealerVehicleUpdate {
  marke?: string
  modell?: string
  baureihe?: string
  motor?: string
  baujahr?: number
  kilometerstand?: number
  status?: DealerStatus
  einkaufspreis?: number | null
  nebenkosten?: number | null
  geplanter_verkaufspreis?: number | null
  tatsaechlicher_verkaufspreis?: number | null
  interne_notiz?: string | null
  verkaufscheck_id?: number | null
}

// ---- Gespeicherte Checks ----
export interface SavedKaufCheck {
  id: number
  eingabe: KaufCheckForm
  ergebnis: KaufCheckResult
}

export interface SavedVerkaufsCheck {
  id: number
  eingabe: VerkaufsCheckForm
  ergebnis: VerkaufsCheckResult
}

// ---- Kauf-Check ----
// Frontend form state (user-friendly field names)
export interface KaufCheckForm {
  marke: string
  modell: string
  baujahr: number
  kilometerstand: number
  motor: string
  ausstattung: string   // comma/newline separated → split before sending
  preis: number
  beschreibung: string
  // Zusätzliche Angaben (optional) — verbessern die Risikoeinschätzung
  unfallfrei: '' | 'ja' | 'nein' | 'unbekannt'
  vorbesitzer: number | ''
  tuevBis: string
  scheckheft: boolean
}

// Exact backend response shape
export interface KaufCheckResult {
  bericht: string
  empfehlung: 'kaufen' | 'kaufen_nach_besichtigung' | 'nur_mit_werkstattpruefung' | 'preis_nachverhandeln' | 'hohes_risiko' | 'finger_weg' | 'unbekannt' | string
  preis_bewertung: 'extrem_guenstig' | 'guenstig' | 'marktgerecht' | 'teuer' | 'extrem_teuer' | 'unbekannt' | string
  marktpreis_min?: number
  marktpreis_max?: number
  baureihe_erkannt?: string
  motor_erkannt?: string
  quelle: string
  vertrauen: string
  belege: unknown[]
  // Phase 1 (optional; alte Checks besitzen diese Felder nicht)
  insights?: Insight[]
  empfehlung_evidence_ids?: string[]
  preis_evidence_ids?: string[]
  risiko_evidence_ids?: string[]
  // Phase 2 (optional; alte Checks besitzen dieses Feld nicht)
  key_findings?: KeyFinding[]
  // Reliability-Sprint (optional; alte Checks besitzen diese Felder nicht)
  price_assessment?: PriceAssessment | null
  research_status?: ResearchStatus
  // KaufCheck-Backend-Freeze (P0-1/P1-3/P1-4/P2-5) — alle additiv, alte
  // gespeicherte Checks besitzen diese Felder nicht (defensiv optional).
  identitaet_konfidenz?: IdentitaetKonfidenz
  identitaet_match_art?: string | null
  technical_coverage?: TechnicalCoverage
  web_identitaet?: WebVehicleIdentity | null
  fahrzeugkontext?: Fahrzeugkontext | null
  laufleistungskontext?: Laufleistungskontext | null
  kaufaktionen?: Kaufaktionen
}

// Phase 4 — Inseratsanalyse & optimierte Version. Alle Felder optional an den
// Results, damit ALTE gespeicherte Checks ohne diese Daten weiter funktionieren.
export interface FehlendeAngabe {
  feld: string
  wichtigkeit: 'kritisch' | 'wichtig' | 'optional' | string
}

export interface ListingAnalyse {
  qualitaet: 'sehr_gut' | 'gut' | 'verbesserbar' | 'unvollstaendig' | string
  vorhanden: number
  gesamt: number
  staerken: string[]
  verkaufsargumente: string[]
  fehlende_angaben: FehlendeAngabe[]
  probleme: string[]
  verbesserungen: string[]
  preis_hinweis?: string | null
  titel_vorschlag?: string | null
  evidence_ids: string[]
}

export interface InseratOptimierung {
  titel: string
  beschreibung: string
  generiert_am?: string | null
  entfernte_behauptungen: string[]
}

// ---- Verkaufs-Check ----
export interface VerkaufsCheckForm {
  marke: string
  modell: string
  baujahr: number
  kilometerstand: number
  motor: string
  ausstattung: string
  zustand: string
  // Zusätzliche Angaben (optional) — verbessern Preiseinschätzung & Inseratsanalyse
  kraftstoff: string
  getriebe: string
  farbe: string
  preisVorstellung: number | ''
  maengel: string          // kommagetrennt → split vor dem Senden
  inseratText: string      // tatsächlicher Beschreibungstext des Inserats
  unfallfrei: '' | 'ja' | 'nein' | 'unbekannt'
  vorbesitzer: number | ''
  tuevBis: string
  scheckheft: boolean
}

export interface VerkaufsCheckResult {
  bericht: string
  schnellverkaufs_preis?: number
  maximal_preis?: number
  empfohlener_preis?: number
  verkaufsdauer_tage_schnell?: number | null
  verkaufsdauer_tage_maximal?: number | null
  // Reliability-Sprint §11: Vermarktungsdauer als Kategorie (keine erfundenen Tage).
  verkaufsdauer_schnell?: string | null
  verkaufsdauer_empfohlen?: string | null
  verkaufsdauer_maximal?: string | null
  marktpreis_min?: number
  marktpreis_max?: number
  baureihe_erkannt?: string
  motor_erkannt?: string
  quelle: string
  vertrauen: string
  belege: unknown[]
  // Phase 1 (optional; alte Checks besitzen diese Felder nicht)
  insights?: Insight[]
  preis_evidence_ids?: string[]
  strategie_evidence_ids?: string[]
  argument_evidence_ids?: string[]
  // Phase 2 (optional; alte Checks besitzen dieses Feld nicht)
  key_findings?: KeyFinding[]
  // Reliability-Sprint (optional; alte Checks besitzen diese Felder nicht)
  price_assessment?: PriceAssessment | null
  research_status?: ResearchStatus
  // Phase 4 (optional; alte Checks besitzen diese Felder nicht)
  listing_analyse?: ListingAnalyse | null
  inserat_optimierung?: InseratOptimierung | null
}
