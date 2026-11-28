import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import { baueVerlauf, istSpeicherbar } from './chatVerlauf.ts'
import { deuteStreamEreignis } from '../api/streamEreignis.ts'
import type { Message } from '../types'

/**
 * Regressionstests KI-Chat.
 *
 * Reproduzierter Produktionsdefekt: nach einer Empfehlung von drei Fahrzeugen
 * fragte ENFAL bei der direkten Folgefrage zurueck, WELCHE drei Fahrzeuge
 * gemeint seien — waehrend unter derselben Antwort passende Quellenchips
 * standen. Die Ursache lag im Backend-Prompt-Budget; dieser Test sichert die
 * Frontend-Seite: der Verlauf muss vollstaendig und in der richtigen Reihenfolge
 * mitgeschickt werden, Quellen duerfen nur an ihrer eigenen Nachricht haengen,
 * und ein Austausch gehoert in die Unterhaltung, in der er entstanden ist.
 */

const chatView = readFileSync(new URL('./ChatView.tsx', import.meta.url), 'utf8')
const app = readFileSync(new URL('../App.tsx', import.meta.url), 'utf8')
const client = readFileSync(new URL('../api/client.ts', import.meta.url), 'utf8')
const badge = readFileSync(new URL('./SourceBadge.tsx', import.meta.url), 'utf8')
const analyseChat = readFileSync(new URL('./AnalyseFrageChat.tsx', import.meta.url), 'utf8')
const hinweis = readFileSync(new URL('./AntwortHinweis.tsx', import.meta.url), 'utf8')

const nachricht = (role: Message['role'], content: string, id = content.slice(0, 8)): Message =>
  ({ id, role, content })

const TURN1_USER = 'Ich suche einen zuverlässigen Benziner mit Automatik für maximal 20.000 €.'
const TURN1_KI = '1. Toyota Corolla 1.8 Hybrid\n2. Mazda 3 BP\n3. Ford Focus Mk4'
const TURN2_USER = 'Von den drei Autos ist mir Zuverlässigkeit am wichtigsten.'

test('A: Folgefrage schickt den kompletten Verlauf in der richtigen Reihenfolge', () => {
  const verlauf = baueVerlauf([nachricht('user', TURN1_USER), nachricht('assistant', TURN1_KI)])

  assert.equal(verlauf.length, 2)
  assert.deepEqual(verlauf.map((v) => v.rolle), ['user', 'ki'])
  assert.equal(verlauf[0].text, TURN1_USER)
  assert.ok(verlauf[1].text.includes('Toyota Corolla'))
  assert.ok(verlauf[1].text.includes('Ford Focus Mk4'))
})

test('B: dritter Turn traegt weiterhin den gesamten Verlauf', () => {
  const verlauf = baueVerlauf([
    nachricht('user', TURN1_USER),
    nachricht('assistant', TURN1_KI),
    nachricht('user', TURN2_USER),
    nachricht('assistant', 'An erste Stelle setze ich den Corolla.'),
  ])
  assert.equal(verlauf.length, 4)
  assert.deepEqual(verlauf.map((v) => v.rolle), ['user', 'ki', 'user', 'ki'])
  assert.ok(verlauf[0].text.includes('20.000'))
})

test('C: neue Unterhaltung startet ohne fremde History', () => {
  assert.deepEqual(baueVerlauf([]), [])
})

test('D: die noch streamende (leere) Assistenten-Blase faellt aus dem Verlauf', () => {
  const verlauf = baueVerlauf([
    nachricht('user', TURN1_USER),
    nachricht('assistant', TURN1_KI),
    nachricht('user', TURN2_USER, 'u2'),
    { id: 'pending', role: 'assistant', content: '', streaming: true },
  ])
  assert.equal(verlauf.length, 3)
  assert.equal(verlauf[verlauf.length - 1].text, TURN2_USER)
})

