import { NavLink, useNavigate } from 'react-router-dom'
import { MessageSquare, ShoppingCart, TrendingUp, Plus, Clock, Car, Compass, LogOut, FileText } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import type { ApiCheckSummary } from '../api/client'
import type { Conversation } from '../types'

interface SidebarProps {
  conversations: Conversation[]
  activeConvId: string | null
  onNewChat: () => void
  onSelectConv: (id: string) => void
  checks: ApiCheckSummary[]
  onSelectCheck: (id: number, typ: 'kauf' | 'verkauf') => void
}

export default function Sidebar({ conversations, activeConvId, onNewChat, onSelectConv, checks, onSelectCheck }: SidebarProps) {
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  function handleNewChat() {
    onNewChat()
    navigate('/chat')
  }

  async function handleLogout() {
    await logout()
    navigate('/login', { replace: true })
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

      {/* Meine Checks */}
      {checks.length > 0 && (
        <div className="px-3 pt-4 shrink-0">
          <p className="px-3 pb-1 text-xs font-medium text-sidebar-muted uppercase tracking-wider flex items-center gap-1.5">
            <FileText size={11} /> Meine Checks
          </p>
          <div className="space-y-0.5 mt-1">
            {checks.map((check) => (
              <button
                key={check.id}
                onClick={() => onSelectCheck(check.id, check.typ)}
                className="w-full text-left px-3 py-2 rounded-lg transition-colors text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-text flex items-center gap-2"
              >
                {check.typ === 'kauf' ? (
                  <ShoppingCart size={12} className="shrink-0 text-blue-400" />
                ) : (
                  <TrendingUp size={12} className="shrink-0 text-green-400" />
                )}
                <span className="text-xs truncate min-w-0">{check.titel}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* User-Footer */}
      <div className="mt-auto border-t border-sidebar-border">
        {user && (
          <div className="flex items-center gap-2.5 px-3 py-3">
            {/* Avatar */}
            <div className="w-7 h-7 rounded-full bg-orange-500 flex items-center justify-center shrink-0 text-white text-xs font-bold select-none">
              {user.email[0].toUpperCase()}
            </div>
            {/* E-Mail */}
            <span className="flex-1 text-xs text-sidebar-muted truncate min-w-0">
              {user.email}
            </span>
            {/* Logout */}
            <button
              onClick={handleLogout}
              title="Abmelden"
              className="shrink-0 p-1 rounded text-sidebar-muted hover:text-sidebar-text hover:bg-sidebar-hover transition-colors"
            >
              <LogOut size={14} />
            </button>
          </div>
        )}
      </div>
    </aside>
  )
}
