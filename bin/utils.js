const colors = require("colors");
const spawn = require("cross-spawn");

/**
 * @description Colours the text red.
 * @param {string} text - Text to be coloured.
 */
function err(text) {
  return colors.red(text);
}

/**
 * @description Colours the text yellow.
 * @param {string} text - Text to be coloured.
 */
function info(text) {
  return colors.yellow(text);
}

/**
 * @description Colours the text green.
 * @param {string} text - Text to be coloured.
 */
function success(text) {
  return colors.green(text);
}

/**
 * @description Spawns a worker process to execute provided command with arguments.
 * @param {string} command - The command to be executed by the spawned child.
 * @param {Array} args - An array of strings as the arguments for the command.
 * @param {boolean} quiet - Flag indicating whether verbose output should be suppressed.
 * @returns {ChildProcess} worker
 */
function spawnWorker(command, args) {
  const SERVICE_KEY = args[0];
  //uses spawn from cross-spawn instead of child_process.spawn because it ignores the SHEBANG
  const worker = spawn(command, args);

  worker.stdout.on("data", function (data) {
    console.log(info(`${SERVICE_KEY}: `) + data.toString());
  });

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
  //alternative to using spawn, but you get output at the end of execution instead of stream.
  // const worker = require("child_process").exec(
  //   `deployer ${k} -f ${CONFIG_FILE_PATH}`,
  //   (error, stdout, stderr) => {
  //     console.log(stdout);
  //   }
  // );
  return worker;
}

module.exports = { err, info, success, spawnWorker };
