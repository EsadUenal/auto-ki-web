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

// Reliability-Sprint: Ergebnis der Quality-Gate-Pipeline (§1/§14).
// "research_failed" wird NICHT als abgeschlossener Check behandelt.
export type ResearchStatus = 'completed_high' | 'completed_medium' | 'research_failed' | string

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
