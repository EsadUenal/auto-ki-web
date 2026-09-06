import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'

/**
 * Struktureller Vertrag der Consumer-Payment-/Limit-Schicht im Frontend.
 *
 * Prueft bewusst den QUELLTEXT (wie autofinder.test.ts / pricing.test.ts):
 * entscheidend ist hier, dass das Frontend keine Berechtigung erfindet und
 * keinen Betrag bestimmt — das sind Eigenschaften des Codes, nicht des
 * Laufzeitverhaltens einer einzelnen Komponente.
 */

const client   = readFileSync(new URL('../api/client.ts', import.meta.url), 'utf8')
const gate     = readFileSync(new URL('./PurchaseGate.tsx', import.meta.url), 'utf8')
const kauf     = readFileSync(new URL('./KaufCheckView.tsx', import.meta.url), 'utf8')
const verkauf  = readFileSync(new URL('./VerkaufsCheckView.tsx', import.meta.url), 'utf8')
const settings = readFileSync(new URL('./SettingsView.tsx', import.meta.url), 'utf8')
const pricing  = readFileSync(new URL('./PricingView.tsx', import.meta.url), 'utf8')
const finder   = readFileSync(new URL('./autofinder/AutoFinderView.tsx', import.meta.url), 'utf8')
const kosten   = readFileSync(new URL('./autokosten/AutokostenView.tsx', import.meta.url), 'utf8')

/** Entfernt Kommentare — Assertions sollen den Code pruefen, nicht die Prosa. */
function ohneKommentare(quelle: string): string {
  return quelle
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/(^|[^:])\/\/.*$/gm, '$1')
}

test('A: anonymer Kauf laeuft weiter ueber Login + ReturnTo, nicht ueber Checkout', () => {
  assert.match(pricing, /sessionStorage\.setItem\(RETURN_TO_KEY, path\)/)
  assert.match(pricing, /navigate\('\/login'\)/)
  // Die Preisseite selbst startet keinen Checkout — der Kauf entsteht im
  // Check-Kontext, damit die Eingaben des Nutzers nicht verloren gehen.
  assert.doesNotMatch(pricing, /apiKaufeCheck|apiCreateCheckoutSession/)
})

