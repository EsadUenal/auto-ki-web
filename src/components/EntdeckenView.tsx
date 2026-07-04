import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'

type CarType = 'coupe' | 'suv' | 'hatch' | 'limousine' | 'kombi' | 'supercar'

interface CarModel {
  id: string
  marke: string
  modell: string
  titel: string
  glow: string
  type: CarType
  frage: string
  img?: string
  imgAussen?: string
  imgMotor?: string
  imgInnen?: string
}

const TYPE_LABEL: Record<CarType, string> = {
  coupe:     'Coupé',
  suv:       'SUV',
  hatch:     'Hot Hatch',
  limousine: 'Limousine',
  kombi:     'Kombi',
  supercar:  'Supercar',
}

const MODELLE: CarModel[] = [
  // BMW
  {
    id: 'bmw-m3', marke: 'BMW', modell: 'M3', titel: 'BMW M3',
    glow: '#3b82f6', type: 'limousine', img: '/cars/M3.png',
    imgAussen: '/cars/m3-au%C3%9Fen.png',
    imgMotor:  '/cars/m3-motor.png',
    imgInnen:  '/cars/m3-r%C3%B6ntgen.png',
    frage: 'Erzähl mir alles über den BMW M3: Motorvarianten, Leistung, Fahrverhalten und typische Schwachstellen.',
  },
  {
    id: 'bmw-m4', marke: 'BMW', modell: 'M4', titel: 'BMW M4',
    glow: '#60a5fa', type: 'coupe', img: '/cars/M4.png',
    imgAussen: '/cars/m4-au%C3%9Fen.png',
    imgMotor:  '/cars/m4-motor-f.png',
    imgInnen:  '/cars/M4-r%C3%B6ntgen-Photoroom.png',
    frage: 'Was macht den BMW M4 besonders? Erkläre mir Motorvarianten, Leistung, Competition-Paket und bekannte Probleme.',
  },
  {
    id: 'bmw-m5', marke: 'BMW', modell: 'M5', titel: 'BMW M5',
    glow: '#2563eb', type: 'limousine', img: '/cars/M5.png',
    imgAussen: '/cars/m5-au%C3%9Fen.png',
    imgMotor:  '/cars/m5-motor-f.png',
    imgInnen:  '/cars/m5-r%C3%B6ntgen-Photoroom.png',
    frage: 'Erzähl mir alles über den BMW M5: Motorvarianten, Leistung, was ihn zur schnellsten Limousine macht und typische Schwachstellen.',
  },
  {
    id: 'bmw-x5m', marke: 'BMW', modell: 'X5 M', titel: 'BMW X5 M',
    glow: '#1d4ed8', type: 'suv', img: '/cars/X5M.png',
    imgAussen: '/cars/x5M-au%C3%9Fen.png',
    imgMotor:  '/cars/X5M-motor-f.png',
    imgInnen:  '/cars/X5-M-R%C3%B6ntgen-Photoroom.png',
    frage: 'Was macht den BMW X5 M besonders? Motor, Leistung, Alltagstauglichkeit als Sport-SUV und bekannte Probleme.',
  },
  // Mercedes-AMG
  {
    id: 'amg-gt', marke: 'Mercedes-AMG', modell: 'GT', titel: 'AMG GT',
    glow: '#94a3b8', type: 'coupe', img: '/cars/MercedesAMGGT.png',
    imgAussen: '/cars/Mercedes-AMG-GT-au%C3%9Fen.png',
    imgMotor:  '/cars/Mercedes-AMG-GT-motor-f.png',
    imgInnen:  '/cars/Mercedes-AMG-GT-r%C3%B6ntgen-Photoroom.png',
    frage: 'Erzähl mir alles über den Mercedes-AMG GT: Motor, Leistung, Charakter und typische Schwachstellen.',
  },
  {
    id: 'g-klasse', marke: 'Mercedes', modell: 'G-Klasse', titel: 'G-Klasse',
    glow: '#64748b', type: 'suv', img: '/cars/GKlasse.png',
    imgAussen: '/cars/Mercedes-G-Klasse-au%C3%9Fen.png',
    imgMotor:  '/cars/Mercedes-GKlasse-motor-f.png',
    imgInnen:  '/cars/Mercedes-GKlasse-r%C3%B6ntgen-Photoroom.png',
    frage: 'Was sollte ich über die Mercedes G-Klasse wissen? Motorvarianten, Geländetauglichkeit und typische Probleme.',
  },
  {
    id: 'c63-amg', marke: 'Mercedes-AMG', modell: 'C 63', titel: 'C 63 AMG',
    glow: '#8b5cf6', type: 'limousine', img: '/cars/AMGC63.png',
    imgAussen: '/cars/Mercedes-AMG-C63-au%C3%9Fen.png',
    imgMotor:  '/cars/Mercedes-C63-motor-f.png',
    imgInnen:  '/cars/Mercedes-AMGC63-r%C3%B6ntgen-Photoroom.png',
    frage: 'Erzähl mir alles über den Mercedes-AMG C 63: V8-Motor, Leistung, Charakter und typische Schwachstellen.',
  },
  // Audi
  {
    id: 'audi-r8', marke: 'Audi', modell: 'R8', titel: 'Audi R8',
    glow: '#ef4444', type: 'supercar', img: '/cars/AudiR8.png',
    imgAussen: '/cars/Audi-R8-au%C3%9Fen.png',
    imgMotor:  '/cars/Audi-R8-motor-f.png',
    imgInnen:  '/cars/audi-R8-r%C3%B6ntgen-Photoroom.png',
    frage: 'Erzähl mir alles über den Audi R8: Motor, Leistung, Alltagstauglichkeit und bekannte Schwachstellen.',
  },
  {
    id: 'audi-rs6', marke: 'Audi', modell: 'RS6 Avant', titel: 'Audi RS6',
    glow: '#f87171', type: 'kombi', img: '/cars/AudiRS6Avant.png',
    imgAussen: '/cars/Audi-Rs6-Avant-au%C3%9Fen.png',
    imgMotor:  '/cars/Audi-RS6-Avant-motor-f.png',
    imgInnen:  '/cars/Audi-rs6-avant-r%C3%B6ntgen-Photoroom.png',
    frage: 'Was macht den Audi RS6 Avant so besonders? Motorvarianten, Leistung, Verbrauch und typische Schwachstellen.',
  },
  {
    id: 'audi-rs3', marke: 'Audi', modell: 'RS3', titel: 'Audi RS3',
    glow: '#dc2626', type: 'limousine', img: '/cars/AudiRS3.png',
    imgAussen: '/cars/Audi-Rs3-au%C3%9Fen.png',
    imgMotor:  '/cars/Audi-RS3-motor-f.png',
    frage: 'Was macht den Audi RS3 so interessant? Motor, Leistung, Torque Vectoring und bekannte Schwachstellen.',
  },
  // VW
  {
    id: 'golf-gti', marke: 'Volkswagen', modell: 'Golf GTI', titel: 'Golf GTI',
    glow: '#22c55e', type: 'hatch', img: '/cars/VolkswagenGolfGTI.png',
    imgAussen: '/cars/VW-Golf-GTI-au%C3%9Fen.png',
    imgMotor:  '/cars/Volkswagen-Golf-GTI-Motor-f.png',
    imgInnen:  '/cars/Vw-golf-gti-r%C3%B6ntgen-Photoroom.png',
    frage: 'Erzähl mir alles über den VW Golf GTI: Generationen, Motorvarianten, was ihn zum Kult macht und typische Probleme.',
  },
  {
    id: 'golf-r', marke: 'Volkswagen', modell: 'Golf R', titel: 'Golf R',
    glow: '#16a34a', type: 'hatch', img: '/cars/VolkswagenGolfR.png',
    imgAussen: '/cars/VW-Golf-R-au%C3%9Fen.png',
    imgMotor:  '/cars/Volkswagen-Golf-R-Motor-f.png',
    imgInnen:  '/cars/vw-golf-r-r%C3%B6ntgen-Photoroom.png',
    frage: 'Was unterscheidet den VW Golf R vom GTI? Motor, Allradantrieb, Leistung und typische Schwachstellen.',
  },
  // Toyota
  {
    id: 'supra', marke: 'Toyota', modell: 'Supra', titel: 'Toyota Supra',
    glow: '#f97316', type: 'coupe', img: '/cars/ToyotaSupra.png',
    imgAussen: '/cars/Toyota-Supra-au%C3%9Fen.png',
    imgMotor:  '/cars/Toyota-Supra-motor-f.png',
    imgInnen:  '/cars/Toyota-Supra-r%C3%B6ntgen-Photoroom.png',
    frage: 'Was muss ich über die Toyota Supra wissen? Generationen, Motor, Leistung und bekannte Schwachstellen.',
  },
  {
    id: 'gr-yaris', marke: 'Toyota', modell: 'GR Yaris', titel: 'GR Yaris',
    glow: '#ea580c', type: 'hatch', img: '/cars/ToyotaGRYaris.png',
    imgAussen: '/cars/Toyota-GR-Yaris-au%C3%9Fen.png',
    imgMotor:  '/cars/Toyota-Gr-Yaris-motor-f.png',
    imgInnen:  '/cars/Toyota-GR-Yaris-r%C3%B6ntgen-Photoroom.png',
    frage: 'Erzähl mir alles über den Toyota GR Yaris: Rallye-DNA, Motor, Allradantrieb und was ihn einzigartig macht.',
  },
  // Porsche
  {
    id: 'porsche-911', marke: 'Porsche', modell: '911', titel: 'Porsche 911',
    glow: '#eab308', type: 'coupe', img: '/cars/Porsche911.png',
    imgAussen: '/cars/Porsche-911-au%C3%9Fen.png',
    imgMotor:  '/cars/Porsche-911-motor-f.png',
    imgInnen:  '/cars/Porsche-911-r%C3%B6ntgen-Photoroom.png',
    frage: 'Erzähl mir alles über den Porsche 911: Generationen, Motorvarianten, was ihn legendär macht und typische Probleme.',
  },
  {
    id: 'porsche-911t', marke: 'Porsche', modell: '911 Turbo', titel: '911 Turbo',
    glow: '#f59e0b', type: 'coupe', img: '/cars/Porsche911Turbo.png',
    imgAussen: '/cars/porsche-911-Turbo-au%C3%9Fen.png',
    imgMotor:  '/cars/Porsche-911-turbo-motor-f.png',
    imgInnen:  '/cars/Porsche-911-turbo-r%C3%B6ntgen-Photoroom.png',
    frage: 'Was unterscheidet den Porsche 911 Turbo vom normalen 911? Motorvarianten, Leistung, Alltagstauglichkeit und Probleme.',
  },
  {
    id: 'cayenne', marke: 'Porsche', modell: 'Cayenne', titel: 'Cayenne',
    glow: '#d97706', type: 'suv', img: '/cars/PorscheCayenne.png',
    imgAussen: '/cars/porsche-cayenne-au%C3%9Fen.png',
    imgMotor:  '/cars/Porsche-Cayenne-motor-f.png',
    imgInnen:  '/cars/Porsche-cayenne-r%C3%B6ntgen-Photoroom.png',
    frage: 'Was sollte ich über den Porsche Cayenne wissen? Motorvarianten, Sport-DNA, Alltagstauglichkeit und bekannte Probleme.',
  },
  // Nissan
  {
    id: 'gtr', marke: 'Nissan', modell: 'GT-R', titel: 'Nissan GT-R',
    glow: '#a855f7', type: 'coupe', img: '/cars/NissanGTR.png',
    imgAussen: '/cars/Nissan-GTR-au%C3%9Fen.png',
    imgMotor:  '/cars/Nissan-GTR-motor-f.png',
    imgInnen:  '/cars/Nissan-GTR-r%C3%B6ntgen-Photoroom.png',
    frage: 'Was macht den Nissan GT-R legendär? Motor, AWD-System, Leistung, Pflege und bekannte Schwachstellen.',
  },
  // Ford
  {
    id: 'mustang', marke: 'Ford', modell: 'Mustang', titel: 'Ford Mustang',
    glow: '#f43f5e', type: 'coupe', img: '/cars/FordMustang.png',
    imgAussen: '/cars/Ford-Mustang-au%C3%9Fen.png',
    imgMotor:  '/cars/Ford-Mustang-motor-f.png',
    imgInnen:  '/cars/Ford-Mustang-r%C3%B6ntgen-Photoroom.png',
    frage: 'Erzähl mir alles über den Ford Mustang: Motorvarianten, American-Muscle-Charakter, Leistung und typische Probleme.',
  },
  // Exoten
  {
    id: 'huracan', marke: 'Lamborghini', modell: 'Huracán', titel: 'Huracán',
    glow: '#fbbf24', type: 'supercar', img: '/cars/LamborghiniHuracan.png',
    imgAussen: '/cars/Lamborghini-Huracan-au%C3%9Fen.png',
    imgMotor:  '/cars/Lamborghini-Huracan-motor-f.png',
    imgInnen:  '/cars/Lamborghini-Huracan-r%C3%B6ntgen-Photoroom.png',
    frage: 'Was macht den Lamborghini Huracán so besonders? Motor, Leistung, Alltag mit einem Supercar und bekannte Schwachstellen.',
  },
  {
    id: 'ferrari-488', marke: 'Ferrari', modell: '488', titel: 'Ferrari 488',
    glow: '#ef4444', type: 'supercar', img: '/cars/ferrari488.png',
    imgAussen: '/cars/Ferrari-488-au%C3%9Fen.png',
    imgMotor:  '/cars/ferrari-488-motor-f.png',
    imgInnen:  '/cars/Ferrari-488-r%C3%B6ntgen-Photoroom.png',
    frage: 'Erzähl mir alles über den Ferrari 488: Motor, Leistung, Handling und was ihn zum besonderen Supercar macht.',
  },
  {
    id: 'mclaren-720s', marke: 'McLaren', modell: '720S', titel: 'McLaren 720S',
    glow: '#f97316', type: 'supercar', img: '/cars/McLaren720s.png',
    imgAussen: '/cars/Ferrari-720s-au%C3%9Fen.png',
    imgMotor:  '/cars/McLaren-720s-motor-f.png',
    imgInnen:  '/cars/Mclaren-720s-r%C3%B6ntgen-Photoroom.png',
    frage: 'Was macht den McLaren 720S so außergewöhnlich? Motor, Leistung, Carbon-Chassis und was ihn von der Konkurrenz abhebt.',
  },
]

