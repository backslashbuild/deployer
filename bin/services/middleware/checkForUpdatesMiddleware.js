const fetch = require("node-fetch");
const fs = require("fs");
const path = require("path");
const { logger } = require("../../utils/logger");

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

async function checkForUpdatesMiddleware({ installPath }) {
  const deployerPackageJsonPath = path.resolve(installPath, "package.json");
  try {
    fs.accessSync(deployerPackageJsonPath, fs.R_OK);
  } catch (e) {
    console.log(
      `${logger.err("Warning:")} ${logger.info(
        "Failed to check for updates, cannot access local package.json."
      )}`
    );
    return;
  }

  let localPackageJson;
  try {
    const packageJsonText = fs.readFileSync(deployerPackageJsonPath, "utf8");
    localPackageJson = JSON.parse(packageJsonText);
  } catch (e) {
    console.log(
      `${logger.err("Warning:")} ${logger.info(
        "Failed to check for updates, cannot parse local package.json."
      )}`
    );
    return;
  }

  let remotePackageJson;
  try {
    remotePackageJson = await getRemotePackageJson();
  } catch (e) {
    console.log(
      `${logger.err("Warning:")} ${logger.info(
        "Failed to check for updates, cannot fetch remote package.json."
      )}`
    );
    return;
  }

  if (
    isUpdateRequired({
      localVersion: localPackageJson.version,
      remoteVersion: remotePackageJson.version,
    })
  ) {
    console.log("-------------------------------------------------------------");
    console.log(
      `| A new version of deployer was found. Please run:          |\n| ${logger.info(
        "npm install -g https://github.com/backslashbuild/deployer"
      )} |\n| to install the update                                     |`
    );
    console.log("-------------------------------------------------------------");
  }
}

module.exports = checkForUpdatesMiddleware;
