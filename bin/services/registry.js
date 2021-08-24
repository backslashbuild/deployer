const { exit } = require("yargs");
const { err, success, info } = require("../utils/logger");
const shell = require("shelljs");

/**
 * @description Runs a local docker registry
 * @param {string} port - The port the registry should listen at. Should be same as tunnel.
 */
function runRegistry(port) {
  console.log("Creating local registry ...");
  const result = shell.exec(
    `docker run -d -p ${port}:5000 --restart=always --name deployer-registry registry:2`
  );
  if (result.code !== 0) {
    console.error(err("Failed to run local registry."));
    exit(1);
  }
  console.log(success(`Registry listening at port ${info(port)} ...`));
}

/**
 * @description Stops the local docker registry
 */
function stopRegistry() {
  console.log("Stopping local registry ...");
  const stopResult = shell.exec(`docker container stop deployer-registry`, { silent: true });
  if (stopResult.code !== 0) {
    console.error(err("Failed to stop local registry."));
    exit(1);
  }
  const removeResult = shell.exec(`docker container rm -v deployer-registry`, { silent: true });
  if (removeResult.code !== 0) {
    console.error(err("Failed to remove local registry container."));
    exit(1);
  }
  console.log(success("Local registry stopped succesffully ..."));
}

module.exports = { runRegistry, stopRegistry };
