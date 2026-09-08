/**
 * Der gemeinsame Untergrund einer Produktbühne.
 *
 * Raster, Lichtschein und Generations-Wasserzeichen liegen bewusst HIER und
 * nicht in der Identitätsspalte. Solange jede Spalte ihren eigenen Untergrund
 * mitbringt, endet das Raster an einer sichtbaren Rechteckkante, und die linke
 * Hälfte liest sich als eingeklebtes Bild. Über die ganze Bühne gezogen und
 * nach rechts weich ausgeblendet, bindet derselbe Untergrund beide Spalten
 * zusammen: das Auge sieht eine Oberfläche mit zwei Bereichen.
 *
 * Das Wasserzeichen sitzt absichtlich AUF der Naht. Ein Element, das über die
 * Trennung hinwegläuft, ist das stärkste Signal dafür, dass darunter kein
 * zweites Bild liegt.
 */

interface Props {
  /** Kürzel der Generation, z. B. „F40". Fehlt es, bleibt die Fläche leer. */
  wasserzeichen?: string | null
  dunkel?: boolean
}

export default function StageUntergrund({ wasserzeichen, dunkel = false }: Props) {
  const linie = dunkel ? 'rgba(255,255,255,0.045)' : 'rgba(40,25,10,0.045)'

  return (
    <>
      {/* Technisches Raster, links kräftig, zur Mitte hin verschwindend */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          backgroundImage:
            `linear-gradient(to right, ${linie} 1px, transparent 1px),`
            + `linear-gradient(to bottom, ${linie} 1px, transparent 1px)`,
          backgroundSize: '22px 22px',
          maskImage: 'linear-gradient(to right, #000 0%, #000 26%, transparent 64%)',
          WebkitMaskImage: 'linear-gradient(to right, #000 0%, #000 26%, transparent 64%)',
        }}
      />

      {/* Weicher Lichtschein oben links, ohne eigene Kontur */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -left-16 -top-20 h-64 w-64 rounded-full"
        style={{
          background: dunkel
            ? 'radial-gradient(circle, rgba(249,115,22,0.14) 0%, transparent 70%)'
            : 'radial-gradient(circle, rgba(249,115,22,0.13) 0%, transparent 70%)',
        }}
      />

      {/* Generations-Kürzel, quer über die Naht */}
      {wasserzeichen && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute bottom-1 left-[9.5rem] select-none text-[86px] font-bold leading-none tracking-tighter md:left-[10.5rem]"
          style={{ color: dunkel ? 'rgba(255,255,255,0.035)' : 'rgba(40,25,10,0.045)' }}
        >
          {wasserzeichen}
        </span>
      )}
    </>
  )
}

/** Die weiche Naht zwischen Identität und Analyse. Nie eine harte Kante. */
export function StageNaht({ dunkel = false }: { dunkel?: boolean }) {
  return (
    <div
      aria-hidden="true"
      data-stage-naht
      className="pointer-events-none absolute inset-y-8 left-60 hidden w-px sm:block md:left-64"
      style={{
        background: dunkel
          ? 'linear-gradient(to bottom, transparent, rgba(255,255,255,0.10), transparent)'
          : 'linear-gradient(to bottom, transparent, rgba(40,25,10,0.10), transparent)',
      }}
    />
  )
}
