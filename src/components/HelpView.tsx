import { useState } from 'react'
import { ChevronDown, Mail, Info, FileText } from 'lucide-react'

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
    <div className="border-b border-gray-100 last:border-0">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between gap-4 px-6 py-4 text-left hover:bg-gray-50 transition-colors"
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
    <div className="border border-gray-100 rounded-2xl overflow-hidden">
      <div className="px-6 py-4 bg-gray-50 border-b border-gray-100 flex items-center gap-2">
        <Icon size={14} className="text-gray-400" />
        <h2 className="text-sm font-semibold text-gray-700 tracking-wide uppercase">{title}</h2>
      </div>
      {children}
    </div>
  )
}

export default function HelpView() {
  return (
    <div className="h-full overflow-y-auto bg-white">
      <div className="max-w-2xl mx-auto px-6 py-8 space-y-6">

        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight mb-1">Hilfe</h1>
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
              href="mailto:support@auto-ki.de"
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-gray-900 text-white text-sm font-medium rounded-xl hover:bg-gray-700 transition-colors"
            >
              <Mail size={15} />
              support@auto-ki.de
            </a>
          </div>
        </Section>

        {/* ── Über die App ── */}
        <Section title="Über Auto-KI" icon={Info}>
          <div className="px-6 py-5 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Version</span>
              <span className="text-sm font-medium text-gray-900">0.1.0</span>
            </div>
            <div className="border-t border-gray-100 pt-3 mt-3">
              <p className="text-sm text-gray-600 leading-relaxed">
                Auto-KI ist ein KI-gestützter Assistent für Autokäufer und -verkäufer.
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
              Die vollständigen rechtlichen Texte werden vor dem offiziellen Launch veröffentlicht.
            </p>
            <div className="space-y-2">
              {['Impressum', 'Allgemeine Geschäftsbedingungen', 'Datenschutzerklärung'].map(label => (
                <div
                  key={label}
                  className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
                >
                  <span className="text-sm text-gray-400">{label}</span>
                  <span className="text-xs text-gray-300 italic">folgt</span>
                </div>
              ))}
            </div>
          </div>
        </Section>

      </div>
    </div>
  )
}
