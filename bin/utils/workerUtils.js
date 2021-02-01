const spawn = require("cross-spawn");
const { err, success, isQuiet } = require("./logger");

/**
 * @description Spawns a worker process to execute provided command with arguments.
 * @param {string} command - The command to be executed by the spawned child.
 * @param {Array} args - An array of strings as the arguments for the command.
 * @param {boolean} quiet - Flag indicating whether verbose output should be suppressed.
 * @returns {ChildProcess} worker
 */
function spawnWorker(command, args) {
  const SERVICE_KEY = args[2];
  //uses spawn from cross-spawn instead of child_process.spawn because it ignores the SHEBANG and PATHEXT
  const worker = spawn(command, args, { stdio: isQuiet() ? "ignore" : "inherit" });

  // worker.stdout.on("data", function (data) {
  //   console.log(info(`${SERVICE_KEY}: `) + data.toString());
  // });

  worker.on("exit", function (code) {
    code === 0
      ? console.log(
          success(
            `Worker process for deployment of ${SERVICE_KEY} exited with code ` + code.toString()
          )
        )
      : console.log(
          err(`Worker process for deployment of ${SERVICE_KEY} exited with code ` + code.toString())
        );
  });
  return worker;
}

module.exports = { spawnWorker };
