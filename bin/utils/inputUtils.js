const { defaultConfig } = require("./configUtils");
const { logger } = require("./textUtils");

/**
 * @description Receives <input> and converts it to boolean.
 *
 * @param {*} input - Input as received in argv.
 * @returns {boolean} As parsed from argv.
 * @throws When input cannot be parsed to boolean.
 */
function convertInputToBoolean(input) {
  if (typeof input === "number") {
    return Boolean(input);
  } else {
    if (["true", "false"].includes(input)) {
      return input === "true";
    } else {
      throw new Error(`Invalid input "${input}", failed to parse to boolean.`);
    }
  }
}

/**
 * @description Receives <input> and converts it to log level key.
 *
 * @param {*} input - Input as received in argv.
 * @returns {string} Log level key from logger.loglevels.
 * @throws When input cannot be parsed to log level.
 */
function convertInputToLogLevel(input) {
  //if loglevel is given as a number, clamp it to accepted range and match correct loglevel name
  if (typeof input === "number") {
    if (input < logger.loglevels.OFF) {
      return logger.loglevels.OFF;
    } else if (input > logger.loglevels.ALL) {
      return logger.loglevels.ALL;
    }
    return Object.keys(logger.loglevels).find((level) => logger.loglevels[level] === input);
  }
  //if loglevel is given as a name, format it correclty to check if it is a valid loglevel name
  else {
    if (!Object.keys(logger.loglevels).includes(input.toString().toUpperCase())) {
      throw new Error(
        `Log level can only be between 0-7 or one of the option: ${Object.keys(
          logger.loglevels
        ).join(", ")}.`
      );
    } else {
      return input.toString().toUpperCase();
    }
  }
}

/**
 * @description Receives <input> and converts it to deployer config key.
 *
 * @param {*} input - Input as received in argv.
 * @returns {string} Matching config key as present in default config.
 * @throws When input cannot be parsed to deployer config key.
 */
function convertInputToDeployerConfigKey(input) {
  const key = Object.keys(defaultConfig).find(
    (element) => element.toLowerCase() === input.toLowerCase()
  );
  if (!key) {
    throw new Error(
      `Key ${input} is not supported. Accepted keys are:\n${Object.keys(defaultConfig).join(", ")}`
    );
  }
  return key;
}

module.exports = { convertInputToBoolean, convertInputToLogLevel, convertInputToDeployerConfigKey };
