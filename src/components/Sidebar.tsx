import { useEffect, useRef, useState } from 'react'
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom'
import {
  MessageSquare, ShoppingCart, TrendingUp, Plus, Clock,
  LogIn, LogOut, Pencil, Trash2, Check, X, CreditCard,
  Settings, HelpCircle, ChevronUp, Zap, Star, Crown, BookOpen, Store, Car, Calculator,
  Sparkles,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import {
  ladeSuchen, loescheSuchen, stageSucheRestore,
  HISTORY_EVENT, HISTORY_SIDEBAR_MAX,
  type GespeicherteSuche,
} from './autofinder/logic'
import ConfirmDialog from './ConfirmDialog'
import {
  formatHistorieZeit, istChatAktiv, istCheckAktiv, istSucheAktiv, werkzeugMarkierung,
  type SidebarSelection,
} from './sidebarSelection'
import type { ApiCheckSummary } from '../api/client'
import type { Conversation } from '../types'

const ABO_CONFIG = {
  light: { label: 'LIGHT', icon: <Zap size={11} />, cls: 'bg-blue-500 text-white' },
  pro:   { label: 'PRO',   icon: <Star size={11} />, cls: 'bg-orange-500 text-white' },
  max:   { label: 'MAX',   icon: <Crown size={11} />, cls: 'bg-purple-500 text-white' },
} as const

interface SidebarProps {
  conversations: Conversation[]
  /** Kanonischer Auswahl-Zustand (Route + tatsaechlich geoeffnete Entitaet).
   *  EINZIGE Quelle fuer die orange Markierung — siehe sidebarSelection.ts. */
  selection: SidebarSelection
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
  conversations, selection, onNewChat, onSelectConv,
  onDeleteConv, onRenameConv,
  checks, onSelectCheck, onDeleteCheck,
  mobileOpen = false, onMobileClose,
}: SidebarProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, isLoading, logout } = useAuth()

  const [editingConvId, setEditingConvId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')
  const editInputRef = useRef<HTMLInputElement>(null)

  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  // Loeschen ist zerstoererisch und lief bisher direkt aus dem Papierkorb-Icon.
  // Jetzt erst nach ausdruecklicher Bestaetigung; bis dahin passiert NICHTS.
  type LoeschZiel =
    | { art: 'chat'; id: string; titel: string }
    | { art: 'check'; id: number; titel: string }
    | { art: 'af-alle' }
  const [loeschZiel, setLoeschZiel] = useState<LoeschZiel | null>(null)

  function loeschenBestaetigt() {
    const ziel = loeschZiel
    setLoeschZiel(null)
    if (!ziel) return
    if (ziel.art === 'chat') onDeleteConv(ziel.id)
    else if (ziel.art === 'check') onDeleteCheck(ziel.id)
    else loescheSuchen()
  }

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
          {list.map((check) => {
            const aktiv = istCheckAktiv(selection, typ, check.id)
            const zeit = formatHistorieZeit(check.created_at)
            return (
            <div key={check.id} className="relative group/check">
              <button
                onClick={() => { onSelectCheck(check.id, typ); onMobileClose?.() }}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors flex items-center gap-2 pr-8 ${
                  aktiv
                    ? 'bg-sidebar-active text-white'
                    : 'text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-text'
                }`}
              >
                <Icon size={12} className={`shrink-0 ${aktiv ? 'text-white' : iconCls}`} />
                <span className="min-w-0 flex-1">
                  <span className="block truncate">{check.titel}</span>
                  {zeit && (
                    <span className={`block truncate text-[10px] mt-0.5 ${aktiv ? 'text-white/70' : 'text-sidebar-muted'}`}>
                      {zeit}
                    </span>
                  )}
                </span>
              </button>
              <button
                onClick={(e) => { e.stopPropagation(); setLoeschZiel({ art: 'check', id: check.id, titel: check.titel }) }}
                title="Löschen"
                aria-label={`Eintrag ${check.titel} löschen`}
                className={`absolute right-1 top-1/2 -translate-y-1/2 hidden group-hover/check:flex p-1 rounded transition-colors ${
                  aktiv ? 'text-white/80 hover:text-white hover:bg-white/15' : 'text-sidebar-muted hover:text-red-400 hover:bg-sidebar-hover'
                }`}
              >
                <Trash2 size={12} />
              </button>
            </div>
            )
          })}
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
        {/* Logo führt zur Startseite — für Besucher, die direkt auf einer
            öffentlichen Werkzeugseite landen, der einzige Weg zur Übersicht. */}
        <Link to="/" onClick={onMobileClose} className="flex items-center gap-2.5 flex-1 min-w-0 rounded-lg">
          <img src="/logo.svg" alt="" className="w-7 h-7 rounded-lg shrink-0" />
          <span className="font-semibold text-sm tracking-tight">ENFAL</span>
        </Link>
        {/* Schließen-Button — nur auf Mobile/Tablet sichtbar */}
        <button
          onClick={onMobileClose}
          aria-label="Menü schließen"
          className="md:hidden p-1.5 -mr-1.5 rounded-lg text-sidebar-muted hover:text-sidebar-text hover:bg-sidebar-hover transition-colors"
        >
          <X size={18} />
        </button>
      </div>

      {/* EIN Scrollbereich fuer die gesamte Navigation: "Neuer Chat",
          Werkzeuge und History. Vorher scrollte nur die History in einem
          eigenen kleinen Fenster — bei wenig Hoehe (oder 125 % Zoom) zerfiel
          die Sidebar dadurch sichtbar in zwei Welten. Logo oben und
          Konto-Bereich unten bleiben fest. */}
      <div className="flex-1 min-h-0 overflow-y-auto scrollbar-thin pb-3">

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
          { to: '/kaufcheck',     Icon: ShoppingCart,  label: 'KaufCheck' },
          { to: '/verkaufscheck', Icon: TrendingUp,    label: 'VerkaufsCheck' },
          { to: '/autofinder',    Icon: Car,           label: 'AutoFinder' },
          { to: '/autokosten',    Icon: Calculator,    label: 'Autokosten' },
          // Dealer-Bereich nur bei effektiver Berechtigung (MAX-Tarif ODER manueller
          // Override) — dealer_access wird serverseitig abgeleitet.
          ...(user?.dealer_access ? [{ to: '/dealer', Icon: Store, label: 'Dealer' }] : []),
          // Ersatzteile: technisch im Repo geparkt, aber NICHT im Consumer-UI
          // freigegeben — kein Sidebar-Eintrag, keine sichtbare Navigation.
          { to: '/ebooks',        Icon: BookOpen,      label: 'E-Books' },
          { to: '/pricing',       Icon: CreditCard,    label: 'Preise' },
        ].map(({ to, Icon, label }) => {
          // Primaer orange ist ein Werkzeug NUR, wenn kein gespeicherter Eintrag
          // geoeffnet ist. Sonst traegt der konkrete History-Eintrag die
          // Markierung und das Werkzeug zeigt hoechstens dezent, wo man sich
          // befindet (keine zwei widerspruechlichen Aktiv-Zustaende).
          const mark = werkzeugMarkierung(selection, location.pathname, to)
          return (
            <Link
              key={to}
              to={to}
              onClick={onMobileClose}
              aria-current={mark === 'primaer' ? 'page' : undefined}
              className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors ${
                mark === 'primaer'
                  ? 'bg-sidebar-active text-white'
                  : mark === 'sekundaer'
                    ? 'bg-sidebar-hover text-sidebar-text'
                    : 'text-sidebar-text hover:bg-sidebar-hover'
              }`}
            >
              <Icon size={16} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* History-Gruppen — im SELBEN Scrollbereich wie die Werkzeuge. */}
          {afSuchen.length > 0 && (
            <div className="px-3 pt-5">
              <p className="px-3 pb-1 text-xs font-medium text-sidebar-muted uppercase tracking-wider flex items-center justify-between gap-1.5">
                <span className="flex items-center gap-1.5"><Car size={11} /> AutoFinder</span>
                <button
                  onClick={() => setLoeschZiel({ art: 'af-alle' })}
                  title="Suchverlauf löschen"
                  aria-label="AutoFinder-Suchverlauf löschen"
                  className="text-sidebar-muted hover:text-red-400 transition-colors"
                >
                  <Trash2 size={11} />
                </button>
              </p>
              <div className="space-y-0.5 mt-1">
                {afSuchen.slice(0, HISTORY_SIDEBAR_MAX).map((s) => {
                  const aktiv = istSucheAktiv(selection, s.id)
                  const zeit = formatHistorieZeit(s.ts)
                  return (
                    <button
                      key={s.id}
                      onClick={() => openSuche(s)}
                      className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors flex items-center gap-2 ${
                        aktiv
                          ? 'bg-sidebar-active text-white'
                          : 'text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-text'
                      }`}
                    >
                      <Car size={12} className={`shrink-0 ${aktiv ? 'text-white' : 'text-orange-400'}`} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate">{s.label}</span>
                        {zeit && (
                          <span className={`block truncate text-[10px] mt-0.5 ${aktiv ? 'text-white/70' : 'text-sidebar-muted'}`}>
                            {zeit}
                          </span>
                        )}
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
          {conversations.length > 0 && (
            <div className="px-3 pt-5">
              <p className="px-3 pb-1 text-xs font-medium text-sidebar-muted uppercase tracking-wider flex items-center gap-1.5">
                <Clock size={11} /> Verlauf
              </p>
              <div className="space-y-0.5 mt-1">
                {conversations.map((conv) => {
                  const aktiv = istChatAktiv(selection, conv.id)
                  const zeit = formatHistorieZeit(conv.createdAt)
                  return (
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
                          className={`w-full text-left px-3 py-2 rounded-lg text-sm transition-colors pr-14 ${
                            aktiv
                              ? 'bg-sidebar-active text-white'
                              : 'text-sidebar-muted hover:bg-sidebar-hover hover:text-sidebar-text'
                          }`}
                        >
                          <span className="block truncate">{conv.title}</span>
                          {zeit && (
                            <span className={`block truncate text-[10px] mt-0.5 ${aktiv ? 'text-white/70' : 'text-sidebar-muted'}`}>
                              {zeit}
                            </span>
                          )}
                        </button>

                        {/* Action-Buttons — erscheinen beim Hover */}
                        <div className="absolute right-1 top-1/2 -translate-y-1/2 hidden group-hover/conv:flex gap-0.5">
                          <button
                            onClick={(e) => { e.stopPropagation(); startRename(conv) }}
                            title="Umbenennen"
                            className={`p-1 rounded transition-colors ${
                              aktiv ? 'text-white/80 hover:text-white hover:bg-white/15' : 'text-sidebar-muted hover:text-sidebar-text hover:bg-sidebar-hover'
                            }`}
                          >
                            <Pencil size={12} />
                          </button>
                          <button
                            onClick={(e) => { e.stopPropagation(); setLoeschZiel({ art: 'chat', id: conv.id, titel: conv.title }) }}
                            title="Löschen"
                            aria-label={`Eintrag ${conv.title} löschen`}
                            className={`p-1 rounded transition-colors ${
                              aktiv ? 'text-white/80 hover:text-white hover:bg-white/15' : 'text-sidebar-muted hover:text-red-400 hover:bg-sidebar-hover'
                            }`}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                  )
                })}
              </div>
            </div>
          )}

          {renderCheckSection('KaufCheck', ShoppingCart, 'text-blue-400', kaufChecks, 'kauf')}
          {renderCheckSection('VerkaufsCheck', TrendingUp, 'text-green-400', verkaufChecks, 'verkauf')}
      </div>

      {/* User-Footer */}
      <div className="mt-auto border-t border-sidebar-border relative" ref={menuRef}>

        {/* ── Account-Menü-Popover ─────────────────────────────────────── */}
        {menuOpen && user && (
          <div className="absolute bottom-full left-2 right-2 mb-2 rounded-xl border border-sidebar-border bg-sidebar-bg shadow-2xl overflow-hidden z-50">

            {/* Kopf: ENFAL-Brand + E-Mail + Abo */}
            <div className="px-4 py-3 border-b border-sidebar-border">
              <div className="flex items-center gap-2 mb-3 pb-2.5 border-b border-sidebar-border/50">
                <img src="/logo.svg" alt="ENFAL" className="w-5 h-5 rounded-md shrink-0" />
                <span className="text-xs font-semibold text-sidebar-text tracking-tight">ENFAL</span>
                <span className="text-[10px] text-sidebar-muted ml-0.5">getenfal.de</span>
              </div>
              <div className="flex items-center gap-2.5 mb-2">
                <div className="w-8 h-8 rounded-full bg-orange-500 flex items-center justify-center shrink-0 text-white text-sm font-bold select-none">
                  {user.email[0].toUpperCase()}
                </div>
                <span className="text-xs text-sidebar-text truncate min-w-0 font-medium">
                  {user.email}
                </span>
              </div>
              {/* Abo-Status. ENFAL Plus laeuft ueber eigene Felder (nicht ueber
                  abo_typ) und wird deshalb zuerst geprueft — sonst saehe ein
                  zahlender Plus-Kunde hier "Kostenloser Zugang". */}
              {user.plus_aktiv ? (
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-orange-500/15 text-orange-300">
                    <Sparkles size={11} />
                    ENFAL Plus
                  </span>
                  <span className="text-xs text-sidebar-muted">
                    {(user.plus_kaufchecks_verbleibend ?? 0)} KaufCheck{(user.plus_kaufchecks_verbleibend ?? 0) !== 1 ? 's' : ''} übrig
                  </span>
                </div>
              ) : user.abo_typ !== 'none' ? (
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
                    : 'Kostenloser Zugang'}
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
                Preise anzeigen
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

        {/* Abgemeldete Besucher (öffentliche Werkzeugseiten): Einstieg ins Konto. */}
        {!user && !isLoading && (
          <NavLink
            to="/login"
            onClick={onMobileClose}
            className="flex items-center gap-2.5 mx-3 my-3 px-3 py-2 rounded-lg text-sm text-sidebar-text hover:bg-sidebar-hover transition-colors"
          >
            <LogIn size={16} />
            Anmelden
          </NavLink>
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
                {user.plus_aktiv ? (
                  <span className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-px rounded-full bg-orange-500/15 text-orange-300">
                    <Sparkles size={9} />
                    ENFAL Plus
                  </span>
                ) : user.abo_typ !== 'none' ? (
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

      {/* Loesch-Bestaetigung — gemeinsam fuer Chat-, Check- und AutoFinder-
          Verlauf. Ohne Bestaetigung wird nichts geloescht. */}
      <ConfirmDialog
        offen={loeschZiel !== null}
        titel={loeschZiel?.art === 'af-alle'
          ? 'Gesamten AutoFinder-Suchverlauf löschen?'
          : 'Diesen Eintrag wirklich löschen?'}
        detail={loeschZiel && loeschZiel.art !== 'af-alle' ? loeschZiel.titel : undefined}
        hinweis={loeschZiel?.art === 'af-alle'
          ? 'Alle gespeicherten Suchen dieses Geräts werden entfernt. Das lässt sich nicht rückgängig machen.'
          : 'Das lässt sich nicht rückgängig machen.'}
        bestaetigenLabel={loeschZiel?.art === 'af-alle' ? 'Verlauf löschen' : 'Löschen'}
        onBestaetigen={loeschenBestaetigt}
        onAbbrechen={() => setLoeschZiel(null)}
      />
    </>
  )
}
