import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

const pricing = readFileSync(new URL('./PricingView.tsx', import.meta.url), 'utf8')
const sidebar = readFileSync(new URL('./Sidebar.tsx', import.meta.url), 'utf8')
const app = readFileSync(new URL('../App.tsx', import.meta.url), 'utf8')
const settings = readFileSync(new URL('./SettingsView.tsx', import.meta.url), 'utf8')

test('A/B: AutoFinder und Autokosten werden als kostenlose Produkte gezeigt', () => {
  assert.match(pricing, /VIRA Free/)
  assert.match(pricing, /AutoFinder/)
  assert.match(pricing, /Autokosten/)
  assert.match(pricing, />0 €</)
})

test('C: KaufCheck kostet 9,99 € einmalig pro Check', () => {
  assert.match(pricing, /title="KaufCheck"[\s\S]{0,120}price="9,99 €"/)
  assert.match(pricing, /einmalig pro Check/)
})

test('D: VerkaufsCheck kostet 7,99 € einmalig pro Check', () => {
  assert.match(pricing, /title="VerkaufsCheck"[\s\S]{0,120}price="7,99 €"/)
})

test('E: Pricing bietet kein Monatsabo und keine Legacy-Pläne an', () => {
  assert.doesNotMatch(pricing, /LIGHT|PRO|MAX|pro Monat|monatlich kündbar/)
  assert.doesNotMatch(pricing, /apiCreateCheckoutSession|handleAbo|handleEinzelkauf/)
  assert.match(pricing, /Kein verstecktes Abo/)
})

test('F/G: kein Testmodus; keine automatische Verlängerung', () => {
  assert.doesNotMatch(pricing, /Testmodus/)
  assert.match(pricing, /Keine automatische Verlängerung/)
})

test('H: KaufCheck-CTA führt über den bestehenden Auth-/ReturnTo-Flow', () => {
  assert.match(pricing, /cta="KaufCheck starten"/)
  assert.match(pricing, /startCheck\('\/kaufcheck'\)/)
  assert.match(pricing, /sessionStorage\.setItem\(RETURN_TO_KEY, path\)/)
  assert.match(pricing, /navigate\('\/login'\)/)
})

test('I: VerkaufsCheck-CTA führt auf die richtige Route', () => {
  assert.match(pricing, /cta="VerkaufsCheck starten"/)
  assert.match(pricing, /startCheck\('\/verkaufscheck'\)/)
})

test('J: Paid Cards stapeln mobil und werden erst auf Desktop zweispaltig', () => {
  assert.match(pricing, /grid grid-cols-1 lg:grid-cols-2/)
  assert.doesNotMatch(pricing, /min-w-\[/)
})

test('Sidebar nennt den Bereich nur Preise', () => {
  assert.match(sidebar, /label: 'Preise'/)
  assert.doesNotMatch(sidebar, /Preise & Abo/)
})

test('Pricing ist öffentlich; aktive Legacy-Abos bleiben in Settings verwaltbar', () => {
  assert.match(app, /path="\/pricing" element=\{<PricingView \/>\}/)
  assert.doesNotMatch(app, /path="\/pricing" element=\{<Guard/)
  assert.match(settings, /title=\{hatAbo \? 'Abo verwalten' : 'Zugang & Guthaben'\}/)
  assert.match(settings, /Aktuell ist kein Check-Guthaben vorhanden/)
})
