const messageTypes = require('../constants/messageTypes');
const pruefidentifikatoren = require('../constants/pruefidentifikatoren');
const statusCodes = require('../constants/statusCodes');
const { normalizeEdifact, parseSegments } = require('../core/parser');
const {
  extractPruefidentifikator,
  extractHeader,
  extractParties,
  extractDates,
  extractReferences
} = require('../core/metadata');
const { extractSegmentGroupsHierarchical } = require('../core/segmentGroups');
const { extractBody } = require('../extractors');
const { validateMessageStructure } = require('../validators/structure');
const { validateAHBRules } = require('../validators/ahb');
const { extractGraphRelations } = require('../mappings/graph');
const { mapToTargetSchema } = require('../mappings/schema');
const { parseDate } = require('../utils/date');

/**
 * Kernklasse des Projekts: kapselt Parsing, Validierung und projektspezifische Ableitungen.
 *
 * <strong>Warum diese Klasse?</strong>
 * EDIFACT-Nachrichten bestehen aus Segmenten wie `UNH`, `BGM`, `RFF`, `IDE` usw. Je nach Prozess
 * (GPKE, GeLi Gas, WiM, MaBiS) gelten unterschiedliche Mussfelder, Identifier und Geschäftsregeln.
 * Die {@link EdifactTransformer} abstrahiert diese Komplexität:
 *
 * - normalisiert den Roh-EDIFACT-String (inklusive Escape-/Release-Charakter `?`),
 * - stellt strukturierte JSON-Repräsentationen bereit,
 * - führt - sofern aktiviert - AHB/MIG-konforme Prüfungen durch,
 * - liefert optional Grahprelationen oder Schema-Mappings für gängige Datenbanken.
 *
 * Der Default richtet sich an Entwickler:innen mit Grundwissen zu EDIFACT-Segmenten, die jedoch nicht
 * jedes MIG-Dokument im Detail kennen. Über {@link EdifactTransformer#options} lässt sich das Verhalten
 * anwachsender Projekte anpassen.
 */
class EdifactTransformer {
  constructor(options = {}) {
    this.options = {
      includeRawSegments: options.includeRawSegments ?? false,
      generateGraphRelations: options.generateGraphRelations ?? true,
      validateStructure: options.validateStructure ?? true,
      validateBusinessRules: options.validateBusinessRules ?? true,
      parseTimestamps: options.parseTimestamps ?? true,
      targetSchema: options.targetSchema || 'generic',
      enableAHBValidation: options.enableAHBValidation ?? true,
      ...options
    };

    this.separators = {
      segment: "'",
      dataElement: '+',
      componentElement: ':',
      decimal: ',',
      releaseChar: '?'
    };

    this.messageTypes = messageTypes;
    this.pruefidentifikatoren = pruefidentifikatoren;
    this.statusCodes = statusCodes;

    this.resetValidation();
  }

  /**
   * Transformiert einen EDIFACT-String in eine strukturierte JSON-Repräsentation.
   *
  * @param {string} edifactString Roh-Nachricht (z. B. Inhalt einer UTILMD-Datei).
   * @returns {object} Strukturierte Nachricht inkl. Metadaten, Segmentgruppen, optionalen Validierungsresultaten.
   */
  transform(edifactString) {
    try {
      this.resetValidation();

      const normalized = normalizeEdifact(edifactString);
      const segments = parseSegments(normalized, this.separators, this.options.includeRawSegments);

      if (this.options.validateStructure) {
        validateMessageStructure(segments, this.createValidationContext());
      }

      const json = this.buildJsonStructure(segments);

      if (this.options.enableAHBValidation && this.options.validateBusinessRules) {
        validateAHBRules(json, segments, this.createValidationContext());
      }

      if (this.options.generateGraphRelations) {
        json.graph_relations = extractGraphRelations(json);
      }

      if (this.options.targetSchema && this.options.targetSchema !== 'generic') {
        json.db_schema = mapToTargetSchema(json, this.options.targetSchema);
      }

      if (this.validationErrors.length > 0 || this.validationWarnings.length > 0) {
        json.validation = {
          is_valid: this.validationErrors.length === 0,
          errors: this.validationErrors,
          warnings: this.validationWarnings
        };
      }

      return json;
    } catch (error) {
      return {
        error: true,
        message: error.message,
        stack: error.stack,
        validation_errors: this.validationErrors
      };
    }
  }

  /**
   * Baut die zentrale JSON-Struktur aus den Segmenten auf: Metadata, Header, Body, Parteien usw.
   * Dieser Schritt ist getrennt, um Erweiterungen (z. B. zusätzliche Extraktoren) zu erleichtern.
   *
   * @param {Array<object>} segments Ergebnis aus {@link parseSegments}.
   * @returns {object} Teilstruktur, bevor Validierung & Mapping angewandt werden.
   */
  buildJsonStructure(segments) {
    const unh = segments.find((segment) => segment.tag === 'UNH');
    const messageType = unh?.elements[1]?.[0];
    const messageVersion = unh?.elements[1]?.[4] || 'unknown';
    const messageInfo = this.messageTypes[messageType] || {
      name: 'Unbekannt',
      category: 'unknown',
      processes: []
    };

    const metadata = {
      message_type: messageType,
      message_name: messageInfo.name,
      category: messageInfo.category,
      applicable_processes: messageInfo.processes,
      version: messageVersion,
      reference_number: unh?.elements[0],
      parsed_at: new Date().toISOString(),
      standard: 'EDIFACT',
      release: unh?.elements[1]?.[2] || 'unknown',
      pruefidentifikator: extractPruefidentifikator(segments, this.pruefidentifikatoren)
    };

    const extractionContext = this.createExtractionContext();
    const validationContext = this.createValidationContext();

    const json = {
      metadata,
      header: extractHeader(segments),
      body: extractBody(segments, messageType, extractionContext),
      parties: extractParties(segments, validationContext),
      dates: extractDates(segments, extractionContext.parseDate),
      references: extractReferences(segments),
      segment_groups: extractSegmentGroupsHierarchical(segments),
      raw_segments: this.options.includeRawSegments ? segments : undefined
    };

    return json;
  }

  /**
   * Liefert einen Kontext mit gebundenen Validierungs-Helpern.
   * Dieser Ansatz erlaubt es, die Validator-Module testbar und ohne harte Abhängigkeit auf Klasseninstanzen zu halten.
   */
  createValidationContext() {
    return {
      addValidationError: this.addValidationError.bind(this),
      addValidationWarning: this.addValidationWarning.bind(this)
    };
  }

  /**
   * Kontext für Datenextraktion (z. B. Date-Parsing, Warning-Hooks). Durchgereicht in Extractors.
   */
  createExtractionContext() {
    return {
      addValidationWarning: this.addValidationWarning.bind(this),
      parseDate: this.options.parseTimestamps ? parseDate : (value) => value
    };
  }

  resetValidation() {
    this.validationErrors = [];
    this.validationWarnings = [];
  }

  addValidationError(category, message, severity = 'ERROR') {
    this.validationErrors.push({
      category,
      message,
      severity,
      timestamp: new Date().toISOString()
    });
  }

  addValidationWarning(category, message) {
    this.validationWarnings.push({
      category,
      message,
      severity: 'WARNING',
      timestamp: new Date().toISOString()
    });
  }
}

module.exports = {
  EdifactTransformer
};
