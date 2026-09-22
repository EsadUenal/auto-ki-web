import { useState } from 'react'
import {
  Car, TrendingUp, Target, Clock, ArrowUpRight, ArrowDownRight, Wrench, FileText,
  Camera, Megaphone, Handshake, FolderCheck, ShieldCheck, ListChecks, Copy, Check,
  ChevronDown, AlertTriangle, Info,
} from 'lucide-react'
import type { Verkaufsplan } from '../types'

/**
 * RC1 — "Dein Verkaufsfahrplan".
 *
 * Zeigt den deterministischen Plan aus dem Backend (app/verkaufsplan.py). Das
 * Frontend rechnet nichts und formuliert nichts: jede Zahl und jeder Satz kommt
 * aus der Antwort. Fehlt ein Block, wird er weggelassen statt gefüllt.
 *
 * Aufbau: wichtige Information zuerst (Fahrzeug, Marktorientierung, Strategie,
 * nächste Schritte), der Rest in aufklappbaren Bereichen, damit der längere
 * Report keine Textwand wird.
 */

const cardCls =
  'bg-white border border-[#e6e1da] rounded-2xl shadow-[0_16px_36px_-24px_rgba(40,25,10,0.28)]'

const eur = (n?: number | null) =>
  typeof n === 'number' ? `${n.toLocaleString('de-DE')} €` : '–'

function CopyButton({ text, label }: { text: string; label: string }) {
  const [copied, setCopied] = useState(false)
  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      /* Zwischenablage nicht verfügbar */
    }
  }
  return (
    <button
      type="button"
      onClick={copy}
      className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#e6e1da] bg-white text-xs font-medium text-gray-600 hover:text-gray-900 hover:border-gray-300 transition-colors shrink-0"
    >
      {copied ? <Check size={13} className="text-green-600" /> : <Copy size={13} />}
      {copied ? 'Kopiert' : label}
    </button>
  )
}

function Section({
  icon, titel, untertitel, offenStandard = false, children,
}: {
  icon: React.ReactNode
  titel: string
  untertitel?: string
  offenStandard?: boolean
  children: React.ReactNode
}) {
  const [offen, setOffen] = useState(offenStandard)
  return (
    <div className={cardCls}>
      <button
        type="button"
        onClick={() => setOffen((v) => !v)}
        aria-expanded={offen}
        className="w-full flex items-center gap-3 p-5 text-left"
      >
        <span className="shrink-0 w-8 h-8 rounded-lg bg-[#faf7f3] border border-[#e6e1da] flex items-center justify-center text-gray-500">
          {icon}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold text-gray-900">{titel}</span>
          {untertitel && <span className="block text-xs text-gray-500 mt-0.5">{untertitel}</span>}
        </span>
        <ChevronDown size={16} className={`shrink-0 text-gray-400 transition-transform ${offen ? 'rotate-180' : ''}`} />
      </button>
      {offen && <div className="px-5 pb-5 -mt-1">{children}</div>}
    </div>
  )
}

const GEWICHT: Record<string, { label: string; cls: string }> = {
  hoch:   { label: 'Hoch',   cls: 'bg-red-100 text-red-700' },
  mittel: { label: 'Mittel', cls: 'bg-amber-100 text-amber-700' },
  gering: { label: 'Gering', cls: 'bg-gray-100 text-gray-600' },
}

const KATEGORIE: Record<string, { label: string; cls: string }> = {
  lohnt:       { label: 'Lohnt sich',           cls: 'bg-emerald-100 text-emerald-700' },
  optional:    { label: 'Optional',             cls: 'bg-amber-100 text-amber-700' },
  lohnt_nicht: { label: 'Lohnt sich eher nicht', cls: 'bg-gray-100 text-gray-600' },
}

const LABEL: Record<string, string> = {
  sehr_gut: 'Sehr gut', gut: 'Gut', verbesserbar: 'Verbesserbar', unvollstaendig: 'Unvollständig',
}

