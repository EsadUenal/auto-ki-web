import type { KaufCheckForm } from '../types'

/**
 * Hilfsfunktionen für die strukturierten KaufCheck-Felder.
 *
 * Zwei Aufgaben, die beide NICHT in die View gehören, weil sie sich einzeln
 * testen lassen müssen:
 *
 *  1. Legacy-Abbildung beim Laden eines gespeicherten Checks. Bis zu diesem
 *     Stand speicherte das Formular `scheckheft: boolean`. Gespeicherte Checks
 *     tragen dieses Feld weiter und kennen `servicehistorie` nicht. Sie müssen
 *     sich weiterhin öffnen lassen — ohne Exception, ohne leeres Feld und ohne
 *     dass der bereits erzeugte Bericht angetastet wird.
 *
 *  2. Normalisierung eines freien Getriebe-Textes (AutoFinder-Prefill). Der
 *     AutoFinder liefert Werte wie "8-Gang-Automatik" oder "6-Gang Manuell";
 *     das Auswahlfeld kennt nur zwei Werte.
 */

const AUTOMATIK_WORTE = [
  'automatik', 'automatic', 'steptronic', 'tiptronic', 'dsg', 's tronic', 's-tronic',
  'dkg', 'doppelkupplung', 'pdk', 'cvt', 'wandler', 'multitronic', 'powershift',
  'edc', 'g-tronic',
]
const MANUELL_WORTE = ['schaltgetriebe', 'handschalt', 'manuell', 'handschalter', 'schaltung']

/**
 * Freien Getriebetext auf die zwei Auswahlwerte bringen; Unklares bleibt leer.
 *
 * Nennt der Text BEIDE Arten, wird nichts geraten — dann bleibt das Feld leer
 * und der Nutzer entscheidet. Dieselbe Regel wie im Backend (app/getriebe.py).
 */
export function normalisiereGetriebe(wert: unknown): KaufCheckForm['getriebe'] {
  const text = String(wert ?? '').toLowerCase().trim()
  if (!text) return ''
  const auto = AUTOMATIK_WORTE.some((w) => text.includes(w))
  const manu = MANUELL_WORTE.some((w) => text.includes(w))
  if (auto === manu) return ''
  return auto ? 'automatik' : 'manuell'
}

/**
 * Gespeicherte Formulardaten auf den aktuellen Stand bringen.
 *
 * Nur ADDITIV: vorhandene Werte werden nie überschrieben. Fehlt
 * `servicehistorie` und war die alte Checkbox gesetzt, entspricht das
 * "vollständig angegeben" — das war die einzige Aussage, die die Checkbox
 * übertragen konnte. War sie nicht gesetzt (oder fehlt sie), bleibt es bei
 * "Nicht angegeben": das alte Formular konnte "nicht angekreuzt" und "keine
 * Angabe" nicht unterscheiden, und aus dieser Nichtunterscheidung eine Aussage
 * zu machen wäre eine Behauptung über ein Inserat, das nie eine gemacht hat.
 *
 * Der gespeicherte BERICHT wird hier nicht angefasst — er bleibt exakt so, wie
 * er damals erzeugt wurde.
 */
export function mitLegacyServicehistorie(eingabe: KaufCheckForm): KaufCheckForm {
  // Die Felder sind im Typ verpflichtend, in einem gespeicherten JSON aber
  // schlicht nicht enthalten — deshalb der Fallback zur Laufzeit.
  const form: KaufCheckForm = {
    ...eingabe,
    getriebe: eingabe.getriebe ?? '',
    verkaeuferart: eingabe.verkaeuferart ?? '',
    servicehistorie: eingabe.servicehistorie ?? '',
  }
  if (!form.servicehistorie && eingabe.scheckheft === true) {
    return { ...form, servicehistorie: 'vollstaendig_angegeben' }
  }
  return form
}
