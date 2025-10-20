/**
 * UTILMD (Stammdaten) deckt zentrale Identifikatoren ab: Marktlokationen (`IDE+24`), Messlokationen (`IDE+25`),
 * Lokationen (`LOC`) und Bilanzkreise (`CCI`). Die Funktion liefert strukturierte Arrays und markiert
 * Validierungsauffälligkeiten (z. B. falsche Längen) über den übergebenen Kontext.
 */
function extractUtilmdData(segments, context = {}) {
  const { addValidationWarning } = context;

  const data = {
    marktlokationen: [],
    messlokationen: [],
    zaehlpunkte: [],
    locations: [],
    bilanzkreise: []
  };

  const ideSegments = segments.filter((segment) => segment.tag === 'IDE');
  ideSegments.forEach((ide) => {
    const firstElement = ide.elements[0];
    const secondElement = ide.elements[1];

    let objType = firstElement;
    let objId = secondElement;

    if (Array.isArray(firstElement)) {
      objType = firstElement[0];
      objId = firstElement[1] ?? secondElement;
    }

    const objTypeCode = objType != null ? String(objType) : undefined;
    const objIdValue = objId != null ? String(objId) : undefined;

    if (objTypeCode === '24') {
      data.marktlokationen.push({
        id: objIdValue,
        valid: objIdValue ? objIdValue.length === 11 : false
      });

      if (objIdValue && objIdValue.length !== 11 && typeof addValidationWarning === 'function') {
        addValidationWarning(
          'UTILMD',
          `Marktlokations-ID hat nicht die erwartete Länge von 11 Zeichen: ${objIdValue}`
        );
      }
    } else if (objTypeCode === '25') {
      data.messlokationen.push({
        id: objIdValue,
        valid: objIdValue ? objIdValue.length === 33 : false
      });

      if (objIdValue && objIdValue.length !== 33 && typeof addValidationWarning === 'function') {
        addValidationWarning(
          'UTILMD',
          `Messlokations-ID hat nicht die erwartete Länge von 33 Zeichen: ${objIdValue}`
        );
      }
    }
  });

  const locSegments = segments.filter((segment) => segment.tag === 'LOC');
  locSegments.forEach((loc) => {
    data.locations.push({
      qualifier: loc.elements[0],
      id: loc.elements[1]?.[0],
      code: loc.elements[1]?.[1]
    });
  });

  const cciSegments = segments.filter((segment) => segment.tag === 'CCI');
  cciSegments.forEach((cci) => {
    const classType = cci.elements[0];
    const bilanzkreis = cci.elements[2]?.[0];

    if (classType === 'Z19' && bilanzkreis) {
      data.bilanzkreise.push({
        id: bilanzkreis,
        type: 'Bilanzkreis'
      });
    }
  });

  return data;
}

module.exports = {
  extractUtilmdData
};
