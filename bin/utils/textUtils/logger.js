const util = require("util");
const formatter = require("./formatter");

/**
 * Enum for logLevel values.
 * @enum {number}
 */
var logLevels = { OFF: 0, FATAL: 1, ERROR: 2, WARN: 3, INFO: 4, DEBUG: 5, TRACE: 6, ALL: 7 };

/**
 * @description Asserts whether given logLevel should or should not log.
 * @param {logLevels} logLevel - The logLevel to assert whether it should be logging or not.
 * @returns true if given log level should not log.
 */
function isLevelSilent(logLevel) {
  if (!process.env.LOG_LEVEL) {
    return logLevels.FATAL < logLevel;
  }
  return process.env.LOG_LEVEL < logLevel;
}

/**
 * @description Asserts whether the command is running in debug mode or not.
 * @returns {boolean} True if the logLevel of the command is logLevels.DEBUG (5) or higher.
 */
function isDebugMode() {
  return !isLevelSilent(logLevels.ALL);
}

/**
 * @description Takes a list of strings and logs them using the <printFunc> if the <logLevel> provided is not silenced.
 *              For flags higher or equal to logLevels.DEBUG (5) additional formatting is added.
 * @param {Array<string>} textList - The array of strings to be logged
 * @param {logLevels} logLevel - The logLevel at which the text should be printed.
 * @param {(string)=>void} printFunc
 */
function log(textList, logLevel, printFunc) {
  if (!isLevelSilent(logLevel)) {
    if (isDebugMode()) {
      printFunc(
        formatter.debug(
          `[${Object.keys(logLevels).find((level) => logLevels[level] === logLevel)}]`
        )
      );
    }
    textList.forEach((line) => {
      printFunc(`${typeof line === "object" ? util.inspect(line, { depth: null }) : line}`);
    });
    isDebugMode() && printFunc("");
  }
}

/**
 * @description Logs passed text, if LOG_LEVEL is greater or equal to fatal (1)
 * @param {Array<string>} textList - Text to be logged.
 */
function fatal(...textList) {
  log(textList, logLevels.FATAL, console.error);
}

/**
 * @description Logs passed text, if LOG_LEVEL is higher or equal to error (2)
 * @param {Array<string>} textList - Text to be logged.
 */
function error(...textList) {
  log(textList, logLevels.ERROR, console.error);
}

/**
 * @description Logs passed text, if LOG_LEVEL is higher or equal to warn (3)
 * @param {Array<string>} textList - Text to be logged.
 */
function warn(...textList) {
  log(textList, logLevels.WARN, console.error);
}

/**
 * @description Logs passed text, if LOG_LEVEL is higher or equal to info (4)
 * @param {Array<string>} textList - Text to be logged.
 */
function info(...textList) {
  log(textList, logLevels.INFO, console.log);
}

/**
 * @description Logs passed text, if LOG_LEVEL is higher or equal to debug (5)
 * @param {Array<string>} textList - Text to be logged.
 */
function debug(...textList) {
  log(textList, logLevels.DEBUG, console.log);
}

/**
 * @description Logs passed text, if LOG_LEVEL is higher or equal to trace (6)
 * @param {Array<string>} textList - Text to be logged.
 */
function trace(...textList) {
  log(textList, logLevels.TRACE, console.log);
}

const logger = {
  fatal,
  error,
  warn,
  info,
  debug,
  trace,
  isLevelSilent,
  logLevels,
};

module.exports = logger;
