# Datenqualitäts-Report — Auto-KI Fahrzeugdatenbank
*Erstellt: 2026-06-17 | Nur lesend, keine Daten verändert*

---

## 1. Gesamtzahlen

| Kennzahl | Wert |
|---|---|
| Baureihen | **421** |
| Marken | **13** |
| Motorvarianten | **3.243** |
| Schwachstellen (Baureihe) | 1.464 |
| Schwachstellen (Motor) | 2.753 |
| Rückrufe | 759 |
| Ausstattungslinien | 1.698 |
| Kritische Wartungspunkte | 1.527 |
| Quellen-Einträge | **0** ← gesamte Tabelle leer |

---

## 2. Vollständigkeit — Baureihen

### 2.1 Fehlende Felder (Baureihe-Ebene)

| Feld | Fehlend | Anteil | Anmerkung |
|---|---|---|---|
| `kaufberatung` | **327 / 421** | 78 % | Größte Lücke — fast nur ältere Generationen betroffen |
| `adac_pannenkennziffer` | 409 / 421 | 97 % | Fast komplett leer |
| `dekra_urteil` | 407 / 421 | 97 % | Fast komplett leer |
| `tuev_maengelquote` | 405 / 421 | 96 % | Fast komplett leer |
| `euro_ncap_sterne` | 139 / 421 | 33 % | Vor allem ältere Baureihen (pre-2000) ohne NCAP |
| `bauzeitraum_bis` | 128 / 421 | 30 % | Aktuell produzierte Modelle — hier vertretbar (`NULL` = läuft noch) |
| `erkennung_generation` | 1 / 421 | — | Nur `vw-golf-8` |
| `bauzeitraum_von` | 1 / 421 | — | Nur `vw-golf-8` |
| `karosserie` | 1 / 421 | — | Nur `vw-golf-8` |
| `segment` | 1 / 421 | — | Nur `vw-golf-8` |

> ⚠️ **`vw-golf-8`** ist in 5 Pflichtfeldern leer — Sonderfall, der sofort befüllt werden sollte.

### 2.2 Baureihen ohne verknüpfte Daten

| Kategorie | Fehlend | Anteil |
|---|---|---|
| Ohne Schwachstellen (Baureihe) | **63 / 421** | 15 % |
| Ohne Rückrufe | **142 / 421** | 34 % |
| Ohne Ausstattungslinien | **6 / 421** | 1 % |
| Ohne Quellen | **421 / 421** | 100 % — Tabelle vollständig leer |
| Ohne Motorvarianten | **0 / 421** | ✓ vollständig |

**Baureihen ohne Ausstattungslinien (6):**
- `vw-golf-8`
- `mercedes-benz-s-klasse-w116`
- `opel-grandland-b`
- `toyota-land-cruiser-j40`
- `toyota-hilux-dritte-generation`
- `toyota-hilux-vierte-generation`

---

## 3. Vollständigkeit — Motorvarianten

| Feld | Fehlend | Anteil |
|---|---|---|
| `verbrauch_wltp` | **2.231 / 3.243** | 69 % — systemweit größte Lücke |
| `hubraum_ccm` | 130 / 3.243 | 4 % |
| `drehmoment_nm` | 30 / 3.243 | 0,9 % |
| `leistung_ps` | 2 / 3.243 | 0,1 % |
| `leistung_kw` | 2 / 3.243 | 0,1 % |
| `kraftstoff` | 0 / 3.243 | ✓ vollständig |

**Motoren ohne PS/kW (2):**
- `bmw-5er-f10-530e` (BMW 5er)
- `opel-grandland-b-electric` (Opel Grandland)

**Baureihen mit den meisten Motoren ohne Drehmoment:**

| Baureihe | Marke | Motoren ohne NM |
|---|---|---|
| `toyota-hilux-erste-generation` | Toyota Hilux | 8 |
| `toyota-hilux-dritte-generation` | Toyota Hilux | 7 |
| `toyota-corolla-x` | Toyota Corolla | 3 |
| `ford-kuga-mk2` | Ford Kuga | 2 |
| `cupra-leon-erste-generation` | Cupra León | 2 |
| `toyota-hilux-vierte-generation` | Toyota Hilux | 2 |

---

## 4. Auffälligkeiten & Fehler

| Prüfung | Ergebnis |
|---|---|
| PS < 30 oder > 2.000 | ✓ Keine Ausreißer |
| Baujahre außerhalb 1950–2026 | ✓ Keine Ausreißer |
| Baureihen ohne Marke | ✓ Keine |
| Duplikate (Marke + Modell + Generation) | ✓ Keine |
| Doppelte Baureihen-IDs | ✓ Keine |
| Doppelte Motorvarianten-IDs | ✓ Keine |

> ✅ Strukturell sauber — keine ungültigen Werte oder Dubletten gefunden.

### Besondere Auffälligkeit: Quellen-Tabelle komplett leer
Alle 421 Baureihen haben **null Quelleneinträge**. Die Tabelle existiert, wird aber nie befüllt. Falls Quellen-Nachweise für den Kauf-/Verkaufscheck relevant sind, müsste dies nachgepflegt werden.

