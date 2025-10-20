# Troubleshooting Guide

Häufige Probleme und Lösungen bei der Arbeit mit `edifact-json-transformer`.

## Parsing-Fehler

### Problem: "Segment UNH not found"
**Symptome:**
```javascript
Error: Segment UNH not found
```

**Ursachen:**
- EDIFACT-Nachricht beginnt nicht mit `UNH`
- Falsche Trennzeichen (muss `'` sein, nicht `;` oder andere)
- UNA-Header fehlt oder ist fehlerhaft

**Lösungen:**
```javascript
// 1. Prüfen Sie die ersten Zeichen
console.log(edifact.substring(0, 50));

// 2. Trimmen Sie Whitespace
const cleanEdifact = edifact.trim();

// 3. Prüfen Sie auf UNA-Header
if (edifact.startsWith('UNA')) {
  // UNA definiert custom Trennzeichen - sollte automatisch erkannt werden
  console.log('UNA Header gefunden:', edifact.substring(0, 9));
}

// 4. Validieren Sie die Struktur manuell
const hasUNH = edifact.includes('UNH+');
const hasUNT = edifact.includes('UNT+');
if (!hasUNH || !hasUNT) {
  console.error('Ungültige Nachrichtenstruktur');
}
```

### Problem: "Invalid segment format"
**Symptome:**
```javascript
Error: Invalid segment format at position 123
```

**Ursachen:**
- Release-Character (`?`) nicht korrekt verwendet
- Fehlende oder doppelte Trennzeichen
- Sonderzeichen in Datenelementen

**Lösungen:**
```javascript
// Debugging: Segment-für-Segment analysieren
const segments = edifact.split("'");
segments.forEach((seg, idx) => {
  if (seg && !seg.match(/^[A-Z]{3}\+/)) {
    console.log(`Verdächtiges Segment #${idx}:`, seg);
  }
});

// Release-Character korrekt verwenden
const correctUsage = "FTX+AAA+++Text mit ' Apostroph: Text mit ?' Apostroph";

// Falsch: Apostroph ohne Release-Character
const incorrectUsage = "FTX+AAA+++Text mit ' Apostroph"; // FEHLER!
```

### Problem: "Message type not recognized"
**Symptome:**
- `metadata.message_type` ist `undefined` oder `"Unbekannt"`
- `category: 'unknown'`

**Ursachen:**
- UNH-Segment enthält unbekannten Nachrichtentyp
- Nachrichtentyp nicht in `messageTypes.js` definiert

**Lösungen:**
```javascript
const { messageTypes } = require('edifact-json-transformer');

// 1. Prüfen Sie unterstützte Typen
console.log('Unterstützte Typen:', Object.keys(messageTypes));

// 2. UNH-Segment manuell extrahieren
const unhMatch = edifact.match(/UNH\+[^+]+\+([^:]+):/);
if (unhMatch) {
  const msgType = unhMatch[1];
  console.log('Erkannter Typ:', msgType);
  
  if (!messageTypes[msgType]) {
    console.warn(`Typ ${msgType} nicht unterstützt - nutze generic extractor`);
  }
}

// 3. Fallback: Generic Extractor nutzen
const transformer = new EdifactTransformer();
const result = transformer.transform(edifact);
// result.body.generic_data enthält rohe Segmente
```

## Validierungs-Fehler

### Problem: "AHB validation failed"
**Symptome:**
```javascript
{
  validation: {
    is_valid: false,
    errors: [
      { category: 'structure', message: 'Required segment NAD missing' }
    ]
  }
}
```

**Ursachen:**
- Pflicht-Segmente fehlen (z.B. `NAD`, `DTM`, `RFF`)
- Segmentreihenfolge falsch
- Prüfidentifikator ungültig

**Lösungen:**
```javascript
// 1. Validierung temporär deaktivieren für Debugging
const transformer = new EdifactTransformer({
  enableAHBValidation: false
});
const result = transformer.transform(edifact);

// 2. Fehler-Details analysieren
result.validation?.errors.forEach(error => {
  console.log(`${error.category}: ${error.message}`);
  if (error.segment) {
    console.log('  Betroffenes Segment:', error.segment);
  }
});

