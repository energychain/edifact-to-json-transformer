function extractMsconsData(segments, context = {}) {
  const { parseDate } = context;

  const data = {
    messwerte: [],
    zeitreihen: [],
    messperioden: []
  };

  const qtySegments = segments.filter((segment) => segment.tag === 'QTY');
  qtySegments.forEach((qty) => {
    data.messwerte.push({
      qualifier: qty.elements[0]?.[0],
      value: qty.elements[0]?.[1],
      unit: qty.elements[0]?.[2],
      valid_unit: ['KWH', 'MWH', 'KW', 'MW'].includes(qty.elements[0]?.[2])
    });
  });

  const seqSegments = segments.filter((segment) => segment.tag === 'SEQ');
  seqSegments.forEach((seq) => {
    data.zeitreihen.push({
      sequence_number: seq.elements[0],
      action_code: seq.elements[1]
    });
  });

  const dtmSegments = segments.filter((segment) => segment.tag === 'DTM');
  dtmSegments.forEach((dtm) => {
    const qualifier = dtm.elements[0]?.[0];
    if (['163', '164'].includes(qualifier)) {
      data.messperioden.push({
        type: qualifier === '163' ? 'start' : 'end',
        datetime: parseDate ? parseDate(dtm.elements[0]?.[1], dtm.elements[0]?.[2]) : dtm.elements[0]?.[1]
      });
    }
  });

  return data;
}

module.exports = {
  extractMsconsData
};
