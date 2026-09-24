// Kanonischer Auswahl-Zustand der Sidebar.
//
// Vorher leitete jede History-Gruppe ihre orange Markierung aus einem eigenen,
// unverbundenen Wert ab: der Chat-Verlauf aus `activeConvId` (immer gesetzt,
// unabhängig von der Route), die Werkzeug-Links aus `NavLink isActive`, die
// Check-Listen aus gar nichts. Dadurch konnten zwei Einträge gleichzeitig
// primär aktiv sein (Chat-Eintrag + Werkzeug "VerkaufsCheck").
//
// Hier entsteht daraus EINE Ableitung: Route + tatsächlich geöffnete Entität.
// Die Sidebar rendert nur noch, was diese Funktionen sagen.

export type SidebarSelection =
  | { art: 'chat'; id: string }
  | { art: 'check'; typ: 'kauf' | 'verkauf'; id: number }
  | { art: 'autofinder'; id: string }
  | { art: 'keine' }

export interface SelectionInput {
  /** `location.pathname` */
  pfad: string
  /** Aktive Chat-Konversation — nur gesetzt, wenn sie auch in der Sidebar steht
   *  (leere "Neuer Chat"-Konversationen tauchen dort nicht auf). */
  chatId: string | null
  /** Geöffneter gespeicherter KaufCheck (sonst null = Werkzeug-Startseite). */
  kaufCheckId: number | null
  /** Geöffneter gespeicherter VerkaufsCheck. */
  verkaufCheckId: number | null
  /** Geöffnete gespeicherte AutoFinder-Suche. */
  autofinderSucheId: string | null
}

/** `/chat` und `/chat/irgendwas`, aber nicht `/chatten`. */
export function istRoute(pfad: string, basis: string): boolean {
  return pfad === basis || pfad.startsWith(basis + '/')
}

export function berechneSelection(input: SelectionInput): SidebarSelection {
  const { pfad } = input
  if (istRoute(pfad, '/chat')) {
    return input.chatId ? { art: 'chat', id: input.chatId } : { art: 'keine' }
  }
  if (istRoute(pfad, '/kaufcheck')) {
    return input.kaufCheckId != null
      ? { art: 'check', typ: 'kauf', id: input.kaufCheckId }
      : { art: 'keine' }
  }
  if (istRoute(pfad, '/verkaufscheck')) {
    return input.verkaufCheckId != null
      ? { art: 'check', typ: 'verkauf', id: input.verkaufCheckId }
      : { art: 'keine' }
  }
  if (istRoute(pfad, '/autofinder')) {
    return input.autofinderSucheId
      ? { art: 'autofinder', id: input.autofinderSucheId }
      : { art: 'keine' }
  }
  return { art: 'keine' }
}

export function istChatAktiv(sel: SidebarSelection, id: string): boolean {
  return sel.art === 'chat' && sel.id === id
}

export function istCheckAktiv(sel: SidebarSelection, typ: 'kauf' | 'verkauf', id: number): boolean {
  return sel.art === 'check' && sel.typ === typ && sel.id === id
}

export function istSucheAktiv(sel: SidebarSelection, id: string): boolean {
  return sel.art === 'autofinder' && sel.id === id
}

/** Markierung eines Werkzeug-Menüpunkts.
 *  `primaer`   — das Werkzeug selbst ist der aktive Ort (keine gespeicherte
 *                Ansicht geöffnet): dieselbe orange Markierung wie bisher.
 *  `sekundaer` — das Werkzeug ist nur der Bereich, in dem ein konkreter
 *                History-Eintrag offen ist: dezent, NICHT orange.
 *  `keine`     — unbeteiligt. */
export function werkzeugMarkierung(
  sel: SidebarSelection,
  pfad: string,
  ziel: string,
): 'primaer' | 'sekundaer' | 'keine' {
  if (!istRoute(pfad, ziel)) return 'keine'
  return sel.art === 'keine' ? 'primaer' : 'sekundaer'
}

// ── Zeitstempel ───────────────────────────────────────────────────────────────

/** SQLite liefert `CURRENT_TIMESTAMP` als "YYYY-MM-DD HH:MM:SS" in **UTC**,
 *  ohne Zeitzonen-Kennung. `new Date(...)` liest so einen String als LOKALE
 *  Zeit — in Deutschland wären das im Sommer zwei Stunden zu früh. Deshalb
 *  wird dieses Format hier ausdrücklich als UTC gelesen.
 *  Millisekunden-Zahlen (AutoFinder-Historie) und echte ISO-Strings mit
 *  Zeitzone gehen unverändert an `Date`. */
export function parseHistorieZeit(wert: string | number | Date | null | undefined): Date | null {
  if (wert == null) return null
  if (wert instanceof Date) return Number.isNaN(wert.getTime()) ? null : wert
  if (typeof wert === 'number') {
    const d = new Date(wert)
    return Number.isNaN(d.getTime()) ? null : d
  }
  const roh = wert.trim()
  if (!roh) return null
  const sqlite = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::(\d{2}))?$/.exec(roh)
  if (sqlite) {
    const [, j, m, t, h, min, s] = sqlite
    return new Date(Date.UTC(+j, +m - 1, +t, +h, +min, s ? +s : 0))
  }
  const d = new Date(roh)
  return Number.isNaN(d.getTime()) ? null : d
}

function pad2(n: number): string {
  return n < 10 ? '0' + n : String(n)
}

function istSelberTag(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear()
    && a.getMonth() === b.getMonth()
    && a.getDate() === b.getDate()
}

/** Dezente Zweitzeile für History-Einträge, deutsche Schreibweise:
 *  "Heute · 18:42", "Gestern · 09:05", "23.09. · 19:15", "23.09.2025 · 19:15".
 *  Ohne verwertbaren Zeitstempel: leerer String (es wird nichts erfunden). */
export function formatHistorieZeit(
  wert: string | number | Date | null | undefined,
  jetzt: Date = new Date(),
): string {
  const d = parseHistorieZeit(wert)
  if (!d) return ''
  const uhr = `${pad2(d.getHours())}:${pad2(d.getMinutes())}`
  if (istSelberTag(d, jetzt)) return `Heute · ${uhr}`
  const gestern = new Date(jetzt.getFullYear(), jetzt.getMonth(), jetzt.getDate() - 1)
  if (istSelberTag(d, gestern)) return `Gestern · ${uhr}`
  const datum = d.getFullYear() === jetzt.getFullYear()
    ? `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}.`
    : `${pad2(d.getDate())}.${pad2(d.getMonth() + 1)}.${d.getFullYear()}`
  return `${datum} · ${uhr}`
}
