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

/**
 * True, wenn direkt unter dem Header eine dunkle Fläche liegt.
 *
 * WARUM MESSEN STATT MARKIEREN
 * ----------------------------
 * Naheliegend waere, die dunklen Abschnitte zu markieren und per
 * IntersectionObserver zu beobachten. Das scheitert an der Story-Bühne: die ist
 * mal hell und mal dunkel, je nachdem, bei welchem Schritt man steht. Ein
 * Beobachter müsste bei jedem Wechsel neu gebunden werden, und der Header
 * bräuchte Wissen über die Innereien der Story.
 *
 * Stattdessen wird gemessen, was tatsächlich da ist: das Element unter dem
 * Header wird abgefragt und seine Hintergrundfarbe nach oben durchgereicht, bis
 * eine deckende gefunden ist. Das funktioniert für jede Fläche, auch für
 * spätere, ohne dass jemand daran denken muss, sie zu markieren.
 *
 * `elementFromPoint` erzwingt ein Layout, deshalb wird nicht in jedem Frame
 * gemessen, sondern etwa zehnmal pro Sekunde, und nur solange die Seite
 * sichtbar ist.
 */
export function useDunkelDarunter(abstandPx = 76): boolean {
  const [dunkel, setDunkel] = useState(false)

  useEffect(() => {
    let timer: ReturnType<typeof setInterval> | null = null

    const messen = () => {
      const el = document.elementFromPoint(Math.round(window.innerWidth / 2), abstandPx)
      if (!el) return
      let knoten: Element | null = el
      while (knoten) {
        const farbe = getComputedStyle(knoten).backgroundColor
        const teile = farbe.match(/[\d.]+/g)
        if (teile && teile.length >= 3) {
          const alpha = teile.length > 3 ? Number(teile[3]) : 1
          if (alpha > 0.5) {
            const [r, g, b] = teile.slice(0, 3).map(Number)
            // Wahrgenommene Helligkeit (ITU-R BT.601)
            const helligkeit = (r * 299 + g * 587 + b * 114) / 1000
            setDunkel(helligkeit < 110)
            return
          }
        }
        knoten = knoten.parentElement
      }
      setDunkel(false)
    }

    const starten = () => {
      if (timer) return
      messen()
      timer = setInterval(messen, 100)
    }
    const stoppen = () => {
      if (timer) clearInterval(timer)
      timer = null
    }

    const sichtbarkeit = () => (document.hidden ? stoppen() : starten())
    sichtbarkeit()
    document.addEventListener('visibilitychange', sichtbarkeit)
    window.addEventListener('resize', messen)
    return () => {
      stoppen()
      document.removeEventListener('visibilitychange', sichtbarkeit)
      window.removeEventListener('resize', messen)
    }
  }, [abstandPx])

  return dunkel
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
