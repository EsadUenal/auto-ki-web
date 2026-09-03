import { useEffect, useRef, useState } from 'react'
import { NavLink, useNavigate } from 'react-router-dom'
import {
  MessageSquare, ShoppingCart, TrendingUp, Plus, Clock,
  Compass, LogOut, Pencil, Trash2, Check, X, CreditCard,
  Settings, HelpCircle, ChevronUp, Zap, Star, Crown, BookOpen, Store, Car, Calculator,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import {
  ladeSuchen, loescheSuchen, stageSucheRestore,
  HISTORY_EVENT, HISTORY_SIDEBAR_MAX,
  type GespeicherteSuche,
} from './autofinder/logic'
import type { ApiCheckSummary } from '../api/client'
import type { Conversation } from '../types'

const ABO_CONFIG = {
  light: { label: 'LIGHT', icon: <Zap size={11} />, cls: 'bg-blue-500 text-white' },
  pro:   { label: 'PRO',   icon: <Star size={11} />, cls: 'bg-orange-500 text-white' },
  max:   { label: 'MAX',   icon: <Crown size={11} />, cls: 'bg-purple-500 text-white' },
} as const

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
  /** Nur für Mobile/Tablet (< md): steuert den Off-Canvas-Zustand der Sidebar.
   *  Auf Desktop (md+) bleibt die Sidebar unabhängig davon immer sichtbar. */
  mobileOpen?: boolean
  onMobileClose?: () => void
}

