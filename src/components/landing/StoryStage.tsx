import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { reveal, useInView, useReducedMotion, useScrollFortschritt } from './motion'
import { PanelEntscheiden, PanelFinden, PanelPruefen, PanelVerstehen } from './StoryPanels'
import { STORY_SCHRITTE } from './showcase'
import { KAUFCHECK_ROUTE, AUTOFINDER_ROUTE, AUTOKOSTEN_ROUTE } from './links'
import { FOKUS_RING } from './styles'

/**
 * Die Scroll-Story: FINDEN → VERSTEHEN → PRÜFEN → ENTSCHEIDEN.
 *
 * Auf grossen Schirmen eine Sticky-Bühne: der Text links wechselt, die
 * Produktbühne rechts bleibt stehen und zeigt dasselbe Fahrzeug in einem
 * anderen Werkzeug. Der Hintergrund kippt beim Schritt „Prüfen" ins Dunkle —
 * das ist der Moment, in dem es ernst wird, und die Seite soll das spüren
 * lassen.
 *
 * Auf kleinen Schirmen wird daraus eine gestapelte Abfolge. Ein Sticky-Layout
 * auf 375 px zusammenzuquetschen ergibt eine Bühne, die kaum grösser ist als
 * die Schrift daneben — die Choreografie muss dort eine andere sein, nicht
 * dieselbe in klein.
 *
 * Wichtig fürs Verständnis der Höhe: der äussere Abschnitt ist
 * `(SCHRITTE + 1) × 100vh` hoch. Das „+ 1" ist kein Puffer, sondern Rechnung:
 * die klebende Bühne ist selbst einen Bildschirm hoch, also beträgt die
 * nutzbare Scrollstrecke `Höhe − 100vh`. Erst mit dem zusätzlichen Bildschirm
 * bekommt jeder der vier Schritte genau eine Bildschirmhöhe — sonst teilen sie
 * sich drei und laufen spürbar zu schnell durch (in der ersten Messung wurde
 * „Prüfen" dadurch komplett übersprungen).
 */

const TEXTE = [
  {
    kicker: 'Finden',
    headline: 'Nicht irgendein Auto. Das passende.',
    text: 'Du sagst, was dir wichtig ist — Budget, Nutzung, Prioritäten. Vira vergleicht '
      + 'Baureihen, Generationen und Motorvarianten und begründet jeden Vorschlag, statt '
      + 'dir eine Trefferliste hinzuwerfen.',
    cta: { label: 'AutoFinder öffnen', to: AUTOFINDER_ROUTE },
  },
  {
    kicker: 'Verstehen',
    headline: 'Der Kaufpreis ist nicht die ganze Wahrheit.',
    text: 'Was ein Auto wirklich kostet, entscheidet sich nach dem Kauf: Kraftstoff, '
      + 'Versicherung, Steuer, Wartung, Reifen — und der Wertverlust, den kaum jemand '
      + 'einrechnet. Vira rechnet es aus, nachvollziehbar bis auf den Kilometer.',
    cta: { label: 'Autokosten berechnen', to: AUTOKOSTEN_ROUTE },
  },
  {
    kicker: 'Prüfen',
    headline: 'Bevor du kaufst: prüf genauer hin.',
    text: 'Der KaufCheck nimmt das konkrete Fahrzeug auseinander — Motor, bekannte '
      + 'Schwachstellen der Baureihe, Wartungsbedarf und die Frage, wie belastbar die '
      + 'Datenlage überhaupt ist. Für 5,99 € einmalig.',
    cta: { label: 'KaufCheck starten', to: KAUFCHECK_ROUTE },
  },
  {
    kicker: 'Entscheiden',
    headline: 'Mehr Informationen. Weniger Bauchgefühl.',
    text: 'Passung, laufende Kosten, bekannte Risiken und Datenqualität stehen zum ersten '
      + 'Mal an einer Stelle. Die Entscheidung bleibt deine — aber du triffst sie nicht '
      + 'mehr im Dunkeln.',
    cta: null,
  },
]

function StoryText({ i, dunkel }: { i: number; dunkel: boolean }) {
  const t = TEXTE[i]
  return (
    <div>
      <p className={`text-[11px] font-bold uppercase tracking-[0.2em] ${dunkel ? 'text-orange-400' : 'text-orange-500'}`}>
        {STORY_SCHRITTE[i].kicker}
      </p>
      <h3 className={`mt-3 text-3xl sm:text-4xl font-bold leading-[1.12] tracking-[-0.035em] ${dunkel ? 'text-white' : 'text-gray-900'}`}>
        {t.headline}
      </h3>
      <p className={`mt-4 max-w-md text-[15px] leading-relaxed ${dunkel ? 'text-white/55' : 'text-gray-600'}`}>
        {t.text}
      </p>
      {t.cta && (
        <Link
          to={t.cta.to}
          className={`mt-6 inline-flex items-center gap-2 rounded-xl px-5 py-3 text-sm font-semibold transition-colors ${FOKUS_RING} ${
            dunkel
              ? 'bg-orange-500 text-white hover:bg-orange-400'
              : 'border border-[#e0d9cf] bg-white text-gray-700 hover:bg-[#faf8f5]'
          }`}
        >
          {t.cta.label}
          <ArrowRight size={15} aria-hidden="true" />
        </Link>
      )}
    </div>
  )
}

function Buehne({ i, aktiv, reduziert }: { i: number; aktiv: boolean; reduziert: boolean }) {
  if (i === 0) return <PanelFinden aktiv={aktiv} reduziert={reduziert} />
  if (i === 1) return <PanelVerstehen aktiv={aktiv} reduziert={reduziert} />
  if (i === 2) return <PanelPruefen aktiv={aktiv} reduziert={reduziert} />
  return <PanelEntscheiden aktiv={aktiv} reduziert={reduziert} />
}

