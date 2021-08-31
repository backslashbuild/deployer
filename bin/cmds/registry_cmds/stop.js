const { stopRegistry } = require("../../services/registry");

exports.command = "stop";
exports.desc = "Stops local docker registry";
exports.builder = {};
exports.handler = function (argv) {
  stopRegistry();
};
