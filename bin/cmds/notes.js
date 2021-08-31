const patchNotesJson = require("../../patch-notes.json");
const { logger, formatter } = require("../utils/textUtils");

function printNote(noteObject, depth, printFunc) {
  const whiteSpace = new Array(depth + 1).join("\t");
  printFunc(`${whiteSpace}* ${noteObject.note}`);
  printNotes(noteObject.children, depth + 1, printFunc);
}

function printNotes(notesArray, depth, printFunc) {
  notesArray.forEach((note) => {
    printNote(note, depth, printFunc);
  });
}

function printPatchNotes(version, patchNotes, printFunc) {
  let depth = 0;
  printFunc("");
  printFunc(`  ${formatter.warning(version)}`);
  printFunc(formatter.success("---------"));
  printNotes(patchNotes[version].notes, depth, printFunc);
  printFunc("");
}

exports.command = "notes";
exports.desc = "Get deployer patch notes.";
exports.builder = function (yargs) {};
exports.handler = function (argv) {
  Object.keys(patchNotesJson).forEach((version) => {
    printPatchNotes(version, patchNotesJson, logger.info);
  });
};
