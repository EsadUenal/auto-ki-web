import type { VehicleIdentity } from '../types'

/**
 * Reine, isoliert testbare Logik für KaufCheckDetails.tsx (wie fahrzeugTitel.ts /
 * huEingabe.ts / kaufcheckFelder.ts) — ausgelagert, weil der Test-Runner (node
 * --experimental-strip-types) keine .tsx-Dateien importieren kann.
 *
 * Root-Cause-Fix (Lexus-RC-F-Forensik, Frontend-Anteil, Phase 4):
 * - A/C: `technical_coverage` sagt NICHTS über die Vollständigkeit der
 *   Prüflisten aus (das ist eine andere Achse, siehe app/models.py), sondern
 *   nur, woher die technischen Felder stammen (DB/Web/teilweise).
 * - D: `field_evidence` existiert bereits im Vertrag und wird laut Backend
 *   (app/vehicle_identity.py::_feld_eintrag) für jedes kanonische Feld
 *   claim-gebunden gesetzt. Fehlt ein Eintrag oder ist er "unknown", wird
 *   NICHTS erfunden — "unbestätigt" ist dann die einzig ehrliche Aussage.
 */

export const TECHNICAL_COVERAGE_LABEL: Record<string, string> = {
  db: 'Die technischen Angaben stammen aus der ENFAL-Fahrzeugdatenbank.',
  db_plus_web: 'Die technischen Angaben stammen aus der ENFAL-Fahrzeugdatenbank, ergänzt durch aktuelle Webrecherche.',
  web: 'Die technischen Angaben stammen aus aktueller Webrecherche.',
  partial: 'Die technischen Angaben sind nur teilweise durch Datenbank oder Webrecherche abgedeckt.',
}

// B: "Antriebsart" und "Antrieb" klangen für Endnutzer fast gleich, meinten aber
// zwei verschiedene Achsen (Backend `app/technical_research.py`: `powertrain` =
// Elektrifizierungsgrad/Motor-Energieart — Verbrenner/Hybrid/Plug-in-Hybrid/BEV;
// `drivetrain` = Radantrieb — Front/Heck/Allrad). Labels eindeutig an die
// vorhandene Backend-Semantik angeglichen, ohne Backend-Code zu ändern.
export const FELD_LABEL: Record<string, string> = {
  powertrain: 'Antriebsart (Motor/Energie)',
  drivetrain: 'Antrieb (Radantrieb)',
}

export const PROVENANCE_LABEL: Record<string, string> = {
  web: 'Webrecherche', enfal: 'ENFAL-Datenbank', user: 'Inserat/Nutzerangabe',
}

export type FieldEvidence = NonNullable<VehicleIdentity['field_evidence']>[string]

// Reliability-Review (Risiko 1): die ERSTE Fassung von herkunftLabel() zeigte
// nur die reinen Quellennamen aus `provenance` — das vermischte "WOHER kommt
// der Wert" mit "WIE SICHER ist er". Backend-Referenz (app/anzeige.py::herkunft,
// dieselbe field_evidence-Struktur, bereits produktiv): "web_only" heißt dort
// AUSDRÜCKLICH "über Webquellen plausibilisiert, am Fahrzeug nicht geprüft" —
// NICHT bestätigt, obwohl der Legacy-Status intern "web_verified" heißt. Auch
// "reference_only" (reiner DB-Treffer ohne Nutzerabgleich) ist dort "Referenz,
// am Fahrzeug nicht geprüft" — NIE "bestätigt". NUR "user_confirmed"/
// "user_refined" (zwei unabhängige Quellen stimmen überein) rechtfertigt
// "bestätigt". Diese Fassung übernimmt dieselbe Unterscheidung generisch über
// `verification_state` (fällt bei alten Antworten ohne dieses Feld auf die
// Legacy-`status`-Rückrichtung zurück — dieselbe Tabelle wie in
// app/anzeige.py::herkunft, Zeile 117-119 — zurück).
const STATUS_ZU_STATE_FALLBACK: Record<string, string> = {
  provided: 'user_only', identified: 'reference_only', web_verified: 'web_only', plausible: 'plausible',
}

function quellenNamen(fe: FieldEvidence): string[] {
  return [...new Set((fe.provenance ?? []).map((p) => PROVENANCE_LABEL[p]).filter((n): n is string => !!n))]
}

