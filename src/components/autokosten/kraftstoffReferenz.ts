// Kraftstoff-Referenz im Autokosten-Rechner — Anzeige- und Übernahmeregeln.
//
// Der Wert selbst kommt aus dem Backend (EU Weekly Oil Bulletin, Deutschland).
// Hier steht nur, WANN er ins Formular darf und WIE er beschriftet wird:
//
//   * Übernommen wird ausschließlich in ein LEERES Feld. Ein vom Nutzer
//     eingetippter Preis wird nie überschrieben — auch nicht beim späteren
//     Eintreffen der Antwort (Race beim Tippen).
//   * Nur ein amtlich aktueller Wert (`status === 'ok'`) wird vorbelegt.
//     Ein veralteter Stand wird ANGEZEIGT, aber nicht eingetragen: sonst stünde
//     eine Monate alte Zahl kommentarlos im Feld.
//   * Für Elektro gibt es bewusst keine Referenz (siehe Backend).

import type { ApiKraftstoffReferenz } from '../../api/client'
import type { AutokostenForm, Kraftstoff } from './logic'

export type Referenzen = Partial<Record<'benzin' | 'diesel', ApiKraftstoffReferenz>>

export function alsMap(liste: ApiKraftstoffReferenz[]): Referenzen {
  const out: Referenzen = {}
  for (const r of liste) {
    if (r.kraftstoff === 'benzin' || r.kraftstoff === 'diesel') out[r.kraftstoff] = r
  }
  return out
}

/** Preis deutsch formatiert, so wie er im Eingabefeld stehen soll ('2,35'). */
export function alsFeldwert(preis: number): string {
  return preis.toLocaleString('de-DE', { minimumFractionDigits: 2, maximumFractionDigits: 3 })
}

/** ISO-Datum -> '21.09.2026'. Unparsbares bleibt unverändert stehen. */
export function formatDatum(iso: string | null): string {
  if (!iso) return ''
  const d = new Date(`${iso}T00:00:00`)
  if (Number.isNaN(d.getTime())) return iso
  return d.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

/**
 * Referenzwerte in leere Preisfelder übernehmen. Gibt ein NEUES Form-Objekt
 * zurück; ist nichts zu tun, kommt exakt dasselbe Objekt zurück (der Aufrufer
 * kann daran erkennen, dass kein Re-Render nötig ist).
 */
export function uebernehmeReferenz(form: AutokostenForm, ref: Referenzen): AutokostenForm {
  let geaendert = false
  const next = { ...form }
  for (const art of ['benzin', 'diesel'] as const) {
    const r = ref[art]
    if (!r || r.status !== 'ok' || typeof r.preis !== 'number') continue
    const feld = art === 'benzin' ? 'preisBenzin' : 'preisDiesel'
    if ((form[feld] ?? '').trim() !== '') continue     // Nutzereingabe gewinnt IMMER
    next[feld] = alsFeldwert(r.preis)
    geaendert = true
  }
  return geaendert ? next : form
}

/** Kurzlabel unter dem Preisfeld, z. B. 'Deutschland-Referenz · Stand 21.09.2026'. */
export function referenzLabel(r: ApiKraftstoffReferenz | undefined): string | null {
  if (!r || typeof r.preis !== 'number') return null
  if (r.status === 'fallback') return 'Ersatzwert (nicht amtlich) · bitte selbst prüfen'
  if (r.status === 'veraltet') return `Älterer Stand: ${formatDatum(r.quelle_datum)} · bitte prüfen`
  if (r.status === 'ok') return `Deutschland-Referenz · Stand ${formatDatum(r.quelle_datum)}`
  return null
}

/** Die Referenz, die zur aktuell gewählten Kraftstoffart gehört (Elektro: keine). */
export function referenzFuer(k: Kraftstoff, ref: Referenzen): ApiKraftstoffReferenz | undefined {
  return k === 'benzin' ? ref.benzin : k === 'diesel' ? ref.diesel : undefined
}