test('E: vorausgewaehltes Fahrzeug wird vorangestellt, nicht in die Frage gemischt', () => {
  const car = { id: 'bmw-m3', titel: 'BMW M3' }
  const verlauf = baueVerlauf([nachricht('user', 'Wie viel PS?')], car)
  assert.equal(verlauf.length, 3)
  assert.ok(verlauf[0].text.includes('BMW M3'))
  assert.equal(verlauf[0].rolle, 'user')
  assert.equal(verlauf[1].rolle, 'ki')
  assert.equal(verlauf[2].text, 'Wie viel PS?')
})

test('F: der Verlauf wird aus den Nachrichten der Unterhaltung gebaut, nicht aus globalem State', () => {
  // handleSendWithHistory bekommt die Vorgaengernachrichten als Parameter —
  // damit ein Bearbeiten-und-neu-senden den Verlauf korrekt abschneidet.
  assert.match(chatView, /async function handleSendWithHistory\(text: string, priorMessages: Message\[\]\)/)
  assert.match(chatView, /const verlauf = baueVerlauf\(priorMessages, car\)/)
  assert.match(chatView, /handleSendWithHistory\(text, conversation\.messages\)/)
  assert.match(chatView, /handleSendWithHistory\(newText\.trim\(\), conversation\.messages\.slice\(0, idx\)\)/)
})

test('G: Quellen haengen ausschliesslich an ihrer eigenen Assistenten-Nachricht', () => {
  // meta wird NUR auf die Nachricht mit der ID dieses Streams geschrieben.
  assert.match(
    chatView,
    /m\.id === assistantMsg\.id \? \{ \.\.\.m, content: finalContent, streaming: false, meta \}/,
  )
  // Und sie wird nur unter einer nicht mehr streamenden Nachricht angezeigt,
  // die selbst ein meta traegt — kein Rueckgriff auf einen Chat-weiten State.
  assert.match(chatView, /!message\.streaming && message\.meta/)
  assert.match(chatView, /<SourceBadge meta=\{message\.meta\} art=\"chat\" \/>/)
  // Es gibt keinen konversationsweiten Quellen-State, aus dem geleakt werden koennte.
  assert.doesNotMatch(chatView, /useState<SourceMeta/)
})

test('H: ein Austausch wird in der Unterhaltung gespeichert, in der er entstand', () => {
  // Thread-Leak: waehrend eines Streams kann der Nutzer die Unterhaltung wechseln.
  assert.match(chatView, /onSaveExchange\?\.\(text, finalContent, startConvId\)/)
  assert.match(app, /const convId = conversationId \?\? activeIdRef\.current/)
})

test('I: eine abgeschnittene Antwort wird als solche erkannt und angezeigt', () => {
  assert.match(client, /abgeschnitten: m\.abgeschnitten === true/)
  assert.match(badge, /meta\.abgeschnitten &&/)
  assert.match(badge, /Antwort gekürzt/)
})

test('J: ein Konversationswechsel schreibt nicht in die falsche Anzeige', () => {
  assert.match(chatView, /if \(convIdRef\.current !== startConvId\) return/)
})

test('K: reines Modellwissen bekommt KEINEN pseudoquellenartigen Chip', () => {
  // Live-Befund RC1: unter einer Antwort ohne DB/Web stand nur "KI-Wissen" —
  // sah aus wie eine Citation, war aber keine.
  const badgeCode = badge.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:])\/\/.*$/gm, '$1')
  assert.doesNotMatch(badgeCode, /KI-Wissen/)
  assert.doesNotMatch(badgeCode, /Quelle unbekannt/)
  assert.match(badge, /export const BELEGTE_QUELLEN = \['datenbank', 'web', 'gemischt'\] as const/)
  assert.match(badge, /\{belegt && <SourceChip source=\{meta\.source\} art=\{art\} \/>\}/)
  // Ohne belegte Quelle, ohne Links und ohne Kuerzung: gar nichts rendern.
  assert.match(badge, /if \(!belegt && links\.length === 0 && !meta\.abgeschnitten\) return null/)
})

