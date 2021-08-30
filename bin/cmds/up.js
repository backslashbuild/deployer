const { deploy } = require("../services/deploy");
const { logger, formatter } = require("../utils/textUtils");
const YAML = require("yamljs");
const fs = require("fs");
const { spawnWorker } = require("../utils/workerUtils");
const { cosmiconfigSync } = require("cosmiconfig");
const { exit } = require("yargs");

const explorerSync = cosmiconfigSync("", { searchPlaces: ["deployer.yml"] });

exports.command = "up <host> <service> [services..]";
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
    .check((argv) => {
      try {
        fs.accessSync(argv.f, fs.R_OK);
        return true;
      } catch (e) {
        // Note: the fallback for locating the config file will only work if the -f flag has not been explicitly defined
        // deployer.yml is the default value of -f
        if (argv.f === "deployer.yml") {
          const result = explorerSync.search();
          if (result && result.filepath) {
            argv.targetCWD = result.filepath.substr(0, result.filepath.lastIndexOf("\\"));
            //update both aliases of the file path
            argv.f = result.filepath;
            argv.file = result.filepath;
            try {
              fs.accessSync(argv.f, fs.R_OK);
              return true;
            } catch (e2) {
              throw new Error(
                formatter.error(`Argument check failed: ${argv.f} is not a readable file.`)
              );
            }
          }
        }
        throw new Error(
          formatter.error(`Argument check failed: ${argv.f} is not a readable file or not found.`)
        );
      }
    });
};
exports.handler = function (argv) {
  const serviceArray = [].concat(argv.service).concat(argv.services);
  const configObject = validateConfig(argv.file);

  if (serviceArray.length == 1) {
    if (!configObject.services[argv.service]) {
      logger.fatal(formatter.error(`Config file does not contain service: "${argv.service}".`));
      exit(1);
    }

    //If imageName is not defined in the config use the service key as imageName
    let serviceConfig = configObject.services[argv.service];
    if (!serviceConfig.imageName) {
      serviceConfig.imageName = argv.service;
    }

    deploy(argv.host, serviceConfig, argv.targetCWD, argv.deployerConfig);
  } else {
    // Calling deployer as a child means that every service deploy will use its own tunnel.
    // Potential improvement is to create the tunnel here and pass it as a parameter so that a single tunnel shared by all processes.
    const workers = [];
    serviceArray.forEach((s) => {
      args = [`up`, `${argv.host}`, `${s}`, `-f`, `${argv.file}`];
      argv.quiet ? args.push("--quiet") : args;
      const worker = spawnWorker(`deployer`, args, s);
      workers.push(worker);
    });
  }
};

/**
 * @description Reads file at given path, parses it to a object literal and then validates the keys and structure. Calls exit when YAML structure is invalid or missing keys.
 * @param {string} configFilePath - the file path to the .yml file to be parsed.
 * @returns parsed object.
 */
function validateConfig(configFilePath) {
  try {
    const config = YAML.parse(fs.readFileSync(configFilePath, "utf8"));
    if (!config.services) {
      logger.fatal(formatter.error(`Config file must contain "services" top level key.`));
      exit(1);
    } else {
      Object.keys(config.services).forEach((k) => {
        if (k === "all") {
          logger.fatal(
            formatter.error(
              `Services cannot contain "all" key. Key reserved for deploying all images.`
            )
          );
          exit(1);
        }
        if (!(config.services[k].serviceName && config.services[k].build)) {
          logger.fatal(
            formatter.error(
              `Missing key components in service ${k}. Each service must contain "serviceName" and "build" keys. "imageName" is optional and uses the service key as default.`
            )
          );
          exit(1);
        }
      });
      return config;
    }
  } catch (e) {
    logger.fatal(formatter.error("Exception thrown while parsing config file."));
    logger.debug(e);
    exit(1);
  }
}
