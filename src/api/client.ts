import type {
  InseratOptimierung,
  KaufCheckForm,
  KaufCheckResult,
  SourceMeta,
  VerkaufsCheckForm,
  VerkaufsCheckResult,
} from '../types'

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'
const API_KEY = import.meta.env.VITE_API_KEY ?? ''

export class PaymentRequiredError extends Error {
  constructor() {
    super('payment_required')
    this.name = 'PaymentRequiredError'
  }
}

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
  ersatzteil_suchen_verbleibend: number
  abo_kuendigt_zum?: string | null
  ist_haendler?: boolean    // manueller DB-Override (Testaccounts/Support/Sonderfälle)
  dealer_access?: boolean   // effektive Berechtigung: abo_typ==="max" ODER ist_haendler
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

export async function authRegister(email: string, password: string, agbAkzeptiert: boolean): Promise<AuthUser> {
  const res = await authFetch('/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, agb_akzeptiert: agbAkzeptiert }),
  })
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

export async function apiChangePassword(old_password: string, new_password: string): Promise<void> {
  const res = await authFetch('/change-password', {
    method: 'POST',
    body: JSON.stringify({ old_password, new_password }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(extractMessage(data))
}

export async function apiDeleteAccount(password: string): Promise<void> {
  const res = await authFetch('/delete-account', {
    method: 'DELETE',
    body: JSON.stringify({ password }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(extractMessage(data))
}

export async function apiCancelSubscription(): Promise<{ abo_kuendigt_zum: string }> {
  const res = await paymentFetch('/cancel-subscription', { method: 'POST' })
  const data = await res.json()
  if (!res.ok) throw new Error(extractMessage(data))
  return data as { abo_kuendigt_zum: string }
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

// ---- Analyse-Rückfragen (Q&A) pro Check (Persistenz) ----
export interface ApiCheckFrage {
  frage: string
  antwort: string
  created_at: string
}

export async function apiListCheckFragen(checkId: number): Promise<ApiCheckFrage[]> {
  try {
    const res = await checkFetch(`/${checkId}/fragen`)
    if (!res.ok) return []
    return res.json()
  } catch {
    return []
  }
}

export async function apiSaveCheckFrage(
  checkId: number,
  frage: string,
  antwort: string,
): Promise<void> {
  const res = await checkFetch(`/${checkId}/fragen`, {
    method: 'POST',
    body: JSON.stringify({ frage, antwort }),
  })
  if (!res.ok) throw new Error('Frage konnte nicht gespeichert werden')
}

// ── Dealer (Phase 5) ──────────────────────────────────────────────────────────

async function dealerFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${BASE_URL}/api/v1/dealer${path}`, {
    ...init,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  })
}

export async function apiDealerSummary(): Promise<import('../types').DealerSummary> {
  const res = await dealerFetch('/summary')
  if (!res.ok) throw new Error(extractMessage(await res.json().catch(() => null)))
  return res.json()
}

export async function apiDealerVehicles(): Promise<import('../types').DealerVehicle[]> {
  const res = await dealerFetch('/vehicles')
  if (!res.ok) throw new Error(extractMessage(await res.json().catch(() => null)))
  return res.json()
}

export async function apiDealerVehicle(id: number): Promise<import('../types').DealerVehicle> {
  const res = await dealerFetch(`/vehicles/${id}`)
  if (!res.ok) throw new Error(extractMessage(await res.json().catch(() => null)))
  return res.json()
}

export async function apiDealerCreate(
  body: import('../types').DealerVehicleCreate,
): Promise<import('../types').DealerVehicle> {
  const res = await dealerFetch('/vehicles', { method: 'POST', body: JSON.stringify(body) })
  if (!res.ok) throw new Error(extractMessage(await res.json().catch(() => null)))
  return res.json()
}

export async function apiDealerUpdate(
  id: number,
  body: import('../types').DealerVehicleUpdate,
): Promise<import('../types').DealerVehicle> {
  const res = await dealerFetch(`/vehicles/${id}`, { method: 'PATCH', body: JSON.stringify(body) })
  if (!res.ok) throw new Error(extractMessage(await res.json().catch(() => null)))
  return res.json()
}

export async function apiDealerDelete(id: number): Promise<void> {
  const res = await dealerFetch(`/vehicles/${id}`, { method: 'DELETE' })
  if (!res.ok && res.status !== 204) throw new Error('Löschen fehlgeschlagen')
}

export async function apiDealerFromCheck(checkId: number): Promise<import('../types').DealerVehicle> {
  const res = await dealerFetch(`/vehicles/from-check/${checkId}`, { method: 'POST' })
  if (!res.ok) throw new Error(extractMessage(await res.json().catch(() => null)))
  return res.json()
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
  signal?: AbortSignal,
  fahrzeugKontext?: string,
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
        // Discover-Fast-Path: ausgewähltes Fahrzeug mitgeben (Backend übernimmt die
        // Baureihe deterministisch statt sie neu zu erraten).
        fahrzeug_kontext: fahrzeugKontext || undefined,
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

// ---- Analyse-Rückfragen (kontextgebundener Chat nach einem Check) ----
export interface AnalyseFrageCallbacks {
  onToken: (token: string) => void
  onDone: () => void
  onError: (err: string) => void
}

/**
 * Streamt die Antwort auf eine kontextgebundene Rückfrage zu einer Check-Analyse.
 * Der Analysetext wird als `analyseKontext` mitgeschickt; `verlauf` enthält die
 * bisherigen Frage/Antwort-Paare (Multi-Turn). Verbraucht kein Check-Kontingent.
 */
export async function streamAnalyseFrage(
  analyseKontext: string,
  frage: string,
  verlauf: VerlaufItem[],
  checkTyp: 'kauf' | 'verkauf' | 'ersatzteil',
  callbacks: AnalyseFrageCallbacks,
  signal?: AbortSignal,
): Promise<void> {
  let response: Response
  try {
    response = await fetch(`${BASE_URL}/api/v1/analyse-frage`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({
        analyse_kontext: analyseKontext,
        frage,
        verlauf,
        check_typ: checkTyp,
      }),
      signal,
    })
  } catch (e) {
    if ((e as Error).name === 'AbortError') return
    callbacks.onError(`Verbindung zum Backend fehlgeschlagen. Läuft der Server auf ${BASE_URL}?`)
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
        try {
          const parsed = JSON.parse(raw) as Record<string, unknown>
          if (typeof parsed.delta === 'string') callbacks.onToken(parsed.delta)
        } catch {
          callbacks.onToken(raw)  // Kein JSON → roher Text-Token (Fallback)
        }
      }
    }
  } catch (e) {
    if ((e as Error).name === 'AbortError') return
    callbacks.onError((e as Error).message)
    return
  } finally {
    reader.releaseLock()
  }

  callbacks.onDone()
}

// ── Payments (Phase 2d) ───────────────────────────────────────────────────────

async function paymentFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${BASE_URL}/api/v1/payments${path}`, {
    ...init,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  })
}

export interface PaymentStatus {
  abo_typ: 'none' | 'light' | 'pro' | 'max'
  checks_verbleibend: number
  hat_abo: boolean
}

export async function apiCreateCheckoutSession(
  typ: 'abo' | 'einzelkauf',
  abo_typ: 'light' | 'pro' | 'max' | undefined,
  agbAkzeptiert: boolean,
  widerrufVerzicht: boolean,
): Promise<{ url: string }> {
  const res = await paymentFetch('/checkout-session', {
    method: 'POST',
    body: JSON.stringify({
      typ, abo_typ,
      agb_akzeptiert: agbAkzeptiert,
      widerruf_verzicht: widerrufVerzicht,
    }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(extractMessage(data))
  return data as { url: string }
}

export async function apiPaymentStatus(): Promise<PaymentStatus | null> {
  try {
    const res = await paymentFetch('/status')
    if (!res.ok) return null
    return res.json()
  } catch {
    return null
  }
}

/**
 * Fallback zum Stripe-Webhook: verifiziert nach Rückkehr von Stripe die
 * Checkout-Session serverseitig und schaltet frei, falls der Webhook noch nicht
 * angekommen ist. Best-effort — Fehler werden vom Aufrufer bewusst ignoriert,
 * da der Webhook die Freischaltung ohnehin (verzögert) nachholt.
 */
export async function apiVerifyPayment(
  sessionId: string,
): Promise<{ ok: boolean; freigeschaltet?: boolean }> {
  const res = await paymentFetch('/verify-session', {
    method: 'POST',
    body: JSON.stringify({ session_id: sessionId }),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(extractMessage(data))
  return data as { ok: boolean; freigeschaltet?: boolean }
}

// ── E-Books ───────────────────────────────────────────────────────────────────

export interface ApiEbook {
  id: string
  titel: string
  untertitel: string
  beschreibung: string
  zielgruppe: string
  preis: number
  preis_normal: number
  hat_rabatt: boolean
}

export interface ApiEbookBestellung {
  id: number
  ebook_id: string
  titel: string
  untertitel: string
  zielgruppe: string
  preis_bezahlt: number
  status: 'offen' | 'bezahlt' | 'storniert' | 'erstattet'
  paid_at: string | null
  created_at: string
}

async function ebookFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${BASE_URL}/api/v1/ebooks${path}`, {
    ...init,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  })
}

export async function apiListEbooks(): Promise<ApiEbook[]> {
  const res = await ebookFetch('')
  if (!res.ok) throw new Error('E-Books konnten nicht geladen werden.')
  return res.json()
}

export async function apiEbookCheckout(
  ebook_id: string,
  agbAkzeptiert: boolean,
  widerrufVerzicht: boolean,
): Promise<{ url: string }> {
  const res = await ebookFetch('/checkout', {
    method: 'POST',
    body: JSON.stringify({
      ebook_id,
      agb_akzeptiert: agbAkzeptiert,
      widerruf_verzicht: widerrufVerzicht,
    }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(extractMessage(data))
  return data as { url: string }
}

export async function apiListEbookBestellungen(): Promise<ApiEbookBestellung[]> {
  const res = await ebookFetch('/bestellungen')
  if (!res.ok) return []
  return res.json()
}

export async function apiDownloadEbook(ebook_id: string, titel: string): Promise<void> {
  const res = await ebookFetch(`/${ebook_id}/download`)
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error((data as { fehler?: { nachricht?: string } })?.fehler?.nachricht ?? 'Download fehlgeschlagen.')
  }
  const blob = await res.blob()
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `Vira_${titel.replace(/\s+/g, '_')}.pdf`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

// ── Poster (Etappe 2) ─────────────────────────────────────────────────────────

export interface ApiPoster {
  id: string
  titel: string
  beschreibung: string
  bildpfad: string | null
  preis: number
  preis_normal: number
  hat_rabatt: boolean
}

export interface ApiAdresse {
  name: string
  strasse: string
  plz: string
  ort: string
  land: string
}

export interface ApiBestellung {
  id: number
  poster_id: string
  poster_titel: string
  bildpfad: string | null
  preis_bezahlt: number
  status: 'offen' | 'bezahlt' | 'versendet' | 'storniert' | 'erstattet'
  paid_at: string | null
  created_at: string
  adresse_name: string
  adresse_strasse: string
  adresse_plz: string
  adresse_ort: string
  adresse_land: string
}

export interface ApiBestellungDetail extends ApiBestellung {
  stripe_session_id: string
  stripe_payment_intent_id: string | null
}

async function posterFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${BASE_URL}/api/v1/posters${path}`, {
    ...init,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  })
}

export async function apiListPosters(): Promise<ApiPoster[]> {
  const res = await posterFetch('')
  if (!res.ok) throw new Error('Poster konnten nicht geladen werden.')
  return res.json()
}

export async function apiPosterCheckout(
  poster_id: string,
  adresse: ApiAdresse,
  adresse_speichern: boolean,
): Promise<{ url: string }> {
  const res = await posterFetch('/checkout', {
    method: 'POST',
    body: JSON.stringify({ poster_id, adresse, adresse_speichern }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(extractMessage(data))
  return data as { url: string }
}

export async function apiListBestellungen(): Promise<ApiBestellung[]> {
  const res = await posterFetch('/bestellungen')
  if (!res.ok) return []
  return res.json()
}

export async function apiGetBestellung(id: number): Promise<ApiBestellungDetail> {
  const res = await posterFetch(`/bestellungen/${id}`)
  if (!res.ok) throw new Error('Bestellung nicht gefunden.')
  return res.json()
}

export async function apiGetAdresse(): Promise<ApiAdresse | null> {
  const res = await posterFetch('/adresse')
  if (!res.ok) return null
  const data = await res.json()
  return data ?? null
}

export async function apiSaveAdresse(adresse: ApiAdresse): Promise<void> {
  await posterFetch('/adresse', { method: 'PUT', body: JSON.stringify(adresse) })
}

// ── Ersatzteile — Preisvergleich ──────────────────────────────────────────────

export type ErsatzteilMarkeTyp = 'oem' | 'original' | 'nachbau' | 'unbekannt'

export interface ApiErsatzteilErgebnis {
  teilename: string
  anbieter: string
  preis_eur: number | null
  marke_typ: ErsatzteilMarkeTyp
  qualitaetsstufe: string
  url: string
  hinweis: string
}

export interface ApiErsatzteilSuche {
  suchanfrage: { fahrzeug: string; bauteil: string }
  ergebnisse: ApiErsatzteilErgebnis[]
  empfehlung: string
  empfohlener_index: number | null
  quelle: string
  belege: unknown[]
}

async function ersatzteilFetch(path: string, init?: RequestInit): Promise<Response> {
  return fetch(`${BASE_URL}/api/v1/ersatzteile${path}`, {
    ...init,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  })
}

export async function apiErsatzteilSuche(fahrzeug: string, bauteil: string): Promise<ApiErsatzteilSuche> {
  const res = await ersatzteilFetch('/suche', {
    method: 'POST',
    body: JSON.stringify({ fahrzeug, bauteil }),
  })
  if (res.status === 402) throw new PaymentRequiredError()
  const data = await res.json()
  if (!res.ok) throw new Error(extractMessage(data))
  return data as ApiErsatzteilSuche
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
    unfallfrei: form.unfallfrei || undefined,
    vorbesitzer: form.vorbesitzer || undefined,
    tuev_bis: form.tuevBis || undefined,
    scheckheftgepflegt: form.scheckheft || undefined,
    bild_base64: screenshot ?? undefined,
  }

  const response = await fetch(`${BASE_URL}/api/v1/kaufcheck`, {
    method: 'POST',
    headers: authHeaders(),
    credentials: 'include',
    body: JSON.stringify(body),
  })

  if (response.status === 402) throw new PaymentRequiredError()
  if (!response.ok) {
    const data = await response.json().catch(() => null)
    throw new Error(extractMessage(data))
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

// Baut den Backend-Request-Body aus dem Verkaufs-Formular. Wird von runVerkaufsCheck
// UND der Inserats-Optimierung genutzt, damit beide EXAKT dieselben Fakten senden
// (der Fakten-Schutz im Backend prüft gegen genau diese Angaben).
function verkaufsBody(form: VerkaufsCheckForm): Record<string, unknown> {
  const liste = (s: string) =>
    s.split(/[,\n]+/).map((x) => x.trim()).filter(Boolean)
  return {
    marke: form.marke || undefined,
    modell: form.modell || undefined,
    baujahr: form.baujahr || undefined,
    kilometerstand: form.kilometerstand || undefined,
    motor: form.motor || undefined,
    kraftstoff: form.kraftstoff || undefined,
    getriebe: form.getriebe || undefined,
    farbe: form.farbe || undefined,
    ausstattung: liste(form.ausstattung),
    beschreibung: ZUSTAND_TEXT[form.zustand] ?? form.zustand,
    inserat_text: form.inseratText || undefined,
    maengel: form.maengel ? liste(form.maengel) : [],
    preis_vorstellung: form.preisVorstellung || undefined,
    unfallfrei: form.unfallfrei || undefined,
    vorbesitzer: form.vorbesitzer || undefined,
    tuev_bis: form.tuevBis || undefined,
    scheckheftgepflegt: form.scheckheft || undefined,
  }
}

export async function runVerkaufsCheck(
  form: VerkaufsCheckForm,
  images: string[]
): Promise<VerkaufsCheckResult> {
  const body = {
    ...verkaufsBody(form),
    bild_base64: images[0] ?? undefined,  // Backend nimmt aktuell ein Bild
  }

  const response = await fetch(`${BASE_URL}/api/v1/verkaufscheck`, {
    method: 'POST',
    headers: authHeaders(),
    credentials: 'include',
    body: JSON.stringify(body),
  })

  if (response.status === 402) throw new PaymentRequiredError()
  if (!response.ok) {
    const text = await response.text().catch(() => '')
    throw new Error(`Verkaufs-Check fehlgeschlagen (${response.status}): ${text}`)
  }

  return response.json() as Promise<VerkaufsCheckResult>
}

/**
 * Erzeugt on-demand die optimierte Inseratsversion (Titel + Beschreibung) zu einem
 * gespeicherten Verkaufscheck. Idempotent: liegt bereits eine Version am Check,
 * gibt das Backend sie ohne neuen LLM-Aufruf zurück. Verbraucht kein Check-Kontingent.
 */
export async function optimiereInserat(
  checkId: number,
  form: VerkaufsCheckForm,
): Promise<InseratOptimierung> {
  const res = await checkFetch(`/${checkId}/inserat-optimierung`, {
    method: 'POST',
    body: JSON.stringify(verkaufsBody(form)),
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) throw new Error(extractMessage(data))
  return data as InseratOptimierung
}