export default function VerkaufsPlan({ plan }: { plan: Verkaufsplan }) {
  const { fahrzeug, markt, strategie, inserat } = plan
  const o = markt?.orientierung
  const vergleich = o?.status === 'ok' ? o.vergleich : null
  const plus = (vergleich?.differenz_eur ?? 0) >= 0

  const inseratKomplett = [
    inserat.titel[0]?.text,
    '',
    inserat.beschreibung.replace(/\*\*(.*?)\*\*/g, '$1').replace(/^- /gm, '• '),
  ].join('\n')

  return (
    <div className="space-y-4">
      {/* A — Fahrzeug */}
      <div className={`${cardCls} p-5 sm:p-6`}>
        <div className="flex items-center gap-2 mb-3">
          <Car size={14} className="text-gray-400" />
          <p className="text-[11px] font-bold tracking-[0.12em] uppercase text-[#a49c92]">Fahrzeug</p>
        </div>
        <h3 className="text-lg font-bold text-gray-900 tracking-[-0.01em]">{fahrzeug.titel}</h3>
        <dl className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5">
          {fahrzeug.zeilen.map((z, i) => (
            <div key={i} className="flex items-baseline justify-between gap-3 border-b border-[#f0ece6] py-1">
              <dt className="text-xs text-gray-500">{z.label}</dt>
              <dd className="text-sm text-gray-900 text-right">{z.wert}</dd>
            </div>
          ))}
        </dl>
        {fahrzeug.hinweise.map((h, i) => (
          <p key={i} className="mt-3 flex items-start gap-1.5 text-xs text-gray-600">
            <Info size={13} className="mt-0.5 shrink-0 text-gray-400" />
            <span>{h}</span>
          </p>
        ))}
      </div>

      {/* B — Marktorientierung */}
      <div className={`${cardCls} p-5 sm:p-6`}>
        <div className="flex items-center gap-2 mb-3">
          <TrendingUp size={14} className="text-gray-400" />
          <p className="text-[11px] font-bold tracking-[0.12em] uppercase text-[#a49c92]">Marktorientierung</p>
        </div>
        {o?.status === 'ok' ? (
          <>
            <p className="text-2xl font-bold text-gray-900">ca. {eur(o.wert_eur)}</p>
            {vergleich && (
              <div className="mt-3 rounded-xl border border-[#e6e1da] bg-[#faf7f3] p-3">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <span className="text-xs text-gray-500">Deine Preisvorstellung</span>
                  <span className="text-sm font-semibold text-gray-900">
                    {eur(vergleich.preisvorstellung_eur)}
                  </span>
                </div>
                <div className="mt-1 flex items-center gap-1.5 text-sm">
                  {plus ? <ArrowUpRight size={14} className="text-amber-600" />
                        : <ArrowDownRight size={14} className="text-emerald-600" />}
                  <span className={plus ? 'text-amber-700' : 'text-emerald-700'}>{vergleich.anzeige}</span>
                </div>
                <p className="mt-2 text-sm text-gray-700 leading-relaxed">{vergleich.einordnung}</p>
              </div>
            )}
            <p className="mt-3 text-xs text-gray-500 leading-relaxed">{o.spezifitaet}</p>
            <p className="mt-1 text-xs text-gray-500 leading-relaxed">{o.hinweis}</p>
            {o.quelle && <p className="mt-2 text-[11px] text-gray-400">Quelle: {o.quelle}</p>}
          </>
        ) : (
          <>
            <p className="text-sm text-gray-700 leading-relaxed">{o?.text}</p>
            {o?.grund && <p className="mt-1 text-xs text-gray-500">{o.grund}</p>}
            <p className="mt-2 text-xs text-gray-500 leading-relaxed">
              Der übrige Verkaufsfahrplan ist davon unabhängig vollständig.
            </p>
          </>
        )}
      </div>

      {/* C — Strategie + D — Marktdauer */}
      <div className={`${cardCls} p-5 sm:p-6`}>
        <div className="flex items-center gap-2 mb-3">
          <Target size={14} className="text-gray-400" />
          <p className="text-[11px] font-bold tracking-[0.12em] uppercase text-[#a49c92]">
            Verkaufsstrategie: {strategie.label}
          </p>
        </div>
        {!strategie.angegeben && (
          <p className="mb-2 text-xs text-gray-500">
            Kein Ziel angegeben, deshalb der ausgewogene Weg. Du kannst das Ziel im Formular wählen.
          </p>
        )}
        {markt?.strategie_hinweis && (
          <p className="mb-3 text-sm text-gray-800 leading-relaxed">{markt.strategie_hinweis}</p>
        )}
        <ul className="space-y-1.5">
          {strategie.schritte.map((s, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-gray-700">
              <span className="mt-2 w-1 h-1 rounded-full bg-gray-400 shrink-0" />
              <span className="leading-relaxed">{s}</span>
            </li>
          ))}
        </ul>
        {markt?.dauer && (
          <div className="mt-4 rounded-xl border border-[#e6e1da] bg-[#faf7f3] p-3">
            <div className="flex items-center gap-1.5 mb-2">
              <Clock size={13} className="text-gray-400" />
              <span className="text-xs font-semibold text-gray-700">Marktdauer vergleichbarer Angebote</span>
              {markt.dauer.aufloesung === 'grob' && (
                <span className="px-2 py-0.5 rounded-full text-[11px] bg-amber-100 text-amber-700">
                  grobe Datenbasis
                </span>
              )}
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                { label: 'schnelles Viertel', wert: markt.dauer.p25_tage },
                { label: 'Mitte', wert: markt.dauer.median_tage },
                { label: 'langsames Viertel ab', wert: markt.dauer.p75_tage },
              ].map((x) => (
                <div key={x.label} className="rounded-lg bg-white border border-[#e6e1da] py-2">
                  <p className="text-base font-bold text-gray-900">{x.wert} Tage</p>
                  <p className="text-[11px] text-gray-500 leading-tight">{x.label}</p>
                </div>
              ))}
            </div>
            <p className="mt-2 text-xs text-gray-600 leading-relaxed">{markt.dauer.text}</p>
            <p className="mt-1 text-[11px] text-gray-500 leading-relaxed">{markt.dauer.hinweis}</p>
          </div>
        )}
      </div>

      {/* N — Was jetzt? */}
      {plan.naechste_schritte.length > 0 && (
        <div className={`${cardCls} p-5 sm:p-6`}>
          <div className="flex items-center gap-2 mb-3">
            <ListChecks size={14} className="text-gray-400" />
            <p className="text-[11px] font-bold tracking-[0.12em] uppercase text-[#a49c92]">Was jetzt?</p>
          </div>
          <div className="space-y-2">
            {plan.naechste_schritte.map((s, i) => (
              <div key={i} className="flex items-start gap-2.5 text-sm text-gray-700">
                <span className="shrink-0 mt-0.5 w-5 h-5 rounded-full bg-green-50 border border-green-200 text-green-700 text-xs font-semibold flex items-center justify-center">
                  {i + 1}
                </span>
                <span className="leading-relaxed">{s}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* E/F — Werttreiber und Wertminderer */}
      {(plan.werttreiber.length > 0 || plan.wertminderer.length > 0) && (
        <Section
          icon={<TrendingUp size={15} />}
          titel="Werttreiber und Wertminderer"
          untertitel={`${plan.werttreiber.length} Stärken, ${plan.wertminderer.length} Punkte, die drücken`}
        >
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="space-y-2">
              {plan.werttreiber.map((w, i) => (
                <div key={i} className="rounded-xl border border-emerald-200 bg-emerald-50/40 p-3">
                  <p className="text-sm font-semibold text-emerald-900">{w.titel}</p>
                  <p className="mt-0.5 text-xs text-gray-700 leading-relaxed">{w.text}</p>
                </div>
              ))}
            </div>
            <div className="space-y-2">
              {plan.wertminderer.map((w, i) => (
                <div key={i} className="rounded-xl border border-[#e6e1da] bg-[#faf7f3] p-3">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-semibold text-gray-900">{w.titel}</p>
                    <span className={`shrink-0 px-2 py-0.5 rounded-full text-[11px] font-medium ${GEWICHT[w.gewicht]?.cls ?? ''}`}>
                      {GEWICHT[w.gewicht]?.label ?? w.gewicht}
                    </span>
                  </div>
                  <p className="mt-0.5 text-xs text-gray-700 leading-relaxed">{w.text}</p>
                </div>
              ))}
            </div>
          </div>
        </Section>
      )}

      {/* G — Vorbereitung */}
      <Section
        icon={<Wrench size={15} />}
        titel="Vor dem Verkauf: lohnt sich das?"
        untertitel="Aufwand gegen Wirkung, ohne erfundene Preise"
      >
        <div className="space-y-2">
          {plan.vorbereitung.map((v, i) => (
            <div key={i} className="rounded-xl border border-[#e6e1da] p-3">
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm font-medium text-gray-900">{v.massnahme}</p>
                <span className={`shrink-0 px-2 py-0.5 rounded-full text-[11px] font-medium ${KATEGORIE[v.kategorie]?.cls ?? ''}`}>
                  {KATEGORIE[v.kategorie]?.label ?? v.kategorie}
                </span>
              </div>
              <p className="mt-0.5 text-xs text-gray-600 leading-relaxed">{v.begruendung}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* H — Inseratspaket */}
      <Section
        icon={<FileText size={15} />}
        titel="Inseratspaket"
        untertitel="Drei Titel, Kurztext, vollständige Beschreibung"
        offenStandard
      >
        <div className="space-y-3">
          {plan.inserat.titel.map((t, i) => (
            <div key={i} className="rounded-xl border border-[#e6e1da] p-3">
              <p className="text-[11px] uppercase tracking-wide text-gray-400 mb-1">
                {t.art === 'sachlich' ? 'Sachlich' : t.art === 'verkaufsstark' ? 'Verkaufsstark' : 'Kompakt'}
              </p>
              <div className="flex items-start justify-between gap-2">
                <p className="text-sm text-gray-900 break-words">{t.text}</p>
                <CopyButton text={t.text} label="Titel" />
              </div>
            </div>
          ))}
          <div className="rounded-xl border border-[#e6e1da] p-3">
            <div className="flex items-start justify-between gap-2">
              <p className="text-[11px] uppercase tracking-wide text-gray-400 mb-1">Kurzbeschreibung</p>
              <CopyButton text={plan.inserat.kurzbeschreibung} label="Kopieren" />
            </div>
            <p className="text-sm text-gray-700 leading-relaxed">{plan.inserat.kurzbeschreibung}</p>
          </div>
          <div className="rounded-xl border border-[#e6e1da] p-3">
            <div className="flex items-start justify-between gap-2 mb-1">
              <p className="text-[11px] uppercase tracking-wide text-gray-400">Vollständige Beschreibung</p>
              <CopyButton text={inseratKomplett} label="Inserat kopieren" />
            </div>
            <pre className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap font-sans">
              {plan.inserat.beschreibung.replace(/\*\*(.*?)\*\*/g, '$1').replace(/^- /gm, '• ')}
            </pre>
          </div>
          {plan.inserat.faktenblock.length > 0 && (
            <div className="rounded-xl border border-[#e6e1da] p-3">
              <div className="flex items-start justify-between gap-2 mb-1">
                <p className="text-[11px] uppercase tracking-wide text-gray-400">Faktenblock</p>
                <CopyButton text={plan.inserat.faktenblock.join('\n')} label="Kopieren" />
              </div>
              <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-6">
                {plan.inserat.faktenblock.map((f, i) => (
                  <li key={i} className="text-sm text-gray-700 py-0.5">{f}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </Section>

      {/* Inseratsqualität */}
      <Section
        icon={<ListChecks size={15} />}
        titel="Inseratsqualität"
        untertitel={
          plan.inseratsqualitaet.vollstaendigkeit.gesamt
            ? `Vollständigkeit ${plan.inseratsqualitaet.vollstaendigkeit.vorhanden}/${plan.inseratsqualitaet.vollstaendigkeit.gesamt}`
            : undefined
        }
      >
        <div className="space-y-3">
          {plan.inseratsqualitaet.textqualitaet && (
            <KriterienBlock
              titel="Textqualität"
              label={LABEL[plan.inseratsqualitaet.textqualitaet.label] ?? plan.inseratsqualitaet.textqualitaet.label}
              kriterien={plan.inseratsqualitaet.textqualitaet.kriterien}
            />
          )}
          <KriterienBlock
            titel="Transparenz"
            label={LABEL[plan.inseratsqualitaet.transparenz.label] ?? plan.inseratsqualitaet.transparenz.label}
            kriterien={plan.inseratsqualitaet.transparenz.kriterien}
          />
        </div>
      </Section>

      {/* I — Foto-Plan */}
      <Section
        icon={<Camera size={15} />}
        titel="Foto-Plan"
        untertitel={`${plan.fotoplan.fotos.length} Motive in sinnvoller Reihenfolge`}
      >
        <ol className="space-y-1.5">
          {plan.fotoplan.fotos.map((f) => (
            <li key={f.nr} className="flex items-start gap-2.5">
              <span className="shrink-0 mt-0.5 w-5 h-5 rounded-full bg-gray-100 text-gray-500 text-[11px] font-semibold flex items-center justify-center">
                {f.nr}
              </span>
              <span className="text-sm text-gray-800">
                {f.motiv}
                <span className="block text-xs text-gray-500 leading-relaxed">{f.tipp}</span>
              </span>
            </li>
          ))}
        </ol>
        <div className="mt-3 rounded-xl border border-[#e6e1da] bg-[#faf7f3] p-3 space-y-1">
          {plan.fotoplan.hinweise.map((h, i) => (
            <p key={i} className="text-xs text-gray-600 leading-relaxed">{h}</p>
          ))}
        </div>
      </Section>

      {/* J — Plattformen */}
      <Section icon={<Megaphone size={15} />} titel="Wo inserieren?" untertitel="Kanäle und was sie leisten">
        <div className="space-y-2">
          {plan.plattformen.kanaele.map((k, i) => (
            <div key={i} className="rounded-xl border border-[#e6e1da] p-3">
              <p className="text-sm font-medium text-gray-900">{k.kanal}</p>
              <p className="mt-0.5 text-xs text-gray-600 leading-relaxed">{k.text}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-gray-500 leading-relaxed">{plan.plattformen.hinweis}</p>
      </Section>

      {/* K — Verhandlung */}
      <Section icon={<Handshake size={15} />} titel="Verhandlungsplan" untertitel="Preisrahmen und Antworten auf typische Einwände">
        <div className="rounded-xl border border-[#e6e1da] bg-[#faf7f3] p-3">
          <div className="grid grid-cols-3 gap-2 text-center">
            {[
              { label: 'Preisvorstellung', wert: plan.verhandlung.preise.preisvorstellung_eur },
              { label: 'Untergrenze', wert: plan.verhandlung.preise.untergrenze_eur },
              { label: 'Spielraum', wert: plan.verhandlung.preise.spielraum_eur },
            ].map((x) => (
              <div key={x.label} className="rounded-lg bg-white border border-[#e6e1da] py-2 px-1">
                <p className="text-sm font-bold text-gray-900 whitespace-nowrap">{eur(x.wert)}</p>
                <p className="text-[11px] text-gray-500 leading-tight">{x.label}</p>
              </div>
            ))}
          </div>
          {plan.verhandlung.preise.hinweise.map((h, i) => (
            <p key={i} className="mt-2 text-xs text-gray-600 leading-relaxed">{h}</p>
          ))}
        </div>
        <div className="mt-3 space-y-2">
          {plan.verhandlung.argumente.map((a, i) => (
            <div key={i} className="rounded-xl border border-[#e6e1da] p-3">
              <p className="text-sm font-medium text-gray-900">„{a.einwand}“</p>
              <p className="mt-0.5 text-xs text-gray-700 leading-relaxed">{a.antwort}</p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-gray-500 leading-relaxed">{plan.verhandlung.fairness}</p>
      </Section>

      {/* L/M — Dokumente und Übergabe */}
      <Section icon={<FolderCheck size={15} />} titel="Dokumente und Übergabe" untertitel="Checkliste für den Termin">
        <ul className="space-y-1">
          {plan.dokumente.map((d, i) => (
            <li key={i} className="flex items-center gap-2 text-sm text-gray-800">
              <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${d.pflicht ? 'bg-gray-700' : 'bg-gray-300'}`} />
              <span>{d.dokument}</span>
              {d.pflicht && <span className="text-[11px] text-gray-400">erforderlich</span>}
            </li>
          ))}
        </ul>
        <div className="mt-4 space-y-1.5">
          {plan.uebergabe.punkte.map((p, i) => (
            <p key={i} className="flex items-start gap-2 text-sm text-gray-700">
              <ShieldCheck size={14} className="mt-0.5 shrink-0 text-gray-400" />
              <span className="leading-relaxed">{p}</span>
            </p>
          ))}
        </div>
        <p className="mt-3 text-xs text-gray-600 leading-relaxed">{plan.uebergabe.abmeldung}</p>
        <p className="mt-1 text-[11px] text-gray-400">{plan.uebergabe.hinweis}</p>
      </Section>

      {/* 18/19 — Prüfhinweise */}
      {(plan.pruefhinweise.schwachstellen.length > 0 || plan.pruefhinweise.rueckrufe.length > 0) && (
        <Section
          icon={<AlertTriangle size={15} />}
          titel="Selbst prüfen, bevor der Käufer fragt"
          untertitel="Bekannte Punkte der Baureihe, keine Aussage über dein Fahrzeug"
        >
          <div className="space-y-2">
            {plan.pruefhinweise.schwachstellen.map((s, i) => (
              <div key={i} className="rounded-xl border border-[#e6e1da] p-3">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium text-gray-900">{s.titel}</p>
                  <span className="shrink-0 px-2 py-0.5 rounded-full text-[11px] bg-gray-100 text-gray-600">
                    Datenqualität {s.datenqualitaet}
                  </span>
                </div>
                <p className="mt-0.5 text-xs text-gray-600 leading-relaxed">{s.text}</p>
              </div>
            ))}
            {plan.pruefhinweise.rueckrufe.map((r, i) => (
              <div key={i} className="rounded-xl border border-amber-200 bg-amber-50/50 p-3">
                <p className="text-sm font-medium text-amber-900">Rückruf: {r.titel}</p>
                <p className="mt-0.5 text-xs text-gray-700 leading-relaxed">{r.text}</p>
              </div>
            ))}
          </div>
          {plan.pruefhinweise.hinweis && (
            <p className="mt-3 text-xs text-gray-500 leading-relaxed">{plan.pruefhinweise.hinweis}</p>
          )}
        </Section>
      )}
    </div>
  )
}

function KriterienBlock({
  titel, label, kriterien,
}: {
  titel: string
  label: string
  kriterien: { kriterium: string; erfuellt: boolean }[]
}) {
  return (
    <div className="rounded-xl border border-[#e6e1da] p-3">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-medium text-gray-900">{titel}</p>
        <span className="text-sm font-semibold text-gray-700">{label}</span>
      </div>
      <ul className="mt-2 space-y-1">
        {kriterien.map((k, i) => (
          <li key={i} className="flex items-start gap-2 text-xs">
            {k.erfuellt
              ? <Check size={13} className="mt-0.5 shrink-0 text-emerald-600" />
              : <span className="mt-1 w-2.5 h-2.5 rounded-full border border-gray-300 shrink-0" />}
            <span className={k.erfuellt ? 'text-gray-700' : 'text-gray-500'}>{k.kriterium}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
