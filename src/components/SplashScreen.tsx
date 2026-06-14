import { useEffect, useState } from 'react'
import { Car } from 'lucide-react'

interface SplashScreenProps {
  onDone: () => void
}

const STREAKS = [
  { top: 22, h: 1,   dur: 1.3, delay: 0.15 },
  { top: 31, h: 1.5, dur: 1.6, delay: 0.40 },
  { top: 39, h: 1,   dur: 1.1, delay: 0.70 },
  { top: 46, h: 2.5, dur: 1.9, delay: 0.05 },
  { top: 51, h: 1,   dur: 1.4, delay: 0.55 },
  { top: 58, h: 2,   dur: 1.2, delay: 0.30 },
  { top: 64, h: 1,   dur: 1.7, delay: 0.80 },
  { top: 71, h: 1,   dur: 1.0, delay: 0.20 },
  { top: 77, h: 1.5, dur: 1.5, delay: 0.65 },
]

export default function SplashScreen({ onDone }: SplashScreenProps) {
  const [fading, setFading] = useState(false)

  useEffect(() => {
    const t1 = setTimeout(() => setFading(true), 1500)
    const t2 = setTimeout(onDone, 1900)
    return () => { clearTimeout(t1); clearTimeout(t2) }
  }, [onDone])

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 9999,
        background: '#0a0a0a',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '18px',
        willChange: 'opacity',
        opacity: fading ? 0 : 1,
        transition: 'opacity 0.4s ease',
        pointerEvents: fading ? 'none' : 'auto',
      }}
    >
      {STREAKS.map((s, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            top: `${s.top}%`,
            height: `${s.h}px`,
            background:
              'linear-gradient(to right, transparent 0%, rgba(249,115,22,0.07) 20%, rgba(255,255,255,0.44) 50%, rgba(249,115,22,0.07) 80%, transparent 100%)',
            animation: `splash-streak ${s.dur}s ${s.delay}s ease-in-out both`,
          }}
        />
      ))}

      <div
        style={{
          width: '76px',
          height: '76px',
          borderRadius: '22px',
          background: '#f97316',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 55px rgba(249,115,22,0.22), 0 0 110px rgba(249,115,22,0.08)',
        }}
      >
        <Car size={36} color="white" strokeWidth={1.6} />
      </div>

      <div style={{ textAlign: 'center' }}>
        <p style={{ color: '#ffffff', fontSize: '24px', fontWeight: 600, letterSpacing: '-0.5px', margin: 0, lineHeight: 1 }}>
          Auto-KI
        </p>
        <p style={{ color: '#444', fontSize: '11px', marginTop: '6px', letterSpacing: '0.18em', textTransform: 'uppercase' }}>
          Intelligente Kfz-Beratung
        </p>
      </div>
    </div>
  )
}