test('L: nur echte Herkunftsarten gelten als belegt', async () => {
  const { hatBelegteQuelle } = await import('./SourceBadge.tsx').catch(() => ({ hatBelegteQuelle: null }))
  // SourceBadge.tsx ist JSX und laesst sich ohne Bundler nicht importieren —
  // die Liste wird deshalb aus dem Quelltext gelesen und hier nachgebildet.
  const liste = /BELEGTE_QUELLEN = \[([^\]]+)\]/.exec(badge)?.[1] ?? ''
  const belegt = (s: string) =>
    hatBelegteQuelle ? hatBelegteQuelle(s) : liste.includes(`'${s.toLowerCase()}'`)
  for (const s of ['datenbank', 'web', 'gemischt']) assert.ok(belegt(s), s)
  for (const s of ['gespräch', 'fehler', 'unbekannt', '']) assert.ok(!belegt(s), s)
})

// ── CHAT-1 ──────────────────────────────────────────────────────────────────

test('M: Fehler ist ein eigenes Ereignis, kein Antworttext', () => {
  assert.deepEqual(deuteStreamEreignis('{"delta":"Hallo"}'), { art: 'delta', text: 'Hallo' })
  assert.deepEqual(deuteStreamEreignis('{"status":"Prüfe Datenbank…"}'), { art: 'status', text: 'Prüfe Datenbank…' })
  assert.deepEqual(deuteStreamEreignis('[DONE]'), { art: 'ignoriert' })
  assert.deepEqual(deuteStreamEreignis('{"meta":{"abgeschnitten":true}}'), { art: 'meta', meta: { abgeschnitten: true } })
  const f = deuteStreamEreignis('{"fehler":{"code":"ki_ueberlastet","nachricht":"Gerade überlastet."},"teilantwort":true}')
  assert.deepEqual(f, { art: 'fehler', nachricht: 'Gerade überlastet.', teilantwort: true })
  const g = deuteStreamEreignis('{"fehler":{"code":"x","nachricht":"N"},"teilantwort":false}')
  assert.equal(g.art === 'fehler' && g.teilantwort, false)
  // Kein JSON bleibt wie bisher ein roher Token.
  assert.deepEqual(deuteStreamEreignis('roh'), { art: 'delta', text: 'roh' })
})

