/**
 * Utility zur Generierung gültiger Test-EDIFACT-Nachrichten.
 * Hilfreich für Unit-Tests ohne Produktionsdaten.
 */

/**
 * Erzeugt eine gültige UTILMD-Testnachricht (Stammdaten).
 * @param {object} overrides Optionale Überschreibungen der Default-Werte
 * @returns {string} Valides EDIFACT
 */
function generateTestUTILMD(overrides = {}) {
  const defaults = {
    messageId: '12345',
    pruefidentifikator: '44001',
    marktlokationId: '12345678901',
    senderId: '9900123456789',
    receiverId: '9900987654321'
  };

  const data = { ...defaults, ...overrides };

  return (
    `UNH+${data.messageId}+UTILMD:D:11A:UN:2.6'` +
    `BGM+E01+${data.messageId}+9'` +
    `DTM+137:20241019:102'` +
    `NAD+MS+${data.senderId}::293'` +
    `NAD+MR+${data.receiverId}::293'` +
    `RFF+Z13:${data.pruefidentifikator}'` +
    `IDE+24+${data.marktlokationId}'` +
    `UNT+8+${data.messageId}'`
  );
}

/**
 * Erzeugt eine gültige MSCONS-Testnachricht (Messwerte).
 * @param {object} overrides Optionale Überschreibungen
 * @returns {string} Valides EDIFACT
 */
function generateTestMSCONS(overrides = {}) {
  const defaults = {
    messageId: '98765',
    marktlokationId: '12345678901',
    verbrauch: '1234',
    einheit: 'KWH'
  };

  const data = { ...defaults, ...overrides };

  return (
    `UNH+${data.messageId}+MSCONS:D:11A:UN:2.6'` +
    `BGM+E01+${data.messageId}+9'` +
    `DTM+137:20241019:102'` +
    `NAD+MS+9900123456789::293'` +
    `IDE+24+${data.marktlokationId}'` +
    `QTY+220:${data.verbrauch}:${data.einheit}'` +
    `UNT+7+${data.messageId}'`
  );
}

/**
 * Erzeugt eine APERAK-Testnachricht (Anwendungsquittung positiv).
 * @param {object} overrides Optionale Überschreibungen
 * @returns {string} Valides EDIFACT
 */
function generateTestAPERAK(overrides = {}) {
  const defaults = {
    messageId: '11111',
    status: 'positive', // 'positive' oder 'negative'
    referencedMessageId: '12345'
  };

  const data = { ...defaults, ...overrides };
  const funcCode = data.status === 'positive' ? '7' : '27';

  return (
    `UNH+${data.messageId}+APERAK:D:11A:UN:1.1'` +
    `BGM+E14+${data.messageId}+${funcCode}'` +
    `DTM+137:20241019:102'` +
    `RFF+ACW:${data.referencedMessageId}'` +
    `UNT+5+${data.messageId}'`
  );
}

/**
 * Erzeugt eine ungültige EDIFACT-Nachricht für Fehlerfall-Tests.
 * @param {string} errorType Art des Fehlers: 'missing_unh', 'invalid_segment', 'missing_unt'
 * @returns {string} Ungültiges EDIFACT
 */
function generateInvalidEdifact(errorType = 'missing_unt') {
  switch (errorType) {
    case 'missing_unh':
      return "BGM+E01+12345+9'DTM+137:20241019:102'UNT+3+1'";
    case 'invalid_segment':
      return "UNH+1+UTILMD:D:11A:UN:2.6'INVALID_SEGMENT'UNT+3+1'";
    case 'missing_unt':
      return "UNH+1+UTILMD:D:11A:UN:2.6'BGM+E01+12345+9'";
    case 'malformed_elements':
      return "UNH+1+UTILMD:D:11A:UN:2.6'BGM+E01++9'UNT+3+1'";
    default:
      return "CORRUPT_DATA";
  }
}

module.exports = {
  generateTestUTILMD,
  generateTestMSCONS,
  generateTestAPERAK,
  generateInvalidEdifact
};
