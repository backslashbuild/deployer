const spawn = require("cross-spawn");
const { err, success, isQuiet } = require("./logger");

/**
 * @description Spawns a worker process to execute provided command with arguments.
 * @param {string} command - The command to be executed by the spawned child.
 * @param {Array} args - An array of strings as the arguments for the command.
 * @param {string} name - Optional string for the name of the process to be used in logs.
 * @returns {ChildProcess} worker
 */
function spawnWorker(command, args, name = "Cross-Spawn ChildProcess") {
  //uses spawn from cross-spawn instead of child_process.spawn because it ignores the SHEBANG and PATHEXT
  const worker = spawn(command, args, { stdio: isQuiet() ? "ignore" : "inherit" });

  worker.on("exit", function (code) {
    code === 0
      ? log(
          success(`Worker process for deployment of ${name} exited with code ` + code.toString()),
          true
        )
      : log(err(`Worker process for deployment of ${name} exited with code ` + code.toString())),
      true;
  });
  return worker;
}

module.exports = { spawnWorker };
