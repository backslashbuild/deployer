#!/usr/bin/env node
const { exit } = require("yargs");
const yargs = require("yargs");
const {
  checkForUpdatesMiddleware,
  loadDeployerConfigMiddleware,
} = require("./bin/services/middleware");
const setloglevelMiddleware = require("./bin/services/middleware/setloglevelMiddleware");
const { convertInputToLogLevel } = require("./bin/utils/inputUtils");
const { logger, formatter } = require("./bin/utils/textUtils");

/**
 * @description Uses yargs to parse command arguments
 */
yargs
  .scriptName("deployer")
  .option("q", {
    alias: "quiet",
    describe: "Suppresses verbose output. Sets log-level to 1.",
    type: "boolean",
  })
  .option("l", {
    alias: "log-level",
    describe:
      "Sets the log-level to provided level. Accepts numerical value between 0-7 or one of the choices.",
    choices: Object.keys(logger.loglevels),
    coerce: (value) => {
      if (value) {
        return convertInputToLogLevel(value);
      }
    },
  })
  .middleware([
    (argv, yargs) => {
      loadDeployerConfigMiddleware(argv);
    },
    (argv, yargs) => {
      setloglevelMiddleware(argv);
    },
    async (argv, yargs) => {
      await checkForUpdatesMiddleware(argv);
    },
  ])
  .demandCommand()
  .commandDir("bin/cmds")
  .help()
  .group(["q", "l", "help", "version"], "Global options:")
  .fail((msg, e, yargs) => {
    /* 
        Yargs does not consistently put the error message into <msg>. When that happens, we have to extract it from the error ourselves
        `e` will look like this:  
            
        Error: <ERROR_MESSAGE>
          stacktrace line 1
          stacktrace line 2
  
        e.toString() returns "Error: <ERROR_MESSAGE>"
      */

    if (msg) {
      const errorMessage = msg;
      logger.fatal(formatter.error(errorMessage));
      logger.debug("", formatter.error(e));
      yargs.showHelp();
    } else if (e) {
      const errorMessage = /Error: ([\s\S]*)/.exec(e.toString())[1];
      logger.fatal(formatter.error(errorMessage));
      logger.debug("", formatter.error(e));
      logger.info(
        "\nFor help with the command run it with the `--help` flag, or visit the documentation."
      );
    } else {
      yargs.showHelp();
    }
    exit(1);
  })
  .wrap(90).argv;
