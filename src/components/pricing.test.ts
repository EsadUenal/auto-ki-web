import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

/**
 * Struktureller Vertrag der finalen Consumer-Preisseite (Pricing V1 FINAL).
 *
 * Die Vorgängerfassung prüfte 9,99 / 7,99 und „kein Monatsabo". Beides ist mit
 * dieser Runde bewusst überholt: die Preise wurden gesenkt und VIRA Plus ist
 * als einziges neues Abo hinzugekommen. Die Assertions sind deshalb nicht
 * gelockert, sondern auf den neuen Vertrag umgeschrieben.
 */

const pricing  = readFileSync(new URL('./PricingView.tsx', import.meta.url), 'utf8')
const sidebar  = readFileSync(new URL('./Sidebar.tsx', import.meta.url), 'utf8')
const app      = readFileSync(new URL('../App.tsx', import.meta.url), 'utf8')
const settings = readFileSync(new URL('./SettingsView.tsx', import.meta.url), 'utf8')
const gate     = readFileSync(new URL('./PurchaseGate.tsx', import.meta.url), 'utf8')

test('A: Free zeigt 5 AutoFinder-Suchen pro Monat', () => {
  assert.match(pricing, /5 AutoFinder-Suchen pro Monat/)
  assert.match(pricing, /VIRA Free/)
  assert.match(pricing, />0 €</)
})

test('B: Free zeigt 20 KI-Chat-Nachrichten pro Monat', () => {
  assert.match(pricing, /20 KI-Chat-Nachrichten pro Monat/)
})

test('C: KaufCheck kostet 5,99 € einmalig', () => {
  assert.match(pricing, /title="KaufCheck"[\s\S]{0,120}price="5,99 €"/)
  assert.match(pricing, /einmalig pro Check/)
})

test('D: VerkaufsCheck kostet 8,99 € einmalig', () => {
  assert.match(pricing, /title="VerkaufsCheck"[\s\S]{0,120}price="8,99 €"/)
})

test('E: VIRA Plus kostet 16,99 € pro Monat', () => {
  assert.match(pricing, /16,99 €/)
  assert.match(pricing, /pro Monat/)
  assert.match(pricing, /VIRA Plus/)
})

test('F/G/H/I: Plus nennt alle enthaltenen Kontingente', () => {
  assert.match(pricing, /'5 KaufChecks pro Monat'/)
  assert.match(pricing, /'1 VerkaufsCheck pro Monat'/)
  assert.match(pricing, /'50 AutoFinder-Suchen pro Monat'/)
  assert.match(pricing, /'100 KI-Chat-Nachrichten pro Monat'/)
})

test('J: Autokosten ist in Free UND Plus unbegrenzt', () => {
  assert.match(pricing, /Autokosten unbegrenzt/)
  const treffer = pricing.match(/Autokosten unbegrenzt/g) || []
  assert.ok(treffer.length >= 2, 'in Free- und Plus-Liste genannt')
})

test('K: die alten Consumer-Preise sind vollständig verschwunden', () => {
  assert.doesNotMatch(pricing, /9,99|7,99/)
})

test('Guthaben-Zusage: Einzelchecks verfallen nicht, Plus-Kontingente schon', () => {
  assert.match(pricing, /Dein Guthaben verfällt nicht\./)
  assert.match(pricing, /Monatliche Kontingente verfallen\s*\n?\s*zum Monatsende/)
  assert.match(pricing, /einzeln gekaufte Checks behältst du dauerhaft/)
})

test('Abo-Transparenz ist fachlich korrekt formuliert', () => {
  // Automatische Verlängerung wird ausdrücklich genannt …
  assert.match(pricing, /Verlängert sich automatisch um einen Monat, bis du kündigst/)
  // … und die Kündigung wirkt zum Periodenende, nicht sofort. Ein "jederzeit
  // sofort beendbar" wäre gegenüber dem Stripe-Verhalten schlicht falsch.
  assert.match(pricing, /läuft Plus bis zum Ende des bezahlten Monats weiter/)
  assert.match(pricing, /Keine Mindestlaufzeit, keine Jahresbindung/)
  assert.doesNotMatch(pricing, /jederzeit sofort/)
})

test('Legacy-Abos werden auf der Preisseite nicht beworben', () => {
  assert.doesNotMatch(pricing, /\b(Light|Pro|Max)-Abo\b/)
  assert.doesNotMatch(pricing, /abo_typ/)
})

test('CTAs: Checks über den bestehenden Flow, Plus über den Checkout', () => {
  assert.match(pricing, /sessionStorage\.setItem\(RETURN_TO_KEY, path\)/)
  assert.match(pricing, /navigate\('\/login'\)/)
  assert.match(pricing, /cta="KaufCheck starten"/)
  assert.match(pricing, /cta="VerkaufsCheck starten"/)
  assert.match(pricing, /VIRA Plus starten/)
  // Anonym: erst Login mit ReturnTo, dann zurück zur Preisseite.
  assert.match(pricing, /sessionStorage\.setItem\(RETURN_TO_KEY, '\/pricing'\)/)
  assert.match(pricing, /<PlusCheckout/)
})

test('kein Testmodus-Text auf der Preisseite', () => {
  assert.doesNotMatch(pricing, /Testmodus/)
})

test('Plus-Checkout sendet nur den Produktschlüssel, nie einen Betrag', () => {
  assert.match(gate, /apiKaufePlus\(agb, widerruf\)/)
  const block = gate.slice(gate.indexOf('export function PlusCheckout'))
  assert.doesNotMatch(block, /\b(preis|amount|unit_amount|betrag)\b\s*[:,]/i)
})

test('Pflicht-Zustimmungen auch beim Abo', () => {
  assert.match(gate, /disabled=\{!agb \|\| !widerruf \|\| laedt\}/)
  assert.match(gate, /Widerrufsrecht/)
})

test('Sidebar nennt den Bereich nur Preise', () => {
  assert.match(sidebar, /label: 'Preise'/)
  assert.doesNotMatch(sidebar, /Preise & Abo/)
})

test('Pricing ist öffentlich; Legacy-Abos bleiben in Settings verwaltbar', () => {
  assert.match(app, /path="\/pricing" element=\{<PricingView \/>\}/)
  assert.doesNotMatch(app, /path="\/pricing" element=\{<Guard/)
  // Plus zählt für Verwaltung/Kündigung als Abo, ohne abo_typ anzufassen.
  assert.match(settings, /const hatAbo = hatLegacyAbo \|\| !!user\.plus_aktiv/)
  assert.match(settings, /hatLegacyAbo = user\.abo_typ !== 'none'/)
})
