const { logger, formatter } = require("../../utils/textUtils");
const fs = require("fs");
const { deployerConfigFilePath, defaultConfig } = require("../../utils/configUtils");

exports.command = "reset";
exports.desc = "Reverts all config keys to default values.";
exports.builder = (yargs) => {};
exports.handler = function (argv) {
  fs.writeFileSync(deployerConfigFilePath, JSON.stringify(defaultConfig));
  logger.info(`${formatter.success(`The Deployer config has been reset to the default values.`)}`);
};
