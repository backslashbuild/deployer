const { buildUsingLocalRegistry } = require("../buildUsingLocalRegistry");
const { log, err, info } = require("../utils/logger");
const YAML = require("yamljs");

exports.command = "up <host> <service>";
exports.desc = "Deploys specified service to specified host";
exports.builder = (yargs) => {
  yargs
    .option("f", {
      alias: "file",
      describe: "Path to the config file",
      default: "deployer.yml",
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
        throw new Error(err(`Argument check failed: ${argv.f} is not a readable file.`));
      }
    });
};
exports.handler = function (argv) {
  process.env.QUIET_FLAG = argv.quiet ? true : false;
  const configObject = validateConfig(argv.file);

  if (!configObject.services[argv.service]) {
    log(err(`Config file does not contain service: "${argv.service}".`), true);
    process.exit(1);
  }

  //If imageName is not defined in the config use the service key as imageName
  let serviceConfig = configObject.services[argv.service];
  if (!serviceConfig.imageName) {
    serviceConfig.imageName = argv.service;
  }

  buildUsingLocalRegistry(argv.host, serviceConfig);
};

/**
 * @description Reads file at given path, parses it to a object literal and then validates the keys and structure. Calls exit when YAML structure is invalid or missing keys.
 * @param {string} configFilePath - the file path to the .yml file to be parsed.
 * @return parsed object.
 */
function validateConfig(configFilePath) {
  try {
    const config = YAML.parse(fs.readFileSync(configFilePath, "utf8"));
    if (!config.services) {
      log(err(`Config file must contain "services" top level key.`), true);
      process.exit(1);
    } else {
      Object.keys(config.services).forEach((k) => {
        if (k === "all") {
          log(
            err(`Services cannot contain "all" key. Key reserved for deploying all images.`),
            true
          );
          process.exit(1);
        }
        if (!(config.services[k].serviceName && config.services[k].build)) {
          log(err(`Missing key components in service ${k}.`), true);
          log(
            `Each service must contain "serviceName" and "build" keys. "imageName" is optional and uses the service key as default.`
          );
          process.exit(1);
        }
      });
      return config;
    }
  } catch (e) {
    log(err("Exception thrown while parsing config file."), true);
    process.exit(1);
  }
}
