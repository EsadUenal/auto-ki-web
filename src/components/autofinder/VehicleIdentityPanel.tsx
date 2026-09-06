import { Car } from 'lucide-react'
import type { AutoFinderKandidat } from './logic'

/**
 * VIRA Vehicle Identity Panel — die finale visuelle Darstellung eines
 * Fahrzeugs in AutoFinder.
 *
 * PRODUKTENTSCHEIDUNG: AutoFinder zeigt keine modellgenauen Fahrzeugbilder
 * mehr. Die KI-Bildgenerierung war in Generationstreue und Qualität nicht
 * zuverlässig genug, verursachte Laufzeitkosten und eine spürbare Wartephase.
 *
 * Dieses Panel ist deshalb KEIN Platzhalter für ein fehlendes Bild, sondern
 * die bewusst gestaltete Fahrzeug-Identität: Marke, Modell, Generation, Motor
 * und Passung als eigenständige typografische Komposition. Es zeigt genau die
 * Merkmale, die ein Fahrzeug in dieser Liste unterscheidbar machen — und nur
 * belegte Werte, nie geratene.
 */

const KAROSSERIE_LABEL: Record<string, string> = {
  kleinwagen: 'Kleinwagen', kompakt: 'Kompakt', limousine: 'Limousine',
  kombi: 'Kombi', suv: 'SUV', van: 'Van', coupe: 'Coupé',
  cabrio: 'Cabrio', pickup: 'Pickup',
}

const GETRIEBE_LABEL: Record<string, string> = {
  automatik: 'Automatik', manuell: 'Schaltgetriebe',
}

/** Kurzform der Generation fürs Wasserzeichen — nur der prägnante Teil,
 *  z. B. "G20/G21" oder "Mk4". Nie erfunden: fehlt die Generation, bleibt das
 *  Wasserzeichen leer und das Panel trägt stattdessen das neutrale Icon. */
function wasserzeichenText(k: AutoFinderKandidat): string {
  const gen = (k.generation ?? '').trim()
  if (gen && gen.length <= 12) return gen
  if (gen) return gen.split(/[\s(/]/)[0].slice(0, 12)
  return ''
}

interface Props {
  k: AutoFinderKandidat
  rank: number
}

export default function VehicleIdentityPanel({ k, rank }: Props) {
  const wasserzeichen = wasserzeichenText(k)
  const chips = [
    ...k.karosserie.slice(0, 1).map((c) => KAROSSERIE_LABEL[c] ?? c),
    k.kraftstoff,
    ...k.getriebe.slice(0, 1).map((g) => GETRIEBE_LABEL[g] ?? g),
  ].filter(Boolean)

  return (
    <div
      className="relative overflow-hidden shrink-0 sm:w-64 md:w-72 bg-[#fdfbf8] border-b sm:border-b-0 sm:border-r border-[#efe9df]"
      data-testid="vehicle-identity-panel"
    >
      {/* Technisches Raster — sehr dezent, gibt dem Panel Tiefe ohne Bild */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.55]"
        style={{
          backgroundImage:
            'linear-gradient(to right, rgba(40,25,10,0.05) 1px, transparent 1px),' +
            'linear-gradient(to bottom, rgba(40,25,10,0.05) 1px, transparent 1px)',
          backgroundSize: '22px 22px',
        }}
      />
      {/* Orange-Akzent oben links, sehr weich */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -top-16 -left-10 w-56 h-56 rounded-full"
        style={{ background: 'radial-gradient(circle, rgba(249,115,22,0.16) 0%, transparent 70%)' }}
      />
      {/* Generations-Kürzel als großes, sehr transparentes Wasserzeichen */}
      {wasserzeichen ? (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute -bottom-3 right-2 font-bold tracking-tighter text-[64px] leading-none text-[#28190a]/[0.055] select-none"
        >
          {wasserzeichen}
        </span>
      ) : (
        <Car aria-hidden="true" size={92} strokeWidth={1}
          className="pointer-events-none absolute -bottom-4 right-1 text-[#28190a]/[0.06]" />
      )}

      <div className="relative h-full flex flex-col justify-between gap-3 p-4 sm:p-5 min-h-[190px]">
        <div className="flex items-start justify-between gap-2">
          <span className="text-[9px] font-bold tracking-[0.22em] uppercase text-gray-400">
            Vira · AutoFinder
          </span>
          <span className="text-[10px] font-bold tracking-widest uppercase text-white bg-gray-900/90 rounded-full px-2 py-0.5 shadow-sm">
            #{rank}
          </span>
        </div>

        <div className="min-w-0">
          <p className="text-[10px] font-bold tracking-[0.18em] uppercase text-orange-500/90 truncate">
            {k.marke}
          </p>
          <p className="mt-0.5 text-2xl font-bold text-gray-900 tracking-[-0.02em] leading-tight break-words">
            {k.modell}
          </p>
          {(k.generation || k.motor) && (
            <p className="mt-1 text-xs font-medium text-gray-500 truncate">
              {[k.generation, k.motor].filter(Boolean).join(' · ')}
            </p>
          )}
          {k.leistung_ps != null && (
            <p className="mt-1.5 text-sm font-bold text-gray-800 tabular-nums">
              {k.leistung_ps} <span className="text-xs font-semibold text-gray-500">PS</span>
            </p>
          )}
        </div>

        {chips.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {chips.map((c) => (
              <span key={c}
                className="text-[10px] font-medium text-gray-600 bg-white/80 border border-[#e6e1da] rounded-full px-2 py-0.5">
                {c}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
