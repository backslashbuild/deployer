const spawn = require("cross-spawn");
const { logger, formatter } = require("./textUtils");

/**
 * @description Spawns a cross-spawn worker process to execute provided command with arguments.
 * @param {string} command - The command to be executed by the spawned child.
 * @param {Array} args - An array of strings as the arguments for the command.
 * @param {string} name - Optional string for the name of the process to be used in logs.
 * @returns {ChildProcess} worker
 */
function spawnWorker(command, args, name = "Cross-Spawn ChildProcess") {
  //uses spawn from cross-spawn instead of child_process.spawn because it ignores the SHEBANG and PATHEXT
  const worker = spawn(command, args, { stdio: "inherit" });

  worker.on("exit", function (code) {
    code === 0
      ? logger.info(
          formatter.success(
            `Worker process for deployment of ${name} exited with code ` + code.toString()
          )
        )
      : logger.error(
          formatter.error(
            `Worker process for deployment of ${name} exited with code ` + code.toString()
          )
        );
  });
  return worker;
}

/**
 * An awaitable wrapper around "child_process".spawn(command,args). Obeys by the global --quiet flag.
 * @param {string} command - The command to be executed by the spawned child.
 * @param {Array} args - An array of strings as the arguments for the command.
 * @returns {Promise<string>} The exit code of the process.
 */
async function awaitableSpawnProcess(command, args) {
  const worker = require("child_process").spawn(command, args, {
    stdio: logger.isLevelSilent(logger.loglevels.INFO) ? "ignore" : "inherit",
  });
  const exitCode = await new Promise((resolve, reject) => {
    worker.on("exit", (code) => {
      resolve(code);
    });
  });
  return exitCode;
}

module.exports = { spawnWorker, awaitableSpawnProcess };
