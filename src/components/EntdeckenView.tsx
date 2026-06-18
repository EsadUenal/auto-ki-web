import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowUpRight } from 'lucide-react'

type CarType = 'coupe' | 'suv'

interface CarModel {
  id: string
  marke: string
  modell: string
  titel: string
  glow: string
  type: CarType
  frage: string
  img?: string        // Karten-Thumbnail
  imgAussen?: string  // Außenansicht-Panel
  imgMotor?: string   // Motor-Panel
  imgInnen?: string   // Röntgen-Panel
}

const MODELLE: CarModel[] = [
  // BMW
  {
    id: 'bmw-m3', marke: 'BMW', modell: 'M3', titel: 'BMW M3',
    glow: '#3b82f6', type: 'coupe', img: '/cars/M3.png',
    imgAussen: '/cars/m3-au%C3%9Fen.png',
    imgMotor:  '/cars/m3-motor.png',
    imgInnen:  '/cars/m3-r%C3%B6ntgen.png',
    frage: 'Erzähl mir alles über den BMW M3: Motorvarianten, Leistung, Fahrverhalten und typische Schwachstellen.',
  },
  {
    id: 'bmw-m4', marke: 'BMW', modell: 'M4', titel: 'BMW M4',
    glow: '#60a5fa', type: 'coupe', img: '/cars/M4.png',
    imgAussen: '/cars/m4-au%C3%9Fen.png',
    frage: 'Was macht den BMW M4 besonders? Erkläre mir Motorvarianten, Leistung, Competition-Paket und bekannte Probleme.',
  },
  {
    id: 'bmw-m5', marke: 'BMW', modell: 'M5', titel: 'BMW M5',
    glow: '#2563eb', type: 'coupe', img: '/cars/M5.png',
    imgAussen: '/cars/m5-au%C3%9Fen.png',
    frage: 'Erzähl mir alles über den BMW M5: Motorvarianten, Leistung, was ihn zur schnellsten Limousine macht und typische Schwachstellen.',
  },
  {
    id: 'bmw-x5m', marke: 'BMW', modell: 'X5 M', titel: 'BMW X5 M',
    glow: '#1d4ed8', type: 'suv', img: '/cars/X5M.png',
    imgAussen: '/cars/x5M-au%C3%9Fen.png',
    frage: 'Was macht den BMW X5 M besonders? Motor, Leistung, Alltagstauglichkeit als Sport-SUV und bekannte Probleme.',
  },
  // Mercedes-AMG
  {
    id: 'amg-gt', marke: 'Mercedes-AMG', modell: 'GT', titel: 'AMG GT',
    glow: '#94a3b8', type: 'coupe', img: '/cars/MercedesAMGGT.png',
    imgAussen: '/cars/Mercedes-AMG-GT-au%C3%9Fen.png',
    frage: 'Erzähl mir alles über den Mercedes-AMG GT: Motor, Leistung, Charakter und typische Schwachstellen.',
  },
  {
    id: 'g-klasse', marke: 'Mercedes', modell: 'G-Klasse', titel: 'G-Klasse',
    glow: '#64748b', type: 'suv', img: '/cars/GKlasse.png',
    imgAussen: '/cars/Mercedes-G-Klasse-au%C3%9Fen.png',
    frage: 'Was sollte ich über die Mercedes G-Klasse wissen? Motorvarianten, Geländetauglichkeit und typische Probleme.',
  },
  {
    id: 'c63-amg', marke: 'Mercedes-AMG', modell: 'C 63', titel: 'C 63 AMG',
    glow: '#8b5cf6', type: 'coupe', img: '/cars/AMGC63.png',
    imgAussen: '/cars/Mercedes-AMG-C63-au%C3%9Fen.png',
    frage: 'Erzähl mir alles über den Mercedes-AMG C 63: V8-Motor, Leistung, Charakter und typische Schwachstellen.',
  },
  // Audi
  {
    id: 'audi-r8', marke: 'Audi', modell: 'R8', titel: 'Audi R8',
    glow: '#ef4444', type: 'coupe', img: '/cars/AudiR8.png',
    imgAussen: '/cars/Audi-R8-au%C3%9Fen.png',
    frage: 'Erzähl mir alles über den Audi R8: Motor, Leistung, Alltagstauglichkeit und bekannte Schwachstellen.',
  },
  {
    id: 'audi-rs6', marke: 'Audi', modell: 'RS6 Avant', titel: 'Audi RS6',
    glow: '#f87171', type: 'coupe', img: '/cars/AudiRS6Avant.png',
    imgAussen: '/cars/Audi-Rs6-Avant-au%C3%9Fen.png',
    frage: 'Was macht den Audi RS6 Avant so besonders? Motorvarianten, Leistung, Verbrauch und typische Schwachstellen.',
  },
  {
    id: 'audi-rs3', marke: 'Audi', modell: 'RS3', titel: 'Audi RS3',
    glow: '#dc2626', type: 'coupe', img: '/cars/AudiRS3.png',
    imgAussen: '/cars/Audi-Rs3-au%C3%9Fen.png',
    frage: 'Was macht den Audi RS3 so interessant? Motor, Leistung, Torque Vectoring und bekannte Schwachstellen.',
  },
  // VW
  {
    id: 'golf-gti', marke: 'Volkswagen', modell: 'Golf GTI', titel: 'Golf GTI',
    glow: '#22c55e', type: 'coupe', img: '/cars/VolkswagenGolfGTI.png',
    imgAussen: '/cars/VW-Golf-GTI-au%C3%9Fen.png',
    frage: 'Erzähl mir alles über den VW Golf GTI: Generationen, Motorvarianten, was ihn zum Kult macht und typische Probleme.',
  },
  {
    id: 'golf-r', marke: 'Volkswagen', modell: 'Golf R', titel: 'Golf R',
    glow: '#16a34a', type: 'coupe', img: '/cars/VolkswagenGolfR.png',
    imgAussen: '/cars/VW-Golf-R-au%C3%9Fen.png',
    frage: 'Was unterscheidet den VW Golf R vom GTI? Motor, Allradantrieb, Leistung und typische Schwachstellen.',
  },
  // Toyota
  {
    id: 'supra', marke: 'Toyota', modell: 'Supra', titel: 'Toyota Supra',
    glow: '#f97316', type: 'coupe', img: '/cars/ToyotaSupra.png',
    imgAussen: '/cars/Toyota-Supra-au%C3%9Fen.png',
    frage: 'Was muss ich über die Toyota Supra wissen? Generationen, Motor, Leistung und bekannte Schwachstellen.',
  },
  {
    id: 'gr-yaris', marke: 'Toyota', modell: 'GR Yaris', titel: 'GR Yaris',
    glow: '#ea580c', type: 'coupe', img: '/cars/ToyotaGRYaris.png',
    imgAussen: '/cars/Toyota-GR-Yaris-au%C3%9Fen.png',
    frage: 'Erzähl mir alles über den Toyota GR Yaris: Rallye-DNA, Motor, Allradantrieb und was ihn einzigartig macht.',
  },
  // Porsche
  {
    id: 'porsche-911', marke: 'Porsche', modell: '911', titel: 'Porsche 911',
    glow: '#eab308', type: 'coupe', img: '/cars/Porsche911.png',
    imgAussen: '/cars/Porsche-911-au%C3%9Fen.png',
    frage: 'Erzähl mir alles über den Porsche 911: Generationen, Motorvarianten, was ihn legendär macht und typische Probleme.',
  },
  {
    id: 'porsche-911t', marke: 'Porsche', modell: '911 Turbo', titel: '911 Turbo',
    glow: '#f59e0b', type: 'coupe', img: '/cars/Porsche911Turbo.png',
    imgAussen: '/cars/porsche-911-Turbo-au%C3%9Fen.png',
    frage: 'Was unterscheidet den Porsche 911 Turbo vom normalen 911? Motorvarianten, Leistung, Alltagstauglichkeit und Probleme.',
  },
  {
    id: 'cayenne', marke: 'Porsche', modell: 'Cayenne', titel: 'Cayenne',
    glow: '#d97706', type: 'suv', img: '/cars/PorscheCayenne.png',
    imgAussen: '/cars/porsche-cayenne-au%C3%9Fen.png',
    frage: 'Was sollte ich über den Porsche Cayenne wissen? Motorvarianten, Sport-DNA, Alltagstauglichkeit und bekannte Probleme.',
  },
  // Nissan
  {
    id: 'gtr', marke: 'Nissan', modell: 'GT-R', titel: 'Nissan GT-R',
    glow: '#a855f7', type: 'coupe', img: '/cars/NissanGTR.png',
    imgAussen: '/cars/Nissan-GTR-au%C3%9Fen.png',
    frage: 'Was macht den Nissan GT-R legendär? Motor, AWD-System, Leistung, Pflege und bekannte Schwachstellen.',
  },
  // Ford
  {
    id: 'mustang', marke: 'Ford', modell: 'Mustang', titel: 'Ford Mustang',
    glow: '#f43f5e', type: 'coupe', img: '/cars/FordMustang.png',
    imgAussen: '/cars/Ford-Mustang-au%C3%9Fen.png',
    frage: 'Erzähl mir alles über den Ford Mustang: Motorvarianten, American-Muscle-Charakter, Leistung und typische Probleme.',
  },
  // Exoten
  {
    id: 'huracan', marke: 'Lamborghini', modell: 'Huracán', titel: 'Huracán',
    glow: '#fbbf24', type: 'coupe', img: '/cars/LamborghiniHuracan.png',
    imgAussen: '/cars/Lamborghini-Huracan-au%C3%9Fen.png',
    frage: 'Was macht den Lamborghini Huracán so besonders? Motor, Leistung, Alltag mit einem Supercar und bekannte Schwachstellen.',
  },
  {
    id: 'ferrari-488', marke: 'Ferrari', modell: '488', titel: 'Ferrari 488',
    glow: '#ef4444', type: 'coupe', img: '/cars/ferrari488.png',
    imgAussen: '/cars/Ferrari-488-au%C3%9Fen.png',
    frage: 'Erzähl mir alles über den Ferrari 488: Motor, Leistung, Handling und was ihn zum besonderen Supercar macht.',
  },
  {
    id: 'mclaren-720s', marke: 'McLaren', modell: '720S', titel: 'McLaren 720S',
    glow: '#f97316', type: 'coupe', img: '/cars/McLaren720s.png',
    imgAussen: '/cars/Ferrari-720s-au%C3%9Fen.png',
    frage: 'Was macht den McLaren 720S so außergewöhnlich? Motor, Leistung, Carbon-Chassis und was ihn von der Konkurrenz abhebt.',
  },
]

