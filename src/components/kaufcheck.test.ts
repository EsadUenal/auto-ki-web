import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import { formatiereHuEingabe } from './huEingabe.ts'

/**
 * Regressionstests KaufCheck RC1 (Frontend).
 *
 * Realer Befund (BMW 330i G20, 2019): "TÜV bis" kam als "092028" an und wurde so
 * angezeigt; "Warum diese Empfehlung?" wiederholte die Risiken; die Oberfläche
 * trennte technische Kaufempfehlung und fehlende Preisbewertung nicht; das
 * dynamische BMW-Serviceintervall erschien als starre Herstellerzahl.
 */

const view = readFileSync(new URL('./KaufCheckView.tsx', import.meta.url), 'utf8')
const verkauf = readFileSync(new URL('./VerkaufsCheckView.tsx', import.meta.url), 'utf8')
const details = readFileSync(new URL('./KaufCheckDetails.tsx', import.meta.url), 'utf8')
const types = readFileSync(new URL('../types.ts', import.meta.url), 'utf8')

/** Entfernt Kommentare — Assertions prüfen den Code, nicht die Prosa. */
function ohneKommentare(quelle: string): string {
  return quelle.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')
}

test('A: HU-Eingabe wird auf MM/JJJJ gebracht', () => {
  assert.equal(formatiereHuEingabe('092028'), '09/2028')
  assert.equal(formatiereHuEingabe('9/28'), '09/2028')
  assert.equal(formatiereHuEingabe('09.2028'), '09/2028')
  assert.equal(formatiereHuEingabe('2028-09'), '09/2028')
  assert.equal(formatiereHuEingabe('0928'), '09/2028')
  // Unklares wird nicht geraten.
  assert.equal(formatiereHuEingabe('bald'), 'bald')
  assert.equal(formatiereHuEingabe('132028'), '132028')
})

test('A: beide Check-Formulare formatieren das TÜV-Feld beim Verlassen', () => {
  for (const quelle of [view, verkauf]) {
    assert.match(quelle, /onBlur=\{\(e\) => set\('tuevBis', formatiereHuEingabe\(e\.target\.value\)\)\}/)
    assert.match(quelle, /import \{ formatiereHuEingabe \} from '\.\/huEingabe'/)
  }
})

test('J: "Warum diese Empfehlung?" zeigt eigene Gründe, keine Risikokarten', () => {
  assert.match(view, /<EmpfehlungsGruende gruende=\{result\.empfehlung_gruende \?\? \[\]\} \/>/)
  // Was schon als Risiko erscheint, wird aus den Empfehlungskarten gefiltert.
  assert.match(view, /\.filter\(\(i\) => !risikoIds\.has\(i\.id\)\)/)
  assert.match(types, /empfehlung_gruende\?: string\[\]/)
})

test('M: technische Empfehlung und Preis sind sichtbar getrennt', () => {
  assert.match(view, /<PreisDimensionZeile result=\{result\} \/>/)
  assert.match(details, /Technische Einschätzung/)
  assert.match(details, /Preis: <span className="font-medium">nicht bewertbar<\/span> \(keine belastbare Marktpreisbasis\)/)
  assert.match(details, /result\.research_status === 'completed_no_market'/)
})

test('I: dynamisches Serviceintervall wird nicht als starre Herstellerzahl gezeigt', () => {
  assert.doesNotMatch(ohneKommentare(details), /Ölwechsel-Intervall \(Hersteller\)/)
  assert.match(details, /Ölwechsel-Richtwert \(Datenbank\)/)
  assert.match(details, /aktuelle Fälligkeit im Service-Menü des Fahrzeugs prüfen/)
  assert.match(types, /wartung_system\?: string \| null/)
})