export function herkunftLabel(fe?: FieldEvidence): string {
  if (!fe) return 'unbestätigt'
  const state = fe.verification_state || STATUS_ZU_STATE_FALLBACK[fe.status ?? ''] || 'unknown'
  const quellen = quellenNamen(fe)
  switch (state) {
    case 'unknown':
      return 'unbestätigt'
    case 'conflict':
      return 'widersprüchliche Angaben'
    case 'ambiguous':
      return 'mehrdeutig'
    case 'user_only':
      // Nutzer-/Inseratangabe ohne unabhängige Bestätigung — bekommt NIE
      // dieselbe Kennzeichnung wie ein unabhängig verifizierter Fakt.
      return 'Nutzerangabe, unbestätigt'
    case 'user_confirmed':
    case 'user_refined': {
      // Folgeprüfung: "bestätigt durch X" las sich wie eine unabhängige
      // Prüfung GENAU DIESES Fahrzeugs. Backend-Realität (app/vehicle_identity.py
      // ::_vergleiche / ::_powertrain_aufloesen): hier wird die Nutzer-/
      // Inseratangabe mit dem REFERENZWERT der zugeordneten Baureihe/Variante
      // verglichen — derselbe Variantenabgleich wie bei Rückrufen
      // (`applicability: variant_match`, EvidenceWhy.tsx), nie eine FIN- oder
      // Fahrzeugprüfung. "stimmt überein" statt "bestätigt" vermeidet diese
      // Überinterpretation, bleibt aber klar von echtem "unbestätigt"
      // unterscheidbar. "user" selbst zählt nicht als eigene Übereinstimmung.
      const uebereinstimmung = quellen.filter((q) => q !== PROVENANCE_LABEL.user)
      return uebereinstimmung.length
        ? `Nutzerangabe, stimmt mit ${uebereinstimmung.join(' + ')} überein (keine Fahrzeugprüfung)`
        : 'Nutzerangabe, ohne unabhängige Übereinstimmung'
    }
    case 'reference_only':
      return 'ENFAL-Datenbank (Referenz, am Fahrzeug nicht geprüft)'
    case 'plausible':
      return 'ENFAL-Datenbank (plausibilisiert, nicht gesichert)'
    case 'web_only':
      // NICHT "bestätigt" — eine Webquelle füllt hier nur eine Lücke, ohne
      // Gegenprüfung. Genau die im Review angefragte Konstellation.
      return 'Webrecherche (plausibilisiert, am Fahrzeug nicht geprüft)'
    default:
      return quellen.length ? quellen.join(' + ') : 'unbestätigt'
  }
}

export interface IdentityFeld {
  label: string
  value: string
  herkunft: string
}

// Exakt die Aufbaulogik, die FahrzeugprofilKarte rendert — hierher verschoben,
// damit Tests die TATSÄCHLICHE UI-Feldliste prüfen können (nicht nur
// herkunftLabel() isoliert). `vehicleIdentity.field_evidence` fehlt ein Feld
// oder ist der Status "unknown": herkunftLabel() liefert "unbestätigt", nichts
// wird erfunden.
export function baueVehicleIdentityFelder(vehicleIdentity?: VehicleIdentity | null): IdentityFeld[] {
  if (!vehicleIdentity) return []
  const fe = vehicleIdentity.field_evidence ?? {}
  const felder: IdentityFeld[] = []
  const push = (feld: keyof VehicleIdentity, label: string, value?: string | null) => {
    if (!value) return
    felder.push({ label, value, herkunft: herkunftLabel(fe[feld as string]) })
  }
  push('generation', 'Generation', vehicleIdentity.generation)
  push('year', 'Baujahr', vehicleIdentity.year != null ? String(vehicleIdentity.year) : null)
  push('engine_name', 'Motor', vehicleIdentity.engine_name)
  push('engine_code', 'Motorcode / Motorfamilie', vehicleIdentity.engine_code)
  push('fuel', 'Kraftstoff', vehicleIdentity.fuel)
  push('powertrain', FELD_LABEL.powertrain, vehicleIdentity.powertrain)
  push('transmission', 'Getriebe', vehicleIdentity.transmission)
  push('drivetrain', FELD_LABEL.drivetrain, vehicleIdentity.drivetrain)
  push('horsepower', 'Leistung', vehicleIdentity.horsepower ? `${vehicleIdentity.horsepower} PS` : null)
  return felder
}
