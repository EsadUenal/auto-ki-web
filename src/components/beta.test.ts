// Closed-Beta-Invite — Frontend-Tests.
//
//     npm run test:beta
//
// Kein Test-Framework und keine DOM-Umgebung im Repo (AGENTS.md). Deshalb wie
// in sidebar.test.ts:
//   1. die Token-Übergabe wird als echte Funktion gegen einen minimalen
//      window-/sessionStorage-Stub geprüft,
//   2. Aussagen über die Oberfläche strukturell an der QUELLE OHNE Kommentare
//      — sonst liest ein Test einen Kommentar und meldet "grün", was im Code
//      gar nicht steht.
//
// Es werden keine Netzwerk-, Provider- oder Backend-Aufrufe ausgelöst.

import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

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

const VIEW = nurCode(src('BetaAcceptView.tsx'))
const HELFER = nurCode(src('betaInvite.ts'))
const APP = nurCode(src('../App.tsx'))
const CLIENT = nurCode(src('../api/client.ts'))

// ── window-/sessionStorage-Stub für die echten Funktionen ───────────────────

const speicher = new Map<string, string>()
const g = globalThis as unknown as Record<string, unknown>
g.sessionStorage = {
  getItem: (k: string) => (speicher.has(k) ? speicher.get(k)! : null),
  setItem: (k: string, v: string) => void speicher.set(k, v),
  removeItem: (k: string) => void speicher.delete(k),
}
function setzeFragment(hash: string) {
  g.window = { location: { hash }, history: { replaceState: () => {} } }
}
setzeFragment('')

const { betaTokenAusFragment, stageBetaToken, readBetaToken, clearBetaToken, BETA_ROUTE } =
  await import('./betaInvite.ts')

// ── A) Route vorhanden ──────────────────────────────────────────────────────

test('A: /beta ist eine eigene Route, ohne Login-Gate', () => {
  assert.match(APP, /path="\/beta"/, '/beta fehlt im Router')
  assert.match(APP, /<Route path="\/beta" element=\{<BetaAcceptView \/>\} \/>/)
  // Die Route liegt NICHT im <Guard>-Block: ein Eingeladener hat oft noch kein
  // Konto und muss die Seite trotzdem öffnen können.
  assert.ok(
    !/path="\/beta"[^\n]*Guard/.test(APP),
    '/beta darf nicht hinter einem Auth-Guard liegen',
  )
  assert.equal(BETA_ROUTE, '/beta')
})

// ── B) Ausgeloggter Zustand ─────────────────────────────────────────────────

test('B: ohne Konto führt die Seite zur Anmeldung statt zu einem Fehler', () => {
  assert.match(VIEW, /if \(!user\)/)
  assert.match(VIEW, /setZustand\('anmelden'\)/)
  assert.match(VIEW, /Du wurdest zur ENFAL Closed Beta eingeladen/)
})

// ── C) Login/Register behalten den Invite-Kontext ───────────────────────────

test('C: beide Wege führen weiter', () => {
  assert.match(VIEW, /to="\/login"/, 'Anmelden-Link fehlt')
  assert.match(VIEW, /to="\/login\?modus=register"/, 'Registrieren-Link fehlt')
})

test('C: der Token wird geparkt, BEVOR das Fragment gelöscht wird', () => {
  // Reihenfolge ist hier sicherheitskritisch: `history.replaceState` entfernt
  // das Fragment unwiderruflich. Wird danach geparkt und die Komponente läuft
  // vorher noch einmal neu an (StrictMode, verzögerte App-Shell), ist der
  // Token verloren und ein gültiger Link endet auf "Kein Einladungslink
  // erkannt" — genau dieser Fehler ist in der Browser-QA aufgetreten.
  const idxStage = VIEW.indexOf('stageBetaToken(ausFragment)')
  const idxLoeschen = VIEW.indexOf('history.replaceState')
  assert.ok(idxStage > -1, 'Token wird nicht geparkt')
  assert.ok(idxLoeschen > idxStage, 'Fragment wird gelöscht, bevor der Token gesichert ist')
})

