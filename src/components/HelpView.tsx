import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ChevronDown, ChevronRight, Mail, Info, FileText } from 'lucide-react'

const RECHTS_LINKS = [
  { to: '/impressum', label: 'Impressum' },
  { to: '/datenschutz', label: 'Datenschutzerklärung' },
  { to: '/agb', label: 'Allgemeine Geschäftsbedingungen' },
  { to: '/widerruf', label: 'Widerrufsbelehrung' },
]

const FAQ_ITEMS = [
  {
    frage: 'Wie funktioniert ein Kauf-Check?',
    antwort:
      'Du gibst die Fahrzeugdaten ein (Marke, Modell, Baujahr, Kilometerstand, Preis) — entweder manuell oder als Freitext aus einem Inserat. Die KI analysiert den Zustand, prüft bekannte Schwachstellen der Baureihe, vergleicht den Preis mit dem Markt und gibt dir eine klare Empfehlung: kaufen, verhandeln oder Finger weg.',
  },
  {
    frage: 'Was ist im Abo enthalten?',
    antwort:
      'Das Light-Abo enthält 3 Kauf- oder Verkaufs-Checks pro Monat. Das Pro-Abo gibt dir 10 Checks. Das Max-Abo bietet unbegrenzte Checks plus zukünftige Premium-Funktionen. Alle Abos nutzen dieselbe KI-Analyse — der Unterschied liegt nur im Volumen.',
  },
  {
    frage: 'Wie kündige ich mein Abo?',
    antwort:
      'Gehe zu Einstellungen → Abo verwalten → Abo kündigen. Das Abo läuft bis zum Ende der bezahlten Periode weiter — du verlierst nichts, was du schon bezahlt hast. Danach wechselst du automatisch zurück auf den kostenlosen Plan.',
  },
  {
    frage: 'Wie läuft ein Poster-Kauf ab?',
    antwort:
      'Wähle ein Poster in der Galerie, klicke auf "Kaufen" und gib deine Lieferadresse ein. Du wirst zu Stripe weitergeleitet (sichere Zahlung per Karte). Nach der Zahlung erscheint die Bestellung unter "Meine Bestellungen". Druck und Versand folgen in einer späteren Version — du wirst informiert.',
  },
  {
    frage: 'Welche Zahlungsmethoden werden akzeptiert?',
    antwort:
      'Aktuell Kreditkarte und Debitkarte über Stripe. Weitere Methoden (PayPal, SEPA-Lastschrift) sind geplant.',
  },
  {
    frage: 'Sind meine Daten sicher?',
    antwort:
      'Passwörter werden mit bcrypt gehasht und niemals im Klartext gespeichert. Zahlungen laufen ausschließlich über Stripe — wir sehen keine Kartendaten. Deine Chat-Verläufe und Checks sind nur für dich sichtbar.',
  },
]

function FaqItem({ frage, antwort }: { frage: string; antwort: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border-b border-[#f0ebe4] last:border-0">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-4 px-6 py-4 text-left hover:bg-[#faf7f3] transition-colors"
      >
        <span className="text-sm font-medium text-gray-900">{frage}</span>
        <ChevronDown
          size={16}
          className={`shrink-0 text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
        />
      </button>
      {open && (
        <div className="px-6 pb-4">
          <p className="text-sm text-gray-600 leading-relaxed">{antwort}</p>
        </div>
      )}
    </div>
  )
}

function Section({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-[#e6e1da] rounded-2xl overflow-hidden shadow-[0_16px_36px_-24px_rgba(40,25,10,0.28)]">
      <div className="px-6 py-4 bg-[#faf7f3] border-b border-[#ece7e0] flex items-center gap-2">
        <Icon size={14} className="text-gray-400" />
        <h2 className="text-sm font-semibold text-gray-700 tracking-wide uppercase">{title}</h2>
      </div>
      {children}
    </div>
  )
}

export default function HelpView() {
  return (
    <div
      className="relative h-full overflow-y-auto scrollbar-thin"
      style={{ background: 'radial-gradient(120% 60% at 50% 0%, #fdfaf6 0%, #faf7f3 40%, #f4f0ea 100%)' }}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-72 overflow-hidden">
        <div className="ez-aurora absolute left-1/2 -translate-x-1/2 -top-40 w-[680px] h-[420px] rounded-full"
          style={{ background: 'radial-gradient(circle, rgba(249,115,22,0.08) 0%, transparent 68%)' }} />
      </div>

      <div className="ez-rise relative max-w-2xl mx-auto px-6 py-10 space-y-6">

        <div>
          <div className="flex items-center gap-2.5 mb-4">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-md bg-orange-500/10 border border-orange-400/25 text-orange-500">
              <Info size={12} />
            </span>
            <span className="text-[11px] font-bold tracking-[0.22em] uppercase text-gray-500">Vira · Hilfe</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-[-0.02em] mb-1">Hilfe</h1>
          <p className="text-sm text-gray-500">FAQ, Kontakt und Informationen zur App</p>
        </div>

        {/* ── FAQ ── */}
        <Section title="Häufige Fragen" icon={ChevronDown}>
          {FAQ_ITEMS.map(item => (
            <FaqItem key={item.frage} frage={item.frage} antwort={item.antwort} />
          ))}
        </Section>

        {/* ── Kontakt ── */}
        <Section title="Kontakt & Support" icon={Mail}>
          <div className="px-6 py-5 space-y-3">
            <p className="text-sm text-gray-600">
              Bei Fragen oder Problemen erreichst du uns per E-Mail. Wir antworten in der Regel
              innerhalb von 24 Stunden an Werktagen.
            </p>
            <a
              href="mailto:support@getvira.de"
              className="inline-flex items-center gap-2 px-4 py-2.5 text-white text-sm font-semibold rounded-xl transition-all hover:opacity-90"
              style={{ background: 'linear-gradient(180deg, #fb923c 0%, #f97316 100%)', boxShadow: '0 8px 18px -6px rgba(249,115,22,0.5)' }}
            >
              <Mail size={15} />
              support@getvira.de
            </a>
          </div>
        </Section>

        {/* ── Über die App ── */}
        <Section title="Über Vira" icon={Info}>
          <div className="px-6 py-5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Version</span>
              <span className="text-sm font-medium text-gray-900">0.1.0</span>
            </div>
            <div className="border-t border-[#f0ebe4] pt-3 mt-3">
              <p className="text-sm text-gray-600 leading-relaxed">
                Vira ist ein KI-gestützter Assistent für Autokäufer und -verkäufer.
                Die App analysiert Fahrzeuginserate, prüft bekannte Schwachstellen und
                hilft dir, den richtigen Preis zu finden — schnell, neutral und datenbasiert.
              </p>
            </div>
          </div>
        </Section>

        {/* ── Rechtliches ── */}
        <Section title="Rechtliches" icon={FileText}>
          <div className="px-6 py-5">
            <p className="text-xs text-gray-400 mb-4">
              Rechtliche Informationen zu Vira.
            </p>
            <div className="space-y-1">
              {RECHTS_LINKS.map(({ to, label }) => (
                <Link
                  key={to}
                  to={to}
                  className="group flex items-center justify-between gap-4 py-2.5 border-b border-[#f0ebe4] last:border-0 transition-colors"
                >
                  <span className="text-sm text-gray-600 group-hover:text-gray-900 transition-colors">{label}</span>
                  <ChevronRight size={15} className="shrink-0 text-gray-300 group-hover:text-orange-500 transition-colors" />
                </Link>
              ))}
            </div>
          </div>
        </Section>

      </div>
    </div>
  )
}
