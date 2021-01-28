const { buildLocallyAndCopy } = require("../buildLocallyAndCopy");
const { log, err } = require("../utils/logger");

exports.command = "up <host> <service>";
exports.desc = "Deploys specified service to specified host";
exports.builder = (yargs) => {
  yargs
    .option("f", {
      alias: "file",
      describe: "Path to the config file",
      default: "deployer.json",
      normalize: true,
      type: "string",
    })
    .option("quiet", {
      describe: "Suppresses verbose output from worker processes",
      type: "boolean",
    })
    .check((argv) => {
      try {
        fs.accessSync(argv.f, fs.R_OK);
        return true;
      } catch (e) {
        throw new Error(err(`Argument check failed: ${arg.f} is not a readable file.`));
      }
    });
};
exports.handler = function (argv) {
  process.env.QUIET_FLAG = argv.quiet ? true : false;
  const configJSON = validateConfig(argv.file);
  if (!configJSON[argv.service]) {
    log(err(`Config file does not contain key: "${argv.service}".`), true);
    process.exit(1);
  }
  buildLocallyAndCopy(argv.service, argv.host, configJSON[argv.service]);
};

/**
 * @description Reads file at given path, parses it to a JSON object and then validates the structure. Calls exit when JSON structure is invalid or missing keys.
 * @param {string} configFilePath - the file path to the .json object to be parsed.
 * @return parsed JSON object.
 */
function validateConfig(configFilePath) {
  try {
    const json = JSON.parse(fs.readFileSync(configFilePath, "utf8"));
    log(json);
    Object.keys(json).forEach((k) => {
      if (k === "all") {
        log(
          err(`Config file cannot contain "all" key. Key reserved for deploying all images.`),
          true
        );
        process.exit(1);
      }
      if (!(json[k].serviceName && json[k].imageName && json[k].build)) {
        log(
          err(
            `Config file must contain "serviceName", "imageName" and "build" keys for every key.`
          ),
          true
        );
        process.exit(1);
      }
    });
    return json;
  } catch (e) {
    log(err("Exception thrown while parsing config file."), true);
    process.exit(1);
  }
}
