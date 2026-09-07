import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight, Calculator, Check, ChevronDown, Database, Layers, MessageSquare,
  Minus, Search, ShieldCheck, Sparkles, TrendingUp,
} from 'lucide-react'
import LandingHeader from './LandingHeader'
import LandingFooter from './LandingFooter'
import HeroDemo from './HeroDemo'
import StoryStage from './StoryStage'
import PlusStage from './PlusStage'
import { reveal, useInView, useReducedMotion, useSequenz } from './motion'
import { SHOWCASE_FAHRZEUG } from './showcase'
import {
  AUTOFINDER_ROUTE, AUTOKOSTEN_ROUTE, CHAT_ROUTE,
  PRICING_ROUTE, REGISTER_ROUTE, VERKAUFSCHECK_ROUTE,
} from './links'
import { FOKUS_RING } from './styles'

/**
 * VIRA Landingpage.
 *
 * Die Seite ist als ABLAUF gebaut, nicht als Kartenstapel: Hero → Finden →
 * Verstehen → Prüfen → Entscheiden → Verkaufen → Plus → Preise → FAQ →
 * Abschluss. Wer scrollt, bekommt das Produkt erklärt, statt eine Liste von
 * Eigenschaften vorgelesen.
 *
 * WAS HIER NICHT STEHEN DARF
 * --------------------------
 * Keine Nutzerzahlen, keine Genauigkeitsquoten, keine Testimonials, keine
 * Marktführerschaft, keine Garantien. Nichts davon liesse sich belegen — und
 * eine Marketingseite, die mehr verspricht als die Software hält, beschädigt
 * genau das Vertrauen, das dieses Produkt verkauft.
 *
 * Selbstbewusst ist nicht dasselbe wie laut: die Texte sagen, was Vira kann,
 * ohne sich dafür zu entschuldigen und ohne zu übertreiben.
 *
 * Alle Zahlen (Preise, Kontingente) entsprechen dem eingefrorenen Pricing V1
 * und werden von landing.test.ts gegen genau diese Werte geprüft.
 *
 * Keine fremden Fahrzeugbilder, keine Provider-Aufrufe: die Produktvorschauen
 * bestehen aus echten Oberflächen mit lokalen Showcase-Daten (showcase.ts).
 */

const SEITENTITEL = 'Vira — Autos finden, prüfen und besser entscheiden'
const SEITENBESCHREIBUNG =
  'Vira hilft beim Finden, Vergleichen und Prüfen von Fahrzeugen: AutoFinder, '
  + 'Autokosten-Rechner und KI-Chat kostenlos starten, KaufCheck ab 5,99 €.'

/** Setzt Titel und Meta-Description, solange die Landingpage sichtbar ist. */
function useSeitenMeta() {
  useEffect(() => {
    const vorherTitel = document.title
    document.title = SEITENTITEL

    let tag = document.querySelector('meta[name="description"]')
    const vorherBeschreibung = tag?.getAttribute('content') ?? null
    if (!tag) {
      tag = document.createElement('meta')
      tag.setAttribute('name', 'description')
      document.head.appendChild(tag)
    }
    tag.setAttribute('content', SEITENBESCHREIBUNG)

    return () => {
      document.title = vorherTitel
      if (vorherBeschreibung !== null) tag!.setAttribute('content', vorherBeschreibung)
    }
  }, [])
}

// ── Bausteine ───────────────────────────────────────────────────────────────

function Abschnitt({ id, className = '', children }:
  { id?: string; className?: string; children: React.ReactNode }) {
  return (
    <section id={id} className={`mx-auto max-w-6xl px-4 sm:px-6 py-20 sm:py-24 ${className}`}>
      {children}
    </section>
  )
}

/** Blendet seinen Inhalt beim Hereinscrollen ein. */
function Reveal({ verzoegerung = 0, className = '', children }:
  { verzoegerung?: number; className?: string; children: React.ReactNode }) {
  const reduziert = useReducedMotion()
  const [ref, sichtbar] = useInView<HTMLDivElement>({ schwelle: 0.15 })
  const r = reveal(sichtbar, reduziert, verzoegerung)
  return (
    <div ref={ref} className={`${r.className} ${className}`} style={r.style} data-reveal>
      {children}
    </div>
  )
}