export default function Sidebar({
  conversations, activeConvId, onNewChat, onSelectConv,
  onDeleteConv, onRenameConv,
  checks, onSelectCheck, onDeleteCheck,
  mobileOpen = false, onMobileClose,
}: SidebarProps) {
  const navigate = useNavigate()
  const { user, logout } = useAuth()

  const [editingConvId, setEditingConvId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const editInputRef = useRef<HTMLInputElement>(null)

  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // AutoFinder-Suchhistorie (localStorage) — die Sidebar zeigt die letzten
  // paar; auf ein Custom-Event von logic.ts hin sofort neu einlesen.
  const [afSuchen, setAfSuchen] = useState<GespeicherteSuche[]>([])
  useEffect(() => {
    const refresh = () => setAfSuchen(ladeSuchen())
    refresh()
    window.addEventListener(HISTORY_EVENT, refresh)
    window.addEventListener('storage', refresh)   // anderer Tab
    return () => {
      window.removeEventListener(HISTORY_EVENT, refresh)
      window.removeEventListener('storage', refresh)
    }
  }, [])

  function openSuche(s: GespeicherteSuche) {
    stageSucheRestore(s.id)
    navigate('/autofinder')
    onMobileClose?.()
  }

  // FIX 1: KaufCheck- und VerkaufsCheck-Historie bekommen — wie AutoFinder —
  // je einen eigenen Sidebar-Bereich. Datenquelle ist die BESTEHENDE Check-
  // Historie (`checks`, Backend `/api/v1/checks`, ORDER BY created_at DESC);
  // KEINE zweite parallele History. Öffnen/Löschen nutzen die vorhandenen
  // Callbacks (onSelectCheck / onDeleteCheck).
  const kaufChecks = checks.filter((c) => c.typ === 'kauf').slice(0, HISTORY_SIDEBAR_MAX)
  const verkaufChecks = checks.filter((c) => c.typ === 'verkauf').slice(0, HISTORY_SIDEBAR_MAX)

  function renderCheckSection(
    titel: string,
    Icon: typeof ShoppingCart,
    iconCls: string,
    list: ApiCheckSummary[],
    typ: 'kauf' | 'verkauf',
  ) {
    if (list.length === 0) return null
    return (
      <div className="px-3 pt-5">
        <p className="px-3 pb-1 text-xs font-medium text-sidebar-muted uppercase tracking-wider flex items-center gap-1.5">
          <Icon size={11} /> {titel}
        </p>
        <div className="space-y-0.5 mt-1">
          {list.map((check) => (
            <div key={check.id} className="relative group/check">
              <button
                onClick={() => { onSelectCheck(check.id, typ); onMobileClose?.() }}
                className="w-full text-left px-3 py-2 rounded-lg text-xs truncate transition-colors text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-text flex items-center gap-2 pr-8"
              >
                <Icon size={12} className={`shrink-0 ${iconCls}`} />
                <span className="truncate min-w-0">{check.titel}</span>
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
    )
  }

  useEffect(() => {
    if (!menuOpen) return
    function onOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', onOutside)
    return () => document.removeEventListener('mousedown', onOutside)
  }, [menuOpen])

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
    onMobileClose?.()
  }

  async function handleLogout() {
    setMenuOpen(false)
    await logout()
    navigate('/login', { replace: true })
  }

  function goTo(path: string) {
    setMenuOpen(false)
    navigate(path)
    onMobileClose?.()
  }

  return (
    <>
      {/* Mobile-Backdrop — schließt die Sidebar bei Tap außerhalb (nur < md, nur wenn offen) */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={onMobileClose}
          aria-hidden="true"
        />
      )}

      <aside
        className={`flex flex-col w-64 shrink-0 bg-sidebar-bg text-sidebar-text h-full
          fixed inset-y-0 left-0 z-40 transition-transform duration-300 ease-out
          ${mobileOpen ? 'translate-x-0' : '-translate-x-full'}
          md:static md:z-auto md:translate-x-0`}
      >

      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-5 border-b border-sidebar-border">
        <img src="/logo.svg" alt="Vira" className="w-7 h-7 rounded-lg shrink-0" />
        <span className="font-semibold text-sm tracking-tight flex-1">Vira</span>
        {/* Schließen-Button — nur auf Mobile/Tablet sichtbar */}
        <button
          onClick={onMobileClose}
          aria-label="Menü schließen"
          className="md:hidden p-1.5 -mr-1.5 rounded-lg text-sidebar-muted hover:text-sidebar-text hover:bg-sidebar-hover transition-colors"
        >
          <X size={18} />
        </button>
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
          { to: '/autofinder',    Icon: Car,           label: 'AutoFinder' },
          { to: '/autokosten',    Icon: Calculator,    label: 'Autokosten' },
          // Dealer-Bereich nur bei effektiver Berechtigung (MAX-Tarif ODER manueller
          // Override) — dealer_access wird serverseitig abgeleitet.
          ...(user?.dealer_access ? [{ to: '/dealer', Icon: Store, label: 'Dealer' }] : []),
          // Ersatzteile: technisch im Repo geparkt, aber NICHT im Consumer-UI
          // freigegeben — kein Sidebar-Eintrag, keine sichtbare Navigation.
          { to: '/entdecken',     Icon: Compass,       label: 'Entdecken' },
          { to: '/ebooks',        Icon: BookOpen,      label: 'E-Books' },
          { to: '/pricing',       Icon: CreditCard,    label: 'Preise & Abo' },
        ].map(({ to, Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            onClick={onMobileClose}
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

      {/* Verlauf + Meine Checks + AutoFinder-Suchen — EIN gemeinsamer Scroll-
          Bereich. Footer bleibt immer sichtbar, nichts wird verdrängt. */}
      {(conversations.length > 0 || checks.length > 0 || afSuchen.length > 0) && (
        <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin">
          {afSuchen.length > 0 && (
            <div className="px-3 pt-5">
              <p className="px-3 pb-1 text-xs font-medium text-sidebar-muted uppercase tracking-wider flex items-center justify-between gap-1.5">
                <span className="flex items-center gap-1.5"><Car size={11} /> AutoFinder</span>
                <button
                  onClick={() => loescheSuchen()}
                  title="Suchverlauf löschen"
                  className="text-sidebar-muted hover:text-red-400 transition-colors"
                >
                  <Trash2 size={11} />
                </button>
              </p>
              <div className="space-y-0.5 mt-1">
                {afSuchen.slice(0, HISTORY_SIDEBAR_MAX).map((s) => (
                  <button
                    key={s.id}
                    onClick={() => openSuche(s)}
                    className="w-full text-left px-3 py-2 rounded-lg text-xs truncate transition-colors text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-text flex items-center gap-2"
                  >
                    <Car size={12} className="shrink-0 text-orange-400" />
                    <span className="truncate min-w-0">{s.label}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
          {conversations.length > 0 && (
            <div className="px-3 pt-5">
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
                          onClick={() => { onSelectConv(conv.id); navigate('/chat'); onMobileClose?.() }}
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

          {renderCheckSection('Kauf-Check', ShoppingCart, 'text-blue-400', kaufChecks, 'kauf')}
          {renderCheckSection('Verkaufs-Check', TrendingUp, 'text-green-400', verkaufChecks, 'verkauf')}
        </div>
      )}

      {/* User-Footer */}
      <div className="mt-auto border-t border-sidebar-border relative" ref={menuRef}>

        {/* ── Account-Menü-Popover ─────────────────────────────────────── */}
        {menuOpen && user && (
          <div className="absolute bottom-full left-2 right-2 mb-2 rounded-xl border border-sidebar-border bg-sidebar-bg shadow-2xl overflow-hidden z-50">

            {/* Kopf: Vira-Brand + E-Mail + Abo */}
            <div className="px-4 py-3 border-b border-sidebar-border">
              <div className="flex items-center gap-2 mb-3 pb-2.5 border-b border-sidebar-border/50">
                <img src="/logo.svg" alt="Vira" className="w-5 h-5 rounded-md shrink-0" />
                <span className="text-xs font-semibold text-sidebar-text tracking-tight">Vira</span>
                <span className="text-[10px] text-sidebar-muted ml-0.5">getvira.de</span>
              </div>
              <div className="flex items-center gap-2.5 mb-2">
                <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center shrink-0 text-white text-sm font-bold select-none">
                  {user.email[0].toUpperCase()}
                </div>
                <span className="text-xs text-sidebar-text truncate min-w-0 font-medium">
                  {user.email}
                </span>
              </div>
              {/* Abo-Status */}
              {user.abo_typ !== 'none' ? (
                <div className="flex items-center gap-2">
                  <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${ABO_CONFIG[user.abo_typ].cls}`}>
                    {ABO_CONFIG[user.abo_typ].icon}
                    {ABO_CONFIG[user.abo_typ].label}
                  </span>
                  {user.abo_typ !== 'max' && (
                    <span className="text-xs text-sidebar-muted">{user.checks_verbleibend} Check{user.checks_verbleibend !== 1 ? 's' : ''} verbleibend</span>
                  )}
                  {user.abo_typ === 'max' && (
                    <span className="text-xs text-sidebar-muted">Unbegrenzte Checks</span>
                  )}
                </div>
              ) : (
                <div className="text-xs text-sidebar-muted">
                  {user.checks_verbleibend > 0
                    ? <>{user.checks_verbleibend} Gratis-Check{user.checks_verbleibend !== 1 ? 's' : ''} übrig</>
                    : 'Kein Abo aktiv'}
                </div>
              )}
            </div>

            {/* Menü-Einträge */}
            <div className="py-1">
              <button
                onClick={() => goTo('/pricing')}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-sidebar-text hover:bg-sidebar-hover transition-colors text-left"
              >
                <CreditCard size={15} className="text-sidebar-muted shrink-0" />
                Alle Tarife anzeigen
              </button>

              <div className="my-1 border-t border-sidebar-border" />

              <button
                onClick={() => goTo('/settings')}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-sidebar-text hover:bg-sidebar-hover transition-colors text-left"
              >
                <Settings size={15} className="text-sidebar-muted shrink-0" />
                Einstellungen
              </button>
              <button
                onClick={() => goTo('/help')}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-sidebar-text hover:bg-sidebar-hover transition-colors text-left"
              >
                <HelpCircle size={15} className="text-sidebar-muted shrink-0" />
                Hilfe
              </button>

              <div className="my-1 border-t border-sidebar-border" />

              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-red-400 hover:bg-sidebar-hover transition-colors text-left"
              >
                <LogOut size={15} className="shrink-0" />
                Abmelden
              </button>
            </div>
          </div>
        )}

        {/* ── Trigger-Button ───────────────────────────────────────────── */}
        {user && (
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className={`w-full flex items-center gap-2.5 px-3 py-3 transition-colors text-left ${
              menuOpen ? 'bg-sidebar-hover' : 'hover:bg-sidebar-hover'
            }`}
          >
            {/* Avatar */}
            <div className="w-7 h-7 rounded-full bg-orange-500 flex items-center justify-center shrink-0 text-white text-xs font-bold select-none">
              {user.email[0].toUpperCase()}
            </div>

            {/* E-Mail + Abo-Badge */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-sidebar-text truncate font-medium">
                  {user.email}
                </span>
              </div>
              <div className="flex items-center gap-1.5 mt-0.5">
                {user.abo_typ !== 'none' ? (
                  <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-px rounded-full ${ABO_CONFIG[user.abo_typ].cls}`}>
                    {ABO_CONFIG[user.abo_typ].icon}
                    {ABO_CONFIG[user.abo_typ].label}
                  </span>
                ) : (
                  <span className="text-[10px] text-sidebar-muted">Kostenlos</span>
                )}
                {user.abo_typ !== 'none' && user.abo_typ !== 'max' && (
                  <span className="text-[10px] text-sidebar-muted">{user.checks_verbleibend} verbleibend</span>
                )}
                {user.abo_typ === 'none' && user.checks_verbleibend > 0 && (
                  <span className="text-[10px] text-sidebar-muted">{user.checks_verbleibend} Check{user.checks_verbleibend !== 1 ? 's' : ''} übrig</span>
                )}
              </div>
            </div>

            {/* Chevron */}
            <ChevronUp
              size={14}
              className={`shrink-0 text-sidebar-muted transition-transform duration-200 ${menuOpen ? 'rotate-180' : ''}`}
            />
          </button>
        )}
      </div>
      </aside>
    </>
  )
}
