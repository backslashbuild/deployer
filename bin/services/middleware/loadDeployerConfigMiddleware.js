const fs = require("fs");
const path = require("path");
const { logger } = require("../../utils/logger");

const configFileName = "config.json";
const defaultDeployerConfig = require("../../res/defaultConfig.json");

function loadDeployerConfigMiddleware({ argv, installPath }) {
  const deployerConfigFilePath = path.resolve(installPath, configFileName);
  const exists = fs.existsSync(deployerConfigFilePath);
  if (!exists) {
    fs.appendFileSync(deployerConfigFilePath, JSON.stringify(defaultDeployerConfig));
  }
  try {
    fs.accessSync(deployerConfigFilePath, fs.R_OK | fs.W_OK);
  } catch (e) {
    throw new Error(err(`Failed to access config file: "${deployerConfigFilePath}"`));
  }
  try {
    const deployerConfigFileText = fs.readFileSync(deployerConfigFilePath, "utf8");
    const deployerConfig = JSON.parse(deployerConfigFileText);
    argv.deployerConfigFilePath = deployerConfigFilePath;
    argv.deployerConfig = deployerConfig;
  } catch (e) {
    console.log(
      `${logger.err("Warning:")} ${logger.info(
        "Failed to parse deployer config. Using default values."
      )}`
    );
    argv.deployerConfig = defaultDeployerConfig;
  }
}

module.exports = loadDeployerConfigMiddleware;
