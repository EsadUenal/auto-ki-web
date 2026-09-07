import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Calculator, Car, Check, ChevronDown, Database, Gauge, Layers,
  MessageSquare, Minus, Search, ShieldCheck, ShoppingCart, Sparkles, TrendingUp, Wallet,
} from 'lucide-react'
import VehicleIdentityPanel from '../autofinder/VehicleIdentityPanel'
import LandingHeader from './LandingHeader'
import LandingFooter from './LandingFooter'
import { HERO_KANDIDAT } from './heroFixture'
import {
  AUTOFINDER_ROUTE, AUTOKOSTEN_ROUTE, CHAT_ROUTE, KAUFCHECK_ROUTE,
  PRICING_ROUTE, REGISTER_ROUTE, VERKAUFSCHECK_ROUTE,
} from './links'
import { FOKUS_RING } from './styles'

/**
 * VIRA Landingpage.
 *
 * WAS HIER NICHT STEHEN DARF
 * --------------------------
 * Keine Nutzerzahlen, keine Genauigkeitsquoten, keine Testimonials, keine
 * Marktführerschaft, keine Garantien. Nichts davon liesse sich belegen — und
 * eine Marketingseite, die mehr verspricht als die Software hält, beschädigt
 * genau das Vertrauen, das dieses Produkt verkauft. Beworben werden deshalb
 * ausschliesslich Eigenschaften, die im Produkt nachweisbar vorhanden sind.
 *
 * Alle Zahlen (Preise, Kontingente) entsprechen dem eingefrorenen Pricing V1
 * und werden von landing.test.ts gegen genau diese Werte geprüft.
 *
 * Keine fremden Fahrzeugbilder: das Produktvisual besteht aus dem echten
 * VehicleIdentityPanel mit echten AutoFinder-Daten (siehe heroFixture.ts).
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
    <section id={id} className={`mx-auto max-w-6xl px-4 sm:px-6 py-16 sm:py-20 ${className}`}>
      {children}
    </section>
  )
}

function Ueberschrift({ eyebrow, titel, text }:
  { eyebrow: string; titel: string; text?: string }) {
  return (
    <div className="max-w-2xl">
      <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-orange-500">{eyebrow}</p>
      <h2 className="mt-2.5 text-2xl sm:text-3xl font-bold tracking-[-0.03em] text-gray-900">{titel}</h2>
      {text && <p className="mt-3 text-[15px] leading-relaxed text-gray-600">{text}</p>}
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

/** Primärer CTA — visuell identisch mit den Buttons in der App. */
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

// ── Produktvorschau im Hero ─────────────────────────────────────────────────

/**
 * Reduzierte, aber ECHTE AutoFinder-Ergebniskarte: dasselbe
 * VehicleIdentityPanel wie im Produkt, dieselben Daten, dieselbe Passungs-
 * anzeige. Kein nachgebauter Screenshot und kein Fantasie-Fahrzeug.
 */
