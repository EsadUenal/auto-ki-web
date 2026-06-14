/**
 * Temporärer Performance-Diagnosescript für den Splash-Übergang.
 * Misst: RAF-Frame-Zeiten, Long Tasks, Phase-Timings.
 * ENTFERNEN nach der Diagnose.
 */

interface FrameRecord { t: number; ms: number }
interface TaskRecord  { start: number; dur: number }

const frames: FrameRecord[] = []
const tasks: TaskRecord[]   = []
let   lastT = 0
let   running = true

// ── Long-Task-Observer ──────────────────────────────────────────────────────
try {
  new PerformanceObserver((list) => {
    for (const e of list.getEntries())
      tasks.push({ start: Math.round(e.startTime), dur: Math.round(e.duration) })
  }).observe({ type: 'longtask', buffered: true })
} catch { /* PerformanceLongTaskTiming nicht unterstützt */ }

// ── RAF-Frame-Timer ─────────────────────────────────────────────────────────
function tick() {
  const now = performance.now()
  if (lastT > 0) frames.push({ t: Math.round(now), ms: Math.round((now - lastT) * 10) / 10 })
  lastT = now
  if (running) requestAnimationFrame(tick)
}
requestAnimationFrame(tick)

// ── Bericht nach 4 Sekunden ─────────────────────────────────────────────────
setTimeout(() => {
  running = false

  const BUDGET = 1000 / 60   // 16.67 ms
  const dropped  = frames.filter(f => f.ms > BUDGET * 1.5)  // >25ms = klar dropped
  const heavy    = frames.filter(f => f.ms > BUDGET)         // >16.7ms = irgendwie zu lang
  const maxMs    = frames.reduce((m, f) => Math.max(m, f.ms), 0)
  const avgMs    = frames.reduce((s, f) => s + f.ms, 0) / (frames.length || 1)

  const style = (color: string) => `color:${color};font-weight:bold`

  console.group('%c╔══ AUTO-KI SPLASH PERF REPORT ══╗', style('orange'))
  console.log(`  Frames gesamt:          ${frames.length}`)
  console.log(`  Frames >16.7ms (spät):  ${heavy.length}  (${pct(heavy.length, frames.length)}%)`)
  console.log(`  Frames >25ms  (dropped):${dropped.length}  (${pct(dropped.length, frames.length)}%)`)
  console.log(`  Schlechtester Frame:    ${maxMs.toFixed(1)} ms`)
  console.log(`  Durchschnitt:           ${avgMs.toFixed(1)} ms`)

  if (dropped.length) {
    console.group('%c  ▼ Dropped Frames (>25ms):', style('red'))
    dropped.forEach(f => console.log(`    t=${f.t}ms → ${f.ms}ms`))
    console.groupEnd()
  }

  if (tasks.length) {
    console.group('%c  ▼ Long Tasks (>50ms, Main Thread blockiert):', style('red'))
    tasks.forEach(t => console.log(`    t=${t.start}ms → ${t.dur}ms`))
    console.groupEnd()
  } else {
    console.log('%c  Long Tasks: keine gefunden ✓', style('green'))
  }

  // Splash-relevante Frames (Übergang startet bei ~1750ms, Ende ~2500ms)
  const splashFrames = frames.filter(f => f.t >= 1700 && f.t <= 2600)
  const splashDropped = splashFrames.filter(f => f.ms > BUDGET * 1.5)
  console.group(`%c  ▼ Frames während Splash-Exit (1700–2600ms):`, style('orange'))
  console.log(`    Frames: ${splashFrames.length}, davon dropped: ${splashDropped.length}`)
  splashFrames.forEach(f => {
    const ok = f.ms <= BUDGET
    const warn = f.ms <= BUDGET * 1.5
    const marker = ok ? '✓' : warn ? '⚠' : '✗'
    console.log(`    ${marker} t=${f.t}ms → ${f.ms}ms`)
  })
  console.groupEnd()

  console.groupEnd()
}, 4000)

function pct(n: number, total: number) {
  return total ? Math.round(n / total * 100) : 0
}
