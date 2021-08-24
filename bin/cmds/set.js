const { logger } = require("../utils/logger");
const fs = require("fs");
const defaultConfig = require("../res/defaultConfig");

exports.command = "set <key> <value>";
exports.desc = "Sets the key and value pair in the config.";
exports.builder = (yargs) => {
  yargs.check((argv) => {
    const acceptableKeys = Object.keys(defaultConfig);
    if (!acceptableKeys.includes(argv.key)) {
      throw new Error(
        logger.err(
          `Key ${argv.key} is not supported. Acceptable keys are: ${acceptableKeys.join()}`
        )
      );
    }

    switch (argv.key) {
      case "name":
        var validCharset = /^[a-zA-Z0-9-_]+$/;
        if (!validCharset.test(argv.value)) {
          throw new Error(logger.err(`Name can only contain alphanumeric characters, "-" and "_"`));
        }
        break;
    }
    return true;
  });
};
exports.handler = function (argv) {
  const configFileText = fs.readFileSync(argv.configFilePath, "utf8");
  const configFile = JSON.parse(configFileText);
  configFile[argv.key] = argv.value;
  fs.writeFileSync(argv.configFilePath, JSON.stringify(configFile));
  console.log(
    `${logger.success(
      `Config key ${logger.info(argv.key)} has been successfully set to ${logger.info(argv.value)}`
    )}`
  );
};
