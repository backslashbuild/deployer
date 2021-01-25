const shell = require("shelljs");
const { gzip } = require("node-gzip");
const { err, success, info } = require("./utils");
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
  shell.exec(build);
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
  //   silent: QUIET_FLAG,
  // });
  // if (copyResult.code !== 0) {
  //   log(err(copyResult.stderr));
  //   gracefulExit();
  // }

  async function awaitCopy() {
    const copyWorker = require("child_process").spawn(
      "scp",
      [`./${fileName}.tar.gz`, `${sshHost}:${fileName}.tar.gz`],
      { stdio: QUIET_FLAG ? "ignore" : "inherit" }
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
function loadingStage(fileName, { sshHost }) {
  log(`Loading the image...`);

  shell.env.DOCKER_HOST = `ssh://${sshHost}`;
  const loadResult = shell.exec(`docker load -i ${fileName}.tar.gz`, { silent: true });
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
function deploymentStage({ serviceName, imageName }) {
  log(`Deploying the image...`);

  const deployResult = shell.exec(`docker service update --image ${imageName} ${serviceName}`);
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
  if (shell.exec(`ssh ${sshHost} "rm ${fileName}.tar.gz"`, { silent: true }).code !== 0) {
    log(err(`Failed to remove ${fileName}.tar.gz from remote host.`));
  }

  shell.env.DOCKER_HOST = "";
  log(success("Clean-up completed."));
}

/**
 * @description Logs passed text, suppressed by global silent flag. Can be overwridden by shout option.
 * @param {string} text - Text to be logged.
 * @param {boolean} shout - Optional Parameter. Set to true to override global quiet flag. Defaults to false.
 */
function log(text, shout = false) {
  if (!QUIET_FLAG || shout) {
    shell.echo(text);
  }
}

/**
 * @description Cleans up artefacts and exits the process gracefully, to be called in case of error in the procedure.
 */
function gracefulExit() {
  log(err(`\nFailed to deploy ${SERVICE_KEY}. Exiting gracefully ...`), true);
  const sshHost = CONFIG_JSON.sshHost;
  cleanupStage(FILE_NAME, { sshHost });
  shell.exit(1);
}

let QUIET_FLAG = false;
let SERVICE_KEY = "";
let CONFIG_JSON = {};
let FILE_NAME = "";

/**
 * @description Executes deploy sequence.
 * @param {string} key - The name of the files to be cleaned up.
 * @param {Object} config - JSON containing the information from the config file.
 * @param {boolean} quiet - Flag indicating whether the process should suppress verbose output.
 */
async function deploy(key, config, quiet) {
  const fileName = generateFileName(key);

  //set global variables
  QUIET_FLAG = quiet;
  SERVICE_KEY = key;
  CONFIG_JSON = config;
  FILE_NAME = fileName;

  displayInfo(config);
  buildingStage(config);
  await savingStage(fileName, config);
  await copyingStage(fileName, config);
  loadingStage(fileName, config);
  deploymentStage(config);
  cleanupStage(fileName, config);
}

module.exports = { deploy };
