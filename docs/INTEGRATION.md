# Integration in bestehende Systeme

Dieser Guide zeigt, wie Sie `edifact-json-transformer` in typische Energiewirtschafts-Systeme integrieren.

## Use Case 1: SFTP-Polling + Datenbank-Import

Täglicher Import von EDIFACT-Nachrichten aus einem SFTP-Postfach in Ihre Datenbank.

```javascript
const { EdifactTransformer } = require('edifact-json-transformer');
const Client = require('ssh2-sftp-client');
const fs = require('fs').promises;

async function pollSFTP() {
  const sftp = new Client();
  const transformer = new EdifactTransformer({
    enableAHBValidation: true
  });

  try {
    await sftp.connect({
      host: process.env.SFTP_HOST,
      port: 22,
      username: process.env.SFTP_USER,
      password: process.env.SFTP_PASSWORD
    });

    const files = await sftp.list('/inbox');

    for (const file of files.filter(f => f.name.endsWith('.edi'))) {
      try {
        const content = await sftp.get(`/inbox/${file.name}`);
        const edifact = content.toString('utf-8');

        const result = transformer.transform(edifact);

        // Validierung prüfen
        if (!result.validation.is_valid) {
          console.error(`Validierung fehlgeschlagen für ${file.name}:`, result.validation.errors);
          await sftp.rename(`/inbox/${file.name}`, `/error/${file.name}`);
          continue;
        }

        // In Datenbank importieren
        await importToDatabase(result);

        // Erfolgreich → archivieren
        await sftp.rename(`/inbox/${file.name}`, `/archive/${file.name}`);
        console.log(`✓ Verarbeitet: ${file.name}`);

      } catch (error) {
        console.error(`Fehler bei ${file.name}:`, error.message);
        await sftp.rename(`/inbox/${file.name}`, `/error/${file.name}`);
      }
    }

  } finally {
    await sftp.end();
  }
}

async function importToDatabase(json) {
  const { message_type } = json.metadata;

  switch (message_type) {
    case 'UTILMD':
      await importStammdaten(json);
      break;
    case 'MSCONS':
      await importMesswerte(json);
      break;
    case 'INVOIC':
      await importRechnung(json);
      break;
    default:
      console.warn(`Unbekannter Nachrichtentyp: ${message_type}`);
  }
}

// Beispiel: MSCONS in SQL-Datenbank
async function importMesswerte(json) {
  const { marktlokationen, messwerte } = json.body.messwerte || {};

  for (const malo of marktlokationen || []) {
    await db.consumption.create({
      data: {
        marktlokationId: malo.id,
        messdatum: messwerte[0]?.datum,
        verbrauch: messwerte[0]?.wert,
        einheit: messwerte[0]?.einheit,
        importedAt: new Date(),
        sourceFile: json.metadata.reference_number
      }
    });
  }
}

// Cronjob: Stündliches Polling
setInterval(pollSFTP, 60 * 60 * 1000);
```

## Use Case 2: REST API für Partner-Integration

Bereitstellen eines API-Endpoints für externe Systeme.

```javascript
const express = require('express');
const { EdifactTransformer, validateAHB } = require('edifact-json-transformer');

const app = express();
app.use(express.json());
app.use(express.text({ type: 'application/edifact' }));

app.post('/api/edifact/parse', async (req, res) => {
  try {
    const edifact = typeof req.body === 'string' ? req.body : req.body.edifact;

    if (!edifact) {
      return res.status(400).json({
        success: false,
        error: 'Missing EDIFACT data'
      });
    }

    // Optional: Pre-Validation
    const validation = validateAHB(edifact);
    if (!validation.is_valid && req.query.strict === 'true') {
      return res.status(422).json({
        success: false,
        validation
      });
    }

    const transformer = new EdifactTransformer({
      enableAHBValidation: req.query.validate !== 'false',
      generateGraphRelations: req.query.graph === 'true'
    });

    const json = transformer.transform(edifact);

    res.json({
      success: true,
      messageType: json.metadata.message_type,
      category: json.metadata.category,
      data: json.body,
      validation: json.validation,
      graphRelations: json.graph_relations
    });

  } catch (error) {
    console.error('Parse error:', error);
    res.status(400).json({
      success: false,
      error: error.message,
      type: error.name
    });
  }
});

app.listen(3000, () => {
  console.log('EDIFACT API läuft auf Port 3000');
});
```

