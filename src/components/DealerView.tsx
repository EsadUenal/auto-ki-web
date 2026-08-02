import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Store, Plus, Loader2, AlertTriangle, X, ChevronRight } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { apiDealerSummary, apiDealerVehicles, apiDealerCreate } from '../api/client'
import type { DealerVehicle, DealerSummary, DealerStatus, DealerVehicleCreate } from '../types'
import {
  fmtEur, fmtKm, margeClass, StatusBadge, TriageSignals, STATUS_OPTIONS, vehicleTitle,
} from './dealerUi'

type SortKey = 'neueste' | 'marke' | 'marge' | 'warnungen'

export default function DealerView() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [vehicles, setVehicles] = useState<DealerVehicle[]>([])
  const [summary, setSummary] = useState<DealerSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState<DealerStatus | 'alle'>('alle')
  const [sort, setSort] = useState<SortKey>('neueste')
  const [showAdd, setShowAdd] = useState(false)

  async function reload() {
    try {
      const [v, s] = await Promise.all([apiDealerVehicles(), apiDealerSummary()])
      setVehicles(v)
      setSummary(s)
      setError(null)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { reload() }, [])

  const gefiltert = useMemo(() => {
    let list = statusFilter === 'alle' ? vehicles : vehicles.filter((v) => v.status === statusFilter)
    list = [...list]
    if (sort === 'marke') list.sort((a, b) => vehicleTitle(a).localeCompare(vehicleTitle(b)))
    else if (sort === 'marge') list.sort((a, b) => (b.finanzen.moegliche_bruttomarge ?? -Infinity) - (a.finanzen.moegliche_bruttomarge ?? -Infinity))
    else if (sort === 'warnungen') list.sort((a, b) => Number(b.braucht_aufmerksamkeit) - Number(a.braucht_aufmerksamkeit))
    // 'neueste' = Backend-Reihenfolge (created_at DESC) beibehalten
    return list
  }, [vehicles, statusFilter, sort])

  // Nicht-Dealer sollten hier gar nicht landen (Guard in App.tsx) — doppelt absichern.
  if (user && !user.ist_haendler) {
    return <div className="p-8 text-sm text-gray-500">Dieser Bereich ist nur für VIRA-Dealer-Konten.</div>
  }

  return (
    <div className="h-full overflow-y-auto scrollbar-thin bg-[#faf7f3]">
      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8">
        {/* Kopf */}
        <div className="flex items-center gap-2.5 mb-6">
          <span className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-gray-900 text-white">
            <Store size={14} />
          </span>
          <div>
            <p className="text-[11px] font-bold tracking-[0.22em] uppercase text-gray-400">VIRA Dealer</p>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">Dein Fahrzeugbestand</h1>
          </div>
        </div>

        {summary && <SummaryHead summary={summary} />}

        {/* Filter + Aktion */}
        <div className="flex items-center gap-2 flex-wrap mt-6 mb-4">
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as DealerStatus | 'alle')}
            className="text-sm border border-[#e6e1da] rounded-lg px-3 py-1.5 bg-white outline-none">
            <option value="alle">Alle Status</option>
            {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <select value={sort} onChange={(e) => setSort(e.target.value as SortKey)}
            className="text-sm border border-[#e6e1da] rounded-lg px-3 py-1.5 bg-white outline-none">
            <option value="neueste">Neueste zuerst</option>
            <option value="marke">Marke / Modell</option>
            <option value="marge">Höchste mögliche Marge</option>
            <option value="warnungen">Mit Warnungen zuerst</option>
          </select>
          <button onClick={() => setShowAdd(true)}
            className="ml-auto inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-white text-sm font-medium"
            style={{ background: 'linear-gradient(180deg,#111827,#000)' }}>
            <Plus size={15} /> Fahrzeug hinzufügen
          </button>
        </div>

        {error && <div className="mb-4 bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">{error}</div>}

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-gray-400 py-10 justify-center">
            <Loader2 size={16} className="animate-spin" /> Lädt…
          </div>
        ) : gefiltert.length === 0 ? (
          <div className="bg-white border border-[#e6e1da] rounded-2xl p-10 text-center">
            <p className="text-sm text-gray-500">Noch keine Fahrzeuge.</p>
            <p className="text-xs text-gray-400 mt-1">Füge ein Fahrzeug hinzu oder übernimm es aus einem Kaufcheck.</p>
          </div>
        ) : (
          <VehicleList vehicles={gefiltert} onOpen={(id) => navigate(`/dealer/${id}`)} />
        )}
      </div>

      {showAdd && <AddVehicleModal onClose={() => setShowAdd(false)} onCreated={() => { setShowAdd(false); reload() }} />}
    </div>
  )
}

