// User-Copy: keine rhetorischen langen Gedankenstriche.
//
//     npm run test:copy
//
// Geprüft wird die nutzersichtbare Produktions-Copy, NICHT das ganze Repo:
// Kommentare und Entwicklerdokumentation dürfen Gedankenstriche enthalten, sie
// erreichen niemanden. Eine Behauptung "0 im gesamten Repo" wäre falsch.
//
// Ausdrücklich ERLAUBT bleiben (und werden hier auch geprüft, damit sie nicht
// versehentlich mitentfernt werden):
//   * Zahlenbereiche wie 2019–2021 oder 15–30 Sekunden. Der Halbgeviertstrich
//     ist dort korrekte deutsche Typografie und kein Stilmittel.
//   * Der Platzhalter für einen fehlenden Wert in Tabellen.
//   * Rechtstexte unter src/legal/ (juristische Formulierungen werden nicht
//     für Typografie angefasst).
//   * Normale Bindestriche in Wörtern (E-Mail, KI-Chat, Budget-Abgleich).

import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join, relative } from 'node:path'

const HIER = dirname(fileURLToPath(import.meta.url))
const SRC = join(HIER, '..')

const EM = '—'
const EN = '–'

/** Dateien, die nicht als Produktions-Copy zählen. */
const AUSGENOMMEN = [
  /[\\/]legal[\\/]/,          // Rechtstexte: Bedeutung vor Typografie
  /\.test\.ts$/,              // Tests (auch diese Datei)
]

function dateien(ordner: string): string[] {
  const raus: string[] = []
  for (const name of readdirSync(ordner)) {
    const pfad = join(ordner, name)
    if (statSync(pfad).isDirectory()) {
      raus.push(...dateien(pfad))
    } else if (/\.(ts|tsx)$/.test(pfad)) {
      raus.push(pfad)
    }
  }
  return raus
}

/** Quelltext ohne Kommentare: ein Kommentar erreicht keinen Nutzer. */
function nurCode(text: string): string {
  return text
    .replace(/\r?\n/g, '\n')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .split('\n')
    .map((z) => z.replace(/(^|[^:])\/\/.*$/, '$1'))
    .join('\n')
}

/**
 * Ist dieser Strich ein Zahlenbereich oder ein Platzhalter?
 * Beides ist erlaubt; alles andere gilt als rhetorisch.
 */
function istErlaubt(zeile: string, index: number): boolean {
  const davor = zeile.slice(Math.max(0, index - 40), index)
  const danach = zeile.slice(index + 1, index + 40)

  // Platzhalter für einen fehlenden Wert: der Strich steht allein im String.
  if (/['"`]$/.test(davor) && /^['"`]/.test(danach)) return true

  // Zahlenbereich. "Zahl" heißt hier auch: ein Ausdruck, der eine liefert
  // (`${...}`, fmt(...), toLocaleString()), eine Währungsangabe davor, oder
  // ein Bereichsende in Worten ("bis heute").
  //
  // Der Strich darf außerdem direkt hinter einem Backtick stehen: in JSX wird
  // ein Bereich regelmäßig aus zwei Ausdrücken zusammengesetzt, etwa
  // `{von}{bis ? \`–${bis}\` : ''}`. Die linke Hälfte steht dann in einem
  // eigenen Ausdruck und ist in dieser Zeile nicht als Zahl sichtbar.
  const linksZahl = /(\d|\}|\)|\?|€|EUR)\s*$/.test(davor)
  // Ein Strich am ANFANG eines String-Literals ist nie rhetorisch: vor ihm
  // steht dann kein Text, den er gliedern könnte. Er gehört zur rechten
  // Hälfte eines zusammengesetzten Bereichs ("–${bis}", " – heute").
  const linksStringStart = /['"`]\s?$/.test(davor)
  const rechtsZahl = /^\s*(\d|\$\{|\{|fmt|eur|heute)/i.test(danach)
  if ((linksZahl || linksStringStart) && rechtsZahl) return true

  return false
}

const treffer: string[] = []
const bereiche: string[] = []

for (const pfad of dateien(SRC)) {
  if (AUSGENOMMEN.some((r) => r.test(pfad))) continue
  const rel = relative(SRC, pfad)
  const zeilen = nurCode(readFileSync(pfad, 'utf8')).split('\n')
  zeilen.forEach((zeile, i) => {
    for (let k = 0; k < zeile.length; k++) {
      const c = zeile[k]
      if (c !== EM && c !== EN) continue
      const eintrag = `${rel}:${i + 1}: ${zeile.trim().slice(0, 120)}`
      if (istErlaubt(zeile, k)) bereiche.push(eintrag)
      else treffer.push(eintrag)
    }
  })
}

test('User-Copy enthält keine rhetorischen langen Gedankenstriche', () => {
  assert.deepEqual(treffer, [],
    `Rhetorische Gedankenstriche in nutzersichtbarer Copy:\n${treffer.join('\n')}`)
})

test('Zahlenbereiche und Platzhalter bleiben erhalten', () => {
  // Gegenprobe zur Regel oben: hätte eine pauschale Ersetzung zugeschlagen,
  // wären diese Vorkommen verschwunden und der Test liefe ins Leere.
  assert.ok(bereiche.length > 0,
    'Keine Zahlenbereiche mehr gefunden. Wurde doch global ersetzt?')
})

test('Normale Bindestriche sind unbeschädigt', () => {
  const alles = dateien(SRC)
    .filter((p) => !AUSGENOMMEN.some((r) => r.test(p)))
    .map((p) => readFileSync(p, 'utf8'))
    .join('\n')
  for (const wort of ['E-Mail', 'KI-Chat', 'Budget-Abgleich', 'AutoFinder-Suchen']) {
    assert.ok(alles.includes(wort), `"${wort}" fehlt, Bindestrich beschädigt?`)
  }
})

test('Rechtstexte wurden nicht angefasst', () => {
  // Bewusste Entscheidung: an Impressum, Datenschutz, AGB und Widerruf wird
  // für Typografie nichts geändert. Der Test hält das fest, damit es eine
  // Entscheidung bleibt und kein Versehen wird.
  const dsgvo = readFileSync(join(SRC, 'legal', 'datenschutz.ts'), 'utf8')
  assert.ok(dsgvo.includes(EN) || dsgvo.includes(EM),
    'Rechtstext wurde verändert. War das beabsichtigt?')
})
