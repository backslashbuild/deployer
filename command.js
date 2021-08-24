#!/usr/bin/env node
const yargs = require("yargs");
const path = require("path");
const fs = require("fs");

const configFileName = "config.json";
const defaultConfig = require("./bin/res/defaultConfig");

/**
 * @description Uses yargs to parse command arguments
 */
const options = yargs
  .scriptName("deployer")
  .commandDir("bin/cmds")
  .middleware((argv, yargs) => {
    const configFilePath = path.resolve(__dirname, configFileName);
    const exists = fs.existsSync(configFilePath);
    if (!exists) {
      fs.appendFileSync(configFilePath, JSON.stringify(defaultConfig));
    }
    try {
      fs.accessSync(configFilePath, fs.R_OK | fs.W_OK);
    } catch (e) {
      throw new Error(err(`Failed to access config file: "${configFilePath}"`));
    }
    // yargs.configFilePath = configFilePath;
    argv.configFilePath = configFilePath;
  }, true)
  .demandCommand()
  //TODO consider whether it's okay removing strict in benefit of not needing to pass configFilePath through yargs to argv
  // .strict()
  .help()
  .wrap(90).argv;
