function normalizeEdifact(str) {
  return str.replace(/[\r\n\t]/g, '').replace(/\s+/g, ' ').trim();
}

function parseSegments(edifact, separators, includeRawSegments = false) {
  const segments = [];
  let i = 0;
  let currentSegment = '';

  while (i < edifact.length) {
    const char = edifact[i];
    const nextChar = edifact[i + 1];

    if (char === separators.releaseChar) {
      currentSegment += nextChar;
      i += 2;
      continue;
    }

    if (char === separators.segment) {
      if (currentSegment.trim()) {
        segments.push(parseSegment(currentSegment.trim(), separators, includeRawSegments));
      }
      currentSegment = '';
      i += 1;
      continue;
    }

    currentSegment += char;
    i += 1;
  }

  if (currentSegment.trim()) {
    segments.push(parseSegment(currentSegment.trim(), separators, includeRawSegments));
  }

  return segments;
}

function parseSegment(segmentStr, separators, includeRawSegments) {
  const parts = segmentStr.split(separators.dataElement);
  const tag = parts[0];
  const elements = parts.slice(1).map((el) => parseElement(el, separators));

  return {
    tag,
    elements,
    raw: includeRawSegments ? segmentStr : undefined
  };
}

function parseElement(elementStr, separators) {
  if (elementStr.includes(separators.componentElement)) {
    return elementStr.split(separators.componentElement).map((component) => parseValue(component, separators));
  }

  return parseValue(elementStr, separators);
}

function parseValue(val, separators) {
  if (!val) return null;

  if (val.includes(separators.decimal)) {
    const num = parseFloat(val.replace(separators.decimal, '.'));
    return Number.isNaN(num) ? val : num;
  }

  if (/^\d+$/.test(val)) {
    return parseInt(val, 10);
  }

  return val;
}

module.exports = {
  normalizeEdifact,
  parseSegments,
  parseSegment,
  parseElement,
  parseValue
};
