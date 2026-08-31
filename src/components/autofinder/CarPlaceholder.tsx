// Neutrale Platzhalter-Silhouette, falls das Backend-Bild fehlt oder 404 liefert.
// KEINE Nutzung der alten 88 "Entdecken"-Assets (PRIO 10). Reines Inline-SVG im
// gleichen Line-Art-Duktus wie VIRA_LINE_ART_V1 — dünne graue Linien, weißer
// Grund, keine Marke, kein Text im Bild.

interface Props {
  karosserie?: string[]
  className?: string
}

// Sehr grobe Silhouetten je Klasse — nur zur Orientierung, kein Fahrzeugmodell.
const SHAPES: Record<string, string> = {
  suv: 'M14 40 L18 26 Q20 20 30 19 L52 18 Q60 18 66 24 L78 32 Q84 34 90 36 L104 40 Q108 41 108 46 L108 50 L14 50 Z',
  kombi: 'M12 42 L16 30 Q18 24 28 23 L58 22 L74 23 Q80 24 84 30 L104 40 Q108 41 108 45 L108 50 L12 50 Z',
  van: 'M14 42 L16 24 Q17 19 27 18 L82 18 Q90 19 92 26 L104 40 Q108 42 108 46 L108 50 L14 50 Z',
  limousine: 'M12 44 L20 32 Q26 24 40 23 L62 23 Q72 24 80 31 L100 40 Q108 42 108 46 L108 50 L12 50 Z',
  kompakt: 'M14 44 L22 32 Q27 25 40 24 L58 24 Q68 25 74 33 L96 41 Q104 43 104 47 L104 50 L14 50 Z',
  kleinwagen: 'M18 45 L26 33 Q31 26 42 26 L56 26 Q64 27 70 34 L88 42 Q96 44 96 48 L96 50 L18 50 Z',
  coupe: 'M12 45 L26 33 Q36 24 54 25 Q70 26 82 34 L102 41 Q108 43 108 47 L108 50 L12 50 Z',
  cabrio: 'M12 45 L28 37 Q40 31 56 32 Q72 33 82 37 L102 41 Q108 43 108 47 L108 50 L12 50 Z',
  pickup: 'M12 44 L18 32 Q20 26 30 25 L46 24 Q52 24 55 30 L58 38 L104 38 Q108 39 108 44 L108 50 L12 50 Z',
}

export default function CarPlaceholder({ karosserie, className }: Props) {
  const key = (karosserie ?? []).find((k) => k in SHAPES) ?? 'kompakt'
  const d = SHAPES[key]
  return (
    <svg
      viewBox="0 0 120 60"
      className={className}
      role="img"
      aria-label="Symbolbild — kein Fahrzeugfoto verfügbar"
      preserveAspectRatio="xMidYMid meet"
    >
      <rect width="120" height="60" fill="#ffffff" />
      <path d={d} fill="none" stroke="#c9cdd4" strokeWidth="1.4" strokeLinejoin="round" />
      <circle cx="34" cy="50" r="7" fill="none" stroke="#c9cdd4" strokeWidth="1.4" />
      <circle cx="88" cy="50" r="7" fill="none" stroke="#c9cdd4" strokeWidth="1.4" />
    </svg>
  )
}
