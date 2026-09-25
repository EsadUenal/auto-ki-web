import type {
  InseratOptimierung,
  KaufCheckForm,
  KaufCheckResult,
  SourceMeta,
  VerkaufsCheckForm,
  VerkaufsCheckResult,
} from '../types'
import type {
  AutoFinderPayload,
  AutoFinderResponse,
} from '../components/autofinder/logic'

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:8000'
const API_KEY = import.meta.env.VITE_API_KEY ?? ''

/** Backend-Origin — für die Auflösung von on-demand-Bild-URLs (`/api/…`). */
export const API_BASE_URL = BASE_URL

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
  /** Bestätigte Adresse. Gate für die KOSTENLOSEN Kontingente (Chat,
   *  AutoFinder) — gekaufte Checks hängen bewusst nicht daran.
   *  `/auth/me` liefert das Feld; ältere Antworten ohne es gelten als unbekannt. */
  email_verified?: boolean
  abo_typ: 'none' | 'light' | 'pro' | 'max'
  /** Generisches Alt-Kontingent — gilt weiterhin fuer BEIDE Check-Arten. */
  checks_verbleibend: number
  /** Dauerhaft gekaufte Berechtigungen je Check-Art — verfallen nie. */
  kaufchecks_verbleibend?: number
  verkaufschecks_verbleibend?: number
  /** ENFAL Plus: monatliche Kontingente, verfallen zum Periodenende. */
  plus_aktiv?: boolean
  plus_kaufchecks_verbleibend?: number
  plus_verkaufschecks_verbleibend?: number
  plus_period_end?: string | null
  plus_kuendigt_zum?: string | null
  /** Verbrauch des laufenden Kalendermonats. */
  chat_genutzt?: number
  chat_limit?: number
  autofinder_genutzt?: number
  autofinder_limit?: number
  ersatzteil_suchen_verbleibend: number
  abo_kuendigt_zum?: string | null
  ist_haendler?: boolean    // manueller DB-Override (Testaccounts/Support/Sonderfälle)
  dealer_access?: boolean   // effektive Berechtigung: abo_typ==="max" ODER ist_haendler
}

async function authFetch(path: string, init?: RequestInit): Promise<Response> {
  try {
    return await fetch(`${BASE_URL}/api/v1/auth${path}`, {
      ...init,
      credentials: 'include',   // httpOnly-Cookie mitsenden
      headers: { 'Content-Type': 'application/json', ...init?.headers },
    })
  } catch {
    // Netzwerkfehler (Server aus, offline): verständlicher Text statt des rohen
    // Browser-Fehlers "Failed to fetch" im Login-/Registrierungsformular.
    throw new Error(BACKEND_NICHT_ERREICHBAR)
  }
}

/** Antwort von Login/Registrierung: nie rohe Parser- oder Proxy-Fehler anzeigen. */
async function authAntwort(res: Response, aktion: string): Promise<AuthUser> {
  const data: unknown = await res.json().catch(() => null)
  if (!res.ok) {
    throw new Error(data ? extractMessage(data) : consumerServiceError(aktion, res.status))
  }
  return data as AuthUser
}

function extractMessage(data: unknown): string {
  if (data && typeof data === 'object' && 'fehler' in data) {
    const f = (data as Record<string, unknown>).fehler
    if (f && typeof f === 'object' && 'nachricht' in f) return String((f as Record<string, unknown>).nachricht)
  }
  return 'Unbekannter Fehler'
}

export type MeldungsArt = 'fehler' | 'hinweis'

/**
 * Ein erreichtes Kontingent. Eigener Typ, damit die Oberflaeche den bereits
 * nutzerfertigen Servertext unveraendert anzeigen kann, statt ihn wie einen
 * technischen Fehler auf einen Standardsatz abzubilden.
 *
 * Deckt zwei Zustaende mit unterschiedlichem Weg nach vorn ab:
 *   - erreichtes Monatskontingent eines Kontos  -> `plusHilft`
 *   - verbrauchte anonyme AutoFinder-Demo       -> `anmeldenHilft`
 * Die Unterscheidung kommt vom Server; das Frontend erfindet sie nicht.
 */