// ── Desktop: klebende Bühne ─────────────────────────────────────────────────

function StoryDesktop() {
  const reduziert = useReducedMotion()
  const [ref, fortschritt] = useScrollFortschritt<HTMLDivElement>()
  const anzahl = STORY_SCHRITTE.length

  // Der aktive Schritt ergibt sich direkt aus dem Scrollfortschritt.
  const aktiv = Math.min(anzahl - 1, Math.floor(fortschritt * anzahl + 0.0001))
  const dunkel = aktiv >= 2

  return (
    <div ref={ref} style={{ height: `${(anzahl + 1) * 100}vh` }} data-story-track>
      <div
        className="sticky top-0 flex h-screen items-center overflow-hidden transition-colors duration-700 ease-out"
        style={{ backgroundColor: dunkel ? '#111014' : '#faf8f5' }}
        data-story-stage
        data-aktiver-schritt={aktiv}
      >
        {/* Lichtfläche hinter der Bühne */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute right-[-10%] top-1/2 h-[42rem] w-[42rem] -translate-y-1/2 rounded-full transition-opacity duration-700"
          style={{
            background: dunkel
              ? 'radial-gradient(circle, rgba(249,115,22,0.16) 0%, transparent 68%)'
              : 'radial-gradient(circle, rgba(249,115,22,0.10) 0%, transparent 68%)',
          }}
        />

        <div className="relative mx-auto grid w-full max-w-6xl grid-cols-[auto_1fr_1.05fr] items-center gap-10 px-6">
          {/* Schrittanzeige */}
          <ol className="flex flex-col gap-1" aria-label="Ablauf">
            {STORY_SCHRITTE.map((s, i) => {
              const ist = i === aktiv
              const war = i < aktiv
              return (
                <li key={s.id} className="flex items-center gap-3" aria-current={ist ? 'step' : undefined}>
                  <span className="relative flex h-16 w-[3px] items-center justify-center">
                    <span
                      className="absolute inset-0 rounded-full transition-colors duration-500"
                      style={{ backgroundColor: dunkel ? 'rgba(255,255,255,0.12)' : '#e6ded2' }}
                    />
                    <span
                      className="absolute inset-x-0 top-0 rounded-full bg-orange-500 transition-all duration-500 ease-out"
                      style={{ height: ist || war ? '100%' : '0%' }}
                    />
                  </span>
                  <span
                    className="text-sm font-bold tracking-tight transition-all duration-500"
                    style={{
                      color: ist ? (dunkel ? '#ffffff' : '#111827')
                        : (dunkel ? 'rgba(255,255,255,0.32)' : '#9ca3af'),
                      transform: ist ? 'translateX(2px)' : 'none',
                    }}
                  >
                    {s.label}
                  </span>
                </li>
              )
            })}
          </ol>

          {/* Text — wechselt mit dem Schritt */}
          <div className="relative min-h-[19rem]">
            {TEXTE.map((_, i) => (
              <div
                key={i}
                className="absolute inset-0 flex flex-col justify-center transition-all duration-500 ease-out"
                style={{
                  opacity: i === aktiv ? 1 : 0,
                  transform: i === aktiv ? 'none' : `translateY(${i < aktiv ? -18 : 18}px)`,
                  pointerEvents: i === aktiv ? 'auto' : 'none',
                }}
                aria-hidden={i !== aktiv}
              >
                <StoryText i={i} dunkel={dunkel} />
              </div>
            ))}
          </div>

          {/* Produktbühne — wechselt mit dem Schritt */}
          <div className="relative min-h-[27rem]">
            {STORY_SCHRITTE.map((s, i) => (
              <div
                key={s.id}
                className="absolute inset-0 flex items-center transition-all duration-600 ease-out"
                style={{
                  opacity: i === aktiv ? 1 : 0,
                  transform: i === aktiv ? 'none' : `translateY(${i < aktiv ? -26 : 26}px) scale(0.97)`,
                  pointerEvents: i === aktiv ? 'auto' : 'none',
                }}
                aria-hidden={i !== aktiv}
              >
                <div className="w-full">
                  <Buehne i={i} aktiv={i === aktiv} reduziert={reduziert} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Mobil/Tablet: gestapelte Abfolge ────────────────────────────────────────

function StoryBlock({ i }: { i: number }) {
  const reduziert = useReducedMotion()
  const [ref, sichtbar] = useInView<HTMLDivElement>({ schwelle: 0.25 })
  const dunkel = i >= 2
  const r = reveal(sichtbar, reduziert)

  return (
    <div
      ref={ref}
      data-story-block={STORY_SCHRITTE[i].id}
      className="px-4 py-14 sm:px-6 sm:py-16"
      style={{ backgroundColor: dunkel ? '#111014' : '#faf8f5' }}
    >
      <div className={`mx-auto max-w-2xl ${r.className}`} style={r.style}>
        <StoryText i={i} dunkel={dunkel} />
        <div className="mt-8">
          <Buehne i={i} aktiv={sichtbar} reduziert={reduziert} />
        </div>
      </div>
    </div>
  )
}

function StoryMobil() {
  return (
    <div>
      {STORY_SCHRITTE.map((s, i) => <StoryBlock key={s.id} i={i} />)}
    </div>
  )
}

// ── Öffentlich ──────────────────────────────────────────────────────────────

export default function StoryStage() {
  return (
    <section id="ablauf" aria-label="So funktioniert Vira">
      <div className="hidden lg:block"><StoryDesktop /></div>
      <div className="lg:hidden"><StoryMobil /></div>
    </section>
  )
}
