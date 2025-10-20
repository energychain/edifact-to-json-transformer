function extractInvoiceData(segments) {
  const data = {
    totals: {},
    line_items: [],
    tax_amounts: []
  };

  const moaSegments = segments.filter((segment) => segment.tag === 'MOA');
  moaSegments.forEach((moa) => {
    const qualifier = moa.elements[0]?.[0];
    const amount = moa.elements[0]?.[1];
    const currency = moa.elements[0]?.[2];
    data.totals[qualifier] = { amount, currency };
  });

  const taxSegments = segments.filter((segment) => segment.tag === 'TAX');
  taxSegments.forEach((tax) => {
    data.tax_amounts.push({
      function: tax.elements[0],
      type: tax.elements[1]?.[0],
      rate: tax.elements[4]?.[0]
    });
  });

  return data;
}

module.exports = {
  extractInvoiceData
};
