import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import { fahrzeugTitel } from './fahrzeugTitel.ts'
import { istTechnikEingeschraenkt, NEUTRALE_BOX } from './empfehlungsBox.ts'
import { formatiereHuEingabe } from './huEingabe.ts'
import { mitLegacyServicehistorie, normalisiereGetriebe } from './kaufcheckFelder.ts'
import {
  herkunftLabel, TECHNICAL_COVERAGE_LABEL, FELD_LABEL, baueVehicleIdentityFelder, applicabilityLabel,
} from './kaufcheckEvidence.ts'
import type { KaufCheckForm, KaufCheckResult } from '../types.ts'

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
  // L5b (ENFAL-Recherchepfad-Folgeauftrag, 2026-11): die Applicability-Label-Logik
  // wurde nach kaufcheckEvidence.ts ausgelagert (s. dort), damit sie wie herkunftLabel
  // direkt ausführbar testbar ist -- der Literal lebt seitdem dort, nicht mehr hier.
  assert.doesNotMatch(evidence, /series_only: 'Für Teile der Baureihe gemeldet: FIN prüfen'/,
    'die Applicability-Labels sollten nur noch in kaufcheckEvidence.ts stehen (eine Quelle)')
  assert.match(evidence, /import \{ APPLICABILITY_CLS, applicabilityLabel \} from '\.\/kaufcheckEvidence'/)
})

// ── L5b: Rückruf-Sublabel kennt rueckruf_baureihe_bekannt (ENFAL-Recherchepfad- ──
// Folgeauftrag, 2026-11). Befund: `rueckruf_wortlaut()` (Backend, app/recall_filter.py)
// unterscheidet seit F6 "Baureihe" (ENFAL-Katalogeintrag bekannt) von "Modell"
// (canonical-only, RC-W6) -- das Frontend-Badge in EvidenceWhy kannte das Feld
// `rueckruf_baureihe_bekannt` bisher nicht und zeigte IMMER "Baureihe". Getestet
// wird hier `applicabilityLabel()` direkt (derselbe Pfad, den EvidenceCard/
// EvidenceWhy tatsächlich rendert), nicht nur eine Quelltext-Kopie der Regel.
test('L5b: canonical-only-Rückruf (rueckruf_baureihe_bekannt=false) zeigt "Modell", nicht "Baureihe"', () => {
  const label = applicabilityLabel({ applicability: 'series_only', rueckruf_baureihe_bekannt: false })
  assert.equal(label, 'Für Teile dieses Modells gemeldet (keine ENFAL-Baureihen-Zuordnung): per FIN prüfen')
  assert.doesNotMatch(label ?? '', /Baureihe gemeldet/)
})

test('L5b: ENFAL-Katalog-Rückruf (rueckruf_baureihe_bekannt=true) behält "Baureihe"', () => {
  const label = applicabilityLabel({ applicability: 'series_only', rueckruf_baureihe_bekannt: true })
  assert.equal(label, 'Für Teile der Baureihe gemeldet: FIN prüfen')
})

test('L5b: Rückwärtskompatibilität — Feld nicht gesetzt (alte gespeicherte Checks, null/undefined) behält "Baureihe"', () => {
  assert.equal(
    applicabilityLabel({ applicability: 'series_only', rueckruf_baureihe_bekannt: null }),
    'Für Teile der Baureihe gemeldet: FIN prüfen',
  )
  assert.equal(
    applicabilityLabel({ applicability: 'series_only' }),
    'Für Teile der Baureihe gemeldet: FIN prüfen',
  )
})

test('L5b: Alt-Wert "wahrscheinlich" (vor Reliability-Sprint 3) wird GLEICH behandelt wie "series_only"', () => {
  assert.equal(
    applicabilityLabel({ applicability: 'wahrscheinlich', rueckruf_baureihe_bekannt: false }),
    'Für Teile dieses Modells gemeldet (keine ENFAL-Baureihen-Zuordnung): per FIN prüfen',
  )
})

