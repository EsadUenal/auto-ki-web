import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle, AlertTriangle, ChevronRight, Zap, Star, Crown } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { apiChangePassword, apiDeleteAccount, apiCancelSubscription } from '../api/client'

const ABO_INFO = {
  none:  { label: 'Kostenlos',  icon: null,                  cls: 'bg-gray-100 text-gray-600' },
  light: { label: 'Light',      icon: <Zap size={12} />,     cls: 'bg-blue-100 text-blue-700' },
  pro:   { label: 'Pro',        icon: <Star size={12} />,    cls: 'bg-orange-100 text-orange-700' },
  max:   { label: 'Max',        icon: <Crown size={12} />,   cls: 'bg-purple-100 text-purple-700' },
} as const

type Lang = 'de' | 'en'
const LANG_LABELS: Record<Lang, string> = { de: 'Deutsch', en: 'English' }

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="border border-gray-100 rounded-2xl overflow-hidden">
      <div className="px-6 py-4 bg-gray-50 border-b border-gray-100">
        <h2 className="text-sm font-semibold text-gray-700 tracking-wide uppercase">{title}</h2>
      </div>
      <div className="divide-y divide-gray-100">{children}</div>
    </div>
  )
}

function Row({ children }: { children: React.ReactNode }) {
  return <div className="px-6 py-5">{children}</div>
}

function Label({ children }: { children: React.ReactNode }) {
  return <p className="text-sm font-medium text-gray-700 mb-3">{children}</p>
}

function SuccessBanner({ msg, onClose }: { msg: string; onClose: () => void }) {
  return (
    <div className="flex items-center gap-2 px-4 py-3 bg-green-50 border border-green-200 rounded-xl text-sm text-green-800 mb-4">
      <CheckCircle size={16} className="shrink-0 text-green-600" />
      <span className="flex-1">{msg}</span>
      <button onClick={onClose} className="text-green-600 hover:text-green-800 text-xs font-medium">✕</button>
    </div>
  )
}

function ErrorMsg({ msg }: { msg: string }) {
  return (
    <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2 mt-2">{msg}</p>
  )
}

