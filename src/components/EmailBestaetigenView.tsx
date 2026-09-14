import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { apiResendVerification, apiVerifyEmail } from '../api/client'
import { useAuth } from '../context/AuthContext'

// Landeseite des Bestätigungslinks aus der Registrierungsmail.
//
// Der Token steht im Fragment (#token=...): Fragmente schickt der Browser nie
// an einen Server, der Token taucht so in keinem Access-Log auf. Nach dem
// Auslesen wird er sofort aus der Adresszeile entfernt.
type Zustand = 'pruefe' | 'ok' | 'fehler' | 'ohne_token'

function tokenAusFragment(): string {
  const hash = typeof window === 'undefined' ? '' : window.location.hash.replace(/^#/, '')
  return new URLSearchParams(hash).get('token')?.trim() ?? ''
}

export default function EmailBestaetigenView() {
  const { user, refreshUser } = useAuth()
  const [zustand, setZustand] = useState<Zustand>('pruefe')
  const [meldung, setMeldung] = useState('')
  const [versand, setVersand] = useState<'' | 'laeuft' | 'gesendet' | 'fehler'>('')
  const gestartet = useRef(false)

  useEffect(() => {
    // StrictMode ruft Effekte doppelt auf — der Token ist aber nur EINMAL einlösbar.
    if (gestartet.current) return
    gestartet.current = true
    const token = tokenAusFragment()
    window.history.replaceState(null, '', window.location.pathname)
    if (!token) {
      setZustand('ohne_token')
      return
    }
    apiVerifyEmail(token)
      .then(() => {
        setZustand('ok')
        refreshUser().catch(() => {})
      })
      .catch((e: unknown) => {
        setZustand('fehler')
        setMeldung(e instanceof Error ? e.message : '')
      })
  }, [refreshUser])

  async function neuSenden() {
    setVersand('laeuft')
    try {
      const schonBestaetigt = await apiResendVerification()
      if (schonBestaetigt) {
        setZustand('ok')
        setVersand('')
        refreshUser().catch(() => {})
        return
      }
      setVersand('gesendet')
    } catch {
      setVersand('fehler')
    }
  }

  const titel = {
    pruefe: 'Deine E-Mail-Adresse wird bestätigt …',
    ok: 'E-Mail-Adresse bestätigt.',
    fehler: 'Das hat nicht geklappt.',
    ohne_token: 'Kein Bestätigungslink erkannt.',
  }[zustand]

  return (
    <div className="min-h-screen flex items-center justify-center px-6 py-16 bg-gray-50">
      <div className="max-w-md w-full text-center">
        <p className="text-[11px] font-bold tracking-[0.22em] uppercase text-gray-500">E-Mail-Bestätigung</p>
        <h1 className="mt-3 text-2xl font-bold text-gray-900 tracking-[-0.02em]">{titel}</h1>

        {zustand === 'ok' && (
          <p className="mt-3 text-sm text-gray-500 leading-relaxed">
            Deine kostenlosen Kontingente für KI-Chat und AutoFinder sind jetzt freigeschaltet.
          </p>
        )}
        {zustand === 'fehler' && (
          <p className="mt-3 text-sm text-gray-500 leading-relaxed">
            {meldung || 'Dieser Bestätigungslink ist ungültig oder abgelaufen.'}
          </p>
        )}
        {zustand === 'ohne_token' && (
          <p className="mt-3 text-sm text-gray-500 leading-relaxed">
            Öffne den Link bitte direkt aus der Bestätigungsmail.
          </p>
        )}

        {(zustand === 'fehler' || zustand === 'ohne_token') && (
          <div className="mt-6">
            {user ? (
              <button
                type="button"
                onClick={neuSenden}
                disabled={versand === 'laeuft' || versand === 'gesendet'}
                className="inline-flex items-center justify-center rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 disabled:opacity-60 transition-colors"
              >
                {versand === 'laeuft' ? 'Wird gesendet …' : versand === 'gesendet' ? 'Neuer Link unterwegs' : 'Neuen Link senden'}
              </button>
            ) : (
              <Link to="/login" className="inline-flex items-center justify-center rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 transition-colors">
                Anmelden, um einen neuen Link anzufordern
              </Link>
            )}
            {versand === 'gesendet' && (
              <p className="mt-3 text-xs text-gray-500">Ein neuer Bestätigungslink für {user?.email} wurde angefordert.</p>
            )}
            {versand === 'fehler' && (
              <p className="mt-3 text-xs text-red-600">Der Link konnte gerade nicht angefordert werden. Bitte versuche es gleich noch einmal.</p>
            )}
          </div>
        )}

        {zustand === 'ok' && (
          <Link to={user ? '/chat' : '/login'} className="mt-6 inline-flex items-center justify-center rounded-xl bg-orange-500 px-5 py-2.5 text-sm font-semibold text-white hover:bg-orange-600 transition-colors">
            {user ? 'Weiter zu ENFAL' : 'Zur Anmeldung'}
          </Link>
        )}
      </div>
    </div>
  )
}
