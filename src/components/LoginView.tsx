import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

type Mode = 'login' | 'register'

export default function LoginView() {
  const { login, register } = useAuth()
  const navigate = useNavigate()

  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [agbAccepted, setAgbAccepted] = useState(false)

  function switchMode(m: Mode) {
    setMode(m)
    setError(null)
    setPassword('')
    setConfirmPassword('')
    setAgbAccepted(false)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (mode === 'register' && password !== confirmPassword) {
      setError('Passwörter stimmen nicht überein.')
      return
    }
    if (mode === 'register' && !agbAccepted) {
      setError('Bitte akzeptiere die AGB und die Datenschutzerklärung.')
      return
    }

    setIsLoading(true)
    try {
      if (mode === 'login') {
        await login(email, password)
      } else {
        await register(email, password, agbAccepted)
      }
      navigate('/chat')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler aufgetreten.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{ background: 'linear-gradient(160deg, #090c12 0%, #0d0d0d 100%)' }}
    >
      {/* Subtle background glow */}
      <div
        className="fixed inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse 60% 40% at 50% 30%, rgba(249,115,22,0.06) 0%, transparent 70%)',
        }}
      />

      <div className="w-full max-w-md relative">
        {/* Logo */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 rounded-2xl overflow-hidden mb-3 shadow-lg"
               style={{ boxShadow: '0 0 32px rgba(249,115,22,0.35)' }}>
            <img src="/logo.svg" alt="Vira" className="w-full h-full" />
          </div>
          <h1 className="text-xl font-bold" style={{ color: 'rgba(255,255,255,0.92)' }}>
            Vira
          </h1>
          <p className="text-sm mt-1" style={{ color: 'rgba(255,255,255,0.35)' }}>
            Intelligente Beratung rund ums Auto
          </p>
        </div>

        {/* Card */}
        <div
          className="rounded-2xl overflow-hidden"
          style={{
            background: 'linear-gradient(145deg, rgba(255,255,255,0.07) 0%, rgba(255,255,255,0.03) 100%)',
            border: '1px solid rgba(255,255,255,0.1)',
            boxShadow: '0 24px 64px rgba(0,0,0,0.6)',
          }}
        >
          {/* Tab Toggle */}
          <div
            className="flex"
            style={{ borderBottom: '1px solid rgba(255,255,255,0.08)' }}
          >
            {(['login', 'register'] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => switchMode(m)}
                className="flex-1 py-4 text-sm font-medium transition-colors"
                style={{
                  color: mode === m ? 'rgba(255,255,255,0.92)' : 'rgba(255,255,255,0.35)',
                  borderBottom: mode === m ? '2px solid #f97316' : '2px solid transparent',
                  background: 'none',
                  marginBottom: '-1px',
                }}
              >
                {m === 'login' ? 'Anmelden' : 'Registrieren'}
              </button>
            ))}
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="p-6 space-y-4">
            {/* Error */}
            {error && (
              <div
                className="rounded-lg px-4 py-3 text-sm"
                style={{
                  background: 'rgba(239,68,68,0.12)',
                  border: '1px solid rgba(239,68,68,0.3)',
                  color: '#fca5a5',
                }}
              >
                {error}
              </div>
            )}

            {/* Email */}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>
                E-Mail
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="deine@email.de"
                className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all"
                style={{
                  background: 'rgba(255,255,255,0.06)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: 'rgba(255,255,255,0.9)',
                  caretColor: '#f97316',
                }}
                onFocus={(e) => (e.target.style.borderColor = 'rgba(249,115,22,0.6)')}
                onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
              />
            </div>

            {/* Password */}
            <div>
              <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>
                Passwort {mode === 'register' && <span style={{ color: 'rgba(255,255,255,0.3)' }}>(min. 8 Zeichen)</span>}
              </label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
                  placeholder="••••••••"
                  className="w-full rounded-xl px-4 py-3 pr-11 text-sm outline-none transition-all"
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: 'rgba(255,255,255,0.9)',
                    caretColor: '#f97316',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = 'rgba(249,115,22,0.6)')}
                  onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2"
                  style={{ color: 'rgba(255,255,255,0.35)' }}
                  tabIndex={-1}
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {/* Confirm Password (Register only) */}
            {mode === 'register' && (
              <div>
                <label className="block text-xs font-medium mb-1.5" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  Passwort bestätigen
                </label>
                <input
                  type={showPw ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  autoComplete="new-password"
                  placeholder="••••••••"
                  className="w-full rounded-xl px-4 py-3 text-sm outline-none transition-all"
                  style={{
                    background: 'rgba(255,255,255,0.06)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    color: 'rgba(255,255,255,0.9)',
                    caretColor: '#f97316',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = 'rgba(249,115,22,0.6)')}
                  onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.1)')}
                />
              </div>
            )}

            {/* AGB / Datenschutz — Pflicht bei Registrierung */}
            {mode === 'register' && (
              <label className="flex items-start gap-2.5 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={agbAccepted}
                  onChange={(e) => setAgbAccepted(e.target.checked)}
                  className="mt-0.5 shrink-0 w-4 h-4 accent-orange-500"
                />
                <span className="text-xs leading-relaxed" style={{ color: 'rgba(255,255,255,0.5)' }}>
                  Ich akzeptiere die{' '}
                  <Link to="/agb" className="underline hover:text-white/80">AGB</Link>
                  {' '}und die{' '}
                  <Link to="/datenschutz" className="underline hover:text-white/80">Datenschutzerklärung</Link>.
                </span>
              </label>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full rounded-xl py-3 text-sm font-semibold transition-all mt-2"
              style={{
                background: isLoading ? 'rgba(249,115,22,0.5)' : '#f97316',
                color: '#fff',
                boxShadow: isLoading ? 'none' : '0 4px 20px rgba(249,115,22,0.3)',
                cursor: isLoading ? 'not-allowed' : 'pointer',
              }}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <Loader2 size={16} className="animate-spin" />
                  {mode === 'login' ? 'Anmelden…' : 'Registrieren…'}
                </span>
              ) : (
                mode === 'login' ? 'Anmelden' : 'Konto erstellen'
              )}
            </button>
          </form>

          {/* Footer */}
          <div
            className="px-6 pb-5 text-center text-xs"
            style={{ color: 'rgba(255,255,255,0.25)' }}
          >
            {mode === 'login' ? (
              <>Noch kein Konto?{' '}
                <button onClick={() => switchMode('register')} className="underline" style={{ color: 'rgba(255,255,255,0.45)' }}>
                  Jetzt registrieren
                </button>
              </>
            ) : (
              <>Bereits registriert?{' '}
                <button onClick={() => switchMode('login')} className="underline" style={{ color: 'rgba(255,255,255,0.45)' }}>
                  Anmelden
                </button>
              </>
            )}
          </div>
        </div>

        {/* Rechtliches — auch ohne Login erreichbar (Impressum/Datenschutz) */}
        <div className="mt-6 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs"
          style={{ color: 'rgba(255,255,255,0.28)' }}>
          <Link to="/impressum" className="hover:text-white/70 transition-colors">Impressum</Link>
          <span className="select-none">·</span>
          <Link to="/datenschutz" className="hover:text-white/70 transition-colors">Datenschutz</Link>
          <span className="select-none">·</span>
          <Link to="/agb" className="hover:text-white/70 transition-colors">AGB</Link>
          <span className="select-none">·</span>
          <Link to="/widerruf" className="hover:text-white/70 transition-colors">Widerruf</Link>
        </div>
      </div>
    </div>
  )
}
