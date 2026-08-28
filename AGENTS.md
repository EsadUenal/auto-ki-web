# VIRA Working Rules — auto-ki-web (Frontend)

Diese Datei gilt für alle Agenten (Codex, Claude Code, andere), die in diesem
Repository arbeiten. Sie beschreibt verbindliche Regeln, keine Empfehlungen.

## Git Safety
- Niemals direkt auf `master` entwickeln.
- Vor jeder Änderung `git fetch` und `git status` prüfen.
- Immer auf einem Feature-Branch arbeiten.
- Kein Force Push.
- Kein Rebase, kein Squash ohne ausdrückliche Anweisung des Nutzers.
- Niemals automatisch nach `master` mergen.
- Working Tree respektieren; bestehende Nutzeränderungen nicht überschreiben.
- Keine Branches löschen.

## Scope
- Nur die angeforderte Aufgabe bearbeiten.
- Kein ungefragtes Refactoring, kein Scope Creep, keine Nebenfeatures.
- Keine Abhängigkeiten hinzufügen, ohne dass der Nutzer es anordnet.

## Data Safety
- Das Frontend erfindet keine Fahrzeugdaten und keine Preise. Alle fachlichen
  Aussagen stammen aus der Backend-Antwort.
- Fehlende Backend-Daten werden als fehlend dargestellt — keine Platzhalterwerte,
  keine geschätzten Preise, keine erfundenen Quellen.
- Trust-Angaben des Backends (`verified` / `partially_verified` / `unverified` /
  `rejected`) dürfen nicht stärker dargestellt werden, als sie sind.
  Als `rejected` gesperrte Fakten niemals anzeigen.
- Quellenangaben nur zeigen, wenn das Backend sie liefert (`SourceBadge`,
  `EvidenceWhy`).

## Secrets
- Niemals API-Keys ausgeben oder loggen.
- `.env.local` ist gitignored und bleibt es. Keine `.env`-Inhalte loggen.
- `VITE_*`-Variablen landen im Client-Bundle — dort gehören keine echten
  Geheimnisse hinein.

## Testing
- Es gibt derzeit keine automatisierte Testsuite und keinen Lint-Task.
  Prüfung erfolgt über `npm run build` (führt `tsc` aus) und manuelles Testen
  gegen ein laufendes Backend.
- Typfehler nicht durch `any` oder `@ts-ignore` stillstellen, nur damit der
  Build durchläuft.
- Externe Ausfälle (Backend nicht erreichbar, LLM-Timeout) getrennt von echten
  Frontend-Fehlern berichten.

## Database
- Dieses Repo hat keine Datenbank. Datenänderungen gehören ins Backend-Repo
  `auto-ki-backend` und unterliegen dort den Regeln aus dessen `AGENTS.md`.

## Reporting
Nach größeren Aufgaben berichten:
- was geändert wurde
- Build/Tests
- P0
- P1
- Git-Stand (Branch, Commit)
- genau ein empfohlener nächster Schritt

## Setup & Commands

```powershell
npm install        # Abhängigkeiten
npm run dev        # Dev-Server, Port 3000
npm run build      # tsc && vite build
npm run preview    # gebautes Bundle lokal servieren
```

Kein `test`- und kein `lint`-Script in `package.json`. `npm run build` ist die
Typprüfung.

Für UI-Vorschauen wird Microsoft Edge verwendet; die App läuft auf
`http://localhost:3000`, das Backend auf `http://localhost:8000`.

## Architektur — wichtige Dateien

| Bereich | Pfad |
|---|---|
| App Entry | `src/main.tsx`, `index.html` |
| Routing / Shell | `src/App.tsx`, `src/components/Sidebar.tsx` |
| KaufCheck UI | `src/components/KaufCheckView.tsx`, `src/components/KaufCheckDetails.tsx` |
| Ergebnisdarstellung | `src/components/ResultSummary.tsx`, `src/components/KeyFindings.tsx`, `src/components/EvidenceWhy.tsx`, `src/components/SourceBadge.tsx` |
| VerkaufsCheck / Inserat | `src/components/VerkaufsCheckView.tsx`, `src/components/InseratPanel.tsx` |
| Dealer | `src/components/DealerView.tsx`, `src/components/DealerVehicleView.tsx`, `src/components/dealerUi.tsx` |
| Weitere Views | `EntdeckenView`, `ErsatzteileView`, `ChatView`, `PricingView`, `SettingsView`, `HelpView`, `EbookView`, `PosterView`, `LegalView` in `src/components/` |
| API Client | `src/api/client.ts` |
| Auth / State | `src/context/AuthContext.tsx`, `src/components/PrivateRoute.tsx`, `src/components/LoginView.tsx` |
| Typen | `src/types.ts` |
| Styling | `src/index.css`, `tailwind.config.js`, `postcss.config.js` |
| Rechtstexte | `src/legal/agb.ts`, `src/legal/datenschutz.ts`, `src/legal/widerruf.ts` |
| Build-Konfig | `vite.config.ts`, `tsconfig.json`, `Dockerfile`, `nginx.conf`, `railway.json` |

## Environment

Erwartet wird `.env.local` im Repo-Root (gitignored), Vorlage
`.env.local.example`. Variablennamen: `VITE_API_BASE_URL`, `VITE_API_KEY`.
Werte niemals ausgeben.

## Current Project State

Stand: 2026-08-28. Frontend-`master` = `origin/master` = **`494e698`**.

- KaufCheck-Frontend ist neu strukturiert; vier Prüfbereiche werden dargestellt.
- Zugehöriges Backend: `auto-ki-backend`, `master` = `f7e4bef`,
  Produktivmodell Gemini 3.7 Flash.
- Marktpreis: Fehlen Live-Daten, liefert das Backend kein Preisurteil — das
  Frontend darf dann keinen Preis anzeigen.
- Backend führt Fact-Level Trust (`verified` / `partially_verified` /
  `unverified` / `rejected`). **Das Frontend wertet `trust`,
  `fakt_verifikation` und die Rejected-Sperre bisher NICHT aus** — das ist eine
  bekannte offene Lücke, kein Versehen im Einzelfall.
- Offener Branch: `kaufcheck-ui-final`.

Die nächste Aufgabe kommt immer ausdrücklich vom Nutzer.
