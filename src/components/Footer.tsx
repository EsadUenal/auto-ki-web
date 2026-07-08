import { Link } from 'react-router-dom'

// Dezenter, globaler Rechts-Footer. Bewusst unaufdringlich: dünne Leiste, gedämpfte
// Links, Hover im Marken-Orange — passt zur hellen, warmen Designsprache der App.

const LEGAL_LINKS = [
  { to: '/impressum', label: 'Impressum' },
  { to: '/datenschutz', label: 'Datenschutz' },
  { to: '/agb', label: 'AGB' },
  { to: '/widerruf', label: 'Widerruf' },
]

function Dot() {
  return <span className="text-gray-300 select-none">·</span>
}

export default function Footer() {
  return (
    <footer className="shrink-0 border-t border-[#ece7e0] bg-[#fbf9f6]/70 backdrop-blur-sm">
      <div className="max-w-5xl mx-auto px-4 py-2.5 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs text-gray-400">
        {LEGAL_LINKS.map((l, i) => (
          <span key={l.to} className="flex items-center gap-3">
            {i > 0 && <Dot />}
            <Link to={l.to} className="hover:text-orange-600 transition-colors">{l.label}</Link>
          </span>
        ))}
        <Dot />
        <a href="mailto:support@getvira.de" className="hover:text-orange-600 transition-colors">Support</a>
        <Dot />
        <span className="text-gray-300">v0.1.0</span>
      </div>
    </footer>
  )
}
