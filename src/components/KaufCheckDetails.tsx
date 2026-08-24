import { useEffect, useState } from 'react'
import { Search, Car, MessageCircle, FileText, Gauge } from 'lucide-react'
import EvidenceWhy, { insightsByIds } from './EvidenceWhy'
import { MarketMetrics } from './ResultSummary'
import type {
  KaufCheckResult, Kaufaktion, Pruefliste, Kaufaktionen,
  Fahrzeugkontext, Laufleistungskontext, WebVehicleIdentity, Marktanalyse, Insight,
} from '../types'

/**
 * KaufCheck-Backend-Freeze — UI-Umbau (kaufcheck-ui-final).
 *
 * Reine, KaufCheck-spezifische Darstellungs-Bausteine für die Backend-Felder, die
 * bislang komplett ungenutzt waren: kaufaktionen (P1-3, die vier Prüflisten),
 * fahrzeugkontext (P1-4), laufleistungskontext (P2-5), technical_coverage,
 * web_identitaet. KEINE neuen Fakten, KEINE eigene Bewertung — nur Anordnung
 * bereits vorhandener, deterministisch abgeleiteter Backend-Daten.
 *
 * Bewusst NICHT in ResultSummary.tsx: dort liegt der mit VerkaufsCheck GETEILTE
 * Code (marktanalyseOf, VerkaufMarketMetrics, NextSteps, CollapsibleReport,
 * ResearchFailedCard, DeepeningStatus) — dieser Block ist reines KaufCheck.
 */

// ── Preis-Label (aus KaufCheckView hierher verschoben — jetzt vom Marktpreis-
// Modul UND vom Decision-Header gemeinsam gebraucht) ────────────────────────

export const PREIS_LABEL: Record<string, string> = {
  extrem_guenstig: 'Extrem günstig',
  guenstig: 'Günstig',
  marktgerecht: 'Marktgerecht',
  teuer: 'Teuer',
  extrem_teuer: 'Extrem teuer',
  unbekannt: 'Unbekannt',
}

// Falls das Backend einen von PREIS_LABEL nicht erfassten Wert liefert, nie den
// rohen Snake-Case-Schlüssel anzeigen, sondern eine lesbare Notlösung.
export function formatUnbekannterPreiswert(wert: string): string {
  const lesbar = wert.replace(/_/g, ' ')
  return lesbar.charAt(0).toUpperCase() + lesbar.slice(1)
}

// ── Fahrzeug-Titelzeile für den Decision-Header ──────────────────────────────
// §3/§12: Marke/Modell, erkannte Baureihe/Generation, erkannter Motor — soweit
// vorhanden. Bevorzugt die per Webrecherche BELEGTE Identität (web_identitaet),
// wenn der DB-Pfad keine hat (DB-Miss + bestätigtes reales Fahrzeug, §12) —
// niemals eine erfundene DB-ID, nie der interne Begriff "WebVehicleIdentity".
// `motor_erkannt` selbst ist eine DB-Slug-ID ("bmw-3er-g20-320d") und deshalb
// NICHT direkt anzeigbar — als Ersatz die vom Nutzer eingegebene Motor-
// Bezeichnung zeigen, aber NUR wenn das Backend eine Motorvariante erkannt hat.
export function fahrzeugTitel(
  result: KaufCheckResult,
  form: { marke: string; modell: string; baujahr: number; motor: string },
): string {
  const teile: string[] = []
  const webId = result.web_identitaet

  if (webId?.belegt && (webId.marke || webId.modell)) {
    const kern = [webId.marke, webId.modell].filter(Boolean).join(' ')
    if (kern) teile.push(kern)
    if (webId.generation) teile.push(webId.generation)
  } else {
    const kern = [form.marke, form.modell].filter(Boolean).join(' ')
    if (kern) teile.push(kern)
    if (result.fahrzeugkontext?.generation) teile.push(result.fahrzeugkontext.generation)
  }
  if (form.baujahr) teile.push(String(form.baujahr))

  const motorLabel = webId?.belegt && webId.motor ? webId.motor : (result.motor_erkannt && form.motor ? form.motor : null)
  if (motorLabel) teile.push(motorLabel)

  return teile.filter(Boolean).join(' · ')
}

