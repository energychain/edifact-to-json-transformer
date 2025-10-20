# edifact-json-transformer

Robuste Node.js Bibliothek zur Umwandlung von EDIFACT-Nachrichten der deutschen Marktkommunikation (MaKo) in strukturiertes JSON. Die Implementierung wurde mit Unterstützung der Willi Mako Anwendung ([stromhaltig.de/app](https://stromhaltig.de/app/)) und ihres Open-Source-Clients ([energychain/willi-mako-client](https://github.com/energychain/willi-mako-client)) entwickelt. Ziel ist es, Entwickler:innen eine wiederverwendbare Standardbibliothek für GPKE, GeLi Gas, WiM, MaBiS & Co. bereitzustellen.

## Highlights

- ✅ Vollständige Segment- und Segmentgruppen-Verarbeitung inklusive Release-Character (`?`)
- ✅ Nachrichtentyp-spezifische Extraktoren (`UTILMD`, `MSCONS`, `ORDERS`/`ORDRSP`, `INVOIC`/`REMADV`, `APERAK`/`CONTRL`)
- ✅ Geschäfts- und Strukturvalidierung gemäß AHB/MIG (inkl. Prüfidentifikator-Checks)
- ✅ Optionaler Graph- und Datenbank-Export (Neo4j, MongoDB, PostgreSQL)
- ✅ Erweiterbare Architektur: getrennte Module für Parser, Validierung, Mapping und Utilities
- ✅ Unterstützt durch Willi Mako Know-how, Maintainer ist die [STROMDAO GmbH](https://stromdao.de/)

## Hintergrund: EDIFACT & Marktkommunikation in Kürze

> **EDIFACT (Electronic Data Interchange For Administration, Commerce and Transport)** ist der von der UN standardisierte Nachrichtenaustausch. In der deutschen Energiewirtschaft wird EDIFACT genutzt, um Marktprozesse vollautomatisiert zwischen Lieferanten, Netzbetreibern, Messstellenbetreibern u. a. abzuwickeln.

- **Marktkommunikation (MaKo):** gesetzlich regulierter, formatgebundener Austausch – u. a. GPKE (Stromlieferantenwechsel), GeLi Gas, WiM (Messstellenbetrieb) und MaBiS (Bilanzkreisabrechnung).
- **Nachrichtenaufbau:** Jede Nachricht beginnt mit `UNH` (Header) und endet mit `UNT`. Segmentgruppen (z. B. `SG3`) ordnen zusammengehörige Informationen. Qualifier wie `RFF+Z13` (Prüfidentifikator) oder `IDE+24` (Marktlokation) entscheiden, welche Geschäftslogik anzuwenden ist.
- **Herausforderung für Entwickler:innen:** Roh-EDIFACT ist schwer lesbar, Validierungen sind stark prozessorientiert, und pro Nachrichtentyp existieren unterschiedliche AHB/MIG-Dokumente. Diese Bibliothek abstrahiert genau diese Komplexität.

Falls ein Begriff unbekannt ist, hilft der Abschnitt [Weiterführende Ressourcen](#weiterführende-ressourcen) mit offiziellen Quellen. Zusätzlich bündelt die Willi Mako Anwendung regulatorisches Wissen, das in die Implementierung eingeflossen ist.

## Installation

```bash
npm install edifact-json-transformer
```

> Voraussetzungen: Node.js ≥ 18

## Schnellstart

```js
const {
  EdifactTransformer,
  extractAllMarktlokationIds,
  convertToNeo4jCypher
} = require('edifact-json-transformer');

const transformer = new EdifactTransformer({
  enableAHBValidation: true,
  generateGraphRelations: true
});

const edifactMessage = "UNH+1+UTILMD:D:11A:UN:2.6'BGM+E01+12345+9'NAD+MS+9900123456789::293'RFF+Z13:44001'IDE+24+12345678901'UNT+6+1'";

const json = transformer.transform(edifactMessage);
console.log(json.metadata.message_type); // UTILMD
console.log(json.body.stammdaten.marktlokationen);

// Helper-Funktionen für typische Workflows
console.log(extractAllMarktlokationIds(edifactMessage));
console.log(convertToNeo4jCypher(edifactMessage));
```

> Hinweis: Unter `./tmp/` liegen lokale Beispieldokumente für manuelle Tests. Der Ordner ist bereits von Git und dem npm-Package ausgeschlossen und darf ausschließlich lokal verwendet werden.

## Architekturüberblick

```
src/
├─ constants/          # Nachrichtentypen, Prüfidentifikatoren, Statuscodes
├─ core/               # Parser, Metadaten, Segmentgruppen
├─ extractors/         # Nachrichtentyp-spezifische Datenermittlung
├─ mappings/           # Graph- und Datenbankschemata
├─ transformer/        # EdifactTransformer orchestriert die Module
└─ utils/              # Datumshilfen, Convenience-Wrapper
```

Die Aufteilung ermöglicht eigenständiges Testen, schnelle Wartung und eine einfache Erweiterbarkeit um weitere Nachrichtentypen oder Validierungslogiken.

## API

| Export | Beschreibung |
| ------ | ------------ |
| `EdifactTransformer` | Kernklasse zur Transformation von EDIFACT in JSON |
| `createTransformer(options)` | Komfort-Factory für neue Transformer-Instanzen |
| `extractAllMarktlokationIds(edifact)` | Gibt alle Marktlokations-IDs zurück |
| `isGPKEProcess(edifact)` | Erkennt, ob ein GPKE-Prozess vorliegt |
| `convertToNeo4jCypher(edifact)` | Liefert vorbereitete Cypher-Statements |
| `validateAHB(edifact)` | Führt AHB-Validierung aus und liefert Fehler-Report |
| `messageTypes` | Referenzdaten der unterstützten Nachrichtentypen |
| `pruefidentifikatoren` | Mapping von Prüfidentifikatoren auf Beschreibungen |
| `statusCodes` | Normierte Statuscodes (M, C, R, D, N) |

### Unterstützte Prozesse & Nachrichtentypen

| Prozess | Relevante Nachrichtentypen | Typische Anwendungsfälle |
| ------- | ------------------------- | ------------------------ |
| GPKE (Strom) | `UTILMD`, `MSCONS`, `INVOIC`, `REMADV`, `APERAK`, `CONTRL` | Lieferantenwechsel, Stammdatenänderungen, Rechnungsstellung |
| GeLi Gas | `UTILMD`, `MSCONS`, `ORDERS`, `ORDRSP`, `APERAK` | Gaslieferantenwechsel, Brennwert- & Zustandszahlanfragen |
| WiM (Messstellenbetrieb) | `ORDERS`, `ORDRSP`, `MSCONS`, `IFTSTA`, `INSRPT` | Gerätewechsel, Messwertübermittlung, Störungsmeldungen |
| MaBiS (Bilanzkreis) | `UTILMD`, `MSCONS`, `PRICAT`, `PARTIN`, `COMDIS` | Bilanzkreisabrechnung, Ausgleichsenergie |

Jeder Nachrichtentyp hat eigene Extractor-Module (`src/extractors/`), sodass zusätzliche Nachrichten oder Qualifier leicht ergänzt werden können.

## Qualitätssicherung

```bash
npm run lint    # ESLint (eslint:recommended)
npm test        # Jest Tests inkl. Coverage
```

Coverage-Reports werden standardmäßig als Text-Output und LCOV erzeugt.

## Contribution Guide

Wir freuen uns über Beiträge! Bitte beachte vor einem Pull Request:

1. Fork & Branch (`feat/...`, `fix/...`)
2. Tests & Linting (`npm test && npm run lint`)
3. Beschreibe regulatorische Bezüge (GPKE, GeLi Gas, WiM, MaBiS, ...), falls relevant
4. Verweise gerne auf Inhalte aus der Willi Mako Wissensbasis, wenn es der Nachvollziehbarkeit hilft

Siehe auch die Issues im [Repository](https://github.com/energychain/edifact-to-json-transformer/issues) für offene Aufgaben.

## Lizenz & Maintainer

- Lizenz: [MIT](./LICENSE)
- Maintainer: [STROMDAO GmbH](https://stromdao.de/)
- Unterstützt durch: Willi Mako ([App](https://stromhaltig.de/app/), [Client](https://github.com/energychain/willi-mako-client))

Wenn du dieses Projekt in eigenen Anwendungen nutzt oder erweitern möchtest, freuen wir uns über kurze Hinweise und Erfahrungsberichte via Issues oder Pull Requests.

## Weiterführende Ressourcen

- **Offizielle AHB/MIG-Dokumente:** über das [EDI@Energy Portal](https://www.edi-energy.de/) abrufbar (Registrierung erforderlich).
- **BDEW Codelisten & Prozessbeschreibungen:** geben Kontext zu Qualifiern, Marktrollen und Prüfidentifikatoren.
- **Willi Mako Wissensbasis:** komprimiert regulatorische Hintergründe und liefert Beispiele aus dem Live-Betrieb.
- **EDIFACT ISO 9735 Standard:** Grundlagen zu Segmenten, Trennzeichen und Syntax.