test('C: ein nachträglich eingefügter Link wird noch ausgewertet', () => {
  // Wer den Einladungslink einfügt, während er schon auf /beta steht, ändert
  // nur das Fragment: kein Reload, kein Remount. Ohne Listener bliebe die
  // Seite stumm stehen.
  assert.match(VIEW, /addEventListener\('hashchange'/)
  assert.match(VIEW, /removeEventListener\('hashchange'/)
})

test('C: stageBetaToken parkt den Token und gibt ihn wieder heraus', () => {
  speicher.clear()
  stageBetaToken('tok-abc')
  assert.equal(readBetaToken(), 'tok-abc')
  clearBetaToken()
  assert.equal(readBetaToken(), '')
})

test('C: die View setzt daneben das Rücksprungziel auf /beta', () => {
  // Der Schlüssel selbst bleibt in autofinder/logic.ts definiert (eine Quelle);
  // hier wird geprüft, dass beide Schritte zusammen passieren.
  assert.match(VIEW, /setReturnTo\(BETA_ROUTE\)/)
  const logik = nurCode(src('autofinder/logic.ts'))
  assert.match(logik, /RETURN_TO_KEY = 'vira\.returnTo'/)
})

test('C: LoginView springt nach Login/Registrierung zum gemerkten Ziel', () => {
  const login = nurCode(src('LoginView.tsx'))
  assert.match(login, /navigate\(takeReturnTo\(\) \?\? '\/chat'/)
})

test('C: es wird KEIN lokales Credit-/Ergebnis-Flag gespeichert', () => {
  // Nur der Token darf in den sessionStorage — niemals ein Zustand wie
  // "hat_credits" oder "aktiviert", den der Client selbst setzen könnte.
  const schluessel = [...HELFER.matchAll(/setItem\(\s*([A-Za-z_]+)/g)].map((m) => m[1])
  assert.deepEqual(schluessel, ['BETA_TOKEN_KEY'])
  assert.ok(!/localStorage/.test(HELFER), 'localStorage würde den Token überleben lassen')
  assert.ok(!/localStorage/.test(VIEW))
})

// ── D–H) Die Zustände ───────────────────────────────────────────────────────

test('D: Erfolg nennt genau das Paket aus der SERVER-Antwort', () => {
  assert.match(VIEW, /Closed Beta aktiviert/)
  assert.match(VIEW, /setPaket\(\{ kauf: res\.kaufchecks, verkauf: res\.verkaufschecks \}\)/)
  assert.match(VIEW, /\{paket\.kauf\} KaufCheck/)
  assert.match(VIEW, /\{paket\.verkauf\} VerkaufsCheck/)
  // Keine erfundene Plus-Anzeige.
  assert.ok(!/Plus aktiviert/i.test(VIEW), 'Beta darf nicht wie ein Plus-Abo aussehen')
})

test('D: Erfolg erklärt, dass AutoFinder/Chat im Free-Kontingent laufen', () => {
  assert.match(VIEW, /normalen kostenlosen Kontingent/)
  assert.match(VIEW, /ENFAL testen/)
})

test('E: bereits eingelöst ist ein freundlicher Zustand, kein Fehler', () => {
  assert.match(VIEW, /bereits_aktiviert/)
  assert.match(VIEW, /bereits aktiviert/)
  assert.match(VIEW, /schon_aktiv/)
})

test('F/G/H: abgelaufen, unbekannt und falsches Konto sehen identisch aus', () => {
  // Der Client kennt genau drei Server-Status. Alles, was nicht 'aktiviert'
  // oder 'bereits_aktiviert' ist, landet im selben Zweig — es gibt keinen
  // Code-Pfad, der abgelaufen von unbekannt unterscheidet.
  const status = [...CLIENT.matchAll(/'(aktiviert|bereits_aktiviert|nicht_verwendbar)'/g)]
    .map((m) => m[1])
  assert.deepEqual([...new Set(status)].sort(),
    ['aktiviert', 'bereits_aktiviert', 'nicht_verwendbar'])
  assert.match(VIEW, /setZustand\('unbrauchbar'\)/)
  assert.ok(!/abgelaufen|expired/i.test(VIEW),
    'ein eigener Ablauf-Zustand wäre ein Orakel für gültige Token')
})

test('H: keine eingeladene E-Mail-Adresse wird angezeigt', () => {
  // Es darf keinen Platzhalter geben, der eine fremde Adresse ausgibt.
  assert.ok(!/\{[^}]*invite[^}]*email[^}]*\}/i.test(VIEW))
  assert.match(VIEW, /mit diesem Konto nicht verwendet werden/)
})

// ── L/M) Token-Hygiene ──────────────────────────────────────────────────────

test('L: der Token wird sofort aus der Adresszeile entfernt', () => {
  assert.match(VIEW, /history\.replaceState\(null, '', window\.location\.pathname\)/)
  const idxLesen = VIEW.indexOf('betaTokenAusFragment()')
  const idxLoeschen = VIEW.indexOf('history.replaceState')
  assert.ok(idxLesen > -1 && idxLoeschen > idxLesen, 'erst lesen, dann Adresszeile säubern')
})

test('L: der Token steht im Fragment, nie in Query oder Pfad', () => {
  assert.match(HELFER, /location\.hash/)
  assert.ok(!/location\.search/.test(HELFER))
  assert.ok(!/\?token=/.test(VIEW + HELFER + CLIENT),
    'ein Query-Parameter landete im Access-Log und im Referrer')
  // Gesendet wird per POST-Body, nicht in der URL.
  assert.match(CLIENT, /method: 'POST',[\s\S]*?body: JSON\.stringify\(\{ token \}\)/)
})

test('M: kein Token in Console, Log oder Fehlermeldung', () => {
  for (const [name, quelle] of [['View', VIEW], ['Helfer', HELFER]] as const) {
    assert.ok(!/console\./.test(quelle), `${name} loggt auf die Konsole`)
  }
  // Der Token taucht in keinem anzeigbaren Text auf.
  assert.ok(!/\{token[^}]*\}/.test(VIEW.replace(/JSON\.stringify\(\{ token \}\)/g, '')))
  assert.ok(!/\{t\}/.test(VIEW))
})

