const shell = require("shelljs");
const os = require("os");
const {
  getContainerPort,
  getNumberOfNodes,
  getServicePort,
  getAllPortsExposedInSwarm,
} = require("../utils/dockerUtils");
const { logger, formatter } = require("../utils/textUtils");
const { awaitableSpawnProcess } = require("../utils/workerUtils");
const { deployerVersion } = require("../utils/configUtils");

/**
 * @description Prints the information given from command arguments.
 * @param {string} serviceName - The name of the service on the swarm to be updated.
 * @param {string} imageName - The name of the image that will be used to update the service.
 * @param {string} build - The command that will be used to build the image.
 * @param {string} sshHost - The remote host in which the swarm lives.
 */
function displayInfo(serviceName, imageName, build, sshHost) {
  logger.info(`Service name: ${formatter.info(serviceName)}`);
  logger.info(`Image name: ${formatter.info(imageName)}`);
  logger.info(`Build command: ${formatter.info(build)}`);
  logger.info(`SSH host: ${formatter.info(sshHost)}`);
  logger.info("");
}

/**
 * @description Gets the port on which the deployer doker registry is running.
 * @returns {string} The port on which deployer-registry is exposed at.
 */
function getRegistryPort() {
  logger.info(`Getting the port of the local docker registry ...`);
  const srcPort = getContainerPort("deployer-registry");
  if (srcPort === -1) {
    throw new Error(
      `Failed to get registry port. Is the deployer registry running? Try running:\n${formatter.info(
        "deployer registry start"
      )}`
    );
  }
  logger.info(
    `${formatter.success(
      `Port retrieved successfully.`
    )} Registry running on port: ${formatter.info(srcPort)}`
  );
  logger.info("");
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
  logger.info(`Creating reverse tunnel to ${formatter.info(sshHost)} ...`);

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
      try {
        resolve(rx.exec(data.toString())[1]);
      } catch (e) {
        reject(data.toString().trim());
      }
    });
  }).catch((e) => {
    throw new Error(e);
  });

  logger.info(
    formatter.success(
      `Reverse tunnel to ${formatter.info(sshHost)} established at ${formatter.info(
        `${srcPort}:${destPort}`
      )}.`
    )
  );
  logger.info("");
  return { tunnelProcess, destPort };
}

/**
 * @description Building stage. Builds the docker image using the build command provided in the config file.
 * @param {string} build - The command used to build the docker image to be deployed.
 * @param {string} [targetCWD] - Optional - The target CWD for the build command.
 */
function buildStage(build, targetCWD = undefined) {
  logger.info(`Building the image ...`);

  //configPath is set if deployer.yml is not on cwd
  if (targetCWD) {
    shell.pushd("-q", targetCWD);
  }

  const buildResult = shell.exec(build, { silent: logger.isLevelSilent(logger.logLevels.INFO) });
  if (buildResult.code !== 0) {
    throw new Error("Failed to build the image using the command provided in the config.");
  }

  logger.info(formatter.success(`Building completed.`));
  logger.info("");
}

/**
 * @description Tags the image built with the deployer registry host and pushes the image to it.
 * @param {string} imageName - the name of the image to be tagged and pushed to the local registry.
 * @param {string} srcPort - the port the registry is currently running on.
 */
async function tagAndPushStage(imageName, srcPort) {
  logger.info(
    `Tagging image ${formatter.info(imageName)} with tag ${formatter.info(
      `localhost:${srcPort}/${imageName}`
    )} ...`
  );

  const tagResult = shell.exec(`docker image tag ${imageName} localhost:${srcPort}/${imageName}`, {
    silent: true,
  });
  if (tagResult.code !== 0) {
    logger.error(formatter.error(tagResult.stderr));
    throw new Error(
      `Failed to tag ${imageName} with localhost:${srcPort}/${imageName}. Make sure that the correct build command is used for the image.`
    );
  }

  logger.info(formatter.success(`Tag successful.`));
  logger.info("");

  logger.info(`Pushing ${imageName} to the local registry ...`);

  const pushExitCode = await awaitableSpawnProcess(`docker`, [
    `image`,
    `push`,
    `localhost:${srcPort}/${imageName}`,
  ]);
  if (pushExitCode !== 0) {
    throw new Error(`Failed to push image to local deployer-registry.`);
  }

  logger.info(formatter.success(`Pushing completed.`));
  logger.info("");
}

/**
 * @description Deploying stage. Deploys the image to the swarm in the remote host.
 * @param {string} imageName - The name of the image to be pulled.
 * @param {string} sshHost - The remote host which will pull the image.
 * @param {string} destPort - The port on the remote machine that is tunnelled to the local registry.
 * @param {string} tagName - The name to be used when tagging the image.
 */
