const { EdifactTransformer } = require('./transformer/EdifactTransformer');
const messageTypes = require('./constants/messageTypes');
const pruefidentifikatoren = require('./constants/pruefidentifikatoren');
const statusCodes = require('./constants/statusCodes');
const {
  createTransformer,
  extractAllMarktlokationIds,
  isGPKEProcess,
  convertToNeo4jCypher,
  validateAHB
} = require('./utils/helpers');
const {
  generateTestUTILMD,
  generateTestMSCONS,
  generateTestAPERAK,
  generateInvalidEdifact
} = require('./utils/testDataGenerator');

module.exports = {
  EdifactTransformer,
  createTransformer,
  extractAllMarktlokationIds,
  isGPKEProcess,
  convertToNeo4jCypher,
  validateAHB,
  messageTypes,
  pruefidentifikatoren,
  statusCodes,
  // Test utilities
  generateTestUTILMD,
  generateTestMSCONS,
  generateTestAPERAK,
  generateInvalidEdifact
};
