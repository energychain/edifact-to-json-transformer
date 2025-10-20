function validateMessageStructure(segments, context = {}) {
  const { addValidationError, addValidationWarning } = context;

  const unh = segments.find((segment) => segment.tag === 'UNH');
  const unt = segments.find((segment) => segment.tag === 'UNT');

  if (!unh) {
    if (typeof addValidationError === 'function') {
      addValidationError('STRUCTURE', 'Fehlende UNH-Segment (Nachrichtenkopf)', 'CRITICAL');
    }
    throw new Error('Fehlende UNH-Segment (Nachrichtenkopf)');
  }

  if (!unt) {
    if (typeof addValidationError === 'function') {
      addValidationError('STRUCTURE', 'Fehlendes UNT-Segment (Nachrichtenende)', 'CRITICAL');
    }
    throw new Error('Fehlendes UNT-Segment (Nachrichtenende)');
  }

  const unhRef = unh.elements[0];
  const untRef = unt.elements[1];

  if (unhRef !== untRef && typeof addValidationError === 'function') {
    addValidationError('STRUCTURE', `Referenznummer-Mismatch: UNH=${unhRef}, UNT=${untRef}`, 'ERROR');
  }

  const reportedSegmentCount = unt.elements[0];
  const actualSegmentCount = segments.length;

  if (reportedSegmentCount !== actualSegmentCount && typeof addValidationWarning === 'function') {
    addValidationWarning(
      'STRUCTURE',
      `Segmentanzahl-Diskrepanz: Gemeldet=${reportedSegmentCount}, Tatsächlich=${actualSegmentCount}`
    );
  }

  return true;
}

module.exports = {
  validateMessageStructure
};
