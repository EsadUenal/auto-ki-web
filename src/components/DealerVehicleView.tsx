import { useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { ArrowLeft, Loader2, Trash2, ExternalLink, AlertTriangle, Save } from 'lucide-react'
import { apiDealerVehicle, apiDealerUpdate, apiDealerDelete } from '../api/client'
import type { DealerVehicle, DealerStatus, DealerVehicleUpdate } from '../types'
import {
  fmtEur, fmtKm, margeClass, StatusBadge, empfMeta, preisMeta, risikoMeta,
  STATUS_OPTIONS, vehicleTitle,
} from './dealerUi'

const QUALI_LABEL: Record<string, string> = {
  sehr_gut: 'Sehr gut', gut: 'Gut', verbesserbar: 'Verbesserbar', unvollstaendig: 'Unvollständig',
}

export default function DealerVehicleView({
  onOpenCheck,
}: {
  onOpenCheck?: (checkId: number, typ: 'kauf' | 'verkauf') => void
}) {
  const { id } = useParams()
  const navigate = useNavigate()
  const vehicleId = Number(id)
  const [v, setV] = useState<DealerVehicle | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)

  // Editierbare Felder (lokaler Entwurf)
  const [draft, setDraft] = useState<DealerVehicleUpdate>({})

  useEffect(() => {
    apiDealerVehicle(vehicleId)
      .then((data) => { setV(data); setDraft({}) })
      .catch((e) => setError((e as Error).message))
      .finally(() => setLoading(false))
  }, [vehicleId])

  function set<K extends keyof DealerVehicleUpdate>(k: K, val: DealerVehicleUpdate[K]) {
    setDraft((d) => ({ ...d, [k]: val }))
  }
  const numOrNull = (s: string): number | null => (s === '' ? null : Math.max(0, parseInt(s)))

  // Aktueller Wert eines Finanzfeldes = Entwurf (falls geändert) sonst Serverwert.
  const cur = (k: 'einkaufspreis' | 'nebenkosten' | 'geplanter_verkaufspreis' | 'tatsaechlicher_verkaufspreis'): number | null | undefined =>
    (draft as Record<string, unknown>)[k] !== undefined
      ? (draft as Record<string, number | null>)[k]
      : (v?.finanzen[k] as number | null | undefined)

  const dirty = Object.keys(draft).length > 0

  async function save() {
    setSaving(true); setError(null)
    try {
      const updated = await apiDealerUpdate(vehicleId, draft)
      setV(updated); setDraft({})
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  async function remove() {
    if (!confirm('Dieses Fahrzeug wirklich aus dem Bestand löschen?')) return
    await apiDealerDelete(vehicleId).catch(() => {})
    navigate('/dealer')
  }

  if (loading) return <div className="p-8 flex items-center gap-2 text-sm text-gray-400"><Loader2 size={16} className="animate-spin" /> Lädt…</div>
  if (!v) return <div className="p-8 text-sm text-red-600">{error ?? 'Fahrzeug nicht gefunden.'}</div>

  const status = (draft.status ?? v.status) as DealerStatus
  const inputCls = 'w-full text-sm border border-[#e6e1da] rounded-lg px-3 py-2 outline-none focus:border-gray-400'
  const fin = v.finanzen
  const pct = (n?: number | null) => (n != null ? ` · ${n.toString().replace('.', ',')} %` : '')

  return (
    <div className="h-full overflow-y-auto scrollbar-thin bg-[#faf7f3]">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6">
        <button onClick={() => navigate('/dealer')} className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 mb-4">
          <ArrowLeft size={15} /> Zurück zum Bestand
        </button>

        {/* Fahrzeugkopf */}
        <div className="flex items-start justify-between gap-3 mb-5">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight">{vehicleTitle(v)}</h1>
            <p className="text-sm text-gray-400 mt-0.5">
              {[v.baujahr, fmtKm(v.kilometerstand), v.motor].filter(Boolean).join(' · ')}
            </p>
          </div>
          <StatusBadge status={v.status} />
        </div>

        {v.braucht_aufmerksamkeit && v.aufmerksamkeit_gruende.length > 0 && (
          <div className="mb-5 flex items-start gap-2 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3">
            <AlertTriangle size={15} className="shrink-0 mt-0.5 text-amber-500" />
            <div><span className="font-medium">Prüfen: </span>{v.aufmerksamkeit_gruende.join(' · ')}</div>
          </div>
        )}

        {/* FINANZEN */}
        <Section title="Finanzen">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <FinInput label="Einkaufspreis €" value={cur('einkaufspreis')} onChange={(s) => set('einkaufspreis', numOrNull(s))} cls={inputCls} />
            <FinInput label="Nebenkosten €" value={cur('nebenkosten')} onChange={(s) => set('nebenkosten', numOrNull(s))} cls={inputCls} />
            <ReadValue label="Gesamteinsatz" value={fmtEur(fin.gesamteinsatz)} />
            <FinInput label="Ziel-Verkaufspreis €" value={cur('geplanter_verkaufspreis')} onChange={(s) => set('geplanter_verkaufspreis', numOrNull(s))} cls={inputCls} />
            {status === 'verkauft' && (
              <FinInput label="Tatsächlicher Verkauf €" value={cur('tatsaechlicher_verkaufspreis')} onChange={(s) => set('tatsaechlicher_verkaufspreis', numOrNull(s))} cls={inputCls} />
            )}
            {status === 'verkauft' ? (
              <ReadValue label="Realisierte Bruttomarge"
                value={fin.realisierte_bruttomarge != null ? `${fmtEur(fin.realisierte_bruttomarge)}${pct(fin.realisierte_marge_pct)}` : '–'}
                cls={margeClass(fin.realisierte_bruttomarge)} />
            ) : (
              <ReadValue label="Mögliche Bruttomarge"
                value={fin.moegliche_bruttomarge != null ? `${fmtEur(fin.moegliche_bruttomarge)}${pct(fin.moegliche_marge_pct)}` : '–'}
                cls={margeClass(fin.moegliche_bruttomarge)} />
            )}
          </div>
          <p className="text-[11px] text-gray-400 mt-3">{fin.hinweis}</p>
        </Section>

        {/* STATUS */}
        <Section title="Status">
          <select className={inputCls + ' max-w-xs'} value={status} onChange={(e) => set('status', e.target.value as DealerStatus)}>
            {STATUS_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </Section>

        {/* VIRA (Kaufcheck) */}
        <Section title="VIRA-Kaufcheck">
          {v.vira.vorhanden ? (
            <div className="space-y-2 text-sm">
              <div className="flex flex-wrap gap-x-6 gap-y-1">
                <span><span className="text-gray-400">Empfehlung: </span><span className={empfMeta(v.triage.empfehlung).cls + ' font-medium'}>{empfMeta(v.triage.empfehlung).label}</span></span>
                <span><span className="text-gray-400">Preis: </span><span className={preisMeta(v.triage.preis).cls + ' font-medium'}>{preisMeta(v.triage.preis).label}</span></span>
                <span><span className="text-gray-400">Risiko: </span><span className={risikoMeta(v.triage.risiko).cls + ' font-medium'}>{risikoMeta(v.triage.risiko).label}</span></span>
              </div>
              {v.vira.markt_median != null && (
                <p className="text-gray-600">Marktmedian: <span className="font-medium text-gray-900">{fmtEur(v.vira.markt_median)}</span>
                  {v.vira.markt_min != null && <span className="text-gray-400"> (Spanne {fmtEur(v.vira.markt_min)}–{fmtEur(v.vira.markt_max)})</span>}
                </p>
              )}
              {v.vira.risiko_hinweise.length > 0 && (
                <ul className="text-gray-600 list-disc pl-4">
                  {v.vira.risiko_hinweise.map((h, i) => <li key={i}>{h}</li>)}
                </ul>
              )}
              {v.kaufcheck_id != null && onOpenCheck && (
                <button onClick={() => onOpenCheck(v.kaufcheck_id!, 'kauf')} className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:underline">
                  <ExternalLink size={13} /> Kaufcheck öffnen
                </button>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-400">Kein Kaufcheck verknüpft.</p>
          )}
        </Section>

        {/* SELLER (Verkaufscheck) */}
        {v.verkauf.vorhanden && (
          <Section title="Verkaufscheck">
            <div className="space-y-1.5 text-sm">
              {v.verkauf.empfohlener_preis != null && (
                <p className="text-gray-600">Empfohlener Verkaufspreis: <span className="font-medium text-gray-900">{fmtEur(v.verkauf.empfohlener_preis)}</span></p>
              )}
              {v.verkauf.inserat_qualitaet && (
                <p className="text-gray-600">Inseratsqualität: <span className="font-medium text-gray-900">{QUALI_LABEL[v.verkauf.inserat_qualitaet] ?? v.verkauf.inserat_qualitaet}</span></p>
              )}
              {v.verkaufscheck_id != null && onOpenCheck && (
                <button onClick={() => onOpenCheck(v.verkaufscheck_id!, 'verkauf')} className="inline-flex items-center gap-1.5 text-sm text-blue-600 hover:underline">
                  <ExternalLink size={13} /> Verkaufscheck öffnen
                </button>
              )}
            </div>
          </Section>
        )}

        {/* NOTIZ */}
        <Section title="Interne Notiz">
          <textarea className={inputCls + ' resize-none'} rows={3}
            value={(draft.interne_notiz ?? v.interne_notiz) ?? ''}
            onChange={(e) => set('interne_notiz', e.target.value)}
            placeholder="Nur für dich sichtbar…" />
        </Section>

        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}

        {/* Aktionen */}
        <div className="flex items-center gap-3 sticky bottom-0 py-3 bg-[#faf7f3]">
          <button onClick={save} disabled={!dirty || saving}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-white text-sm font-semibold disabled:opacity-40"
            style={{ background: 'linear-gradient(180deg,#111827,#000)' }}>
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Änderungen speichern
          </button>
          <button onClick={remove} className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-red-600 ml-auto">
            <Trash2 size={15} /> Löschen
          </button>
        </div>
      </div>
    </div>
  )
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-[#e6e1da] rounded-2xl p-5 mb-4">
      <p className="text-[11px] font-bold tracking-[0.12em] uppercase text-[#a49c92] mb-3">{title}</p>
      {children}
    </div>
  )
}

function FinInput({ label, value, onChange, cls }: { label: string; value?: number | null; onChange: (s: string) => void; cls: string }) {
  return (
    <div>
      <label className="block text-[11px] text-gray-500 mb-1">{label}</label>
      <input className={cls} type="number" min={0} value={value ?? ''} onChange={(e) => onChange(e.target.value)} placeholder="–" />
    </div>
  )
}

function ReadValue({ label, value, cls }: { label: string; value: string; cls?: string }) {
  return (
    <div>
      <label className="block text-[11px] text-gray-500 mb-1">{label}</label>
      <p className={`text-sm font-semibold py-2 ${cls ?? 'text-gray-900'}`}>{value}</p>
    </div>
  )
}