// ─── SVG Silhouettes ────────────────────────────────────────────────────────

function CoupeSilhouette() {
  return (
    <svg viewBox="0 0 200 76" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      {/* Main body outline with wheel arch cutouts */}
      <path
        d="M 20 62 Q 8 62 8 50 Q 8 42 16 38 L 44 30 L 58 22 L 72 12 Q 86 9 118 9 L 138 11 C 150 14 160 26 166 40 L 172 54 Q 176 62 176 62 L 172 62 Q 170 50 154 50 Q 138 50 128 62 H 70 Q 66 50 46 50 Q 26 50 20 62 Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {/* Greenhouse / window area */}
      <path
        d="M 58 22 L 72 12 Q 86 9 118 9 L 138 11 C 150 14 160 26 166 40 L 62 34 Z"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinejoin="round"
        fill="currentColor"
        fillOpacity={0.06}
        opacity={0.65}
      />
      {/* B-pillar */}
      <line x1="104" y1="9" x2="102" y2="34" stroke="currentColor" strokeWidth="0.9" opacity={0.65} />
      {/* Wheels */}
      <circle cx="46" cy="62" r="12" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="154" cy="62" r="12" stroke="currentColor" strokeWidth="1.4" />
      {/* Wheel hubs */}
      <circle cx="46" cy="62" r="4.5" stroke="currentColor" strokeWidth="1" />
      <circle cx="154" cy="62" r="4.5" stroke="currentColor" strokeWidth="1" />
      {/* Y-spokes — front */}
      <line x1="46" y1="57.5" x2="46" y2="50" stroke="currentColor" strokeWidth="1" />
      <line x1="42" y1="64.5" x2="35" y2="68.5" stroke="currentColor" strokeWidth="1" />
      <line x1="50" y1="64.5" x2="57" y2="68.5" stroke="currentColor" strokeWidth="1" />
      {/* Y-spokes — rear */}
      <line x1="154" y1="57.5" x2="154" y2="50" stroke="currentColor" strokeWidth="1" />
      <line x1="150" y1="64.5" x2="143" y2="68.5" stroke="currentColor" strokeWidth="1" />
      <line x1="158" y1="64.5" x2="165" y2="68.5" stroke="currentColor" strokeWidth="1" />
      {/* Ground shadow */}
      <ellipse cx="100" cy="74" rx="84" ry="3" fill="currentColor" opacity={0.1} />
    </svg>
  )
}

