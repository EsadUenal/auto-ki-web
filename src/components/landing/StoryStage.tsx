import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, ChevronDown } from 'lucide-react'
import { reveal, useInView, useReducedMotion } from './motion'
import { PanelEntscheiden, PanelFinden, PanelPruefen, PanelVerstehen } from './StoryPanels'
import { STORY_SCHRITTE } from './showcase'
import { KAUFCHECK_ROUTE, AUTOFINDER_ROUTE, AUTOKOSTEN_ROUTE } from './links'
import { FOKUS_RING } from './styles'

/**
 * Die Scroll-Story: Finden, Verstehen, Prüfen, Entscheiden.
 *
 * Auf grossen Schirmen eine Sticky-Bühne: der Text links wechselt, die
 * Produktbühne rechts bleibt stehen und zeigt dasselbe Fahrzeug in einem
 * anderen Werkzeug. Der Hintergrund kippt beim Schritt „Prüfen" ins Dunkle.
 * Das ist der Moment, in dem es ernst wird, und die Seite soll das spüren
 * lassen.
 *
 * Auf kleinen Schirmen wird daraus eine gestapelte Abfolge. Ein Sticky-Layout
 * auf 375 px zusammenzuquetschen ergibt eine Bühne, die kaum grösser ist als
 * die Schrift daneben.
 *
 * SCHRITTE STATT GLOBALEM FORTSCHRITT
 * -----------------------------------
 * Die erste Fassung rechnete einen normalisierten Fortschritt über die ganze
 * Spur und leitete daraus den Schritt ab. Das hatte zwei Nachteile: die Strecke
 * musste sehr lang sein, damit sich die Rechnung sauber aufteilt, und ein
 * Rechenfehler in der Aufteilung liess einen Schritt lautlos verschwinden.
 *
 * Jetzt hat jeder Schritt einen eigenen Marker in der Spur. Aktiv ist der
 * Marker, der gerade den oberen Bildschirmrand kreuzt. Das ist unabhängig von
 * der Gesamtlänge, es kann keinen Schritt überspringen, und die Strecke lässt
 * sich frei kürzen: `SCHRITT_VH` ist der einzige Stellwert.
 *
 * WARUM KÜRZER
 * ------------
 * Vorher bekam jeder Schritt eine volle Bildschirmhöhe, zusammen 400 vh
 * Scrollstrecke. Das fühlte sich an, als hänge die Seite. 62 vh je Schritt
 * reichen, damit man den Wechsel bewusst wahrnimmt, ohne festzustecken.
 */

/** Scrollstrecke je Schritt in Prozent der Bildschirmhöhe. Einziger Stellwert. */
const SCHRITT_VH = 62

