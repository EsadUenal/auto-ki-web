# ENFAL — Manuelle Testliste: öffentliche Seiten + E-Books

Stand: 2026-09-13 (Block „E-Books + öffentliche Seiten final prüfen").
Jeder Schritt: **Aktion → erwartetes Ergebnis**. Browser: Microsoft Edge.

## Vorbereitung

1. Backend starten (Repo `auto-ki-backend`): `python -m uvicorn app.main:app --port 8000`
   → Terminal zeigt „Application startup complete".
2. Frontend starten (Repo `auto-ki-web`): `npm run dev`
   → Terminal zeigt `http://localhost:3000`.
3. Edge öffnen, abgemeldet (privates Fenster: Strg+Umschalt+N).
4. Entwicklertools öffnen (F12) → Reiter „Konsole" offen lassen.
   Erwartung während aller Tests: keine roten Meldungen außer
   `401 (Unauthorized)` auf `/api/v1/auth/me` (normal für Abgemeldete).

## A) Landingpage

1. Öffne `http://localhost:3000/`
   → oben links orangenes Logo + „ENFAL"; kurzer dunkler Splash, danach die Seite.
2. Hero ansehen
   → Überschrift „Finde das Auto, das wirklich zu dir passt.", darunter Buttons
   „Kostenlos starten" (orange) und „AutoFinder ausprobieren".
3. Unterhalb der Buttons
   → Text „1 Suche kostenlos testen, ganz ohne Konto."
4. Browserfenster ganz nach rechts/links wischen (Touchpad) bzw. unten auf Scrollbalken achten
   → kein horizontaler Scrollbalken.
5. Langsam bis zum Ende scrollen
   → Abschnitte in dieser Reihenfolge: „Drei Werkzeuge, die sofort nutzbar sind" →
   Story (Finden · Verstehen · Prüfen · Entscheiden) → „Und wenn du verkaufen willst?" →
   ENFAL Plus → „Drei Dinge, die den Unterschied machen" → Preise → Häufige Fragen → dunkler Abschluss → Footer.
6. In der Story beim Schritt „Prüfen" auf den Preis achten
   → „Für 5,99 € einmalig." und Button „KaufCheck starten".
7. Abschnitt „Und wenn du verkaufen willst?"
   → „8,99 € einmalig pro Check", 4 Schritte, Schritt 4 „inklusive Prüfung deines Inseratstexts".
8. Abschnitt ENFAL Plus
   → „16,99 € pro Monat"; Zahlen zählen hoch auf 5 KaufChecks, 1 VerkaufsCheck,
   50 AutoFinder-Suchen, 100 Nachrichten; „Autokosten unbegrenzt".
9. Abschnitt „Drei Dinge …", Punkt 03
   → Text endet mit „wandert ohne Abtippen in den KaufCheck." und Kasten „AutoFinder → KaufCheck"
   (NICHT mehr „Kostenrechnung" / „AutoFinder → Autokosten → KaufCheck").
10. Abschnitt Preise
    → 4 Karten: ENFAL Free 0 €, KaufCheck 5,99 €, VerkaufsCheck 8,99 €, ENFAL Plus 16,99 € mit Badge „Bestes Verhältnis".
11. FAQ: auf „Ist ENFAL kostenlos?" klicken
    → Antwort klappt auf; erneut klicken → klappt zu. Pfeil wechselt zu Minus und zurück.
12. Alle 6 FAQ-Fragen nacheinander öffnen
    → jede zeigt eine Antwort, keine überlappt die nächste Frage.
13. Footer ansehen
    → Spalten Produkt / Konto / Rechtliches, „© 2026 ENFAL · Alle Preise inkl. MwSt.",
    „ENFAL ersetzt keine technische Fahrzeugprüfung vor Ort."
14. Irgendwo auf der Seite nach „VIRA" suchen (Strg+F „vira")
    → 0 Treffer.

## B) Navigation

1. Auf `/` im Header auf „Preise" klicken
   → Seite scrollt zum Preisabschnitt, URL bleibt `/` (bzw. `/#preise`).
2. Header „FAQ" → scrollt zu „Häufige Fragen". Header „Produkte" → „Drei Werkzeuge …".
3. Header „So funktioniert's" → scrollt zur Story (Finden …).
4. Header „Anmelden" → Seite `/login`, Reiter „Anmelden" aktiv.
5. Browser-Zurück (Alt+←) → wieder Landingpage.
6. Header „Kostenlos starten" → `/login?modus=register`, Reiter „Registrieren" aktiv.
7. Footer „AutoFinder" → `/autofinder` mit Überschrift „Welches Auto passt zu dir?".
8. Links in der Seitenleiste auf das ENFAL-Logo klicken
   → zurück auf der Landingpage `/` (NEU).
