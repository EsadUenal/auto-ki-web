// AutoFinder — visuelle Vereinheitlichung der Fahrzeugbilder in der ResultCard.
//
// URSACHE (siehe Bugfix-Bericht): jedes Line-Art-Bild wird unabhängig von einem
// KI-Modell erzeugt. Die Backend-Qualitätsprüfung (app/autofinder_images.py,
// pruefe_bild) lässt bewusst eine große Bandbreite zu (Seitenverhältnis 1.2–2.2,
// Dunkelanteil 1–55 %) — sie prüft nur "ist es ein plausibles Line-Art-Bild",
// NICHT "füllt das Fahrzeug immer denselben Anteil der Fläche, mittig,
// mit gleichem Rand". Dadurch wirken die Bilder in der Karte unterschiedlich
// groß/positioniert, obwohl der Rahmen (ResultCard) selbst bereits einheitlich
// ist. Das ist ein ASSET-Problem, keines der Karten-CSS.
//
// Diese Datei behebt die SICHTBARE Auswirkung rein im Frontend: sie erkennt den
// tatsächlichen Bildinhalt (alles, was nicht nahezu weißer Hintergrund ist),
// schneidet NUR den überschüssigen weißen Rand weg (nie in den Fahrzeuginhalt
// hinein) und bettet das Ergebnis mit einem festen, einheitlichen Rand mittig in
// eine Fläche im selben Seitenverhältnis wie der Karten-Bildrahmen (16:10) ein.
// Ergebnis: unabhängig vom Ausgangsbild füllt das Fahrzeug in jeder Karte
// denselben Anteil derselben Fläche, gleich zentriert, gleicher Rand.
//
// Reine Darstellung — keine Bild-URLs, kein Netzwerk-Call, kein Ranking/Match/
// Preis/History-Bezug. Schlägt die Erkennung fehl (z. B. CORS-Fall ohne
// erlaubte Origin, kaputtes Bild), wird unverändert das Original-Bild gezeigt —
// nie ein Fehler, nie ein leeres Bild.

import { useEffect, useState } from 'react'

/** Seitenverhältnis des Bildrahmens in der ResultCard (Tailwind: aspect-[16/10]). */
const ZIEL_SEITENVERHAELTNIS = 16 / 10

/** Einheitlicher Rand um den erkannten Fahrzeuginhalt (Anteil seiner Größe). */
const INHALT_RAND_ANTEIL = 0.1

/** Für die Inhaltserkennung wird das Bild klein herunterskaliert (schnell, reicht
 *  für eine Bounding-Box). Für die Ausgabe wird eine moderate, scharfe Auflösung
 *  genutzt (nicht die oft deutlich größere Originalauflösung). */
const SCAN_MAX = 220
const OUTPUT_MAX = 640

/** Ergebnis-Cache pro Bild-URL — verhindert wiederholtes Neuberechnen, wenn
 *  dieselbe Karte neu rendert oder eine gespeicherte Suche dasselbe Bild erneut
 *  zeigt. Rein clientseitig, lebt nur für die Dauer der Session. */
const zuschnittCache = new Map<string, string>()

/**
 * Sucht die Bounding-Box des Bildinhalts (alles, was spürbar von reinem Weiß
 * abweicht) auf einer verkleinerten Kopie. Gibt null zurück, wenn nichts
 * Verwertbares gefunden wurde (z. B. komplett weißes Bild) oder der Canvas aus
 * Cross-Origin-Gründen nicht lesbar ist.
 */
function inhaltsBox(img: HTMLImageElement): { x0: number; y0: number; x1: number; y1: number } | null {
  const w = img.naturalWidth
  const h = img.naturalHeight
  if (!w || !h) return null

  const scale = Math.min(1, SCAN_MAX / Math.max(w, h))
  const sw = Math.max(1, Math.round(w * scale))
  const sh = Math.max(1, Math.round(h * scale))
  const scan = document.createElement('canvas')
  scan.width = sw
  scan.height = sh
  const sctx = scan.getContext('2d', { willReadFrequently: true })
  if (!sctx) return null
  sctx.drawImage(img, 0, 0, sw, sh)

  let pixel: Uint8ClampedArray
  try {
    pixel = sctx.getImageData(0, 0, sw, sh).data
  } catch {
    return null // Cross-Origin-Canvas nicht lesbar -> Original-Bild unverändert lassen
  }

  const SCHWELLE = 246 // heller/gleich als das gilt als "weißer Hintergrund"
  let minX = sw, minY = sh, maxX = -1, maxY = -1
  for (let y = 0; y < sh; y++) {
    for (let x = 0; x < sw; x++) {
      const i = (y * sw + x) * 4
      if (pixel[i + 3] < 16) continue // transparent zählt nicht als Inhalt
      if (pixel[i] < SCHWELLE || pixel[i + 1] < SCHWELLE || pixel[i + 2] < SCHWELLE) {
        if (x < minX) minX = x
        if (x > maxX) maxX = x
        if (y < minY) minY = y
        if (y > maxY) maxY = y
      }
    }
  }
  if (maxX < minX || maxY < minY) return null

  const rx = w / sw
  const ry = h / sh
  return { x0: minX * rx, y0: minY * ry, x1: (maxX + 1) * rx, y1: (maxY + 1) * ry }
}

