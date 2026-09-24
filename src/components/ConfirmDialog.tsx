import { useEffect, useRef } from 'react'
import { AlertTriangle } from 'lucide-react'

interface ConfirmDialogProps {
  /** Sichtbar, sobald gesetzt. `null` = geschlossen. */
  offen: boolean
  titel: string
  /** Was genau betroffen ist — z. B. der Titel des History-Eintrags. */
  detail?: string
  hinweis?: string
  bestaetigenLabel?: string
  abbrechenLabel?: string
  onBestaetigen: () => void
  onAbbrechen: () => void
}

/**
 * Bestätigung für zerstörerische Aktionen. Es gab im Frontend bisher keine
 * Dialog-Komponente (nur `window.confirm` an einer Stelle im Dealer-Bereich) —
 * diese hier ist der ENFAL-Weg: gleiche Karten-Optik wie der Rest der App,
 * Escape schließt, Klick auf den Hintergrund schließt (wie beim Mobile-Menü
 * und beim Konto-Popover), Fokus startet auf "Abbrechen" und geht danach an
 * das auslösende Element zurück.
 */
export default function ConfirmDialog({
  offen, titel, detail, hinweis,
  bestaetigenLabel = 'Löschen',
  abbrechenLabel = 'Abbrechen',
  onBestaetigen, onAbbrechen,
}: ConfirmDialogProps) {
  const abbrechenRef = useRef<HTMLButtonElement>(null)
  const vorherFokussiert = useRef<HTMLElement | null>(null)

  useEffect(() => {
    if (!offen) return
    vorherFokussiert.current = (document.activeElement as HTMLElement) ?? null
    abbrechenRef.current?.focus()
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { e.preventDefault(); onAbbrechen() }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      vorherFokussiert.current?.focus?.()
    }
  }, [offen, onAbbrechen])

  if (!offen) return null

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/40"
      onClick={onAbbrechen}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-titel"
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-sm rounded-2xl border border-[#e6e1da] bg-white p-5 shadow-[0_24px_60px_-20px_rgba(40,25,10,0.45)]"
      >
        <div className="flex items-start gap-3">
          <span className="inline-flex items-center justify-center w-9 h-9 rounded-xl bg-red-50 text-red-600 shrink-0">
            <AlertTriangle size={17} />
          </span>
          <div className="min-w-0">
            <h2 id="confirm-dialog-titel" className="text-sm font-semibold text-gray-900">
              {titel}
            </h2>
            {detail && (
              <p className="mt-1 text-sm text-gray-600 break-words line-clamp-2">{detail}</p>
            )}
            {hinweis && (
              <p className="mt-2 text-xs text-gray-500 leading-relaxed">{hinweis}</p>
            )}
          </div>
        </div>

        <div className="mt-5 flex items-center justify-end gap-2">
          <button
            ref={abbrechenRef}
            onClick={onAbbrechen}
            className="px-3.5 py-2 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-100 transition-colors"
          >
            {abbrechenLabel}
          </button>
          <button
            onClick={onBestaetigen}
            className="px-3.5 py-2 rounded-lg text-sm font-semibold text-white bg-red-600 hover:bg-red-700 transition-colors"
          >
            {bestaetigenLabel}
          </button>
        </div>
      </div>
    </div>
  )
}