const TEXTE = [
  {
    headline: 'Nicht irgendein Auto. Das passende.',
    text: 'Du sagst, was dir wichtig ist: Budget, Nutzung, Prioritäten. Vira vergleicht '
      + 'Baureihen, Generationen und Motorvarianten und begründet jeden Vorschlag, statt '
      + 'dir eine Trefferliste hinzuwerfen.',
    cta: { label: 'AutoFinder öffnen', to: AUTOFINDER_ROUTE },
  },
  {
    headline: 'Der Kaufpreis ist nicht die ganze Wahrheit.',
    text: 'Was ein Auto wirklich kostet, entscheidet sich nach dem Kauf. Kraftstoff, '
      + 'Versicherung, Steuer, Wartung, Reifen, dazu der Wertverlust, den kaum jemand '
      + 'einrechnet. Vira rechnet es aus, nachvollziehbar bis auf den Kilometer.',
    cta: { label: 'Autokosten berechnen', to: AUTOKOSTEN_ROUTE },
  },
  {
    headline: 'Bevor du kaufst: prüf genauer hin.',
    text: 'Der KaufCheck nimmt das konkrete Fahrzeug auseinander. Motor, bekannte '
      + 'Schwachstellen der Baureihe, Wartungsbedarf und die Frage, wie belastbar die '
      + 'Datenlage überhaupt ist. Für 5,99 € einmalig.',
    cta: { label: 'KaufCheck starten', to: KAUFCHECK_ROUTE },
  },
  {
    headline: 'Mehr Informationen. Weniger Bauchgefühl.',
    text: 'Passung, laufende Kosten, bekannte Risiken und Datenqualität stehen zum ersten '
      + 'Mal an einer Stelle. Die Entscheidung bleibt deine, aber du triffst sie nicht '
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

// ── Desktop: klebende Bühne mit Schritt-Markern ─────────────────────────────

function StoryDesktop() {
  const reduziert = useReducedMotion()
  const spur = useRef<HTMLDivElement>(null)
  const [aktiv, setAktiv] = useState(0)
  const [inSpur, setInSpur] = useState(false)
  const anzahl = STORY_SCHRITTE.length
  const dunkel = aktiv >= 2

  // Aktiv ist der Marker, der gerade den oberen Bildschirmrand kreuzt. Der
  // Beobachtungsstreifen ist dafür nur ein paar Prozent hoch.
  useEffect(() => {
    const el = spur.current
    if (!el || typeof IntersectionObserver === 'undefined') return

    const marker = Array.from(el.querySelectorAll<HTMLElement>('[data-schritt-marker]'))
    const treffend = new Set<number>()

    const beobachter = new IntersectionObserver(
      (eintraege) => {
        for (const e of eintraege) {
          const i = Number((e.target as HTMLElement).dataset.schrittMarker)
          if (e.isIntersecting) treffend.add(i)
          else treffend.delete(i)
        }
        if (treffend.size > 0) setAktiv(Math.max(...treffend))
      },
      // Streifen ganz oben im Bild: von 0 bis 4 % der Fensterhöhe.
      { rootMargin: '0px 0px -96% 0px', threshold: 0 },
    )
    marker.forEach((m) => beobachter.observe(m))

    // Ob die Spur überhaupt im Bild ist (für den Einstiegshinweis).
    const spurBeobachter = new IntersectionObserver(
      ([e]) => setInSpur(e.isIntersecting),
      { threshold: 0 },
    )
    spurBeobachter.observe(el)

    return () => { beobachter.disconnect(); spurBeobachter.disconnect() }
  }, [])

  /** Springt zu einem Schritt. Gleiche Rechnung wie die Marker-Positionen. */
  const springeZu = useCallback((i: number) => {
    const el = spur.current
    if (!el) return
    const oben = el.getBoundingClientRect().top + window.scrollY
    const schrittPx = window.innerHeight * (SCHRITT_VH / 100)
    window.scrollTo({
      top: Math.round(oben + i * schrittPx + 4),
      behavior: reduziert ? 'auto' : 'smooth',
    })
  }, [reduziert])

  return (
    <div
      ref={spur}
      className="relative"
      style={{ height: `${anzahl * SCHRITT_VH + 100}vh` }}
      data-story-track
    >
      {/* Ein Marker je Schritt. Unsichtbar, aber echte Positionen in der Spur. */}
      {STORY_SCHRITTE.map((s, i) => (
        <div
          key={s.id}
          aria-hidden="true"
          data-schritt-marker={i}
          className="pointer-events-none absolute left-0 w-px"
          style={{ top: `${i * SCHRITT_VH}vh`, height: `${SCHRITT_VH}vh` }}
        />
      ))}

      <div
        className="sticky top-0 flex h-screen items-center overflow-hidden transition-colors duration-700 ease-out"
        style={{ backgroundColor: dunkel ? '#111014' : '#faf8f5' }}
        data-story-stage
        data-aktiver-schritt={aktiv}
        {...(dunkel ? { 'data-dark-section': '' } : {})}
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
          {/* Schrittanzeige, anklickbar */}
          <ol className="flex flex-col gap-1" aria-label="Ablauf">
            {STORY_SCHRITTE.map((s, i) => {
              const ist = i === aktiv
              const war = i < aktiv
              return (
                <li key={s.id} aria-current={ist ? 'step' : undefined}>
                  <button
                    type="button"
                    onClick={() => springeZu(i)}
                    data-schritt-knopf={i}
                    aria-label={`Zum Schritt ${s.label}`}
                    className={`flex w-full items-center gap-3 rounded-lg pr-3 text-left ${FOKUS_RING}`}
                  >
                    <span className="relative flex h-16 w-[3px] shrink-0 items-center justify-center">
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
                  </button>
                </li>
              )
            })}
          </ol>

          {/* Text, wechselt mit dem Schritt */}
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

          {/* Produktbühne, wechselt mit dem Schritt */}
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

        {/* Dezenter Hinweis, dass hier gescrollt wird. Verschwindet, sobald der
            erste Schritt vorbei ist, damit er nicht dauerhaft stört. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-6 flex justify-center transition-opacity duration-500"
          style={{ opacity: inSpur && aktiv === 0 ? 1 : 0 }}
        >
          <span className={`flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.16em] ${dunkel ? 'text-white/40' : 'text-gray-400'}`}>
            Weiterscrollen
            <ChevronDown size={13} className={reduziert ? '' : 'animate-bounce'} />
          </span>
        </div>

        {/* Feine Fortschrittslinie am unteren Rand der Bühne */}
        <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-0.5"
          style={{ backgroundColor: dunkel ? 'rgba(255,255,255,0.08)' : '#eee7dd' }}>
          <div
            className="h-full bg-orange-500 transition-all duration-500 ease-out"
            style={{ width: `${((aktiv + 1) / anzahl) * 100}%` }}
          />
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
      {...(dunkel ? { 'data-dark-section': '' } : {})}
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
