const fetch = require("node-fetch");
const fs = require("fs");
const path = require("path");
const { logger, formatter } = require("../../utils/textUtils");

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
  const installPath = process.env.INSTALL_PATH;
  const deployerPackageJsonPath = path.resolve(installPath, "package.json");
  try {
    fs.accessSync(deployerPackageJsonPath, fs.R_OK);
  } catch (e) {
    logger.error(
      formatter.warning(`Warning: Failed to check for updates, cannot access local package.json.`)
    );
    return;
  }

  let localPackageJson;
  try {
    const packageJsonText = fs.readFileSync(deployerPackageJsonPath, "utf8");
    localPackageJson = JSON.parse(packageJsonText);
  } catch (e) {
    logger.error(
      formatter.warning(`Warning: Failed to check for updates, cannot parse local package.json.`)
    );
    return;
  }

  let remotePackageJson;
  try {
    remotePackageJson = await getRemotePackageJson();
  } catch (e) {
    logger.error(
      formatter.warning(`Warning: Failed to check for updates, cannot fetch remote package.json.`)
    );
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
