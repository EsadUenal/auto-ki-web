import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import { formatiereHuEingabe } from './huEingabe.ts'
import { mitLegacyServicehistorie, normalisiereGetriebe } from './kaufcheckFelder.ts'
import type { KaufCheckForm } from '../types.ts'

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
  // Die frühere Checkbox "Scheckheft laut Inserat gepflegt" ist durch das
  // Auswahlfeld "Servicehistorie laut Inserat" ersetzt — dieselbe Anforderung,
  // vier statt zwei Zustände.
  assert.match(viewCode, /label="Servicehistorie laut Inserat"/)
  assert.match(viewCode, /label="Verkäufer laut Inserat"/)
  assert.ok(!/>Ja, unfallfrei</.test(viewCode),
    '"Ja, unfallfrei" behauptet mehr, als das Inserat hergibt')
})

// ── KaufCheck Inputs Final: Getriebe, Verkäuferart, Servicehistorie ──────────

test('Q: Getriebe steht bei Kraftstoff und Leistung, mit nur zwei Werten', () => {
  assert.match(viewCode, /label="Getriebe"/)
  assert.match(viewCode, /set\('getriebe', e\.target\.value as KaufCheckForm\['getriebe'\]\)/)
  for (const wert of ['automatik', 'manuell']) {
    assert.match(viewCode, new RegExp(`<option value="${wert}">`))
  }
  // Keine Auswahl, die die Auswertung nicht unterscheiden kann.
  assert.ok(!/value="dsg"|value="dkg"|value="cvt"|value="wandler"/.test(viewCode),
    'Getriebeart angeboten, die ENFAL nicht zuverlässig unterscheidet')
})

test('Q: Servicehistorie ersetzt die Checkbox durch vier Zustände', () => {
  for (const wert of ['vollstaendig_angegeben', 'teilweise', 'umfang_unklar', 'nicht_vorhanden']) {
    assert.match(viewCode, new RegExp(`<option value="${wert}">`))
  }
  // Die alte Checkbox ist weg — nicht nur unsichtbar.
  assert.ok(!/form\.scheckheft/.test(viewCode),
    'Die alte Scheckheft-Checkbox ist noch im Formular verdrahtet')
  assert.ok(!/type="checkbox"/.test(viewCode),
    'Im KaufCheck-Formular steht noch eine Checkbox')
})

test('Q: alle drei Felder landen im Request-Body', () => {
  assert.match(client, /getriebe: form\.getriebe \|\| undefined/)
  assert.match(client, /verkaeuferart: form\.verkaeuferart \|\| undefined/)
  assert.match(client, /servicehistorie: form\.servicehistorie \|\| undefined/)
  // Das Legacy-Feld wird nicht mehr GESENDET (die Abbildung passiert beim Laden).
  // Nur der KaufCheck-Body wird geprüft: `verkaufsBody` sendet es weiterhin und
  // soll das auch — der VerkaufsCheck hat sein eigenes Formular.
  const kaufBody = client.slice(client.indexOf('export async function runKaufCheck'),
    client.indexOf('function verkaufsBody('))
  assert.ok(kaufBody.length > 200, 'KaufCheck-Abschnitt nicht gefunden')
  assert.ok(!/scheckheftgepflegt/.test(kaufBody),
    'runKaufCheck sendet weiterhin das alte scheckheftgepflegt')
})

test('Q: die neuen Felder stehen im Formular-Typ', () => {
  assert.match(typesCode, /getriebe: '' \| 'automatik' \| 'manuell'/)
  assert.match(typesCode, /verkaeuferart: '' \| 'privat' \| 'haendler'/)
  assert.match(typesCode, /servicehistorie: '' \| 'vollstaendig_angegeben'/)
  // Das Legacy-Feld bleibt OPTIONAL im Typ — gespeicherte Checks tragen es.
  assert.match(typesCode, /scheckheft\?: boolean/)
})