/**
 * Schneidet den überschüssigen weißen Rand weg (nie in den erkannten Inhalt
 * hinein) und bettet das Fahrzeug zentriert, mit festem Rand, in eine weiße
 * Fläche im Ziel-Seitenverhältnis ein. Rückgabe: data-URL oder null (dann wird
 * das Original-Bild unverändert angezeigt).
 */
function normalisiertesBild(img: HTMLImageElement): string | null {
  const box = inhaltsBox(img)
  if (!box) return null

  const w = img.naturalWidth
  const h = img.naturalHeight
  const padX = (box.x1 - box.x0) * INHALT_RAND_ANTEIL
  const padY = (box.y1 - box.y0) * INHALT_RAND_ANTEIL
  const x0 = Math.max(0, box.x0 - padX)
  const y0 = Math.max(0, box.y0 - padY)
  const x1 = Math.min(w, box.x1 + padX)
  const y1 = Math.min(h, box.y1 + padY)
  const cw = x1 - x0
  const ch = y1 - y0
  if (cw < 8 || ch < 8) return null

  const inhaltSeitenverhaeltnis = cw / ch
  const outW = inhaltSeitenverhaeltnis > ZIEL_SEITENVERHAELTNIS ? cw : ch * ZIEL_SEITENVERHAELTNIS
  const outH = inhaltSeitenverhaeltnis > ZIEL_SEITENVERHAELTNIS ? cw / ZIEL_SEITENVERHAELTNIS : ch

  const renderScale = Math.min(1, OUTPUT_MAX / Math.max(outW, outH))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(outW * renderScale))
  canvas.height = Math.max(1, Math.round(outH * renderScale))
  const ctx = canvas.getContext('2d')
  if (!ctx) return null

  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  const destW = cw * renderScale
  const destH = ch * renderScale
  ctx.drawImage(img, x0, y0, cw, ch, (canvas.width - destW) / 2, (canvas.height - destH) / 2, destW, destH)

  try {
    return canvas.toDataURL('image/png')
  } catch {
    return null // z. B. getauteter Canvas -> Original-Bild unverändert lassen
  }
}

/**
 * Lädt die Bild-Bytes separat per `fetch` (nie das sichtbare <img>) und liefert
 * — sobald fertig — eine inhaltlich zugeschnittene, einheitlich gerahmte
 * Fassung. Bis dahin und im Fehlerfall (CORS, Netzwerk, kaputtes Bild, o. Ä.)
 * wird `null` geliefert; der Aufrufer zeigt dann einfach weiter `url` selbst,
 * nie einen leeren Zustand.
 *
 * Bewusst `fetch` + Blob-URL statt `new Image(); img.crossOrigin = 'anonymous'`:
 * dasselbe `image_url` wird im selben Render bereits ganz normal (ohne
 * `crossOrigin`) im sichtbaren <img> angezeigt/gecacht. Ein zweiter Ladeversuch
 * derselben URL im CORS-Modus trifft dann auf einen bereits vorhandenen,
 * nicht-CORS-fähigen Cache-Eintrag und schlägt im Browser fehl — unabhängig
 * davon, ob der Server korrekt antwortet. `cache: 'reload'` umgeht genau das,
 * und eine Blob-URL ist für Canvas immer unbedenklich lesbar, sobald der
 * `fetch` selbst (dank Server-CORS) erfolgreich war.
 */
export function useAutofitVehicleImage(url: string | null | undefined): string | null {
  const [ergebnis, setErgebnis] = useState<string | null>(() => (url ? zuschnittCache.get(url) ?? null : null))

  useEffect(() => {
    if (!url) { setErgebnis(null); return }
    const cached = zuschnittCache.get(url)
    if (cached) { setErgebnis(cached); return }

    let abgebrochen = false
    setErgebnis(null)

    void (async () => {
      let blobUrl: string | null = null
      try {
        const res = await fetch(url, { mode: 'cors', credentials: 'omit', cache: 'reload' })
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const blob = await res.blob()
        blobUrl = URL.createObjectURL(blob)
        const img = await new Promise<HTMLImageElement>((resolve, reject) => {
          const el = new Image()
          el.onload = () => resolve(el)
          el.onerror = () => reject(new Error('Bild-Decode fehlgeschlagen'))
          el.src = blobUrl as string
        })
        const angepasst = normalisiertesBild(img)
        if (angepasst) zuschnittCache.set(url, angepasst)
        if (!abgebrochen) setErgebnis(angepasst)
      } catch {
        if (!abgebrochen) setErgebnis(null) // Original-Bild bleibt sichtbar
      } finally {
        if (blobUrl) URL.revokeObjectURL(blobUrl)
      }
    })()

    return () => { abgebrochen = true }
  }, [url])

  return ergebnis
}
