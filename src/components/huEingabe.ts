/**
 * RC1: Das Feld "TÜV bis" ist Freitext; im Test kam "092028" an. Beim Verlassen
 * des Feldes werden die üblichen Schreibweisen auf MM/JJJJ gebracht. Unklare
 * Eingaben bleiben unverändert — das Backend normalisiert und bewertet ohnehin
 * selbst; hier geht es nur um eine saubere Anzeige für den Nutzer.
 */
export function formatiereHuEingabe(roh: string): string {
  const s = roh.trim()
  let m = /^(0?[1-9]|1[0-2])\s*[/.\-\s]\s*((?:20)?\d{2})$/.exec(s)
  if (m) return `${m[1].padStart(2, '0')}/${m[2].length === 2 ? '20' + m[2] : m[2]}`
  m = /^(0[1-9]|1[0-2])(20\d{2}|\d{2})$/.exec(s)
  if (m) return `${m[1]}/${m[2].length === 2 ? '20' + m[2] : m[2]}`
  m = /^(20\d{2})\s*[-/.]\s*(0?[1-9]|1[0-2])$/.exec(s)
  if (m) return `${m[2].padStart(2, '0')}/${m[1]}`
  return roh
}

