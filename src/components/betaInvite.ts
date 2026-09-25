// Closed-Beta-Einladung: Token-Übergabe über den Anmelde-Zwischenschritt.
//
// Der Einladungslink trägt den Token im FRAGMENT (`/beta#token=...`), weil
// Fragmente nie an einen Server gehen — der Token steht damit in keinem
// Access-Log und in keinem Referrer. Dieselbe Lösung nutzt bereits der
// Bestätigungslink aus der Registrierungsmail (siehe EmailBestaetigenView).
//
// Wer den Link ohne Konto öffnet, muss sich erst anmelden oder registrieren.
// Dabei geht die Adresszeile verloren — und mit ihr das Fragment. Deshalb wird
// der Token für genau diesen Zwischenschritt in `sessionStorage` geparkt:
//
//   * sessionStorage, nicht localStorage: gilt nur für diesen Tab und endet
//     mit ihm. Ein vergessener Token überlebt keinen Browser-Neustart.
//   * gespeichert wird NUR der Token, nie ein Ergebnis. Es gibt bewusst kein
//     lokales "hat Credits"-Flag — was das Paket enthält und ob es überhaupt
//     fließt, entscheidet ausschließlich der Server.
//   * gelöscht wird, sobald die Einlösung ein Ergebnis hatte (egal welches).
//
// Dass ein Payload über den Login hinweg in sessionStorage wandert und ein
// Rücksprungziel über `setReturnTo` gesetzt wird, ist die bestehende
// Architektur dieses Projekts (vgl. KaufCheck-Prefill in autofinder/logic.ts).
//
// Dieses Modul bleibt bewusst OHNE Importe: `setReturnTo` ruft die View
// unmittelbar daneben auf. So gibt es weiterhin nur eine Definition des
// Rücksprung-Schlüssels (autofinder/logic.ts), und die Token-Übergabe bleibt
// eine reine, direkt testbare Funktion.
export const BETA_ROUTE = '/beta'
const BETA_TOKEN_KEY = 'vira.beta.token'

/** Liest den Token aus dem URL-Fragment (`#token=...`). */
export function betaTokenAusFragment(): string {
  if (typeof window === 'undefined') return ''
  const hash = window.location.hash.replace(/^#/, '')
  return new URLSearchParams(hash).get('token')?.trim() ?? ''
}

/** Parkt den Token für den Anmelde-Zwischenschritt.
 *  Das Rücksprungziel setzt der Aufrufer direkt daneben (`setReturnTo`). */
export function stageBetaToken(token: string): void {
  try {
    sessionStorage.setItem(BETA_TOKEN_KEY, token)
  } catch {
    /* privater Modus / Speicher voll: der Tester kann den Link nach dem
       Anmelden erneut öffnen — der Token ist dort weiterhin gültig. */
  }
}

export function readBetaToken(): string {
  try {
    return sessionStorage.getItem(BETA_TOKEN_KEY) ?? ''
  } catch {
    return ''
  }
}

export function clearBetaToken(): void {
  try {
    sessionStorage.removeItem(BETA_TOKEN_KEY)
  } catch {
    /* egal */
  }
}
