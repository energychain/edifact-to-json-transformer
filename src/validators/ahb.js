/**
 * Abbildung der wichtigsten AHB-Prüfschritte. Die Regelmenge fokussiert auf häufige Stolpersteine in MaKo-Prozessen:
 * fehlende Prüfidentifikatoren, falsche Rollenbesetzung oder inkonsistente Lokations-IDs. Die Implementierung kann
 * problemlos erweitert werden, indem zusätzliche Bedingungen ergänzt oder in dedizierte Funktionen ausgelagert werden.
 */
function validateAHBRules(json, segments, context = {}) {
  const { addValidationError, addValidationWarning } = context;
  const pruefId = json.metadata.pruefidentifikator?.id;
  const messageType = json.metadata.message_type;

  if (['UTILMD', 'ORDERS', 'ORDRSP'].includes(messageType) && !pruefId) {
    if (typeof addValidationError === 'function') {
      addValidationError('AHB', `Prüfidentifikator (RFF+Z13) fehlt für ${messageType}-Nachricht`, 'ERROR');
    }
  }

  if (pruefId) {
    validateRolesForProcess(pruefId, json.parties, addValidationError);
  }

  if (messageType === 'UTILMD') {
    validateLocationIds(json.body.stammdaten, addValidationError);
  }

  validateTemporalConsistency(json.dates, addValidationError);
  validateRequiredSegmentGroups(messageType, segments, addValidationWarning);

  return true;
}

function validateRolesForProcess(pruefId, parties, addValidationError) {
  if (pruefId === '44001') {
    if (!parties.lieferant && !parties.sender) {
      if (typeof addValidationError === 'function') {
        addValidationError(
          'AHB',
          'Anmeldung NN erfordert Lieferant-Rolle (NAD+DP oder NAD+MS)',
          'ERROR'
        );
      }
    }
    if (!parties.netzbetreiber && !parties.receiver) {
      if (typeof addValidationError === 'function') {
        addValidationError(
          'AHB',
          'Anmeldung NN erfordert Netzbetreiber-Rolle (NAD+DDQ oder NAD+MR)',
          'ERROR'
        );
      }
    }
  }

  if (['17009', '19015'].includes(pruefId)) {
    if (!parties.messstellenbetreiber && typeof addValidationError === 'function') {
      addValidationError('AHB', 'WiM-Prozess erfordert Messstellenbetreiber-Rolle (NAD+DDP)', 'ERROR');
    }
  }
}

function validateLocationIds(stammdaten, addValidationError) {
  if (!stammdaten) return;

  stammdaten.marktlokationen?.forEach((malo, idx) => {
    if (!malo.valid && typeof addValidationError === 'function') {
      addValidationError(
        'AHB',
        `Marktlokations-ID ${idx + 1} ungültig: ${malo.id} (erwartet: 11-stellig)`,
        'ERROR'
      );
    }
  });

  stammdaten.messlokationen?.forEach((melo, idx) => {
    if (!melo.valid && typeof addValidationError === 'function') {
      addValidationError(
        'AHB',
        `Messlokations-ID ${idx + 1} ungültig: ${melo.id} (erwartet: 33-stellig)`,
        'ERROR'
      );
    }
  });
}

function validateTemporalConsistency(dates, addValidationError) {
  if (dates.start_date && dates.end_date) {
    const start = new Date(dates.start_date);
    const end = new Date(dates.end_date);

    if (start > end && typeof addValidationError === 'function') {
      addValidationError(
        'AHB',
        `Start-Datum (${dates.start_date}) liegt nach End-Datum (${dates.end_date})`,
        'ERROR'
      );
    }
  }
}

function validateRequiredSegmentGroups(messageType, segments, addValidationWarning) {
  const sgMap = {
    UTILMD: ['NAD', 'IDE', 'LOC'],
    MSCONS: ['NAD', 'QTY', 'SEQ'],
    ORDERS: ['NAD', 'LIN'],
    INVOIC: ['NAD', 'MOA']
  };

  const required = sgMap[messageType] || [];
  const present = new Set(segments.map((segment) => segment.tag));

  required.forEach((tag) => {
    if (!present.has(tag) && typeof addValidationWarning === 'function') {
      addValidationWarning('AHB', `Erwartetes Segment ${tag} fehlt für ${messageType}-Nachricht`);
    }
  });
}

module.exports = {
  validateAHBRules,
  validateRolesForProcess,
  validateLocationIds,
  validateTemporalConsistency,
  validateRequiredSegmentGroups
};
