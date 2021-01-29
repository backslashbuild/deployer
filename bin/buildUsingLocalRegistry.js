const shell = require("shelljs");
const { err, success, info, log, isQuiet } = require("./utils/logger");

/**
 * @description Prints the information given from command arguments.
 * @param {string} serviceName - The name of the service on the swarm to be updated.
 * @param {string} imageName - The name of the image that will be used to update the service.
 * @param {string} build - The command that will be used to build the image.
 * @param {string} sshHost - The remote host in which the swarm lives.
 */
function displayInfo(serviceName, imageName, build, sshHost) {
  log(`Service name: ${info(serviceName)}`);
  log(`Image name: ${info(imageName)}`);
  log(`Build command: ${info(build)}`);
  log(`SSH host: ${info(sshHost)}`);
  log("");
}

/**
 * @description Gets the port on which the deployer doker registry is running.
 * @returns {string} The port on which deployer-registry is exposed at.
 */
function getRegistryPort() {
  log(`Getting the port of the local docker registry ...`);
  const result = shell.exec("docker port deployer-registry", { silent: true });
  if (result.code !== 0) {
    throw new Error(
      `${err(`Is the deployer registry running? Try running: `)}${info(`deployer registry start`)}`
    );
  }
  //example stdout: "5000/tcp -> 0.0.0.0:20000"
  let srcPort = result.stdout.split(":")[1].trim();
  log(`${success(`Port retrieved successfully.`)} Registry running on port: ${info(srcPort)}`);
  log("");
  return srcPort;
}

/**
 * @description Creates and maintains a tunnel between the local machine and remote ssh host in a child process.
 * @param {string} sshHost - The ssh remote user at which a reverse tunnel is to be established.
 * @param {string} srcPort - The port in which the registry is running on, to be used as the source port for the reverse tunnel.
 * @returns {Object} {tunnelProcess, destPort} - tunnelProcess is the ChildProcess maintaining the tunnel. destPort is the port allocated by the tunnel for the remote host.
 */
async function createTunnel(sshHost, srcPort) {
  log(`Creating reverse tunnel to ${info(sshHost)} ...`);

  let destPort = "";
  const tunnelProcess = require("child_process").spawn("ssh", [
    `-N`,
    `-R`,
    `0:localhost:${srcPort}`,
    `${sshHost}`,
  ]);

  tunnelProcess.on("exit", function (code, signal) {
    code
      ? code === 0
        ? console.log(success(`Tunnel process exited with code: ${code}.`))
        : console.log(err(`Tunnel process exited with code: ${code}.`))
      : console.log(success(`Tunnel process exited successfully.`));
  });

  destPort = await new Promise((resolve, reject) => {
    //example output by the command
    //Allocated port 40661 for remote forward to localhost:20000
    tunnelProcess.stdout.on("data", function (data) {
      resolve(data.toString().split(" ")[2]);
    });
    //in fact by default the message is on stderr for some reason. Leaving stdout as well just in case that changes some day.
    tunnelProcess.stderr.on("data", function (data) {
      resolve(data.toString().split(" ")[2]);
    });
  });

  log(
    success(`Reverse tunnel to ${info(sshHost)} established at ${info(`${srcPort}:${destPort}`)}.`)
  );
  log("");
  return { tunnelProcess, destPort };
}

/**
 * @description Building stage. Builds the docker image using the build command provided in the config file.
 * @param {string} build - The command used to build the docker image to be deployed.
 */
function buildStage(build) {
  log(`Building the image ...`);

  const buildResult = shell.exec(build, { silent: isQuiet() });
  if (buildResult.code !== 0) {
    log(err(buildResult.stderr));
    throw new Error("Failed to build the image using the command provided in the config.");
  }

  log(success(`Building completed.`));
  log("");
}

/**
 * @description Tags the image built with the deployer registry host and pushes the image to it.
 * @param {string} imageName
 * @param {string} srcPort
 */
function tagAndPushStage(imageName, srcPort) {
  log(`Tagging image ${info(imageName)} with tag ${info(`localhost:${srcPort}/${imageName}`)} ...`);

  shell.exec(`docker image tag ${imageName} localhost:${srcPort}/${imageName}`, {
    silent: isQuiet(),
  });

  log(success(`Tag successful.`));
  log("");

  log(`Pushing ${imageName} to the local registry ...`);

  shell.exec(`docker image push localhost:${srcPort}/${imageName}`, {
    silent: isQuiet(),
  });

  log(success(`Pushing completed.`));
  log("");
}

/**
 * @description Deploying stage. Deploys the image to the swarm in the remote host.
 * @param {string} imageName - The name of the image to be pulled.
 * @param {string} sshHost - The remote host which will pull the image.
 * @param {string} destPort - The port on the remote machine that is tunnelled to the local registry.
 */
async function pullAndTagStage(imageName, sshHost, destPort) {
  log(`Pulling ${info(imageName)} from ${info(`localhost:${destPort}`)} at ${info(sshHost)} ...`);

  const pullWorker = require("child_process").spawn(
    `docker`,
    [`-H`, `ssh://${sshHost}`, `pull`, `localhost:${destPort}/${imageName}`],
    { stdio: isQuiet() ? "ignore" : "inherit" }
  );
  const exitCode = await new Promise((resolve, reject) => {
    pullWorker.on("exit", (code) => {
      resolve(code);
    });
  });

  if (exitCode !== 0) {
    throw new Error(err(`Failed to pull image at remote host.`));
  }
  log(success(`Pull completed.`));
  log("");

  log(`Tagging the image with ${info(`deployer/${imageName}:latest`)} ...`);
  shell.exec(
    `docker -H ssh://${sshHost} image tag localhost:${destPort}/${imageName} deployer/${imageName}:latest`,
    {
      silent: isQuiet(),
    }
  );
  log(success(`Tag completed.`));
  log("");
}

/**
 * @description Updates the image of the service on the remote on the swarm.
 * @param {string} imageName
 * @param {string} serviceName
 * @param {string} sshHost
 */
function deployImage(imageName, serviceName, sshHost) {
  log(`Deploying the image...`);

  const deployResult = shell.exec(
    `docker -H ssh://${sshHost} service update --force --image deployer/${imageName}:latest ${serviceName}`,
    {
      silent: isQuiet(),
    }
  );
  if (deployResult.code !== 0) {
    log(err(deployResult.stderr));
    throw new Error(err(`Failed to deploy image in the remote swarm.`));
  }

  log(success(`Deployment completed.`), true);
  log("");
}

/**
 * @description Executes deploy sequence.
 * @param {string} sshHost - The remote host to deploy the image to.
 * @param {Object} config - JSON containing the information from the config file.
 */
async function buildUsingLocalRegistry(sshHost, config) {
  const { serviceName, imageName, build } = config;
  displayInfo(serviceName, imageName, build, sshHost);
  let tunnelProcessRef = null;
  try {
    const srcPort = getRegistryPort();
    const { tunnelProcess, destPort } = await createTunnel(sshHost, srcPort);
    tunnelProcessRef = tunnelProcess;
    buildStage(build);
    tagAndPushStage(imageName, srcPort);
    await pullAndTagStage(imageName, sshHost, destPort);
    deployImage(imageName, serviceName, sshHost);
  } catch (error) {
    log(error, true);
  } finally {
    if (tunnelProcessRef != null) {
      tunnelProcessRef.kill();
    }
  }
}

module.exports = { buildUsingLocalRegistry };
