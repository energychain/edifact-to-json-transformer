const {
  EdifactTransformer,
  extractAllMarktlokationIds,
  convertToNeo4jCypher,
  validateAHB
} = require('../src');

describe('EdifactTransformer', () => {
  const sampleUtilmd =
    "UNH+1+UTILMD:D:11A:UN:2.6'" +
    "BGM+E01+12345+9'" +
    "DTM+137:20241019:102'" +
    "NAD+MS+9900123456789::293'" +
    "NAD+MR+9900987654321::293'" +
    "RFF+Z13:44001'" +
    "IDE+24+12345678901'" +
    "UNT+9+1'";

  it('creates metadata for UTILMD messages', () => {
    const transformer = new EdifactTransformer();
    const json = transformer.transform(sampleUtilmd);

    expect(json.metadata.message_type).toBe('UTILMD');
    expect(json.metadata.pruefidentifikator).toEqual(
      expect.objectContaining({ id: 44001 })
    );
    expect(json.body.stammdaten.marktlokationen[0]).toEqual(
      expect.objectContaining({ id: '12345678901' })
    );
  });

  it('supports helper to extract Marktlokations-IDs', () => {
    const ids = extractAllMarktlokationIds(sampleUtilmd);
    expect(ids).toEqual(['12345678901']);
  });

  it('provides Neo4j mapping statements', () => {
    const statements = convertToNeo4jCypher(sampleUtilmd);
    expect(Array.isArray(statements)).toBe(true);
    expect(statements.length).toBeGreaterThan(0);
  });

  it('validates AHB rules and reports issues', () => {
    const invalidEdifact = "UNH+1+UTILMD:D:11A:UN:2.6'BGM+E01+12345+9'UNT+3+1'";
    const report = validateAHB(invalidEdifact);
    expect(report.is_valid).toBe(false);
    expect(report.errors.length).toBeGreaterThan(0);
  });
});