function Ueberschrift({ eyebrow, titel, text, hell = false }:
  { eyebrow: string; titel: string; text?: string; hell?: boolean }) {
  return (
    <div className="max-w-2xl">
      <p className={`text-[11px] font-bold uppercase tracking-[0.2em] ${hell ? 'text-orange-400' : 'text-orange-500'}`}>
        {eyebrow}
      </p>
      <h2 className={`mt-3 text-3xl sm:text-4xl font-bold leading-[1.12] tracking-[-0.035em] ${hell ? 'text-white' : 'text-gray-900'}`}>
        {titel}
      </h2>
      {text && (
        <p className={`mt-4 text-[15px] leading-relaxed ${hell ? 'text-white/55' : 'text-gray-600'}`}>
          {text}
        </p>
      )}
    </div>
  )
}

function Merkmal({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5 text-sm leading-relaxed text-gray-600">
      <Check size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-orange-500" />
      <span>{children}</span>
    </li>
  )
}

function PrimaerCTA({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link to={to}
      className={`inline-flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-6 py-3.5 text-[15px] font-semibold text-white shadow-[0_14px_28px_-12px_rgba(249,115,22,0.6)] transition-all hover:bg-orange-600 hover:shadow-[0_16px_32px_-10px_rgba(249,115,22,0.65)] ${FOKUS_RING}`}>
      {children}
    </Link>
  )
}

function SekundaerCTA({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link to={to}
      className={`inline-flex items-center justify-center gap-2 rounded-xl border border-[#e0d9cf] bg-white px-6 py-3.5 text-[15px] font-semibold text-gray-700 transition-colors hover:border-[#d3cabd] hover:bg-[#faf8f5] ${FOKUS_RING}`}>
      {children}
    </Link>
  )
}

// ── FAQ ─────────────────────────────────────────────────────────────────────

const FAQ = [
  {
    frage: 'Ist Vira kostenlos?',
    antwort: 'Der Einstieg ist kostenlos. Ohne Konto kannst du eine AutoFinder-Demo-Suche pro Tag '
      + 'machen. Mit einem kostenlosen Konto bekommst du 5 AutoFinder-Suchen und 20 KI-Chat-Nachrichten '
      + 'pro Monat, der Autokosten-Rechner ist unbegrenzt nutzbar. Kauf- und VerkaufsCheck sind '
      + 'kostenpflichtig.',
  },
  {
    frage: 'Kann ich den AutoFinder ohne Konto testen?',
    antwort: 'Ja. Eine vollständige Suche pro Tag läuft ohne Registrierung. Danach brauchst du ein '
      + 'kostenloses Konto — deine bereits genutzte Demo wird dabei nicht angerechnet, du startest mit '
      + 'vollen 5 Suchen im Monat.',
  },
  {
    frage: 'Muss ich ein Abo abschließen?',
    antwort: 'Nein. Kauf- und VerkaufsCheck kannst du einzeln kaufen, ohne Abo. Vira Plus lohnt sich '
      + 'erst, wenn du regelmäßig mehrere Fahrzeuge prüfst.',
  },
  {
    frage: 'Was enthält ein KaufCheck?',
    antwort: 'Eine strukturierte Fahrzeuganalyse mit Ergebnisübersicht: Baureihe und Motor, bekannte '
      + 'Schwachstellen der Baureihe, konkrete kaufrelevante Hinweise sowie eine Einordnung, wie belastbar '
      + 'die zugrunde liegende Datenlage ist.',
  },
  {
    frage: 'Verfallen einzeln gekaufte Checks?',
    antwort: 'Nein. Einzeln gekaufte Kauf- und VerkaufsChecks bleiben dauerhaft in deinem Konto — auch '
      + 'wenn du später Vira Plus abschließt, kündigst oder Plus ausläuft. Nur die monatlichen '
      + 'Plus-Kontingente verfallen zum Monatsende.',
  },
  {
    frage: 'Kann ich Vira Plus monatlich kündigen?',
    antwort: 'Ja, es gibt keine Mindestlaufzeit. Nach der Kündigung läuft Plus bis zum Ende des bereits '
      + 'bezahlten Monats weiter, danach wird nichts mehr abgebucht.',
  },
]

