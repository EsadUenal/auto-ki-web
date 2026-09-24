// History / Sidebar UX-Pass — Tests.
//
//     npm run test:sidebar
//
// Kein Test-Framework und keine DOM-Umgebung im Repo (AGENTS.md). Deshalb:
//   1. die neue Auswahl-/Zeitlogik wird als reine Funktion direkt geprüft,
//   2. Aussagen über die Oberfläche werden strukturell an der QUELLE geprüft —
//      und zwar an der Quelle OHNE Kommentare, damit kein Test versehentlich
//      einen Kommentar liest und "grün" meldet, was im Code gar nicht steht.
//
// Es werden keine Netzwerk-, Provider- oder Backend-Aufrufe ausgelöst.

import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

import {
  berechneSelection,
  werkzeugMarkierung,
  istChatAktiv,
  istCheckAktiv,
  istSucheAktiv,
  formatHistorieZeit,
  parseHistorieZeit,
  istRoute,
  type SidebarSelection,
} from './sidebarSelection.ts'

const HIER = dirname(fileURLToPath(import.meta.url))
const src = (p: string) => readFileSync(join(HIER, p), 'utf8')

/** Quelltext ohne Kommentare — Tests dürfen nur ausführbaren Code sehen. */
function nurCode(text: string): string {
  return text
    .replace(/\r?\n/g, '\n')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .split('\n')
    .map((z) => z.replace(/(^|[^:])\/\/.*$/, '$1'))
    .join('\n')
}

const SIDEBAR = nurCode(src('Sidebar.tsx'))
const APP = nurCode(src('../App.tsx'))
const DIALOG = nurCode(src('ConfirmDialog.tsx'))
const CSS = src('../index.css')

const BASIS = {
  pfad: '/chat',
  chatId: null,
  kaufCheckId: null,
  verkaufCheckId: null,
  autofinderSucheId: null,
}

// ── A/B: Löschen führt über eine Bestätigung ─────────────────────────────────

