const { extractUtilmdData } = require('./utilmd');
const { extractMsconsData } = require('./mscons');
const { extractOrderData } = require('./orders');
const { extractInvoiceData } = require('./invoic');
const { extractAcknowledgementData } = require('./acknowledgement');
const { extractGenericData } = require('./generic');

/**
 * Delegiert nachrichtentypspezifische Extraktion. Die einzelnen Module kapseln Fachlogik aus den jeweiligen
 * AHB/MIG-Dokumenten. Neue Nachrichtentypen lassen sich durch Ergänzen eines Extractors plus Case hinzufügen.
 */
function extractBody(segments, messageType, context = {}) {
  const body = {
    message_type: messageType
  };

  switch (messageType) {
    case 'UTILMD':
      body.stammdaten = extractUtilmdData(segments, context);
      break;
    case 'MSCONS':
      body.messwerte = extractMsconsData(segments, context);
      break;
    case 'ORDERS':
    case 'ORDRSP':
      body.bestellung = extractOrderData(segments, context);
      break;
    case 'INVOIC':
    case 'REMADV':
      body.rechnung = extractInvoiceData(segments, context);
      break;
    case 'APERAK':
    case 'CONTRL':
      body.quittierung = extractAcknowledgementData(segments, context);
      break;
    default:
      body.generic_data = extractGenericData(segments, context);
      break;
  }

  return body;
}

module.exports = {
  extractBody
};
