import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Lock, Loader2 } from 'lucide-react'
import { apiKaufeCheck, apiPaymentStatus } from '../api/client'
import type { CheckProdukt } from '../api/client'
import { useAuth } from '../context/AuthContext'

/**
 * Kauf-Gate für einen einzelnen Check.
 *
 * GRUNDREGEL
 * ----------
 * Diese Komponente schaltet NICHTS frei. Sie zeigt nur an, was der Server
 * sagt, und schickt den Nutzer zum serverseitig erzeugten Stripe-Checkout.
 * Weder die Success-URL noch ein Query-Parameter noch irgendein lokaler Zustand
 * erzeugt eine Berechtigung — die entsteht ausschliesslich serverseitig nach
 * einem verifizierten Zahlungsereignis.
 *
 * NACH DER RÜCKKEHR VON STRIPE
 * ----------------------------
 * `?payment=success` bedeutet nur „der Kunde ist zurück", nicht „bezahlt".
 * Deshalb wird der Kontingentstand beim Server nachgefragt und kurz gepollt,
 * solange der Webhook noch unterwegs sein kann. Kommt in dieser Zeit nichts an,
 * endet die Anzeige in einem verständlichen Zustand — nicht in einem
 * endlosen Spinner.
 */

export const PRODUKT_INFO: Record<CheckProdukt, { titel: string; preis: string; route: string }> = {
  kaufcheck:     { titel: 'KaufCheck',     preis: '9,99 €', route: '/kaufcheck' },
  verkaufscheck: { titel: 'VerkaufsCheck', preis: '7,99 €', route: '/verkaufscheck' },
}

/** Wie lange nach der Rückkehr auf den Webhook gewartet wird. */
const BESTAETIGUNG_TIMEOUT_MS = 20_000
const BESTAETIGUNG_INTERVALL_MS = 2_000

type Bestaetigung = 'inaktiv' | 'laeuft' | 'freigeschaltet' | 'zeitueberschreitung' | 'abgebrochen'

/**
 * Liest die verfügbaren Berechtigungen für ein Produkt aus dem Server-Status.
 * MAX-Abo zählt als unbegrenzt; das generische Alt-Kontingent gilt weiterhin
 * für beide Check-Arten.
 */
function verfuegbar(status: Awaited<ReturnType<typeof apiPaymentStatus>>, produkt: CheckProdukt): boolean {
  if (!status) return false
  if (status.unbegrenzt || status.abo_typ === 'max') return true
  const typisiert = produkt === 'kaufcheck'
    ? status.kaufchecks_verbleibend ?? 0
    : status.verkaufschecks_verbleibend ?? 0
  return typisiert > 0 || (status.checks_verbleibend ?? 0) > 0
}

/**
 * Verarbeitet die Rückkehr von Stripe für eine Check-Seite.
 * Gibt den Bestätigungszustand zurück; der Aufrufer rendert daraus die UI.
 */
export function usePaymentReturn(produkt: CheckProdukt, onFreigeschaltet: () => void) {
  const [zustand, setZustand] = useState<Bestaetigung>('inaktiv')
  const gestartet = useRef(false)

  useEffect(() => {
    if (gestartet.current) return
    gestartet.current = true

    const params = new URLSearchParams(window.location.search)
    const payment = params.get('payment')
    if (payment !== 'success' && payment !== 'cancelled') return

    // Query-Parameter sofort entfernen: er ist kein Zahlungsnachweis und soll
    // beim Neuladen/Teilen der URL nichts erneut auslösen.
    window.history.replaceState({}, '', PRODUKT_INFO[produkt].route)

    if (payment === 'cancelled') {
      setZustand('abgebrochen')
      return
    }

    setZustand('laeuft')
    const start = Date.now()
    let abgebrochen = false

    const pruefe = async () => {
      if (abgebrochen) return
      try {
        const status = await apiPaymentStatus()
        if (verfuegbar(status, produkt)) {
          setZustand('freigeschaltet')
          onFreigeschaltet()
          return
        }
      } catch {
        // Netzwerk-Aussetzer: weiter versuchen, bis das Zeitfenster endet.
      }
      if (Date.now() - start >= BESTAETIGUNG_TIMEOUT_MS) {
        setZustand('zeitueberschreitung')
        return
      }
      window.setTimeout(pruefe, BESTAETIGUNG_INTERVALL_MS)
    }
    pruefe()

    return () => { abgebrochen = true }
  }, [produkt, onFreigeschaltet])

  return zustand
}

