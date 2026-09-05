import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  ChevronDown, ChevronUp, ShoppingCart, Search, Gauge, Fuel, Cog,
  CheckCircle, AlertTriangle, Info, Tag,
} from 'lucide-react'
import {
  imageDisclosure,
  marketplaceFilters,
  formatPriceRange,
  stageKaufCheckPrefill,
  KAUFCHECK_ROUTE,
  type AutoFinderKandidat,
} from './logic'
import CarPlaceholder from './CarPlaceholder'

const BUDGET_LABEL: Record<AutoFinderKandidat['budget_status'], string | null> = {
  IN_BUDGET: 'Im Budget',
  NEAR_BUDGET: 'Nahe am Budget',
  OUT_OF_BUDGET: 'Über Budget',
  UNKNOWN: null,
}

/** Eine kurze 1-Zeilen-Zusammenfassung (§Punkt 6): stärkster why_fit, sonst
 *  stärkster deterministischer Fit-Grund. */
function summary(k: AutoFinderKandidat): string | null {
  return k.why_fits[0] ?? k.user_fit_gruende[0] ?? k.match_gruende[0] ?? null
}

interface Props {
  k: AutoFinderKandidat
  rank: number
  /** true, solange das Bild für diesen visual_key noch nacherzeugt wird. */
  imagePending?: boolean
}

