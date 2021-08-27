const { logger } = require("../../utils/logger");
const fs = require("fs");
const defaultConfig = require("../../res/defaultConfig");

exports.command = "reset";
exports.desc = "Reverts all config keys to default values.";
exports.builder = (yargs) => {};
exports.handler = function (argv) {
  const configFile = argv.deployerConfig;
  configFile[argv.key] = defaultConfig[argv.key];
  fs.writeFileSync(argv.deployerConfigFilePath, JSON.stringify(defaultConfig));
  console.log(`${logger.success(`The Deployer config has been reset to the default values.`)}`);
};
