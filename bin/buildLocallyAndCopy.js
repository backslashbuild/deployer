/*

LEGACY

*/
const shell = require("shelljs");
const { gzip } = require("node-gzip");
const { err, success, info, log, isQuiet } = require("./utils/logger");
fs = require("fs");
const fsPromises = fs.promises;

function generateFileName(key) {
  return `deployer-${key}-${Date.now()}`;
}

/**
 * @description Prints the information given from the config file.
 * @param {Object} { serviceName, imageName, build, sshHost } - Information from the config file.
 */
function displayInfo({ serviceName, imageName, build, sshHost }) {
  log(`Service name: ${info(serviceName)}`);
  log(`Image name: ${info(imageName)}`);
  log(`Build command: ${info(build)}`);
  log(`SSH host: ${info(sshHost)}`);
  log("");
}

/**
 * @description Building stage. Builds the docker image using the build command provided in the config file.
 * @param {Object} { build } - Information from the config file.
 */
function buildingStage({ build }) {
  log(`Building the image...`);
  shell.exec(build, { silent: isQuiet() });
  log(success(`Building completed.`));
  log("");
}

/**
 * @description Saving stage. Saves the image into intermediate .tar file, then compresses it using gzip into .tar.gz.
 * @param {string} fileName - The file name given to the .tar and the .tar.gz files.
 * @param {Object} { imageName } - Information from the config file.
 */
async function savingStage(fileName, { imageName }) {
  log(`Saving image to ${info(`${fileName}.tar.gz`)} ...`);

  log(`Creating intermediate file ${info(`${fileName}.tar`)} ...`);
  const saveResult = shell.exec(`docker save ${imageName} -o ${fileName}.tar`);
  if (saveResult.code !== 0) {
    log(err(saveResult.stderr));
    gracefulExit();
  }

  log(`Creating ${info(`${fileName}.tar.gz`)} ...`);
  const tarData = await fsPromises.readFile(`${fileName}.tar`);
  const compressed = await gzip(tarData);
  await fsPromises.writeFile(`${fileName}.tar.gz`, compressed);

  log(success("Saving completed."));
  log("");
}

/**
 * @description Copying stage. Copies the compressed image to the remote host using scp.
 * @param {string} fileName - The name of the file to be copied to the remote host.
 * @param {Object} { sshHost } - Information from the config file.
 */
async function copyingStage(fileName, { sshHost }) {
  log(`Copying ${info(`${fileName}.tar.gz`)} to ${info(sshHost)} ...`);

  //The commented code albeit less complicated, does not stream progress of scp.

  // const copyResult = shell.exec(`scp -p ./${fileName}.tar.gz ${sshHost}:${fileName}.tar.gz`, {
  //   silent: process.env.QUIET_FLAG,
  // });
  // if (copyResult.code !== 0) {
  //   log(err(copyResult.stderr));
  //   gracefulExit();
  // }

  async function awaitCopy() {
    const copyWorker = require("child_process").spawn(
      "scp",
      [`./${fileName}.tar.gz`, `${sshHost}:${fileName}.tar.gz`],
      { stdio: isQuiet() ? "ignore" : "inherit" }
    );

    const exitCode = await new Promise((resolve, reject) => {
      copyWorker.on("exit", (code) => {
        resolve(code);
      });
    });

    return { exitCode };
  }

  copyResult = await awaitCopy();
  if (copyResult.exitCode !== 0) {
    gracefulExit();
  }

  log(success(`Copy successful.`));
  log("");
}

/**
 * @description Loading stage. Loads the image within the remote docker system.
 * @param {string} fileName - The name of the file containing the image to be loaded.
 * @param {Object} { sshHost } - Information from the config file.
 */
async function loadingStage(fileName, { sshHost }) {
  log(`Loading the image...`);
  const loadResult = shell.exec(`ssh ${sshHost} "docker load -i ${fileName}.tar.gz"`, {
    silent: isQuiet(),
  });
  if (loadResult.code !== 0) {
    log(err(loadResult.stderr));
    gracefulExit();
  }

  log(success(`Loading completed.`));
  log("");
}

/**
 * @description Deploying stage. Deploys the image to the swarm in the remote host.
 * @param {Object} { serviceName, imageName } - Information from the config file.
 */
function deploymentStage({ serviceName, imageName, sshHost }) {
  log(`Deploying the image...`);

  shell.env.DOCKER_HOST = `ssh://${sshHost}`;
  const deployResult = shell.exec(
    `docker service update --force --image ${imageName} ${serviceName}`,
    {
      silent: isQuiet(),
    }
  );
  if (deployResult.code !== 0) {
    log(err(deployResult.stderr));
    gracefulExit();
  }

  log(success(`Deployment completed.`), true);
  log("");
}

/**
 * @description Clean up stage. Cleans up artefacts left by the command.
 * @param {string} fileName - The name of the files to be cleaned up.
 * @param {Object} { sshHost } - Information from the config file.
 */
function cleanupStage(fileName, { sshHost }) {
  log("Starting clean-up ...");

  log(`Removing ${info(`${fileName}.tar`)} from local host ...`);
  try {
    fs.unlinkSync(`${fileName}.tar`);
  } catch (e) {
    log(err(`Failed to remove ${fileName}.tar from local storage.`));
  }

  log(`Removing ${info(`${fileName}.tar.gz`)} from local host ...`);
  try {
    fs.unlinkSync(`${fileName}.tar.gz`);
  } catch (e) {
    log(err(`Failed to remove ${fileName}.tar.gz from local storage.`));
  }

  log(`Removing ${info(`${fileName}.tar.gz`)} from remote host ...`);
  if (
    shell.exec(`ssh ${sshHost} "rm ${fileName}.tar.gz"`, {
      silent: isQuiet(),
    }).code !== 0
  ) {
    log(err(`Failed to remove ${fileName}.tar.gz from remote host.`));
  }

  shell.env.DOCKER_HOST = "";
  log(success("Clean-up completed."));
}

/**
 * @description Cleans up artefacts and exits the process gracefully, to be called in case of error in the procedure.
 */
function gracefulExit() {
  log(err(`\nFailed to deploy ${SERVICE_KEY}. Exiting gracefully ...`), true);
  cleanupStage(FILE_NAME, { sshHost: SSH_HOST });
  shell.exit(1);
}

let SERVICE_KEY = "";
let FILE_NAME = "";
let SSH_HOST = "";

/**
 * @description Executes deploy sequence.
 * @param {string} key - The name of the files to be cleaned up.
 * @param {string} sshHost - The remote host to deploy the image to.
 * @param {Object} config - JSON containing the information from the config file.
 */
async function buildLocallyAndCopy(key, sshHost, config) {
  const fileName = generateFileName(key);

  //set global variables
  SERVICE_KEY = key;
  FILE_NAME = fileName;
  SSH_HOST = sshHost;

  serviceName = config.serviceName;
  imageName = config.imageName;
  build = config.build;

  displayInfo({ serviceName, imageName, build, sshHost });
  buildingStage({ build });
  await savingStage(fileName, { imageName });
  await copyingStage(fileName, { sshHost });
  await loadingStage(fileName, { sshHost });
  deploymentStage({ serviceName, imageName, sshHost });
  cleanupStage(fileName, { sshHost });
}

module.exports = { buildLocallyAndCopy };
