const fetch = require("node-fetch");
const localPackageJson = require("../../../package.json");
const { logger, formatter } = require("../../utils/textUtils");

/**
 * @description Fetches the patch-notes.json of the master branch from Deployer's repository and parses its contents into an object.
 * @returns {object} Parsed patch-notes.json from remote.
 */
async function getRemotePatchNotes() {
  const requestUrl = `https://raw.githubusercontent.com/backslashbuild/deployer/master/patch-notes.json`;
  const result = await fetch(requestUrl, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  }).then(async (r) => {
    const responseText = await r.text();
    return JSON.parse(responseText);
  });
  return result;
}

/**
 * @description Prints a single noteObject. Uses printFunc to print the noteObject.note and passes noteObject.children
 * to printNotes recursively with an increased depth. Depth is used to calculate the indentation.
 * @param {{note:string,children:[noteObject:object]}} noteObject - Note object to be printed.
 * @param {number} depth - Indentation depth of note to be printed.
 * @param {(text:string)=>void} printFunc - Function used to print.
 */
function printNote(noteObject, depth, printFunc) {
  const whiteSpace = new Array(depth + 1).join("\t");
  printFunc(`${whiteSpace}* ${noteObject.note}`);
  if (noteObject.children) {
    printNotes(noteObject.children, depth + 1, printFunc);
  }
}

/**
 * @description Prints an array of noteObjects. Calls printNote for each noteObject in the array provided.
 * @param {[{note:string,children:[noteObject:object]}]} notesArray - Array of note objects to be printed.
 * @param {number} depth - Indentation depth of note to be printed.
 * @param {(text:string)=>void} printFunc - Function used to print.
 */
function printNotes(notesArray, depth, printFunc) {
  notesArray.forEach((note) => {
    printNote(note, depth, printFunc);
  });
}

/**
 * @description Prints the patch notes of given version
 * @param {string} version - Version in the format "X.Y.Z".
 * @param {object} patchNotes - Patch notes object as read from patch-notes.json file.
 * @param {(text:string)=>void} printFunc - Function used to print.
 */
function printPatchNotes(version, patchNotes, printFunc) {
  let depth = 0;
  printFunc("");
  printFunc(`  ${formatter.warning(version)}`);
  printFunc(formatter.success("---------"));
  printNotes(patchNotes[version].notes, depth, printFunc);
  printFunc("");
}

/**
 * @description Finds which version numbers are newer than local version and prints their patch notes.
 * @param {string} localVersion - Version of deployer as read from local package.json.
 * @param {(text:string)=>void} printFunc - Function used to print.
 */
async function printUpdates(localVersion, printFunc) {
  //try catch is required here until master contains patch-notes.json
  try {
    const remotePatchNotes = await getRemotePatchNotes();
    const updates = Object.keys(remotePatchNotes).filter(
      (version) => versionComparator(localVersion, version) < 0
    );
    updates.forEach((version) => {
      printPatchNotes(version, remotePatchNotes, printFunc);
    });
  } catch (e) {}
}

/**
 * @description Fetches the package.json of the master branch from Deployer's repository and parses its contents into an object.
 * @returns {object} Parsed package.json from remote.
 */
async function getRemotePackageJson() {
  const requestUrl = `https://raw.githubusercontent.com/backslashbuild/deployer/master/package.json`;
  const result = await fetch(requestUrl, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
    },
  }).then(async (r) => {
    const responseText = await r.text();
    return JSON.parse(responseText);
  });
  return result;
}

/**
 * @description Asserts whether an update is required by comparing localVersion with remoteVersion params.
 * @param {{string,string}} params
 * @param {string} localVersion - The version as read from the package.json at the install directory of deployer.
 * @param {string} remoteVersion - The version as read from the package.json at the remote deployer repository.
 * @returns {boolean} Whether localVersion is lower than remoteVersion.
 */
function versionComparator(left, right) {
  const leftParts = left.split(".");
  const rightParts = right.split(".");
  for (let i = 0; i < leftParts.length; i++) {
    if (parseInt(leftParts[i]) > parseInt(rightParts[i])) {
      return 1;
    }
    if (parseInt(leftParts[i]) < parseInt(rightParts[i])) {
      return -1;
    }
  }
  return 0;
}

/**
 * @description Asserts whether an update is required by comparing localVersion with remoteVersion params.
 * @param {{string,string}} params
 * @param {string} localVersion - The version as read from the package.json at the install directory of deployer.
 * @param {string} remoteVersion - The version as read from the package.json at the remote deployer repository.
 * @returns {boolean} Whether localVersion is lower than remoteVersion.
 */
function isUpdateRequired({ localVersion, remoteVersion }) {
  return versionComparator(localVersion, remoteVersion) === -1;
}

/**
 * @description Yargs middleware that is responsible for reading the local deployer version from the package.json
 * at install directory and fetching the lastest deployer version from remote deployer repositry and asserting whether
 * an upgrade is required. If an update is required a message will be printed.
 *
 * @returns {Promise<void>} An awaitable promise when the check for updates is done.
 */
async function checkForUpdatesMiddleware() {
  let remotePackageJson;
  try {
    remotePackageJson = await getRemotePackageJson();
  } catch (e) {
    logger.error(
      formatter.warning(`Warning: Failed to check for updates, cannot fetch remote package.json.`)
    );
    logger.debug(e);
    return;
  }
  if (
    isUpdateRequired({
      localVersion: localPackageJson.version,
      remoteVersion: remotePackageJson.version,
    })
  ) {
    logger.error(
      formatter.box(
        `Update available ${localPackageJson.version} -> ${
          remotePackageJson.version
        }. Please run:\n${formatter.warning(
          "npm install -g https://github.com/backslashbuild/deployer"
        )}\nto install the update`
      )
    );
    await printUpdates(localPackageJson.version, logger.info);
  }
}

module.exports = checkForUpdatesMiddleware;