function Metric({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="bg-white border border-[#e6e1da] rounded-xl px-4 py-3">
      <p className="text-[10px] font-medium uppercase tracking-wide text-gray-400">{label}</p>
      <p className={`text-lg font-bold mt-0.5 ${accent ?? 'text-gray-900'}`}>{value}</p>
    </div>
  )
}

function SummaryHead({ summary }: { summary: DealerSummary }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      <Metric label="Im Bestand" value={String(summary.im_bestand)} />
      <Metric label="Gebundenes Kapital" value={fmtEur(summary.gebundenes_kapital)} />
      <Metric label="Geplante Bruttomarge" value={fmtEur(summary.geplante_bruttomarge)}
        accent={summary.geplante_bruttomarge != null && summary.geplante_bruttomarge < 0 ? 'text-red-600' : 'text-emerald-700'} />
      <Metric label="Verkauft" value={String(summary.verkauft)} />
      {summary.braucht_aufmerksamkeit > 0 && (
        <div className="col-span-2 sm:col-span-4 flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-4 py-2.5">
          <AlertTriangle size={15} className="shrink-0" />
          {summary.braucht_aufmerksamkeit} Fahrzeug{summary.braucht_aufmerksamkeit !== 1 ? 'e' : ''} brauch{summary.braucht_aufmerksamkeit !== 1 ? 'en' : 't'} Aufmerksamkeit
        </div>
      )}
    </div>
  )
}

