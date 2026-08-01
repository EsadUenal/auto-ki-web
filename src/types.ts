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

export interface Insight {
  id: string
  kategorie: string
  titel: string
  beschreibung: string
  quellen_typen: string[]
  quellen: EvidenceQuelle[]
  confidence: string
  schweregrad?: string | null
  // Nur Rückrufe: wie sicher der Rückruf GENAU DIESES Fahrzeug betrifft.
  // "exakt" | "wahrscheinlich" | "unklar" — getrennt von confidence & schweregrad.
  applicability?: string | null
  einfluss?: string | null
  // Nur Marktvergleich-Insight: strukturierter deterministischer Marktvergleich.
  marktanalyse?: Marktanalyse | null
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
  // Zusätzliche Angaben (optional) — verbessern die Preiseinschätzung
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
  verkaufsdauer_tage_schnell?: number
  verkaufsdauer_tage_maximal?: number
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
}