function SUVSilhouette() {
  return (
    <svg viewBox="0 0 200 80" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      {/* Main body outline */}
      <path
        d="M 18 63 Q 6 63 6 52 L 18 38 L 30 20 L 42 10 H 148 L 162 20 L 172 38 L 178 54 Q 182 63 184 63 L 174 63 Q 174 49 154 49 Q 134 49 126 63 H 72 Q 72 49 46 49 Q 24 49 18 63 Z"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
      {/* Greenhouse */}
      <path
        d="M 30 20 L 42 10 H 148 L 162 20 L 170 36 L 34 36 Z"
        stroke="currentColor"
        strokeWidth="1"
        strokeLinejoin="round"
        fill="currentColor"
        fillOpacity={0.06}
        opacity={0.65}
      />
      {/* B-pillar */}
      <line x1="100" y1="10" x2="100" y2="36" stroke="currentColor" strokeWidth="0.9" opacity={0.65} />
      {/* Wheels (larger for SUV) */}
      <circle cx="46" cy="63" r="14" stroke="currentColor" strokeWidth="1.4" />
      <circle cx="154" cy="63" r="14" stroke="currentColor" strokeWidth="1.4" />
      {/* Hubs */}
      <circle cx="46" cy="63" r="5.5" stroke="currentColor" strokeWidth="1" />
      <circle cx="154" cy="63" r="5.5" stroke="currentColor" strokeWidth="1" />
      {/* Y-spokes — front */}
      <line x1="46" y1="57.5" x2="46" y2="49" stroke="currentColor" strokeWidth="1" />
      <line x1="41" y1="66" x2="34" y2="70" stroke="currentColor" strokeWidth="1" />
      <line x1="51" y1="66" x2="58" y2="70" stroke="currentColor" strokeWidth="1" />
      {/* Y-spokes — rear */}
      <line x1="154" y1="57.5" x2="154" y2="49" stroke="currentColor" strokeWidth="1" />
      <line x1="149" y1="66" x2="142" y2="70" stroke="currentColor" strokeWidth="1" />
      <line x1="159" y1="66" x2="166" y2="70" stroke="currentColor" strokeWidth="1" />
      {/* Ground shadow */}
      <ellipse cx="100" cy="78" rx="84" ry="3" fill="currentColor" opacity={0.1} />
    </svg>
  )
}