export class MonatslimitFehler extends Error {
  /** true, wenn ein Wechsel zu ENFAL Plus die Grenze tatsaechlich anheben wuerde. */
  readonly plusHilft: boolean
  /** true, wenn eine kostenlose Anmeldung der richtige naechste Schritt ist. */
  readonly anmeldenHilft: boolean
  /** Optionaler Subtext des Servers (z. B. was die Anmeldung bringt). */
  readonly hinweis: string
  constructor(nachricht: string, plusHilft: boolean, anmeldenHilft = false, hinweis = '') {
    super(nachricht)
    this.name = 'MonatslimitFehler'
    this.plusHilft = plusHilft
    this.anmeldenHilft = anmeldenHilft
    this.hinweis = hinweis
  }
}

function fehlerFeld(data: unknown): Record<string, unknown> | null {
  if (!data || typeof data !== 'object') return null
  const f = (data as Record<string, unknown>).fehler
  if (!f || typeof f !== 'object') return null
  return f as Record<string, unknown>
}

function plusHilftAus(data: unknown): boolean {
  const f = fehlerFeld(data)
  return f ? f.plus_hilft !== false : false
}

function anmeldenHilftAus(data: unknown): boolean {
  const f = fehlerFeld(data)
  return f ? f.anmelden_hilft === true : false
}

function hinweisAus(data: unknown): string {
  const f = fehlerFeld(data)
  return f && typeof f.hinweis === 'string' ? f.hinweis : ''
}

/**
 * Erkennt die strukturierten Kontingent-Fehler des Backends:
 * `{ fehler: { code: 'monatslimit_erreicht' | 'demo_limit_erreicht', ... } }`.
 */
export function istMonatslimit(data: unknown): boolean {
  const f = fehlerFeld(data)
  return !!f && (f.code === 'monatslimit_erreicht' || f.code === 'demo_limit_erreicht')
}

function consumerServiceError(aktion: string, status?: number): string {
  if (status === 429) {
    return 'Gerade sind viele Anfragen unterwegs. Bitte warte kurz und versuche es erneut.'
  }
  if (status != null && status >= 500) {
    return `${aktion} ist gerade vorübergehend nicht verfügbar. Bitte versuche es in einem Moment noch einmal.`
  }
  return `${aktion} konnte nicht abgeschlossen werden. Bitte prüfe deine Eingaben und versuche es erneut.`
}

const BACKEND_NICHT_ERREICHBAR =
  'Der ENFAL-Server ist gerade nicht erreichbar. Bitte versuche es in einem Moment noch einmal.'

export async function authRegister(email: string, password: string, agbAkzeptiert: boolean): Promise<AuthUser> {
  const res = await authFetch('/register', {
    method: 'POST',
    body: JSON.stringify({ email, password, agb_akzeptiert: agbAkzeptiert }),
  })
  return authAntwort(res, 'Die Registrierung')
}

