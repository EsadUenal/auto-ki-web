import type { VerlaufItem } from '../api/client'
import type { CarContext, Message } from '../types'

/**
 * Baut den Gespraechsverlauf, den das Backend fuer eine Folgefrage braucht.
 *
 * Bewusst als reine Funktion ausgelagert: das Gespraechsgedaechtnis ist die
 * Eigenschaft, an der der Chat zuletzt gescheitert ist ("Welche drei Fahrzeuge
 * meinst du?" direkt nach der eigenen Empfehlung). Als eigenstaendige Funktion
 * ist sie ohne DOM und ohne Provider pruefbar.
 *
 * Regeln:
 *  - Reihenfolge bleibt exakt erhalten (aelteste zuerst) — das Backend leitet
 *    daraus die Rollenabfolge user/model/user ab.
 *  - Leere Nachrichten (z.B. die noch streamende Assistenten-Blase) fallen raus.
 *  - Ein vorausgewaehltes Fahrzeug wird als kurzer Gespraechseinstieg
 *    vorangestellt, nicht in die eigentliche Frage gemischt.
 *  - CHAT-1: Eine Assistenten-Nachricht mit `status` (Fehlermeldung, Kontingenthinweis,
 *    abgebrochene Teilantwort) ist keine Antwort. Sie faellt samt der Frage, auf die sie
 *    antwortet, aus dem Verlauf — sonst wuerde ein Fehlertext oder ein halber Satz beim
 *    naechsten Mal als Aussage der KI weitergereicht.
 */
export function baueVerlauf(priorMessages: Message[], car?: CarContext): VerlaufItem[] {
  const brauchbar: Message[] = []
  for (const m of priorMessages) {
    if (m.role === 'assistant' && m.status) {
      const letzte = brauchbar[brauchbar.length - 1]
      if (letzte && letzte.role === 'user') brauchbar.pop()
      continue
    }
    brauchbar.push(m)
  }

  const historyItems: VerlaufItem[] = brauchbar
    .filter((m) => m.content)
    .map((m) => ({
      rolle: m.role === 'user' ? ('user' as const) : ('ki' as const),
      text: m.content,
    }))

  if (!car) return historyItems

  return [
    { rolle: 'user' as const, text: `Ich interessiere mich für den ${car.titel}.` },
    { rolle: 'ki' as const, text: `Verstanden! Ich beantworte alle deine Fragen direkt bezogen auf den ${car.titel}.` },
    ...historyItems,
  ]
}

/**
 * Ob ein fertiger Austausch als vollstaendiger Austausch gespeichert werden darf:
 * nur ohne gemeldeten Fehler/Abbruch und mit nicht leerer Antwort.
 */
export function istSpeicherbar(antwort: string, fehlerGemeldet: boolean): boolean {
  return !fehlerGemeldet && antwort.trim().length > 0
}
