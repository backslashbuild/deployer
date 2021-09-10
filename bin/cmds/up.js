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
              throw new Error(`Argument check failed: ${argv.f} is not a readable file.`);
            }
          }
        }
        throw new Error(`Argument check failed: ${argv.f} is not a readable file or not found.`);
      }
    });
};
exports.handler = async function (argv) {
  const serviceArray = [].concat(argv.service).concat(argv.services);
  const configObject = validateConfig(argv.file);

  if (serviceArray.length == 1) {
    if (!configObject.services[argv.service]) {
      throw new Error(`Config file does not contain service: "${argv.service}".`);
    }

    //If imageName is not defined in the config use the service key as imageName
    let serviceConfig = configObject.services[argv.service];
    if (!serviceConfig.imageName) {
      serviceConfig.imageName = argv.service;
    }

    await deploy(argv.host, serviceConfig, argv.targetCWD, argv.deployerConfig);
  } else {
    // Calling deployer as a child means that every service deploy will use its own tunnel.
    // Potential improvement is to create the tunnel here and pass it as a parameter so that a single tunnel shared by all processes.
    const workers = [];
    serviceArray.forEach((s) => {
      args = [`up`, `${argv.host}`, `${s}`, `-f`, `${argv.file}`];
      if (argv.q) {
        args.push(`-q`);
        args.push(argv["q"]);
      }
      if (argv.l) {
        args.push("-l");
        args.push(argv["l"]);
      }
      args.push(`--check-updates`);
      args.push("false");
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
    var config = YAML.parse(fs.readFileSync(configFilePath, "utf8"));
  } catch (e) {
    logger.error(e);
    throw new Error(`Exception thrown while parsing config file.`);
  }
  if (!config.services) {
    throw new Error(`Config file must contain "services" top level key.`);
  }

  Object.keys(config.services).forEach((key) => {
    if (!(config.services[key].serviceName && config.services[key].build)) {
      throw new Error(
        `Missing key components in service ${key}. Each service must contain "serviceName" and "build" keys. "imageName" is optional and uses the service key as default.`
      );
    }
  });
  return config;
}
