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
 * @description Creates and maintains a tunnel between the local machine and remote ssh host in a child process.
 * @param {Object} { sshHost } - The ssh server at which a reverse tunnel is to be established.
 */
function createTunnel({ sshHost }) {
  log(`Creating reverse tunnel to ${info(sshHost)} ...`);
  let port = 20000;
  //ssh -N -R 20001:localhost:20000 roquser@pay2.dev.roqqett.com
  const tunnelProcess = require("child_process").spawn("ssh", [
    `-N`,
    `-R`,
    `${port}:localhost:${port}`,
    `${sshHost}`,
  ]);
  tunnelProcess.on("exit", function (code, signal) {
    code === 0
      ? console.log(
          success(`Tunnel process exited with code ` + code.toString() + `, signal: ${signal}`)
        )
      : console.log(
          err(`Tunnel process exited with code ` + code.toString() + `, signal: ${signal}`)
        );
  });
  log(success(`Reverse tunnel to ${info(sshHost)} established at ${info(`${port}:${port}`)}.`));
  return { port, tunnelProcess };
}

/**
 * @description Building stage. Builds the docker image using the build command provided in the config file.
 * @param {Object} { build } - Information from the config file.
 */
function buildAndPushStage({ build, imageName, port }) {
  log(`Building the image...`);
  shell.exec(build, { silent: QUIET_FLAG });
  shell.exec(`docker image tag ${imageName} localhost:${port}/${imageName}`, {
    silent: QUIET_FLAG,
  });
  log(success(`Building completed.`));

  log(`Pushing ${imageName} to the local registry...`);
  shell.exec(`docker image push localhost:${port}/${imageName}`, {
    silent: QUIET_FLAG,
  });
  log(success(`Pushing completed.`));
  log("");
}

/**
 * @description Deploying stage. Deploys the image to the swarm in the remote host.
 * @param {Object} { serviceName, imageName } - Information from the config file.
 */
function pullAndDeployStage({ serviceName, imageName }) {
  log(`Pulling ${info(imageName)} from localhost:${port} ...`);
  shell.exec(`docker pull localhost:${port}/${imageName}`, {
    silent: QUIET_FLAG,
  });
  log(success(`Pull completed`));

  log(`Deploying the image...`);
  const deployResult = shell.exec(
    `docker service update --force --image localhost:${port}/${imageName} ${serviceName}`,
    {
      silent: QUIET_FLAG,
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
  if (shell.exec(`ssh ${sshHost} "rm ${fileName}.tar.gz"`, { silent: QUIET_FLAG }).code !== 0) {
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
async function buildLocallyAndCopy(key, config, quiet) {
  const fileName = generateFileName(key);

  //set global variables
  QUIET_FLAG = quiet;
  SERVICE_KEY = key;
  CONFIG_JSON = config;
  FILE_NAME = fileName;

  // docker run -d -p 20000:5000 --name local-registry registry:2
  // docker image tag admin-ui localhost:20000/admin-ui
  // docker image push localhost:20000/admin-ui
  // ssh -R 20000:localhost:20000 roquser@pay2.dev.roqqett.com
  // docker pull localhost:20000/admin-ui //this is in remote host because of previous SSH
  // docker service update --force --image localhost:20000/admin-ui s_admin-ui //this is in remote host because of previous SSH
  // exit //close ssh session
  // docker container stop local-registry
  // docker container rm -v registry

  displayInfo(config);

  let { port, tunnelProcess } = createTunnel(config);
  runRegistry(port);
  buildAndPushStage({ build, imageName, port });
  pullAndDeployStage(config);
  cleanupStage(tunnelProcess, config);
}

module.exports = { buildLocallyAndCopy };