test('L5b: andere Applicability-Werte (variant_match, unclear) bleiben von rueckruf_baureihe_bekannt unberührt', () => {
  assert.equal(
    applicabilityLabel({ applicability: 'variant_match', rueckruf_baureihe_bekannt: false }),
    'Kann Fahrzeuge dieser Variante betreffen: FIN prüfen',
  )
  assert.equal(
    applicabilityLabel({ applicability: 'unclear', rueckruf_baureihe_bekannt: false }),
    'Betroffenheit unklar: FIN prüfen',
  )
})

test('L5b: keine Applicability -> kein Label (kein Rückruf-Insight)', () => {
  assert.equal(applicabilityLabel({}), null)
})

test('L5b: Insight-Typ kennt rueckruf_baureihe_bekannt (Frontend-Vertrag, nicht nur Backend-Modell)', () => {
  assert.match(typesCode, /rueckruf_baureihe_bekannt\?: boolean \| null/)
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

// ── Live-Run-Closing: ungeprüfte Inseratsangabe wird nicht als Qualität gelabelt

test('S: "Pluspunkt" gilt nur für belegte Vorteile, nicht für Inseratsangaben', () => {
  const kf = readFileSync(new URL('./KeyFindings.tsx', import.meta.url), 'utf8')
  // Die Kategorie der Servicehistorie-Karte bekommt ein eigenes Label.
  assert.match(kf, /inseratangabe: 'Positive Inseratangabe'/)
  // Es wird auch wirklich verwendet und nicht nur definiert.
  assert.match(kf, /const label = KATEGORIE_LABEL\[finding\.kategorie\] \?\? style\.label/)
  assert.match(kf, /\{label\}/)
  // "Pluspunkt" bleibt für belegte Vorteile erhalten (stufe "chance").
  assert.match(kf, /label: 'Pluspunkt'/)
})

test('T: aktuelle KaufCheck-Antworten nutzen Identität, Datenbasis und Risikotitel vom Backend', () => {
  assert.match(typesCode, /vehicle_identity\?: VehicleIdentity \| null/)
  assert.match(typesCode, /datenbasis\?: string\[\]/)
  assert.match(typesCode, /risiko_titel\?: string/)
  const fahrzeugTitelSrc = readFileSync(new URL('./fahrzeugTitel.ts', import.meta.url), 'utf8')
  assert.match(fahrzeugTitelSrc, /const identity = result\.vehicle_identity/)
  assert.match(viewCode, /<DatenbasisZeile datenbasis=\{result\.datenbasis\} \/>/)
  assert.match(viewCode, /\{result\.risiko_titel \?\? 'Relevante Risiken und Hinweise'\}/)
  assert.match(viewCode, /vehicleIdentity=\{result\.vehicle_identity\}/)
  assert.doesNotMatch(ohneKommentare(details), /Datenbasis: ENFAL-Datenbank/)
})

test('T: Rückrufdarstellung stuft series_only nicht als offenen Rückruf hoch', () => {
  // L5b: der Literal selbst lebt seit dem Auslagern nach kaufcheckEvidence.ts dort
  // (siehe Test G) -- hier bleibt nur die direkte Verhaltensprüfung über den
  // tatsächlich importierten Pfad.
  assert.equal(
    applicabilityLabel({ applicability: 'series_only', rueckruf_baureihe_bekannt: true }),
    'Für Teile der Baureihe gemeldet: FIN prüfen',
  )
  const evidence = readFileSync(new URL('./EvidenceWhy.tsx', import.meta.url), 'utf8')
  assert.doesNotMatch(ohneKommentare(evidence), /offene?r? Rückruf/i)
})

// Produktions-Befund: "BMW M4 M4 · F82 · 2016 · M4 · S55B30 · 431 PS" — Modell,
// Variante und Motorbezeichnung waren für dieses performance-benannte Modell
// alle drei "M4" und erschienen dreifach in der Titelzeile. `fahrzeugTitel`
// wurde nach ./fahrzeugTitel.ts ausgelagert, damit sich die Regel
// (markenübergreifend: kein Wort-Token doppelt) real ausführen lässt statt nur
// als Text-Assertion auf dem Quellcode.
const leereForm: KaufCheckForm = {
  marke: '', modell: '', baujahr: 0, kilometerstand: 0, motor: '', kraftstoff: '',
} as unknown as KaufCheckForm

function ergebnisMit(identity: NonNullable<KaufCheckResult['vehicle_identity']>): KaufCheckResult {
  return { vehicle_identity: identity } as unknown as KaufCheckResult
}

test('U: Titelzeile wiederholt kein Wort-Token (BMW M4 F82 2016 — Realfall)', () => {
  const titel = fahrzeugTitel(ergebnisMit({
    make: 'BMW', model: 'M4', model_variant: 'M4', generation: 'F82', year: 2016,
    engine_name: 'M4', engine_code: 'S55B30', horsepower: 431,
  }), leereForm)
  assert.equal(titel, 'BMW M4 · F82 · 2016 · S55B30 · 431 PS')
  assert.doesNotMatch(titel, /\bM4\b.*\bM4\b/)
})

test('U: Titelzeile dedupliziert generisch, unabhängig von Marke/Modell (Kontrollfall ohne Wiederholung)', () => {
  const titel = fahrzeugTitel(ergebnisMit({
    make: 'Mercedes-Benz', model: 'C-Klasse', model_variant: null, generation: 'W205', year: 2019,
    engine_name: 'C 300', engine_code: 'M264', horsepower: 258,
  }), leereForm)
  assert.equal(titel, 'Mercedes-Benz C-Klasse · W205 · 2019 · C 300 · M264 · 258 PS')
})

test('U: fahrzeugTitel ist aus einem eigenen Modul importiert (isoliert testbar wie huEingabe.ts)', () => {
  assert.match(details, /import \{ fahrzeugTitel \} from '\.\/fahrzeugTitel'/)
})

test('Final-Stabilization: die kanonische Backend-Bezeichnung hat Vorrang (keine zweite Titellogik)', () => {
  const titel = fahrzeugTitel({
    anzeige_titel: 'Testmarke Alpha T1 2018 2.0 TX (40 TX) 190 PS',
    vehicle_identity: { make: 'Testmarke', model: 'Alpha', engine_name: 'Alpha' },
  } as unknown as KaufCheckResult, leereForm)
  assert.equal(titel, 'Testmarke Alpha T1 2018 2.0 TX (40 TX) 190 PS')
})

test('Final-Stabilization: Empfehlungskarte zeigt die Backend-Entscheidung statt eines eigenen Labels', () => {
  assert.match(viewCode, /result\.empfehlung_anzeige \|\| recStyle\.label/)
  assert.match(viewCode, /result\.empfehlung_hinweis/)
})

// ── Root-Cause-Fix: NoMarketCard behauptete unbedingt technische Vollständigkeit ──

test('NoMarketCard: die unbelegte Vollständigkeitsbehauptung ist entfernt', () => {
  assert.doesNotMatch(details, /davon unabhängig vollständig/)
  assert.doesNotMatch(details, /Prüflisten sind.*vollständig/)
})

test('NoMarketCard: bekommt technical_coverage vom MarktpreisModul durchgereicht', () => {
  assert.match(details, /<NoMarketCard technicalCoverage=\{result\.technical_coverage\} \/>/)
})

test('technical_coverage: jede Ausprägung sagt nur Herkunft, nie "vollständig"', () => {
  for (const text of Object.values(TECHNICAL_COVERAGE_LABEL)) {
    assert.doesNotMatch(text, /vollständig/i)
  }
  assert.equal(TECHNICAL_COVERAGE_LABEL.db, 'Die technischen Angaben stammen aus der ENFAL-Fahrzeugdatenbank.')
  assert.match(TECHNICAL_COVERAGE_LABEL.partial, /teilweise/)
})

// ── herkunftLabel: pro Feld claim-gebundene Evidence, nichts erfinden ──────────
//
// Reliability-Review (Risiko 1): die erste Fassung zeigte nur Quellennamen aus
// `provenance` und vermischte damit "woher" mit "wie sicher". Backend-Referenz
// (app/anzeige.py::herkunft, dieselbe field_evidence-Struktur): "web_only"
// heißt dort ausdrücklich NICHT bestätigt ("plausibilisiert, am Fahrzeug nicht
// geprüft"), ebenso "reference_only" (reiner DB-Treffer). NUR "user_confirmed"/
// "user_refined" rechtfertigt "bestätigt". Diese Tests bilden `verification_state`
// ab — das tatsächliche, bereits auf der Leitung befindliche Feld.

test('herkunftLabel: fehlender Eintrag (sehr alter Check) -> unbestätigt, keine Erfindung', () => {
  assert.equal(herkunftLabel(undefined), 'unbestätigt')
})

test('herkunftLabel: UNKNOWN bleibt UNKNOWN', () => {
  assert.equal(herkunftLabel({ status: 'unknown', verification_state: 'unknown', provenance: [] }), 'unbestätigt')
  assert.equal(herkunftLabel({ status: undefined, provenance: ['web'] } as never), 'unbestätigt')
})

test('herkunftLabel: widersprüchliche Quellen werden als Widerspruch markiert, nicht als Bestätigung', () => {
  assert.equal(
    herkunftLabel({ status: 'conflict', verification_state: 'conflict', provenance: ['user'] }),
    'widersprüchliche Angaben',
  )
})

test('herkunftLabel: mehrdeutige Lage bleibt als solche erkennbar', () => {
  assert.equal(herkunftLabel({ status: 'ambiguous', verification_state: 'ambiguous', provenance: [] }), 'mehrdeutig')
})

test('herkunftLabel: Risiko 1 — "web_only" (Legacy-Status "web_verified") erscheint NICHT als bestätigt', () => {
  const fe = { status: 'web_verified', verification_state: 'web_only', provenance: ['web'] }
  const label = herkunftLabel(fe)
  assert.doesNotMatch(label, /^bestätigt/)
  assert.doesNotMatch(label, /^Webrecherche$/, 'darf nicht wie eine blanke, unqualifizierte Quellenangabe wirken')
  assert.match(label, /nicht geprüft/)
})

test('herkunftLabel: Risiko 1 — reiner DB-Treffer ("reference_only") ist Referenz, keine Bestätigung', () => {
  const label = herkunftLabel({ status: 'identified', verification_state: 'reference_only', provenance: ['enfal'] })
  assert.doesNotMatch(label, /^bestätigt/)
  assert.match(label, /nicht geprüft/)
})

test('herkunftLabel: Risiko 1 — reine Nutzer-/Inseratangabe bekommt NICHT dieselbe Kennzeichnung wie eine Variantenübereinstimmung', () => {
  const nutzer = herkunftLabel({ status: 'provided', verification_state: 'user_only', provenance: ['user'] })
  const uebereinstimmung = herkunftLabel({
    status: 'confirmed', verification_state: 'user_confirmed', provenance: ['user', 'enfal'],
  })
  assert.notEqual(nutzer, uebereinstimmung)
  assert.match(nutzer, /unbestätigt/)
  assert.match(uebereinstimmung, /^Nutzerangabe, stimmt mit/)
})

test('herkunftLabel: Folgeprüfung — "stimmt überein" behauptet NIE eine Fahrzeug-/FIN-Prüfung', () => {
  // Backend-Realität (app/vehicle_identity.py::_vergleiche): "user_confirmed"
  // heißt "Inseratangabe == Referenzwert der zugeordneten Variante", NICHT
  // "dieses konkrete Fahrzeug wurde geprüft" — derselbe Unterschied wie bei
  // Rückrufen (`applicability: variant_match`, niemals `confirmed_by_vin`).
  const label = herkunftLabel({ status: 'confirmed', verification_state: 'user_confirmed', provenance: ['user', 'web'] })
  assert.equal(label, 'Nutzerangabe, stimmt mit Webrecherche überein (keine Fahrzeugprüfung)')
  assert.doesNotMatch(label, /^bestätigt/)
  assert.match(label, /keine Fahrzeugprüfung/)
})

test('herkunftLabel: Legacy-Fallback ohne verification_state (alte gespeicherte Checks) bleibt konsistent zum Backend', () => {
  // Dieselbe Rückrichtungs-Tabelle wie app/anzeige.py::herkunft Zeile 117-119.
  // "confirmed" ist dort bewusst NICHT eindeutig rückführbar (kann
  // user_confirmed ODER user_refined sein) und fällt daher auf "unknown".
  assert.match(herkunftLabel({ status: 'web_verified', provenance: ['web'] }), /nicht geprüft/)
  assert.match(herkunftLabel({ status: 'identified', provenance: ['enfal'] }), /nicht geprüft/)
  assert.equal(herkunftLabel({ status: 'provided', provenance: ['user'] }), 'Nutzerangabe, unbestätigt')
  assert.equal(herkunftLabel({ status: 'confirmed', provenance: ['enfal', 'web'] }), 'unbestätigt')
})

test('herkunftLabel: doppelte Provenance-Einträge werden nicht doppelt gelistet', () => {
  assert.equal(
    herkunftLabel({ status: 'confirmed', verification_state: 'user_confirmed', provenance: ['user', 'web', 'web'] }),
    'Nutzerangabe, stimmt mit Webrecherche überein (keine Fahrzeugprüfung)',
  )
})

test('herkunftLabel: unbekannter Provenance-Code wird nicht erfunden/angezeigt', () => {
  assert.equal(
    herkunftLabel({ status: 'plausible', verification_state: 'plausible', provenance: ['irgendwas_unbekanntes'] }),
    'ENFAL-Datenbank (plausibilisiert, nicht gesichert)',
  )
})

// ── B: Antriebsart (Motor/Energie) vs. Antrieb (Radantrieb) — Begriffe eindeutig ──

test('FahrzeugprofilKarte: powertrain und drivetrain haben eindeutig unterscheidbare Labels', () => {
  assert.equal(FELD_LABEL.powertrain, 'Antriebsart (Motor/Energie)')
  assert.equal(FELD_LABEL.drivetrain, 'Antrieb (Radantrieb)')
  assert.notEqual(FELD_LABEL.powertrain, FELD_LABEL.drivetrain)
})

test('FahrzeugprofilKarte: liest field_evidence pro Feld (kein pauschaler SourceBadge)', () => {
  assert.match(details, /vehicleIdentity\.field_evidence|baueVehicleIdentityFelder/)
  assert.doesNotMatch(details, /<SourceBadge/)
})

// ── Echte UI-Fixtures: baueVehicleIdentityFelder (tatsächlicher Render-Code) ───
// Keine fahrzeugspezifischen Produktions-Fixes — die folgenden Marken/Modelle
// sind generische Stellvertreter für die geforderten Antriebsarten.

test('UI-Fixture: Benziner, Inseratangabe stimmt mit DB-Variante überein (keine Fahrzeugprüfung behauptet)', () => {
  const felder = baueVehicleIdentityFelder({
    make: 'Testmarke', model: 'Modell A', fuel: 'Benzin', powertrain: 'Verbrenner',
    field_evidence: {
      fuel: { status: 'confirmed', verification_state: 'user_confirmed', provenance: ['user', 'enfal'] },
      powertrain: { status: 'identified', verification_state: 'reference_only', provenance: ['enfal'] },
    },
  })
  const kraftstoff = felder.find((f) => f.label === 'Kraftstoff')
  const antriebsart = felder.find((f) => f.label === FELD_LABEL.powertrain)
  assert.equal(kraftstoff?.herkunft, 'Nutzerangabe, stimmt mit ENFAL-Datenbank überein (keine Fahrzeugprüfung)')
  assert.match(antriebsart?.herkunft ?? '', /nicht geprüft/)
})

test('UI-Fixture: Diesel, reine Nutzerangabe ohne unabhängige Bestätigung', () => {
  const felder = baueVehicleIdentityFelder({
    fuel: 'Diesel',
    field_evidence: { fuel: { status: 'provided', verification_state: 'user_only', provenance: ['user'] } },
  })
  assert.equal(felder.find((f) => f.label === 'Kraftstoff')?.herkunft, 'Nutzerangabe, unbestätigt')
})

test('UI-Fixture: HEV (Hybrid) — nur durch Webrecherche plausibilisiert, am Fahrzeug nicht geprüft', () => {
  const felder = baueVehicleIdentityFelder({
    powertrain: 'Hybrid',
    field_evidence: { powertrain: { status: 'web_verified', verification_state: 'web_only', provenance: ['web'] } },
  })
  const f = felder.find((x) => x.label === FELD_LABEL.powertrain)
  assert.equal(f?.value, 'Hybrid')
  assert.match(f?.herkunft ?? '', /Webrecherche.*nicht geprüft/)
})

test('UI-Fixture: PHEV — widersprüchliche Evidence bleibt als Widerspruch sichtbar', () => {
  const felder = baueVehicleIdentityFelder({
    powertrain: 'Plug-in-Hybrid',
    field_evidence: { powertrain: { status: 'conflict', verification_state: 'conflict', provenance: ['user'] } },
  })
  assert.equal(felder.find((f) => f.label === FELD_LABEL.powertrain)?.herkunft, 'widersprüchliche Angaben')
})

test('UI-Fixture: BEV — DB-Referenz ohne Fahrzeugabgleich (keine Bestätigung behauptet)', () => {
  const felder = baueVehicleIdentityFelder({
    powertrain: 'BEV',
    field_evidence: { powertrain: { status: 'identified', verification_state: 'reference_only', provenance: ['enfal'] } },
  })
  const f = felder.find((x) => x.label === FELD_LABEL.powertrain)
  assert.equal(f?.value, 'BEV')
  assert.doesNotMatch(f?.herkunft ?? '', /^bestätigt/)
})

test('UI-Fixture: unbekannter Antrieb — Feld fehlt, kein erfundener Eintrag in der Liste', () => {
  const felder = baueVehicleIdentityFelder({ make: 'Testmarke', model: 'Modell B', powertrain: null })
  assert.equal(felder.find((f) => f.label === FELD_LABEL.powertrain), undefined)
})

test('UI-Fixture: fehlende Evidence für ein gesetztes Feld -> "unbestätigt", kein Crash', () => {
  const felder = baueVehicleIdentityFelder({ fuel: 'Benzin', field_evidence: {} })
  assert.equal(felder.find((f) => f.label === 'Kraftstoff')?.herkunft, 'unbestätigt')
})

test('UI-Fixture: gar keine vehicleIdentity -> leere Liste, kein Crash', () => {
  assert.deepEqual(baueVehicleIdentityFelder(null), [])
  assert.deepEqual(baueVehicleIdentityFelder(undefined), [])
})

// ── Echte UI-Fixtures: NoMarketCard / technical_coverage über MarktpreisModul ──

test('UI-Fixture: fehlende Rechercheabdeckung (technical_coverage "partial") -> ehrlicher Hinweis, keine Vollständigkeit', () => {
  const text = TECHNICAL_COVERAGE_LABEL.partial
  assert.match(text, /teilweise/)
  assert.doesNotMatch(text, /vollständig|geprüft|verifiziert/i)
})

test('UI-Fixture: teilweise abgeschlossene Recherche (technical_coverage "db_plus_web") nennt beide Quellen, keine Bewertung', () => {
  const text = TECHNICAL_COVERAGE_LABEL.db_plus_web
  assert.match(text, /ENFAL-Fahrzeugdatenbank/)
  assert.match(text, /Webrecherche/)
  assert.doesNotMatch(text, /vollständig|ausreichend/i)
})

test('UI-Fixture: Default "db" ohne explizite Web-Recherche behauptet keine Qualität/Vollständigkeit', () => {
  // app/technical_research.py::technical_coverage — "db" bedeutet nur "DB-Treffer
  // vorhanden, kein Web-Fallback nötig", NICHT "Felder vollständig/geprüft".
  assert.doesNotMatch(TECHNICAL_COVERAGE_LABEL.db, /vollständig|geprüft|verifiziert|ausreichend/i)
})

// ── N18: neutrale Hinweisbox bei fehlenden Schwachstellen- und Wartungsdaten ──

/** Nur ganze Kommentarzeilen entfernen (der Blockkommentar-Filter pairt in dieser Datei falsch). */
function zeilenOhneKommentar(quelle: string): string {
  return quelle.split(/\r?\n/).filter((z) => !/^\s*(\/\/|\{\/\*)/.test(z)).join('\n')
}

test('N18: das strukturierte Feld technik_datenluecke steuert die Box (kein Wortlaut)', () => {
  assert.equal(istTechnikEingeschraenkt({ technik_datenluecke: ['Schwachstellen', 'Wartung'] }), true)
  assert.equal(istTechnikEingeschraenkt({ technik_datenluecke: [] }), false)
  assert.equal(istTechnikEingeschraenkt({ technik_datenluecke: null }), false)
  // Ältere gespeicherte Ergebnisse besitzen das Feld nicht: bisherige Darstellung.
  assert.equal(istTechnikEingeschraenkt({}), false)
  // Ein Wortlaut der Überschrift allein löst nichts aus.
  const nurText = { empfehlung_anzeige: 'Analyse eingeschränkt: keine bestätigten Schwachstellen- und Wartungsdaten' }
  assert.equal(istTechnikEingeschraenkt(nurText as unknown as KaufCheckResult), false)
})

test('N18: die neutrale Box hat weder grüne Farbe noch den Kaufhaken', () => {
  assert.doesNotMatch(NEUTRALE_BOX.bg + NEUTRALE_BOX.label_cls, /green/)
  const code = zeilenOhneKommentar(view)
  const zweig = code.slice(code.indexOf('istTechnikEingeschraenkt(result)'), code.indexOf('const subtitle'))
  assert.match(zweig, /NEUTRALE_BOX/)
  assert.match(zweig, /<Info /)
  assert.doesNotMatch(zweig, /CheckCircle|green/)
  // Ableitung nur aus dem Signal, nicht aus der Überschrift.
  assert.doesNotMatch(zweig, /empfehlung_anzeige|eingeschränkt/i)
})

test('N18: ohne Signal bleibt die bisherige Darstellung (Config nach empfehlung, Anzeige vom Backend)', () => {
  const code = zeilenOhneKommentar(view)
  assert.match(code, /EMPFEHLUNG_CONFIG\[empf\] \?\? EMPFEHLUNG_CONFIG\.unbekannt/)
  assert.match(code, /: basisStyle/)
  assert.match(code, /result\.empfehlung_anzeige \|\| recStyle\.label/)
  assert.match(types, /technik_datenluecke\?: string\[\] \| null/)
})

// ── N20: graue N18-Box zeigt keine "Technische Einschätzung" in der Preiszeile ──

test('N20: Preiszeile ohne "Technische Einschätzung", wenn technik_datenluecke gesetzt ist; Preisgrenze bleibt', () => {
  const code = zeilenOhneKommentar(details)
  const zeile = code.slice(code.indexOf('export function PreisDimensionZeile'), code.indexOf('export function EmpfehlungsGruende'))
  assert.match(zeile, /istTechnikEingeschraenkt\(result\)/)
  assert.match(zeile, /\{!technikEingeschraenkt && <>Technische Einschätzung · <\/>\}/)
  // Preisgrenze samt Grund bleibt in beiden Zweigen sichtbar.
  assert.match(zeile, /nicht bewertbar<\/span> \(keine belastbare Marktpreisbasis\)/)
  assert.match(zeile, /Preis separat bewertet \(siehe Marktpreis\)/)
  // Normalfall und ältere Ergebnisse (kein Feld): bisherige Darstellung bleibt.
  assert.equal(istTechnikEingeschraenkt({}), false)
  assert.equal(istTechnikEingeschraenkt({ technik_datenluecke: [] }), false)
})

test('Z: Wartungshinweis -- reine Zeitregel hat null statt Kilometerfelder; "entfernt" wird als offene Zeitfrage gezeigt', () => {
  const t = ohneKommentare(types)
  assert.match(t, /punkt_km\?: number \| null/)
  assert.match(t, /differenz_km\?: number \| null/)
  const d = ohneKommentare(details)
  // Die Karte liest keine Kilometerfelder: eine Zeitregel ohne Kilometerpunkt rendert ohne Sonderfall.
  assert.ok(!/\.punkt_km|\.differenz_km|\.punkt_bis_km/.test(d))
  assert.match(d, /entfernt:\s*\{\s*text:\s*'Zeitfrage offen'/)
  assert.match(d, /darueber:\s*\{\s*text:\s*'Nachweis prüfen'/)
})
