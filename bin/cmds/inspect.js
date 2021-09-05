const { getServiceLabels, getServiceImage } = require("../utils/dockerUtils");
const { formatter, logger } = require("../utils/textUtils");

exports.command = "inspect <host> <service>";
exports.desc = "Inspect deployer metadata of remote service.";
exports.builder = function (yargs) {};
exports.handler = function (argv) {
  const { service, host } = argv;
  logger.trace("deployer inspect called.", { host, service });

  logger.info(`Fetching ${formatter.info(service)} labels from ${formatter.info(host)}...`);
  const serviceLabelsResult = getServiceLabels(service, host);
  logger.trace("Fetched service labels.", { ...serviceLabelsResult });

  if (typeof serviceLabelsResult === "string") {
    throw new Error(serviceLabelsResult);
  }

  if (!serviceLabelsResult.deployer) {
    throw new Error("Deployer label not found.");
  }

  let deployerMetadata;
  try {
    logger.trace("JSON parsing deployer label.");
    deployerMetadata = JSON.parse(serviceLabelsResult.deployer);
    logger.trace("JSON parsed deployer label.", deployerMetadata);
  } catch (e) {
    logger.debug(e);
    throw new Error(
      `Malformed deployer label, content cannot be JSON parsed: ${serviceLabelsResult.deployer}`
    );
  }

  logger.trace("Fetching remote service current image name");
  const imageName = getServiceImage(service, host);
  logger.trace("Fetched remote service current image name", { imageName });
  const metaImageName = deployerMetadata.image;

  logger.info(formatter.success(deployerMetadata));
  if (imageName !== metaImageName) {
    logger.warn(formatter.warning("Deployer metadata does not match currently deployed image."));
  }
};
