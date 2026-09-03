import { startTransition, useCallback, useEffect, useRef, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import { Menu } from 'lucide-react'
import Sidebar from './components/Sidebar'
import ChatView from './components/ChatView'
import KaufCheckView from './components/KaufCheckView'
import VerkaufsCheckView from './components/VerkaufsCheckView'
import DealerView from './components/DealerView'
import DealerVehicleView from './components/DealerVehicleView'
import EntdeckenView from './components/EntdeckenView'
import EbookView from './components/EbookView'
import ErsatzteileView from './components/ErsatzteileView'
import PricingView from './components/PricingView'
import SettingsView from './components/SettingsView'
import HelpView from './components/HelpView'
import LoginView from './components/LoginView'
import LegalView from './components/LegalView'
import AutoFinderView from './components/autofinder/AutoFinderView'
import AutokostenView from './components/autokosten/AutokostenView'
import { setReturnTo } from './components/autofinder/logic'
import Footer from './components/Footer'
import SplashScreen from './components/SplashScreen'
import { AuthProvider, useAuth } from './context/AuthContext'
import {
  apiAddMessage,
  apiCreateConversation,
  apiDeleteConversation,
  apiGetConversation,
  apiListConversations,
  apiPatchConversation,
  apiListChecks,
  apiGetCheck,
  apiDeleteCheck,
} from './api/client'
import type { ApiCheckSummary } from './api/client'
import type { Conversation, Message, SavedKaufCheck, SavedVerkaufsCheck, KaufCheckForm, KaufCheckResult, VerkaufsCheckForm, VerkaufsCheckResult } from './types'

function newConversation(): Conversation {
  return {
    id: crypto.randomUUID(),
    title: 'Neuer Chat',
    messages: [],
    createdAt: new Date(),
  }
}

function titleFromMessages(messages: Message[]): string {
  const first = messages.find((m) => m.role === 'user')
  if (!first) return 'Neuer Chat'
  return first.content.slice(0, 42) + (first.content.length > 42 ? '…' : '')
}

// ── Auth-Gate pro Route ───────────────────────────────────────────────────────
// AutoFinder ist ein öffentliches Akquise-Feature und läuft in DERSELBEN
// App-Shell (Sidebar/Footer/Hintergrund) wie alle anderen Werkzeuge. Damit die
// Shell wiederverwendbar ist, ohne geschützte Routen zu öffnen, sitzt das
// Auth-Gate jetzt PRO ROUTE statt als ein Wrapper um die ganze Shell.
// `/autofinder` bekommt kein <Guard>, alle bisher geschützten Routen behalten es.
// Vor dem Redirect wird das Zielpfad als returnTo gemerkt, damit LoginView nach
// erfolgreichem Login DORTHIN zurückspringt (z. B. AutoFinder -> KaufCheck).
function Guard({ authed, loading, children }: { authed: boolean; loading: boolean; children: React.ReactNode }) {
  const location = useLocation()
  if (loading) return null   // Auth-Check läuft noch — kurzer Leerzustand statt Flackern
  if (authed) return <>{children}</>
  setReturnTo(location.pathname + location.search)
  return <Navigate to="/login" replace />
}

// ── Inner app — muss innerhalb von AuthProvider sein um useAuth() zu nutzen ──

function AppContent() {
  const { user, isLoading } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const [mobileNavOpen, setMobileNavOpen] = useState(false)

  // Bei jedem Seitenwechsel die mobile Sidebar automatisch schließen (z.B. wenn
  // eine Navigation programmatisch erfolgt, nicht nur per Klick in der Sidebar).
  useEffect(() => {
    setMobileNavOpen(false)
  }, [location.pathname])

  const [conversations, setConversations] = useState<Conversation[]>(() => [newConversation()])
  const [activeId, setActiveId] = useState<string>(conversations[0].id)
  const [pendingAutoMessage] = useState<string | null>(null)
  const [myChecks, setMyChecks] = useState<ApiCheckSummary[]>([])
  const [savedKaufCheck, setSavedKaufCheck] = useState<SavedKaufCheck | null>(null)
  const [savedVerkaufsCheck, setSavedVerkaufsCheck] = useState<SavedVerkaufsCheck | null>(null)

  // Refs damit Callbacks auf aktuellen State zugreifen ohne Stale-Closures
  const conversationsRef = useRef(conversations)
  conversationsRef.current = conversations
  const activeIdRef = useRef(activeId)
  activeIdRef.current = activeId

  const activeConv = conversations.find((c) => c.id === activeId) ?? conversations[0]

  // ── Konversationen laden wenn Nutzer eingeloggt ist ─────────────────────────
  useEffect(() => {
    if (!user) {
      const fresh = newConversation()
      setConversations([fresh])
      setActiveId(fresh.id)
      setMyChecks([])
      setSavedKaufCheck(null)
      setSavedVerkaufsCheck(null)
      return
    }
    apiListChecks().then(setMyChecks)
    apiListConversations().then((apiConvs) => {
      if (apiConvs.length === 0) return   // leere Standardkonversation behalten
      const loaded: Conversation[] = apiConvs.map((c) => {
        const raw = localStorage.getItem(`carCtx_${c.id}`)
        const carContext = raw ? JSON.parse(raw) : undefined
        return {
          id: crypto.randomUUID(),
          backendId: c.id,
          title: c.title,
          messages: [],
          createdAt: new Date(c.created_at),
          carContext,
        }
      })
      setConversations(loaded)
      setActiveId(loaded[0].id)
    })
  }, [user])

  // ── Nachrichten lazily laden wenn leere Backend-Konversation aktiv wird ─────
  const loadingRef = useRef<string | null>(null)

  useEffect(() => {
    const conv = conversationsRef.current.find((c) => c.id === activeId)
    if (!conv?.backendId || conv.messages.length > 0) return
    if (loadingRef.current === activeId) return
    loadingRef.current = activeId

    apiGetConversation(conv.backendId).then((full) => {
      const messages: Message[] = full.messages.map((m) => ({
        id: String(m.id),
        role: m.role,
        content: m.content,
      }))
      setConversations((prev) =>
        prev.map((c) => (c.id === activeId ? { ...c, messages } : c))
      )
      loadingRef.current = null
    }).catch(() => {
      loadingRef.current = null
    })
  }, [activeId])  // nur bei activeId-Wechsel triggern

  // ── Nachrichten im Backend persistieren (nach jeder vollständigen Antwort) ──
  const handleSaveExchange = useCallback(async (userText: string, assistantText: string) => {
    const convId = activeIdRef.current
    const conv = conversationsRef.current.find((c) => c.id === convId)
    if (!conv) return

    let backendId = conv.backendId

    if (!backendId) {
      // Neue Konversation: im Backend anlegen
      const title = conv.title !== 'Neuer Chat'
        ? conv.title
        : (userText.slice(0, 42) + (userText.length > 42 ? '…' : ''))
      const apiConv = await apiCreateConversation(title)
      backendId = apiConv.id
      if (conv.carContext) {
        localStorage.setItem(`carCtx_${backendId}`, JSON.stringify(conv.carContext))
      }
      setConversations((prev) =>
        prev.map((c) => (c.id === convId ? { ...c, backendId } : c))
      )
    } else if (conv.title === 'Neuer Chat') {
      // Bestehende Backend-Konversation ohne Titel: updaten
      const title = userText.slice(0, 42) + (userText.length > 42 ? '…' : '')
      apiPatchConversation(backendId, title).catch(() => {})
    }

    // User- und Assistenten-Nachricht speichern
    await apiAddMessage(backendId, 'user', userText).catch(() => {})
    await apiAddMessage(backendId, 'assistant', assistantText).catch(() => {})
  }, [])

  // ── Konversations-Aktionen ───────────────────────────────────────────────────

  const refreshChecks = useCallback(() => {
    apiListChecks().then(setMyChecks)
  }, [])

  const handleSelectCheck = useCallback(async (id: number, typ: 'kauf' | 'verkauf') => {
    try {
      const full = await apiGetCheck(id)
      if (typ === 'kauf') {
        setSavedKaufCheck({
          id: full.id,
          eingabe: full.eingabe as unknown as KaufCheckForm,
          ergebnis: full.ergebnis as unknown as KaufCheckResult,
        })
        setSavedVerkaufsCheck(null)
        navigate('/kaufcheck')
      } else {
        setSavedVerkaufsCheck({
          id: full.id,
          eingabe: full.eingabe as unknown as VerkaufsCheckForm,
          ergebnis: full.ergebnis as unknown as VerkaufsCheckResult,
        })
        setSavedKaufCheck(null)
        navigate('/verkaufscheck')
      }
    } catch {
      // Fehler still ignorieren — Check nicht mehr vorhanden
    }
  }, [navigate])

  const handleDeleteConv = useCallback(async (localId: string) => {
    const conv = conversationsRef.current.find((c) => c.id === localId)
    if (conv?.backendId) {
      apiDeleteConversation(conv.backendId).catch(() => {})
      localStorage.removeItem(`carCtx_${conv.backendId}`)
    }

    const remaining = conversationsRef.current.filter((c) => c.id !== localId)
    if (activeIdRef.current === localId) {
      if (remaining.length > 0) {
        setActiveId(remaining[0].id)
      } else {
        const fresh = newConversation()
        setConversations([fresh])
        setActiveId(fresh.id)
        return
      }
    }
    setConversations(remaining)
  }, [])

  const handleRenameConv = useCallback((localId: string, newTitle: string) => {
    if (!newTitle.trim()) return
    const conv = conversationsRef.current.find((c) => c.id === localId)
    if (conv?.backendId) apiPatchConversation(conv.backendId, newTitle.trim()).catch(() => {})
    setConversations((prev) =>
      prev.map((c) => c.id === localId ? { ...c, title: newTitle.trim() } : c)
    )
  }, [])

  const handleDeleteCheck = useCallback(async (id: number) => {
    apiDeleteCheck(id).catch(() => {})
    setMyChecks((prev) => prev.filter((c) => c.id !== id))
  }, [])

  const handleNewChat = useCallback(() => {
    // Leere lokale Konversation (kein Backend, keine Nachrichten) wiederverwenden
    // statt neue Leiche anzuhäufen
    const emptyLocal = conversationsRef.current.find(
      (c) => !c.backendId && c.messages.length === 0 && !c.carContext
    )
    if (emptyLocal) {
      setActiveId(emptyLocal.id)
      navigate('/chat')
      return
    }
    const conv = newConversation()
    setConversations((prev) => [conv, ...prev])
    setActiveId(conv.id)
    navigate('/chat')
  }, [navigate])

  const handleEntdeckenSelect = useCallback((carId: string, titel: string, img?: string, imgAussen?: string, imgMotor?: string, imgInnen?: string) => {
    // Existierende leere Auto-Konversation desselben Modells wiederverwenden
    const existing = conversationsRef.current.find(
      (c) => c.carContext?.id === carId && !c.backendId && c.messages.length === 0
    )
    if (existing) {
      setActiveId(existing.id)
      navigate('/chat')
      return
    }
    const conv = {
      ...newConversation(),
      title: titel,
      carContext: { id: carId, titel, img, imgAussen, imgMotor, imgInnen },
    }
    // Andere leere lokale Konversationen vor dem Hinzufügen entfernen
    setConversations((prev) => [
      conv,
      ...prev.filter((c) => c.backendId !== undefined || c.messages.length > 0),
    ])
    setActiveId(conv.id)
    navigate('/chat')
  }, [navigate])

  const handleSelectConv = useCallback((id: string) => {
    setActiveId(id)
    navigate('/chat')
  }, [navigate])

  const handleMessagesUpdate = useCallback(
    (messages: Message[]) => {
      const id = activeIdRef.current
      setConversations((prev) =>
        prev.map((c) =>
          c.id === id
            ? {
                ...c,
                messages,
                title: c.title === 'Neuer Chat' ? titleFromMessages(messages) : c.title,
              }
            : c
        )
      )
    },
    []
  )

  return (
    <div className="flex h-screen overflow-hidden bg-white">
      <Sidebar
        conversations={conversations.filter(
          (c) => c.backendId !== undefined || c.messages.length > 0
        )}
        activeConvId={activeId}
        onNewChat={handleNewChat}
        onSelectConv={handleSelectConv}
        onDeleteConv={handleDeleteConv}
        onRenameConv={handleRenameConv}
        checks={myChecks}
        onSelectCheck={handleSelectCheck}
        onDeleteCheck={handleDeleteCheck}
        mobileOpen={mobileNavOpen}
        onMobileClose={() => setMobileNavOpen(false)}
      />
      <main className="flex-1 overflow-hidden flex flex-col min-w-0">
        {/* Mobile-Topbar — nur < md sichtbar, öffnet die Off-Canvas-Sidebar.
            Auf Desktop (md+) ist die Sidebar immer sichtbar, diese Leiste entfällt. */}
        <div className="md:hidden flex items-center gap-3 h-14 px-4 border-b border-gray-100 shrink-0">
          <button
            onClick={() => setMobileNavOpen(true)}
            aria-label="Menü öffnen"
            className="p-2 -ml-2 rounded-lg text-gray-600 hover:bg-gray-100 active:bg-gray-200 transition-colors"
          >
            <Menu size={20} />
          </button>
          <img src="/logo.svg" alt="Vira" className="w-6 h-6 rounded-md" />
          <span className="font-semibold text-sm text-gray-900 tracking-tight">Vira</span>
        </div>
        <div className="flex-1 min-h-0 overflow-hidden">
        <Routes>
          <Route path="/" element={<Navigate to="/chat" replace />} />

          {/* AutoFinder + Autokosten — öffentliche, kostenlose Werkzeuge, KEIN
              <Guard>. Laufen trotzdem in dieser Shell (Sidebar/Footer/Hinter-
              grund) wie jedes andere Werkzeug. Autokosten ist rein deterministisch
              (kein Backend, keine Nutzerdaten). */}
          <Route path="/autofinder" element={<AutoFinderView />} />
          <Route path="/autokosten" element={<AutokostenView />} />

          <Route
            path="/chat"
            element={
              <Guard authed={!!user} loading={isLoading}>
                <ChatView
                  conversation={activeConv}
                  onMessagesUpdate={handleMessagesUpdate}
                  onSaveExchange={handleSaveExchange}
                  autoMessage={pendingAutoMessage}
                  onAutoMessageDone={() => {}}
                />
              </Guard>
            }
          />
          <Route path="/kaufcheck" element={
            <Guard authed={!!user} loading={isLoading}>
              <KaufCheckView
                savedCheck={savedKaufCheck}
                onCheckSaved={refreshChecks}
                onClearSaved={() => setSavedKaufCheck(null)}
              />
            </Guard>
          } />
          <Route path="/verkaufscheck" element={
            <Guard authed={!!user} loading={isLoading}>
              <VerkaufsCheckView
                savedCheck={savedVerkaufsCheck}
                onCheckSaved={refreshChecks}
                onClearSaved={() => setSavedVerkaufsCheck(null)}
              />
            </Guard>
          } />
          {/* Phase 5: Dealer-Bereich nur bei effektiver Berechtigung (MAX-Tarif ODER
              manueller Override). Backend erzwingt zusätzlich 403 — Guard ist Komfort. */}
          <Route
            path="/dealer"
            element={
              <Guard authed={!!user} loading={isLoading}>
                {user?.dealer_access ? <DealerView /> : <Navigate to="/chat" replace />}
              </Guard>
            }
          />
          <Route
            path="/dealer/:id"
            element={
              <Guard authed={!!user} loading={isLoading}>
                {user?.dealer_access ? <DealerVehicleView onOpenCheck={handleSelectCheck} /> : <Navigate to="/chat" replace />}
              </Guard>
            }
          />
          <Route
            path="/entdecken"
            element={
              <Guard authed={!!user} loading={isLoading}>
                <EntdeckenView onCarSelect={handleEntdeckenSelect} />
              </Guard>
            }
          />
          <Route path="/ebooks" element={<Guard authed={!!user} loading={isLoading}><EbookView /></Guard>} />
          <Route path="/ersatzteile" element={<Guard authed={!!user} loading={isLoading}><ErsatzteileView /></Guard>} />
          <Route path="/pricing" element={<Guard authed={!!user} loading={isLoading}><PricingView /></Guard>} />
          <Route path="/settings" element={<Guard authed={!!user} loading={isLoading}><SettingsView /></Guard>} />
          <Route path="/help" element={<Guard authed={!!user} loading={isLoading}><HelpView /></Guard>} />
        </Routes>
        </div>
        <Footer />
      </main>
    </div>
  )
}

// ── Root App ──────────────────────────────────────────────────────────────────

export default function App() {
  const [showSplash, setShowSplash] = useState(true)
  const [appMounted, setAppMounted] = useState(false)

  useEffect(() => {
    const t = setTimeout(() => startTransition(() => setAppMounted(true)), 150)
    return () => clearTimeout(t)
  }, [])

  return (
    <>
      {showSplash && (
        <SplashScreen onDone={() => setShowSplash(false)} />
      )}

      {appMounted && (
        <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/login" element={<LoginView />} />
              {/* Rechtsseiten öffentlich (ohne Login) erreichbar — Impressum &
                  Datenschutz müssen für jeden zugänglich sein. Eigenständig,
                  ohne App-Shell (reiner Rechtstext). */}
              <Route path="/impressum" element={<LegalView page="impressum" />} />
              <Route path="/datenschutz" element={<LegalView page="datenschutz" />} />
              <Route path="/agb" element={<LegalView page="agb" />} />
              <Route path="/widerruf" element={<LegalView page="widerruf" />} />
              {/* Die VIRA-App-Shell. Kein Blanket-Auth-Gate mehr — der Schutz
                  sitzt pro Route (<Guard>), damit die öffentliche /autofinder-
                  Seite dieselbe Shell nutzen kann. */}
              <Route path="/*" element={<AppContent />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      )}
    </>
  )
}
