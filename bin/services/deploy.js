const shell = require("shelljs");
const {
  getContainerPort,
  getNumberOfNodes,
  getServicePort,
  getAllPortsExposedInSwarm,
} = require("../utils/dockerUtils");
const { err, success, info, log, isQuiet } = require("../utils/logger");
const { awaitableSpawnProcess } = require("../utils/workerUtils");

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
  const srcPort = getContainerPort("deployer-registry");
  if (srcPort === -1) {
    throw new Error(
      `${err(`Is the deployer registry running? Try running: `)}${info(`deployer registry start`)}`
    );
  }
  log(`${success(`Port retrieved successfully.`)} Registry running on port: ${info(srcPort)}`);
  log("");
  return srcPort;
}

/**
 * @description Creates and maintains a tunnel between the local machine and remote ssh host in a child process.
 * @param {string} sshHost - The ssh remote user at which a reverse tunnel is to be established.
 * @param {string} srcPort - The port in which the registry is running on, to be used as the source port for the reverse tunnel.
 * @param {string} serviceName - The name of the service that will be updated. Used for logging only.
 * @returns {Promise<Object>} {tunnelProcess, destPort} - tunnelProcess is the ChildProcess maintaining the tunnel. destPort is the port allocated by the tunnel for the remote host.
 */
