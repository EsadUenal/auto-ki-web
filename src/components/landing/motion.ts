import { useEffect, useRef, useState } from 'react'

/**
 * Bewegungs-Bausteine der Landingpage — ohne zusätzliche Abhängigkeit.
 *
 * IntersectionObserver, requestAnimationFrame, CSS-Transitions und
 * `position: sticky` reichen für alles, was diese Seite braucht. Eine
 * Animationsbibliothek würde hier nur Bundle kosten: bewegt werden
 * ausschliesslich `transform` und `opacity`, und die Choreografie hängt am
 * Scrollfortschritt, nicht an komplexen Timelines.
 *
 * REDUZIERTE BEWEGUNG
 * -------------------
 * Jeder Baustein hier hat einen Ruhezustand, der den ENDZUSTAND zeigt — nicht
 * einen leeren. Wer `prefers-reduced-motion: reduce` gesetzt hat, sieht die
 * Seite vollständig und sofort; es fehlt nur die Bewegung dorthin. Ein
 * Reduced-Motion-Fallback, der Inhalte verschluckt, wäre schlimmer als die
 * Animation.
 */

/** True, wenn das System reduzierte Bewegung wünscht. Reagiert auf Änderungen. */
export function useReducedMotion(): boolean {
  const [reduziert, setReduziert] = useState(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return false
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  })

  useEffect(() => {
    if (!window.matchMedia) return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const an = (e: MediaQueryListEvent) => setReduziert(e.matches)
    mq.addEventListener('change', an)
    return () => mq.removeEventListener('change', an)
  }, [])

  return reduziert
}

/**
 * Meldet, sobald das Element sichtbar wird — und bleibt dann dabei.
 *
 * Bewusst einmalig: ein Reveal, das beim Zurückscrollen wieder verschwindet,
 * wirkt wie ein Fehler, nicht wie Gestaltung.
 */
export function useInView<T extends Element>(
  optionen: { schwelle?: number; rand?: string } = {},
): [React.RefObject<T>, boolean] {
  const ref = useRef<T>(null)
  const [drin, setDrin] = useState(false)
  const { schwelle = 0.2, rand = '0px 0px -10% 0px' } = optionen

  useEffect(() => {
    const el = ref.current
    if (!el) return
    // Ohne IntersectionObserver (sehr alte Browser) sofort zeigen statt
    // dauerhaft verstecken.
    if (typeof IntersectionObserver === 'undefined') { setDrin(true); return }

    const beobachter = new IntersectionObserver(
      ([eintrag]) => {
        if (eintrag.isIntersecting) {
          setDrin(true)
          beobachter.disconnect()
        }
      },
      { threshold: schwelle, rootMargin: rand },
    )
    beobachter.observe(el)
    return () => beobachter.disconnect()
  }, [schwelle, rand])

  return [ref, drin]
}

/**
 * Scrollfortschritt eines Elements: 0 beim Eintreten, 1 beim Verlassen.
 *
 * Grundlage der Sticky-Story.
 *
 * WARUM KEIN SCROLL-HANDLER
 * -------------------------
 * Naheliegend waere ein `scroll`-Listener auf `window`. Der ist aber nicht
 * ueberall verlaesslich: in eingebetteten und nicht sichtbaren Ansichten
 * aendert sich `scrollY`, ohne dass ein einziges Scroll-Ereignis zugestellt
 * wird — die Story bliebe dann stumm auf Schritt 1 stehen, obwohl sie sich
 * bewegt. Genau das ist in der Browser-Pruefung dieser Seite passiert.
 *
 * Gemessen wird deshalb in einer rAF-Schleife, die AUSSCHLIESSLICH laeuft,
 * solange das Element sichtbar ist (IntersectionObserver als Schalter).
 * Ausserhalb kostet sie nichts. Gelesen wird nur `getBoundingClientRect`,
 * geschrieben nur, wenn sich der Wert nennenswert geaendert hat — sonst
 * wuerde jeder Frame ein React-Rendering ausloesen.
 */
