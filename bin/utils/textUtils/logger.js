const util = require("util");
const formatter = require("./formatter");

/**
 * Enum for loglevel values.
 * @enum {number}
 */
var loglevels = { OFF: 0, FATAL: 1, ERROR: 2, WARN: 3, INFO: 4, DEBUG: 5, TRACE: 6, ALL: 7 };

/**
 * @description Asserts whether given loglevel should or should not log.
 * @param {loglevels} loglevel - The loglevel to assert whether it should be logging or not.
 * @returns true if given log level should not log.
 */
function isLevelSilent(loglevel) {
  if (!process.env.LOG_LEVEL) {
    return loglevels.FATAL < loglevel;
  }
  return process.env.LOG_LEVEL < loglevel;
}

/**
 * @description Asserts whether the command is running in debug mode or not.
 * @returns {boolean} True if the loglevel of the command is loglevels.DEBUG (5) or higher.
 */
function isDebugMode() {
  return !isLevelSilent(loglevels.DEBUG);
}

/**
 * @description Takes a list of strings and logs them using the <printFunc> if the <loglevel> provided is not silenced.
 *              For flags higher or equal to loglevels.DEBUG (5) additional formatting is added.
 * @param {Array<string>} textList - The array of strings to be logged
 * @param {loglevels} loglevel - The loglevel at which the text should be printed.
 * @param {(string)=>void} printFunc
 */
function log(textList, loglevel, printFunc) {
  if (!isLevelSilent(loglevel)) {
    if (isDebugMode()) {
      printFunc(
        formatter.debug(
          `[${Object.keys(loglevels).find((level) => loglevels[level] === loglevel)}]`
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
  log(textList, loglevels.FATAL, console.error);
}

/**
 * @description Logs passed text, if LOG_LEVEL is higher or equal to error (2)
 * @param {Array<string>} textList - Text to be logged.
 */
function error(...textList) {
  log(textList, loglevels.ERROR, console.error);
}

/**
 * @description Logs passed text, if LOG_LEVEL is higher or equal to warn (3)
 * @param {Array<string>} textList - Text to be logged.
 */
function warn(...textList) {
  log(textList, loglevels.WARN, console.error);
}

/**
 * @description Logs passed text, if LOG_LEVEL is higher or equal to info (4)
 * @param {Array<string>} textList - Text to be logged.
 */
function info(...textList) {
  log(textList, loglevels.INFO, console.log);
}

/**
 * @description Logs passed text, if LOG_LEVEL is higher or equal to debug (5)
 * @param {Array<string>} textList - Text to be logged.
 */
function debug(...textList) {
  log(textList, loglevels.DEBUG, console.log);
}

/**
 * @description Logs passed text, if LOG_LEVEL is higher or equal to trace (6)
 * @param {Array<string>} textList - Text to be logged.
 */
function trace(...textList) {
  log(textList, loglevels.TRACE, console.log);
}

const logger = {
  fatal,
  error,
  warn,
  info,
  debug,
  trace,
  isLevelSilent,
  loglevels,
};

module.exports = logger;
