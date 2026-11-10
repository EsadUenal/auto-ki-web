import type { KaufCheckResult } from '../types.ts'

/**
 * N18: Technikrecherche lief, ergab aber weder belastbare Schwachstellen- noch
 * Wartungsdaten. Das Backend setzt dafür das strukturierte Feld
 * `technik_datenluecke` (Liste der Datenarten). Das Frontend leitet das NICHT aus
 * dem Wortlaut der Überschrift ab. Ältere Ergebnisse besitzen das Feld nicht und
 * behalten ihre bisherige Darstellung.
 */
export function istTechnikEingeschraenkt(result: Pick<KaufCheckResult, 'technik_datenluecke'>): boolean {
  return Array.isArray(result.technik_datenluecke) && result.technik_datenluecke.length > 0
}

/** Neutrale Hinweisbox: weder grün noch Kaufhaken (kein Freigabe-Eindruck). */
export const NEUTRALE_BOX = {
  bg: 'bg-slate-50 border-slate-200',
  label_cls: 'text-slate-700',
} as const
