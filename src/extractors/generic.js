function extractGenericData(segments) {
  return {
    segment_count: segments.length,
    segment_types: [...new Set(segments.map((segment) => segment.tag))]
  };
}

module.exports = {
  extractGenericData
};