export default function ResultCard({ k, rank, imagePending = false }: Props) {
  const [open, setOpen] = useState(false)
  const [imgBroken, setImgBroken] = useState(false)
  const navigate = useNavigate()

  const disclosure = imageDisclosure(k)
  const budgetLabel = BUDGET_LABEL[k.budget_status]
  const filters = marketplaceFilters(k)
  const preis = formatPriceRange(k)
  const titel = [k.marke, k.modell].filter(Boolean).join(' ')
  const untertitel = [k.generation, k.motor].filter(Boolean).join(' · ')
  const hatEchtesBild = k.image_type === 'generated_cached' || k.image_type === 'curated'
  const showImg = k.image_url && !imgBroken && (hatEchtesBild || !imagePending)
  const zeigeSkeleton = imagePending && !hatEchtesBild && !imgBroken

  function toKaufCheck() {
    stageKaufCheckPrefill(k)
    navigate(KAUFCHECK_ROUTE)
  }

  return (
    <article className="ez-card rounded-2xl border border-[#e6e1da] bg-white overflow-hidden shadow-[0_16px_36px_-24px_rgba(40,25,10,0.28)]">
      <div className="sm:flex sm:items-start">
        {/* Bild */}
        <div className="relative sm:w-56 md:w-64 shrink-0 bg-white border-b sm:border-b-0 sm:border-r border-[#efe9df]">
          <div className="aspect-[16/10] flex items-center justify-center">
            {zeigeSkeleton ? (
              <div className="w-full h-full flex flex-col items-center justify-center gap-2 px-3 text-center">
                <div className="w-8 h-8 rounded-full border-2 border-orange-300 border-t-transparent animate-spin" />
                <span className="text-[11px] text-gray-400 leading-tight">Fahrzeugdarstellung wird vorbereitet …</span>
              </div>
            ) : showImg ? (
              <img
                src={k.image_url}
                alt={titel}
                className="w-full h-full object-contain transition-opacity duration-300"
                onError={() => setImgBroken(true)}
              />
            ) : (
              <div className="w-full h-full p-3">
                <CarPlaceholder karosserie={k.karosserie} className="w-full h-full" />
              </div>
            )}
          </div>
          {!zeigeSkeleton && disclosure && (
            <span className="absolute bottom-2 left-2 text-[10px] leading-tight text-gray-500 bg-white/90 backdrop-blur-sm rounded-md px-1.5 py-0.5 shadow-sm">
              {disclosure}
            </span>
          )}
          <span className="absolute top-2 left-2 text-[10px] font-bold tracking-widest uppercase text-white bg-gray-900/90 rounded-full px-2.5 py-1 shadow-sm">
            #{rank}
          </span>
        </div>

        {/* Kopf */}
        <div className="flex-1 p-4 sm:p-5 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-lg font-bold text-gray-900 tracking-tight truncate">{titel}</h3>
              {untertitel && (
                <p className="mt-0.5 text-xs font-medium text-gray-400 uppercase tracking-wide truncate">{untertitel}</p>
              )}
            </div>
            <div className="shrink-0 inline-flex flex-col items-center justify-center rounded-2xl bg-orange-50 border border-orange-200/80 px-3 py-1.5">
              <span className="text-xl font-extrabold text-orange-600 leading-none tabular-nums">{k.user_fit}%</span>
              <span className="mt-0.5 text-[9px] font-bold uppercase tracking-wider text-orange-400">Passung</span>
            </div>
          </div>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {k.leistung_ps != null && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#f4f0ea] px-2.5 py-1 text-xs font-medium text-gray-600">
                <Gauge size={12} className="text-gray-400" />{k.leistung_ps} PS
              </span>
            )}
            {k.kraftstoff && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#f4f0ea] px-2.5 py-1 text-xs font-medium text-gray-600">
                <Fuel size={12} className="text-gray-400" />{k.kraftstoff}
              </span>
            )}
            {k.getriebe.length > 0 && (
              <span className="inline-flex items-center gap-1 rounded-full bg-[#f4f0ea] px-2.5 py-1 text-xs font-medium text-gray-600">
                <Cog size={12} className="text-gray-400" />
                {k.getriebe.map((g) => (g === 'automatik' ? 'Automatik' : g === 'manuell' ? 'Schaltgetriebe' : g)).join(' / ')}
              </span>
            )}
            {budgetLabel && (
              <span className="inline-flex items-center rounded-full bg-[#f4f0ea] px-2.5 py-1 text-xs font-medium text-gray-500">
                {budgetLabel}
              </span>
            )}
          </div>

          {preis && (
            <p className="mt-2.5 inline-flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 rounded-lg bg-emerald-50/70 border border-emerald-100 px-2.5 py-1.5 text-sm text-gray-700">
              <Tag size={13} className="text-emerald-600 self-center shrink-0" />
              <span className="font-semibold text-gray-900 whitespace-nowrap">{preis.range}</span>
              <span className="text-[11px] text-gray-400">· {preis.hint}</span>
            </p>
          )}

          {summary(k) && (
            <p className="mt-2.5 pl-3 border-l-2 border-orange-200 text-sm text-gray-600 italic leading-snug line-clamp-2">
              {summary(k)}
            </p>
          )}

          {k.source_type === 'web_discovered' && (
            <p className="mt-2 text-[11px] text-gray-500">
              Aus Web-Recherche · technische Angaben belegt, aber nicht VIRA-geprüft
            </p>
          )}

          <div className="mt-3.5 flex flex-wrap gap-2">
            <button
              onClick={() => setOpen((v) => !v)}
              className="inline-flex items-center gap-1 text-sm font-medium text-gray-700 border border-[#e6e1da] rounded-full px-3.5 py-1.5 hover:bg-[#faf8f5] hover:border-[#d8d0c2] transition-colors"
              aria-expanded={open}
            >
              {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              {open ? 'Weniger' : 'Details & Suchhilfe'}
            </button>
            <button
              onClick={toKaufCheck}
              className="inline-flex items-center gap-1 text-sm font-semibold text-white bg-gray-900 rounded-full px-3.5 py-1.5 hover:bg-gray-800 transition-colors"
            >
              <ShoppingCart size={14} /> Mit KaufCheck prüfen
            </button>
          </div>
        </div>
      </div>

      {/* Aufgeklappt */}
      {open && (
        <div className="border-t border-[#efe9df] bg-[#faf8f5] p-4 sm:p-5 space-y-5 text-sm">
          {k.why_fits.length > 0 && (
            <section>
              <h4 className="text-[11px] font-bold tracking-[0.15em] uppercase text-gray-500 flex items-center gap-1.5">
                <CheckCircle size={13} className="text-emerald-600" /> Warum passt es?
              </h4>
              <ul className="mt-2 space-y-1.5 text-gray-700">
                {k.why_fits.map((g, i) => (
                  <li key={i} className="flex gap-2"><span className="text-emerald-500 mt-0.5">●</span><span>{g}</span></li>
                ))}
              </ul>
            </section>
          )}

          {k.trade_offs.length > 0 && (
            <section>
              <h4 className="text-[11px] font-bold tracking-[0.15em] uppercase text-gray-500 flex items-center gap-1.5">
                <AlertTriangle size={13} className="text-amber-600" /> Trade-offs
              </h4>
              <ul className="mt-2 space-y-1.5 text-gray-700">
                {k.trade_offs.map((t, i) => (
                  <li key={i} className="flex gap-2"><span className="text-amber-500 mt-0.5">●</span><span>{t}</span></li>
                ))}
              </ul>
            </section>
          )}

          {k.known_points.length > 0 && (
            <section>
              <h4 className="text-[11px] font-bold tracking-[0.15em] uppercase text-gray-500 flex items-center gap-1.5">
                <Info size={13} className="text-gray-500" /> Bekannte Punkte
              </h4>
              <ul className="mt-2 space-y-1.5 text-gray-700">
                {k.known_points.map((p, i) => (
                  <li key={i} className="flex gap-2"><span className="text-gray-400 mt-0.5">●</span><span>{p}</span></li>
                ))}
              </ul>
            </section>
          )}

          {preis && (
            <section className="rounded-xl border border-emerald-100 bg-emerald-50/50 p-3">
              <h4 className="text-[11px] font-bold tracking-[0.15em] uppercase text-gray-500 flex items-center gap-1.5">
                <Tag size={13} className="text-emerald-600" /> Preisorientierung
              </h4>
              <p className="mt-1 text-gray-900 font-semibold">{preis.range}</p>
              <p className="text-[11px] text-gray-400">{preis.hint}</p>
            </section>
          )}

          <section>
            <h4 className="text-[11px] font-bold tracking-[0.15em] uppercase text-gray-500">Fahrzeug</h4>
            <dl className="mt-2 grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2 text-gray-700">
              {k.generation && <div><dt className="text-gray-400 text-[11px]">Generation</dt><dd className="font-medium">{k.generation}</dd></div>}
              {k.motor && <div><dt className="text-gray-400 text-[11px]">Motor</dt><dd className="font-medium">{k.motor}</dd></div>}
              {(k.baujahr_von || k.baujahr_bis) && (
                <div><dt className="text-gray-400 text-[11px]">Baujahre</dt>
                  <dd className="font-medium">{k.baujahr_von ?? '?'}{k.baujahr_bis ? `–${k.baujahr_bis}` : ' →'}</dd></div>
              )}
              {k.leistung_ps != null && <div><dt className="text-gray-400 text-[11px]">Leistung</dt><dd className="font-medium">{k.leistung_ps} PS</dd></div>}
              {k.kraftstoff && <div><dt className="text-gray-400 text-[11px]">Kraftstoff</dt><dd className="font-medium">{k.kraftstoff}</dd></div>}
              {k.getriebe.length > 0 && <div><dt className="text-gray-400 text-[11px]">Getriebe</dt>
                <dd className="font-medium">{k.getriebe.map((g) => (g === 'automatik' ? 'Automatik' : g === 'manuell' ? 'Schaltgetriebe' : g)).join(' / ')}</dd></div>}
              {k.antrieb && <div><dt className="text-gray-400 text-[11px]">Antrieb</dt><dd className="font-medium">{k.antrieb}</dd></div>}
              {k.karosserie.length > 0 && <div><dt className="text-gray-400 text-[11px]">Karosserie</dt><dd className="font-medium">{k.karosserie.join(' / ')}</dd></div>}
            </dl>
          </section>

          <section>
            <h4 className="text-[11px] font-bold tracking-[0.15em] uppercase text-gray-500">Datenqualität</h4>
            <p className="mt-1.5 text-gray-600 leading-relaxed">
              {k.source_type === 'web_discovered'
                ? 'Aus einer Web-Recherche zusammengetragen — die genannten technischen Angaben sind in den Quellen belegt, aber nicht von VIRA geprüft.'
                : `VIRA-gepflegter Datensatz${k.datenqualitaet >= 1 ? ', vollständig' : ''}.` +
                  (k.enrichment_status === 'fallback'
                    ? ' Die ausführliche KI-Analyse konnte diesmal nicht vollständig geladen werden.'
                    : '')}
            </p>
          </section>

          <section>
            <h4 className="text-[11px] font-bold tracking-[0.15em] uppercase text-gray-500 flex items-center gap-1.5">
              <Search size={13} className="text-gray-500" /> So findest du dieses Auto
            </h4>
            <p className="mt-1.5 text-gray-500 text-xs">
              Werte zum direkten Eintippen bei mobile.de oder AutoScout24. VIRA ruft keine
              Portaldaten ab und nennt keinen Marktpreis.
            </p>
            <div className="mt-2.5 rounded-xl border border-[#efe9df] bg-white overflow-hidden">
              {filters.map((f, i) => (
                <div key={f.label} className={
                  'flex items-center justify-between gap-2 px-3 py-2 text-sm ' +
                  (i % 2 === 1 ? 'bg-[#faf8f5]' : '') + (i > 0 ? ' border-t border-[#efe9df]' : '')
                }>
                  <span className="text-gray-500">{f.label}</span>
                  <span className="text-gray-900 font-semibold text-right">{f.value}</span>
                </div>
              ))}
            </div>
          </section>

          <div>
            <button
              onClick={toKaufCheck}
              className="inline-flex items-center gap-1 text-sm font-semibold text-white bg-gray-900 rounded-full px-3.5 py-1.5 hover:bg-gray-800 transition-colors"
            >
              <ShoppingCart size={14} /> Dieses Fahrzeug mit KaufCheck prüfen
            </button>
          </div>
        </div>
      )}
    </article>
  )
}
