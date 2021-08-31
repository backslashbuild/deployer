const { logger, formatter } = require("../../utils/textUtils");
const fs = require("fs");
const defaultConfig = require("../../res/defaultConfig.json");
const { deployerConfigFilePath } = require("../../utils/configUtils");

exports.command = "set <key> <value>";
exports.desc = "Sets the key and value pair in the config.";
exports.builder = (yargs) => {
  yargs.check((argv) => {
    const acceptableKeys = Object.keys(defaultConfig).map((element) => element.toLowerCase());
    if (!acceptableKeys.includes(argv.key.toLowerCase())) {
      throw new Error(
        formatter.error(
          `Key ${argv.key} is not supported. Acceptable keys are:\n${acceptableKeys.join(", ")}`
        )
      );
    }

    //Coerce user input to correct config
    switch (argv.key.toLowerCase()) {
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
        //if loglevel is given as a number, clamp it to accepted range and match correct loglevel name
        if (typeof argv.value === "number") {
          if (argv.value < logger.loglevels.OFF) {
            argv.value = logger.loglevels.OFF;
          } else if (argv.value > logger.loglevels.ALL) {
            argv.value = logger.loglevels.ALL;
          }
          argv.value = Object.keys(logger.loglevels).find(
            (level) => logger.loglevels[level] === argv.value
          );
        }
        //if loglevel is given as a name, format it correclty to check if it is a valid loglevel name
        else {
          if (!Object.keys(logger.loglevels).includes(argv.value.toString().toUpperCase())) {
            throw new Error(
              formatter.error(
                `Log level can only be between 0-7 or one of the option: ${Object.keys(
                  logger.loglevels
                ).join(", ")}`
              )
            );
          } else {
            argv.value = argv.value.toString().toUpperCase();
          }
        }
    }
    return true;
  });
};
exports.handler = function (argv) {
  const configFile = argv.deployerConfig;
  configFile[argv.key] = argv.value;
  fs.writeFileSync(deployerConfigFilePath, JSON.stringify(configFile));
  logger.info(
    `${formatter.success(
      `Config key ${formatter.info(argv.key)} has been successfully set to ${formatter.info(
        argv.value
      )}.`
    )}`
  );
};
