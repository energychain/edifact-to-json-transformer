function extractOrderData(segments) {
  const data = {
    order_lines: []
  };

  const linSegments = segments.filter((segment) => segment.tag === 'LIN');
  linSegments.forEach((lin) => {
    data.order_lines.push({
      line_number: lin.elements[0],
      item_id: lin.elements[2]?.[0],
      item_type: lin.elements[2]?.[1]
    });
  });

  return data;
}

module.exports = {
  extractOrderData
};