export default function SettingsView() {
  const { user, logout, refreshUser } = useAuth()
  const navigate = useNavigate()

  // ── Passwort ändern ──────────────────────────────────────────────────────────
  const [pwAlt, setPwAlt] = useState('')
  const [pwNeu, setPwNeu] = useState('')
  const [pwConfirm, setPwConfirm] = useState('')
  const [pwLoading, setPwLoading] = useState(false)
  const [pwError, setPwError] = useState<string | null>(null)
  const [pwOk, setPwOk] = useState(false)

  async function handlePwSubmit(e: React.FormEvent) {
    e.preventDefault()
    setPwError(null)
    if (pwNeu !== pwConfirm) { setPwError('Neue Passwörter stimmen nicht überein.'); return }
    if (pwNeu.length < 8)    { setPwError('Neues Passwort muss mindestens 8 Zeichen haben.'); return }
    setPwLoading(true)
    try {
      await apiChangePassword(pwAlt, pwNeu)
      setPwAlt(''); setPwNeu(''); setPwConfirm('')
      setPwOk(true)
    } catch (err) {
      setPwError((err as Error).message)
    } finally {
      setPwLoading(false)
    }
  }

  // ── Konto deaktivieren ───────────────────────────────────────────────────────
  const [deleteStep, setDeleteStep] = useState<'idle' | 'confirm' | 'pw'>('idle')
  const [deletePw, setDeletePw] = useState('')
  const [deleteLoading, setDeleteLoading] = useState(false)
  const [deleteError, setDeleteError] = useState<string | null>(null)

  async function handleDelete(e: React.FormEvent) {
    e.preventDefault()
    setDeleteError(null)
    setDeleteLoading(true)
    try {
      await apiDeleteAccount(deletePw)
      await logout()
      navigate('/login', { replace: true })
    } catch (err) {
      setDeleteError((err as Error).message)
      setDeleteLoading(false)
    }
  }

  // ── Abo kündigen ─────────────────────────────────────────────────────────────
  const [cancelStep, setCancelStep] = useState<'idle' | 'confirm'>('idle')
  const [cancelLoading, setCancelLoading] = useState(false)
  const [cancelError, setCancelError] = useState<string | null>(null)
  const [cancelOk, setCancelOk] = useState(false)

  async function handleCancel() {
    setCancelError(null)
    setCancelLoading(true)
    try {
      await apiCancelSubscription()
      await refreshUser()
      setCancelStep('idle')
      setCancelOk(true)
    } catch (err) {
      setCancelError((err as Error).message)
    } finally {
      setCancelLoading(false)
    }
  }

  // ── Sprache ──────────────────────────────────────────────────────────────────
  const [sprache, setSprache] = useState<Lang>(
    () => (localStorage.getItem('auto-ki-sprache') as Lang | null) ?? 'de'
  )

  function handleSprache(lang: Lang) {
    setSprache(lang)
    localStorage.setItem('auto-ki-sprache', lang)
  }

  if (!user) return null
  const abo = ABO_INFO[user.abo_typ]
  const hatAbo = user.abo_typ !== 'none'

  const fmt = (d: string) =>
    new Date(d).toLocaleDateString('de-DE', { day: '2-digit', month: 'long', year: 'numeric' })

  return (
    <div className="h-full overflow-y-auto bg-white">
      <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">

        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight mb-1">Einstellungen</h1>
          <p className="text-sm text-gray-500">Konto, Abo und Darstellung verwalten</p>
        </div>

        {/* ── Konto ── */}
        <Section title="Konto">

          <Row>
            <Label>E-Mail-Adresse</Label>
            <p className="text-sm text-gray-900 bg-gray-50 rounded-lg px-3 py-2 border border-gray-100 w-fit">
              {user.email}
            </p>
          </Row>

          <Row>
            <Label>Passwort ändern</Label>
            {pwOk && <SuccessBanner msg="Passwort erfolgreich geändert." onClose={() => setPwOk(false)} />}
            <form onSubmit={handlePwSubmit} className="space-y-3">
              {[
                { label: 'Aktuelles Passwort', val: pwAlt, set: setPwAlt },
                { label: 'Neues Passwort',     val: pwNeu, set: setPwNeu },
                { label: 'Passwort bestätigen', val: pwConfirm, set: setPwConfirm },
              ].map(({ label, val, set }) => (
                <div key={label}>
                  <label className="block text-xs text-gray-500 mb-1">{label}</label>
                  <input
                    type="password"
                    value={val}
                    onChange={e => set(e.target.value)}
                    required
                    autoComplete="off"
                    className="w-full max-w-xs px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-gray-300"
                  />
                </div>
              ))}
              {pwError && <ErrorMsg msg={pwError} />}
              <button
                type="submit"
                disabled={pwLoading}
                className="px-4 py-2 text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                {pwLoading ? 'Wird gespeichert…' : 'Passwort ändern'}
              </button>
            </form>
          </Row>

          <Row>
            <Label>Konto deaktivieren</Label>
            <p className="text-xs text-gray-500 mb-3">
              Dein Konto wird deaktiviert und der Login gesperrt. Deine Daten bleiben erhalten
              und können auf Anfrage wiederhergestellt werden.
            </p>

            {deleteStep === 'idle' && (
              <button
                onClick={() => setDeleteStep('confirm')}
                className="px-4 py-2 text-sm font-medium text-red-600 border border-red-200 rounded-lg hover:bg-red-50 transition-colors"
              >
                Konto deaktivieren
              </button>
            )}

            {deleteStep === 'confirm' && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-3 max-w-sm">
                <div className="flex items-start gap-2">
                  <AlertTriangle size={16} className="text-red-500 shrink-0 mt-0.5" />
                  <p className="text-sm text-red-800 font-medium">Konto wirklich deaktivieren?</p>
                </div>
                <p className="text-xs text-red-700">
                  Du wirst sofort ausgeloggt und kannst dich nicht mehr einloggen.
                  Aktive Abos bitte vorher kündigen.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setDeleteStep('pw')}
                    className="px-3 py-1.5 text-xs font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
                  >
                    Ja, weiter
                  </button>
                  <button
                    onClick={() => setDeleteStep('idle')}
                    className="px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Abbrechen
                  </button>
                </div>
              </div>
            )}

            {deleteStep === 'pw' && (
              <form onSubmit={handleDelete} className="space-y-3 max-w-sm">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">Passwort zur Bestätigung</label>
                  <input
                    type="password"
                    value={deletePw}
                    onChange={e => setDeletePw(e.target.value)}
                    required
                    autoFocus
                    className="w-full px-3 py-2 text-sm border border-red-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-300"
                  />
                </div>
                {deleteError && <ErrorMsg msg={deleteError} />}
                <div className="flex gap-2">
                  <button
                    type="submit"
                    disabled={deleteLoading}
                    className="px-3 py-1.5 text-xs font-medium bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                  >
                    {deleteLoading ? 'Wird deaktiviert…' : 'Endgültig deaktivieren'}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setDeleteStep('idle'); setDeletePw(''); setDeleteError(null) }}
                    className="px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Abbrechen
                  </button>
                </div>
              </form>
            )}
          </Row>
        </Section>

        {/* ── Abo ── */}
        <Section title="Abo verwalten">
          <Row>
            <div className="flex items-center justify-between">
              <div>
                <Label>Aktuelles Abo</Label>
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full ${abo.cls}`}>
                    {abo.icon}
                    {abo.label}
                  </span>
                  {hatAbo && user.abo_typ !== 'max' && (
                    <span className="text-xs text-gray-500">{user.checks_verbleibend} Checks verbleibend</span>
                  )}
                  {hatAbo && user.abo_typ === 'max' && (
                    <span className="text-xs text-gray-500">Unbegrenzte Checks</span>
                  )}
                </div>
                {user.abo_kuendigt_zum && (
                  <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5 mt-3 w-fit">
                    Dein Abo endet am {fmt(user.abo_kuendigt_zum)} · danach zurück auf Kostenlos
                  </p>
                )}
              </div>
              <button
                onClick={() => navigate('/pricing')}
                className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 transition-colors"
              >
                Tarife <ChevronRight size={14} />
              </button>
            </div>
          </Row>

          {hatAbo && !user.abo_kuendigt_zum && (
            <Row>
              {cancelOk && (
                <SuccessBanner
                  msg={`Kündigung bestätigt. Dein Abo endet am ${user.abo_kuendigt_zum ? fmt(user.abo_kuendigt_zum) : '…'}`}
                  onClose={() => setCancelOk(false)}
                />
              )}
              <Label>Abo kündigen</Label>
              <p className="text-xs text-gray-500 mb-3">
                Das Abo läuft bis zum Ende der aktuellen Abrechnungsperiode weiter,
                danach erfolgt keine weitere Abbuchung.
              </p>

              {cancelStep === 'idle' && (
                <button
                  onClick={() => setCancelStep('confirm')}
                  className="px-4 py-2 text-sm font-medium text-gray-700 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Abo kündigen
                </button>
              )}

              {cancelStep === 'confirm' && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-3 max-w-sm">
                  <p className="text-sm font-medium text-amber-800">Abo wirklich kündigen?</p>
                  <p className="text-xs text-amber-700">
                    Du kannst das Abo bis zum Periodenende weiternutzen.
                    Danach wird kein Geld mehr abgebucht.
                  </p>
                  {cancelError && <ErrorMsg msg={cancelError} />}
                  <div className="flex gap-2">
                    <button
                      onClick={handleCancel}
                      disabled={cancelLoading}
                      className="px-3 py-1.5 text-xs font-medium bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors disabled:opacity-50"
                    >
                      {cancelLoading ? 'Wird gekündigt…' : 'Ja, kündigen'}
                    </button>
                    <button
                      onClick={() => { setCancelStep('idle'); setCancelError(null) }}
                      className="px-3 py-1.5 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
                    >
                      Abbrechen
                    </button>
                  </div>
                </div>
              )}
            </Row>
          )}

          {!hatAbo && (
            <Row>
              <p className="text-sm text-gray-500 mb-3">
                Noch kein Abo aktiv. Entdecke unsere Tarife.
              </p>
              <button
                onClick={() => navigate('/pricing')}
                className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium bg-gray-900 text-white rounded-lg hover:bg-gray-700 transition-colors"
              >
                Jetzt upgraden <ChevronRight size={14} />
              </button>
            </Row>
          )}
        </Section>

        {/* ── Sprache ── */}
        <Section title="Sprache">
          <Row>
            <Label>App-Sprache</Label>
            <div className="flex gap-2">
              {(['de', 'en'] as Lang[]).map(lang => (
                <button
                  key={lang}
                  onClick={() => handleSprache(lang)}
                  className={`px-4 py-2 text-sm rounded-lg border transition-colors font-medium ${
                    sprache === lang
                      ? 'bg-gray-900 text-white border-gray-900'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                  }`}
                >
                  {LANG_LABELS[lang]}
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-400 mt-2">
              Vollständige Übersetzung folgt in einer späteren Version.
            </p>
          </Row>
        </Section>

      </div>
    </div>
  )
}
