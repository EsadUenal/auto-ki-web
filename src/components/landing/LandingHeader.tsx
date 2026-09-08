import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import { REGISTER_ROUTE } from './links'
import { FOKUS_RING } from './styles'
import { useDunkelDarunter } from './motion'

/**
 * Marketing-Header der Landingpage.
 *
 * Bewusst NICHT die App-Sidebar: die Landingpage spricht Besucher ohne Konto
 * an, denen eine Werkzeugnavigation nichts sagt. Die Consumer-Werkzeuge selbst
 * laufen unverändert in der App-Shell.
 */

const NAV = [
  { href: '#produkte',   label: 'Produkte' },
  { href: '#ablauf',     label: "So funktioniert's" },
  { href: '#preise',     label: 'Preise' },
  { href: '#faq',        label: 'FAQ' },
]

export default function LandingHeader() {
  const [offen, setOffen] = useState(false)
  // Der Header schwebt ueber wechselnden Flaechen. Bleibt er immer hell, sitzt
  // ueber der dunklen Pruef- und Plus-Buehne ein heller Balken, der aussieht,
  // als gehoere er nicht zur Seite. Er faerbt sich deshalb weich mit.
  const dunkel = useDunkelDarunter()

  // Hintergrund nicht scrollen lassen, solange der Drawer offen ist.
  useEffect(() => {
    if (!offen) return
    const vorher = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = vorher }
  }, [offen])

  return (
    <header
      data-header-dunkel={dunkel ? 'ja' : 'nein'}
      className="sticky top-0 z-40 border-b backdrop-blur-md transition-colors duration-500 ease-out"
      style={{
        backgroundColor: dunkel ? 'rgba(17,16,20,0.82)' : 'rgba(251,249,246,0.90)',
        borderColor: dunkel ? 'rgba(255,255,255,0.10)' : '#ece7e0',
      }}
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex h-16 items-center justify-between gap-4">
          <Link to="/" className={`flex items-center gap-2.5 shrink-0 rounded-lg ${FOKUS_RING}`} aria-label="Vira, Startseite">
            <img src="/logo.svg" alt="" aria-hidden="true" className="h-8 w-8 rounded-lg" />
            <span className={`text-lg font-bold tracking-tight transition-colors duration-500 ${dunkel ? 'text-white' : 'text-gray-900'}`}>Vira</span>
          </Link>

          <nav aria-label="Hauptnavigation" className="hidden md:flex items-center gap-1">
            {NAV.map((n) => (
              <a key={n.href} href={n.href}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-500 ${FOKUS_RING} ${
                  dunkel
                    ? 'text-white/70 hover:bg-white/10 hover:text-white'
                    : 'text-gray-600 hover:bg-[#f1ece4] hover:text-gray-900'
                }`}>
                {n.label}
              </a>
            ))}
          </nav>

          <div className="hidden md:flex items-center gap-2">
            <Link to="/login"
              className={`rounded-lg px-3.5 py-2 text-sm font-semibold transition-colors duration-500 ${FOKUS_RING} ${
                dunkel
                  ? 'text-white/80 hover:bg-white/10 hover:text-white'
                  : 'text-gray-700 hover:bg-[#f1ece4] hover:text-gray-900'
              }`}>
              Anmelden
            </Link>
            <Link to={REGISTER_ROUTE}
              className={`rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_10px_22px_-12px_rgba(249,115,22,0.8)] transition-colors hover:bg-orange-600 ${FOKUS_RING}`}>
              Kostenlos starten
            </Link>
          </div>

          <button type="button" onClick={() => setOffen(true)}
            aria-label="Menü öffnen" aria-expanded={offen} aria-controls="landing-drawer"
            className={`md:hidden -mr-2 rounded-lg p-2 transition-colors duration-500 ${FOKUS_RING} ${
              dunkel ? 'text-white/80 hover:bg-white/10' : 'text-gray-600 hover:bg-[#f1ece4]'
            }`}>
            <Menu size={22} aria-hidden="true" />
          </button>
        </div>
      </div>

      {/* Mobiler Drawer */}
      {offen && (
        <div className="md:hidden fixed inset-0 z-50">
          <div className="absolute inset-0 bg-gray-900/40" onClick={() => setOffen(false)} aria-hidden="true" />
          <div id="landing-drawer" role="dialog" aria-modal="true" aria-label="Navigation"
            className="absolute right-0 top-0 h-full w-[84%] max-w-xs overflow-y-auto border-l border-[#ece7e0] bg-[#fbf9f6] p-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <span className="text-base font-bold tracking-tight text-gray-900">Menü</span>
              <button type="button" onClick={() => setOffen(false)} aria-label="Menü schließen"
                className={`-mr-2 rounded-lg p-2 text-gray-600 transition-colors hover:bg-[#f1ece4] ${FOKUS_RING}`}>
                <X size={20} aria-hidden="true" />
              </button>
            </div>

            <nav aria-label="Hauptnavigation mobil" className="mt-5 flex flex-col gap-1">
              {NAV.map((n) => (
                <a key={n.href} href={n.href} onClick={() => setOffen(false)}
                  className={`rounded-lg px-3 py-3 text-[15px] font-medium text-gray-700 transition-colors hover:bg-[#f1ece4] ${FOKUS_RING}`}>
                  {n.label}
                </a>
              ))}
            </nav>

            <div className="mt-5 flex flex-col gap-2 border-t border-[#ece7e0] pt-5">
              <Link to="/login" onClick={() => setOffen(false)}
                className={`rounded-xl border border-[#e6e1da] bg-white px-4 py-3 text-center text-sm font-semibold text-gray-700 ${FOKUS_RING}`}>
                Anmelden
              </Link>
              <Link to={REGISTER_ROUTE} onClick={() => setOffen(false)}
                className={`rounded-xl bg-orange-500 px-4 py-3 text-center text-sm font-semibold text-white ${FOKUS_RING}`}>
                Kostenlos starten
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  )
}
