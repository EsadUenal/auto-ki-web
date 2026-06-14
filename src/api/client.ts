import type {
  KaufCheckForm,
  KaufCheckResult,
  SourceMeta,
  VerkaufsCheckForm,
  VerkaufsCheckResult,
} from '../types'

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'
const API_KEY = import.meta.env.VITE_API_KEY ?? ''

function authHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${API_KEY}`,
  }
}

// ---- Chat verlauf item (backend format) ----
export interface VerlaufItem {
  rolle: 'user' | 'ki'
  text: string
}

// ---- Chat streaming ----
export interface ChatStreamCallbacks {
  onToken: (token: string) => void
  onStatus: (text: string) => void
  onDone: (meta: SourceMeta) => void
  onError: (err: string) => void
}

export async function streamChat(
  message: string,
  verlauf: VerlaufItem[],
  callbacks: ChatStreamCallbacks,
  signal?: AbortSignal
): Promise<void> {
  let response: Response
  try {
    response = await fetch(`${BASE_URL}/api/v1/chat`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        message,
        verlauf,
        stream: true,  // muss explizit auf true gesetzt sein
      }),
      signal,
    })
  } catch (e) {
    if ((e as Error).name === 'AbortError') return
    callbacks.onError(
      `Verbindung zum Backend fehlgeschlagen. Läuft der Server auf ${BASE_URL}?`
    )
    return
  }

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    callbacks.onError(`Server-Fehler ${response.status}: ${text}`)
    return
  }

  const reader = response.body?.getReader()
  if (!reader) {
    callbacks.onError('Kein Stream vom Server.')
    return
  }

  const decoder = new TextDecoder()
  let buffer = ''
  let capturedMeta: SourceMeta | null = null

  try {
    while (true) {
      const { done, value } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const line of lines) {
        if (!line.startsWith('data:')) continue
        const raw = line.slice(5).trim()

        if (!raw || raw === '[DONE]') continue

        let parsed: Record<string, unknown>
        try {
          parsed = JSON.parse(raw)
        } catch {
          // Kein JSON → roher Text-Token (Fallback)
          callbacks.onToken(raw)
          continue
        }

        // Status-Event: {"status": "Durchsuche das Web…"}
        if (typeof parsed.status === 'string') {
          callbacks.onStatus(parsed.status)
          continue
        }

        // Text-Delta: {"delta": "..."}
        if (typeof parsed.delta === 'string') {
          callbacks.onToken(parsed.delta)
          continue
        }

        // Meta-Event: {"meta": {"quelle": "...", "vertrauen": "...", "belege": [...]}}
        if (parsed.meta && typeof parsed.meta === 'object') {
          const m = parsed.meta as Record<string, unknown>
          capturedMeta = {
            source: (m.quelle as SourceMeta['source']) ?? 'unbekannt',
            trust_level: (m.vertrauen as SourceMeta['trust_level']) ?? 'unbekannt',
            belege: Array.isArray(m.belege) ? m.belege : [],
          }
        }
      }
    }
  } finally {
    reader.releaseLock()
  }

  callbacks.onDone(
    capturedMeta ?? { source: 'unbekannt', trust_level: 'unbekannt', belege: [] }
  )
}

// ---- Kauf-Check ----
export async function runKaufCheck(
  form: KaufCheckForm,
  screenshot: string | null
): Promise<KaufCheckResult> {
  const ausstattungListe = form.ausstattung
    .split(/[,\n]+/)
    .map((s) => s.trim())
    .filter(Boolean)

  const body = {
    marke: form.marke || undefined,
    modell: form.modell || undefined,
    baujahr: form.baujahr || undefined,
    kilometerstand: form.kilometerstand || undefined,
    motor: form.motor || undefined,
    preis_eur: form.preis || undefined,
    ausstattung: ausstattungListe,
    beschreibung: form.beschreibung || undefined,
    bild_base64: screenshot ?? undefined,
  }

  const response = await fetch(`${BASE_URL}/api/v1/kaufcheck`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`Kauf-Check fehlgeschlagen (${response.status}): ${text}`)
  }

  return response.json() as Promise<KaufCheckResult>
}

// ---- Verkaufs-Check ----
const ZUSTAND_TEXT: Record<string, string> = {
  sehr_gut: 'Sehr guter Zustand, kaum Gebrauchsspuren, gepflegt',
  gut: 'Guter Zustand, normale Gebrauchsspuren',
  maengel: 'Sichtbare Mängel oder Schäden vorhanden',
  bastler: 'Bastlerfahrzeug, starke Mängel oder nicht fahrbereit',
}

export async function runVerkaufsCheck(
  form: VerkaufsCheckForm,
  images: string[]
): Promise<VerkaufsCheckResult> {
  const ausstattungListe = form.ausstattung
    .split(/[,\n]+/)
    .map((s) => s.trim())
    .filter(Boolean)

  const body = {
    marke: form.marke || undefined,
    modell: form.modell || undefined,
    baujahr: form.baujahr || undefined,
    kilometerstand: form.kilometerstand || undefined,
    motor: form.motor || undefined,
    ausstattung: ausstattungListe,
    beschreibung: ZUSTAND_TEXT[form.zustand] ?? form.zustand,
    bild_base64: images[0] ?? undefined,  // Backend nimmt aktuell ein Bild
  }

  const response = await fetch(`${BASE_URL}/api/v1/verkaufscheck`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`Verkaufs-Check fehlgeschlagen (${response.status}): ${text}`)
  }

  return response.json() as Promise<VerkaufsCheckResult>
}
