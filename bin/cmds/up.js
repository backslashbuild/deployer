const { deploy } = require("../deploy");
const { log, err, info } = require("../utils/logger");
const YAML = require("yamljs");
const { spawnWorker } = require("../utils/workerUtils");
const { cosmiconfigSync } = require("cosmiconfig");

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
    .option("quiet", {
      describe: "Suppresses verbose output from worker processes",
      type: "boolean",
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
          if (result.filepath) {
            argv.targetCWD = result.filepath.substr(0, result.filepath.lastIndexOf("\\"));
            //update both aliases of the file path
            argv.f = result.filepath;
            argv.file = result.filepath;
            try {
              fs.accessSync(argv.f, fs.R_OK);
              return true;
            } catch (e2) {
              throw new Error(err(`Argument check failed: ${argv.f} is not a readable file.`));
            }
          }
        }
        throw new Error(err(`Argument check failed: ${argv.f} is not a readable file.`));
      }
    });
};
exports.handler = function (argv) {
  const serviceArray = [].concat(argv.service).concat(argv.services);
  process.env.QUIET_FLAG = argv.quiet ? true : false;
  const configObject = validateConfig(argv.file);

  if (serviceArray.length == 1) {
    if (!configObject.services[argv.service]) {
      log(err(`Config file does not contain service: "${argv.service}".`), true);
      process.exit(1);
    }

    //If imageName is not defined in the config use the service key as imageName
    let serviceConfig = configObject.services[argv.service];
    if (!serviceConfig.imageName) {
      serviceConfig.imageName = argv.service;
    }

    deploy(argv.host, serviceConfig, argv.targetCWD);
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