## Use Case 3: Event-Driven Architecture (Kafka)

Asynchrone Verarbeitung über Message Queues.

```javascript
const { Kafka } = require('kafkajs');
const { EdifactTransformer } = require('edifact-json-transformer');

const kafka = new Kafka({
  clientId: 'edifact-processor',
  brokers: [process.env.KAFKA_BROKER]
});

const consumer = kafka.consumer({ groupId: 'edifact-group' });
const producer = kafka.producer();

async function processEdifactStream() {
  await consumer.connect();
  await producer.connect();

  await consumer.subscribe({ topic: 'edifact-raw' });

  const transformer = new EdifactTransformer({
    enableAHBValidation: true
  });

  await consumer.run({
    eachMessage: async ({ topic, partition, message }) => {
      try {
        const edifact = message.value.toString();
        const json = transformer.transform(edifact);

        // Routing basierend auf Nachrichtentyp
        const targetTopic = `edifact-${json.metadata.message_type.toLowerCase()}`;

        await producer.send({
          topic: targetTopic,
          messages: [{
            key: json.metadata.reference_number,
            value: JSON.stringify(json),
            headers: {
              messageType: json.metadata.message_type,
              category: json.metadata.category
            }
          }]
        });

        console.log(`✓ Routed ${json.metadata.message_type} to ${targetTopic}`);

      } catch (error) {
        console.error('Processing error:', error);

        // Dead Letter Queue
        await producer.send({
          topic: 'edifact-dlq',
          messages: [{
            value: message.value,
            headers: {
              error: error.message,
              originalTopic: topic
            }
          }]
        });
      }
    }
  });
}

processEdifactStream().catch(console.error);
```

## Use Case 4: Batch-Verarbeitung mit Stream-API

Memory-effiziente Verarbeitung großer Dateien mit mehreren Nachrichten.

```javascript
const { EdifactTransformer } = require('edifact-json-transformer');
const fs = require('fs');
const readline = require('readline');

async function processBatchFile(filePath) {
  const transformer = new EdifactTransformer();
  const results = {
    total: 0,
    successful: 0,
    failed: 0,
    errors: []
  };

  // Streaming-Ansatz für große Dateien
  const fileStream = fs.createReadStream(filePath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  let currentMessage = '';

  for await (const line of rl) {
    currentMessage += line;

    // Nachricht vollständig wenn UNT gefunden
    if (line.includes('UNT+')) {
      results.total++;

      try {
        const json = transformer.transform(currentMessage);

        if (json.validation?.is_valid !== false) {
          await processMessage(json);
          results.successful++;
        } else {
          results.failed++;
          results.errors.push({
            message: currentMessage.substring(0, 100),
            errors: json.validation.errors
          });
        }

      } catch (error) {
        results.failed++;
        results.errors.push({
          message: currentMessage.substring(0, 100),
          error: error.message
        });
      }

      currentMessage = '';
    }
  }

  return results;
}

async function processMessage(json) {
  // Ihre Business-Logic hier
  console.log(`Processing ${json.metadata.message_type}:`, json.metadata.reference_number);
}

// Verwendung
processBatchFile('./data/batch.edi')
  .then(results => {
    console.log(`
Batch-Verarbeitung abgeschlossen:
  Gesamt: ${results.total}
  Erfolgreich: ${results.successful}
  Fehlgeschlagen: ${results.failed}
    `);
  })
  .catch(console.error);
```

