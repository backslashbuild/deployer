#!/usr/bin/env node
const yargs = require("yargs");
const path = require("path");
const fs = require("fs");

const configFileName = "config.json";
const defaultDeployerConfig = require("./bin/res/defaultConfig");
const { logger } = require("./bin/utils/logger");

/**
 * @description Uses yargs to parse command arguments
 */
const options = yargs
  .scriptName("deployer")
  .commandDir("bin/cmds")
  .middleware((argv, yargs) => {
    const deployerConfigFilePath = path.resolve(__dirname, configFileName);
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
    // yargs.deployerConfigFilePath = configFilePath;
  }, true)
  .demandCommand()
  //TODO consider whether it's okay removing strict in benefit of not needing to pass configFilePath through yargs to argv
  // .strict()
  .help()
  .wrap(90).argv;