// 3. Pre-Validation nutzen
const { validateAHB } = require('edifact-json-transformer');
const validation = validateAHB(edifact);

if (!validation.is_valid) {
  console.log('Validierung fehlgeschlagen VOR Transformation');
  // Nachricht reparieren oder ablehnen
}

// 4. Nur Warnungen ignorieren, Fehler beachten
const hasErrors = result.validation?.errors.some(e => e.severity === 'ERROR');
const hasWarnings = result.validation?.errors.some(e => e.severity === 'WARNING');

if (hasErrors) {
  console.error('Kritische Fehler - Nachricht ablehnen');
} else if (hasWarnings) {
  console.warn('Warnungen vorhanden, aber verarbeitbar');
}
```

### Problem: "Invalid Marktlokations-ID"
**Symptome:**
- Marktlokations-ID wird nicht extrahiert
- Validierung meldet ungültige ID

**Ursachen:**
- Länge ≠ 11 Zeichen
- Nicht-numerische Zeichen
- Führende Nullen fehlen

**Lösungen:**
```javascript
// Marktlokations-IDs validieren
function isValidMarktlokationId(id) {
  // Muss genau 11 Ziffern sein
  return /^\d{11}$/.test(id);
}

// Automatische Korrektur
function normalizeMarktlokationId(id) {
  // Führende Nullen ergänzen
  return id.padStart(11, '0');
}

// Verwendung
const { extractAllMarktlokationIds } = require('edifact-json-transformer');
const ids = extractAllMarktlokationIds(edifact);

ids.forEach(id => {
  if (!isValidMarktlokationId(id)) {
    console.warn(`Ungültige MaLo-ID: ${id}`);
    const normalized = normalizeMarktlokationId(id);
    console.log(`  Normalisiert: ${normalized}`);
  }
});
```

### Problem: "Prüfidentifikator nicht erkannt"
**Symptome:**
- `metadata.pruefidentifikator` ist `undefined` oder `{ id: 'unknown' }`

**Ursachen:**
- `RFF+Z13` Segment fehlt
- Prüfidentifikator nicht in `pruefidentifikatoren.js` definiert

**Lösungen:**
```javascript
const { pruefidentifikatoren } = require('edifact-json-transformer');

// 1. Verfügbare Prüfidentifikatoren prüfen
console.log('Bekannte Prüfidentifikatoren:', Object.keys(pruefidentifikatoren));

// 2. Manuell extrahieren
const rffMatch = edifact.match(/RFF\+Z13:(\d+)/);
if (rffMatch) {
  const pruefId = rffMatch[1];
  console.log('Gefundener Prüfidentifikator:', pruefId);
  
  if (!pruefidentifikatoren[pruefId]) {
    console.warn(`Prüfidentifikator ${pruefId} unbekannt`);
  }
}

// 3. Eigene Prüfidentifikatoren ergänzen (in Ihrer Anwendung)
const customPruefIds = {
  ...pruefidentifikatoren,
  '99999': {
    name: 'Custom Test-Prozess',
    process: 'TEST',
    description: 'Nur für interne Tests'
  }
};
```

## Performance-Probleme

### Problem: "Memory overflow bei großen Dateien"
**Symptome:**
```
FATAL ERROR: CALL_AND_RETRY_LAST Allocation failed - JavaScript heap out of memory
```

**Ursachen:**
- Datei enthält tausende Nachrichten
- Alle Nachrichten werden gleichzeitig im Speicher gehalten

**Lösungen:**
```javascript
// 1. Stream-basierte Verarbeitung
const fs = require('fs');
const readline = require('readline');

async function processLargeFile(filePath) {
  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let currentMessage = '';
  let count = 0;

  for await (const line of rl) {
    currentMessage += line;

    if (line.includes('UNT+')) {
      // Nachricht vollständig
      await processMessage(currentMessage);
      currentMessage = '';
      count++;

      // Garbage Collection hint
      if (count % 100 === 0) {
        if (global.gc) global.gc();
      }
    }
  }
}

// 2. Batch-Verarbeitung mit Pausen
async function processBatch(messages, batchSize = 100) {
  for (let i = 0; i < messages.length; i += batchSize) {
    const batch = messages.slice(i, i + batchSize);
    
    await Promise.all(batch.map(processMessage));
    
    // Pause zwischen Batches
    await new Promise(resolve => setTimeout(resolve, 100));
  }
}

