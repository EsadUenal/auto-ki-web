import type { KaufCheckResult } from '../types'

/**
 * Fahrzeug-Titelzeile für den Decision-Header — eigenständiges Modul, damit
 * sich die Zusammensetzung isoliert testen lässt (wie `huEingabe.ts` und
 * `kaufcheckFelder.ts`).
 *
 * BEFUND (Produktion, BMW M4 F82 2016): die Titelzeile zeigte
 * "BMW M4 M4 · F82 · 2016 · M4 · S55B30 · 431 PS". Ursache: `model` ("M4") und
 * `model_variant` ("M4", vom Performance-Marker) sind für ein performance-
 * benanntes Modell IDENTISCH, und `engine_name` ("M4") wiederholt denselben
 * Wert ein drittes Mal — die Titelzeile hängte Segmente aneinander, ohne auf
 * bereits gezeigte Wort-Token zu prüfen. Fix ist GENERISCH (kein
 * Marken-/Modell-Sonderfall): jedes Wort-Token wird global genau einmal
 * gezeigt, unabhängig davon, aus welchem Identitätsfeld es stammt — dieselbe
 * Regel wie im Backend `VehicleIdentity.essenziell()`
 * (app/vehicle_identity.py), die aus genau diesem Grund existiert.
 */

/** Wort-Token eines Textes, lowercase, für den Vergleich "schon gezeigt?". */
function woerter(text: string): string[] {
  return text.split(/\s+/).filter(Boolean)
}

/**
 * Hängt `segment` an `teile` an, aber nur die Wörter, die in `gesehen` noch
 * nicht vorkommen. Bleibt nach dem Filtern nichts übrig, wird gar nichts
 * angehängt (kein leeres " · "-Trenner-Segment).
 */
function anhaengenOhneWiederholung(teile: string[], gesehen: Set<string>, segment?: string | null): void {
  if (!segment) return
  // Inkrementell prüfen UND sofort eintragen — sonst entkommt eine
  // Wiederholung INNERHALB desselben Segments der Prüfung (z.B. "M4 M4" aus
  // make+model+model_variant in einem einzigen Aufruf).
  const neu: string[] = []
  for (const w of woerter(segment)) {
    const key = w.toLowerCase()
    if (gesehen.has(key)) continue
    gesehen.add(key)
    neu.push(w)
  }
  if (neu.length === 0) return
  teile.push(neu.join(' '))
}

/**
 * Fahrzeug-Titelzeile für den Decision-Header. Bei neuen Checks ist
 * `vehicle_identity` die einzige Quelle. Die alten Fallbacks dienen
 * ausschließlich gespeicherten Ergebnissen, die dieses Feld noch nicht
 * enthalten.
 *
 * Regel (markenübergreifend, kein Hardcoding): kein Wort-Token erscheint
 * zweimal in der zusammengesetzten Zeile, unabhängig davon, aus welchem Feld
 * (Modell, Variante, Motor, Motorcode, ...) es stammt.
 */
export function fahrzeugTitel(
  result: KaufCheckResult,
  form: { marke: string; modell: string; baujahr: number; motor: string },
): string {
  const teile: string[] = []
  const gesehen = new Set<string>()
  const identity = result.vehicle_identity
  if (identity) {
    anhaengenOhneWiederholung(teile, gesehen,
      [identity.make, identity.model, identity.model_variant].filter(Boolean).join(' '))
    anhaengenOhneWiederholung(teile, gesehen, identity.generation)
    anhaengenOhneWiederholung(teile, gesehen, identity.year ? String(identity.year) : null)
    anhaengenOhneWiederholung(teile, gesehen, identity.engine_name)
    if (identity.engine_code && identity.engine_code !== identity.engine_name) {
      anhaengenOhneWiederholung(teile, gesehen, identity.engine_code)
    }
    anhaengenOhneWiederholung(teile, gesehen, identity.horsepower ? `${identity.horsepower} PS` : null)
    return teile.join(' · ')
  }
  const webId = result.web_identitaet

  if (webId?.belegt && (webId.marke || webId.modell)) {
    anhaengenOhneWiederholung(teile, gesehen, [webId.marke, webId.modell].filter(Boolean).join(' '))
    anhaengenOhneWiederholung(teile, gesehen, webId.generation)
  } else {
    anhaengenOhneWiederholung(teile, gesehen, [form.marke, form.modell].filter(Boolean).join(' '))
    anhaengenOhneWiederholung(teile, gesehen, result.fahrzeugkontext?.generation)
  }
  anhaengenOhneWiederholung(teile, gesehen, form.baujahr ? String(form.baujahr) : null)

  const motorLabel = webId?.belegt && webId.motor ? webId.motor : (result.motor_erkannt && form.motor ? form.motor : null)
  anhaengenOhneWiederholung(teile, gesehen, motorLabel)

  return teile.filter(Boolean).join(' · ')
}
