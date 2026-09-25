import { useEffect, useRef, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { apiRedeemBeta, apiResendVerification } from '../api/client'
import { useAuth } from '../context/AuthContext'
import {
  BETA_ROUTE,
  betaTokenAusFragment,
  clearBetaToken,
  readBetaToken,
  stageBetaToken,
} from './betaInvite'
import { setReturnTo } from './autofinder/logic'

// Landeseite des persönlichen Closed-Beta-Links.
//
// Der Token steht im Fragment (#token=...) und wird sofort nach dem Auslesen
// aus der Adresszeile entfernt — dieselbe Behandlung wie beim Bestätigungslink
// (EmailBestaetigenView). Er wird nie geloggt und nie angezeigt.
//
// Alle regulären Ausgänge kommen als HTTP 200 mit `status` zurück. Der Server
// unterscheidet dabei bewusst nur zwei Dinge: "du selbst hast das schon
// aktiviert" und "nicht verwendbar". Ein falsches Konto, ein abgelaufener und
// ein erfundener Token sehen von außen identisch aus, und es wird nie
// verraten, welche Adresse eingeladen war.
type Zustand =
  | 'pruefe'        // Einlösung läuft
  | 'anmelden'      // Einladung erkannt, aber kein Konto angemeldet
  | 'ok'            // aktiviert
  | 'schon_aktiv'   // dieses Konto hatte die Einladung bereits eingelöst
  | 'unbestaetigt'  // Adresse passt, ist aber noch nicht bestätigt
  | 'unbrauchbar'   // falsches Konto / abgelaufen / unbekannt / ersetzt
  | 'ohne_token'    // Seite ohne Einladungslink geöffnet
  | 'fehler'        // technischer Fehler (Netz, Server)

export default function BetaAcceptView() {
  const { user, isLoading, refreshUser } = useAuth()
  const navigate = useNavigate()
  const [zustand, setZustand] = useState<Zustand>('pruefe')
  const [meldung, setMeldung] = useState('')
  const [paket, setPaket] = useState<{ kauf: number; verkauf: number }>({ kauf: 0, verkauf: 0 })
  const [versand, setVersand] = useState<'' | 'laeuft' | 'gesendet' | 'fehler'>('')
  const eingeloest = useRef(false)

  // Token aus dem Fragment holen und die Adresszeile sofort säubern.
  //
  // Das Lesen MUSS in einem Effekt passieren und der Token MUSS dabei sofort in
  // den sessionStorage: `history.replaceState` entfernt das Fragment
  // unwiderruflich. Wird die Komponente danach noch einmal neu aufgebaut — im
  // Dev-Modus durch StrictMode, im Betrieb durch die verzögert eingeblendete
  // App-Shell (`startTransition` in App.tsx) — findet der zweite Durchlauf ein
  // leeres Fragment vor. Ohne die Zwischenablage wäre der Token dann weg, und
  // der Tester sähe "Kein Einladungslink erkannt", obwohl er einen gültigen
  // Link geöffnet hat.
  const [token, setToken] = useState<string | null>(null)

  useEffect(() => {
    function auswerten() {
      const ausFragment = betaTokenAusFragment()
      if (ausFragment) {
        stageBetaToken(ausFragment)        // überlebt Remount UND Anmeldung
        if (typeof window !== 'undefined') {
          window.history.replaceState(null, '', window.location.pathname)
        }
        setZustand('pruefe')               // neuer Link -> erneut auswerten
        eingeloest.current = false
      }
      setToken(ausFragment || readBetaToken())
    }
    auswerten()
    // Wer den Einladungslink einfügt, während er bereits auf /beta steht,
    // ändert nur das Fragment. Der Browser lädt dann nichts neu und React
    // baut nichts neu auf — ohne diesen Listener bliebe die Seite stumm auf
    // "Kein Einladungslink erkannt" stehen.
    window.addEventListener('hashchange', auswerten)
    return () => window.removeEventListener('hashchange', auswerten)
  }, [])

  useEffect(() => {
    if (token === null) return             // Fragment noch nicht ausgewertet
    if (isLoading) return                  // Auth-Status noch unbekannt
    const t = token
    if (!t) {
      setZustand('ohne_token')
      return
    }
    if (!user) {
      // Der Token liegt bereits im sessionStorage (oben beim Lesen). Hier fehlt
      // nur noch das Rücksprungziel, damit LoginView nach dem Anmelden wieder
      // hierher führt. Gespeichert ist weiterhin NUR der Token, kein Anspruch —
      // was er wert ist, entscheidet ausschließlich der Server.
      setReturnTo(BETA_ROUTE)
      setZustand('anmelden')
      return
    }
    // StrictMode ruft Effekte doppelt auf; die Einlösung ist serverseitig
    // zwar exactly-once, ein zweiter Aufruf wäre aber unnötiges Rauschen.
    if (eingeloest.current) return
    eingeloest.current = true
    void einloesen(t)
    // `einloesen` hängt nur an stabilen Referenzen (Setter, refreshUser) und
    // wird bewusst nicht als Abhängigkeit geführt.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isLoading, token])

  async function einloesen(t: string) {
    try {
      const res = await apiRedeemBeta(t)
      if (res.status !== 'email_unbestaetigt') clearBetaToken()
      if (res.status === 'aktiviert') {
        setPaket({ kauf: res.kaufchecks, verkauf: res.verkaufschecks })
        setZustand('ok')
        refreshUser().catch(() => {})
      } else if (res.status === 'bereits_aktiviert') {
        setZustand('schon_aktiv')
      } else if (res.status === 'email_unbestaetigt') {
        // Kein Fehlschlag, sondern ein Zwischenstand: die Einladung bleibt
        // serverseitig unverbraucht. Der Token wird deshalb NICHT verworfen,
        // damit der Tester nach dem Bestätigen direkt weitermachen kann.
        setZustand('unbestaetigt')
      } else {
        setZustand('unbrauchbar')
      }
    } catch (e: unknown) {
      // Technischer Fehler (Netz/Server): Token NICHT verwerfen, damit ein
      // erneuter Versuch möglich bleibt.
      setZustand('fehler')
      setMeldung(e instanceof Error ? e.message : '')
    }
  }

  const titel: Record<Zustand, string> = {
    pruefe: 'Einladung wird geprüft …',
    anmelden: 'Du wurdest zur ENFAL Closed Beta eingeladen.',
    ok: 'Closed Beta aktiviert',
    schon_aktiv: 'Deine Beta-Einladung wurde bereits aktiviert.',
    unbestaetigt: 'Bestätige zuerst deine E-Mail-Adresse.',
    unbrauchbar: 'Diese Einladung kann nicht verwendet werden.',
    ohne_token: 'Kein Einladungslink erkannt.',
    fehler: 'Das hat gerade nicht geklappt.',
  }

  const primaer =
    'inline-flex items-center justify-center rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 transition-colors'
  const sekundaer =
    'inline-flex items-center justify-center rounded-xl border border-gray-300 bg-white px-5 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 transition-colors'

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-16 bg-gray-50">
      <div className="max-w-md w-full text-center">
        <p className="text-[11px] font-bold tracking-[0.22em] uppercase text-gray-500">Closed Beta</p>
        <h1 className="mt-3 text-2xl font-bold text-gray-900 tracking-[-0.02em]">{titel[zustand]}</h1>

        {zustand === 'anmelden' && (
          <>
            <p className="mt-3 text-sm text-gray-500 leading-relaxed">
              Melde dich an oder erstelle ein Konto. Deine Einladung wird danach automatisch
              aktiviert. Bitte nutze die Adresse, an die die Einladung geschickt wurde.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/login" className={primaer}>Anmelden</Link>
              <Link to="/login?modus=register" className={sekundaer}>Konto erstellen</Link>
            </div>
          </>
        )}

        {zustand === 'ok' && (
          <>
            <p className="mt-3 text-sm text-gray-500 leading-relaxed">Dein Konto hat erhalten:</p>
            <ul className="mt-4 inline-block text-left text-sm text-gray-700 space-y-1.5">
              <li>• {paket.kauf} KaufCheck</li>
              <li>• {paket.verkauf} VerkaufsCheck</li>
            </ul>
            <p className="mt-4 text-sm text-gray-500 leading-relaxed">
              AutoFinder und KI-Chat kannst du mit deinem normalen kostenlosen Kontingent testen,
              der Autokosten-Rechner ist unbegrenzt.
            </p>
            {user && user.email_verified === false && (
              <p className="mt-4 text-sm text-gray-500 leading-relaxed">
                Für AutoFinder und KI-Chat bestätige bitte noch deine E-Mail-Adresse. Den Link
                dazu hast du bei der Registrierung bekommen.
              </p>
            )}
            <div className="mt-6">
              <button type="button" onClick={() => navigate('/chat')} className={primaer}>
                ENFAL testen
              </button>
            </div>
          </>
        )}

        {zustand === 'schon_aktiv' && (
          <>
            <p className="mt-3 text-sm text-gray-500 leading-relaxed">
              Du hast sie bereits eingelöst. Dein Konto hat die Beta-Checks schon bekommen.
            </p>
            <div className="mt-6">
              <button type="button" onClick={() => navigate('/chat')} className={primaer}>
                ENFAL testen
              </button>
            </div>
          </>
        )}

        {zustand === 'unbestaetigt' && (
          <>
            <p className="mt-3 text-sm text-gray-500 leading-relaxed">
              Deine Einladung ist für diese E-Mail-Adresse reserviert und bleibt gültig.
              Bestätige zuerst deine Adresse, danach kannst du die Closed Beta aktivieren.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
              <button
                type="button"
                onClick={async () => {
                  setVersand('laeuft')
                  try {
                    // Liefert true, wenn die Adresse inzwischen schon bestätigt
                    // ist. Dann direkt erneut einlösen, statt eine überflüssige
                    // Mail zu verschicken.
                    const schonBestaetigt = await apiResendVerification()
                    if (schonBestaetigt) {
                      setVersand('')
                      const t = token ?? ''
                      if (t) { setZustand('pruefe'); void einloesen(t) }
                      return
                    }
                    setVersand('gesendet')
                  } catch {
                    setVersand('fehler')
                  }
                }}
                disabled={versand === 'laeuft' || versand === 'gesendet'}
                className={primaer + ' disabled:opacity-60'}
              >
                {versand === 'laeuft' ? 'Wird gesendet …'
                  : versand === 'gesendet' ? 'Neuer Link unterwegs'
                  : 'Bestätigungs-E-Mail erneut senden'}
              </button>
              <button
                type="button"
                onClick={() => {
                  const t = token ?? ''
                  if (!t) { setZustand('ohne_token'); return }
                  setZustand('pruefe')
                  void einloesen(t)
                }}
                className={sekundaer}
              >
                Ich habe bestätigt
              </button>
            </div>
            {versand === 'gesendet' && (
              <p className="mt-3 text-xs text-gray-500">
                Wir haben dir einen neuen Bestätigungslink geschickt. Klicke ihn an und komm
                dann hierher zurück.
              </p>
            )}
            {versand === 'fehler' && (
              <p className="mt-3 text-xs text-red-600">
                Der Link konnte gerade nicht angefordert werden. Bitte versuche es gleich noch einmal.
              </p>
            )}
          </>
        )}

        {zustand === 'unbrauchbar' && (
          <>
            <p className="mt-3 text-sm text-gray-500 leading-relaxed">
              Diese Einladung kann mit diesem Konto nicht verwendet werden, oder sie ist nicht
              mehr gültig. Prüfe, ob du mit der Adresse angemeldet bist, an die die Einladung
              geschickt wurde.
            </p>
            <div className="mt-6 flex flex-col sm:flex-row gap-3 justify-center">
              <Link to="/chat" className={primaer}>Zu ENFAL</Link>
              {user && <Link to="/settings" className={sekundaer}>Konto ansehen</Link>}
            </div>
          </>
        )}

        {zustand === 'ohne_token' && (
          <p className="mt-3 text-sm text-gray-500 leading-relaxed">
            Öffne den Link bitte direkt aus deiner Einladungsmail.
          </p>
        )}

        {zustand === 'fehler' && (
          <>
            <p className="mt-3 text-sm text-gray-500 leading-relaxed">
              {meldung || 'Bitte versuche es gleich noch einmal.'}
            </p>
            <div className="mt-6">
              <button
                type="button"
                onClick={() => {
                  const t = token ?? ''
                  if (!t) { setZustand('ohne_token'); return }
                  setZustand('pruefe')
                  setMeldung('')
                  void einloesen(t)
                }}
                className={primaer}
              >
                Erneut versuchen
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