test('Q: Optional-Bereich bleibt optional, Pflichtfelder unverändert', () => {
  const pflicht = [...viewCode.matchAll(/<Field label="([^"]+)" required>/g)].map((m) => m[1])
  assert.deepEqual(pflicht.sort(),
    ['Angebotspreis', 'Baujahr', 'Kilometerstand', 'Marke', 'Modell'])
  // Verkäufer und Servicehistorie stehen NACH dem Aufklapper, Getriebe davor.
  const aufklapper = viewCode.indexOf('Weitere Angaben (optional)')
  assert.ok(aufklapper > 0)
  assert.ok(viewCode.indexOf('label="Getriebe"') < aufklapper,
    'Getriebe sollte bei Kraftstoff/Leistung sichtbar stehen')
  assert.ok(viewCode.indexOf('label="Verkäufer laut Inserat"') > aufklapper)
  assert.ok(viewCode.indexOf('label="Servicehistorie laut Inserat"') > aufklapper)
})

test('Q: drei Felder in einer Reihe erst, wenn sie breit genug bleiben', () => {
  // Kraftstoff | Leistung | Getriebe nur ab xl. Darunter zwei Spalten, auf
  // 375 px eine — statt drei Felder in eine zu enge Reihe zu quetschen.
  assert.match(viewCode, /grid-cols-1 sm:grid-cols-2 xl:grid-cols-3/)
})

test('Q: gespeicherte Checks werden über das Legacy-Mapping geladen', () => {
  assert.match(viewCode, /setForm\(mitLegacyServicehistorie\(savedCheck\.eingabe\)\)/)
  assert.match(viewCode, /import \{ mitLegacyServicehistorie, normalisiereGetriebe \}/)
})

// ── Verhalten, nicht Quelltext: Legacy-Mapping und Getriebe-Normalisierung ────

test('R: gespeicherter Alt-Check mit gesetzter Checkbox wird abgebildet', () => {
  const alt = {
    marke: 'BMW', modell: '320d', baujahr: 2019, kilometerstand: 90000, motor: '320d',
    kraftstoff: 'diesel', leistungPs: 190, ausstattung: '', preis: 22000,
    beschreibung: '', unfallfrei: 'ja', vorbesitzer: 1, tuevBis: '06/2027',
    scheckheft: true,
  } as unknown as KaufCheckForm
  const neu = mitLegacyServicehistorie(alt)
  assert.equal(neu.servicehistorie, 'vollstaendig_angegeben')
  // Die neuen Felder existieren, sind aber leer — nichts wird erfunden.
  assert.equal(neu.getriebe, '')
  assert.equal(neu.verkaeuferart, '')
  // Alle Altwerte bleiben unangetastet.
  assert.equal(neu.marke, 'BMW')
  assert.equal(neu.tuevBis, '06/2027')
})

test('R: nicht angekreuzte oder fehlende Checkbox bleibt "Nicht angegeben"', () => {
  for (const scheckheft of [false, undefined]) {
    const alt = { marke: 'VW', modell: 'Golf', scheckheft } as unknown as KaufCheckForm
    assert.equal(mitLegacyServicehistorie(alt).servicehistorie, '')
  }
})

test('R: ein neuer Check wird beim Laden nicht überschrieben', () => {
  const neuerCheck = {
    marke: 'Opel', modell: 'Astra', getriebe: 'manuell', verkaeuferart: 'privat',
    servicehistorie: 'nicht_vorhanden', scheckheft: true,
  } as unknown as KaufCheckForm
  const geladen = mitLegacyServicehistorie(neuerCheck)
  assert.equal(geladen.servicehistorie, 'nicht_vorhanden')
  assert.equal(geladen.getriebe, 'manuell')
  assert.equal(geladen.verkaeuferart, 'privat')
})

test('R: freie Getriebetexte werden auf die zwei Auswahlwerte gebracht', () => {
  for (const wert of ['Automatik', '8-Gang-Automatik', 'DSG', 'S tronic', 'Steptronic',
    'Doppelkupplung', 'CVT']) {
    assert.equal(normalisiereGetriebe(wert), 'automatik', wert)
  }
  for (const wert of ['Manuell', '6-Gang Manuell', 'Schaltgetriebe', 'Handschalter']) {
    assert.equal(normalisiereGetriebe(wert), 'manuell', wert)
  }
  // Unklares und Widersprüchliches wird NICHT geraten.
  for (const wert of ['', null, undefined, 'unbekannt', 'Automatik oder Schaltgetriebe']) {
    assert.equal(normalisiereGetriebe(wert), '', String(wert))
  }
})
