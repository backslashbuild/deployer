const { logger, formatter } = require("../../utils/textUtils");
const fs = require("fs");
const defaultConfig = require("../../res/defaultConfig.json");

exports.command = "unset <key>";
exports.desc = "Reverts the key to its default value.";
exports.builder = (yargs) => {
  yargs.check((argv) => {
    const acceptableKeys = Object.keys(defaultConfig);
    if (!acceptableKeys.includes(argv.key)) {
      throw new Error(
        formatter.error(
          `Key ${argv.key} is not supported. Acceptable keys are:\n${acceptableKeys.join(", ")}`
        )
      );
    }
    return true;
  });
};
exports.handler = function (argv) {
  const configFile = argv.deployerConfig;
  configFile[argv.key] = defaultConfig[argv.key];
  fs.writeFileSync(argv.deployerConfigFilePath, JSON.stringify(configFile));
  logger.info(
    formatter.success(
      `Config key ${formatter.info(argv.key)} has been successfully reverted to default.`
    )
  );
};