// ─── View ────────────────────────────────────────────────────────────────────

interface EntdeckenViewProps {
  onCarSelect: (id: string, titel: string, img?: string, imgAussen?: string, imgMotor?: string, imgInnen?: string) => void
}

export default function EntdeckenView({ onCarSelect }: EntdeckenViewProps) {
  const navigate = useNavigate()
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  function handleCardClick(car: CarModel) {
    onCarSelect(car.id, car.titel, car.img, car.imgAussen, car.imgMotor, car.imgInnen)
    navigate('/chat')
  }

  return (
    <div
      className="h-full overflow-y-auto"
      style={{
        background: 'radial-gradient(ellipse 120% 60% at 50% 0%, #141b26 0%, #0a0c10 45%, #06080c 100%)',
      }}
    >
      {/* ── Header ── */}
      <div className="max-w-7xl mx-auto px-6 pt-12 pb-10">
        <p
          className="text-[10px] font-semibold tracking-[0.25em] uppercase mb-4"
          style={{ color: 'rgba(255,255,255,0.2)' }}
        >
          Vira · Showroom
        </p>
        <h1
          className="text-4xl font-bold mb-3"
          style={{
            color: 'rgba(255,255,255,0.95)',
            letterSpacing: '-0.03em',
            lineHeight: 1.1,
          }}
        >
          Entdecke.
        </h1>
        <p
          className="text-sm"
          style={{ color: 'rgba(255,255,255,0.3)', maxWidth: 380 }}
        >
          Wähle ein Fahrzeug — die KI analysiert sofort: Motorvarianten,
          Schwachstellen, Marktwert.
        </p>
      </div>

      {/* ── Grid ── */}
      <div className="max-w-7xl mx-auto px-6 pb-14">
        <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4 xl:gap-5">
          {MODELLE.map((car) => {
            const hovered = hoveredId === car.id

            return (
              <button
                key={car.id}
                onClick={() => handleCardClick(car)}
                onMouseEnter={() => setHoveredId(car.id)}
                onMouseLeave={() => setHoveredId(null)}
                className="relative rounded-2xl text-left w-full overflow-hidden focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
                style={{
                  background:
                    'linear-gradient(160deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)',
                  border: `1px solid ${hovered ? 'rgba(255,255,255,0.14)' : 'rgba(255,255,255,0.07)'}`,
                  boxShadow: hovered
                    ? `0 28px 64px rgba(0,0,0,0.75), 0 0 48px ${car.glow}1a, inset 0 1px 0 rgba(255,255,255,0.12)`
                    : '0 4px 24px rgba(0,0,0,0.45), inset 0 1px 0 rgba(255,255,255,0.05)',
                  transform: hovered ? 'translateY(-7px) scale(1.02)' : 'translateY(0) scale(1)',
                  transition:
                    'transform 0.32s cubic-bezier(0.34,1.56,0.64,1), box-shadow 0.32s ease, border-color 0.2s ease',
                  willChange: 'transform',
                }}
              >
                {/* Ambient color wash */}
                <div
                  className="absolute inset-0 pointer-events-none rounded-2xl"
                  style={{
                    background: `radial-gradient(ellipse at 50% 35%, ${car.glow}28 0%, transparent 68%)`,
                    opacity: hovered ? 1 : 0.45,
                    transition: 'opacity 0.32s ease',
                  }}
                />

                {/* ── Car image area ── */}
                <div className="relative px-5 pt-7 pb-3">
                  {/* Floor glow under the car */}
                  <div
                    className="absolute bottom-1 left-1/2 pointer-events-none"
                    style={{
                      width: '70%',
                      height: '40%',
                      transform: 'translateX(-50%)',
                      background: `radial-gradient(ellipse at 50% 100%, ${car.glow}38 0%, transparent 75%)`,
                      opacity: hovered ? 1 : 0.35,
                      transition: 'opacity 0.32s ease',
                      filter: 'blur(6px)',
                    }}
                  />

                  {/* Car image */}
                  <div className="relative z-10" style={{ aspectRatio: '16/9' }}>
                    {car.img ? (
                      <img
                        src={car.img}
                        alt={car.titel}
                        className="w-full h-full object-contain"
                        draggable={false}
                        style={{
                          filter: hovered
                            ? `drop-shadow(0 6px 22px ${car.glow}70) brightness(1.1)`
                            : `drop-shadow(0 3px 12px ${car.glow}42)`,
                          transform: hovered
                            ? 'scale(1.07) translateY(-4px)'
                            : 'scale(1) translateY(0)',
                          transition:
                            'transform 0.38s cubic-bezier(0.34,1.56,0.64,1), filter 0.32s ease',
                          willChange: 'transform',
                        }}
                      />
                    ) : (
                      /* Fallback SVG silhouette (no image available) */
                      <div
                        style={{
                          color: car.glow,
                          filter: `drop-shadow(0 0 8px ${car.glow}80)`,
                        }}
                      >
                        <FallbackSilhouette />
                      </div>
                    )}
                  </div>
                </div>

                {/* ── Divider ── */}
                <div
                  className="mx-5"
                  style={{
                    height: 1,
                    background: `linear-gradient(90deg, transparent, ${car.glow}35, transparent)`,
                    opacity: hovered ? 1 : 0.5,
                    transition: 'opacity 0.32s ease',
                  }}
                />

                {/* ── Text area ── */}
                <div className="relative z-10 px-5 pt-3.5 pb-4">
                  <p
                    className="text-[10px] font-semibold tracking-[0.18em] uppercase mb-1"
                    style={{ color: `${car.glow}bb` }}
                  >
                    {car.marke}
                  </p>
                  <div className="flex items-end justify-between gap-2">
                    <p
                      className="text-base font-bold leading-tight"
                      style={{
                        color: 'rgba(255,255,255,0.92)',
                        letterSpacing: '-0.015em',
                      }}
                    >
                      {car.modell}
                    </p>
                    <span
                      className="text-[9px] font-medium tracking-wide uppercase px-2 py-0.5 rounded-full shrink-0 mb-px"
                      style={{
                        color: 'rgba(255,255,255,0.3)',
                        border: '1px solid rgba(255,255,255,0.09)',
                        background: 'rgba(255,255,255,0.04)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {TYPE_LABEL[car.type]}
                    </span>
                  </div>
                </div>

                {/* Arrow — visible on hover */}
                <div
                  className="absolute top-3.5 right-3.5 z-20"
                  style={{
                    opacity: hovered ? 1 : 0,
                    transform: hovered ? 'translate(0,0)' : 'translate(-3px,3px)',
                    transition: 'opacity 0.18s ease, transform 0.18s ease',
                  }}
                >
                  <ArrowUpRight size={13} style={{ color: 'rgba(255,255,255,0.45)' }} />
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// Fallback für Karten ohne Bild
function FallbackSilhouette() {
  return (
    <svg viewBox="0 0 200 76" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <path
        d="M 20 62 Q 8 62 8 50 Q 8 42 16 38 L 44 30 L 58 22 L 72 12 Q 86 9 118 9 L 138 11 C 150 14 160 26 166 40 L 172 54 Q 176 62 176 62 L 172 62 Q 170 50 154 50 Q 138 50 128 62 H 70 Q 66 50 46 50 Q 26 50 20 62 Z"
        stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" strokeLinecap="round"
      />
      <circle cx="46" cy="62" r="12" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="154" cy="62" r="12" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="46" cy="62" r="4.5" stroke="currentColor" strokeWidth="1" />
      <circle cx="154" cy="62" r="4.5" stroke="currentColor" strokeWidth="1" />
      <ellipse cx="100" cy="74" rx="84" ry="3" fill="currentColor" opacity={0.1} />
    </svg>
  )
}
