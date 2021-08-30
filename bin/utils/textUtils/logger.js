const loglevels = { OFF: 0, FATAL: 1, ERROR: 2, WARN: 3, INFO: 4, DEBUG: 5, TRACE: 6, ALL: 7 };

/**
 * @description Logs passed text, if LOG_LEVEL is greater or equal to fatal (1)
 * @param {string} text - Text to be logged.
 */
function fatal(text) {
  if (!isLevelSilent(loglevels.FATAL)) {
    console.error(text);
  }
}

/**
 * @description Logs passed text, if LOG_LEVEL is higher or equal to error (2)
 * @param {string} text - Text to be logged.
 */
function error(text) {
  if (!isLevelSilent(loglevels.ERROR)) {
    console.error(text);
  }
}

/**
 * @description Logs passed text, if LOG_LEVEL is higher or equal to warn (3)
 * @param {string} text - Text to be logged.
 */
function warn(text) {
  if (!isLevelSilent(loglevels.WARN)) {
    console.error(text);
  }
}

/**
 * @description Logs passed text, if LOG_LEVEL is higher or equal to info (4)
 * @param {string} text - Text to be logged.
 */
function info(text) {
  if (!isLevelSilent(loglevels.INFO)) {
    console.log(text);
  }
}

/**
 * @description Logs passed text, if LOG_LEVEL is higher or equal to debug (5)
 * @param {string} text - Text to be logged.
 */
function debug(text) {
  if (!isLevelSilent(loglevels.DEBUG)) {
    console.log(text);
  }
}

/**
 * @description Logs passed text, if LOG_LEVEL is higher or equal to trace (6)
 * @param {string} text - Text to be logged.
 */
function trace(text) {
  if (!isLevelSilent(loglevels.TRACE)) {
    console.log(text);
  }
}

/**
 * @description Returns whether the --quiet flag was set as a command argument.
 * @returns true if command is running in quiet mode.
 */
function isLevelSilent(loglevel) {
  if (!process.env.LOG_LEVEL) {
    return loglevels.FATAL < loglevel;
  }
  return process.env.LOG_LEVEL < loglevel;
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
