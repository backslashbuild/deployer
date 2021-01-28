exports.command = "registry <command>";
exports.desc = "Manage the deployer registry";
exports.builder = function (yargs) {
  return yargs.commandDir("registry_cmds");
};
exports.handler = function (argv) {};
