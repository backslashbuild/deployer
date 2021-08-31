const fetch = require("node-fetch");
const localPackageJson = require("../../../package.json");
const { logger, formatter } = require("../../utils/textUtils");

/**
 * @description Fetches the package.json of the master branch from Deployer's repository and parses its contents into an object.
 * @returns {object} Parsed package.json from remote.
 */
async function getRemotePatchNotes() {
  const requestUrl =
    "https://raw.githubusercontent.com/backslashbuild/deployer/master/package.json";
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

/**
 * @description Fetches the package.json of the master branch from Deployer's repository and parses its contents into an object.
 * @returns {object} Parsed package.json from remote.
 */
async function getRemotePackageJson() {
  const requestUrl =
    "https://raw.githubusercontent.com/backslashbuild/deployer/master/package.json";
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
function isUpdateRequired({ localVersion, remoteVersion }) {
  const localVersionParts = localVersion.split(".");
  const remoteVersionParts = remoteVersion.split(".");
  for (let i = 0; i < localVersionParts.length; i++) {
    if (parseInt(localVersionParts[i]) > parseInt(remoteVersionParts[i])) {
      return false;
    }
    if (parseInt(localVersionParts[i]) < parseInt(remoteVersionParts[i])) {
      return true;
    }
  }
  return false;
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
        `A new version of deployer was found. Please run:\n${formatter.warning(
          "npm install -g https://github.com/backslashbuild/deployer"
        )}\nto install the update`
      )
    );
  }
}

module.exports = checkForUpdatesMiddleware;