test('N: ein Fehler/Abbruch erzeugt nach dem Fehlerereignis kein onDone', () => {
  // client.ts ist wegen import.meta.env nicht ohne Bundler ladbar: Quelltextnachweis fuer BEIDE Streams.
  assert.equal((client.match(/deuteStreamEreignis\(/g) ?? []).length, 2)
  const nachFehler = client.match(/if \(fehler\) \{\s*callbacks\.onError\(fehler\.nachricht, 'fehler', fehler\.teilantwort\)\s*return\s*\}/g) ?? []
  assert.equal(nachFehler.length, 2)
  assert.match(client, /callbacks\.onError\(BACKEND_NICHT_ERREICHBAR, 'fehler', hatText\)/)
  assert.match(client, /callbacks\.onDone\(\{ abgeschnitten \}\)/)
})

test('O: fehlgeschlagene Austausche fallen samt Frage aus dem Verlauf', () => {
  const nachrichten: Message[] = [
    nachricht('user', 'Frage 1'), nachricht('assistant', 'Antwort 1'),
    nachricht('user', 'Frage 2'), { ...nachricht('assistant', '**Fehler:** überlastet'), status: 'fehler' },
    nachricht('user', 'Frage 3'), { ...nachricht('assistant', 'Halber Sat'), status: 'unvollstaendig' },
    nachricht('user', 'Frage 4'), { ...nachricht('assistant', 'Limit erreicht.'), status: 'hinweis' },
    nachricht('user', 'Frage 5'), nachricht('assistant', 'Antwort 5'),
  ]
  assert.deepEqual(baueVerlauf(nachrichten).map((v) => v.text), ['Frage 1', 'Antwort 1', 'Frage 5', 'Antwort 5'])
  // Normale erfolgreiche Verlaeufe bleiben unveraendert.
  assert.equal(baueVerlauf([nachricht('user', 'a'), nachricht('assistant', 'b')]).length, 2)
})

test('P: nur ein vollstaendiger Austausch ist speicherbar', () => {
  assert.equal(istSpeicherbar('Antwort', false), true)
  assert.equal(istSpeicherbar('Teilantwort', true), false)
  assert.equal(istSpeicherbar('   ', false), false)
  assert.equal(istSpeicherbar('', true), false)
})

test('Q: ChatView speichert Fehler/Abbruch nicht und kennzeichnet die Teilantwort', () => {
  // onSaveExchange wird genau einmal aufgerufen, und zwar im Erfolgsweg (onDone).
  assert.equal((chatView.match(/onSaveExchange\?\.\(/g) ?? []).length, 1)
  const chatViewLF = chatView.replace(/\r\n/g, '\n')   // Arbeitskopie kann CRLF tragen
  const onError = /onError\(err: string[\s\S]*?\n      \},\n    \}, ctrl\.signal/.exec(chatViewLF)?.[0] ?? ''
  assert.ok(onError.length > 100)
  assert.doesNotMatch(onError, /onSaveExchange/)
  assert.match(onError, /status: 'unvollstaendig' as const/)
  assert.match(onError, /status: art === 'hinweis'/)
  assert.match(chatView, /message\.status === 'unvollstaendig'[\s\S]{0,80}<AntwortHinweis art="unvollstaendig" \/>/)
  assert.match(hinweis, /Antwort unvollständig/)
})

test('R: AnalyseFrageChat speichert nur vollstaendige Paare und haelt Fehler aus dem Verlauf', () => {
  assert.match(analyseChat, /istSpeicherbar\(answer, fehlerGemeldet\)/)
  assert.match(analyseChat, /qas\.filter\(\(qa\) => !qa\.status\)/)
  assert.match(analyseChat, /status: 'unvollstaendig'/)
  assert.match(analyseChat, /status: 'fehler'/)
  assert.match(analyseChat, /<AntwortHinweis art="abgeschnitten" \/>/)
  // Kein endloser Spinner nach einem Fehler.
  assert.match(analyseChat, /qa\.status === 'fehler'/)
})

test('S: Quellenchip nennt die Herkunft, nicht eine pauschale Pruefung', () => {
  assert.doesNotMatch(badge, /Geprüfte Datenbank/)
  assert.match(badge, /Fahrzeugdatenbank/)
  assert.doesNotMatch(badge, /ShieldCheck/)
  // Der Belegstatus bleibt unveraendert: dieselben drei belegten Quellenarten.
  assert.match(badge, /BELEGTE_QUELLEN = \['datenbank', 'web', 'gemischt'\] as const/)
  // Alle Nutzer des geteilten Chips (Chat, KaufCheck, VerkaufsCheck) reichen weiter dieselbe Meta durch.
  const kauf = readFileSync(new URL('./KaufCheckView.tsx', import.meta.url), 'utf8')
  const verkauf = readFileSync(new URL('./VerkaufsCheckView.tsx', import.meta.url), 'utf8')
  assert.match(kauf, /<SourceBadge meta=\{\{ source: result\.quelle as never/)
  assert.match(verkauf, /<SourceBadge meta=\{\{ source: result\.quelle as never/)
})

test('T: Totalausfall, Abbruch nach Teiltext und MAX_TOKENS haben getrennte Zustaende', () => {
  const HINWEIS = 'Diese Antwort wurde gekürzt, weil sie die maximale Länge erreicht hat.'
  const verlaufNach = (antwort: Message) =>
    baueVerlauf([nachricht('user', 'Frage A'), nachricht('assistant', 'Antwort A'), nachricht('user', 'Frage B'), antwort])
      .map((v) => v.text)

  // 1) Totalausfall: Meldung, status 'fehler' -> nicht gespeichert, samt Frage nicht im Folgeverlauf.
  const ausfall: Message = { ...nachricht('assistant', '**Fehler:** überlastet'), status: 'fehler' }
  assert.deepEqual(verlaufNach(ausfall), ['Frage A', 'Antwort A'])

  // 2) Abbruch nach Teiltext: Text bleibt sichtbar, status 'unvollstaendig' -> nicht gespeichert, nicht weitergereicht.
  const abbruch: Message = { ...nachricht('assistant', 'Halber Sat'), status: 'unvollstaendig' }
  assert.deepEqual(verlaufNach(abbruch), ['Frage A', 'Antwort A'])
  assert.equal(istSpeicherbar('Halber Sat', true), false)

  // 3) MAX_TOKENS: kein Fehler. Der Austausch wird gespeichert und weitergereicht, aber der Kuerzungshinweis
  //    steht IM Antworttext (Backend haengt ihn an) und damit auch im Verlauf und nach einem Reload.
  const gekuerzt: Message = nachricht('assistant', 'Antwort am Limit abgeschnit\n\n---\n\n*' + HINWEIS + '*')
  const v = verlaufNach(gekuerzt)
  assert.equal(v.length, 4)
  assert.ok(v[3].includes(HINWEIS))
  assert.equal(istSpeicherbar(gekuerzt.content, false), true)

  // Quelltext: MAX_TOKENS speichert (onDone), Fehler/Abbruch speichern nie.
  const chatLF = chatView.replace(/\r\n/g, '\n')
  assert.match(chatLF, /onDone\(meta: SourceMeta\) \{[\s\S]*?onSaveExchange\?\.\(text, finalContent, startConvId\)/)
  assert.match(analyseChat, /meta\?\.abgeschnitten/)
})

test('U: Chat-Chip nennt nur bereitgestellten Kontext, die Check-Ansichten behalten ihre Bedeutung', () => {
  const kauf = readFileSync(new URL('./KaufCheckView.tsx', import.meta.url), 'utf8')
  const verkauf = readFileSync(new URL('./VerkaufsCheckView.tsx', import.meta.url), 'utf8')
  // Chat: Kontext-Wortlaut, keine Behauptung tatsaechlicher Antwortbelege.
  assert.match(badge, /Fahrzeugdaten als Kontext/)
  assert.match(badge, /Fahrzeugdaten \+ Web als Kontext/)
  assert.match(badge, /Web-Treffer als Kontext/)
  assert.match(badge, /belegt nicht, dass jede Aussage daraus stammt/)
  assert.match(chatView, /<SourceBadge meta=\{message\.meta\} art="chat" \/>/)
  // KaufCheck/VerkaufCheck: kein art-Prop -> Standard 'check' mit dem bisherigen Wortlaut.
  for (const v of [kauf, verkauf]) {
    assert.match(v, /<SourceBadge meta=\{\{ source: result\.quelle as never/)
    assert.doesNotMatch(v, /art="chat"/)
  }
  assert.match(badge, /art = 'check'/)
  assert.match(badge, /chat \? 'Fahrzeugdaten als Kontext' : 'Fahrzeugdatenbank'/)
  assert.match(badge, /chat \? 'Web-Treffer als Kontext' : 'Web-Recherche'/)
  assert.match(badge, /chat \? 'Fahrzeugdaten \+ Web als Kontext' : 'Fahrzeugdatenbank \+ Web'/)
  // Echte Beleglinks bleiben unveraendert nutzbar, der Belegstatus ebenfalls.
  assert.match(badge, /links\.map\(\(link, i\) =>/)
  assert.match(badge, /BELEGTE_QUELLEN = \['datenbank', 'web', 'gemischt'\] as const/)
})
