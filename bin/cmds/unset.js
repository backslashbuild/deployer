const { logger } = require("../utils/logger");
const fs = require("fs");
const defaultConfig = require("../res/defaultConfig");

exports.command = "unset <key>";
exports.desc = "Reverts the key to its default value.";
exports.builder = (yargs) => {
  yargs.check((argv) => {
    const acceptableKeys = Object.keys(defaultConfig);
    if (!acceptableKeys.includes(argv.key)) {
      throw new Error(
        logger.err(
          `Key ${argv.key} is not supported. Acceptable keys are: ${acceptableKeys.join()}.`
        )
      );
    }
    return true;
  });
};
exports.handler = function (argv) {
  const configFileText = fs.readFileSync(argv.configFilePath, "utf8");
  const configFile = JSON.parse(configFileText);
  configFile[argv.key] = defaultConfig[argv.key];
  fs.writeFileSync(argv.configFilePath, JSON.stringify(configFile));
  console.log(
    `${logger.success(
      `Config key ${logger.info(argv.key)} has been successfully reverted to default.`
    )}`
  );
};
