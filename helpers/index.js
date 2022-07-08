const verify = require("./verify");
const constants = require("./constants");
const apis = require("./apiKeys");
const config = require("./config");

module.exports = {
  ...apis,
  config,
  ...constants,
  verify,
};