test('betaTokenAusFragment liest den Token und toleriert Unsinn', () => {
  setzeFragment('#token=abc123')
  assert.equal(betaTokenAusFragment(), 'abc123')
  setzeFragment('#token=  mit-leerzeichen  ')
  assert.equal(betaTokenAusFragment(), 'mit-leerzeichen')
  setzeFragment('#etwas=anderes')
  assert.equal(betaTokenAusFragment(), '')
  setzeFragment('')
  assert.equal(betaTokenAusFragment(), '')
})

// ── I/J/K) Layout: Mobile 375 px und Desktop ohne Overflow ──────────────────

test('I/J/K: die Karte ist fließend, ohne feste Breite und ohne Overflow', () => {
  // max-w-md (28rem = 448px) + w-full: passt bei 375 px genauso wie am Desktop.
  assert.match(VIEW, /max-w-md w-full/)
  assert.match(VIEW, /min-h-screen flex items-center justify-center/)
  // Keine festen Pixelbreiten und keine negativen Ränder, die überlaufen.
  assert.ok(!/w-\[\d+px\]/.test(VIEW), 'feste Pixelbreite bricht bei 375 px')
  assert.ok(!/-m[xl]-/.test(VIEW), 'negative Ränder erzeugen horizontalen Overflow')
  // Die Button-Reihe bricht auf schmalen Schirmen um, statt zu überlaufen.
  assert.match(VIEW, /flex-col sm:flex-row/)
})

test('I/J/K: ENFAL-Stil statt eines neuen Designsystems', () => {
  assert.match(VIEW, /bg-orange-500/)
  assert.match(VIEW, /rounded-xl/)
  assert.match(VIEW, /tracking-\[0\.22em\] uppercase/)   // gleiche Kopfzeile wie E-Mail-Bestätigung
  assert.ok(!/VIRA/i.test(VIEW), 'kein alter VIRA-Text')
  assert.ok(!/ebook|e-book/i.test(VIEW), 'keine E-Books mehr in der App')
})
