# ENFAL — SEO- und Crawler-Grundlage

Stand: 2026-09-13. Vorbereitung für https://getenfal.de, **noch nicht deployt**.
Nichts in dieser Datei ist live verifiziert (siehe „Nach Deployment“).

## Quellen (offiziell, am 2026-09-13 geprüft)

- Google-Crawler inkl. Google-Extended:
  https://developers.google.com/crawling/docs/crawlers-fetchers/google-common-crawlers
- JavaScript-SEO (noindex, Canonical, Pre-Rendering, History-API):
  https://developers.google.com/search/docs/crawling-indexing/javascript/javascript-seo-basics
- KI-Funktionen der Google-Suche (AI Overviews / AI Mode):
  https://developers.google.com/search/docs/appearance/ai-features
- OpenAI-Crawler (OAI-SearchBot, GPTBot, ChatGPT-User):
  https://developers.openai.com/api/docs/bots

Kernaussagen, die diese Umsetzung bestimmen:

- **Google-Extended** steuert laut Google, ob gecrawlte Inhalte für das Training
  künftiger Gemini-Modelle und für Grounding (Gemini Apps, Grounding with Google
  Search auf Vertex AI) verwendet werden dürfen. Es beeinflusst **weder die
  Aufnahme in die Google-Suche noch das Ranking**. Es hat keinen eigenen
  User-Agent, nur das robots.txt-Token.
- **AI Overviews / AI Mode**: laut Google keine zusätzlichen Anforderungen, keine
  speziellen Dateien oder Markups — normale Indexierbarkeit mit Snippet genügt.
  Deshalb gibt es **keine llms.txt** (kein belegter Nutzen; Google sagt
  ausdrücklich, dass keine „AI text files“ nötig sind).
- **OAI-SearchBot** wird für die Suchfunktionen von ChatGPT verwendet, **GPTBot**
  für das Training von Foundation-Modellen. Laut OpenAI sind die Einstellungen
  unabhängig voneinander. ChatGPT-User (nutzerausgelöste Abrufe) hält sich
  laut OpenAI nicht zwingend an robots.txt.
- **noindex im Original-HTML** kann dazu führen, dass Google JavaScript gar
  nicht mehr ausführt → private Routen tragen noindex bereits im ausgelieferten
  HTML, öffentliche Seiten nie.
- Ein per JavaScript gesetzter Canonical darf dem im Original-HTML nicht
  widersprechen → Prerender und Client setzen identische Werte.

Keine Abweichung zu den Vorgaben des Auftrags festgestellt.

## Crawler-Policy (public/robots.txt)

| Token | Regel | Wirkung |
|---|---|---|
| Googlebot | Allow | Google-Suche inkl. AI Overviews / AI Mode |
| Google-Extended | Allow | Gemini-Training/Grounding (bewusst erlaubt) |
| OAI-SearchBot | Allow | ChatGPT Search: finden und zitieren |
| GPTBot | Disallow | kein Training-Crawling; für ChatGPT Search nicht nötig |
| * | Allow | übrige Crawler |

`Sitemap: https://getenfal.de/sitemap.xml`. robots.txt ist **kein**
Schutzmechanismus: private Bereiche sind per Login geschützt und tragen noindex.

## Routen-Matrix

| Route | Klasse | robots | Canonical | Prerender | Sitemap | JSON-LD |
|---|---|---|---|---|---|---|
| `/` | öffentlich | index, follow | https://getenfal.de/ | ja | ja | Organization, WebSite, WebApplication + Offers |
| `/autofinder` | öffentlich | index, follow | https://getenfal.de/autofinder | ja | ja | WebApplication (Offer 0 €), BreadcrumbList |
| `/autokosten` | öffentlich | index, follow | https://getenfal.de/autokosten | ja | ja | WebApplication (Offer 0 €), BreadcrumbList |
| `/pricing` | öffentlich | index, follow | https://getenfal.de/pricing | ja | ja | WebApplication + Offers, BreadcrumbList |
| `/login` (inkl. Registrierung) | App | noindex | – | nein | nein | – |
| `/chat`, `/kaufcheck`, `/verkaufscheck`, `/ebooks`, `/entdecken`, `/ersatzteile`, `/settings`, `/help`, `/dealer`, `/dealer/:id` | App (Login) | noindex | – | nein | nein | – |
| `/impressum`, `/datenschutz`, `/agb`, `/widerruf` | Legal, unfertig | noindex | – | nein | nein | – |
| unbekannte Pfade | – | noindex | – | nein | nein | – |

Einzige Quelle: `src/seo/seo.ts` (`PUBLIC_ROUTES`). Jede neue Route in
`App.tsx` muss dort bzw. in der Privat-Liste von `seo.test.ts` eingeordnet
werden, sonst schlägt der Test fehl.

