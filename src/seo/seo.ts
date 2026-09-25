/**
 * Zentrale SEO-Definition — EINE Quelle für
 *   - den Build-Prerender (statisches HTML je öffentlicher Route),
 *   - den Client-Head (<RouteSeo>, bei Navigation innerhalb der SPA),
 *   - sitemap.xml und die SEO-Tests (seo.test.ts).
 *
 * Grundsätze (siehe SEO.md):
 *  - Indexierbar sind nur öffentliche Marketing-/Werkzeugseiten auf der
 *    Produktionsdomain SITE_URL. Alles andere (Login, App, Account, Checks,
 *    Chat, Zahlungs-Rücksprünge, unfertige Rechtstexte, unbekannte URLs) trägt
 *    `noindex` — bereits im ausgelieferten HTML, weil Google bei `noindex` im
 *    Original-HTML das JavaScript eventuell gar nicht mehr ausführt.
 *  - Der Canonical im Prerender-HTML und der vom Client gesetzte sind identisch.
 *  - Structured Data nur mit belegbaren Angaben: keine Bewertungen, keine
 *    Nutzerzahlen, keine Firmendaten. Preise = Pricing V1 (landing.test.ts).
 */

export const SITE_URL = 'https://getenfal.de'
export const SITE_NAME = 'ENFAL'

export interface PublicRoute {
  path: string
  title: string
  description: string
  /** JSON-LD-Objekte (ohne @context), nur wahrheitsgemäße Angaben. */
  jsonLd: Record<string, unknown>[]
}

const ORGANISATION = {
  '@type': 'Organization',
  '@id': `${SITE_URL}/#organization`,
  name: SITE_NAME,
  url: `${SITE_URL}/`,
  logo: `${SITE_URL}/logo.svg`,
}

const WEBSITE = {
  '@type': 'WebSite',
  '@id': `${SITE_URL}/#website`,
  name: SITE_NAME,
  url: `${SITE_URL}/`,
  inLanguage: 'de-DE',
  publisher: { '@id': `${SITE_URL}/#organization` },
}

function angebot(name: string, preis: string, beschreibung: string) {
  return {
    '@type': 'Offer',
    name,
    price: preis,
    priceCurrency: 'EUR',
    description: beschreibung,
    url: `${SITE_URL}/pricing`,
  }
}

/** Pricing V1 (eingefroren): identische Werte wie Landing/PricingView. */
const ANGEBOTE = [
  angebot('ENFAL Free', '0', '5 AutoFinder-Suchen und 20 KI-Chat-Nachrichten pro Monat, Autokosten-Rechner unbegrenzt'),
  angebot('KaufCheck', '5.99', 'Einmaliger KaufCheck, Guthaben verfällt nicht'),
  angebot('VerkaufsCheck', '8.99', 'Einmaliger VerkaufsCheck, Guthaben verfällt nicht'),
  {
    ...angebot('ENFAL Plus', '16.99', '5 KaufChecks, 1 VerkaufsCheck, 50 AutoFinder-Suchen und 100 KI-Chat-Nachrichten pro Monat, monatlich kündbar'),
    priceSpecification: {
      '@type': 'UnitPriceSpecification',
      price: '16.99',
      priceCurrency: 'EUR',
      unitCode: 'MON',
      referenceQuantity: { '@type': 'QuantitativeValue', value: 1, unitCode: 'MON' },
    },
  },
]

function webApp(name: string, path: string, beschreibung: string, kostenlos: boolean) {
  return {
    '@type': 'WebApplication',
    name,
    url: `${SITE_URL}${path}`,
    description: beschreibung,
    applicationCategory: 'UtilitiesApplication',
    operatingSystem: 'Web',
    inLanguage: 'de-DE',
    publisher: { '@id': `${SITE_URL}/#organization` },
    ...(kostenlos
      ? { offers: { '@type': 'Offer', price: '0', priceCurrency: 'EUR' } }
      : {}),
  }
}

function brotkrumen(path: string, name: string) {
  return {
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: SITE_NAME, item: `${SITE_URL}/` },
      { '@type': 'ListItem', position: 2, name, item: `${SITE_URL}${path}` },
    ],
  }
}

const START_BESCHREIBUNG =
  'ENFAL hilft beim Finden, Vergleichen und Prüfen von Fahrzeugen: AutoFinder, '
  + 'Autokosten-Rechner und KI-Chat kostenlos starten, KaufCheck ab 5,99 €.'

