import { startTransition, useCallback, useEffect, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import Sidebar from './components/Sidebar'
import ChatView from './components/ChatView'
import KaufCheckView from './components/KaufCheckView'
import VerkaufsCheckView from './components/VerkaufsCheckView'
import EntdeckenView from './components/EntdeckenView'
import SplashScreen from './components/SplashScreen'
import type { Conversation, Message } from './types'

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

export default function App() {
  const [showSplash, setShowSplash] = useState(true)
  const [appMounted, setAppMounted] = useState(false)

  // Defer heavy app mount so the splash animation runs jank-free.
  useEffect(() => {
    const t = setTimeout(() => startTransition(() => setAppMounted(true)), 150)
    return () => clearTimeout(t)
  }, [])

  const [conversations, setConversations] = useState<Conversation[]>(() => [newConversation()])
  const [activeId, setActiveId] = useState<string>(conversations[0].id)
  const [pendingAutoMessage, setPendingAutoMessage] = useState<string | null>(null)

  const activeConv = conversations.find((c) => c.id === activeId) ?? conversations[0]

  const handleNewChat = useCallback(() => {
    const conv = newConversation()
    setConversations((prev) => [conv, ...prev])
    setActiveId(conv.id)
  }, [])

  const handleEntdeckenSelect = useCallback((frage: string, titel: string) => {
    const conv = { ...newConversation(), title: titel }
    setConversations((prev) => [conv, ...prev])
    setActiveId(conv.id)
    setPendingAutoMessage(frage)
  }, [])

  const handleSelectConv = useCallback((id: string) => {
    setActiveId(id)
  }, [])

  const handleMessagesUpdate = useCallback(
    (messages: Message[]) => {
      setConversations((prev) =>
        prev.map((c) =>
          c.id === activeId
            ? {
                ...c,
                messages,
                // Only auto-title if it's still the default; Entdecken-started chats keep their model name
                title: c.title === 'Neuer Chat' ? titleFromMessages(messages) : c.title,
              }
            : c
        )
      )
    },
    [activeId]
  )

  return (
    <>
      {showSplash && (
        <SplashScreen onDone={() => setShowSplash(false)} />
      )}

      {appMounted && (
        <BrowserRouter>
          <div className="flex h-screen overflow-hidden bg-white">
            <Sidebar
              conversations={conversations}
              activeConvId={activeId}
              onNewChat={handleNewChat}
              onSelectConv={handleSelectConv}
            />
            <main className="flex-1 overflow-hidden">
              <Routes>
                <Route path="/" element={<Navigate to="/chat" replace />} />
                <Route
                  path="/chat"
                  element={
                    <ChatView
                      conversation={activeConv}
                      onMessagesUpdate={handleMessagesUpdate}
                      autoMessage={pendingAutoMessage}
                      onAutoMessageDone={() => setPendingAutoMessage(null)}
                    />
                  }
                />
                <Route path="/kaufcheck" element={<KaufCheckView />} />
                <Route path="/verkaufscheck" element={<VerkaufsCheckView />} />
                <Route
                  path="/entdecken"
                  element={<EntdeckenView onCarSelect={handleEntdeckenSelect} />}
                />
              </Routes>
            </main>
          </div>
        </BrowserRouter>
      )}
    </>
  )
}
