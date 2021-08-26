#!/usr/bin/env node
const yargs = require("yargs");
const {
  checkForUpdatesMiddleware,
  loadDeployerConfigMiddleware,
} = require("./bin/services/middleware");

/**
 * @description Uses yargs to parse command arguments
 */
yargs
  .scriptName("deployer")
  .commandDir("bin/cmds")
  .middleware(
    [
      async (argv, yargs) => {
        await checkForUpdatesMiddleware({ installPath: __dirname });
      },
      (argv, yargs) => {
        loadDeployerConfigMiddleware({ argv, installPath: __dirname });
      },
    ],
    true
  )
  .demandCommand()
  .help()
  .wrap(90).argv;