// ── Datenbasis-Zeile (§3, §9) — dezent, keine Rohwerte ───────────────────────

const DATENBASIS_TEXT: Record<string, string> = {
  db: 'Datenbasis: VIRA-Datenbank',
  db_plus_web: 'Datenbasis: Datenbank + Webrecherche',
  web: 'Datenbasis: aktuelle Webrecherche',
  partial: 'Datenbasis eingeschränkt',
}

export function DatenbasisZeile({ technicalCoverage }: { technicalCoverage?: string }) {
  if (!technicalCoverage) return null
  const text = DATENBASIS_TEXT[technicalCoverage]
  if (!text) return null
  return <p className="text-xs text-gray-400 mt-1.5">{text}</p>
}

// ── Marktpreis — eigenes Modul (§10) ──────────────────────────────────────────
// MIT belastbaren Marktdaten: bestehende MarketMetrics wiederverwenden.
// OHNE (completed_no_market): neutrale Karte, kein Error-Look, keine rote
// Warnung, kein "Preis: Unbekannt"-Badge. Legacy "research_failed" wird NICHT
// hier behandelt — das bleibt der bestehende, eigenständige ResearchFailedCard-
// Zweig auf oberster Ebene (KaufCheckView), unverändert.

export function NoMarketCard() {
  return (
    <div className="bg-[#faf8f5] border border-[#e6e1da] rounded-xl p-4">
      <p className="text-sm text-gray-700 leading-relaxed">
        Für dieses Fahrzeug liegt aktuell keine belastbare Marktpreisbewertung vor.
      </p>
      <p className="mt-1 text-xs text-gray-500 leading-relaxed">
        Der technische KaufCheck und die Prüflisten sind davon unabhängig vollständig.
      </p>
    </div>
  )
}

export function MarktpreisModul({
  result,
  marktanalyse,
}: {
  result: KaufCheckResult
  marktanalyse?: Marktanalyse
}) {
  const noMarket = result.research_status === 'completed_no_market'
  const hatMarktdaten =
    result.marktpreis_min != null || result.marktpreis_max != null || marktanalyse?.median_eur != null
  // Sehr alter Check: weder Marktdaten noch ein bekannter Status -> lieber gar
  // nichts rendern als ein leeres/irreführendes Modul.
  if (!noMarket && !hatMarktdaten) return null

  const preisKey = result.preis_bewertung?.toLowerCase()
  const preisLabel =
    result.price_assessment && result.price_assessment.verdict !== 'unbekannt'
      ? result.price_assessment.label
      : preisKey && preisKey !== 'unbekannt'
        ? (PREIS_LABEL[preisKey] ?? formatUnbekannterPreiswert(preisKey))
        : null

  return (
    <div className="bg-white border border-[#e6e1da] rounded-2xl p-5 sm:p-6 shadow-[0_16px_36px_-24px_rgba(40,25,10,0.28)]">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <p className="text-[11px] font-bold tracking-[0.22em] uppercase text-[#a49c92]">Marktpreis</p>
        {!noMarket && preisLabel && (
          <span className="px-2 py-1 rounded-lg text-xs font-semibold bg-[#faf8f5] text-gray-700 border border-[#eee7dd]">
            {preisLabel}
          </span>
        )}
      </div>
      {noMarket ? (
        <div className="mt-3">
          <NoMarketCard />
        </div>
      ) : (
        <MarketMetrics
          marktpreisMin={result.marktpreis_min}
          marktpreisMax={result.marktpreis_max}
          marktanalyse={marktanalyse}
        />
      )}
    </div>
  )
}

