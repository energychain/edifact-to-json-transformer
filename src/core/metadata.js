function extractPruefidentifikator(segments, pruefidentifikatoren) {
  const rffSegments = segments.filter((segment) => segment.tag === 'RFF');

  for (const rff of rffSegments) {
    const qualifier = rff.elements[0]?.[0];
    if (qualifier === 'Z13') {
      const pruefId = rff.elements[0]?.[1];
      return {
        id: pruefId,
        description: pruefidentifikatoren[pruefId] || 'Unbekannt',
        raw_segment: rff
      };
    }
  }

  return null;
}

function extractHeader(segments) {
  const bgm = segments.find((segment) => segment.tag === 'BGM');
  const header = {};

  if (bgm) {
    header.document_code = bgm.elements[0];
    header.document_number = bgm.elements[1];
    header.message_function = bgm.elements[2];
  }

  return header;
}

function extractParties(segments, context = {}) {
  const { addValidationWarning } = context;
  const parties = {};

  segments.filter((segment) => segment.tag === 'NAD').forEach((nad) => {
    const role = nad.elements[0];
    const id = nad.elements[1]?.[0];
    const idType = nad.elements[1]?.[2];
    const name = nad.elements[3]?.[0];

    const roleMapping = {
      MS: 'sender',
      MR: 'receiver',
      DP: 'lieferant',
      DDQ: 'netzbetreiber',
      DDP: 'messstellenbetreiber',
      DDK: 'bilanzkoordinator',
      E01: 'grundversorger',
      E02: 'ersatzversorger'
    };

    const mappedRole = roleMapping[role] || role;
    const isValidMpId = id && id.length === 13 && /^\d{13}$/.test(id);

    if (id && !isValidMpId && typeof addValidationWarning === 'function') {
      addValidationWarning(
        'NAD',
        `MP-ID hat nicht das erwartete Format (13-stellig numerisch): ${id}`
      );
    }

    parties[mappedRole] = {
      id,
      id_type: idType,
      name,
      role,
      valid_mp_id: isValidMpId
    };
  });

  return parties;
}

function extractDates(segments, parseDate) {
  const dates = {};

  segments.filter((segment) => segment.tag === 'DTM').forEach((dtm) => {
    const qualifier = dtm.elements[0]?.[0];
    const dateValue = dtm.elements[0]?.[1];
    const format = dtm.elements[0]?.[2];

    const dateMapping = {
      '137': 'message_date',
      '163': 'start_date',
      '164': 'end_date',
      '735': 'meter_reading_date',
      '392': 'payment_due_date'
    };

    const key = dateMapping[qualifier] || `date_${qualifier}`;
    dates[key] = parseDate ? parseDate(dateValue, format) : dateValue;
  });

  return dates;
}

function extractReferences(segments) {
  const refs = {};

  segments.filter((segment) => segment.tag === 'RFF').forEach((rff) => {
    const qualifier = rff.elements[0]?.[0];
    const reference = rff.elements[0]?.[1];

    const refMapping = {
      Z13: 'pruefidentifikator',
      Z14: 'marktlokation_id',
      Z15: 'messlokation_id',
      Z16: 'zaehlpunkt_id',
      Z17: 'geraete_nummer',
      Z18: 'hersteller_id',
      ADE: 'vertrags_konto_nummer',
      API: 'zusaetzliche_referenz'
    };

    const key = refMapping[qualifier] || `ref_${qualifier}`;
    refs[key] = reference;
  });

  return refs;
}

module.exports = {
  extractPruefidentifikator,
  extractHeader,
  extractParties,
  extractDates,
  extractReferences
};