async function pullAndTagStage(imageName, sshHost, destPort, tagName) {
  logger.info(
    `Pulling ${formatter.info(imageName)} from ${formatter.info(
      `localhost:${destPort}`
    )} at ${formatter.info(sshHost)} ...`
  );

  const pullResultCode = await awaitableSpawnProcess(`docker`, [
    `-H`,
    `ssh://${sshHost}`,
    `pull`,
    `localhost:${destPort}/${imageName}`,
  ]);
  if (pullResultCode !== 0) {
    throw new Error(`Failed to pull image at remote host.`);
  }

  logger.info(formatter.success(`Pull completed.`));
  logger.info("");

  logger.info(`Tagging the image with ${formatter.info(`${tagName}/${imageName}:latest`)} ...`);
  shell.exec(
    `docker -H ssh://${sshHost} image tag localhost:${destPort}/${imageName} ${tagName}/${imageName}:latest`,
    {
      silent: logger.isLevelSilent(logger.logLevels.INFO),
    }
  );
  logger.info(formatter.success(`Tag completed.`));
  logger.info("");
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
 * @param {string} tagName - The name to be used when tagging the image.
 * @returns {Promise<string>} The image name after tagging it with the remote deployer-registry.
 */
async function handleMultiNodeDeploy(imageName, sshHost, tagName) {
  logger.info(`Multi-node swarm detected. Checking for remote deployer-registry ...`);
  const result = shell.exec(`docker -H ssh://${sshHost} service ls`, { silent: true });
  const registryExists = result.stdout.includes(`deployer-registry`);

  if (!registryExists) {
    logger.info("");
    logger.info(`Remote deployer-registry not found, creating deployer-registry service ...`);

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
      throw new Error(formatter.error(`Failed create remote deployer-registry.`));
    }

    logger.info(
      formatter.success(
        `Remote deployer-registry created successfuly at port ${formatter.info(port)}.`
      )
    );
    logger.info("");
  }
  const rRegistryPort = getServicePort("deployer-registry", sshHost);
  logger.info(`Remote deployer-registry found at port ${formatter.info(rRegistryPort)}.`);

  logger.info(`Tagging image with remote registry ...`);
  shell.exec(
    `docker -H ssh://${sshHost} image tag ${tagName}/${imageName}:latest 127.0.0.1:${rRegistryPort}/${imageName}:latest`
  );

  logger.info(`Pushing image ${formatter.info(imageName)} to remote deployer-registry.`);
  const pushResultCode = await awaitableSpawnProcess(`docker`, [
    `-H`,
    `ssh://${sshHost}`,
    `push`,
    `127.0.0.1:${rRegistryPort}/${imageName}:latest`,
  ]);
  if (pushResultCode !== 0) {
    throw new Error(formatter.error(`Failed to push image to remote deployer-registry.`));
  }

  logger.info(
    `${formatter.success("Image")} ${formatter.info(imageName)} ${formatter.success(
      "pushed successfully to the remote deployer-registry."
    )}`
  );
  logger.info("");
  return `127.0.0.1:${rRegistryPort}/${imageName}:latest`;
}

/**
 * @description Generates a stringified metadata object for the
 * @param {Object} deployerConfig - Deployer configuration values.
 * @param {string} imageName - the image used to update the existing service.
 * @returns
 */
function getDeployerLabel(deployerConfig, imageName) {
  const date = new Date(new Date().toUTCString());
  const name = deployerConfig.name;
  const computerUsername = os.userInfo().username;
  const deviceName = os.hostname();
  const operatingSystem = {
    type: os.type(),
    platform: os.platform(),
    architecture: os.arch(),
    release: os.release(),
  };
  const deployerLabelJson = {
    date,
    deployerVersion,
    name,
    computerUsername,
    deviceName,
    operatingSystem,
    image: imageName,
  };

  return JSON.stringify(deployerLabelJson);
}

/**
 * @description Updates the image of the service on the remote on the swarm.
 * @param {string} imageName - the image used to update the existing service.
 * @param {string} serviceName - the name of the service to be updated.
 * @param {string} sshHost - the ssh host that contains the swarm which contains the service.
 * @param {Object} deployerConfig - Deployer configuration values.
 */
async function deployImage(imageName, serviceName, sshHost, deployerConfig) {
  logger.info(`Deploying the image...`);
  const deployResultCode = await awaitableSpawnProcess(`docker`, [
    `-H`,
    `ssh://${sshHost}`,
    `service`,
    `update`,
    `--force`,
    `--image`,
    imageName,
    `--label-add`,
    `deployer=${getDeployerLabel(deployerConfig, imageName)}`,
    serviceName,
  ]);
  if (deployResultCode !== 0) {
    throw new Error(`Failed to deploy image in the remote swarm.`);
  }

  logger.info(formatter.success(`${serviceName} updated successfully.`));
  logger.info("");
}

/**
 * @description Executes deploy sequence.
 * @param {string} sshHost - The remote host to deploy the image to.
 * @param {Object} config - JSON containing the information from the config file.
 * @param {string} targetCWD - CWD for build commands.
 * @param {Object} deployerConfig - Deployer configuration values.
 */
async function deploy(sshHost, config, targetCWD, deployerConfig) {
  const { serviceName, imageName, build } = config;
  const { name: tagName } = deployerConfig;
  displayInfo(serviceName, imageName, build, sshHost);
  let tunnelProcessRef = null;
  try {
    const srcPort = getRegistryPort();
    const { tunnelProcess, destPort } = await createTunnel(sshHost, srcPort, serviceName);
    tunnelProcessRef = tunnelProcess;
    buildStage(build, targetCWD);
    await tagAndPushStage(imageName, srcPort);
    await pullAndTagStage(imageName, sshHost, destPort, tagName);

    let taggedImage = `${tagName}/${imageName}:latest`;
    if (getNumberOfNodes(sshHost) > 1) {
      taggedImage = await handleMultiNodeDeploy(imageName, sshHost, tagName);
    }

    await deployImage(taggedImage, serviceName, sshHost, deployerConfig);
  } catch (error) {
    throw error;
  } finally {
    if (tunnelProcessRef != null) {
      tunnelProcessRef.kill();
    }
  }
}

module.exports = { deploy };