export function useScrollFortschritt<T extends HTMLElement>(): [React.RefObject<T>, number] {
  const ref = useRef<T>(null)
  const [fortschritt, setFortschritt] = useState(0)
  const letzter = useRef(0)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    let rafId = 0
    let laeuft = false

    const messen = () => {
      const rect = el.getBoundingClientRect()
      const strecke = rect.height - window.innerHeight
      const roh = strecke > 0 ? Math.min(1, Math.max(0, -rect.top / strecke)) : 0
      // Nur bei spuerbarer Aenderung neu rendern.
      if (Math.abs(roh - letzter.current) > 0.002) {
        letzter.current = roh
        setFortschritt(roh)
      }
      if (laeuft) rafId = requestAnimationFrame(messen)
    }

    const starten = () => {
      if (laeuft) return
      laeuft = true
      rafId = requestAnimationFrame(messen)
    }
    const stoppen = () => {
      laeuft = false
      if (rafId) cancelAnimationFrame(rafId)
    }

    if (typeof IntersectionObserver === 'undefined') {
      starten()
      return stoppen
    }

    const beobachter = new IntersectionObserver(
      ([eintrag]) => (eintrag.isIntersecting ? starten() : stoppen()),
      { threshold: 0 },
    )
    beobachter.observe(el)
    return () => { beobachter.disconnect(); stoppen() }
  }, [])

  return [ref, fortschritt]
}

/**
 * Zählt auf `ziel` hoch, sobald `aktiv` wird.
 *
 * `reduziert` springt sofort auf den Endwert: eine hochlaufende Zahl ist genau
 * die Art Bewegung, die bei Bewegungsempfindlichkeit stört — der Wert selbst
 * ist aber Information und muss da sein.
 */
export function useZaehler(ziel: number, aktiv: boolean, reduziert: boolean, dauerMs = 900): number {
  const [wert, setWert] = useState(reduziert ? ziel : 0)
  const rafId = useRef<number>()

  useEffect(() => {
    if (!aktiv) return
    if (reduziert) { setWert(ziel); return }

    const start = performance.now()
    const schritt = (jetzt: number) => {
      const t = Math.min(1, (jetzt - start) / dauerMs)
      // easeOutCubic — schnell anlaufen, weich auslaufen
      const e = 1 - Math.pow(1 - t, 3)
      setWert(ziel * e)
      if (t < 1) rafId.current = requestAnimationFrame(schritt)
    }
    rafId.current = requestAnimationFrame(schritt)
    return () => { if (rafId.current) cancelAnimationFrame(rafId.current) }
  }, [ziel, aktiv, reduziert, dauerMs])

  return wert
}

/**
 * Schaltet eine Sequenz von Schritten nacheinander frei, sobald `aktiv` wird.
 *
 * Rückgabe ist die Anzahl bereits freigeschalteter Schritte. Bei reduzierter
 * Bewegung sind sofort alle frei.
 */
export function useSequenz(anzahl: number, aktiv: boolean, reduziert: boolean, abstandMs = 260): number {
  const [frei, setFrei] = useState(reduziert ? anzahl : 0)

  useEffect(() => {
    if (!aktiv) return
    if (reduziert) { setFrei(anzahl); return }

    setFrei(0)
    const timer: ReturnType<typeof setTimeout>[] = []
    for (let i = 1; i <= anzahl; i++) {
      timer.push(setTimeout(() => setFrei(i), i * abstandMs))
    }
    return () => timer.forEach(clearTimeout)
  }, [anzahl, aktiv, reduziert, abstandMs])

  return frei
}

/**
 * Endlos laufende Hero-Demo: zyklisch durch `anzahl` Phasen.
 *
 * Bei reduzierter Bewegung bleibt sie auf der LETZTEN Phase stehen — das ist
 * der aussagekräftige Zustand mit dem fertigen Ergebnis, nicht der leere
 * Anfang.
 */
export function usePhasen(anzahl: number, reduziert: boolean, haltenMs = 1500): number {
  const [phase, setPhase] = useState(reduziert ? anzahl - 1 : 0)

  useEffect(() => {
    if (reduziert) { setPhase(anzahl - 1); return }
    const t = setInterval(() => setPhase((p) => (p + 1) % anzahl), haltenMs)
    return () => clearInterval(t)
  }, [anzahl, reduziert, haltenMs])

  return phase
}

/** Reveal-Klassen: sichtbar = Endzustand, sonst leicht nach unten versetzt. */
export function reveal(sichtbar: boolean, reduziert: boolean, verzoegerungMs = 0): {
  className: string; style: React.CSSProperties
} {
  if (reduziert) return { className: '', style: {} }
  return {
    className: 'transition-all duration-700 ease-out motion-reduce:transition-none',
    style: {
      opacity: sichtbar ? 1 : 0,
      transform: sichtbar ? 'none' : 'translateY(22px)',
      transitionDelay: `${verzoegerungMs}ms`,
    },
  }
}