function FaqEintrag({ frage, antwort }: { frage: string; antwort: string }) {
  const [offen, setOffen] = useState(false)
  return (
    <div className="border-b border-[#ece7e0]">
      <h3>
        <button type="button" onClick={() => setOffen((o) => !o)} aria-expanded={offen}
          className={`flex w-full items-center justify-between gap-4 py-5 text-left ${FOKUS_RING}`}>
          <span className="text-[15px] font-semibold text-gray-900">{frage}</span>
          {offen
            ? <Minus size={18} aria-hidden="true" className="shrink-0 text-orange-500" />
            : <ChevronDown size={18} aria-hidden="true" className="shrink-0 text-gray-400" />}
        </button>
      </h3>
      {offen && <p className="-mt-1 pb-5 pr-8 text-sm leading-relaxed text-gray-600">{antwort}</p>}
    </div>
  )
}

// ── VerkaufsCheck-Ablauf ────────────────────────────────────────────────────

const VERKAUF_SCHRITTE = [
  { titel: 'Fahrzeugdaten', text: 'Modell, Baujahr, Laufleistung, Zustand' },
  { titel: 'Analyse', text: 'Zustandsbewertung und Einordnung der Baureihe' },
  { titel: 'Preisorientierung', text: 'sofern die Datenlage sie trägt' },
  { titel: 'Verkaufsstrategie', text: 'inklusive Prüfung deines Inseratstexts' },
]

function VerkaufsAblauf() {
  const reduziert = useReducedMotion()
  const [ref, sichtbar] = useInView<HTMLDivElement>({ schwelle: 0.3 })
  const frei = useSequenz(VERKAUF_SCHRITTE.length, sichtbar, reduziert, 240)

  return (
    <div ref={ref} data-verkauf-ablauf>
      <ol className="relative space-y-0">
        {VERKAUF_SCHRITTE.map((s, i) => (
          <li key={s.titel} className="relative flex gap-5 pb-8 last:pb-0">
            {/* Verbindungslinie */}
            {i < VERKAUF_SCHRITTE.length - 1 && (
              <span aria-hidden="true" className="absolute left-[15px] top-9 h-full w-px bg-[#e6ded2]">
                <span
                  className="block w-px bg-orange-400 transition-all duration-700 ease-out"
                  style={{ height: frei > i ? '100%' : '0%' }}
                />
              </span>
            )}
            <span
              className="relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs font-bold transition-all duration-500"
              style={{
                borderColor: frei > i ? '#f97316' : '#e6ded2',
                backgroundColor: frei > i ? '#f97316' : '#ffffff',
                color: frei > i ? '#ffffff' : '#9ca3af',
              }}
            >
              {i + 1}
            </span>
            <div
              className="pt-1 transition-all duration-500 ease-out"
              style={reduziert ? undefined : {
                opacity: frei > i ? 1 : 0.25,
                transform: frei > i ? 'none' : 'translateX(10px)',
              }}
            >
              <p className="text-[15px] font-bold tracking-tight text-gray-900">{s.titel}</p>
              <p className="mt-0.5 text-sm text-gray-600">{s.text}</p>
            </div>
          </li>
        ))}
      </ol>
    </div>
  )
}

// ── Seite ───────────────────────────────────────────────────────────────────

