import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

import { baueVerlauf } from './chatVerlauf.ts'
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
  assert.match(chatView, /<SourceBadge meta=\{message\.meta\} \/>/)
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
  assert.match(badge, /\{belegt && <SourceChip source=\{meta\.source\} \/>\}/)
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