9. Footer „Autokosten-Rechner" → `/autokosten`. Zurück. Footer „Preise" → `/pricing`.
10. Auf `/pricing` in der Seitenleiste: Einträge „KaufCheck" und „VerkaufsCheck"
    → Schreibweise OHNE Bindestrich (NEU). Unten in der Seitenleiste „Anmelden" (NEU).
11. Seitenleiste „Anmelden" → `/login`.
12. Footer der Landing „Hilfe" → `/login` (Hilfe ist nur mit Konto erreichbar — bekannter Befund).
13. Footer „Impressum" → Seite „Impressum" mit Hinweis „Text in Vorbereitung".
14. Footer „Kontakt / Support" → Mailprogramm öffnet sich mit Empfänger `kontakt.autotaskai@gmail.com`
    (bekannter Befund: alte Adresse, bitte selbst festlegen).
15. Adresse `http://localhost:3000/gibt-es-nicht` direkt eingeben
    → Seite „Fehler 404 · Diese Seite gibt es nicht." mit Button „Zur Startseite" (NEU);
    Button führt zu `/`.
16. Auf `/autofinder` die Taste F5 drücken → Seite lädt neu, keine Fehlerseite.

## C) AutoFinder (abgemeldet)

1. Öffne `http://localhost:3000/autofinder`
   → Überschrift „Welches Auto passt zu dir?", Text „… Kostenlos, ohne Konto."
2. Budget von `12000` bis `22000`, Karosserie „Kompakt", Kraftstoff „Benzin" wählen
   → gewählte Chips sind hervorgehoben.
3. „Autos für mich finden" klicken
   → nach wenigen Sekunden „Top 5 für dich", nur Kompaktwagen mit Benzin
   (z. B. Opel Astra, Hyundai i20, Seat Leon, BMW 1er, Opel Corsa).
4. Bei einem Treffer „Details & Suchhilfe" klicken → Details klappen auf.
5. Bei einem Treffer „Mit KaufCheck prüfen" klicken
   → Weiterleitung auf `/login` (Anmelden). NICHT einloggen, sondern zurück.
6. Erneut „Autos für mich finden" klicken
   → Hinweis „Du hast deine kostenlose AutoFinder-Demo genutzt." mit Button „Kostenlos anmelden".
7. Achtung Befund: Wird die Suche ganz ohne Eingaben gestartet, verbraucht das die Demo ebenfalls.

## D) Autokosten

1. Öffne `http://localhost:3000/autokosten`
   → Überschrift „Was kostet dein Auto wirklich im Monat?".
2. Ohne Eingaben „Kosten berechnen"
   → rote Hinweise „Fahrleistung bitte als Zahl eingeben.", „Verbrauch …", „Benzinpreis …"
   und oben „Bitte prüfe die markierten Felder (3)."
3. „Mit Beispielwerten füllen"
   → Felder gefüllt (20000, 15000, 6,5, 1,75 …); Ergebnis „Gesamt pro Monat 471,35 €".
4. Fahrleistung auf `-500` ändern, berechnen → „Fahrleistung muss größer als 0 sein."
5. Verbrauch auf `abc` ändern, berechnen → „Verbrauch bitte als Zahl eingeben."
6. „Zurücksetzen" → alle Felder leer, Ergebnis verschwindet.
7. Kraftstoff „Elektro" wählen → Verbrauchsfeld heißt „Verbrauch (kWh/100 km)", Platzhalter „17".
8. Befund prüfen: erst Beispielwerte (Benzin), dann „Elektro" wählen
   → der Wert 6,5 bleibt stehen (jetzt als kWh) — muss man selbst anpassen.

## E) Pricing

1. Öffne `http://localhost:3000/pricing`
   → Überschrift „Einzeln kaufen oder monatlich mehr bekommen."
2. Karten prüfen → ENFAL Free 0 €, KaufCheck 5,99 € einmalig pro Check,
   VerkaufsCheck 8,99 € einmalig pro Check, ENFAL Plus 16,99 € pro Monat.
3. Nirgends „Light", „Pro", „Max", „VIRA Plus" → 0 Treffer bei Strg+F.
4. Abgemeldet „KaufCheck starten" → `/login`.
5. Nach Anmeldung (siehe F) wieder `/pricing` → „ENFAL Plus starten"
   → Weiterleitung zu Stripe (Testmodus) mit „ENFAL Plus" 16,99 €. Auf Stripe „Zurück" → wieder auf ENFAL.

## F) Login / Redirects

1. Abgemeldet `http://localhost:3000/kaufcheck` öffnen → Weiterleitung `/login`.
2. Mit deinem Testkonto anmelden → du landest auf `/kaufcheck` (Rücksprung), nicht im Chat.
3. Abmelden (Seitenleiste unten → Konto → Abmelden) → `/login`.
4. Abgemeldet `/verkaufscheck` → `/login` → anmelden → zurück auf `/verkaufscheck`.
5. Abgemeldet `/ebooks` → `/login` → anmelden → zurück auf `/ebooks`.
6. Abgemeldet `/chat` → `/login`; `/settings` → `/login`.
7. Angemeldet `http://localhost:3000/` öffnen → du landest im Chat (`/chat`), nicht auf der Landing.
8. Angemeldet `/login` öffnen → keine Endlosschleife, Login-Seite oder Weiterleitung in die App.

