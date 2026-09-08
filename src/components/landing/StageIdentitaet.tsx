import type { AutoFinderKandidat } from '../autofinder/logic'

/**
 * Die Fahrzeugidentität als Teil der Produktbühne — nicht als eigene Karte.
 *
 * WARUM NICHT DAS PRODUKT-PANEL AUS AUTOFINDER
 * --------------------------------------------
 * `autofinder/VehicleIdentityPanel` ist für die Ergebnisliste gebaut: eigener
 * Hintergrund, eigene Rasterfläche, eigene Trennkante nach rechts, eigenes
 * grosses Wasserzeichen. In einer schmalen Listenkarte ist das genau richtig.
 * Im Hero, wo die Fläche viel grösser ist, liest sich dasselbe Panel als
 * rechteckiges Bild, das in eine weisse Karte geklebt wurde: harte Kante,
 * anderer Untergrund, eigenes Raster, das exakt an seiner Box endet.
 *
 * Diese Fassung zeigt DIESELBEN Daten, aber ohne eigenen Kasten. Sie bringt
 * keinen Hintergrund, kein Raster und keine Kante mit. Beides gehört hier der
 * Bühne, die es über beide Spalten hinweg trägt — dadurch lesen Identität und
 * Analyse als eine Oberfläche.
 *
 * Unverändert bleibt der Kern der Produktentscheidung: keine Fahrzeugbilder.
 * Gezeigt werden nur belegte Werte, nie geratene.
 */

const KAROSSERIE_LABEL: Record<string, string> = {
  kleinwagen: 'Kleinwagen', kompakt: 'Kompakt', limousine: 'Limousine',
  kombi: 'Kombi', suv: 'SUV', van: 'Van', coupe: 'Coupé',
  cabrio: 'Cabrio', pickup: 'Pickup',
}

const GETRIEBE_LABEL: Record<string, string> = {
  automatik: 'Automatik', manuell: 'Schaltgetriebe',
}

interface Props {
  k: AutoFinderKandidat
  rank: number
  /** true auf dunklem Untergrund (Prüf- und Entscheidungsbühne). */
  dunkel?: boolean
}

export default function StageIdentitaet({ k, rank, dunkel = false }: Props) {
  const chips = [
    ...k.karosserie.slice(0, 1).map((c) => KAROSSERIE_LABEL[c] ?? c),
    k.kraftstoff,
    ...k.getriebe.slice(0, 1).map((g) => GETRIEBE_LABEL[g] ?? g),
  ].filter(Boolean)

  return (
    <div
      data-stage-identitaet
      className="relative flex shrink-0 flex-col gap-4 p-5 sm:w-60 md:w-64"
    >
      <div className="flex items-start justify-between gap-2">
        <span className={`text-[9px] font-bold uppercase tracking-[0.22em] ${dunkel ? 'text-white/35' : 'text-gray-400'}`}>
          Vira · AutoFinder
        </span>
        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest ${
          dunkel ? 'bg-white/10 text-white/70' : 'bg-gray-900/90 text-white'
        }`}>
          #{rank}
        </span>
      </div>

      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-orange-500/90">
          {k.marke}
        </p>
        <p className={`mt-0.5 text-[28px] font-bold leading-none tracking-[-0.03em] ${dunkel ? 'text-white' : 'text-gray-900'}`}>
          {k.modell}
        </p>
        {(k.generation || k.motor) && (
          <p className={`mt-1.5 text-xs font-medium ${dunkel ? 'text-white/45' : 'text-gray-500'}`}>
            {[k.generation, k.motor].filter(Boolean).join(' · ')}
          </p>
        )}
        {k.leistung_ps != null && (
          <p className={`mt-1 text-sm font-bold tabular-nums ${dunkel ? 'text-white/85' : 'text-gray-800'}`}>
            {k.leistung_ps} <span className={`text-xs font-semibold ${dunkel ? 'text-white/40' : 'text-gray-500'}`}>PS</span>
          </p>
        )}
      </div>

      {chips.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {chips.map((c) => (
            <span
              key={c}
              className={`rounded-full border px-2 py-0.5 text-[10px] font-medium ${
                dunkel
                  ? 'border-white/10 bg-white/[0.04] text-white/60'
                  : 'border-[#e6e1da] bg-white/70 text-gray-600'
              }`}
            >
              {c}
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
