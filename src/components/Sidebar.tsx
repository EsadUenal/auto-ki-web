import { NavLink, useNavigate } from 'react-router-dom'
import { MessageSquare, ShoppingCart, TrendingUp, Plus, Clock, Car, Compass } from 'lucide-react'
import type { Conversation } from '../types'

interface SidebarProps {
  conversations: Conversation[]
  activeConvId: string | null
  onNewChat: () => void
  onSelectConv: (id: string) => void
}

export default function Sidebar({ conversations, activeConvId, onNewChat, onSelectConv }: SidebarProps) {
  const navigate = useNavigate()

  function handleNewChat() {
    onNewChat()
    navigate('/chat')
  }

  return (
    <aside className="flex flex-col w-64 shrink-0 bg-sidebar-bg text-sidebar-text h-full">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-5 border-b border-sidebar-border">
        <div className="w-7 h-7 rounded-lg bg-orange-500 flex items-center justify-center shrink-0">
          <Car size={15} className="text-white" />
        </div>
        <span className="font-semibold text-sm tracking-tight">Auto-KI</span>
      </div>

      {/* Neuer Chat */}
      <div className="px-3 pt-3">
        <button
          onClick={handleNewChat}
          className="flex items-center gap-2 w-full px-3 py-2 rounded-lg text-sm text-sidebar-text hover:bg-sidebar-hover transition-colors"
        >
          <Plus size={16} />
          Neuer Chat
        </button>
      </div>

      {/* Hauptnavigation */}
      <nav className="px-3 pt-4 space-y-0.5">
        <p className="px-3 pb-1 text-xs font-medium text-sidebar-muted uppercase tracking-wider">Werkzeuge</p>
        <NavLink
          to="/chat"
          className={({ isActive }) =>
            `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
              isActive ? 'bg-sidebar-active text-white' : 'text-sidebar-text hover:bg-sidebar-hover'
            }`
          }
        >
          <MessageSquare size={16} />
          KI-Chat
        </NavLink>
        <NavLink
          to="/kaufcheck"
          className={({ isActive }) =>
            `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
              isActive ? 'bg-sidebar-active text-white' : 'text-sidebar-text hover:bg-sidebar-hover'
            }`
          }
        >
          <ShoppingCart size={16} />
          Kauf-Check
        </NavLink>
        <NavLink
          to="/verkaufscheck"
          className={({ isActive }) =>
            `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
              isActive ? 'bg-sidebar-active text-white' : 'text-sidebar-text hover:bg-sidebar-hover'
            }`
          }
        >
          <TrendingUp size={16} />
          Verkaufs-Check
        </NavLink>
        <NavLink
          to="/entdecken"
          className={({ isActive }) =>
            `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
              isActive ? 'bg-sidebar-active text-white' : 'text-sidebar-text hover:bg-sidebar-hover'
            }`
          }
        >
          <Compass size={16} />
          Entdecken
        </NavLink>
      </nav>

      {/* Verlauf */}
      {conversations.length > 0 && (
        <div className="px-3 pt-5 flex-1 overflow-y-auto scrollbar-thin">
          <p className="px-3 pb-1 text-xs font-medium text-sidebar-muted uppercase tracking-wider flex items-center gap-1.5">
            <Clock size={11} /> Verlauf
          </p>
          <div className="space-y-0.5 mt-1">
            {conversations.map((conv) => (
              <button
                key={conv.id}
                onClick={() => { onSelectConv(conv.id); navigate('/chat') }}
                className={`w-full text-left px-3 py-2 rounded-lg text-sm truncate transition-colors ${
                  activeConvId === conv.id
                    ? 'bg-sidebar-active text-white'
                    : 'text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-text'
                }`}
              >
                {conv.title}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="mt-auto px-4 py-3 border-t border-sidebar-border">
        <p className="text-xs text-sidebar-muted text-center">Phase 2a · Ohne Login</p>
      </div>
    </aside>
  )
}