## G) E-Books (angemeldet)

1. Öffne `/ebooks` → Überschrift „Wissen, das sich auszahlt.", Reiter „Bibliothek" / „Meine E-Books".
2. Bibliothek → 3 Karten: „Kauf kein Risiko" 17,99 €, „Dein erstes Auto" 14,99 €,
   „Elektro oder Verbrenner?" mit Badge „Bald erhältlich" (nicht anklickbar).
3. Cover prüfen → die zwei echten Cover laden (enthalten noch „VIRA.AI | GETVIRA.DE" — Canva-Punkt).
4. „Kauf kein Risiko" anklicken → Fenster mit Beschreibung, Hinweis
   „Digitales Produkt: Nach dem Kauf steht das PDF unter „Meine E-Books“ zum Download bereit." (NEU),
   darunter „inkl. MwSt. · sofort nach Kauf als PDF-Download" (NEU). Kein Wort von E-Mail.
5. „Jetzt kaufen" ist ausgegraut, bis BEIDE Häkchen gesetzt sind.
6. Beide Häkchen setzen, „Jetzt kaufen" → Stripe-Testseite; Testkarte `4242 4242 4242 4242`,
   beliebiges Datum in der Zukunft, beliebige Prüfziffer.
7. Nach Zahlung zurück auf ENFAL → grüner Hinweis
   „Zahlung erfolgreich! Dein E-Book steht unter „Meine E-Books“ als PDF-Download bereit." (NEU), Reiter „Meine E-Books".
8. In „Meine E-Books" → Eintrag mit Status „Bezahlt" und Button „PDF laden"; KEIN „per E-Mail zugeschickt" mehr.
9. „PDF laden" → Datei `ENFAL_Kauf_kein_Risiko.pdf` wird gespeichert, öffnet sich, 36 Seiten.
10. In der Bibliothek erneut auf das gekaufte Buch klicken → Download startet direkt (kein Kauffenster).
11. Backend stoppen (Strg+C im Backend-Terminal), `/ebooks` neu laden
    → gelber Hinweis „Die E-Books konnten gerade nicht geladen werden. …" (NEU). Backend wieder starten.

## H) Mobile (Edge: F12 → Gerätesymbol, Breite 390, dann 768, dann 1024)

1. `/` bei 390 px → Logo links, Menü-Symbol (☰) rechts, kein horizontaler Scrollbalken.
2. ☰ antippen → Menü mit Produkte, So funktioniert's, Preise, FAQ, Anmelden, Kostenlos starten;
   Seite dahinter scrollt nicht.
3. Im Menü „FAQ" → Menü schließt, Seite springt zu „Häufige Fragen".
4. Preiskarten bei 390 px → untereinander, keine abgeschnittenen Preise.
5. `/pricing` bei 390 px → oben Leiste mit ☰ und „ENFAL"; ☰ → Seitenleiste fährt von links ein,
   dunkler Hintergrund; Tippen auf den dunklen Bereich schließt sie.
6. Seitenleiste „Autokosten" → Seite wechselt, Seitenleiste schließt automatisch.
7. `/autokosten` bei 390 px → alle Felder volle Breite, Buttons vollständig lesbar.
8. `/autofinder` bei 390 px → Chips umbrechen sauber, „Autos für mich finden" voll sichtbar.
9. Dasselbe bei 768 px und 1024 px → keine Überlappungen, keine leeren Riesenflächen.

## I) Fehlerfälle

1. Backend stoppen, `/` neu laden → Landingpage vollständig sichtbar (nicht weiß).
2. `/autofinder` → Suche starten → Hinweis „Der ENFAL-Server ist gerade nicht erreichbar. …".
3. Backend noch aus: `/login` → E-Mail + beliebiges Passwort → „Anmelden"
   → Meldung „Der ENFAL-Server ist gerade nicht erreichbar. …" (NEU; vorher stand dort „Failed to fetch").
   Backend wieder an: falsches Passwort → verständliche Meldung, kein technischer Text.
4. Backend wieder starten, AutoFinder zweimal abgemeldet suchen → Demo-Hinweis (429) statt Fehler.
5. In keiner Meldung erscheinen „Traceback", „Error", JSON-Klammern oder Pfade.

## Bekannte, bewusst offene Punkte (nicht als Fehler melden)

- Canva: VIRA/getvira/Auto-KI in E-Book-Covern und PDFs (Liste im Abschlussbericht).
- Support-Adresse `kontakt.autotaskai@gmail.com` (Footer, Datenschutz, Widerruf).
- Legal: Impressum Platzhalter; Datenschutz/AGB/Widerruf Entwürfe; „inkl. MwSt." klären.
- „Hilfe" nur mit Konto erreichbar.
