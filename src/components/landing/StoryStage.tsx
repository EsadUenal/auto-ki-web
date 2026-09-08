import { useCallback } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, ChevronDown } from 'lucide-react'
import {
  klemme, mischeFarbe, reveal, useInView, useReducedMotion, useStoryFortschritt,
} from './motion'
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
 * DURCHGEHEND STATT IN STUFEN
 * ---------------------------
 * Der Fortschritt ist eine Kommazahl, kein Schritt-Index. Bei 1,5 steht man
 * genau zwischen „Verstehen" und „Prüfen", und beide Bühnen sind zur Hälfte da:
 * die eine schrumpft und verblasst, während die andere schon heranwächst. Mit
 * einem ganzzahligen Schritt gäbe es dazwischen nichts, und die Story läse sich
 * als vier ausgetauschte Bildschirme statt als eine Bewegung.
 *
 * Auch der Hell/Dunkel-Wechsel läuft mit: der Hintergrund kippt über die
 * Strecke zwischen „Verstehen" und „Prüfen" hinweg, nicht an einer Kante.
 *
 * WARUM KURZ
 * ----------
 * Ursprünglich bekam jeder Schritt eine volle Bildschirmhöhe, zusammen 400 vh.
 * Das fühlte sich an, als hänge die Seite. 50 vh je Schritt reichen: mit
 * durchgehender Bewegung sieht man schon nach zwei, drei Radbewegungen, dass
 * sich etwas verändert.
 */

/** Scrollstrecke je Schritt in Prozent der Bildschirmhöhe. Einziger Stellwert. */
const SCHRITT_VH = 50

/** Bühnenfarben, zwischen denen der Hintergrund überblendet. */
const HELL: [number, number, number] = [250, 248, 245]
const DUNKEL: [number, number, number] = [17, 16, 20]

/**
 * Wie „dunkel" die Bühne bei einer bestimmten Position ist.
 *
 * Der Wechsel beginnt kurz vor „Prüfen" und ist mit dessen Erreichen fertig.
 * Ein Sprung genau auf der Schrittgrenze wäre der harte Weiss/Schwarz-Wechsel,
 * den es gerade nicht sein soll.
 */
function dunkelheitBei(fortschritt: number): number {
  return klemme((fortschritt - 1.25) / 0.75)
}

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