test('A: das Papierkorb-Icon öffnet die Bestätigung, es löscht nicht selbst', () => {
  // Der einzige Aufruf von onDeleteConv/onDeleteCheck/loescheSuchen im Code
  // steht in loeschenBestaetigt — nirgends direkt in einem onClick.
  const konvAufrufe = SIDEBAR.match(/onDeleteConv\(/g) ?? []
  const checkAufrufe = SIDEBAR.match(/onDeleteCheck\(/g) ?? []
  const afAufrufe = SIDEBAR.match(/loescheSuchen\(\)/g) ?? []
  assert.equal(konvAufrufe.length, 1, 'onDeleteConv darf nur aus der Bestätigung laufen')
  assert.equal(checkAufrufe.length, 1, 'onDeleteCheck darf nur aus der Bestätigung laufen')
  assert.equal(afAufrufe.length, 1, 'loescheSuchen darf nur aus der Bestätigung laufen')

  const fn = SIDEBAR.slice(SIDEBAR.indexOf('function loeschenBestaetigt'))
  const ende = fn.indexOf('\n  }')
  const koerper = fn.slice(0, ende)
  assert.ok(koerper.includes('onDeleteConv(ziel.id)'))
  assert.ok(koerper.includes('onDeleteCheck(ziel.id)'))
  assert.ok(koerper.includes('loescheSuchen()'))

  // Jeder Papierkorb setzt nur das Löschziel.
  assert.ok(SIDEBAR.includes("setLoeschZiel({ art: 'chat'"))
  assert.ok(SIDEBAR.includes("setLoeschZiel({ art: 'check'"))
  assert.ok(SIDEBAR.includes("setLoeschZiel({ art: 'af-alle' }"))
})

test('A2: es wird die ENFAL-Dialogkomponente benutzt, kein window.confirm', () => {
  assert.ok(SIDEBAR.includes("import ConfirmDialog from './ConfirmDialog'"))
  assert.ok(SIDEBAR.includes('<ConfirmDialog'))
  assert.ok(SIDEBAR.includes('offen={loeschZiel !== null}'))
  assert.ok(!/\bwindow\.confirm\b|[^.\w]confirm\(/.test(SIDEBAR))
})

test('A3: der Dialog nennt den betroffenen Eintrag', () => {
  assert.ok(SIDEBAR.includes('detail={loeschZiel && loeschZiel.art !== ') )
  assert.ok(SIDEBAR.includes('loeschZiel.titel'))
  assert.ok(DIALOG.includes('{detail}'))
})

test('B: Abbrechen schließt nur — der Zustand geht auf null zurück', () => {
  assert.ok(SIDEBAR.includes('onAbbrechen={() => setLoeschZiel(null)}'))
  // ...und im Dialog selbst hängt Escape/Hintergrundklick an genau diesem Weg.
  assert.ok(DIALOG.includes("if (e.key === 'Escape')"))
  assert.ok(DIALOG.includes('onClick={onAbbrechen}'))
  assert.ok(DIALOG.includes('onBestaetigen'))
})

test('B2: der Dialog behandelt den Fokus (Start auf Abbrechen, Rückgabe danach)', () => {
  assert.ok(DIALOG.includes('abbrechenRef.current?.focus()'))
  assert.ok(DIALOG.includes('vorherFokussiert.current?.focus?.()'))
  assert.ok(DIALOG.includes('role="dialog"'))
  assert.ok(DIALOG.includes('aria-modal="true"'))
})

// ── C/D: Bestätigen löscht den richtigen Eintrag, Auswahl bleibt heil ────────

test('C: bestätigt wird genau das gemerkte Ziel', () => {
  const fn = SIDEBAR.slice(SIDEBAR.indexOf('function loeschenBestaetigt'))
  assert.ok(fn.includes('const ziel = loeschZiel'), 'Ziel wird vor dem Schließen festgehalten')
  assert.ok(fn.indexOf('setLoeschZiel(null)') < fn.indexOf('if (!ziel) return'))
})

test('D: das Löschen des geöffneten Checks gibt die Ansicht frei', () => {
  assert.ok(APP.includes('setSavedKaufCheck((prev) => (prev?.id === id ? null : prev))'))
  assert.ok(APP.includes('setSavedVerkaufsCheck((prev) => (prev?.id === id ? null : prev))'))
  // Ohne frischen Aufbau bliebe der alte Bericht stehen.
  assert.ok(APP.includes("key={savedKaufCheck?.id ?? 'neu'}"))
  assert.ok(APP.includes("key={savedVerkaufsCheck?.id ?? 'neu'}"))
})

test('D2: ohne geöffneten Check ist das Werkzeug selbst aktiv, kein toter Eintrag', () => {
  const sel = berechneSelection({ ...BASIS, pfad: '/kaufcheck', kaufCheckId: null })
  assert.deepEqual(sel, { art: 'keine' })
  assert.equal(werkzeugMarkierung(sel, '/kaufcheck', '/kaufcheck'), 'primaer')
  assert.equal(istCheckAktiv(sel, 'kauf', 12), false)
})

// ── E/F/G: genau EIN primärer Aktiv-Zustand ─────────────────────────────────

test('E: Chat-Verlauf offen -> genau dieser Eintrag ist aktiv', () => {
  const sel = berechneSelection({ ...BASIS, pfad: '/chat', chatId: 'c1' })
  assert.deepEqual(sel, { art: 'chat', id: 'c1' })
  assert.equal(istChatAktiv(sel, 'c1'), true)
  assert.equal(istChatAktiv(sel, 'c2'), false)
  // Das Werkzeug "KI-Chat" trägt dann NICHT dieselbe primäre Markierung.
  assert.equal(werkzeugMarkierung(sel, '/chat', '/chat'), 'sekundaer')
})

test('F: Wechsel Chat -> VerkaufsCheck nimmt dem Chat-Eintrag den Aktiv-Zustand', () => {
  const vorher = berechneSelection({ ...BASIS, pfad: '/chat', chatId: 'c1' })
  assert.equal(istChatAktiv(vorher, 'c1'), true)

  // Gleicher App-Zustand, nur Route + geöffneter Check gewechselt:
  const nachher = berechneSelection({
    ...BASIS, pfad: '/verkaufscheck', chatId: 'c1', verkaufCheckId: 42,
  })
  assert.equal(istChatAktiv(nachher, 'c1'), false, 'alter Chat darf nicht aktiv bleiben')
  assert.equal(istCheckAktiv(nachher, 'verkauf', 42), true)
  assert.equal(istCheckAktiv(nachher, 'kauf', 42), false, 'Typ muss mitgeprüft werden')
})

test('G: VerkaufsCheck -> KaufCheck analog, nie beide gleichzeitig', () => {
  const sel = berechneSelection({
    ...BASIS, pfad: '/kaufcheck', chatId: 'c1', kaufCheckId: 7, verkaufCheckId: 42,
  })
  assert.equal(istCheckAktiv(sel, 'kauf', 7), true)
  assert.equal(istCheckAktiv(sel, 'verkauf', 42), false)
  assert.equal(istChatAktiv(sel, 'c1'), false)
})

test('G2: es kann nie mehr als eine primäre Markierung geben', () => {
  const werkzeuge = ['/chat', '/kaufcheck', '/verkaufscheck', '/autofinder', '/autokosten']
  const faelle: { pfad: string; sel: SidebarSelection }[] = [
    { pfad: '/chat', sel: berechneSelection({ ...BASIS, pfad: '/chat', chatId: 'c1' }) },
    { pfad: '/kaufcheck', sel: berechneSelection({ ...BASIS, pfad: '/kaufcheck', kaufCheckId: 7 }) },
    { pfad: '/verkaufscheck', sel: berechneSelection({ ...BASIS, pfad: '/verkaufscheck', verkaufCheckId: 8 }) },
    { pfad: '/autofinder', sel: berechneSelection({ ...BASIS, pfad: '/autofinder', autofinderSucheId: 'a1' }) },
    { pfad: '/autokosten', sel: berechneSelection({ ...BASIS, pfad: '/autokosten' }) },
    { pfad: '/kaufcheck', sel: berechneSelection({ ...BASIS, pfad: '/kaufcheck', chatId: 'c1' }) },
  ]
  for (const { pfad, sel } of faelle) {
    const eintraege = [
      istChatAktiv(sel, 'c1'), istCheckAktiv(sel, 'kauf', 7),
      istCheckAktiv(sel, 'verkauf', 8), istSucheAktiv(sel, 'a1'),
    ].filter(Boolean).length
    const primaer = werkzeuge
      .map((w) => werkzeugMarkierung(sel, pfad, w))
      .filter((m) => m === 'primaer').length
    assert.equal(eintraege + primaer, 1,
      `genau eine primäre Markierung erwartet — ${pfad} / ${JSON.stringify(sel)}`)
  }
})

test('H: Werkzeug-Startseite ohne geöffneten Run -> Werkzeug primär aktiv', () => {
  for (const pfad of ['/kaufcheck', '/verkaufscheck', '/autofinder', '/autokosten', '/chat']) {
    const sel = berechneSelection({ ...BASIS, pfad })
    assert.deepEqual(sel, { art: 'keine' }, pfad)
    assert.equal(werkzeugMarkierung(sel, pfad, pfad), 'primaer', pfad)
  }
})

test('H2: eine leere "Neuer Chat"-Konversation markiert keinen History-Eintrag', () => {
  // App gibt chatId nur weiter, wenn die Konversation auch in der Liste steht.
  assert.ok(APP.includes('sidebarConversations.some((c) => c.id === activeId) ? activeId : null'))
  const sel = berechneSelection({ ...BASIS, pfad: '/chat', chatId: null })
  assert.deepEqual(sel, { art: 'keine' })
})

test('H3: fremde Routen markieren gar nichts', () => {
  const sel = berechneSelection({ ...BASIS, pfad: '/settings', chatId: 'c1', kaufCheckId: 7 })
  assert.deepEqual(sel, { art: 'keine' })
  assert.equal(werkzeugMarkierung(sel, '/settings', '/chat'), 'keine')
  assert.equal(istRoute('/chatten', '/chat'), false)
  assert.equal(istRoute('/chat/17', '/chat'), true)
})

test('I: nach einem Reload entsteht die Markierung neu aus Route + geöffneter Entität', () => {
  // Kein persistierter Auswahl-Zustand in der Sidebar: die Ableitung ist rein.
  assert.ok(!SIDEBAR.includes('activeConvId'), 'alter, routenunabhängiger Zustand ist weg')
  assert.ok(SIDEBAR.includes('selection'), 'Sidebar rendert aus der übergebenen Auswahl')
  const frisch = berechneSelection({ ...BASIS, pfad: '/verkaufscheck', verkaufCheckId: null })
  assert.deepEqual(frisch, { art: 'keine' })
})

test('I2: AutoFinder-Markierung kommt von der Seite selbst', () => {
  const view = nurCode(src('autofinder/AutoFinderView.tsx'))
  assert.ok(view.includes('setzeAktiveSuche(s.id)'))
  assert.ok(view.includes('setzeAktiveSuche(null)'))
  assert.ok(APP.includes('AKTIVE_SUCHE_EVENT'))
  const sel = berechneSelection({ ...BASIS, pfad: '/autofinder', autofinderSucheId: 'a1' })
  assert.equal(istSucheAktiv(sel, 'a1'), true)
  assert.equal(istSucheAktiv(sel, 'a2'), false)
})

// ── J: Zeitstempel ──────────────────────────────────────────────────────────

test('J: SQLite-Zeitstempel werden als UTC gelesen, nicht als Ortszeit', () => {
  const d = parseHistorieZeit('2026-09-23 17:15:00')
  assert.ok(d)
  assert.equal(d!.toISOString(), '2026-09-23T17:15:00.000Z')
  // ISO mit Zeitzone bleibt unangetastet
  assert.equal(parseHistorieZeit('2026-09-23T17:15:00Z')!.toISOString(), '2026-09-23T17:15:00.000Z')
  // Millisekunden (AutoFinder-Historie)
  assert.equal(parseHistorieZeit(1_700_000_000_000)!.getTime(), 1_700_000_000_000)
})

test('J2: Format ist deutsch und unterscheidet Heute / Gestern / Datum', () => {
  const jetzt = new Date(2026, 8, 24, 20, 30)          // 24.09.2026, lokal
  const heute = new Date(2026, 8, 24, 18, 42)
  const gestern = new Date(2026, 8, 23, 19, 15)
  const aelter = new Date(2026, 7, 4, 9, 5)
  const vorjahr = new Date(2025, 8, 23, 19, 15)
  assert.equal(formatHistorieZeit(heute, jetzt), 'Heute · 18:42')
  assert.equal(formatHistorieZeit(gestern, jetzt), 'Gestern · 19:15')
  assert.equal(formatHistorieZeit(aelter, jetzt), '04.08. · 09:05')
  assert.equal(formatHistorieZeit(vorjahr, jetzt), '23.09.2025 · 19:15')
})

test('J3: ohne verwertbaren Zeitstempel wird nichts erfunden', () => {
  assert.equal(formatHistorieZeit(null), '')
  assert.equal(formatHistorieZeit(undefined), '')
  assert.equal(formatHistorieZeit(''), '')
  assert.equal(formatHistorieZeit('kein datum'), '')
})

test('J4: die Sidebar zeigt echte gespeicherte Zeitstempel', () => {
  assert.ok(SIDEBAR.includes('formatHistorieZeit(check.created_at)'))
  assert.ok(SIDEBAR.includes('formatHistorieZeit(conv.createdAt)'))
  assert.ok(SIDEBAR.includes('formatHistorieZeit(s.ts)'))
  // …und nur, wenn es einen gibt.
  assert.ok(SIDEBAR.includes('{zeit && ('))
  // App liest das Backend-Datum über denselben Parser.
  assert.ok(APP.includes('parseHistorieZeit(c.created_at)'))
})

// ── K: lange Titel ──────────────────────────────────────────────────────────

test('K: Titelzeilen kürzen weiterhin mit Ellipsis', () => {
  const zeilen = SIDEBAR.split('\n').filter((z) => z.includes('block truncate'))
  assert.ok(zeilen.length >= 6, 'Titel- und Zeitzeile jeder Gruppe kürzen')
  assert.ok(SIDEBAR.includes('min-w-0 flex-1'), 'Flex-Kind darf schrumpfen, sonst greift truncate nicht')
})

// ── L/M: eine zusammenhängende Sidebar ──────────────────────────────────────

test('L: es gibt nur noch EINEN Scrollbereich in der Sidebar', () => {
  const scroller = SIDEBAR.match(/overflow-y-auto/g) ?? []
  assert.equal(scroller.length, 1, 'kein zweiter (History-only) Scrollcontainer')
})

test('M: Werkzeuge UND History liegen in diesem Scrollbereich', () => {
  const i = SIDEBAR.indexOf('overflow-y-auto')
  const neuerChat = SIDEBAR.indexOf('Neuer Chat\n')
  const nav = SIDEBAR.indexOf('<nav')
  const verlauf = SIDEBAR.indexOf('Verlauf\n')
  const check = SIDEBAR.indexOf("renderCheckSection('KaufCheck'")
  assert.ok(i > 0 && nav > i && verlauf > i && check > i && neuerChat > i,
    'Neuer Chat, Werkzeuge und alle History-Gruppen stehen im Scrollbereich')
  // Logo davor, Konto-Bereich dahinter — beide bleiben stehen.
  assert.ok(SIDEBAR.indexOf('logo.svg') < i)
  assert.ok(SIDEBAR.indexOf('setMenuOpen((o) => !o)') > check)
})

test('M2: die History-Gruppen bleiben erhalten', () => {
  for (const gruppe of ['AutoFinder', 'Verlauf', "renderCheckSection('KaufCheck'", "renderCheckSection('VerkaufsCheck'"]) {
    assert.ok(SIDEBAR.includes(gruppe), gruppe)
  }
})

// ── N/O/P: Desktopbreite ────────────────────────────────────────────────────

test('N: die Werkzeugseiten nutzen die gemeinsame, mitwachsende Seitenbreite', () => {
  for (const datei of [
    'KaufCheckView.tsx', 'VerkaufsCheckView.tsx',
    'autofinder/AutoFinderView.tsx', 'autokosten/AutokostenView.tsx',
  ]) {
    const code = nurCode(src(datei))
    assert.ok(code.includes('ez-page'), `${datei}: ez-page fehlt`)
    assert.ok(!/max-w-3xl/.test(code), `${datei}: alte feste Breite noch vorhanden`)
  }
})

test('O: die Breite ist an den Viewport gebunden, nicht an einen Zoomwert', () => {
  const regel = /\.ez-page\s*\{[^}]*\}/.exec(CSS)
  assert.ok(regel, '.ez-page fehlt')
  assert.ok(/clamp\(/.test(regel![0]), 'feste Pixelbreite statt mitwachsender Breite')
  assert.ok(/max-width:\s*clamp\(48rem,\s*76vw,\s*72rem\)/.test(regel![0]))
  assert.ok(/margin-inline:\s*auto/.test(regel![0]), 'bleibt zentriert')
})

test('P: kein horizontaler Überlauf auf schmalen Viewports', () => {
  const regel = /\.ez-page\s*\{[^}]*\}/.exec(CSS)![0]
  // width:100% deckelt die clamp-Untergrenze auf die verfügbare Breite.
  assert.ok(/width:\s*100%/.test(regel))
  const form = /\.ez-form\s*\{[^}]*\}/.exec(CSS)![0]
  assert.ok(/width:\s*100%/.test(form))
  assert.ok(/max-width:\s*56rem/.test(form))
})
