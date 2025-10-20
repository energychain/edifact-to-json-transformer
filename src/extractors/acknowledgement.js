function extractAcknowledgementData(segments) {
  const data = {
    errors: [],
    adjustments: [],
    status: 'unknown'
  };

  const ercSegments = segments.filter((segment) => segment.tag === 'ERC');
  ercSegments.forEach((erc) => {
    data.errors.push({
      code: erc.elements[0]?.[0],
      description: erc.elements[0]?.[1]
    });
  });

  const ajtSegments = segments.filter((segment) => segment.tag === 'AJT');
  ajtSegments.forEach((ajt) => {
    data.adjustments.push({
      reason_code: ajt.elements[0],
      action_code: ajt.elements[1]
    });
  });

  const bgm = segments.find((segment) => segment.tag === 'BGM');
  if (bgm) {
    const funcCode = bgm.elements[2];
    data.status = funcCode === '7' ? 'positive' : funcCode === '27' ? 'negative' : 'unknown';
  }

  return data;
}

module.exports = {
  extractAcknowledgementData
};
