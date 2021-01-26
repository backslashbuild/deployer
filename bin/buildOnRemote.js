const shell = require("shelljs");
const { err, success, info } = require("./utils");

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
 * @description Building stage. Builds the docker image on the remote host using the build command provided in the config file.
 * @param {Object} { build } - Information from the config file.
 */
function buildingStage({ build, sshHost }) {
  log(`Building the image...`);

  shell.env.DOCKER_HOST = `ssh://${sshHost}`;
  shell.exec(build, { silent: QUIET_FLAG });
  log(success(`Building completed.`));
  log("");
}

/**
 * @description Deploying stage. Deploys the image to the swarm in the remote host.
 * @param {Object} { serviceName, imageName } - Information from the config file.
 */
function deploymentStage({ serviceName, imageName }) {
  log(`Deploying the image...`);

  const deployResult = shell.exec(
    `docker service update --force --image ${imageName} ${serviceName}`,
    {
      silent: QUIET_FLAG,
    }
  );
  if (deployResult.code !== 0) {
    log(err(deployResult.stderr));
    gracefulExit();
  }

  shell.env.DOCKER_HOST = "";
  log(success(`Deployment completed.`), true);
  log("");
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
  shell.exit(1);
}

let QUIET_FLAG = false;
let SERVICE_KEY = "";

/**
 * @description Executes deploy sequence.
 * @param {string} key - The name of the files to be cleaned up.
 * @param {Object} config - JSON containing the information from the config file.
 * @param {boolean} quiet - Flag indicating whether the process should suppress verbose output.
 */
async function buildOnRemote(key, config, quiet) {
  //set global variables
  QUIET_FLAG = quiet;
  SERVICE_KEY = key;
  CONFIG_JSON = config;

  displayInfo(config);
  buildingStage(config);
  deploymentStage(config);
}

module.exports = { buildOnRemote };
