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
 */
export function baueVerlauf(priorMessages: Message[], car?: CarContext): VerlaufItem[] {
  const historyItems: VerlaufItem[] = priorMessages
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
