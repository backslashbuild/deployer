const { logger } = require("../../utils/logger");
const fs = require("fs");
const defaultConfig = require("../../res/defaultConfig");

exports.command = "unset <key>";
exports.desc = "Reverts the key to its default value.";
exports.builder = (yargs) => {
  yargs.check((argv) => {
    const acceptableKeys = Object.keys(defaultConfig);
    if (!acceptableKeys.includes(argv.key)) {
      throw new Error(
        logger.err(
          `Key ${argv.key} is not supported. Acceptable keys are:\n${acceptableKeys.join()}`
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
  console.log(
    `${logger.success(
      `Config key ${logger.info(argv.key)} has been successfully reverted to default.`
    )}`
  );
};
