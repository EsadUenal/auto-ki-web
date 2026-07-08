import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Scale, ShieldCheck, FileText, RotateCcw, Clock } from 'lucide-react'
import Footer from './Footer'

// ─────────────────────────────────────────────────────────────────────────────
// Technisches Gerüst für die Rechtsseiten. Enthält BEWUSST KEINE juristischen
// Inhalte — nur hochwertige Platzhalter + die vorgesehene Gliederung. Die finalen,
// rechtlich geprüften Texte werden später in `intro`/die Abschnitte eingesetzt.
// ─────────────────────────────────────────────────────────────────────────────

export type LegalPageKey = 'impressum' | 'datenschutz' | 'agb' | 'widerruf'

interface LegalConfig {
  title: string
  subtitle: string
  icon: React.ElementType
  intro: string        // sichtbarer Platzhalter — KEIN Rechtstext
  sections: string[]   // strukturelle Gliederung (Inhaltsverzeichnis), kein Inhalt
}

const CONFIG: Record<LegalPageKey, LegalConfig> = {
  impressum: {
    title: 'Impressum',
    subtitle: 'Anbieterangaben',
    icon: Scale,
    intro: 'Hier wird das vollständige Impressum eingefügt.',
    sections: [
      'Anbieter',
      'Kontakt',
      'Vertretungsberechtigte Person',
      'Umsatzsteuer-Identifikationsnummer',
      'Verantwortlich für den Inhalt',
      'Online-Streitbeilegung',
    ],
  },
  datenschutz: {
    title: 'Datenschutzerklärung',
    subtitle: 'Umgang mit personenbezogenen Daten',
    icon: ShieldCheck,
    intro: 'Hier wird die vollständige Datenschutzerklärung eingefügt.',
    sections: [
      'Verantwortlicher',
      'Erhobene Daten',
      'Zwecke der Verarbeitung',
      'Rechtsgrundlagen',
      'Empfänger & Auftragsverarbeiter',
      'Übermittlung in Drittländer',
      'Speicherdauer',
      'Cookies & lokale Speicherung',
      'Ihre Rechte',
    ],
  },
  agb: {
    title: 'Allgemeine Geschäftsbedingungen',
    subtitle: 'Nutzungsbedingungen',
    icon: FileText,
    intro: 'Hier werden die vollständigen Allgemeinen Geschäftsbedingungen eingefügt.',
    sections: [
      'Geltungsbereich',
      'Vertragsgegenstand',
      'Vertragsschluss',
      'Preise & Zahlung',
      'Laufzeit & Kündigung',
      'Verfügbarkeit',
      'Haftung',
      'Schlussbestimmungen',
    ],
  },
  widerruf: {
    title: 'Widerrufsbelehrung',
    subtitle: 'Informationen zum Widerrufsrecht',
    icon: RotateCcw,
    intro: 'Hier wird die vollständige Widerrufsbelehrung eingefügt.',
    sections: [
      'Widerrufsrecht',
      'Widerrufsfrist',
      'Ausübung des Widerrufs',
      'Folgen des Widerrufs',
      'Erlöschen bei digitalen Inhalten',
      'Muster-Widerrufsformular',
    ],
  },
}

export default function LegalView({ page }: { page: LegalPageKey }) {
  const navigate = useNavigate()
  const cfg = CONFIG[page]
  const Icon = cfg.icon

  return (
    <div
      className="relative h-full overflow-y-auto scrollbar-thin"
      style={{ background: 'radial-gradient(120% 60% at 50% 0%, #fdfaf6 0%, #faf7f3 40%, #f4f0ea 100%)' }}
    >
      {/* Ruhige warme Lichtquelle oben — identisch zu Hilfe/Einstellungen */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 overflow-hidden">
        <div className="ez-aurora absolute left-1/2 -translate-x-1/2 -top-40 w-[680px] h-[420px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(249,115,22,0.08) 0%, transparent 68%)' }} />
      </div>

      <div className="ez-rise relative max-w-2xl mx-auto px-6 py-10 space-y-6">

        {/* Zurück + Marke */}
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors"
          >
            <ArrowLeft size={15} /> Zurück
          </button>
          <div className="flex items-center gap-2">
            <img src="/logo.svg" alt="Vira" className="w-5 h-5 rounded-md" />
            <span className="text-sm font-semibold text-gray-900 tracking-tight">Vira</span>
          </div>
        </div>

        {/* Header */}
        <div>
          <div className="flex items-center gap-2.5 mb-4">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-orange-500/10 border border-orange-400/25 text-orange-500">
              <Icon size={12} />
            </span>
            <span className="text-[11px] font-bold tracking-[0.22em] uppercase text-gray-500">Vira · Rechtliches</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-[-0.02em] mb-1">{cfg.title}</h1>
          <p className="text-sm text-gray-500">{cfg.subtitle}</p>
        </div>

        {/* Platzhalter-Karte — unmissverständlich als Vorbereitung gekennzeichnet */}
        <div className="bg-white border border-[#e6e1da] rounded-2xl p-6 shadow-[0_16px_36px_-24px_rgba(40,25,10,0.28)]">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
              <Clock size={17} className="text-amber-600" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-gray-900 mb-1">Text in Vorbereitung</p>
              <p className="text-sm text-gray-600 leading-relaxed">
                Diese Seite ist technisch vollständig eingebunden. Der finale,
                rechtlich geprüfte Text wird vor dem Launch hier eingesetzt.
              </p>
              <p className="mt-3 text-sm text-gray-400 font-mono bg-[#faf7f3] border border-[#ece7e0] rounded-lg px-3 py-2">
                [ {cfg.intro} ]
              </p>
            </div>
          </div>
        </div>

        {/* Vorgesehene Gliederung (Inhaltsverzeichnis-Gerüst, kein Rechtsinhalt) */}
        <div className="bg-white border border-[#e6e1da] rounded-2xl overflow-hidden shadow-[0_16px_36px_-24px_rgba(40,25,10,0.28)]">
          <div className="px-6 py-4 bg-[#faf7f3] border-b border-[#ece7e0]">
            <h2 className="text-sm font-semibold text-gray-700 tracking-wide uppercase">Vorgesehene Gliederung</h2>
          </div>
          <div className="divide-y divide-[#f0ebe4]">
            {cfg.sections.map((s, i) => (
              <div key={s} className="flex items-center gap-3 px-6 py-3.5">
                <span className="text-[11px] font-semibold text-gray-300 tabular-nums w-5 shrink-0">
                  {String(i + 1).padStart(2, '0')}
                </span>
                <span className="text-sm text-gray-500 flex-1 min-w-0">{s}</span>
                <span className="text-[10px] text-gray-300 italic shrink-0">in Vorbereitung</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      <Footer />
    </div>
  )
}
