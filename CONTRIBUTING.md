# Beitrag leisten

Danke für dein Interesse an `edifact-json-transformer`! Diese Richtlinien helfen dabei, die Qualität hoch zu halten und sicherzustellen, dass regulatorische Anforderungen der Marktkommunikation berücksichtigt bleiben.

## Ablauf

1. **Issue aufmachen** – Beschreibe Idee oder Bug, inklusive relevanter MaKo-Prozesse (GPKE, GeLi Gas, WiM, MaBiS, ...).
2. **Branch erstellen** – Nutze sprechende Branch-Namen wie `feat/wim-insrpt-support` oder `fix/aperak-validation`.
3. **Implementieren** – Bitte halte dich an die modulare Struktur (`src/constants`, `src/core`, `src/extractors`, `src/validators`, ...). Nutze Daten oder Wissen aus der [Willi Mako Plattform](https://stromhaltig.de/app/) und dem [Open-Source-Client](https://github.com/energychain/willi-mako-client) wo sinnvoll.
4. **Tests & Linting** – `npm test` und `npm run lint` müssen erfolgreich sein.
5. **Pull Request** – Beschreibe Anpassungen, referenziere relevante regulatorische Dokumente (AHB/MIG) und hänge Beispielnachrichten an, sofern möglich.

## Stil & Qualität

- **Code-Style** – ESLint (eslint:recommended) ist konfiguriert.
- **Tests** – Nutze Jest für Unit- und Integrationstests. Neue Funktionen sollten mindestens einen Happy-Path und einen Fehlerfall abdecken.
- **Dokumentation** – Ergänze README oder Inline-Kommentare für komplexe Validierungslogik.
- **Kompatibilität** – Bewahre die Abwärtskompatibilität der öffentlichen API. Major-Versionen sollten breaking changes ankündigen.

## Maintainer

Das Projekt wird von der [STROMDAO GmbH](https://stromdao.de/) gepflegt. Bei Fragen oder größerem Koordinationsbedarf freuen wir uns über eine kurze Nachricht.