---

## 5. WLTP-Verbrauch fehlt — Pro Marke

Systemweit fehlen 69 % aller WLTP-Werte. Besonders betroffen sind ältere Baujahre (WLTP galt ab 2018).

| Marke | Fehlend | Gesamt | Anteil |
|---|---|---|---|
| Mercedes-AMG | 8 | 8 | **100 %** |
| Ford | 239 | 274 | **87 %** |
| Opel | 208 | 247 | **84 %** |
| Toyota | 139 | 180 | **77 %** |
| Seat | 109 | 142 | **77 %** |
| Volkswagen | 336 | 455 | **74 %** |
| Audi | 335 | 467 | **72 %** |
| Skoda | 95 | 136 | **70 %** |
| BMW | 309 | 515 | **60 %** |
| Hyundai | 78 | 130 | **60 %** |
| Mercedes-Benz | 327 | 565 | **58 %** |
| Kia | 48 | 108 | **44 %** |

---

## 6. Euro-NCAP fehlt — Pro Marke

| Marke | Fehlend | Gesamt | Anteil |
|---|---|---|---|
| Mercedes-AMG | 2 | 2 | **100 %** |
| Toyota | 24 | 48 | **50 %** |
| Audi | 29 | 62 | **47 %** |
| BMW | 29 | 72 | **40 %** |
| Ford | 11 | 31 | **35 %** |
| Mercedes-Benz | 21 | 59 | **36 %** |
| Volkswagen | 13 | 47 | **28 %** |
| Opel | 4 | 26 | **15 %** |
| Seat | 2 | 12 | **17 %** |
| Kia | 2 | 23 | **9 %** |
| Hyundai | 1 | 21 | **5 %** |
| Skoda | 1 | 15 | **7 %** |

---

## 7. Übersicht Pro Marke

| Marke | Baureihen | Motorvarianten | fehl. Kaufberatung | fehl. Schwachstellen | fehl. Rückrufe |
|---|---|---|---|---|---|
| Audi | 62 | 467 | **58 (94 %)** | 13 (21 %) | 16 (26 %) |
| BMW | 72 | 515 | 30 (42 %) | 14 (19 %) | 24 (33 %) |
| Cupra | 3 | 16 | **3 (100 %)** | 2 (67 %) | 1 (33 %) |
| Ford | 31 | 274 | 27 (87 %) | 1 (3 %) | 10 (32 %) |
| Hyundai | 21 | 130 | 19 (90 %) | 3 (14 %) | 7 (33 %) |
| Kia | 23 | 108 | 16 (70 %) | 4 (17 %) | 11 (48 %) |
| Mercedes-AMG | 2 | 8 | **2 (100 %)** | 0 ✓ | 0 ✓ |
| Mercedes-Benz | 59 | 565 | 43 (73 %) | 10 (17 %) | 17 (29 %) |
| Opel | 26 | 247 | **26 (100 %)** | 3 (12 %) | 4 (15 %) |
| Seat | 12 | 142 | 10 (83 %) | 2 (17 %) | 5 (42 %) |
| Skoda | 15 | 136 | 13 (87 %) | 1 (7 %) | 4 (27 %) |
| Toyota | 48 | 180 | 35 (73 %) | 5 (10 %) | **28 (58 %)** |
| Volkswagen | 47 | 455 | **45 (96 %)** | 5 (11 %) | 15 (32 %) |

---

## 8. Priorisierte Handlungsempfehlungen

### 🔴 Kritisch (großer Impact, viele Baureihen)
1. **Kaufberatung befüllen** — 327/421 (78 %) leer; VW (96 %), Audi (94 %), Opel (100 %), Cupra (100 %), Hyundai (90 %) besonders betroffen
2. **`vw-golf-8` komplett nachpflegen** — fehlt in 5 Pflichtfeldern gleichzeitig
3. **WLTP-Verbrauch ergänzen** — 69 % leer; Ford, Opel, Mercedes-AMG am schlechtesten

### 🟡 Mittlere Priorität
4. **Rückrufe Toyota** — 28/48 Baureihen ohne Rückruf-Einträge (58 %), ungewöhnlich hoch
5. **Schwachstellen** — 63 Baureihen ohne einen einzigen Eintrag (15 %), davon viele neuere Generationen
6. **Euro-NCAP** — Mercedes-AMG (100 % leer), Toyota (50 %), Audi (47 %) größte Lücken
7. **Drehmoment** — 30 Motoren ohne NM, hauptsächlich Toyota Hilux (17 Einträge)

### 🟢 Niedrige Priorität / Strukturfragen
8. **Quellen-Tabelle** — 421/421 leer; klären ob diese Tabelle aktiv genutzt werden soll
9. **ADAC / TÜV / Dekra** — 96–97 % leer; vermutlich bewusst nicht befüllt (Rechtslage/Lizenz)
10. **PS/kW** für `bmw-5er-f10-530e` und `opel-grandland-b-electric` nachpflegen
11. **Ausstattungslinien** für 6 Baureihen ergänzen (inkl. `vw-golf-8`)
