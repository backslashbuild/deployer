const { runRegistry } = require("../../services/registry");

exports.command = "start";
exports.desc = "Starts up deployer local docker registry";
exports.builder = (yargs) => {
  yargs.option("p", {
    alias: "port",
    describe: "The port to run the registry on",
    default: "20000",
  });
};
exports.handler = function (argv) {
  runRegistry(argv.port);
};