export async function authLogin(email: string, password: string): Promise<AuthUser> {
  const res = await authFetch('/login', { method: 'POST', body: JSON.stringify({ email, password }) })
  return authAntwort(res, 'Die Anmeldung')
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

/** Löst den Bestätigungslink aus der Mail ein (ohne Login — der Token ist das Geheimnis). */
export async function apiVerifyEmail(token: string): Promise<void> {
  const res = await authFetch('/verify-email', { method: 'POST', body: JSON.stringify({ token }) })
  if (!res.ok) {
    const data: unknown = await res.json().catch(() => null)
    throw new Error(data ? extractMessage(data) : consumerServiceError('Die Bestätigung', res.status))
  }
}

/** Fordert einen neuen Bestätigungslink an (nur angemeldet). true = bereits bestätigt. */
export async function apiResendVerification(): Promise<boolean> {
  const res = await authFetch('/resend-verification', { method: 'POST' })
  const data: unknown = await res.json().catch(() => null)
  if (!res.ok) throw new Error(data ? extractMessage(data) : consumerServiceError('Der Versand', res.status))
  return Boolean((data as { email_verified?: boolean } | null)?.email_verified)
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
  laufId?: string,
): Promise<ApiCheckDetail> {
  // lauf_id: Nachweis aus der Antwort des Check-Laufs. Das Backend prueft ihn
  // serverseitig; ohne ihn wird der Check zwar gespeichert, gilt aber nicht als
  // echter, bezahlter Lauf (dann keine Inserats-Optimierung).
  const res = await checkFetch('', {
    method: 'POST',
    body: JSON.stringify({ typ, titel, eingabe, ergebnis, lauf_id: laufId }),
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
  /**
   * `art` unterscheidet einen echten Fehler von einem normalen
   * Produktzustand. Ein erreichtes Tageslimit ist kein Defekt und soll
   * in der Oberflaeche nicht wie einer aussehen. Optional — bestehende
   * Aufrufer bleiben unveraendert gueltig.
   */
  onError: (err: string, art?: MeldungsArt) => void
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
      // Auth-Cookie mitsenden, damit das serverseitige Tageskontingent am KONTO
      // haengt und nicht an der IP (Frontend/Backend sind verschiedene Origins;
      // ohne dies wuerde der Default 'same-origin' kein Cookie senden).
      credentials: 'include',
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
    callbacks.onError(BACKEND_NICHT_ERREICHBAR)
    return
  }

  if (!response.ok) {
    // Ein erreichtes TAGESlimit ist etwas anderes als eine kurzzeitige
    // Drosselung: "Bitte warte kurz" waere hier schlicht falsch. Der Server
    // liefert dafuer einen eigenen Fehlercode samt fertiger Nutzertext —
    // dieser wird uebernommen, roher Status/JSON nie angezeigt.
    const grund = await response.json().catch(() => null)
    if (istMonatslimit(grund)) {
      callbacks.onError(extractMessage(grund), 'hinweis')
      return
    }
    callbacks.onError(consumerServiceError('Der KI-Chat', response.status))
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
            abgeschnitten: m.abgeschnitten === true,
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
  /**
   * `art` unterscheidet einen echten Fehler von einem normalen
   * Produktzustand. Ein erreichtes Tageslimit ist kein Defekt und soll
   * in der Oberflaeche nicht wie einer aussehen. Optional — bestehende
   * Aufrufer bleiben unveraendert gueltig.
   */
  onError: (err: string, art?: MeldungsArt) => void
}

/**
 * Streamt die Antwort auf eine Rückfrage zu einem gespeicherten Check.
 *
 * Security Block 3 (P2-6): Der Client schickt KEINEN Analysetext mehr, sondern
 * nur die `checkId`. Das Backend prüft Eigentum und Herkunft des Checks und
 * baut den Kontext selbst aus dem gespeicherten Ergebnis. `verlauf` enthält
 * weiterhin die bisherigen Frage/Antwort-Paare (Multi-Turn).
 */
export async function streamAnalyseFrage(
  checkId: number,
  frage: string,
  verlauf: VerlaufItem[],
  callbacks: AnalyseFrageCallbacks,
  signal?: AbortSignal,
): Promise<void> {
  let response: Response
  try {
    response = await fetch(`${BASE_URL}/api/v1/analyse-frage`, {
      method: 'POST',
      headers: authHeaders(),
      // Wie beim Chat: Cookie mitsenden, damit das Tageskontingent am Konto
      // haengt. Rueckfragen zaehlen serverseitig in einen EIGENEN Topf und
      // verbrauchen das kostenlose Chat-Kontingent nicht.
      credentials: 'include',
      body: JSON.stringify({ check_id: checkId, frage, verlauf }),
      signal,
    })
  } catch (e) {
    if ((e as Error).name === 'AbortError') return
    callbacks.onError(BACKEND_NICHT_ERREICHBAR)
    return
  }

  if (!response.ok) {
    const grund = await response.json().catch(() => null)
    if (istMonatslimit(grund)) {
      callbacks.onError(extractMessage(grund), 'hinweis')
      return
    }
    callbacks.onError(consumerServiceError('Die Antwort', response.status))
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
  kaufchecks_verbleibend?: number
  verkaufschecks_verbleibend?: number
  plus_aktiv?: boolean
  plus_kaufchecks_verbleibend?: number
  plus_verkaufschecks_verbleibend?: number
  plus_period_end?: string | null
  plus_kuendigt_zum?: string | null
  chat_genutzt?: number
  chat_limit?: number
  autofinder_genutzt?: number
  autofinder_limit?: number
  /** MAX-Abo: Kontingente spielen keine Rolle. */
  unbegrenzt?: boolean
  hat_abo: boolean
}

export type CheckProdukt = 'kaufcheck' | 'verkaufscheck'

export async function apiCreateCheckoutSession(
  typ: 'check' | 'plus' | 'abo' | 'einzelkauf',
  abo_typ: 'light' | 'pro' | 'max' | undefined,
  agbAkzeptiert: boolean,
  widerrufVerzicht: boolean,
  produkt?: CheckProdukt,
): Promise<{ url: string }> {
  const res = await paymentFetch('/checkout-session', {
    method: 'POST',
    body: JSON.stringify({
      typ, abo_typ, produkt,
      agb_akzeptiert: agbAkzeptiert,
      widerruf_verzicht: widerrufVerzicht,
    }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(extractMessage(data))
  return data as { url: string }
}

/**
 * Startet das ENFAL-Plus-Abo (Stripe mode=subscription).
 *
 * Wie beim Einzelkauf wird nur der Produktschluessel gesendet — Preis und
 * Abrechnungsintervall bestimmt ausschliesslich der Server.
 */
export async function apiKaufePlus(
  agbAkzeptiert: boolean,
  widerrufVerzicht: boolean,
): Promise<{ url: string }> {
  return apiCreateCheckoutSession('plus', undefined, agbAkzeptiert, widerrufVerzicht)
}

/**
 * Startet den Kauf EINER Check-Berechtigung.
 *
 * Es wird bewusst nur der Produktschluessel gesendet — nie ein Betrag. Preis
 * und Stripe-Price-ID bestimmt ausschliesslich der Server; ein manipulierter
 * Client kann damit weder billiger kaufen noch ein anderes Produkt erhalten.
 */
export async function apiKaufeCheck(
  produkt: CheckProdukt,
  agbAkzeptiert: boolean,
  widerrufVerzicht: boolean,
): Promise<{ url: string }> {
  return apiCreateCheckoutSession('check', undefined, agbAkzeptiert, widerrufVerzicht, produkt)
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
  a.download = `ENFAL_${titel.replace(/\s+/g, '_')}.pdf`
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
  // Reliability-Sprint §5: strukturierte Kompatibilitäts-Einstufung.
  // "confirmed" (darf empfohlen werden) | "uncertain" (nie empfohlen, FIN/OE prüfen).
  // "rejected"-Treffer werden vom Backend gar nicht erst geliefert.
  passt_fahrzeug?: string
  kompatibilitaet?: 'confirmed' | 'uncertain' | string
  kompat_grund?: string
  kompat_hinweis?: string
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

// ---- AutoFinder (öffentlich, kostenlos, kein Check-Kontingent) ----
// Nutzt denselben Bearer-API-Key wie /fahrzeug (siehe Router-Doc im Backend).
// KEIN `credentials: 'include'` — der Endpunkt kennt keinen Nutzer-Cookie.
export async function apiAutoFinder(payload: AutoFinderPayload): Promise<AutoFinderResponse> {
  const response = await fetch(`${BASE_URL}/api/v1/autofinder`, {
    method: 'POST',
    headers: authHeaders(),
    // Auth-Cookie mitsenden, damit das monatliche Kontingent am KONTO haengt
    // und nicht an der IP (Frontend/Backend sind verschiedene Origins).
    // Ohne Login greift serverseitig weiterhin der IP-Anker.
    credentials: 'include',
    body: JSON.stringify(payload),
  })
  if (!response.ok) {
    const data = await response.json().catch(() => null)
    // Ein erreichtes Monatskontingent ist ein normaler Produktzustand: der
    // fertige Servertext wird unveraendert gezeigt, ohne Statuscode davor.
    if (istMonatslimit(data)) {
      throw new MonatslimitFehler(extractMessage(data), plusHilftAus(data),
                                  anmeldenHilftAus(data), hinweisAus(data))
    }
    const msg = data ? extractMessage(data) : `Server-Fehler ${response.status}`
    throw new Error(`${response.status} ${msg}`)
  }
  return response.json() as Promise<AutoFinderResponse>
}

// ---- Autokosten: amtliche Kraftstoff-Referenz (öffentlich, kostenlos) ----
// Der Rechner selbst läuft komplett im Browser; hier kommt NUR der nationale
// Wochen-Referenzpreis her (EU Weekly Oil Bulletin, siehe Backend-Router).
// Fällt der Abruf aus, bleibt der Rechner voll benutzbar — der Aufrufer behandelt
// das als "keine Referenz" und lässt das Preisfeld leer und editierbar.
export interface ApiKraftstoffReferenz {
  kraftstoff: 'benzin' | 'diesel'
  produkt: string
  preis: number | null
  einheit: string
  land: string
  quelle: string
  quelle_datum: string | null
  abgerufen_am: string | null
  status: 'ok' | 'veraltet' | 'fallback' | 'nicht_verfuegbar'
  hinweis: string
}

export async function apiKraftstoffReferenz(): Promise<ApiKraftstoffReferenz[]> {
  const response = await fetch(`${BASE_URL}/api/v1/autokosten/kraftstoff-referenz`, {
    method: 'GET',
    headers: authHeaders(),
  })
  if (!response.ok) throw new Error(`Server-Fehler ${response.status}`)
  const data = await response.json()
  const liste = (data?.kraftstoffe ?? []) as ApiKraftstoffReferenz[]
  return Array.isArray(liste) ? liste : []
}

// `apiAutoFinderImagesEnsure` ist ersatzlos entfallen: AutoFinder zeigt keine
// Fahrzeugbilder mehr, und der zugehoerige Endpunkt
// POST /api/v1/autofinder/images/ensure ist backendseitig abgeschaltet (er war
// der einzige Weg, ueber den ein Consumer-Request kostenpflichtige
// Bildgenerierung ausloesen konnte). Es gibt damit keinen Client-Pfad mehr,
// der Bildkosten verursachen kann.

// ---- Kauf-Check ----
export async function runKaufCheck(
  form: KaufCheckForm,
  screenshot: string | null,
  retry = false,
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
    kraftstoff: form.kraftstoff || undefined,
    leistung_ps: form.leistungPs || undefined,
    preis_eur: form.preis || undefined,
    ausstattung: ausstattungListe,
    beschreibung: form.beschreibung || undefined,
    unfallfrei: form.unfallfrei || undefined,
    vorbesitzer: form.vorbesitzer || undefined,
    tuev_bis: form.tuevBis || undefined,
    scheckheftgepflegt: form.scheckheft || undefined,
    bild_base64: screenshot ?? undefined,
  }

  // §22: "Erneut versuchen" nach research_failed erzwingt frische Tavily-Calls
  // statt derselben ggf. dünnen gecachten Antwort.
  const url = `${BASE_URL}/api/v1/kaufcheck${retry ? '?retry=true' : ''}`
  let response: Response
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: authHeaders(),
      credentials: 'include',
      body: JSON.stringify(body),
    })
  } catch {
    throw new Error(BACKEND_NICHT_ERREICHBAR)
  }

  if (response.status === 402) throw new PaymentRequiredError()
  if (!response.ok) {
    throw new Error(consumerServiceError('Der KaufCheck', response.status))
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
    // RC1: weitere optionale Angaben. Leere Felder werden weggelassen, damit
    // das Backend "nicht angegeben" von "ausdrücklich nein" unterscheiden kann.
    erstzulassung: form.erstzulassung || undefined,
    variante: form.variante || undefined,
    karosserie: form.karosserie || undefined,
    antrieb: form.antrieb || undefined,
    schluessel_anzahl: form.schluessel === '' ? undefined : form.schluessel,
    letzter_service_datum: form.letzterServiceDatum || undefined,
    letzter_service_km: form.letzterServiceKm === '' ? undefined : form.letzterServiceKm,
    wartungsnachweise: form.wartungsnachweise || undefined,
    zweiter_radsatz: form.zweiterRadsatz || undefined,
    reifen_zustand: form.reifenZustand || undefined,
    import_status: form.importStatus || undefined,
    tuning: form.tuning || undefined,
    vorschaeden: form.vorschaeden || undefined,
    zustand_innen: form.zustandInnen || undefined,
    zustand_aussen: form.zustandAussen || undefined,
    technische_maengel: form.technischeMaengel ? liste(form.technischeMaengel) : [],
    optische_maengel: form.optischeMaengel ? liste(form.optischeMaengel) : [],
    plz: form.plz || undefined,
    verkaufsziel: form.verkaufsziel || undefined,
    preis_untergrenze: form.preisUntergrenze === '' ? undefined : form.preisUntergrenze,
  }
}

export async function runVerkaufsCheck(
  form: VerkaufsCheckForm,
  images: string[],
  retry = false,
): Promise<VerkaufsCheckResult> {
  const body = {
    ...verkaufsBody(form),
    bild_base64: images[0] ?? undefined,  // Backend nimmt aktuell ein Bild
  }

  // §22: "Erneut versuchen" nach research_failed erzwingt frische Tavily-Calls
  // statt derselben ggf. dünnen gecachten Antwort.
  const url = `${BASE_URL}/api/v1/verkaufscheck${retry ? '?retry=true' : ''}`
  let response: Response
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: authHeaders(),
      credentials: 'include',
      body: JSON.stringify(body),
    })
  } catch {
    throw new Error(BACKEND_NICHT_ERREICHBAR)
  }

  if (response.status === 402) throw new PaymentRequiredError()
  if (!response.ok) {
    throw new Error(consumerServiceError('Der VerkaufsCheck', response.status))
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

// ── Closed Beta (Release-Schritt 10) ─────────────────────────────────────────

/** Ergebnis einer Einlösung. Serverseitig festgelegt — der Client schlägt
 *  weder das Paket noch den Ausgang vor. */
export interface BetaEinloesung {
  /** `email_unbestaetigt`: Adresse passt, ist aber noch nicht bestätigt. Die
   *  Einladung bleibt dabei unverbraucht und gültig, der Tester muss nur
   *  bestätigen und den Link erneut öffnen. */
  status: 'aktiviert' | 'bereits_aktiviert' | 'email_unbestaetigt' | 'nicht_verwendbar'
  kaufchecks: number
  verkaufschecks: number
}

/**
 * Löst eine persönliche Closed-Beta-Einladung für das eingeloggte Konto ein.
 *
 * Das Backend antwortet auf alle regulären Ausgänge mit HTTP 200 und einem
 * `status` — bewusst ohne unterscheidbare Fehlercodes, damit der Endpunkt kein
 * Orakel für gültige Token oder eingeladene Adressen ist. Nur echte
 * Ausnahmezustände (nicht eingeloggt, Server nicht erreichbar) werfen hier.
 */
export async function apiRedeemBeta(token: string): Promise<BetaEinloesung> {
  let res: Response
  try {
    res = await fetch(`${BASE_URL}/api/v1/beta/redeem`, {
      method: 'POST',
      credentials: 'include',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token }),
    })
  } catch {
    throw new Error(BACKEND_NICHT_ERREICHBAR)
  }
  const data: unknown = await res.json().catch(() => null)
  if (!res.ok) {
    throw new Error(data ? extractMessage(data) : consumerServiceError('Die Aktivierung', res.status))
  }
  return data as BetaEinloesung
}
