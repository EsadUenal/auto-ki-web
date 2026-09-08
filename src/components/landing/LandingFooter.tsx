import { Link } from 'react-router-dom'
import { PRICING_ROUTE, REGISTER_ROUTE, SUPPORT_MAILTO } from './links'
import { FOKUS_RING } from './styles'

/**
 * Footer der Landingpage.
 *
 * Eigenständig statt des schmalen App-Footers: eine Marketingseite endet nicht
 * mit einer Rechtszeile, sondern mit Orientierung. Verlinkt sind ausschliesslich
 * Routen, die existieren — Parts, Entdecken und E-Books tauchen bewusst NICHT
 * auf (geparkt bzw. nicht Consumer-sichtbar).
 */

const PRODUKT = [
  { to: '/autofinder',    label: 'AutoFinder' },
  { to: '/autokosten',    label: 'Autokosten-Rechner' },
  { to: '/kaufcheck',     label: 'KaufCheck' },
  { to: '/verkaufscheck', label: 'VerkaufsCheck' },
]

const RECHTLICH = [
  { to: '/impressum',   label: 'Impressum' },
  { to: '/datenschutz', label: 'Datenschutz' },
  { to: '/agb',         label: 'AGB' },
  { to: '/widerruf',    label: 'Widerruf' },
]

function Spalte({ titel, children }: { titel: string; children: React.ReactNode }) {
  return (
    <div>
      <h2 className="text-[11px] font-bold uppercase tracking-[0.16em] text-gray-400">{titel}</h2>
      <ul className="mt-3.5 space-y-2.5">{children}</ul>
    </div>
  )
}

function Zeile({ to, label }: { to: string; label: string }) {
  return (
    <li>
      <Link to={to} className={`rounded text-sm text-gray-600 transition-colors hover:text-orange-600 ${FOKUS_RING}`}>{label}</Link>
    </li>
  )
}

export default function LandingFooter() {
  return (
    <footer className="border-t border-[#ece7e0] bg-[#fbf9f6]">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 py-12 sm:py-14">
        <div className="grid gap-9 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <div className="flex items-center gap-2.5">
              <img src="/logo.svg" alt="" aria-hidden="true" className="h-8 w-8 rounded-lg" />
              <span className="text-lg font-bold tracking-tight text-gray-900">Vira</span>
            </div>
            <p className="mt-3.5 max-w-xs text-sm leading-relaxed text-gray-500">
              Fahrzeuge finden, vergleichen und prüfen. Von der ersten Suche bis zur
              Kaufentscheidung.
            </p>
          </div>

          <Spalte titel="Produkt">
            {PRODUKT.map((l) => <Zeile key={l.to} {...l} />)}
          </Spalte>

          <Spalte titel="Konto">
            <Zeile to={PRICING_ROUTE} label="Preise" />
            <Zeile to="/help" label="Hilfe" />
            <Zeile to="/login" label="Anmelden" />
            <Zeile to={REGISTER_ROUTE} label="Kostenlos starten" />
          </Spalte>

          <Spalte titel="Rechtliches">
            {RECHTLICH.map((l) => <Zeile key={l.to} {...l} />)}
            <li>
              <a href={SUPPORT_MAILTO} className={`rounded text-sm text-gray-600 transition-colors hover:text-orange-600 ${FOKUS_RING}`}>
                Kontakt / Support
              </a>
            </li>
          </Spalte>
        </div>

        <div className="mt-11 flex flex-col items-start justify-between gap-3 border-t border-[#ece7e0] pt-6 sm:flex-row sm:items-center">
          <p className="text-xs text-gray-400">
            © {new Date().getFullYear()} Vira · Alle Preise inkl. MwSt.
          </p>
          <p className="text-xs text-gray-400">
            Vira ersetzt keine technische Fahrzeugprüfung vor Ort.
          </p>
        </div>
      </div>
    </footer>
  )
}
