const {
  generateTestUTILMD,
  generateTestMSCONS,
  generateTestAPERAK,
  generateInvalidEdifact
} = require('../src/utils/testDataGenerator');
const { EdifactTransformer } = require('../src');

describe('Test Data Generator', () => {
  let transformer;

  beforeEach(() => {
    transformer = new EdifactTransformer();
  });

  describe('generateTestUTILMD', () => {
    it('generates valid UTILMD message', () => {
      const edifact = generateTestUTILMD();
      expect(edifact).toContain('UNH+');
      expect(edifact).toContain('UTILMD');
      expect(edifact).toContain('UNT+');
    });

    it('accepts custom parameters', () => {
      const edifact = generateTestUTILMD({
        marktlokationId: '99999999999',
        pruefidentifikator: '55555'
      });

      expect(edifact).toContain('99999999999');
      expect(edifact).toContain('55555');
    });

    it('produces parseable EDIFACT', () => {
      const edifact = generateTestUTILMD();
      const result = transformer.transform(edifact);

      expect(result.metadata.message_type).toBe('UTILMD');
      expect(result.body.stammdaten).toBeDefined();
    });
  });

  describe('generateTestMSCONS', () => {
    it('generates valid MSCONS message', () => {
      const edifact = generateTestMSCONS();
      expect(edifact).toContain('MSCONS');
      expect(edifact).toContain('QTY+');
    });

    it('accepts custom consumption values', () => {
      const edifact = generateTestMSCONS({
        verbrauch: '9999',
        einheit: 'MWH'
      });

      expect(edifact).toContain('9999');
      expect(edifact).toContain('MWH');
    });

    it('produces parseable EDIFACT', () => {
      const edifact = generateTestMSCONS();
      const result = transformer.transform(edifact);

      expect(result.metadata.message_type).toBe('MSCONS');
    });
  });

  describe('generateTestAPERAK', () => {
    it('generates positive acknowledgement', () => {
      const edifact = generateTestAPERAK({ status: 'positive' });
      expect(edifact).toContain('APERAK');
      expect(edifact).toContain('+7'); // Function code 7 = positive
    });

    it('generates negative acknowledgement', () => {
      const edifact = generateTestAPERAK({ status: 'negative' });
      expect(edifact).toContain('+27'); // Function code 27 = negative
    });

    it('produces parseable EDIFACT', () => {
      const edifact = generateTestAPERAK({ status: 'positive' });
      const result = transformer.transform(edifact);

      expect(result.metadata.message_type).toBe('APERAK');
      expect(result.body.quittierung).toBeDefined();
    });
  });

  describe('generateInvalidEdifact', () => {
    it('generates message without UNH', () => {
      const edifact = generateInvalidEdifact('missing_unh');
      expect(edifact).not.toContain('UNH+');
    });

    it('generates message without UNT', () => {
      const edifact = generateInvalidEdifact('missing_unt');
      expect(edifact).toContain('UNH+');
      expect(edifact).not.toContain('UNT+');
    });

    it('generates malformed segments', () => {
      const edifact = generateInvalidEdifact('invalid_segment');
      expect(edifact).toContain('INVALID_SEGMENT');
    });

    it('returns error object when parsing invalid EDIFACT', () => {
      const edifact = generateInvalidEdifact('missing_unt');
      const result = transformer.transform(edifact);
      
      // Transformer gibt error object zurück statt zu werfen
      expect(result.error).toBe(true);
      expect(result.message).toBeDefined();
    });
  });
});
