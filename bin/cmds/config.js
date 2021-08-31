exports.command = "config <command>";
exports.desc = "Manage the deployer config.";
exports.builder = function (yargs) {
  return yargs.commandDir("config_cmds");
};
exports.handler = function (argv) {};
