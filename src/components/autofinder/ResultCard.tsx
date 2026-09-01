import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChevronDown, ChevronUp, ShoppingCart, Search, Gauge, Fuel, Cog, CheckCircle, AlertTriangle } from 'lucide-react'
import {
  imageDisclosure,
  marketplaceFilters,
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

function scorePercent(k: AutoFinderKandidat): number {
  // match_score ist additiv (kein fixes Maximum). Für die Anzeige robust auf
  // 0–100 abbilden, ohne einen "echten" Prozentwert zu behaupten.
  const s = Number.isFinite(k.match_score) ? k.match_score : 0
  return Math.max(8, Math.min(100, Math.round((s / 12) * 100)))
}

export default function ResultCard({ k, rank }: { k: AutoFinderKandidat; rank: number }) {
  const [open, setOpen] = useState(false)
  const [imgBroken, setImgBroken] = useState(false)
  const navigate = useNavigate()

  const disclosure = imageDisclosure(k)
  const budgetLabel = BUDGET_LABEL[k.budget_status]
  const filters = marketplaceFilters(k)
  const titel = [k.marke, k.modell].filter(Boolean).join(' ')
  const showImg = k.image_url && !imgBroken

  return (
    <article className="rounded-2xl border border-[#e6e1da] bg-white overflow-hidden shadow-[0_16px_36px_-24px_rgba(40,25,10,0.28)]">
      <div className="sm:flex">
        {/* Bild */}
        <div className="relative sm:w-56 md:w-64 shrink-0 bg-[#faf8f5] border-b sm:border-b-0 sm:border-r border-[#efe9df]">
          <div className="aspect-[16/10] flex items-center justify-center">
            {showImg ? (
              <img
                src={k.image_url}
                alt={titel}
                className="w-full h-full object-contain"
                onError={() => setImgBroken(true)}
              />
            ) : (
              <CarPlaceholder karosserie={k.karosserie} className="w-full h-full p-3" />
            )}
          </div>
          {disclosure && (
            <span className="absolute bottom-1 left-2 text-[10px] leading-tight text-gray-500 bg-white/85 rounded px-1">
              {disclosure}
            </span>
          )}
          <span className="absolute top-2 left-2 text-[10px] font-bold tracking-widest uppercase text-white bg-orange-500 rounded-full px-2 py-0.5">
            #{rank}
          </span>
        </div>

        {/* Kopf */}
        <div className="flex-1 p-4 min-w-0">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="font-semibold text-gray-900 tracking-tight truncate">{titel}</h3>
              <p className="text-sm text-gray-500 truncate">
                {[k.generation, k.motor].filter(Boolean).join(' · ')}
              </p>
            </div>
            <div className="text-right shrink-0">
              <div className="text-lg font-bold text-orange-600 leading-none">{scorePercent(k)}%</div>
              <div className="text-[10px] uppercase tracking-wider text-gray-400">Match</div>
            </div>
          </div>

          <dl className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm text-gray-700">
            {k.leistung_ps != null && (
              <div className="flex items-center gap-1"><Gauge size={13} className="text-gray-400" />{k.leistung_ps} PS</div>
            )}
            {k.kraftstoff && (
              <div className="flex items-center gap-1"><Fuel size={13} className="text-gray-400" />{k.kraftstoff}</div>
            )}
            {k.getriebe.length > 0 && (
              <div className="flex items-center gap-1"><Cog size={13} className="text-gray-400" />
                {k.getriebe.map((g) => (g === 'automatik' ? 'Automatik' : g === 'manuell' ? 'Schaltgetriebe' : g)).join(' / ')}
              </div>
            )}
            {budgetLabel && (
              <div className="flex items-center gap-1 text-gray-500">{budgetLabel}</div>
            )}
          </dl>

          {k.match_gruende.length > 0 && (
            <p className="mt-2 text-sm text-gray-600 line-clamp-2">
              {k.match_gruende.slice(0, 2).join(' · ')}
            </p>
          )}

          {k.source_type === 'web_discovered' && (
            <p className="mt-2 text-[11px] text-gray-500">
              Aus Web-Recherche · technische Angaben belegt, aber nicht VIRA-geprüft
            </p>
          )}

          <div className="mt-3 flex flex-wrap gap-2">
            <button
              onClick={() => setOpen((v) => !v)}
              className="inline-flex items-center gap-1 text-sm font-medium text-gray-700 border border-[#e6e1da] rounded-lg px-3 py-1.5 hover:bg-[#faf8f5]"
              aria-expanded={open}
            >
              {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
              {open ? 'Weniger' : 'Details & Suchhilfe'}
            </button>
            <button
              onClick={() => navigate(KAUFCHECK_ROUTE)}
              className="inline-flex items-center gap-1 text-sm font-medium text-white bg-gray-900 rounded-lg px-3 py-1.5 hover:bg-gray-800"
            >
              <ShoppingCart size={14} /> Mit KaufCheck prüfen
            </button>
          </div>
        </div>
      </div>

      {/* Aufgeklappt */}
      {open && (
        <div className="border-t border-[#efe9df] bg-[#faf8f5] p-4 space-y-4 text-sm">
          {k.match_gruende.length > 0 && (
            <section>
              <h4 className="font-semibold text-gray-800 flex items-center gap-1.5">
                <CheckCircle size={14} className="text-emerald-600" /> Warum passt es?
              </h4>
              <ul className="mt-1.5 list-disc pl-5 text-gray-700 space-y-0.5">
                {k.match_gruende.map((g, i) => <li key={i}>{g}</li>)}
              </ul>
            </section>
          )}

          {k.trade_offs.length > 0 && (
            <section>
              <h4 className="font-semibold text-gray-800 flex items-center gap-1.5">
                <AlertTriangle size={14} className="text-amber-600" /> Trade-offs & offene Punkte
              </h4>
              <ul className="mt-1.5 list-disc pl-5 text-gray-700 space-y-0.5">
                {k.trade_offs.map((t, i) => <li key={i}>{t}</li>)}
              </ul>
            </section>
          )}

          <section>
            <h4 className="font-semibold text-gray-800">Fahrzeug</h4>
            <dl className="mt-1.5 grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1 text-gray-700">
              {k.generation && <div><dt className="text-gray-400 text-xs">Generation</dt><dd>{k.generation}</dd></div>}
              {k.motor && <div><dt className="text-gray-400 text-xs">Motor</dt><dd>{k.motor}</dd></div>}
              {(k.baujahr_von || k.baujahr_bis) && (
                <div><dt className="text-gray-400 text-xs">Baujahre</dt>
                  <dd>{k.baujahr_von ?? '?'}{k.baujahr_bis ? `–${k.baujahr_bis}` : ' →'}</dd></div>
              )}
              {k.leistung_ps != null && <div><dt className="text-gray-400 text-xs">Leistung</dt><dd>{k.leistung_ps} PS</dd></div>}
              {k.kraftstoff && <div><dt className="text-gray-400 text-xs">Kraftstoff</dt><dd>{k.kraftstoff}</dd></div>}
              {k.getriebe.length > 0 && <div><dt className="text-gray-400 text-xs">Getriebe</dt><dd>{k.getriebe.join(' / ')}</dd></div>}
              {k.antrieb && <div><dt className="text-gray-400 text-xs">Antrieb</dt><dd>{k.antrieb}</dd></div>}
              {k.karosserie.length > 0 && <div><dt className="text-gray-400 text-xs">Karosserie</dt><dd>{k.karosserie.join(' / ')}</dd></div>}
            </dl>
          </section>

          <section>
            <h4 className="font-semibold text-gray-800">Datenqualität</h4>
            <p className="mt-1 text-gray-600">
              {k.source_type === 'web_discovered'
                ? 'Aus einer Web-Recherche zusammengetragen — die genannten technischen Angaben sind in den Quellen belegt, aber nicht von VIRA geprüft.'
                : `VIRA-gepflegter Datensatz${k.datenqualitaet >= 1 ? ', vollständig' : ''}. Bekannte Schwachpunkte oben unter „Trade-offs“, soweit vorhanden.`}
            </p>
          </section>

          <section>
            <h4 className="font-semibold text-gray-800 flex items-center gap-1.5">
              <Search size={14} className="text-gray-500" /> So findest du dieses Auto
            </h4>
            <p className="mt-1 text-gray-500 text-xs">
              Werte zum direkten Eintippen bei mobile.de oder AutoScout24. VIRA ruft keine
              Portaldaten ab und nennt bewusst keinen Marktpreis.
            </p>
            <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1">
              {filters.map((f) => (
                <div key={f.label} className="flex justify-between gap-2 border-b border-[#efe9df] py-1">
                  <span className="text-gray-500">{f.label}</span>
                  <span className="text-gray-800 font-medium text-right">{f.value}</span>
                </div>
              ))}
            </div>
          </section>

          <div>
            <button
              onClick={() => navigate(KAUFCHECK_ROUTE)}
              className="inline-flex items-center gap-1 text-sm font-medium text-white bg-gray-900 rounded-lg px-3 py-1.5 hover:bg-gray-800"
            >
              <ShoppingCart size={14} /> Dieses Fahrzeug mit KaufCheck prüfen
            </button>
          </div>
        </div>
      )}
    </article>
  )
}
