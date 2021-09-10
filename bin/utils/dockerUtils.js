const shell = require("shelljs");

/**
 * @description Gets the port on which the deployer doker registry is running.
 * @param {string} containerName - the name of the container whose port is to be returned.
 * @returns {string} The port on which container is exposed at.
 */
function getContainerPort(containerName) {
  const result = shell.exec(`docker port ${containerName}`, { silent: true });
  if (result.code !== 0) {
    return -1;
  }
  //example stdout: "5000/tcp -> 0.0.0.0:20000"
  const rx = /0.0.0.0:([0-9]+)/g;
  let arr = rx.exec(result);
  return arr[1];
}

/**
 * @description Gets the port on which the deployer docker registry is running.
 * @param {string} serviceName - The name of the service whose port is to be returned.
 * @param {string} sshHost - The remote host containing the service.
 * @returns {string} The port on which deployer-registry is exposed at.
 */
function getServicePort(serviceName, sshHost) {
  const result = shell.exec(`docker -H ssh://${sshHost} service inspect ${serviceName}`, {
    silent: true,
  });
  if (result.code !== 0) {
    return -1;
  }
  const jsonResult = JSON.parse(result.stdout);
  return jsonResult[0].Spec.EndpointSpec.Ports[0].PublishedPort;
}

/**
 * @description Gets the labels of a remote service.
 * @param {string} serviceName - The name of the service whose labels are to be returned.
 * @param {string} sshHost - The remote host containing the service.
 * @returns {string|object} The labels of the service as a json object. If it fails to get the labels returns the error message instead.
 */
function getServiceLabels(serviceName, sshHost) {
  const result = shell.exec(`docker -H ssh://${sshHost} service inspect ${serviceName}`, {
    silent: true,
  });
  if (result.code !== 0) {
    return result.stderr;
  }
  const jsonResult = JSON.parse(result.stdout);
  return jsonResult[0].Spec.Labels;
}

/**
 * @description Gets the current image of a remote service.
 * @param {string} serviceName - The name of the service whose labels are to be returned.
 * @param {string} sshHost - The remote host containing the service.
 * @returns {string} The image of the service. If it fails to get the labels returns the error message instead.
 */
function getServiceImage(serviceName, sshHost) {
  const result = shell.exec(
    `docker -H ssh://${sshHost} service inspect ${serviceName} --format {{.Spec.TaskTemplate.ContainerSpec.Image}}`,
    {
      silent: true,
    }
  );
  if (result.code !== 0) {
    return result.stderr;
  }
  return result.stdout.trim();
}

function getAllPortsExposedInSwarm(sshHost) {
  let output = [];
  const result = shell.exec(`docker -H ssh://${sshHost} service ls --format "{{.Ports}}"`, {
    silent: true,
  });
  if (result.code !== 0) {
    return output;
  }
  //example result
  // *:5000->5000/tcp
  // *:8081->8081/tcp
  // *:8080->8080/tcp
  const resultSplit = result.stdout.split(":");
  // [ '*', '5000->5000/tcp\n*', '8081->8081/tcp\n*', '8080->8080/tcp\n' ]
  for (let i = 1; i < resultSplit.length; i++) {
    output.push(resultSplit[i].split("-")[0]);
  }
  return output;
}

/**
 * @description Utility function for scraping the name of the currently active node in the swarm.
 * @param {string} sshHost - The host containing the swarm.
 * @returns {string} The name of the active node.
 */
function getNodeName(sshHost) {
  const result = shell.exec(`docker -H ssh://${sshHost} node ls`, { silent: true });
  return result.stdout.toString().split(" * ")[1].trim().split(" ")[0];
}

/**
 * @description Utility function for scraping the number of nodes in the swarm.
 * @param {string} sshHost - The host containing the swarm.
 * @returns {number} The number of nodes in the swarm.
 */
function getNumberOfNodes(sshHost) {
  const result = shell.exec(`docker -H ssh://${sshHost} node ls`, { silent: true });
  return result.stdout.toString().split(`\n`).length - 2;
}

module.exports = {
  getNodeName,
  getContainerPort,
  getNumberOfNodes,
  getServicePort,
  getServiceLabels,
  getServiceImage,
  getAllPortsExposedInSwarm,
};