test('B/C: der Client sendet nur einen Produktschluessel, nie einen Betrag', () => {
  assert.match(client, /export async function apiKaufeCheck\(\s*produkt: CheckProdukt/)
  assert.match(client, /apiCreateCheckoutSession\('check', undefined, agbAkzeptiert, widerrufVerzicht, produkt\)/)
  assert.match(gate, /produkt: 'kaufcheck' \| 'verkaufscheck'|CheckProdukt/)
})

test('D: kein Betrag/Preis wird an das Backend geschickt', () => {
  const body = client.slice(client.indexOf('async function apiCreateCheckoutSession'))
    .slice(0, 900)
  assert.doesNotMatch(body, /\b(preis|amount|unit_amount|betrag)\b\s*[:,]/i)
  assert.match(body, /typ, abo_typ, produkt,/)
})

test('K: das Kauf-Gate erscheint genau dann, wenn der Server 402 gemeldet hat', () => {
  for (const [name, quelle] of [['KaufCheck', kauf], ['VerkaufsCheck', verkauf]] as const) {
    assert.match(quelle, /\{paymentRequired && \(\s*<PurchaseGate/,
      `${name}: Gate haengt an paymentRequired`)
    assert.match(quelle, /setPaymentRequired\(/, `${name}: 402 setzt den Zustand`)
  }
  assert.match(kauf, /produkt="kaufcheck"/)
  assert.match(verkauf, /produkt="verkaufscheck"/)
})

test('I/J: jede Check-Seite kauft ausschliesslich ihr eigenes Produkt', () => {
  assert.doesNotMatch(kauf, /produkt="verkaufscheck"/)
  assert.doesNotMatch(verkauf, /produkt="kaufcheck"/)
  assert.match(kauf, /usePaymentReturn\('kaufcheck'/)
  assert.match(verkauf, /usePaymentReturn\('verkaufscheck'/)
})

test('Preise stehen im Gate genau einmal und passen zur Preisseite', () => {
  assert.match(gate, /kaufcheck:\s*\{ titel: 'KaufCheck',\s*preis: '5,99 €'/)
  assert.match(gate, /verkaufscheck: \{ titel: 'VerkaufsCheck', preis: '8,99 €'/)
  assert.match(pricing, /price="5,99 €"/)
  assert.match(pricing, /price="8,99 €"/)
  // Gate und Preisseite duerfen nie auseinanderlaufen.
  assert.doesNotMatch(gate, /9,99|7,99/)
})

test('Frontend-Erfolg ist NIE ein Zahlungsnachweis', () => {
  // Nach der Rueckkehr wird der Kontingentstand beim Server erfragt; es wird
  // niemals aus payment=success, localStorage oder Client-State freigeschaltet.
  assert.match(gate, /apiPaymentStatus\(\)/)
  assert.doesNotMatch(gate, /localStorage/)
  assert.doesNotMatch(gate, /setChecks|grantEntitlement|freischalten\s*=\s*true/)
  // payment=success wird nur als Ausloeser zum NACHFRAGEN benutzt.
  assert.match(gate, /payment !== 'success' && payment !== 'cancelled'/)
  assert.match(gate, /window\.history\.replaceState/)
})

test('Rueckkehr endet nicht in einem unendlichen Spinner', () => {
  assert.match(gate, /BESTAETIGUNG_TIMEOUT_MS/)
  assert.match(gate, /zeitueberschreitung/)
  assert.match(gate, /Zahlung wird bestätigt/)
  assert.match(gate, /abgebrochen/)
})

test('Regression: der Bestaetigungs-Timer stirbt nicht am StrictMode-Cleanup', () => {
  // Gefunden in der Browser-QA: lagen Ausloeser und Timer in EINEM per Ref
  // einmalig gefeuerten Effekt, raeumte React 18 (StrictMode ruft Effekte
  // doppelt auf) die Schleife nach dem ersten Durchlauf ab. Der Ref-Guard
  // verhinderte den Neustart -> "Zahlung wird bestätigt" blieb dauerhaft
  // stehen und der Zeitueberschreitungs-Zweig wurde nie erreicht.
  // Der Timer muss deshalb in einem EIGENEN Effekt liegen, der von `zustand`
  // abhaengt: den stellt React nach einem Cleanup von selbst wieder her.
  const effekte = gate.match(/useEffect\(\(\) => \{/g) || []
  assert.ok(effekte.length >= 2, 'Ausloeser und Timer liegen in getrennten Effekten')
  assert.match(gate, /\}, \[zustand, start, produkt, onFreigeschaltet\]\)/)
  // Der Ref-Guard darf NUR den Ausloeser schuetzen, nie den Timer.
  const timerBlock = gate.slice(gate.indexOf("if (zustand !== 'laeuft') return"))
  assert.doesNotMatch(timerBlock, /gestartet\.current/)
  assert.match(timerBlock, /BESTAETIGUNG_TIMEOUT_MS/)
})

test('abgebrochene Zahlung schaltet nichts frei', () => {
  assert.match(gate, /Die Zahlung wurde abgebrochen\. Es wurde nichts berechnet und nichts freigeschaltet\./)
  // Der cancelled-Zweig kehrt zurueck, ohne den Status zu pollen.
  const cancelBlock = gate.slice(gate.indexOf("if (payment === 'cancelled')"), gate.indexOf("setZustand('laeuft')"))
  assert.doesNotMatch(cancelBlock, /apiPaymentStatus/)
})

test('Pflicht-Zustimmungen werden vor dem Kauf eingeholt', () => {
  assert.match(gate, /agbChecked/)
  assert.match(gate, /widerrufChecked/)
  assert.match(gate, /disabled=\{!agbChecked \|\| !widerrufChecked \|\| laedt\}/)
})

test('Account zeigt beide Kontingente verstaendlich, ohne Ledger-Tabelle', () => {
  assert.match(settings, /Zusätzlich gekauft/)
  assert.match(settings, /Nutzung diesen Monat/)
  assert.match(settings, /kaufchecks_verbleibend/)
  assert.match(settings, /verkaufschecks_verbleibend/)
  // Monatliche Plus-Kontingente stehen getrennt vom dauerhaft Gekauften.
  assert.match(settings, /In VIRA Plus enthalten \(diesen Monat\)/)
  assert.match(settings, /plus_kaufchecks_verbleibend/)
  assert.match(settings, /verfällt nicht/)
  assert.doesNotMatch(ohneKommentare(settings), /stripe_session|payment_intent|event_id|ledger/i)
})

test('R/S: das Monatslimit wird als eigener Zustand behandelt, nicht als Drosselung', () => {
  assert.match(client, /export function istMonatslimit/)
  assert.match(client, /code === 'monatslimit_erreicht'/)
  assert.doesNotMatch(client, /tageslimit_erreicht/)
  // Chat UND Rueckfragen nutzen denselben Weg.
  const treffer = client.match(/if \(istMonatslimit\(grund\)\) \{/g) || []
  assert.equal(treffer.length, 2)
})

test('AutoFinder zeigt bei erreichtem Monatslimit keinen rohen Statuscode', () => {
  const block = client.slice(client.indexOf('/api/v1/autofinder'),
                             client.indexOf('/api/v1/autofinder') + 1200)
  // Eigener Fehlertyp statt generischem Error: nur so kann die Oberflaeche den
  // fertigen Servertext durchreichen, statt ihn auf einen Standardsatz
  // abzubilden (siehe humanError in autofinder/logic.ts).
  assert.match(block, /throw new MonatslimitFehler\(extractMessage\(data\), plusHilftAus\(data\)\)/)
  assert.match(client, /export class MonatslimitFehler extends Error/)
  const logic = readFileSync(new URL('./autofinder/logic.ts', import.meta.url), 'utf8')
  assert.match(logic, /err\.name === 'MonatslimitFehler'/)
  // logic.ts bleibt bewusst frei von API-Client-Importen.
  assert.doesNotMatch(logic, /from '\.\.\/\.\.\/api\/client'/)
  // Das Kontingent haengt am Konto, nicht an der IP.
  assert.match(block, /credentials: 'include'/)
})

test('U: kein roher Status, kein JSON, kein Stacktrace in der Oberflaeche', () => {
  assert.doesNotMatch(client, /onError\(\s*`?\$?\{?\s*response\.status/)
  assert.doesNotMatch(client, /onError\(JSON\.stringify/)
  // Die Nutzertexte kommen aus dem strukturierten Feld bzw. aus festen Saetzen.
  assert.match(client, /callbacks\.onError\(extractMessage\(grund\), 'hinweis'\)/)
})

test('ein erreichtes Monatslimit wird nicht als Fehler dargestellt', () => {
  const chatView = readFileSync(new URL('./ChatView.tsx', import.meta.url), 'utf8')
  // Das Limit ist ein normaler Produktzustand: der Chat setzt davor kein
  // "Fehler:"-Praefix mehr. Echte Fehler behalten es.
  assert.match(chatView, /art === 'hinweis' \? err : `\*\*Fehler:\*\* \$\{err\}`/)
  assert.match(client, /export type MeldungsArt = 'fehler' \| 'hinweis'/)
  // Beide Limit-Zweige (Chat + Rueckfragen) melden als Hinweis.
  const hinweise = client.match(/extractMessage\(grund\), 'hinweis'\)/g) || []
  assert.equal(hinweise.length, 2)
})

test('das Tageskontingent haengt am Konto: Cookie wird mitgesendet', () => {
  const chat = client.slice(client.indexOf('/api/v1/chat'), client.indexOf('/api/v1/chat') + 700)
  assert.match(chat, /credentials: 'include'/)
  const frage = client.slice(client.indexOf('/api/v1/analyse-frage'), client.indexOf('/api/v1/analyse-frage') + 700)
  assert.match(frage, /credentials: 'include'/)
})

test('P/Q: AutoFinder und Autokosten bleiben ohne Bezahlschranke', () => {
  for (const [name, quelle] of [['AutoFinder', finder], ['Autokosten', kosten]] as const) {
    assert.doesNotMatch(quelle, /PurchaseGate|apiKaufeCheck|apiCreateCheckoutSession/,
      `${name}: keine Bezahlschranke`)
    assert.doesNotMatch(quelle, /paymentRequired/, `${name}: kein Payment-Gate-Zustand`)
  }
  assert.doesNotMatch(kosten, /api-client|apiPaymentStatus/)
})
