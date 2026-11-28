/**
 * Deutung EINER SSE-Datenzeile der Chat- und Rückfrage-Streams (CHAT-1).
 *
 * Bewusst als reine Funktion ohne Umgebung ausgelagert: so ist sie ohne Bundler und ohne
 * `import.meta.env` pruefbar. Das Backend sendet Fehler als EIGENES Ereignis
 * (`{"fehler": {...}, "teilantwort": bool}`) — ein Fehlertext ist nie ein normales Textdelta, das
 * als Antwort gezeigt und gespeichert wuerde.
 */
export type StreamEreignis =
  | { art: 'status'; text: string }
  | { art: 'delta'; text: string }
  | { art: 'meta'; meta: Record<string, unknown> }
  | { art: 'fehler'; nachricht: string; teilantwort: boolean }
  | { art: 'ignoriert' }

export function deuteStreamEreignis(raw: string): StreamEreignis {
  if (!raw || raw === '[DONE]') return { art: 'ignoriert' }
  let parsed: Record<string, unknown>
  try {
    parsed = JSON.parse(raw)
  } catch {
    // Kein JSON → roher Text-Token (bisheriger Fallback)
    return { art: 'delta', text: raw }
  }
  if (!parsed || typeof parsed !== 'object') return { art: 'ignoriert' }
  if (parsed.fehler && typeof parsed.fehler === 'object') {
    const f = parsed.fehler as Record<string, unknown>
    return {
      art: 'fehler',
      nachricht: typeof f.nachricht === 'string' && f.nachricht ? f.nachricht : 'Die Antwort ist unterbrochen worden.',
      teilantwort: parsed.teilantwort === true,
    }
  }
  if (typeof parsed.status === 'string') return { art: 'status', text: parsed.status }
  if (typeof parsed.delta === 'string') return { art: 'delta', text: parsed.delta }
  if (parsed.meta && typeof parsed.meta === 'object') {
    return { art: 'meta', meta: parsed.meta as Record<string, unknown> }
  }
  return { art: 'ignoriert' }
}