// 3. Worker Threads für CPU-intensive Aufgaben
const { Worker } = require('worker_threads');

function processInWorker(edifact) {
  return new Promise((resolve, reject) => {
    const worker = new Worker('./edifact-worker.js', {
      workerData: edifact
    });
    
    worker.on('message', resolve);
    worker.on('error', reject);
  });
}
```

### Problem: "Langsame Verarbeitung"
**Symptome:**
- Verarbeitung dauert > 1 Sekunde pro Nachricht

**Lösungen:**
```javascript
// 1. Profiling aktivieren
console.time('transform');
const result = transformer.transform(edifact);
console.timeEnd('transform');

// 2. Validierung selektiv nutzen
const transformer = new EdifactTransformer({
  enableAHBValidation: false, // Nur wenn wirklich benötigt
  generateGraphRelations: false // Nur bei Bedarf
});

// 3. Connection Pooling für Datenbank
const pool = new Pool({ max: 20 });

// 4. Bulk-Inserts statt Einzeloperationen
const messages = [...]; // Array von transformierten Nachrichten
await db.batch.insert(messages); // Ein DB-Call statt hunderte
```

## Integration-Probleme

### Problem: "Datum-Parsing fehlerhaft"
**Symptome:**
- Timestamps sind `null` oder falsch formatiert

**Lösungen:**
```javascript
// 1. parseTimestamps aktivieren
const transformer = new EdifactTransformer({
  parseTimestamps: true
});

// 2. Manuelles Parsing
const { parseDate } = require('edifact-json-transformer/src/utils/date');

const dateString = '20241019'; // YYYYMMDD
const parsed = parseDate(dateString);
console.log(parsed); // ISO-Format

// 3. Eigene Date-Logik
function parseEdifactDate(value, format) {
  // DTM+137:20241019:102 -> format 102 = CCYYMMDD
  if (format === '102' && value.length === 8) {
    const year = value.substring(0, 4);
    const month = value.substring(4, 6);
    const day = value.substring(6, 8);
    return new Date(`${year}-${month}-${day}`);
  }
  return null;
}
```

### Problem: "Encoding-Probleme (Umlaute)"
**Symptome:**
- Umlaute werden als `Ã¼` statt `ü` angezeigt

**Lösungen:**
```javascript
const fs = require('fs');

// 1. Encoding explizit angeben
const edifact = fs.readFileSync('message.edi', 'utf-8');

// 2. Bei SFTP/Binary-Downloads
const buffer = await sftp.get('/path/file.edi');
const edifact = buffer.toString('latin1'); // oder 'utf-8'

// 3. Encoding-Detection
const chardet = require('chardet');
const encoding = chardet.detectFileSync('message.edi');
console.log('Erkanntes Encoding:', encoding);

const edifact = fs.readFileSync('message.edi', encoding);
```

### Problem: "Neo4j Cypher-Statements fehlerhaft"
**Symptome:**
- Graph-Import schlägt fehl
- Syntax-Errors in Cypher

**Lösungen:**
```javascript
const { convertToNeo4jCypher } = require('edifact-json-transformer');

// 1. Statements einzeln prüfen
const statements = convertToNeo4jCypher(edifact);

statements.forEach((stmt, idx) => {
  console.log(`Statement ${idx}:`, stmt);
  
  // Optional: Syntax-Check
  if (!stmt.includes('MERGE') && !stmt.includes('CREATE')) {
    console.warn('Verdächtiges Statement ohne MERGE/CREATE');
  }
});

// 2. Transaktionale Ausführung
const neo4j = require('neo4j-driver');
const driver = neo4j.driver('bolt://localhost', neo4j.auth.basic('neo4j', 'password'));
const session = driver.session();

try {
  await session.writeTransaction(async tx => {
    for (const stmt of statements) {
      await tx.run(stmt);
    }
  });
} finally {
  await session.close();
}

