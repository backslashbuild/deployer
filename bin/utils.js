const colors = require("colors");

function err(text) {
  return colors.red(text);
}

function info(text) {
  return colors.yellow(text);
}

function success(text) {
  return colors.green(text);
}

module.exports = { err, info, success };