export const PUBLIC_ROUTES: PublicRoute[] = [
  {
    path: '/',
    title: 'ENFAL: Autos finden, prüfen und besser entscheiden',
    description: START_BESCHREIBUNG,
    jsonLd: [
      ORGANISATION,
      WEBSITE,
      {
        ...webApp('ENFAL', '/', START_BESCHREIBUNG, false),
        offers: ANGEBOTE,
      },
    ],
  },
  {
    path: '/autofinder',
    title: 'AutoFinder: Welches Auto passt zu dir? | ENFAL',
    description:
      'Budget, Fahrweise und Prioritäten angeben: Der ENFAL AutoFinder schlägt passende Modelle vor '
      + 'und begründet jeden Vorschlag. Eine Suche pro Tag ohne Konto.',
    jsonLd: [
      webApp('ENFAL AutoFinder', '/autofinder',
        'Schlägt passende Fahrzeugmodelle nach Budget, Fahrweise und Prioritäten vor und begründet jeden Vorschlag.',
        true),
      brotkrumen('/autofinder', 'AutoFinder'),
    ],
  },
  {
    path: '/autokosten',
    title: 'Autokosten-Rechner: Was kostet dein Auto im Monat? | ENFAL',
    description:
      'Kraftstoff, Versicherung, Steuer, Wartung, Wertverlust: Kosten pro Monat, Jahr und Kilometer '
      + 'mit Budget-Abgleich und Autovergleich. Kostenlos, ohne Konto.',
    jsonLd: [
      webApp('ENFAL Autokosten-Rechner', '/autokosten',
        'Berechnet Fahrzeugkosten pro Monat, Jahr und Kilometer aus Kraftstoff, Versicherung, Steuer, '
        + 'Wartung und Wertverlust, inklusive Budget-Abgleich und Vergleich zweier Autos.',
        true),
      brotkrumen('/autokosten', 'Autokosten-Rechner'),
    ],
  },
  {
    path: '/pricing',
    title: 'Preise: KaufCheck, VerkaufsCheck und ENFAL Plus | ENFAL',
    description:
      'Kostenlos starten, einzelne Checks ohne Abo kaufen oder ENFAL Plus monatlich nutzen: '
      + 'KaufCheck 5,99 €, VerkaufsCheck 8,99 €, ENFAL Plus 16,99 € pro Monat.',
    jsonLd: [
      {
        ...webApp('ENFAL', '/', START_BESCHREIBUNG, false),
        offers: ANGEBOTE,
      },
      brotkrumen('/pricing', 'Preise'),
    ],
  },
]

/** Shell für alle nicht öffentlichen/unbekannten Pfade (App, Login, Legal-Platzhalter, 404). */
export const APP_SHELL_SEO = {
  title: 'ENFAL',
  description: 'ENFAL: KI-Autoberatung für Kauf, Verkauf und technische Fragen.',
}

export interface HeadSeo {
  title: string
  description: string
  robots: 'index, follow' | 'noindex, nofollow'
  canonical: string | null
  jsonLd: Record<string, unknown>[]
}

function normalisiere(pathname: string): string {
  const p = pathname.split(/[?#]/)[0] || '/'
  return p.length > 1 ? p.replace(/\/+$/, '') : '/'
}

export function publicRouteFuer(pathname: string): PublicRoute | undefined {
  const p = normalisiere(pathname)
  return PUBLIC_ROUTES.find((r) => r.path === p)
}

export function canonicalUrl(path: string): string {
  return path === '/' ? `${SITE_URL}/` : `${SITE_URL}${path}`
}

export function headSeoFuer(pathname: string): HeadSeo {
  const route = publicRouteFuer(pathname)
  if (!route) {
    return { ...APP_SHELL_SEO, robots: 'noindex, nofollow', canonical: null, jsonLd: [] }
  }
  return {
    title: route.title,
    description: route.description,
    robots: 'index, follow',
    canonical: canonicalUrl(route.path),
    jsonLd: route.jsonLd,
  }
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/** JSON-LD sicher in <script> einbetten (kein "</script>" im Inhalt). */
export function jsonLdText(obj: Record<string, unknown>): string {
  return JSON.stringify({ '@context': 'https://schema.org', ...obj }).replace(/</g, '\\u003c')
}

/** Head-Tags als HTML (Prerender). Reihenfolge und Werte identisch zu applyHeadSeo. */
export function headTagsHtml(seo: HeadSeo): string {
  const t: string[] = [
    `<title>${esc(seo.title)}</title>`,
    `<meta name="description" content="${esc(seo.description)}" />`,
    `<meta name="robots" content="${seo.robots}" />`,
  ]
  if (seo.canonical) {
    t.push(
      `<link rel="canonical" href="${esc(seo.canonical)}" />`,
      `<meta property="og:type" content="website" />`,
      `<meta property="og:site_name" content="${SITE_NAME}" />`,
      `<meta property="og:locale" content="de_DE" />`,
      `<meta property="og:title" content="${esc(seo.title)}" />`,
      `<meta property="og:description" content="${esc(seo.description)}" />`,
      `<meta property="og:url" content="${esc(seo.canonical)}" />`,
      `<meta name="twitter:card" content="summary" />`,
    )
  }
  for (const obj of seo.jsonLd) {
    t.push(`<script type="application/ld+json">${jsonLdText(obj)}</script>`)
  }
  return t.map((x) => `    ${x}`).join('\n')
}

export function sitemapXml(): string {
  const urls = PUBLIC_ROUTES.map((r) => `  <url>\n    <loc>${canonicalUrl(r.path)}</loc>\n  </url>`)
  return `<?xml version="1.0" encoding="UTF-8"?>\n`
    + `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`
}
