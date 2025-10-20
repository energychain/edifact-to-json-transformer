function parseDate(dateStr, format) {
  if (!dateStr) return null;

  try {
    if (format === '102' && dateStr.length === 8) {
      const y = dateStr.substring(0, 4);
      const m = dateStr.substring(4, 6);
      const d = dateStr.substring(6, 8);
      return `${y}-${m}-${d}`;
    }

    if (format === '203' && dateStr.length === 12) {
      const y = dateStr.substring(0, 4);
      const m = dateStr.substring(4, 6);
      const d = dateStr.substring(6, 8);
      const h = dateStr.substring(8, 10);
      const min = dateStr.substring(10, 12);
      return `${y}-${m}-${d}T${h}:${min}:00Z`;
    }

    if (format === '303' && dateStr.length === 14) {
      const y = dateStr.substring(0, 4);
      const m = dateStr.substring(4, 6);
      const d = dateStr.substring(6, 8);
      const h = dateStr.substring(8, 10);
      const min = dateStr.substring(10, 12);
      const s = dateStr.substring(12, 14);
      return `${y}-${m}-${d}T${h}:${min}:${s}Z`;
    }

    return dateStr;
  } catch (error) {
    return dateStr;
  }
}

module.exports = {
  parseDate
};