Preise im Structured Data = Pricing V1: KaufCheck 5,99 €, VerkaufsCheck 8,99 €,
ENFAL Plus 16,99 €/Monat, Free 0 €. Keine Bewertungen, Nutzerzahlen,
Adressen oder Firmendaten.

## Technik

- **Prerender ohne neue Abhängigkeit**: `npm run build` =
  `tsc` → `vite build` → `vite build --ssr src/entry-prerender.tsx` →
  `node scripts/prerender.mjs`. Gerendert wird derselbe Routenbaum wie im
  Browser (`AppRoutes`, `react-dom/server` + `StaticRouter`). Der Client rendert
  beim Start neu (`createRoot`), kein Hydration-Abgleich.
- Ausgabe: `dist/index.html`, `dist/<route>/index.html`, `dist/spa.html`
  (noindex-App-Shell), `dist/sitemap.xml`, `dist/robots.txt`.
- Client-Navigation: `src/seo/RouteSeo.tsx` setzt Title, Description, robots,
  Canonical, Open Graph und JSON-LD aus derselben Tabelle.
- Hosting (`nginx.conf`): `try_files $uri $uri/index.html /spa.html;` —
  öffentliche Seiten direkt, alles andere auf die noindex-Shell (kein
  Server-404 bei Direktaufruf). HTML-Antworten `expires epoch` (no-cache).
- URL-Varianten mit Query (z. B. Stripe-Rücksprung `/pricing?payment=success&session_id=…`)
  liefern dieselbe Seite mit Canonical auf die saubere URL.

## Offene Punkte (bewusst nicht in diesem Block)

- **Kein Social-Preview-Bild**: `og:image` fehlt (nur `logo.svg` vorhanden, SVG
  wird von Social-Plattformen meist nicht angezeigt). `twitter:card=summary`.
- **Keine öffentlichen Produkt-Einzelseiten** für KaufCheck, VerkaufsCheck,
  ENFAL Plus und E-Books: `/kaufcheck`, `/verkaufscheck`, `/ebooks` sind
  App-Routen hinter Login; `/plus` existiert nicht. Die Produkte werden
  öffentlich auf `/` und `/pricing` erklärt.
- **Domain-Split** getenfal.de / app.getenfal.de: Der Build ist
  domain-neutral. Wird derselbe Build auch unter app.getenfal.de ausgeliefert,
  verweisen dessen öffentliche Seiten per Canonical auf getenfal.de; ob die
  App-Domain zusätzlich `X-Robots-Tag: noindex` oder eine eigene robots.txt
  bekommt, entscheidet der Deployment-Block.
- **nginx lokal nicht ausgeführt** (kein Docker/nginx vorhanden): das Routing
  wurde mit einem Node-Server nachgebildet, der `try_files` 1:1 abbildet.
- Vorbestehend, nicht geändert: `location = /index.html` und `/assets/` setzen
  eigene `add_header` und verlieren dadurch die server-weiten Security-Header
  (nginx-Vererbungsregel) — für den Deployment-/Security-Block.
- JS-Bundle ~737 kB (gzip ~204 kB), ein Chunk; nicht render-blockierend
  (`type="module"`), Code-Splitting wäre eine eigene Aufgabe.

## Nach Deployment (Go-Live-Checkliste — nichts davon ist erledigt)

- [ ] `https://getenfal.de/robots.txt` live öffnen, Inhalt = `public/robots.txt`
- [ ] `https://getenfal.de/sitemap.xml` live öffnen, nur die 4 öffentlichen URLs
- [ ] HTTP 200 für `/`, `/autofinder`, `/autokosten`, `/pricing` (auch Direktaufruf)
- [ ] Canonicals live im Quelltext prüfen (keine app./api.-Domain, kein localhost)
- [ ] noindex der App-Routen live prüfen (`/login`, `/chat`, `/kaufcheck`, `/impressum`, unbekannte URL)
- [ ] nginx im Container: `nginx -t`, Cache-Header der HTML-Antworten
- [ ] Google Search Console: Property einrichten und verifizieren
- [ ] Sitemap in der Search Console einreichen
- [ ] URL-Prüfung für die 4 öffentlichen URLs, gerendertes HTML ansehen
- [ ] WAF/CDN/Bot-Schutz: Googlebot und OAI-SearchBot nicht blockieren
      (OpenAI veröffentlicht IP-Listen: openai.com/searchbot.json)
- [ ] Google-Extended gemäß gewünschter Policy (Allow) live bestätigen
- [ ] Referral-Traffic aus ChatGPT später beobachten
- [ ] Rechtstexte final → noindex für Legal-Seiten aufheben und in die Sitemap
      aufnehmen (Legal-Block)