// ── Laufleistung & Wartung (§5, P2-5) ─────────────────────────────────────────
// km/Jahr wird NIE qualitativ bewertet (kein "niedrig/hoch/gut/schlecht") — nur
// die Zahl. Wartungshinweise zeigen ausschließlich den bereits P2-5-konformen
// Backend-Wortlaut (`hinweis`) — die Komponente fügt selbst KEINE Bewertung,
// KEIN "fällig"/"überfällig" hinzu.

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400">{label}</p>
      <p className="text-sm font-semibold mt-0.5 text-gray-900 break-words">{value}</p>
    </div>
  )
}

const WARTUNG_STATUS_LABEL: Record<string, { text: string; cls: string }> = {
  naehert_sich: { text: 'Nähert sich', cls: 'bg-gray-100 text-gray-600' },
  im_bereich: { text: 'Im Bereich', cls: 'bg-amber-100 text-amber-700' },
  // "darueber" heißt NICHT "überfällig" — nur, dass ein Nachweis sinnvoll ist.
  darueber: { text: 'Nachweis prüfen', cls: 'bg-amber-100 text-amber-700' },
}

export function LaufleistungKarte({ kontext }: { kontext?: Laufleistungskontext | null }) {
  if (!kontext) return null
  const hatZahlen = kontext.kilometerstand != null || kontext.fahrzeugalter_jahre != null || kontext.km_pro_jahr != null
  const hinweise = kontext.wartungshinweise ?? []
  if (!hatZahlen && hinweise.length === 0) return null

  return (
    <div className="bg-white border border-[#e6e1da] rounded-2xl p-5 sm:p-6 shadow-[0_16px_36px_-24px_rgba(40,25,10,0.28)]">
      <p className="text-[11px] font-bold tracking-[0.22em] uppercase text-[#a49c92] mb-3">Laufleistung &amp; Wartung</p>

      {hatZahlen && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {kontext.kilometerstand != null && (
            <MiniMetric label="Kilometerstand" value={`${kontext.kilometerstand.toLocaleString('de-DE')} km`} />
          )}
          {kontext.fahrzeugalter_jahre != null && (
            <MiniMetric label="Fahrzeugalter" value={`ca. ${kontext.fahrzeugalter_jahre} Jahre`} />
          )}
          {kontext.km_pro_jahr != null && (
            <MiniMetric label="Ø km/Jahr" value={`${kontext.km_pro_jahr.toLocaleString('de-DE')} km`} />
          )}
        </div>
      )}

      {hinweise.length > 0 && (
        <div className={hatZahlen ? 'mt-4 pt-4 border-t border-black/5 space-y-2.5' : 'space-y-2.5'}>
          {hinweise.map((w, i) => {
            const status = WARTUNG_STATUS_LABEL[w.status] ?? null
            return (
              <div key={`${w.evidence_id}-${i}`} className="rounded-lg bg-[#faf8f5] border border-[#eee7dd] p-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm font-medium text-gray-800">{w.bauteil}</span>
                  {status && (
                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${status.cls}`}>{status.text}</span>
                  )}
                </div>
                <p className="mt-1 text-xs text-gray-600 leading-relaxed">{w.hinweis}</p>
                <p className="mt-0.5 text-[11px] text-gray-400">Hinterlegtes Intervall: {w.intervall_text}</p>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Fahrzeugprofil / Zum Fahrzeug (§11, §12) ─────────────────────────────────
// Informativ, keine Bewertung. Bevorzugt fahrzeugkontext (DB); fällt bei
// DB-Miss + bestätigter Web-Identität auf web_identitaet zurück — dem Nutzer
// als ganz normale Fahrzeugdarstellung, ohne den internen Begriff.

export function FahrzeugprofilKarte({
  fahrzeugkontext,
  webIdentitaet,
}: {
  fahrzeugkontext?: Fahrzeugkontext | null
  webIdentitaet?: WebVehicleIdentity | null
}) {
  const felder: { label: string; value: string }[] = []

  if (fahrzeugkontext?.generation) felder.push({ label: 'Generation', value: fahrzeugkontext.generation })
  if (fahrzeugkontext?.segment) felder.push({ label: 'Segment', value: fahrzeugkontext.segment })
  if (fahrzeugkontext?.erkennung_generation) {
    felder.push({ label: 'Erkennungsmerkmale', value: fahrzeugkontext.erkennung_generation })
  }
  if (fahrzeugkontext?.facelift_merkmale) felder.push({ label: 'Facelift', value: fahrzeugkontext.facelift_merkmale })
  if (fahrzeugkontext?.vorgaenger) felder.push({ label: 'Vorgängermodell', value: fahrzeugkontext.vorgaenger })
  if (fahrzeugkontext?.wartung_oel_km) {
    felder.push({ label: 'Ölwechsel-Intervall (Hersteller)', value: `${fahrzeugkontext.wartung_oel_km.toLocaleString('de-DE')} km` })
  }
  if (fahrzeugkontext?.wartung_hu_intervall) {
    felder.push({ label: 'HU-Intervall', value: fahrzeugkontext.wartung_hu_intervall })
  }

  // DB-Miss, aber Web-Identität bestätigt (§12): reales Fahrzeug normal zeigen.
  if (felder.length === 0 && webIdentitaet?.belegt) {
    const titel = [webIdentitaet.marke, webIdentitaet.modell].filter(Boolean).join(' ')
    if (titel) felder.push({ label: 'Fahrzeug', value: titel })
    if (webIdentitaet.generation) felder.push({ label: 'Generation', value: webIdentitaet.generation })
    if (webIdentitaet.bauzeitraum_von) {
      const bis = webIdentitaet.bauzeitraum_bis ? `–${webIdentitaet.bauzeitraum_bis}` : ' – heute'
      felder.push({ label: 'Bauzeitraum', value: `${webIdentitaet.bauzeitraum_von}${bis}` })
    }
    if (webIdentitaet.motor) felder.push({ label: 'Motor', value: webIdentitaet.motor })
  }

  if (felder.length === 0) return null

  return (
    <div className="bg-white border border-[#e6e1da] rounded-2xl p-5 sm:p-6 shadow-[0_16px_36px_-24px_rgba(40,25,10,0.28)]">
      <p className="text-[11px] font-bold tracking-[0.22em] uppercase text-[#a49c92] mb-3">Zum Fahrzeug</p>
      <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
        {felder.map((f) => (
          <div key={f.label} className="min-w-0">
            <dt className="text-[10px] font-medium uppercase tracking-wide text-gray-400">{f.label}</dt>
            <dd className="text-sm text-gray-800 mt-0.5 leading-relaxed">{f.value}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}

// ── Vier Prüflisten — Kernfeature (§6, §7, §8) ───────────────────────────────

// §7 Checkbox-State: KEINE Backend-Änderung. Solange keine stabile Check-ID
// vorliegt (frischer, noch nicht gespeicherter Check), lebt der Zustand rein in
// React-State — bleibt während der aktuellen Nutzung erhalten, geht aber beim
// Verlassen der Seite verloren (bewusst dokumentiert, siehe Abschlussbericht).
// Sobald eine ID eintrifft (Speichern abgeschlossen ODER gespeicherten Check
// geladen), wird ab da in localStorage persistiert — key pro Check, damit
// verschiedene Checks sich nicht überschreiben. Bereits während der Session
// angehakte Punkte gehen beim späten Eintreffen der ID NICHT verloren: sie
// werden unter der neuen ID nachträglich gespeichert statt überschrieben.
function useChecklistState(checkId: number | undefined) {
  const storageKey = checkId != null ? `vira_kaufcheck_checklist_${checkId}` : null

  const [checked, setChecked] = useState<Set<string>>(() => {
    if (!storageKey) return new Set()
    try {
      const raw = localStorage.getItem(storageKey)
      return raw ? new Set(JSON.parse(raw) as string[]) : new Set()
    } catch {
      return new Set()
    }
  })

  useEffect(() => {
    if (!storageKey) return
    try {
      const raw = localStorage.getItem(storageKey)
      if (raw) {
        setChecked(new Set(JSON.parse(raw) as string[]))
      } else {
        // Frischer Check: die ID kam erst nachträglich an. Bereits in dieser
        // Session angehakte Punkte nicht verwerfen, sondern jetzt persistieren.
        setChecked((prev) => {
          if (prev.size > 0) {
            try { localStorage.setItem(storageKey, JSON.stringify([...prev])) } catch { /* Speicher voll o.ä. — Session-State bleibt gültig */ }
          }
          return prev
        })
      }
    } catch { /* localStorage nicht verfügbar — Session-State bleibt gültig */ }
    // Nur bei ID-Wechsel neu einlesen, nicht bei jedem Render.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [storageKey])

  function toggle(bereich: string, aktionId: string) {
    const key = `${bereich}:${aktionId}`
    setChecked((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      if (storageKey) {
        try { localStorage.setItem(storageKey, JSON.stringify([...next])) } catch { /* ignore */ }
      }
      return next
    })
  }

  return { checked, toggle }
}

function PrioritaetBadge({ prioritaet }: { prioritaet: string }) {
  const p = prioritaet.toLowerCase()
  if (p === 'kritisch') return <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-red-100 text-red-700">Kritisch</span>
  if (p === 'hoch') return <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-700">Wichtig</span>
  if (p === 'mittel') return <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-gray-100 text-gray-600">Beachten</span>
  return null // "basis" — bewusst kein Badge, siehe Gruppen-Label darüber (§6: Basisliste nicht abwerten)
}

function PruefpunktItem({
  aktion,
  insights,
  checked,
  onToggle,
}: {
  aktion: Kaufaktion
  insights: Insight[] | undefined
  checked: boolean
  onToggle: () => void
}) {
  const evidenceInsights = insightsByIds(insights, aktion.evidence_ids)
  return (
    <li className="flex items-start gap-3 py-2.5">
      <input
        type="checkbox"
        checked={checked}
        onChange={onToggle}
        className="mt-0.5 shrink-0 w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-2 focus:ring-blue-200 cursor-pointer"
        aria-label={aktion.titel}
      />
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <span className={`text-sm font-medium ${checked ? 'text-gray-400 line-through' : 'text-gray-800'}`}>
            {aktion.titel}
          </span>
          <PrioritaetBadge prioritaet={aktion.prioritaet} />
        </div>
        <p className={`mt-0.5 text-xs leading-relaxed ${checked ? 'text-gray-300' : 'text-gray-600'}`}>
          {aktion.aktion}
        </p>
        {aktion.hinweis && (
          <p className="mt-1.5 inline-block text-[11px] text-amber-700 bg-amber-50/70 rounded px-2 py-1">
            {aktion.hinweis}
          </p>
        )}
        {aktion.kostenhinweis && (
          <p className="mt-1 text-[11px] text-gray-500">Kostenhinweis: {aktion.kostenhinweis}</p>
        )}
        {evidenceInsights.length > 0 && (
          <div className="mt-1.5">
            <EvidenceWhy label="Warum?" insights={evidenceInsights} />
          </div>
        )}
      </div>
    </li>
  )
}

const BEREICH_ICON: Record<string, React.ReactNode> = {
  besichtigung: <Search size={16} className="text-blue-600" />,
  probefahrt: <Car size={16} className="text-blue-600" />,
  verkaeuferfragen: <MessageCircle size={16} className="text-blue-600" />,
  dokumente: <FileText size={16} className="text-blue-600" />,
}

function PrueflisteCard({
  liste,
  insights,
  checked,
  onToggle,
}: {
  liste: Pruefliste
  insights: Insight[] | undefined
  checked: Set<string>
  onToggle: (bereich: string, aktionId: string) => void
}) {
  const spezifisch = liste.fahrzeugspezifisch ?? []
  const basis = liste.basis ?? []
  if (spezifisch.length === 0 && basis.length === 0) return null

  return (
    <div className="bg-white border border-[#e6e1da] rounded-2xl p-5 shadow-[0_16px_36px_-24px_rgba(40,25,10,0.28)]">
      <div className="flex items-center gap-2 mb-3">
        {BEREICH_ICON[liste.bereich] ?? null}
        <p className="text-sm font-semibold text-gray-800">{liste.export_title}</p>
      </div>

      {spezifisch.length > 0 && (
        <div className={basis.length > 0 ? 'mb-4' : ''}>
          <p className="text-[10px] font-semibold uppercase tracking-wide text-blue-600 mb-0.5">
            Bei diesem Fahrzeug wichtig
          </p>
          <ul className="divide-y divide-gray-100">
            {spezifisch.map((a) => (
              <PruefpunktItem
                key={a.id}
                aktion={a}
                insights={insights}
                checked={checked.has(`${liste.bereich}:${a.id}`)}
                onToggle={() => onToggle(liste.bereich, a.id)}
              />
            ))}
          </ul>
        </div>
      )}

      {basis.length > 0 && (
        <div>
          {spezifisch.length > 0 && (
            <p className="text-[10px] font-semibold uppercase tracking-wide text-gray-400 mb-0.5">
              Allgemeine Prüfung
            </p>
          )}
          <ul className="divide-y divide-gray-100">
            {basis.map((a) => (
              <PruefpunktItem
                key={a.id}
                aktion={a}
                insights={insights}
                checked={checked.has(`${liste.bereich}:${a.id}`)}
                onToggle={() => onToggle(liste.bereich, a.id)}
              />
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}

export function PruefplanBereich({
  kaufaktionen,
  insights,
  checkId,
}: {
  kaufaktionen?: Kaufaktionen
  insights: Insight[] | undefined
  checkId?: number
}) {
  const { checked, toggle } = useChecklistState(checkId)
  if (!kaufaktionen) return null

  const listen = [
    kaufaktionen.besichtigung,
    kaufaktionen.probefahrt,
    kaufaktionen.verkaeuferfragen,
    kaufaktionen.dokumente,
  ].filter((l) => l && ((l.fahrzeugspezifisch?.length ?? 0) > 0 || (l.basis?.length ?? 0) > 0))

  if (listen.length === 0) return null

  return (
    <div className="space-y-2.5">
      <p className="text-[11px] font-bold tracking-[0.22em] uppercase text-[#a49c92]">Vor dem Kauf prüfen</p>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {listen.map((l) => (
          <PrueflisteCard key={l.bereich} liste={l} insights={insights} checked={checked} onToggle={toggle} />
        ))}
      </div>
    </div>
  )
}

// ── Loading-Sequenz (§16) — KaufCheck-spezifisch, NICHT der geteilte
// DeepeningStatus aus ResultSummary.tsx (der bleibt für VerkaufsCheck
// unverändert, wo Marktpreis tatsächlich das Kernprodukt ist). ─────────────

const KAUF_LOADING_MESSAGES = [
  'Fahrzeug wird identifiziert …',
  'Motorisierung und technische Daten werden geprüft …',
  'Bekannte Schwachstellen werden ausgewertet …',
  'Rückrufe und Wartungshinweise werden geprüft …',
  'Besichtigungs- und Probefahrtplan wird erstellt …',
  'Marktinformationen werden geprüft, falls verfügbar …',
]

export function KaufLoadingStatus() {
  const [i, setI] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setI((n) => (n + 1) % KAUF_LOADING_MESSAGES.length), 2600)
    return () => clearInterval(t)
  }, [])
  return (
    <div className="mt-6 flex items-center gap-2.5 text-sm text-gray-500" aria-live="polite">
      <Gauge size={15} className="shrink-0 animate-pulse text-gray-400" />
      <span className="transition-opacity">{KAUF_LOADING_MESSAGES[i]}</span>
    </div>
  )
}