export function PaymentReturnHinweis({ zustand }: { zustand: Bestaetigung }) {
  if (zustand === 'inaktiv' || zustand === 'freigeschaltet') return null

  if (zustand === 'laeuft') {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-3">
        <Loader2 size={18} className="text-blue-600 animate-spin shrink-0" />
        <p className="text-sm text-blue-800">Zahlung wird bestätigt …</p>
      </div>
    )
  }

  if (zustand === 'abgebrochen') {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-4">
        <p className="text-sm text-gray-700">
          Die Zahlung wurde abgebrochen. Es wurde nichts berechnet und nichts freigeschaltet.
        </p>
      </div>
    )
  }

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
      <p className="text-sm text-amber-800">
        Deine Zahlung wird noch verarbeitet. Das dauert normalerweise nur wenige Sekunden.
        Lade die Seite gleich neu — sobald die Zahlung bestätigt ist, kannst du den Check starten.
      </p>
    </div>
  )
}

export default function PurchaseGate({
  produkt,
  onSchliessen,
}: {
  produkt: CheckProdukt
  onSchliessen?: () => void
}) {
  const { user } = useAuth()
  const info = PRODUKT_INFO[produkt]
  const [agbChecked, setAgbChecked] = useState(false)
  const [widerrufChecked, setWiderrufChecked] = useState(false)
  const [laedt, setLaedt] = useState(false)
  const [fehler, setFehler] = useState<string | null>(null)

  const kaufen = useCallback(async () => {
    if (!agbChecked || !widerrufChecked || laedt) return
    setLaedt(true)
    setFehler(null)
    try {
      const { url } = await apiKaufeCheck(produkt, agbChecked, widerrufChecked)
      window.location.href = url
    } catch (e) {
      setFehler(e instanceof Error ? e.message : 'Der Kauf konnte nicht gestartet werden.')
      setLaedt(false)
    }
  }, [agbChecked, widerrufChecked, laedt, produkt])

  if (!user) return null

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
          <Lock size={18} className="text-amber-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-amber-900 mb-1">
            {info.titel} freischalten
          </p>
          <p className="text-sm text-amber-700 mb-4">
            Für diesen {info.titel} ist noch keine Berechtigung vorhanden.
            Du zahlst <strong>{info.preis} einmalig</strong> für genau einen {info.titel} —
            kein Abo, keine automatische Verlängerung.
          </p>

          <div className="space-y-2.5 mb-4">
            <label className="flex items-start gap-2.5 cursor-pointer select-none">
              <input type="checkbox" checked={agbChecked} onChange={(e) => setAgbChecked(e.target.checked)}
                className="mt-0.5 shrink-0 w-4 h-4 accent-amber-700" />
              <span className="text-xs text-amber-800 leading-relaxed">
                Ich akzeptiere die <Link to="/agb" className="underline">AGB</Link>
                {' '}und die <Link to="/datenschutz" className="underline">Datenschutzerklärung</Link>.
              </span>
            </label>
            <label className="flex items-start gap-2.5 cursor-pointer select-none">
              <input type="checkbox" checked={widerrufChecked} onChange={(e) => setWiderrufChecked(e.target.checked)}
                className="mt-0.5 shrink-0 w-4 h-4 accent-amber-700" />
              <span className="text-xs text-amber-800 leading-relaxed">
                Ich stimme ausdrücklich zu, dass vor Ablauf der Widerrufsfrist mit der Ausführung
                begonnen wird. Mir ist bekannt, dass ich dadurch mein{' '}
                <Link to="/widerruf" className="underline">Widerrufsrecht</Link> verliere.
              </span>
            </label>
          </div>

          {fehler && (
            <p className="text-xs text-red-700 bg-red-50 border border-red-200 rounded-lg px-3 py-2 mb-3">
              {fehler}
            </p>
          )}

          <div className="flex gap-2 flex-wrap">
            <button
              type="button"
              onClick={kaufen}
              disabled={!agbChecked || !widerrufChecked || laedt}
              className="px-4 py-2 bg-amber-600 hover:bg-amber-700 disabled:opacity-40 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
            >
              {laedt && <Loader2 size={15} className="animate-spin" />}
              {info.titel} für {info.preis} freischalten
            </button>
            {onSchliessen && (
              <button
                type="button"
                onClick={onSchliessen}
                className="px-4 py-2 bg-amber-100 hover:bg-amber-200 text-amber-800 rounded-lg text-sm transition-colors"
              >
                Schließen
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
