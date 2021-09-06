const colors = require("colors");

/**
 * @description Colours the text red.
 * @param {string} text - Text to be coloured.
 * @returns {string} Red text.
 */
function error(text) {
  return colors.red(text);
}

/**
 * @description Colours the text yellow.
 * @param {string} text - Text to be coloured.
 * @returns {string} Yellow text.
 */
function info(text) {
  return colors.yellow(text);
}

/**
 * @description Colours the text green.
 * @param {string} text - Text to be coloured.
 * @returns {string} Green text.
 */
function success(text) {
  return colors.green(text);
}

/**
 * @description Boldens the text.
 * @param {string} text - Text to be boldened.
 * @returns {string} Bold text.
 */
function bold(text) {
  return colors.bold(text);
}

/**
 * @description Makes text yellow and bold
 * @param {string} text - Text to be formatted for warning.
 * @returns {string} Yellow and bold text.
 */
function warning(text) {
  return colors.bold(colors.yellow(text));
}

/**
 * @description Colours the text magenta.
 * @param {string} text - Text to be coloured.
 * @returns {string} Magenta text.
 */
function debug(text) {
  return colors.magenta(text);
}

/**
 * @description Encloses given text in a box.
 * @param {string} text - Text to be enclosed in a box.
 * @returns {string} Text enclosed in a box.
 */
function box(text) {
  const linesArray = text.split("\n");

  //Find the width of the widest line
  const widestLineWidth = Math.max(
    ...linesArray.map((line) => {
      return colors.stripColors(line).length;
    })
  );

  //Append whitespace at the end of each line to match the widest line and format lines
  linesArray.forEach((line, index) => {
    const numOfWhitespaces = widestLineWidth - colors.stripColors(line).length;
    let whitespaces = "";
    for (let i = 0; i < numOfWhitespaces; i++) {
      whitespaces = whitespaces.concat(" ");
    }
    linesArray[index] = `| ${line}${whitespaces} |`;
  });

  let horizontalLine = "";
  //+4 comes for "|  |"
  for (let i = 0; i < widestLineWidth + 4; i++) {
    horizontalLine = horizontalLine + "-";
  }
  return `${horizontalLine}\n${linesArray.join("\n")}\n${horizontalLine}`;
}

const formatter = {
  success,
  info,
  error,
  bold,
  warning,
  debug,
  box,
};

module.exports = formatter;
