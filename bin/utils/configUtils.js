const os = require("os");
const path = require("path");

const deployerDirectory = path.resolve(os.homedir(), ".deployer");
const configFileName = "config.json";
const deployerConfigFilePath = path.resolve(deployerDirectory, configFileName);

module.exports = {
  deployerDirectory,
  configFileName,
  deployerConfigFilePath,
};