/** `dunkelheit` ist 0 (helle Bühne) bis 1 (dunkle Bühne), auch dazwischen. */
function StoryText({ i, dunkelheit }: { i: number; dunkelheit: number }) {
  const t = TEXTE[i]
  const dunkel = dunkelheit > 0.5
  // Die Schrift schlaegt STEILER um als der Hintergrund. Der Hintergrund darf
  // gemaechlich durchs Graue wandern, das sieht man gern; Text im selben Tempo
  // waere dort aber grau auf grau. Mit der steileren Kurve ist die Schrift
  // entweder klar dunkel oder klar hell, und der schmale Rest faellt mit der
  // Ueberblendung zusammen, in der sie ohnehin fast unsichtbar ist.
  const schrift = klemme((dunkelheit - 0.5) * 2.6 + 0.5)
  return (
    <div>
      <p className="text-[11px] font-bold uppercase tracking-[0.2em]"
        style={{ color: mischeFarbe([249, 115, 22], [251, 146, 60], schrift) }}>
        {STORY_SCHRITTE[i].kicker}
      </p>
      <h3 className="mt-3 text-3xl sm:text-4xl font-bold leading-[1.12] tracking-[-0.035em]"
        style={{ color: mischeFarbe([17, 24, 39], [255, 255, 255], schrift) }}>
        {t.headline}
      </h3>
      <p className="mt-4 max-w-md text-[15px] leading-relaxed"
        style={{ color: mischeFarbe([75, 85, 99], [166, 166, 172], schrift) }}>
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
  const anzahl = STORY_SCHRITTE.length
  const [spur, fortschritt] = useStoryFortschritt<HTMLDivElement>(SCHRITT_VH, anzahl)

  const dunkelheit = dunkelheitBei(fortschritt)
  const dunkel = dunkelheit > 0.5
  // Nur noch fuer Anzeige und Pruefung: welcher Schritt gerade der naechste ist.
  const aktiv = Math.round(fortschritt)

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
  }, [reduziert, spur])

  /**
   * Anteil, den Ebene `i` gerade an der Bühne hat: 1 mittig, 0 weit weg.
   *
   * Bewusst ASYMMETRISCH. Eine symmetrische Blende hat auf halbem Weg zwischen
   * zwei Schritten beide Ebenen bei 0,5 — zwei halbdurchsichtige Textblöcke
   * übereinander, beide unlesbar. Daran ändert auch ein schmaleres Fenster
   * nichts, es verkürzt den Zustand nur.
   *
   * Auch ein verschobener Übergang hat aber irgendwo den Punkt gleicher
   * Deckkraft — er wandert nur. Deshalb liegt zwischen Abgang und Auftritt eine
   * kurze LÜCKE: die alte Ebene ist bei d = 0,38 verschwunden, die neue tritt
   * erst ab d = -0,62 auf. Rechnerisch ist nie mehr als eine Ebene nennenswert
   * sichtbar. Die Lücke dauert etwa 20 Pixel Scrollweg und liest sich nicht als
   * Leere, sondern als Atemzug zwischen zwei Szenen.
   */
  const anteilVon = (i: number) => {
    const d = fortschritt - i
    return d >= 0
      ? klemme((0.38 - d) / 0.16)     // hinter uns: tritt ab
      : klemme((0.62 + d) / 0.16)     // vor uns: tritt auf
  }

  return (
    <div
      ref={spur}
      className="relative"
      style={{ height: `${anzahl * SCHRITT_VH + 100}vh` }}
      data-story-track
    >
      {/* Ein Marker je Schritt. Unsichtbar, aber echte Positionen in der Spur:
          sie sind die Sprungziele der Navigation und machen die Aufteilung im
          DOM nachvollziehbar. */}
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
        className="sticky top-0 flex h-screen items-center overflow-hidden"
        style={{ backgroundColor: mischeFarbe(HELL, DUNKEL, dunkelheit) }}
        data-story-stage
        data-aktiver-schritt={aktiv}
        data-fortschritt={fortschritt.toFixed(2)}
        {...(dunkel ? { 'data-dark-section': '' } : {})}
      >
        {/* Lichtflaeche hinter der Buehne, waechst mit der Dunkelheit mit */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute right-[-10%] top-1/2 h-[42rem] w-[42rem] -translate-y-1/2 rounded-full"
          style={{
            background: `radial-gradient(circle, rgba(249,115,22,${0.10 + dunkelheit * 0.06}) 0%, transparent 68%)`,
          }}
        />

        <div className="relative mx-auto grid w-full max-w-6xl grid-cols-[auto_1fr_1.05fr] items-center gap-10 px-6">
          {/* Schrittanzeige, anklickbar. Die Fuellung laeuft durchgehend mit. */}
          <ol className="flex flex-col gap-1" aria-label="Ablauf">
            {STORY_SCHRITTE.map((s, i) => {
              // Wie weit der Balken dieses Schritts gefuellt ist: waechst
              // waehrend des Scrollens, statt bei der Grenze umzuspringen.
              const fuellung = klemme(fortschritt - i + 1)
              const naehe = anteilVon(i)
              return (
                <li key={s.id} aria-current={Math.round(fortschritt) === i ? 'step' : undefined}>
                  <button
                    type="button"
                    onClick={() => springeZu(i)}
                    data-schritt-knopf={i}
                    aria-label={`Zum Schritt ${s.label}`}
                    className={`flex w-full items-center gap-3 rounded-lg pr-3 text-left ${FOKUS_RING}`}
                  >
                    <span className="relative flex h-16 w-[3px] shrink-0 items-center justify-center">
                      <span
                        className="absolute inset-0 rounded-full"
                        style={{ backgroundColor: mischeFarbe([230, 222, 210], [255, 255, 255], dunkelheit * 0.12) }}
                      />
                      <span
                        className="absolute inset-x-0 top-0 rounded-full bg-orange-500"
                        style={{ height: `${fuellung * 100}%` }}
                      />
                    </span>
                    <span
                      className="text-sm font-bold tracking-tight"
                      style={{
                        color: mischeFarbe(
                          // inaktiv -> aktiv, jeweils fuer hell und dunkel
                          dunkel ? [110, 108, 116] : [156, 163, 175],
                          dunkel ? [255, 255, 255] : [17, 24, 39],
                          naehe,
                        ),
                        transform: `translateX(${naehe * 2}px)`,
                      }}
                    >
                      {s.label}
                    </span>
                  </button>
                </li>
              )
            })}
          </ol>

          {/* Text: die Ebenen ueberblenden ineinander, statt zu wechseln. */}
          <div className="relative min-h-[19rem]">
            {TEXTE.map((_, i) => {
              const d = fortschritt - i
              const anteil = anteilVon(i)
              return (
                <div
                  key={i}
                  className="absolute inset-0 flex flex-col justify-center"
                  style={{
                    opacity: anteil,
                    // Weiter Weg: waehrend der kurzen Ueberblendung sind die
                    // beiden Ebenen raeumlich klar getrennt, statt aufeinander
                    // zu liegen.
                    transform: `translateY(${-d * 54}px)`,
                    pointerEvents: anteil > 0.5 ? 'auto' : 'none',
                  }}
                  aria-hidden={anteil <= 0.5}
                >
                  <StoryText i={i} dunkelheit={dunkelheit} />
                </div>
              )
            })}
          </div>

          {/* Produktbuehne: dieselbe Ueberblendung, dazu ein leichtes
              Schrumpfen der weichenden Ebene. So waechst die naechste sichtbar
              aus der vorherigen heraus. */}
          <div className="relative min-h-[27rem]">
            {STORY_SCHRITTE.map((s, i) => {
              const d = fortschritt - i
              const anteil = anteilVon(i)
              const entfernung = Math.min(Math.abs(d), 1)
              return (
                <div
                  key={s.id}
                  className="absolute inset-0 flex items-center"
                  style={{
                    opacity: anteil,
                    transform: `translateY(${-d * 68}px) scale(${1 - entfernung * 0.08})`,
                    pointerEvents: anteil > 0.5 ? 'auto' : 'none',
                  }}
                  aria-hidden={anteil <= 0.5}
                >
                  <div className="w-full">
                    {/* Zaehler und Sequenzen starten schon, bevor die Ebene
                        ganz da ist: sie sollen beim Erscheinen laufen, nicht
                        danach anspringen. */}
                    <Buehne i={i} aktiv={anteil > 0.35} reduziert={reduziert} />
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Dezenter Hinweis, dass hier gescrollt wird. Verschwindet, sobald die
            Bewegung erkennbar begonnen hat. */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-6 flex justify-center"
          style={{ opacity: klemme(1 - fortschritt / 0.6) }}
        >
          <span className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.16em]"
            style={{ color: mischeFarbe([156, 163, 175], [255, 255, 255], dunkelheit * 0.4) }}>
            Weiterscrollen
            <ChevronDown size={13} className={reduziert ? '' : 'animate-bounce'} />
          </span>
        </div>

        {/* Fortschrittslinie: laeuft durchgehend mit, nicht in vier Stufen. */}
        <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-0.5"
          style={{ backgroundColor: mischeFarbe([238, 231, 221], [255, 255, 255], dunkelheit * 0.08) }}>
          <div
            className="h-full bg-orange-500"
            style={{ width: `${(fortschritt / (anzahl - 1)) * 100}%` }}
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
    <>
      {/* Weicher Uebergang genau dort, wo die Story ins Dunkle kippt. Ohne ihn
          stiesse auf dem Telefon eine helle Flaeche hart auf eine dunkle. */}
      {i === 2 && (
        <div aria-hidden="true" className="h-24"
          data-mobil-uebergang
          style={{ background: 'linear-gradient(to bottom, #faf8f5, #111014)' }} />
      )}
      <div
        ref={ref}
        data-story-block={STORY_SCHRITTE[i].id}
        className="px-4 py-14 sm:px-6 sm:py-16"
        style={{ backgroundColor: dunkel ? '#111014' : '#faf8f5' }}
        {...(dunkel ? { 'data-dark-section': '' } : {})}
      >
      <div className={`mx-auto max-w-2xl ${r.className}`} style={r.style}>
        <StoryText i={i} dunkelheit={dunkel ? 1 : 0} />
        <div className="mt-8">
          <Buehne i={i} aktiv={sichtbar} reduziert={reduziert} />
        </div>
        </div>
      </div>
    </>
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
