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

// ── User Auth (Phase 2b) ──────────────────────────────────────────────────────

export interface AuthUser {
  id: number
  email: string
  abo_typ: 'none' | 'light' | 'pro' | 'max'
  checks_verbleibend: number
}

async function authFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${BASE_URL}/api/v1/auth${path}`, {
    ...init,
    credentials: 'include',   // httpOnly-Cookie mitsenden
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  })
}

function extractMessage(data: unknown): string {
  if (data && typeof data === 'object' && 'fehler' in data) {
    const f = (data as Record<string, unknown>).fehler
    if (f && typeof f === 'object' && 'nachricht' in f) return String((f as Record<string, unknown>).nachricht)
  }
  return 'Unbekannter Fehler'
}

export async function authRegister(email: string, password: string): Promise<AuthUser> {
  const res = await authFetch('/register', { method: 'POST', body: JSON.stringify({ email, password }) })
  const data = await res.json()
  if (!res.ok) throw new Error(extractMessage(data))
  return data as AuthUser
}

export async function authLogin(email: string, password: string): Promise<AuthUser> {
  const res = await authFetch('/login', { method: 'POST', body: JSON.stringify({ email, password }) })
  const data = await res.json()
  if (!res.ok) throw new Error(extractMessage(data))
  return data as AuthUser
}

export async function authMe(): Promise<AuthUser | null> {
  try {
    const res = await authFetch('/me')
    if (res.status === 401) return null
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

export async function authLogout(): Promise<void> {
  await authFetch('/logout', { method: 'POST' }).catch(() => {})
}

// ── Checks (Phase 2c) ────────────────────────────────────────────────────────

export interface ApiCheckSummary {
  id: number
  typ: 'kauf' | 'verkauf'
  titel: string
  created_at: string
}

export interface ApiCheckDetail extends ApiCheckSummary {
  eingabe: Record<string, unknown>
  ergebnis: Record<string, unknown>
}

async function checkFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${BASE_URL}/api/v1/checks${path}`, {
    ...init,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  })
}

export async function apiListChecks(): Promise<ApiCheckSummary[]> {
  try {
    const res = await checkFetch('')
    if (!res.ok) return []
    return res.json()
  } catch {
    return []
  }
}

export async function apiSaveCheck(
  typ: 'kauf' | 'verkauf',
  titel: string,
  eingabe: object,
  ergebnis: object,
): Promise<ApiCheckDetail> {
  const res = await checkFetch('', {
    method: 'POST',
    body: JSON.stringify({ typ, titel, eingabe, ergebnis }),
  })
  if (!res.ok) throw new Error('Check speichern fehlgeschlagen')
  return res.json()
}

export async function apiGetCheck(id: number): Promise<ApiCheckDetail> {
  const res = await checkFetch(`/${id}`)
  if (!res.ok) throw new Error('Check nicht gefunden')
  return res.json()
}

export async function apiDeleteCheck(id: number): Promise<void> {
  await checkFetch(`/${id}`, { method: 'DELETE' })
}

// ── Conversations (Phase 2c) ──────────────────────────────────────────────────

export interface ApiConversation {
  id: number
  title: string
  created_at: string
  updated_at: string
}

export interface ApiMessage {
  id: number
  role: 'user' | 'assistant'
  content: string
  created_at: string
}

export interface ApiConversationDetail extends ApiConversation {
  messages: ApiMessage[]
}

async function convFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${BASE_URL}/api/v1/conversations${path}`, {
    ...init,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  })
}

export async function apiListConversations(): Promise<ApiConversation[]> {
  try {
    const res = await convFetch('')
    if (!res.ok) return []
    return res.json()
  } catch {
    return []
  }
}

export async function apiCreateConversation(title: string): Promise<ApiConversation> {
  const res = await convFetch('', { method: 'POST', body: JSON.stringify({ title }) })
  if (!res.ok) throw new Error('Konversation anlegen fehlgeschlagen')
  return res.json()
}

export async function apiGetConversation(id: number): Promise<ApiConversationDetail> {
  const res = await convFetch(`/${id}`)
  if (!res.ok) throw new Error('Konversation nicht gefunden')
  return res.json()
}

export async function apiPatchConversation(id: number, title: string): Promise<void> {
  await convFetch(`/${id}`, { method: 'PATCH', body: JSON.stringify({ title }) })
}

export async function apiDeleteConversation(id: number): Promise<void> {
  await convFetch(`/${id}`, { method: 'DELETE' })
}

export async function apiAddMessage(
  convId: number,
  role: 'user' | 'assistant',
  content: string,
): Promise<ApiMessage> {
  const res = await convFetch(`/${convId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ role, content }),
  })
  if (!res.ok) throw new Error('Nachricht speichern fehlgeschlagen')
  return res.json()
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
