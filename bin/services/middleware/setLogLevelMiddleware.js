const { logger } = require("../../utils/textUtils");

function setLogLevelMiddleware(argv) {
  if (argv.l) {
    process.env.LOG_LEVEL = logger.loglevels[argv.l.toUpperCase()];
  } else if (argv.quiet) {
    process.env.LOG_LEVEL = 1;
  } else {
    process.env.LOG_LEVEL = logger.loglevels[argv.deployerConfig.loglevel];
  }
}

module.exports = setLogLevelMiddleware;