## Use Case 5: Robuste Fehlerbehandlung mit Retry-Logic

Produktionsreifer Ansatz mit Error-Handling und Logging.

```javascript
const { EdifactTransformer, validateAHB } = require('edifact-json-transformer');

class EdifactProcessor {
  constructor(options = {}) {
    this.transformer = new EdifactTransformer(options);
    this.maxRetries = options.maxRetries || 3;
    this.errorQueue = [];
    this.metrics = {
      processed: 0,
      errors: 0,
      retries: 0
    };
  }

  async process(edifact, metadata = {}) {
    const result = {
      status: 'pending',
      data: null,
      errors: [],
      warnings: []
    };

    // Pre-Validation: Syntax-Check
    const validation = validateAHB(edifact);
    if (!validation.is_valid) {
      const hasErrors = validation.errors.some(e => e.severity === 'ERROR');
      if (hasErrors) {
        result.status = 'rejected';
        result.errors = validation.errors;
        await this.logError(edifact, validation.errors, metadata);
        this.metrics.errors++;
        return result;
      }
      result.warnings = validation.errors; // Nur Warnungen
    }

    // Transformation mit Retry
    let attempt = 0;
    while (attempt < this.maxRetries) {
      try {
        result.data = this.transformer.transform(edifact);
        result.status = 'success';
        this.metrics.processed++;

        // Business-Validierung
        const bizCheck = await this.validateBusinessRules(result.data);
        if (!bizCheck.valid) {
          result.warnings.push(...bizCheck.warnings);
        }

        return result;

      } catch (error) {
        attempt++;
        this.metrics.retries++;

        if (attempt >= this.maxRetries) {
          result.status = 'error';
          result.errors.push({
            type: error.name,
            message: error.message,
            attempts: attempt
          });

          this.errorQueue.push({ edifact, error, metadata });
          this.metrics.errors++;
          await this.logError(edifact, [error], metadata);
        } else {
          // Exponential Backoff
          await new Promise(resolve => setTimeout(resolve, 100 * Math.pow(2, attempt)));
        }
      }
    }

    return result;
  }

  async validateBusinessRules(json) {
    const warnings = [];

    // Beispiel: Prüfe ob Marktlokation bekannt ist
    const marktlokationen = this.extractMarktlokationen(json);

    for (const maloId of marktlokationen) {
      if (!await this.marktlokationExists(maloId)) {
        warnings.push(`Marktlokation ${maloId} nicht in Stammdaten`);
      }
    }

    // Beispiel: Prüfe Zeitstempel-Plausibilität
    if (json.metadata.parsed_at) {
      const parsedDate = new Date(json.metadata.parsed_at);
      const now = new Date();
      if (parsedDate > now) {
        warnings.push('Zeitstempel liegt in der Zukunft');
      }
    }

    return {
      valid: warnings.length === 0,
      warnings
    };
  }

  extractMarktlokationen(json) {
    const ids = [];
    if (json.body.stammdaten?.marktlokationen) {
      ids.push(...json.body.stammdaten.marktlokationen.map(m => m.id));
    }
    if (json.body.messwerte?.marktlokationen) {
      ids.push(...json.body.messwerte.marktlokationen.map(m => m.id));
    }
    return ids;
  }

  async marktlokationExists(maloId) {
    // Dummy-Implementierung - in Produktion: DB-Abfrage
    return maloId && maloId.length === 11;
  }

  async logError(edifact, errors, metadata) {
    const logEntry = {
      timestamp: new Date().toISOString(),
      source: metadata.source || 'unknown',
      errors: errors.map(e => ({
        message: e.message || e,
        type: e.type || 'unknown'
      })),
      edifact: edifact.substring(0, 200) + '...'
    };

    // In Production: Sentry, ELK Stack, CloudWatch, etc.
    console.error('EDIFACT Error:', JSON.stringify(logEntry, null, 2));

    // Optional: Speichern in Error-Datenbank
    this.errorQueue.push(logEntry);
  }

  getMetrics() {
    return {
      ...this.metrics,
      errorRate: this.metrics.processed > 0
        ? (this.metrics.errors / (this.metrics.processed + this.metrics.errors) * 100).toFixed(2) + '%'
        : '0%'
    };
  }

  getErrorQueue() {
    return this.errorQueue;
  }
}

// Verwendung
const processor = new EdifactProcessor({
  enableAHBValidation: true,
  maxRetries: 3
});

async function processIncomingMessages(messages) {
  for (const msg of messages) {
    const result = await processor.process(msg.edifact, {
      source: msg.source,
      filename: msg.filename
    });

    if (result.status === 'success') {
      console.log('✓ Erfolgreich:', result.data.metadata.message_type);
    } else {
      console.error('✗ Fehler:', result.errors);
    }
  }

  console.log('Metriken:', processor.getMetrics());
}

module.exports = { EdifactProcessor };
```