export default function LandingView() {
  // WICHTIG: Der Wurzel-Container traegt bewusst KEIN `overflow-x-hidden`.
  // `overflow-x: hidden` zwingt `overflow-y` auf `auto` — der Container wird
  // dadurch zum Scroll-Kontext, und `position: sticky` der Scroll-Story klebt
  // dann an ihm statt am Fenster, also gar nicht mehr. Die dekorativen
  // Lichtflaechen werden stattdessen von ihren eigenen Sektionen beschnitten,
  // die bereits `overflow-hidden` tragen.
  useSeitenMeta()
  const reduziert = useReducedMotion()
  const k = SHOWCASE_FAHRZEUG

  return (
    <div className="min-h-full bg-white">
      <LandingHeader />

      <main>
        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <div className="relative overflow-hidden border-b border-[#ece7e0] bg-[#fbf9f6]">
          {/* Tiefenebenen: Raster, Lichtfläche, weicher Verlauf nach unten */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 opacity-[0.5]"
            style={{
              backgroundImage:
                'linear-gradient(to right, rgba(40,25,10,0.045) 1px, transparent 1px),'
                + 'linear-gradient(to bottom, rgba(40,25,10,0.045) 1px, transparent 1px)',
              backgroundSize: '58px 58px',
              maskImage: 'radial-gradient(ellipse 80% 60% at 50% 40%, #000 40%, transparent 100%)',
              WebkitMaskImage: 'radial-gradient(ellipse 80% 60% at 50% 40%, #000 40%, transparent 100%)',
            }}
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-40 -top-52 h-[44rem] w-[44rem] rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(249,115,22,0.16) 0%, transparent 68%)' }}
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -left-52 -bottom-20 h-[32rem] w-[32rem] rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(120,140,200,0.10) 0%, transparent 70%)' }}
          />
          <div aria-hidden="true" className="pointer-events-none absolute inset-x-0 bottom-0 h-32 bg-gradient-to-b from-transparent to-white" />

          <div className="relative mx-auto max-w-6xl px-4 sm:px-6 py-16 sm:py-20 lg:py-24">
            <div className="grid items-center gap-12 lg:grid-cols-[1fr_1.08fr] lg:gap-14">
              <div
                className="transition-all duration-700 ease-out"
                style={reduziert ? undefined : { animation: 'none' }}
              >
                <span className="inline-flex items-center gap-2 rounded-full border border-[#e6ded2] bg-white/80 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-gray-500 backdrop-blur-sm">
                  <Sparkles size={13} aria-hidden="true" className="text-orange-500" />
                  Finden · Verstehen · Prüfen · Entscheiden
                </span>

                <h1 className="mt-6 text-[2.3rem] leading-[1.06] sm:text-[3.4rem] sm:leading-[1.04] font-bold tracking-[-0.045em] text-gray-900">
                  Finde das Auto,{' '}
                  <span className="text-orange-500">das wirklich zu dir passt.</span>
                </h1>

                <p className="mt-6 max-w-xl text-base sm:text-lg leading-relaxed text-gray-600">
                  Vira hilft dir beim Finden, Vergleichen und Prüfen von Fahrzeugen — von der
                  ersten Suche bis zur Kaufentscheidung.
                </p>

                <div className="mt-9 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <PrimaerCTA to={REGISTER_ROUTE}>Kostenlos starten</PrimaerCTA>
                  <SekundaerCTA to={AUTOFINDER_ROUTE}>
                    <Search size={16} aria-hidden="true" />
                    AutoFinder ausprobieren
                  </SekundaerCTA>
                </div>

                <p className="mt-4 text-[13px] text-gray-500">
                  1 Suche kostenlos testen — ohne Konto.
                </p>
              </div>

              <div className="lg:pl-2">
                <HeroDemo />
              </div>
            </div>
          </div>
        </div>

        {/* ── Kostenlose Werkzeuge ─────────────────────────────────────── */}
        <Abschnitt id="produkte">
          <Reveal>
            <Ueberschrift
              eyebrow="Kostenlos starten"
              titel="Drei Werkzeuge, die sofort nutzbar sind"
              text="Ohne Zahlungsdaten. Du entscheidest später, ob du einen Check kaufst."
            />
          </Reveal>

          {/* Bewusst offene Spalten statt drei umrandeter Kästen. */}
          <div className="mt-14 grid gap-x-10 gap-y-12 md:grid-cols-3">
            {[
              {
                icon: <Search size={20} aria-hidden="true" />, farbe: 'text-orange-600 bg-orange-50',
                titel: 'AutoFinder', to: AUTOFINDER_ROUTE, cta: 'AutoFinder öffnen',
                text: 'Beschreibe Budget, Nutzung und was dir wichtig ist — Vira schlägt passende Baureihen vor und begründet jeden Vorschlag.',
                punkte: ['1 Demo-Suche pro Tag ohne Konto', '5 Suchen pro Monat mit kostenlosem Konto'],
              },
              {
                icon: <Calculator size={20} aria-hidden="true" />, farbe: 'text-emerald-600 bg-emerald-50',
                titel: 'Autokosten-Rechner', to: AUTOKOSTEN_ROUTE, cta: 'Autokosten berechnen',
                text: 'Was ein Fahrzeug im Jahr wirklich kostet: Kraftstoff, Versicherung, Steuer, Wartung und Wertverlust in einer nachvollziehbaren Rechnung.',
                punkte: ['Unbegrenzt kostenlos', 'Ohne Konto nutzbar'],
              },
              {
                icon: <MessageSquare size={20} aria-hidden="true" />, farbe: 'text-blue-600 bg-blue-50',
                titel: 'KI-Chat', to: CHAT_ROUTE, cta: 'Chat öffnen',
                text: 'Fragen zu Modellen, Motoren, Wartung oder einem konkreten Inserat — in normaler Sprache, mit Bezug auf deine Fahrzeugdaten.',
                punkte: ['20 Nachrichten pro Monat im kostenlosen Konto', '100 Nachrichten pro Monat mit Vira Plus'],
              },
            ].map((w, i) => (
              <Reveal key={w.titel} verzoegerung={i * 110}>
                <article className="border-t border-[#e6ded2] pt-7">
                  <div className={`flex h-11 w-11 items-center justify-center rounded-xl ${w.farbe}`}>
                    {w.icon}
                  </div>
                  <h3 className="mt-5 text-xl font-bold tracking-tight text-gray-900">{w.titel}</h3>
                  <p className="mt-2.5 text-sm leading-relaxed text-gray-600">{w.text}</p>
                  <ul className="mt-5 space-y-2.5">
                    {w.punkte.map((p) => <Merkmal key={p}>{p}</Merkmal>)}
                  </ul>
                  <Link to={w.to}
                    className={`mt-6 inline-flex items-center gap-1.5 rounded text-sm font-semibold text-orange-600 hover:text-orange-700 ${FOKUS_RING}`}>
                    {w.cta}
                    <ArrowRight size={14} aria-hidden="true" />
                  </Link>
                </article>
              </Reveal>
            ))}
          </div>
        </Abschnitt>

        {/* ── Die Story: Finden → Verstehen → Prüfen → Entscheiden ──────── */}
        <StoryStage />

        {/* ── VerkaufsCheck ────────────────────────────────────────────── */}
        <Abschnitt>
          <div className="grid gap-12 lg:grid-cols-2 lg:items-center lg:gap-16">
            <Reveal>
              <Ueberschrift
                eyebrow="Die andere Richtung"
                titel="Und wenn du verkaufen willst?"
                text="Der VerkaufsCheck dreht dieselbe Analyse um: Was ist dein Fahrzeug wert, was solltest du vorher wissen — und wie beschreibst du es so, dass Käufer es ernst nehmen."
              />
              <div className="mt-8 flex flex-wrap items-end gap-2.5">
                <span className="text-4xl font-bold tracking-[-0.04em] text-gray-900">8,99 €</span>
                <span className="pb-1 text-sm font-medium text-gray-500">einmalig pro Check</span>
              </div>
              <p className="mt-3 text-sm text-gray-500">Gekauftes Guthaben verfällt nicht.</p>
              <div className="mt-8">
                <SekundaerCTA to={VERKAUFSCHECK_ROUTE}>
                  <TrendingUp size={16} aria-hidden="true" />
                  VerkaufsCheck starten
                </SekundaerCTA>
              </div>
            </Reveal>

            <Reveal verzoegerung={120}>
              <VerkaufsAblauf />
            </Reveal>
          </div>
        </Abschnitt>

        {/* ── Vira Plus ────────────────────────────────────────────────── */}
        <PlusStage />

        {/* ── Warum Vira: drei Prinzipien ──────────────────────────────── */}
        <Abschnitt>
          <Reveal>
            <Ueberschrift
              eyebrow="Warum Vira"
              titel="Drei Dinge, die den Unterschied machen"
            />
          </Reveal>

          <div className="mt-14 space-y-14">
            {[
              {
                nr: '01', icon: <Database size={20} aria-hidden="true" />,
                titel: 'Struktur statt Datenchaos',
                text: 'Baureihen, Generationen und Motorvarianten liegen als gepflegte Datenbasis vor — '
                  + 'nicht als Suchergebnis. Deshalb weiß Vira, dass ein 118i etwas anderes ist als ein '
                  + '120i, und behandelt ihn auch so.',
                beleg: `${k.marke} ${k.modell} ${k.generation} · ${k.motor} · ${k.leistung_ps} PS`,
              },
              {
                nr: '02', icon: <ShieldCheck size={20} aria-hidden="true" />,
                titel: 'Transparente Datenqualität',
                text: 'Jede Analyse sagt dazu, worauf sie beruht. Wo die Grundlage für eine belastbare '
                  + 'Aussage nicht reicht, steht das da — statt einer Zahl, die gut aussieht und nichts wert ist.',
                beleg: 'Datenlage hoch · Quellen ausgewiesen',
              },
              {
                nr: '03', icon: <Layers size={20} aria-hidden="true" />,
                titel: 'Vom Finden bis zum Prüfen',
                text: 'Suchen, rechnen, prüfen und nachfragen greifen ineinander. Das gefundene Fahrzeug '
                  + 'wandert ohne Abtippen in die Kostenrechnung und in den KaufCheck.',
                beleg: 'AutoFinder → Autokosten → KaufCheck',
              },
            ].map((p, i) => (
              <Reveal key={p.nr} verzoegerung={i * 90}>
                <article className="grid gap-6 border-t border-[#e6ded2] pt-8 md:grid-cols-[auto_1fr_auto] md:items-start md:gap-10">
                  <div className="flex items-center gap-4">
                    <span className="text-[42px] font-bold leading-none tracking-[-0.05em] text-[#e6ded2]">
                      {p.nr}
                    </span>
                    <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#f4f0ea] text-gray-700 md:hidden">
                      {p.icon}
                    </span>
                  </div>
                  <div className="max-w-2xl">
                    <h3 className="text-2xl font-bold tracking-[-0.03em] text-gray-900">{p.titel}</h3>
                    <p className="mt-3 text-[15px] leading-relaxed text-gray-600">{p.text}</p>
                    <p className="mt-4 inline-block rounded-lg bg-[#f4f0ea] px-3 py-1.5 font-mono text-xs text-gray-500">
                      {p.beleg}
                    </p>
                  </div>
                  <span className="hidden h-12 w-12 items-center justify-center rounded-2xl bg-[#f4f0ea] text-gray-700 md:flex">
                    {p.icon}
                  </span>
                </article>
              </Reveal>
            ))}
          </div>
        </Abschnitt>

        {/* ── Preise ───────────────────────────────────────────────────── */}
        <div className="border-y border-[#ece7e0] bg-[#faf8f5]">
          <Abschnitt id="preise">
            <Reveal>
              <Ueberschrift
                eyebrow="Preise"
                titel="Bezahlen nur, wenn du es brauchst"
                text="Kostenlos starten, einzelne Checks kaufen — oder monatlich mehr bekommen."
              />
            </Reveal>

            <div className="mt-12 grid gap-4 lg:grid-cols-[1fr_1fr_1fr_1.25fr] lg:items-end">
              {[
                { titel: 'Vira Free', preis: '0 €', zusatz: 'dauerhaft kostenlos',
                  punkte: ['5 AutoFinder-Suchen / Monat', '20 KI-Chat-Nachrichten / Monat', 'Autokosten unbegrenzt'] },
                { titel: 'KaufCheck', preis: '5,99 €', zusatz: 'einmalig',
                  punkte: ['1 KaufCheck', 'Guthaben verfällt nicht'] },
                { titel: 'VerkaufsCheck', preis: '8,99 €', zusatz: 'einmalig',
                  punkte: ['1 VerkaufsCheck', 'Guthaben verfällt nicht'] },
                { titel: 'Vira Plus', preis: '16,99 €', zusatz: 'pro Monat', hervor: true,
                  punkte: ['5 KaufChecks / Monat', '1 VerkaufsCheck / Monat', '50 AutoFinder-Suchen / Monat', '100 KI-Chat-Nachrichten / Monat'] },
              ].map((p, i) => (
                <Reveal key={p.titel} verzoegerung={i * 80}>
                  <div className={`h-full rounded-2xl border bg-white p-6 ${
                    p.hervor
                      ? 'border-orange-300 shadow-[0_24px_50px_-30px_rgba(249,115,22,0.5)] ring-1 ring-orange-200'
                      : 'border-[#e6e1da]'
                  }`}>
                    {p.hervor && (
                      <span className="mb-3 inline-block rounded-full bg-orange-500 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider text-white">
                        Bestes Verhältnis
                      </span>
                    )}
                    <p className="text-sm font-semibold text-gray-500">{p.titel}</p>
                    <p className={`mt-2 font-bold tracking-[-0.035em] text-gray-900 ${p.hervor ? 'text-4xl' : 'text-3xl'}`}>
                      {p.preis}
                    </p>
                    <p className="mt-0.5 text-xs text-gray-500">{p.zusatz}</p>
                    <ul className="mt-5 space-y-2">
                      {p.punkte.map((x) => (
                        <li key={x} className="flex items-start gap-2 text-[13px] leading-relaxed text-gray-600">
                          <Check size={14} aria-hidden="true" className="mt-0.5 shrink-0 text-orange-500" />
                          {x}
                        </li>
                      ))}
                    </ul>
                  </div>
                </Reveal>
              ))}
            </div>

            <div className="mt-10">
              <SekundaerCTA to={PRICING_ROUTE}>Alle Preise ansehen</SekundaerCTA>
            </div>
          </Abschnitt>
        </div>

        {/* ── FAQ ──────────────────────────────────────────────────────── */}
        <Abschnitt id="faq">
          <div className="grid gap-10 lg:grid-cols-[0.8fr_1.6fr] lg:gap-16">
            <Reveal>
              <Ueberschrift eyebrow="FAQ" titel="Häufige Fragen" />
              <p className="mt-5 text-sm leading-relaxed text-gray-500">
                Noch etwas offen? Schreib uns — die Antwort landet in dieser Liste, wenn sie
                mehr Leute betrifft.
              </p>
            </Reveal>
            <Reveal verzoegerung={100}>
              <div className="border-t border-[#ece7e0]">
                {FAQ.map((f) => <FaqEintrag key={f.frage} {...f} />)}
              </div>
            </Reveal>
          </div>
        </Abschnitt>

        {/* ── Abschluss ────────────────────────────────────────────────── */}
        <div className="relative overflow-hidden bg-[#111014]" data-final-cta>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute left-1/2 top-0 h-[36rem] w-[52rem] -translate-x-1/2 -translate-y-1/3 rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(249,115,22,0.22) 0%, transparent 66%)' }}
          />
          <Abschnitt className="relative text-center">
            <Reveal>
              <h2 className="mx-auto max-w-3xl text-3xl sm:text-5xl font-bold leading-[1.1] tracking-[-0.04em] text-white">
                Dein nächstes Auto beginnt mit einer besseren Entscheidung.
              </h2>
              <p className="mx-auto mt-6 max-w-xl text-[15px] leading-relaxed text-white/55">
                Starte kostenlos — ohne Zahlungsdaten, ohne Abo.
              </p>
              <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <Link to={REGISTER_ROUTE}
                  className={`inline-flex items-center justify-center rounded-xl bg-orange-500 px-8 py-4 text-[15px] font-semibold text-white shadow-[0_18px_40px_-14px_rgba(249,115,22,0.85)] transition-colors hover:bg-orange-400 ${FOKUS_RING}`}>
                  Kostenlos starten
                </Link>
                <Link to={PRICING_ROUTE}
                  className={`inline-flex items-center justify-center rounded-xl border border-white/15 px-8 py-4 text-[15px] font-semibold text-white/85 transition-colors hover:bg-white/[0.06] ${FOKUS_RING}`}>
                  Preise ansehen
                </Link>
              </div>
            </Reveal>
          </Abschnitt>
        </div>
      </main>

      <LandingFooter />
    </div>
  )
}