// 3. Fallback: Eigene Graph-Mappings
const json = transformer.transform(edifact);
const customCypher = `
  MERGE (m:Marktlokation {id: $maloId})
  SET m.name = $name
`;
await session.run(customCypher, {
  maloId: json.body.stammdaten.marktlokationen[0].id,
  name: json.body.stammdaten.marktlokationen[0].name
});
```

## Testing & Debugging

### Problem: "Keine Testdaten verfügbar"
**Lösungen:**
```javascript
const {
  generateTestUTILMD,
  generateTestMSCONS,
  generateTestAPERAK,
  generateInvalidEdifact
} = require('edifact-json-transformer/src/utils/testDataGenerator');

// Gültige Testnachrichten generieren
const utilmd = generateTestUTILMD({
  marktlokationId: '99999999999',
  pruefidentifikator: '44001'
});

const mscons = generateTestMSCONS({
  verbrauch: '5000',
  einheit: 'KWH'
});

const positiveAck = generateTestAPERAK({ status: 'positive' });
const negativeAck = generateTestAPERAK({ status: 'negative' });

// Fehlerfall-Tests
const invalidEdifact = generateInvalidEdifact('missing_unt');

// Verwendung in Tests
describe('EDIFACT Processing', () => {
  it('should parse valid UTILMD', () => {
    const result = transformer.transform(utilmd);
    expect(result.metadata.message_type).toBe('UTILMD');
  });

  it('should reject invalid EDIFACT', () => {
    expect(() => {
      transformer.transform(invalidEdifact);
    }).toThrow();
  });
});
```

### Problem: "Debugging schwierig"
**Lösungen:**
```javascript
// 1. Verbose Logging aktivieren
const transformer = new EdifactTransformer();

// Vor Transformation: Rohdaten loggen
console.log('Input:', edifact.substring(0, 200));

const result = transformer.transform(edifact);

// Nach Transformation: Struktur inspizieren
console.log('Metadata:', JSON.stringify(result.metadata, null, 2));
console.log('Body:', JSON.stringify(result.body, null, 2));
console.log('Validation:', JSON.stringify(result.validation, null, 2));

// 2. Segment-für-Segment Analyse
const { parseSegments } = require('edifact-json-transformer/src/core/parser');
const segments = parseSegments(edifact);

segments.forEach((seg, idx) => {
  console.log(`Segment ${idx}: ${seg.tag}`, seg.elements);
});

// 3. Breakpoints in transformierter JSON
const util = require('util');
console.log(util.inspect(result, { depth: 10, colors: true }));
```

## Bekannte Limitierungen

### EDIFACT-Container mit mehreren Nachrichten
**Problem:** Ein `UNB`-Container enthält mehrere `UNH`-Nachrichten.

**Workaround:**
```javascript
function splitEdifactContainer(containerEdifact) {
  // Nachrichten am UNH-Segment trennen
  const messages = [];
  let currentMsg = '';
  
  const lines = containerEdifact.split("'");
  
  for (const line of lines) {
    if (line.startsWith('UNH+') && currentMsg) {
      messages.push(currentMsg + "'");
      currentMsg = line;
    } else {
      currentMsg += (currentMsg ? "'" : '') + line;
    }
  }
  
  if (currentMsg) {
    messages.push(currentMsg);
  }
  
  return messages.filter(m => m.includes('UNH+'));
}

// Verwendung
const messages = splitEdifactContainer(containerEdifact);
messages.forEach(msg => {
  const result = transformer.transform(msg);
  console.log('Verarbeitet:', result.metadata.message_type);
});
```

### Sehr alte EDIFACT-Versionen
**Problem:** Nachrichten mit alten Versionen (< D.11A) werden nicht korrekt geparst.

**Empfehlung:** Migration auf aktuelle BDEW-Formate (D.11A, D.14B, D.19B).

## Support

Bei persistierenden Problemen:

1. **GitHub Issues:** [energychain/edifact-to-json-transformer/issues](https://github.com/energychain/edifact-to-json-transformer/issues)
2. **Beispiel-Nachricht beifügen** (anonymisiert!)
3. **Error-Logs** vollständig mitschicken
4. **Node.js Version** angeben (`node --version`)

**Willi Mako Support:** Für regulatorische Fragen zur Marktkommunikation siehe [stromhaltig.de/app](https://stromhaltig.de/app/).