## Best Practices

### Memory-Management
- **Batch-Size limitieren:** Max. 100-500 Nachrichten pro Durchlauf
- **Stream-basierte Verarbeitung** für Dateien > 10 MB
- **Garbage Collection:** Explizites `null` setzen nach Verarbeitung großer Objekte

### Performance-Tipps
- AHB-Validierung nur wenn notwendig (`enableAHBValidation: false` für vertrauenswürdige Quellen)
- Graph-Relations nur bei Bedarf generieren
- Connection-Pooling für Datenbank-Zugriffe
- Bulk-Inserts statt Einzeloperationen

### Monitoring
```javascript
const prometheus = require('prom-client');

const edifactCounter = new prometheus.Counter({
  name: 'edifact_messages_total',
  help: 'Total EDIFACT messages processed',
  labelNames: ['type', 'status']
});

const edifactDuration = new prometheus.Histogram({
  name: 'edifact_processing_duration_seconds',
  help: 'EDIFACT processing duration'
});

// In Ihrer Verarbeitungslogik
const end = edifactDuration.startTimer();
const result = transformer.transform(edifact);
end();

edifactCounter.inc({
  type: result.metadata.message_type,
  status: result.validation?.is_valid ? 'success' : 'error'
});
```

## Datenbank-Schema-Beispiele

### PostgreSQL
```sql
CREATE TABLE edifact_messages (
  id SERIAL PRIMARY KEY,
  message_type VARCHAR(20) NOT NULL,
  reference_number VARCHAR(50),
  category VARCHAR(50),
  raw_edifact TEXT NOT NULL,
  json_data JSONB NOT NULL,
  validation_status VARCHAR(20),
  imported_at TIMESTAMP DEFAULT NOW(),
  source_file VARCHAR(255),
  INDEX idx_message_type (message_type),
  INDEX idx_reference (reference_number),
  INDEX idx_imported (imported_at)
);

-- Marktlokationen extrahieren via JSON-Query
SELECT
  reference_number,
  jsonb_array_elements(json_data->'body'->'stammdaten'->'marktlokationen') AS marktlokation
FROM edifact_messages
WHERE message_type = 'UTILMD';
```

### MongoDB
```javascript
const messageSchema = new Schema({
  messageType: { type: String, required: true, index: true },
  referenceNumber: { type: String, index: true },
  category: String,
  rawEdifact: String,
  jsonData: Schema.Types.Mixed,
  validation: {
    isValid: Boolean,
    errors: [Schema.Types.Mixed],
    warnings: [Schema.Types.Mixed]
  },
  importedAt: { type: Date, default: Date.now },
  sourceFile: String
});

const EdifactMessage = mongoose.model('EdifactMessage', messageSchema);
```

## Troubleshooting

Siehe [TROUBLESHOOTING.md](./TROUBLESHOOTING.md) für häufige Probleme und Lösungen.
