import { AlertTriangle, Scissors } from 'lucide-react'

/**
 * Sichtbare Kennzeichnung einer Antwort, die KEINE vollstaendige Antwort ist (CHAT-1).
 *
 *  - `unvollstaendig`: die Antwort ist nach bereits empfangenem Text abgebrochen. Der Text steht
 *    noch da, gilt aber nicht als vollstaendige Aussage und wird nicht gespeichert.
 *  - `abgeschnitten`: das Modell hat am Output-Limit gestoppt.
 */
export default function AntwortHinweis({
  art,
}: {
  art: 'unvollstaendig' | 'abgeschnitten'
}) {
  if (art === 'abgeschnitten') {
    return (
      <span
        className="inline-flex items-center gap-1 text-xs bg-amber-50 text-amber-700 border border-amber-200 rounded-full px-2.5 py-0.5"
        title="Das Modell hat die maximale Antwortlänge erreicht. Frag gezielt nach dem fehlenden Teil."
      >
        <Scissors size={11} /> Antwort gekürzt
      </span>
    )
  }
  return (
    <p
      role="status"
      className="mt-2 inline-flex items-start gap-1.5 text-xs bg-amber-50 text-amber-800 border border-amber-200 rounded-lg px-2.5 py-1.5"
    >
      <AlertTriangle size={12} className="mt-0.5 shrink-0" />
      <span>
        Antwort unvollständig: die Verbindung ist abgebrochen. Der Text oben ist nur ein Teil und
        wurde nicht gespeichert. Stell die Frage bitte noch einmal.
      </span>
    </p>
  )
}
