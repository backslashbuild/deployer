const { stopRegistry } = require("../../registry");

exports.command = "stop";
exports.desc = "Stops local docker registry";
exports.builder = {};
exports.handler = function (argv) {
  stopRegistry();
};