function VehicleList({ vehicles, onOpen }: { vehicles: DealerVehicle[]; onOpen: (id: number) => void }) {
  return (
    <>
      {/* Desktop: Tabelle */}
      <div className="hidden md:block bg-white border border-[#e6e1da] rounded-2xl overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wide text-gray-400 border-b border-[#efe9e0]">
              <th className="px-4 py-2.5 font-medium">Fahrzeug</th>
              <th className="px-4 py-2.5 font-medium">Status</th>
              <th className="px-4 py-2.5 font-medium text-right">Einkauf</th>
              <th className="px-4 py-2.5 font-medium text-right">Ziel</th>
              <th className="px-4 py-2.5 font-medium text-right">Mögl. Marge</th>
              <th className="px-4 py-2.5 font-medium">VIRA / Risiko</th>
              <th className="px-4 py-2.5"></th>
            </tr>
          </thead>
          <tbody>
            {vehicles.map((v) => (
              <tr key={v.id} onClick={() => onOpen(v.id)}
                className="border-b border-[#f3efe8] last:border-0 hover:bg-[#faf8f5] cursor-pointer">
                <td className="px-4 py-3">
                  <div className="font-medium text-gray-900 flex items-center gap-1.5">
                    {vehicleTitle(v)}
                    {v.braucht_aufmerksamkeit && <AlertTriangle size={13} className="text-amber-500 shrink-0" />}
                  </div>
                  <div className="text-xs text-gray-400">{[v.baujahr, fmtKm(v.kilometerstand)].filter(Boolean).join(' · ')}</div>
                </td>
                <td className="px-4 py-3"><StatusBadge status={v.status} /></td>
                <td className="px-4 py-3 text-right text-gray-700">{fmtEur(v.finanzen.einkaufspreis)}</td>
                <td className="px-4 py-3 text-right text-gray-700">{fmtEur(v.finanzen.geplanter_verkaufspreis)}</td>
                <td className={`px-4 py-3 text-right font-semibold ${margeClass(v.finanzen.moegliche_bruttomarge)}`}>
                  {fmtEur(v.finanzen.moegliche_bruttomarge)}
                </td>
                <td className="px-4 py-3"><TriageSignals triage={v.triage} /></td>
                <td className="px-4 py-3 text-gray-300"><ChevronRight size={16} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Mobile: Karten */}
      <div className="md:hidden space-y-2.5">
        {vehicles.map((v) => (
          <button key={v.id} onClick={() => onOpen(v.id)}
            className="w-full text-left bg-white border border-[#e6e1da] rounded-2xl p-4">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="font-semibold text-gray-900 flex items-center gap-1.5">
                  {vehicleTitle(v)}
                  {v.braucht_aufmerksamkeit && <AlertTriangle size={13} className="text-amber-500 shrink-0" />}
                </p>
                <p className="text-xs text-gray-400">{[v.baujahr, fmtKm(v.kilometerstand)].filter(Boolean).join(' · ')}</p>
              </div>
              <StatusBadge status={v.status} />
            </div>
            <div className="grid grid-cols-3 gap-2 mt-3 text-xs">
              <div><p className="text-gray-400">Einkauf</p><p className="text-gray-800 font-medium">{fmtEur(v.finanzen.einkaufspreis)}</p></div>
              <div><p className="text-gray-400">Ziel</p><p className="text-gray-800 font-medium">{fmtEur(v.finanzen.geplanter_verkaufspreis)}</p></div>
              <div><p className="text-gray-400">Marge</p><p className={`font-semibold ${margeClass(v.finanzen.moegliche_bruttomarge)}`}>{fmtEur(v.finanzen.moegliche_bruttomarge)}</p></div>
            </div>
            <div className="mt-3 pt-3 border-t border-[#f3efe8]"><TriageSignals triage={v.triage} /></div>
          </button>
        ))}
      </div>
    </>
  )
}

function AddVehicleModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [f, setF] = useState<DealerVehicleCreate & { status: DealerStatus }>({ status: 'beobachtung' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function set<K extends keyof typeof f>(k: K, v: (typeof f)[K]) { setF((p) => ({ ...p, [k]: v })) }
  const num = (s: string): number | undefined => (s ? Math.max(0, parseInt(s)) : undefined)

  async function save() {
    setSaving(true); setError(null)
    try {
      await apiDealerCreate({
        marke: f.marke || undefined, modell: f.modell || undefined,
        baujahr: f.baujahr || undefined, kilometerstand: f.kilometerstand,
        einkaufspreis: f.einkaufspreis, geplanter_verkaufspreis: f.geplanter_verkaufspreis,
        status: f.status, interne_notiz: f.interne_notiz || undefined,
      })
      onCreated()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  const input = 'w-full text-sm border border-[#e6e1da] rounded-lg px-3 py-2 outline-none focus:border-gray-400'
  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 p-0 sm:p-4" onClick={onClose}>
      <div className="bg-white w-full sm:max-w-md rounded-t-2xl sm:rounded-2xl p-5 max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <p className="font-semibold text-gray-900">Fahrzeug hinzufügen</p>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-700"><X size={18} /></button>
        </div>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <input className={input} placeholder="Marke" value={f.marke ?? ''} onChange={(e) => set('marke', e.target.value)} />
            <input className={input} placeholder="Modell" value={f.modell ?? ''} onChange={(e) => set('modell', e.target.value)} />
            <input className={input} type="number" placeholder="Baujahr" value={f.baujahr ?? ''} onChange={(e) => set('baujahr', num(e.target.value))} />
            <input className={input} type="number" min={0} placeholder="Kilometerstand" value={f.kilometerstand ?? ''} onChange={(e) => set('kilometerstand', num(e.target.value))} />
            <input className={input} type="number" min={0} placeholder="Einkaufspreis €" value={f.einkaufspreis ?? ''} onChange={(e) => set('einkaufspreis', num(e.target.value))} />
            <input className={input} type="number" min={0} placeholder="Ziel-Verkaufspreis €" value={f.geplanter_verkaufspreis ?? ''} onChange={(e) => set('geplanter_verkaufspreis', num(e.target.value))} />
          </div>
          <select className={input} value={f.status} onChange={(e) => set('status', e.target.value as DealerStatus)}>
            {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
          <textarea className={input + ' resize-none'} rows={2} placeholder="Interne Notiz (optional)" value={f.interne_notiz ?? ''} onChange={(e) => set('interne_notiz', e.target.value)} />
          {error && <p className="text-xs text-red-600">{error}</p>}
          <button onClick={save} disabled={saving}
            className="w-full py-2.5 rounded-lg text-white text-sm font-semibold disabled:opacity-40 flex items-center justify-center gap-2"
            style={{ background: 'linear-gradient(180deg,#111827,#000)' }}>
            {saving ? <><Loader2 size={15} className="animate-spin" /> Speichert…</> : 'Fahrzeug anlegen'}
          </button>
        </div>
      </div>
    </div>
  )
}