async function createTunnel(sshHost, srcPort, serviceName) {
  log(`Creating reverse tunnel to ${info(sshHost)} ...`);

  let destPort = "";
  const tunnelProcess = require("child_process").spawn("ssh", [
    `-N`,
    `-R`,
    `0:localhost:${srcPort}`,
    `${sshHost}`,
  ]);

  destPort = await new Promise((resolve, reject) => {
    //example output by the command
    //Allocated port 40661 for remote forward to localhost:20000
    tunnelProcess.stdout.on("data", function (data) {
      const rx = /Allocated port ([0-9]+)/g;
      resolve(rx.exec(data.toString())[1]);
    });
    //in fact by default the message is on stderr for some reason. Leaving stdout as well just in case that changes some day.
    tunnelProcess.stderr.on("data", function (data) {
      const rx = /Allocated port ([0-9]+)/g;
      resolve(rx.exec(data.toString())[1]);
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
 * @param {string} [targetCWD] - Optional - The target CWD for the build command.
 */
function buildStage(build, targetCWD = undefined) {
  log(`Building the image ...`);

  //configPath is set if deployer.yml is not on cwd
  if (targetCWD) {
    shell.pushd("-q", targetCWD);
  }

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
 * @param {string} imageName - the name of the image to be tagged and pushed to the local registry.
 * @param {string} srcPort - the port the registry is currently running on.
 */
async function tagAndPushStage(imageName, srcPort) {
  log(`Tagging image ${info(imageName)} with tag ${info(`localhost:${srcPort}/${imageName}`)} ...`);

  shell.exec(`docker image tag ${imageName} localhost:${srcPort}/${imageName}`, {
    silent: isQuiet(),
  });

  log(success(`Tag successful.`));
  log("");

  log(`Pushing ${imageName} to the local registry ...`);

  const pushExitCode = await awaitableSpawnProcess(`docker`, [
    `image`,
    `push`,
    `localhost:${srcPort}/${imageName}`,
  ]);
  if (pushExitCode !== 0) {
    throw new Error(err(`Failed to push image to local deployer-registry.`));
  }

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

  const pullResultCode = await awaitableSpawnProcess(`docker`, [
    `-H`,
    `ssh://${sshHost}`,
    `pull`,
    `localhost:${destPort}/${imageName}`,
  ]);
  if (pullResultCode !== 0) {
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
 * @description Helper function for getting a random number in range (both min and max included)
 * @param {number} min - integer, inclusive
 * @param {number} max - integer, inclusive
 * @returns {number} Random number between min and max, both inclusive.
 */
function getRandomNumber(min, max) {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

/**
 * @description Handles deployment of the image in a multi-node swarm.
 * @param {string} imageName - The name of the image to be used when updating the service.
 * @param {string} sshHost - The sshHost of the remote swarm containing the service.
 * @returns {Promise<string>} The image name after tagging it with the remote deployer-registry.
 */
async function handleMultiNodeDeploy(imageName, sshHost) {
  log(`Multi-node swarm detected. Checking for remote deployer-registry ...`);
  const result = shell.exec(`docker -H ssh://${sshHost} service ls`, { silent: true });
  const registryExists = result.stdout.includes(`deployer-registry`);

  if (!registryExists) {
    log("");
    log(`Remote deployer-registry not found, creating deployer-registry service ...`);

    let port = "";
    const portsUsed = getAllPortsExposedInSwarm(sshHost);
    while (port === "") {
      let candidate = getRandomNumber(5000, 60000);
      if (!portsUsed.includes(candidate.toString())) {
        port = candidate;
      }
    }

    const registryCreationResultCode = await awaitableSpawnProcess("docker", [
      `-H`,
      `ssh://${sshHost}`,
      `service`,
      `create`,
      `--name`,
      `deployer-registry`,
      `--publish`,
      `${port}:5000`,
      `registry:2`,
    ]);
    if (registryCreationResultCode !== 0) {
      throw new Error(err(`Failed create remote deployer-registry.`));
    }

    log(
      `${success(`Remote deployer-registry created successfuly at port`)} ${info(port)} ${success(
        "."
      )}`
    );
    log("");
  }
  const rRegistryPort = getServicePort("deployer-registry", sshHost);
  log(`Remote deployer-registry found at port ${info(rRegistryPort)}.`);

  log(`Tagging image with remote registry ...`);
  shell.exec(
    `docker -H ssh://${sshHost} image tag deployer/${imageName}:latest 127.0.0.1:${rRegistryPort}/${imageName}:latest`
  );

  log(`Pushing image ${info(imageName)} to remote deployer-registry.`);
  const pushResultCode = await awaitableSpawnProcess(`docker`, [
    `-H`,
    `ssh://${sshHost}`,
    `push`,
    `127.0.0.1:${rRegistryPort}/${imageName}:latest`,
  ]);
  if (pushResultCode !== 0) {
    throw new Error(err(`Failed to push image to remote deployer-registry.`));
  }

  log(
    `${success("Image")} ${info(imageName)} ${success(
      "pushed successfully to the remote deployer-registry."
    )}`
  );
  log("");
  return `127.0.0.1:${rRegistryPort}/${imageName}:latest`;
}

/**
 * @description Updates the image of the service on the remote on the swarm.
 * @param {string} imageName - the image used to update the existing service.
 * @param {string} serviceName - the name of the service to be updated.
 * @param {string} sshHost - the ssh host that contains the swarm which contains the service.
 */
async function deployImage(imageName, serviceName, sshHost) {
  log(`Deploying the image...`);
  const deployResultCode = await awaitableSpawnProcess(`docker`, [
    `-H`,
    `ssh://${sshHost}`,
    `service`,
    `update`,
    `--force`,
    `--image`,
    imageName,
    serviceName,
  ]);
  if (deployResultCode !== 0) {
    throw new Error(err(`Failed to deploy image in the remote swarm.`));
  }

  log(success(`${serviceName} updated successfully.`), true);
  log("");
}

/**
 * @description Executes deploy sequence.
 * @param {string} sshHost - The remote host to deploy the image to.
 * @param {Object} config - JSON containing the information from the config file.
 */
async function deploy(sshHost, config, targetCWD) {
  const { serviceName, imageName, build } = config;
  displayInfo(serviceName, imageName, build, sshHost);
  let tunnelProcessRef = null;
  try {
    const srcPort = getRegistryPort();
    const { tunnelProcess, destPort } = await createTunnel(sshHost, srcPort, serviceName);
    tunnelProcessRef = tunnelProcess;
    buildStage(build, targetCWD);
    await tagAndPushStage(imageName, srcPort);
    await pullAndTagStage(imageName, sshHost, destPort);

    let taggedImage = `deployer/${imageName}:latest`;
    if (getNumberOfNodes(sshHost) > 1) {
      taggedImage = await handleMultiNodeDeploy(imageName, sshHost);
    }

    await deployImage(taggedImage, serviceName, sshHost);
  } catch (error) {
    log(error, true);
    process.exitCode = 1;
  } finally {
    if (tunnelProcessRef != null) {
      tunnelProcessRef.kill();
    }
  }
}

module.exports = { deploy };