function CarSilhouette({ type }: { type: CarType }) {
  return type === 'suv' ? <SUVSilhouette /> : <CoupeSilhouette />
}

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
      className="h-full overflow-y-auto scrollbar-thin"
      style={{ background: 'linear-gradient(160deg, #090c12 0%, #0a0a0a 100%)' }}
    >
      <div className="max-w-5xl mx-auto px-6 py-8">
        <div className="mb-8">
          <h1
            className="text-2xl font-bold tracking-tight mb-1.5"
            style={{ color: 'rgba(255,255,255,0.92)' }}
          >
            Entdecken
          </h1>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.35)' }}>
            Wähle ein Fahrzeug und starte direkt eine KI-Analyse
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
          {MODELLE.map((car) => {
            const hovered = hoveredId === car.id
            return (
              <button
                key={car.id}
                onClick={() => handleCardClick(car)}
                onMouseEnter={() => setHoveredId(car.id)}
                onMouseLeave={() => setHoveredId(null)}
                className="relative rounded-2xl overflow-hidden text-left w-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
                style={{
                  background:
                    'linear-gradient(145deg, rgba(255,255,255,0.06) 0%, rgba(255,255,255,0.02) 100%)',
                  border: '1px solid rgba(255,255,255,0.09)',
                  boxShadow: hovered
                    ? `0 20px 48px rgba(0,0,0,0.7), 0 0 50px ${car.glow}28, inset 0 1px 0 rgba(255,255,255,0.1)`
                    : '0 2px 16px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)',
                  transform: hovered ? 'translateY(-8px)' : 'translateY(0)',
                  transition:
                    'transform 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), box-shadow 0.3s ease',
                  willChange: 'transform',
                }}
              >
                {/* Colored radial wash */}
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background: `radial-gradient(ellipse at 20% 20%, ${car.glow}1e 0%, transparent 60%)`,
                    opacity: hovered ? 1 : 0.6,
                    transition: 'opacity 0.3s ease',
                  }}
                />
                {/* Shimmer on hover */}
                <div
                  className="absolute inset-0 pointer-events-none"
                  style={{
                    background:
                      'linear-gradient(135deg, rgba(255,255,255,0.07) 0%, transparent 50%)',
                    opacity: hovered ? 1 : 0,
                    transition: 'opacity 0.3s ease',
                  }}
                />

                <div className="relative z-10 p-5">
                  {/* Car silhouette + arrow */}
                  <div className="flex items-start justify-between mb-4">
                    <div
                      className="w-28 h-14"
                      style={{
                        color: car.glow,
                        filter: `drop-shadow(0 0 6px ${car.glow}88)`,
                      }}
                    >
                      {car.img ? (
                        <img
                          src={car.img}
                          alt={car.titel}
                          className="w-full h-full object-contain"
                          draggable={false}
                        />
                      ) : (
                        <CarSilhouette type={car.type} />
                      )}
                    </div>
                    <ArrowUpRight
                      size={14}
                      style={{
                        color: 'rgba(255,255,255,0.45)',
                        opacity: hovered ? 1 : 0,
                        transform: hovered ? 'translate(0,0)' : 'translate(-3px,3px)',
                        transition: 'opacity 0.2s ease, transform 0.2s ease',
                        flexShrink: 0,
                        marginTop: 2,
                      }}
                    />
                  </div>

                  {/* Text */}
                  <div>
                    <p
                      className="text-xs font-semibold tracking-widest uppercase mb-0.5"
                      style={{ color: `${car.glow}cc` }}
                    >
                      {car.marke}
                    </p>
                    <p
                      className="text-base font-bold leading-tight"
                      style={{ color: 'rgba(255,255,255,0.9)' }}
                    >
                      {car.modell}
                    </p>
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>
    </div>
  )
}
