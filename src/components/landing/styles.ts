/**
 * Gemeinsame Fokus-Darstellung der Landingpage.
 *
 * Bewusst explizit statt auf den Browser-Standardring zu vertrauen: Der
 * Standardring ist je nach Browser ein dünner blauer oder schwarzer Umriss und
 * verschwindet auf den orangen Flächen der primären CTAs praktisch. Wer die
 * Seite mit der Tastatur bedient, muss aber jederzeit sehen können, wo er
 * gerade steht — gerade auf den Schaltflächen, die etwas auslösen.
 *
 * `focus-visible` statt `focus`: der Ring erscheint bei Tastaturbedienung, nicht
 * nach jedem Mausklick.
 */
export const FOKUS_RING =
  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-500 '
  + 'focus-visible:ring-offset-2 focus-visible:ring-offset-white'
