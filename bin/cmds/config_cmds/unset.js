const { logger, formatter } = require("../../utils/textUtils");
const fs = require("fs");
const { deployerConfigFilePath, defaultConfig } = require("../../utils/configUtils");
const { convertInputToDeployerConfigKey } = require("../../utils/inputUtils");

exports.command = "unset <key>";
exports.desc = "Reverts the key to its default value.";
exports.builder = (yargs) => {
  yargs.check((argv) => {
    convertInputToDeployerConfigKey(argv.key);
    return true;
  });
};
exports.handler = function (argv) {
  const configFile = argv.deployerConfig;
  const matchingConfigFileKey = convertInputToDeployerConfigKey(argv.key);

  configFile[matchingConfigFileKey] = defaultConfig[matchingConfigFileKey];
  fs.writeFileSync(deployerConfigFilePath, JSON.stringify(configFile));
  logger.info(
    formatter.success(
      `Config key ${formatter.info(
        matchingConfigFileKey
      )} has been successfully reverted to ${formatter.info(defaultConfig[matchingConfigFileKey])}.`
    )
  );
};
