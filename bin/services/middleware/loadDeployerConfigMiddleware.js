const fs = require("fs");
const path = require("path");
const { logger, formatter } = require("../../utils/textUtils");

const configFileName = "config.json";
const defaultDeployerConfig = require("../../res/defaultConfig.json");

/**
 * @description Middleware that is responsible for loading deployerConfig into argv.
 * 1) If a config file is not found, the default is created and supplied.
 * 2) If a config file is found but is inaccessible or unparsable, the default is used.
 * 3) If a config file is found but has missing keys, the modified keys are used and missing keys supplemented from default config.
 * 4) If a config is present, it is read and stored in argv.
 * @param {object} argv - Argv object supplied from yargs
 */
function loadDeployerConfigMiddleware(argv) {
  const installPath = process.env.INSTALL_PATH;
  const deployerConfigFilePath = path.resolve(installPath, configFileName);

  //If config file does not exist, one is created
  const exists = fs.existsSync(deployerConfigFilePath);
  if (!exists) {
    fs.appendFileSync(deployerConfigFilePath, JSON.stringify(defaultDeployerConfig));
  }

  //Check read and write access rights to config file
  try {
    fs.accessSync(deployerConfigFilePath, fs.R_OK | fs.W_OK);
  } catch (e) {
    //Warn but don't abort job, use default config instead
    logger.error(
      `${formatter.warning(
        `Error: Failed to access config file: "${deployerConfigFilePath}".`
      )} Using default values.`
    );
    logger.debug(e);
    argv.deployerConfig = defaultDeployerConfig;
    return;
  }

  //Read and parse Deployer config file
  try {
    const deployerConfigFileText = fs.readFileSync(deployerConfigFilePath, "utf8");
    const deployerConfig = JSON.parse(deployerConfigFileText);

    //Find missing keys and add them to config
    let configKeysMissing = false;
    Object.keys(defaultDeployerConfig).forEach((key) => {
      if (!Object.keys(deployerConfig).includes(key)) {
        deployerConfig[key] = defaultDeployerConfig[key];
        configKeysMissing = true;
      }
    });
    if (configKeysMissing) {
      fs.writeFileSync(deployerConfigFilePath, JSON.stringify(deployerConfig));
    }

    //Update argv
    argv.deployerConfigFilePath = deployerConfigFilePath;
    argv.deployerConfig = deployerConfig;
  } catch (e) {
    //Warn but don't abort job, use default config instead
    logger.error(
      `${formatter.warning("Error: Failed to parse deployer config.")} Using default values.`
    );
    logger.debug(e);
    argv.deployerConfig = defaultDeployerConfig;
    return;
  }
}

module.exports = loadDeployerConfigMiddleware;