function ProduktVorschau() {
  const k = HERO_KANDIDAT
  const preis = `${(k.estimated_price_min ?? 0).toLocaleString('de-DE')} – ${(k.estimated_price_max ?? 0).toLocaleString('de-DE')} €`

  return (
    <div aria-label="Beispielhafte AutoFinder-Ergebniskarte" role="img"
      className="relative rounded-3xl border border-[#e6e1da] bg-white shadow-[0_30px_60px_-30px_rgba(40,25,10,0.35)] overflow-hidden">
      <div className="flex items-center gap-2 border-b border-[#efe9df] bg-[#faf8f5] px-4 py-2.5">
        <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-[#e6ded2]" />
        <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-[#e6ded2]" />
        <span aria-hidden="true" className="h-2.5 w-2.5 rounded-full bg-[#e6ded2]" />
        <span className="ml-2 text-[11px] font-semibold tracking-wide text-gray-400">
          Vira · AutoFinder — Top-Treffer
        </span>
      </div>

      <div className="sm:flex sm:items-stretch">
        <VehicleIdentityPanel k={k} rank={1} />

        <div className="min-w-0 flex-1 p-5">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="truncate text-lg font-bold tracking-tight text-gray-900">
                {k.marke} {k.modell}
              </h3>
              <p className="mt-0.5 text-xs font-medium text-gray-400">Baujahre {k.baujahr_von} →</p>
            </div>
            <div className="shrink-0 rounded-2xl border border-orange-200/80 bg-orange-50 px-3 py-1.5 text-center">
              <span className="block text-xl font-extrabold leading-none tabular-nums text-orange-600">{k.user_fit}%</span>
              <span className="mt-0.5 block text-[9px] font-bold uppercase tracking-wider text-orange-400">Passung</span>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-1.5">
            <span className="inline-flex items-center gap-1 rounded-full bg-[#f4f0ea] px-2.5 py-1 text-xs font-medium text-gray-600">
              <Gauge size={12} aria-hidden="true" className="text-gray-400" />{k.leistung_ps} PS
            </span>
            <span className="inline-flex items-center rounded-full bg-[#f4f0ea] px-2.5 py-1 text-xs font-medium text-gray-600">
              {k.kraftstoff}
            </span>
            <span className="inline-flex items-center rounded-full bg-[#f4f0ea] px-2.5 py-1 text-xs font-medium text-gray-600">
              Automatik / Schaltgetriebe
            </span>
          </div>

          <p className="mt-3.5 text-sm leading-relaxed text-gray-600">{k.why_fits[1]}</p>

          <div className="mt-4 rounded-xl border border-[#efe9df] bg-[#faf8f5] px-3.5 py-3">
            <p className="text-[10px] font-bold uppercase tracking-[0.14em] text-gray-400">Preisorientierung</p>
            <p className="mt-1 text-sm font-bold tabular-nums text-gray-900">{preis}</p>
            <p className="mt-0.5 text-[11px] text-gray-500">Nahe am Budget · Datenlage hoch</p>
          </div>

          <div className="mt-4 flex items-center gap-2 text-sm font-semibold text-orange-600">
            <ShoppingCart size={15} aria-hidden="true" />
            <span>Mit KaufCheck prüfen</span>
          </div>
        </div>
      </div>
    </div>
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

// ── Seite ───────────────────────────────────────────────────────────────────

export default function LandingView() {
  useSeitenMeta()

  return (
    <div className="min-h-full overflow-x-hidden bg-white">
      <LandingHeader />

      <main>
        {/* ── Hero ─────────────────────────────────────────────────────── */}
        <div className="relative overflow-hidden border-b border-[#ece7e0] bg-gradient-to-b from-[#fbf9f6] to-white">
          <div aria-hidden="true"
            className="pointer-events-none absolute -right-32 -top-40 h-[30rem] w-[30rem] rounded-full"
            style={{ background: 'radial-gradient(circle, rgba(249,115,22,0.14) 0%, transparent 70%)' }} />

          <div className="relative mx-auto max-w-6xl px-4 sm:px-6 py-14 sm:py-20 lg:py-24">
            <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-14">
              <div>
                <span className="inline-flex items-center gap-2 rounded-full border border-[#e6ded2] bg-white px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.14em] text-gray-500">
                  <Sparkles size={13} aria-hidden="true" className="text-orange-500" />
                  Finden · Prüfen · Entscheiden
                </span>

                <h1 className="mt-5 text-[2.1rem] leading-[1.1] sm:text-5xl sm:leading-[1.08] font-bold tracking-[-0.04em] text-gray-900">
                  Finde das Auto,{' '}
                  <span className="text-orange-500">das wirklich zu dir passt.</span>
                </h1>

                <p className="mt-5 max-w-xl text-base sm:text-lg leading-relaxed text-gray-600">
                  Vira hilft dir beim Finden, Vergleichen und Prüfen von Fahrzeugen — von der
                  ersten Suche bis zur Kaufentscheidung.
                </p>

                <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
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

              <div className="lg:pl-4">
                <ProduktVorschau />
              </div>
            </div>
          </div>
        </div>

        {/* ── Kostenlose Werkzeuge ─────────────────────────────────────── */}
        <Abschnitt id="produkte">
          <Ueberschrift
            eyebrow="Kostenlos starten"
            titel="Drei Werkzeuge, die sofort nutzbar sind"
            text="Ohne Zahlungsdaten. Du entscheidest später, ob du einen Check kaufst."
          />

          <div className="mt-10 grid gap-5 md:grid-cols-3">
            <article className="flex flex-col rounded-2xl border border-[#e6e1da] bg-white p-6 shadow-[0_16px_36px_-30px_rgba(40,25,10,0.3)]">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
                <Search size={20} aria-hidden="true" />
              </div>
              <h3 className="mt-4 text-lg font-bold tracking-tight text-gray-900">AutoFinder</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-gray-600">
                Beschreibe Budget, Nutzung und was dir wichtig ist — Vira schlägt passende
                Baureihen vor und begründet jeden Vorschlag.
              </p>
              <ul className="mt-4 space-y-2.5">
                <Merkmal>1 Demo-Suche pro Tag ohne Konto</Merkmal>
                <Merkmal>5 Suchen pro Monat mit kostenlosem Konto</Merkmal>
              </ul>
              <Link to={AUTOFINDER_ROUTE}
                className={`mt-5 inline-block rounded text-sm font-semibold text-orange-600 hover:text-orange-700 ${FOKUS_RING}`}>
                AutoFinder öffnen →
              </Link>
            </article>

            <article className="flex flex-col rounded-2xl border border-[#e6e1da] bg-white p-6 shadow-[0_16px_36px_-30px_rgba(40,25,10,0.3)]">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                <Calculator size={20} aria-hidden="true" />
              </div>
              <h3 className="mt-4 text-lg font-bold tracking-tight text-gray-900">Autokosten-Rechner</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-gray-600">
                Was ein Fahrzeug im Jahr wirklich kostet: Kraftstoff, Versicherung, Steuer,
                Wartung und Wertverlust in einer nachvollziehbaren Rechnung.
              </p>
              <ul className="mt-4 space-y-2.5">
                <Merkmal>Unbegrenzt kostenlos</Merkmal>
                <Merkmal>Ohne Konto nutzbar</Merkmal>
              </ul>
              <Link to={AUTOKOSTEN_ROUTE}
                className={`mt-5 inline-block rounded text-sm font-semibold text-orange-600 hover:text-orange-700 ${FOKUS_RING}`}>
                Autokosten berechnen →
              </Link>
            </article>

            <article className="flex flex-col rounded-2xl border border-[#e6e1da] bg-white p-6 shadow-[0_16px_36px_-30px_rgba(40,25,10,0.3)]">
              <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                <MessageSquare size={20} aria-hidden="true" />
              </div>
              <h3 className="mt-4 text-lg font-bold tracking-tight text-gray-900">KI-Chat</h3>
              <p className="mt-2 flex-1 text-sm leading-relaxed text-gray-600">
                Fragen zu Modellen, Motoren, Wartung oder einem konkreten Inserat — in normaler
                Sprache, mit Bezug auf deine Fahrzeugdaten.
              </p>
              <ul className="mt-4 space-y-2.5">
                <Merkmal>20 Nachrichten pro Monat im kostenlosen Konto</Merkmal>
                <Merkmal>100 Nachrichten pro Monat mit Vira Plus</Merkmal>
              </ul>
              <Link to={CHAT_ROUTE}
                className={`mt-5 inline-block rounded text-sm font-semibold text-orange-600 hover:text-orange-700 ${FOKUS_RING}`}>
                Chat öffnen →
              </Link>
            </article>
          </div>
        </Abschnitt>

        {/* ── Ablauf ───────────────────────────────────────────────────── */}
        <div className="border-y border-[#ece7e0] bg-[#faf8f5]">
          <Abschnitt id="ablauf">
            <Ueberschrift
              eyebrow="So funktioniert Vira"
              titel="Von der ersten Idee zur belastbaren Entscheidung"
            />

            <ol className="mt-10 grid gap-5 md:grid-cols-3">
              {[
                {
                  n: '1', icon: <Search size={18} aria-hidden="true" />,
                  titel: 'Passende Fahrzeuge finden',
                  text: 'Der AutoFinder schlägt Baureihen vor, die zu Budget, Nutzung und Prioritäten passen — mit Begründung statt Trefferliste.',
                },
                {
                  n: '2', icon: <ShieldCheck size={18} aria-hidden="true" />,
                  titel: 'Kandidaten prüfen',
                  text: 'Der KaufCheck nimmt ein konkretes Fahrzeug auseinander: Motor, bekannte Schwachstellen der Baureihe und kaufrelevante Hinweise.',
                },
                {
                  n: '3', icon: <TrendingUp size={18} aria-hidden="true" />,
                  titel: 'Besser entscheiden',
                  text: 'Du siehst, was für und was gegen ein Fahrzeug spricht — und wie belastbar die Datenlage dahinter ist.',
                },
              ].map((s) => (
                <li key={s.n} className="rounded-2xl border border-[#e6e1da] bg-white p-6">
                  <div className="flex items-center gap-3">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-gray-900 text-sm font-bold text-white">
                      {s.n}
                    </span>
                    <span className="text-orange-500">{s.icon}</span>
                  </div>
                  <h3 className="mt-4 text-base font-bold tracking-tight text-gray-900">{s.titel}</h3>
                  <p className="mt-2 text-sm leading-relaxed text-gray-600">{s.text}</p>
                </li>
              ))}
            </ol>
          </Abschnitt>
        </div>

        {/* ── KaufCheck / VerkaufsCheck ────────────────────────────────── */}
        <Abschnitt>
          <Ueberschrift
            eyebrow="Die Checks"
            titel="Wenn es konkret wird"
            text="Beide Checks kaufst du einzeln — ohne Abo. Gekauftes Guthaben verfällt nicht."
          />

          <div className="mt-10 grid gap-5 lg:grid-cols-2">
            <article className="flex flex-col rounded-2xl border border-[#e6e1da] bg-white p-7 shadow-[0_16px_36px_-30px_rgba(40,25,10,0.3)]">
              <div className="flex items-start justify-between gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
                  <ShoppingCart size={20} aria-hidden="true" />
                </div>
                <div className="text-right">
                  <span className="block text-3xl font-bold tracking-[-0.03em] text-gray-900">5,99 €</span>
                  <span className="text-xs font-medium text-gray-500">einmalig pro Check</span>
                </div>
              </div>
              <h3 className="mt-5 text-xl font-bold tracking-tight text-gray-900">KaufCheck</h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-600">
                Entscheidungshilfe vor dem Kauf — für ein konkretes Fahrzeug, das du im Auge hast.
              </p>
              <ul className="mt-5 flex-1 space-y-2.5">
                <Merkmal>Baureihen- und Motorprüfung</Merkmal>
                <Merkmal>Bekannte Schwachstellen der Baureihe</Merkmal>
                <Merkmal>Konkrete kaufrelevante Hinweise</Merkmal>
                <Merkmal>Einordnung von Datenqualität und Quellenlage</Merkmal>
                <Merkmal>Strukturierte Ergebnisübersicht</Merkmal>
              </ul>
              <div className="mt-6">
                <PrimaerCTA to={KAUFCHECK_ROUTE}>KaufCheck starten</PrimaerCTA>
              </div>
            </article>

            <article className="flex flex-col rounded-2xl border border-[#e6e1da] bg-white p-7 shadow-[0_16px_36px_-30px_rgba(40,25,10,0.3)]">
              <div className="flex items-start justify-between gap-4">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-blue-50 text-blue-600">
                  <TrendingUp size={20} aria-hidden="true" />
                </div>
                <div className="text-right">
                  <span className="block text-3xl font-bold tracking-[-0.03em] text-gray-900">8,99 €</span>
                  <span className="text-xs font-medium text-gray-500">einmalig pro Check</span>
                </div>
              </div>
              <h3 className="mt-5 text-xl font-bold tracking-tight text-gray-900">VerkaufsCheck</h3>
              <p className="mt-2 text-sm leading-relaxed text-gray-600">
                Orientierung und Vorbereitung, bevor du dein Fahrzeug inserierst.
              </p>
              <ul className="mt-5 flex-1 space-y-2.5">
                <Merkmal>Fahrzeug- und Zustandsanalyse</Merkmal>
                <Merkmal>Preisorientierung bei ausreichender Datenlage</Merkmal>
                <Merkmal>Verkaufsstrategie und Ergebnisübersicht</Merkmal>
                <Merkmal>Prüfung deines Inseratstexts</Merkmal>
                <Merkmal>Argumente für einen nachvollziehbaren Verkauf</Merkmal>
              </ul>
              <div className="mt-6">
                <SekundaerCTA to={VERKAUFSCHECK_ROUTE}>VerkaufsCheck starten</SekundaerCTA>
              </div>
            </article>
          </div>
        </Abschnitt>

        {/* ── Vira Plus ────────────────────────────────────────────────── */}
        <div className="border-y border-[#ece7e0] bg-[#faf8f5]">
          <Abschnitt>
            <div className="grid gap-10 lg:grid-cols-[1.05fr_1fr] lg:items-center">
              <div>
                <Ueberschrift
                  eyebrow="Für regelmäßige Nutzung"
                  titel="Vira Plus"
                  text="Für alle, die mehrere Fahrzeuge prüfen, bevor sie sich entscheiden — oder öfter als einmal im Jahr kaufen und verkaufen."
                />
                <div className="mt-7 flex flex-wrap items-end gap-2">
                  <span className="text-4xl font-bold tracking-[-0.04em] text-gray-900">16,99 €</span>
                  <span className="pb-1 text-sm font-medium text-gray-500">pro Monat</span>
                </div>
                <p className="mt-3 max-w-lg text-sm leading-relaxed text-gray-500">
                  Monatlich kündbar, keine Mindestlaufzeit. Die monatlichen Kontingente sammeln
                  sich nicht an — nicht genutzte Plus-Checks verfallen zum Monatsende. Einzeln
                  gekaufte Checks behältst du dauerhaft.
                </p>
                <div className="mt-7">
                  <PrimaerCTA to={PRICING_ROUTE}>Vira Plus starten</PrimaerCTA>
                </div>
              </div>

              <div className="rounded-2xl border border-[#e6e1da] bg-white p-7 shadow-[0_20px_44px_-32px_rgba(40,25,10,0.34)]">
                <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-gray-400">
                  Jeden Monat enthalten
                </p>
                <ul className="mt-5 space-y-3.5">
                  {[
                    { icon: <ShoppingCart size={16} aria-hidden="true" />, text: '5 KaufChecks pro Monat' },
                    { icon: <TrendingUp size={16} aria-hidden="true" />, text: '1 VerkaufsCheck pro Monat' },
                    { icon: <Search size={16} aria-hidden="true" />, text: '50 AutoFinder-Suchen pro Monat' },
                    { icon: <MessageSquare size={16} aria-hidden="true" />, text: '100 KI-Chat-Nachrichten pro Monat' },
                    { icon: <Calculator size={16} aria-hidden="true" />, text: 'Autokosten unbegrenzt' },
                  ].map((f) => (
                    <li key={f.text} className="flex items-center gap-3 text-sm font-medium text-gray-700">
                      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-orange-50 text-orange-600">
                        {f.icon}
                      </span>
                      {f.text}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </Abschnitt>
        </div>

        {/* ── Warum Vira ───────────────────────────────────────────────── */}
        <Abschnitt>
          <Ueberschrift
            eyebrow="Warum Vira"
            titel="Nachvollziehbar statt beeindruckend"
            text="Vira sagt dir auch, wenn die Datenlage für eine belastbare Aussage nicht reicht. Das ist unbequemer als eine Zahl — aber ehrlicher."
          />

          <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {[
              { icon: <Database size={18} aria-hidden="true" />, titel: 'Strukturierte Fahrzeugdaten',
                text: 'Baureihen, Generationen und Motorvarianten aus einer gepflegten Datenbasis — nicht aus einer Trefferliste.' },
              { icon: <ShieldCheck size={18} aria-hidden="true" />, titel: 'Transparente Datenqualität',
                text: 'Jede Analyse sagt dazu, worauf sie beruht — und wo die Grundlage dünn ist.' },
              { icon: <Wallet size={18} aria-hidden="true" />, titel: 'Klare Preisorientierung',
                text: 'Eine Einordnung, wenn die Datenlage sie trägt. Keine erfundene Zahl, wenn nicht.' },
              { icon: <Layers size={18} aria-hidden="true" />, titel: 'Mehrere Werkzeuge, ein Ablauf',
                text: 'Suchen, rechnen, prüfen und nachfragen greifen ineinander, statt nebeneinanderzustehen.' },
              { icon: <Sparkles size={18} aria-hidden="true" />, titel: 'Kostenloser Einstieg',
                text: 'AutoFinder, Autokosten und KI-Chat lassen sich ohne Zahlungsdaten ausprobieren.' },
              { icon: <Car size={18} aria-hidden="true" />, titel: 'Keine fremden Fahrzeugbilder',
                text: 'Statt beliebiger Fotos zeigt Vira die Fahrzeugidentität: Marke, Generation, Motor und Passung.' },
            ].map((p) => (
              <article key={p.titel} className="rounded-2xl border border-[#e6e1da] bg-white p-6">
                <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#f4f0ea] text-gray-700">
                  {p.icon}
                </span>
                <h3 className="mt-4 text-base font-bold tracking-tight text-gray-900">{p.titel}</h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-600">{p.text}</p>
              </article>
            ))}
          </div>
        </Abschnitt>

        {/* ── Preis-Teaser ─────────────────────────────────────────────── */}
        <div className="border-y border-[#ece7e0] bg-[#faf8f5]">
          <Abschnitt id="preise">
            <Ueberschrift
              eyebrow="Preise"
              titel="Bezahlen nur, wenn du es brauchst"
              text="Kostenlos starten, einzelne Checks kaufen — oder monatlich mehr bekommen."
            />

            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { titel: 'Vira Free', preis: '0 €', zusatz: 'dauerhaft kostenlos' },
                { titel: 'KaufCheck', preis: '5,99 €', zusatz: 'einmalig' },
                { titel: 'VerkaufsCheck', preis: '8,99 €', zusatz: 'einmalig' },
                { titel: 'Vira Plus', preis: '16,99 €', zusatz: 'pro Monat', hervor: true },
              ].map((p) => (
                <div key={p.titel}
                  className={`rounded-2xl border bg-white p-5 ${p.hervor ? 'border-orange-300 ring-1 ring-orange-200' : 'border-[#e6e1da]'}`}>
                  <p className="text-sm font-semibold text-gray-500">{p.titel}</p>
                  <p className="mt-2 text-2xl font-bold tracking-[-0.03em] text-gray-900">{p.preis}</p>
                  <p className="mt-0.5 text-xs text-gray-500">{p.zusatz}</p>
                </div>
              ))}
            </div>

            <div className="mt-8">
              <SekundaerCTA to={PRICING_ROUTE}>Alle Preise ansehen</SekundaerCTA>
            </div>
          </Abschnitt>
        </div>

        {/* ── FAQ ──────────────────────────────────────────────────────── */}
        <Abschnitt id="faq">
          <Ueberschrift eyebrow="FAQ" titel="Häufige Fragen" />
          <div className="mt-8 max-w-3xl border-t border-[#ece7e0]">
            {FAQ.map((f) => <FaqEintrag key={f.frage} {...f} />)}
          </div>
        </Abschnitt>

        {/* ── Abschluss-CTA ────────────────────────────────────────────── */}
        <div className="border-t border-[#ece7e0] bg-gradient-to-b from-white to-[#faf8f5]">
          <Abschnitt className="text-center">
            <h2 className="mx-auto max-w-2xl text-2xl sm:text-4xl font-bold leading-[1.15] tracking-[-0.035em] text-gray-900">
              Dein nächstes Auto beginnt mit einer besseren Entscheidung.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-gray-600">
              Starte kostenlos — ohne Zahlungsdaten, ohne Abo.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <PrimaerCTA to={REGISTER_ROUTE}>Kostenlos starten</PrimaerCTA>
              <SekundaerCTA to={PRICING_ROUTE}>Preise ansehen</SekundaerCTA>
            </div>
          </Abschnitt>
        </div>
      </main>

      <LandingFooter />
    </div>
  )
}