test('G: sichtbare KaufCheck-Texte ohne Gedankenstrich (Kommentare ausgenommen)', () => {
  const evidence = readFileSync(new URL('./EvidenceWhy.tsx', import.meta.url), 'utf8')
  const summary = readFileSync(new URL('./ResultSummary.tsx', import.meta.url), 'utf8')
  // Platzhalter "—" für einen fehlenden Wert ist kein Stilmittel und bleibt erlaubt.
  const strich = (quelle: string) =>
    ohneKommentare(quelle).split('\n').filter((z) => /\S\s—\s\S/.test(z))
  for (const [name, quelle] of [['EvidenceWhy', evidence], ['KaufCheckDetails', details],
                                ['KaufCheckView', view], ['ResultSummary', summary]] as const) {
    assert.deepEqual(strich(quelle), [], `${name} enthält noch sichtbare Gedankenstriche`)
  }
  assert.match(evidence, /series_only: 'Für Teile der Baureihe gemeldet: FIN prüfen'/)
})

// ── Prelaunch-Polish: strukturierter Kraftstoff und Leistung ────────────────
//
// Beide Felder wirken im Backend HART (Marktvergleich und Auflösung der
// Motorvariante). Ein Feld, das die Oberfläche zwar anzeigt, aber nicht
// mitschickt, wäre genau die Art dekoratives Feld, die hier nicht entstehen
// soll. Geprüft wird deshalb die ganze Kette im Frontend: Typ, Formular,
// Request-Body.

const client = ohneKommentare(readFileSync(new URL('../api/client.ts', import.meta.url), 'utf8'))
const viewCode = ohneKommentare(view)
const typesCode = ohneKommentare(types)

test('P: Kraftstoff und Leistung stehen im Formulartyp', () => {
  assert.match(typesCode, /kraftstoff: '' \| 'benzin' \| 'diesel' \| 'hybrid' \| 'elektro'/)
  assert.match(typesCode, /leistungPs: number \| ''/)
})

test('P: genau die vier Kraftstoffwerte, die das Backend normalisiert', () => {
  // app/marktvergleich.py und app/car_lookup.py kennen benzin, diesel, hybrid
  // und elektro. Mild-, Voll- und Plug-in-Hybrid landen dort alle auf "hybrid";
  // eine feinere Auswahl wäre eine Genauigkeit, die nirgends ankommt.
  for (const wert of ['benzin', 'diesel', 'hybrid', 'elektro']) {
    assert.match(viewCode, new RegExp(`<option value="${wert}">`))
  }
  assert.ok(!/value="mildhybrid"|value="plugin"|value="phev"/.test(viewCode),
    'Kraftstoffwert angeboten, den die Auswertung nicht normalisiert')
})

test('P: beide Felder landen im Request-Body', () => {
  assert.match(client, /kraftstoff: form\.kraftstoff \|\| undefined/)
  assert.match(client, /leistung_ps: form\.leistungPs \|\| undefined/)
})

test('P: Leistung bleibt optional und plausibel begrenzt', () => {
  // 30 bis 1500 PS, identisch zur Schemagrenze in app/models.py. Ein
  // Pflichtfeld wäre falsch: viele Inserate nennen die Leistung nicht klar,
  // und geraten wäre schlechter als weggelassen.
  assert.match(viewCode, /type="number" min=\{30\} max=\{1500\}/)
  assert.ok(!/label="Leistung" required/.test(viewCode))
})

test('P: Pflichtfelder wurden NICHT vermehrt', () => {
  // Das Formular soll kurz bleiben: weiterhin genau fünf Pflichtangaben.
  const pflicht = [...viewCode.matchAll(/<Field label="([^"]+)" required>/g)].map((m) => m[1])
  assert.deepEqual(pflicht.sort(),
    ['Angebotspreis', 'Baujahr', 'Kilometerstand', 'Marke', 'Modell'])
})

test('P: Verkäuferangaben bleiben als Angaben formuliert', () => {
  // ENFAL stellt Unfallfreiheit und Servicehistorie nicht fest, das Inserat
  // behauptet sie. Die Labels dürfen das nicht verwischen.
  assert.match(viewCode, /label="Unfallstatus laut Inserat"/)
  assert.match(viewCode, /Laut Inserat unfallfrei/)
  assert.match(viewCode, /Unfallschaden angegeben/)
  assert.match(viewCode, /Scheckheft laut Inserat gepflegt/)
  assert.ok(!/>Ja, unfallfrei</.test(viewCode),
    '"Ja, unfallfrei" behauptet mehr, als das Inserat hergibt')
})
