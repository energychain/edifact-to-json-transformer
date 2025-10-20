const { EdifactTransformer } = require('../transformer/EdifactTransformer');

/**
 * Factory für den Standard-Transformer. Nutzt dieselben Defaults wie der direkte Klassen-Konstruktor,
 * erlaubt aber Konsument:innen im Alltagsgebrauch eine leichtgewichtige Initialisierung.
 */
function createTransformer(options) {
  return new EdifactTransformer(options);
}

/**
 * Extrahiert alle Marktlokations-IDs (`IDE+24`) aus einer Nachricht - häufig genutzt für Anschlussprozesse
 * wie Datenbank-Suchen oder KPI-Bildung.
 */
function extractAllMarktlokationIds(edifactString, options) {
  const transformer = createTransformer(options);
  const json = transformer.transform(edifactString);
  return json.body?.stammdaten?.marktlokationen?.map((m) => m.id) || [];
}

/**
 * Hilfsfunktion, um schnell zu prüfen, ob die Nachricht einem GPKE-Prozess zugeordnet ist.
 * Ideal für Routing-Logik oder Feature-Flags.
 */
function isGPKEProcess(edifactString, options) {
  const transformer = createTransformer(options);
  const json = transformer.transform(edifactString);
  return json.metadata.applicable_processes?.includes('GPKE') || false;
}

/**
 * Wandelt die Nachricht in Neo4j-Cypher Statements um, z. B. für Graph-Analysen entlang von Marktrollen.
 */
function convertToNeo4jCypher(edifactString, options) {
  const transformer = createTransformer({ ...options, targetSchema: 'neo4j' });
  const json = transformer.transform(edifactString);
  return json.db_schema?.statements || [];
}

/**
 * Führt eine AHB-Validierung aus und liefert ein homogenes Fehler-/Warnungsobjekt.
 * Praktisch, wenn Nachrichten vor Persistierung oder Weiterleitung geprüft werden sollen.
 */
function validateAHB(edifactString, options) {
  const transformer = createTransformer({
    enableAHBValidation: true,
    validateBusinessRules: true,
    ...options
  });
  const json = transformer.transform(edifactString);
  return {
    is_valid: json.validation?.is_valid ?? true,
    errors: json.validation?.errors || [],
    warnings: json.validation?.warnings || []
  };
}

module.exports = {
  createTransformer,
  extractAllMarktlokationIds,
  isGPKEProcess,
  convertToNeo4jCypher,
  validateAHB
};
