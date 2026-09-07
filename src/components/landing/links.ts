/**
 * Ziele der Landingpage-CTAs.
 *
 * Alle Werte zeigen auf Routen, die es in App.tsx WIRKLICH gibt. Das ist kein
 * Selbstzweck: eine Marketingseite, die auf eine nicht existierende Route
 * verlinkt, führt den Besucher genau an der Stelle ins Leere, an der er sich
 * gerade entschieden hat. `/register` etwa gibt es nicht — Registrieren ist
 * ein Tab in LoginView, den `?modus=register` direkt öffnet.
 */

/** Registrierung: LoginView mit direkt geöffnetem Registrieren-Tab. */
export const REGISTER_ROUTE = '/login?modus=register'

/** Öffentliche Werkzeuge (ohne Login erreichbar). */
export const AUTOFINDER_ROUTE = '/autofinder'
export const AUTOKOSTEN_ROUTE = '/autokosten'
export const PRICING_ROUTE = '/pricing'

/** Werkzeuge hinter dem Login — der Guard leitet mit returnTo auf /login. */
export const KAUFCHECK_ROUTE = '/kaufcheck'
export const VERKAUFSCHECK_ROUTE = '/verkaufscheck'
export const CHAT_ROUTE = '/chat'

/** Support-Adresse — identisch mit dem globalen App-Footer. */
export const SUPPORT_MAILTO = 'mailto:kontakt.autotaskai@gmail.com'
