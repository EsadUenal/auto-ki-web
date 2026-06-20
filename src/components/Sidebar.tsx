import { useRef, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  MessageSquare, ShoppingCart, TrendingUp, Plus, Clock,
  Car, Compass, LogOut, FileText, Pencil, Trash2, Check, X, CreditCard,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import type { ApiCheckSummary } from '../api/client'
import type { Conversation } from '../types'

interface SidebarProps {
  conversations: Conversation[]
  activeConvId: string | null
  onNewChat: () => void
  onSelectConv: (id: string) => void
  onDeleteConv: (id: string) => void
  onRenameConv: (id: string, newTitle: string) => void
  checks: ApiCheckSummary[]
  onSelectCheck: (id: number, typ: 'kauf' | 'verkauf') => void
  onDeleteCheck: (id: number) => void
}

export default function Sidebar({
  conversations, activeConvId, onNewChat, onSelectConv,
  onDeleteConv, onRenameConv,
  checks, onSelectCheck, onDeleteCheck,
}: SidebarProps) {
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  const [editingConvId, setEditingConvId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const editInputRef = useRef<HTMLInputElement>(null)

  function startRename(conv: Conversation) {
    setEditingConvId(conv.id)
    setEditTitle(conv.title)
    setTimeout(() => editInputRef.current?.select(), 0)
  }

  function confirmRename() {
    if (editingConvId && editTitle.trim()) {
      onRenameConv(editingConvId, editTitle.trim())
    }
    setEditingConvId(null)
  }

  function cancelRename() {
    setEditingConvId(null)
  }

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
        {[
          { to: '/chat',          Icon: MessageSquare, label: 'KI-Chat' },
          { to: '/kaufcheck',     Icon: ShoppingCart,  label: 'Kauf-Check' },
          { to: '/verkaufscheck', Icon: TrendingUp,    label: 'Verkaufs-Check' },
          { to: '/entdecken',     Icon: Compass,       label: 'Entdecken' },
          { to: '/pricing',       Icon: CreditCard,    label: 'Preise & Abo' },
        ].map(({ to, Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              `flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                isActive ? 'bg-sidebar-active text-white' : 'text-sidebar-text hover:bg-sidebar-hover'
              }`
            }
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Verlauf */}
      {conversations.length > 0 && (
        <div className="px-3 pt-5 flex-1 overflow-y-auto scrollbar-thin">
          <p className="px-3 pb-1 text-xs font-medium text-sidebar-muted uppercase tracking-wider flex items-center gap-1.5">
            <Clock size={11} /> Verlauf
          </p>
          <div className="space-y-0.5 mt-1">
            {conversations.map((conv) => (
              <div key={conv.id} className="relative group/conv">

                {editingConvId === conv.id ? (
                  /* ── Inline-Rename ── */
                  <div className="flex items-center gap-1 px-1">
                    <input
                      ref={editInputRef}
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter')  { e.preventDefault(); confirmRename() }
                        if (e.key === 'Escape') cancelRename()
                      }}
                      className="flex-1 min-w-0 bg-sidebar-hover text-sidebar-text text-sm rounded px-2 py-1.5 outline-none border border-sidebar-border"
                    />
                    <button onClick={confirmRename} className="shrink-0 p-1 rounded text-green-400 hover:bg-sidebar-hover">
                      <Check size={13} />
                    </button>
                    <button onClick={cancelRename} className="shrink-0 p-1 rounded text-sidebar-muted hover:bg-sidebar-hover">
                      <X size={13} />
                    </button>
                  </div>
                ) : (
                  /* ── Normal row ── */
                  <>
                    <button
                      onClick={() => { onSelectConv(conv.id); navigate('/chat') }}
                      className={`w-full text-left px-3 py-2 rounded-lg text-sm truncate transition-colors pr-14 ${
                        activeConvId === conv.id
                          ? 'bg-sidebar-active text-white'
                          : 'text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-text'
                      }`}
                    >
                      {conv.title}
                    </button>

                    {/* Action-Buttons — erscheinen beim Hover */}
                    <div className="absolute right-1 top-1/2 -translate-y-1/2 hidden group-hover/conv:flex gap-0.5">
                      <button
                        onClick={(e) => { e.stopPropagation(); startRename(conv) }}
                        title="Umbenennen"
                        className="p-1 rounded text-sidebar-muted hover:text-sidebar-text hover:bg-sidebar-hover transition-colors"
                      >
                        <Pencil size={12} />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); onDeleteConv(conv.id) }}
                        title="Löschen"
                        className="p-1 rounded text-sidebar-muted hover:text-red-400 hover:bg-sidebar-hover transition-colors"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </>
                )}
              </div>
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
              <div key={check.id} className="relative group/check">
                <button
                  onClick={() => onSelectCheck(check.id, check.typ)}
                  className="w-full text-left px-3 py-2 rounded-lg transition-colors text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-text flex items-center gap-2 pr-8"
                >
                  {check.typ === 'kauf'
                    ? <ShoppingCart size={12} className="shrink-0 text-blue-400" />
                    : <TrendingUp   size={12} className="shrink-0 text-green-400" />
                  }
                  <span className="text-xs truncate min-w-0">{check.titel}</span>
                </button>

                <button
                  onClick={(e) => { e.stopPropagation(); onDeleteCheck(check.id) }}
                  title="Löschen"
                  className="absolute right-1 top-1/2 -translate-y-1/2 hidden group-hover/check:flex p-1 rounded text-sidebar-muted hover:text-red-400 hover:bg-sidebar-hover transition-colors"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* User-Footer */}
      <div className="mt-auto border-t border-sidebar-border">
        {user && (
          <div className="px-3 py-3 space-y-1.5">
            {user.abo_typ !== 'none' && (
              <div className="flex items-center gap-1.5 px-2">
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                  user.abo_typ === 'max'   ? 'bg-purple-500 text-white' :
                  user.abo_typ === 'pro'   ? 'bg-orange-500 text-white' :
                                             'bg-blue-500 text-white'
                }`}>{user.abo_typ.toUpperCase()}</span>
                {user.abo_typ !== 'max' && (
                  <span className="text-xs text-sidebar-muted">{user.checks_verbleibend} verbleibend</span>
                )}
              </div>
            )}
            {user.abo_typ === 'none' && user.checks_verbleibend > 0 && (
              <div className="px-2">
                <span className="text-xs text-sidebar-muted">{user.checks_verbleibend} Gratis-Check übrig</span>
              </div>
            )}
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-full bg-orange-500 flex items-center justify-center shrink-0 text-white text-xs font-bold select-none">
                {user.email[0].toUpperCase()}
              </div>
              <span className="flex-1 text-xs text-sidebar-muted truncate min-w-0">
                {user.email}
              </span>
              <button
                onClick={handleLogout}
                title="Abmelden"
                className="shrink-0 p-1 rounded text-sidebar-muted hover:text-sidebar-text hover:bg-sidebar-hover transition-colors"
              >
                <LogOut size={14} />
              </button>
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}
