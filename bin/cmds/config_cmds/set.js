const { logger, formatter } = require("../../utils/textUtils");
const fs = require("fs");
const defaultConfig = require("../../res/defaultConfig.json");
const { deployerConfigFilePath } = require("../../utils/configUtils");
const {
  convertInputToBoolean,
  convertInputToLogLevel,
  convertInputToDeployerConfigKey,
} = require("../../utils/inputUtils");

exports.command = "set <key> <value>";
exports.desc = "Sets the key and value pair in the config.";
exports.builder = (yargs) => {
  yargs.check((argv) => {
    const key = convertInputToDeployerConfigKey(argv.key);

    //Coerce user input to correct config
    switch (key.toLowerCase()) {
      case "name":
        var validCharset = /^[a-zA-Z0-9-]+$/;
        if (!validCharset.test(argv.value)) {
          throw new Error(
            formatter.error(`Name can only contain alphanumeric characters and "-".`)
          );
        }
        argv.value = argv.value.toLowerCase();
        break;
      case "loglevel":
        argv.value = convertInputToLogLevel(argv.value);
        break;
      case "checkforupdates":
        argv.value = convertInputToBoolean(argv.value);
        break;
    }
    return true;
  });
};
exports.handler = function (argv) {
  const configFile = argv.deployerConfig;
  const matchingConfigFileKey = convertInputToDeployerConfigKey(argv.key);

  configFile[matchingConfigFileKey] = argv.value;
  fs.writeFileSync(deployerConfigFilePath, JSON.stringify(configFile));
  logger.info(
    `${formatter.success(
      `Config key ${formatter.info(
        matchingConfigFileKey
      )} has been successfully set to ${formatter.info(argv.value)}.`
    )}`
  );
};
