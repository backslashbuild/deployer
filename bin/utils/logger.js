const colors = require("colors");
const shell = require("shelljs");

/**
 * @description Colours the text red.
 * @param {string} text - Text to be coloured.
 */
function err(text) {
  return colors.red(text);
}

/**
 * @description Colours the text yellow.
 * @param {string} text - Text to be coloured.
 */
function info(text) {
  return colors.yellow(text);
}

/**
 * @description Colours the text green.
 * @param {string} text - Text to be coloured.
 */
function success(text) {
  return colors.green(text);
}

/**
 * @description Logs passed text, suppressed by global silent flag. Can be overwridden by shout option.
 * @param {string} text - Text to be logged.
 * @param {boolean} shout - Optional Parameter. Set to true to override global quiet flag. Defaults to false.
 */
function log(text, shout = false) {
  if (process.env.QUIET_FLAG === "false" || shout) {
    console.log(text);
  }
}

module.exports = { err, info, success, log };
