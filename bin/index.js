#!/usr/bin/env node
const yargs = require("yargs");
const { exit } = require("process");
const { err, spawnWorker } = require("./utils");
const { buildLocallyAndCopy } = require("./buildLocallyAndCopy");
const { buildOnRemote } = require("./buildOnRemote");
fs = require("fs");

/**
 * @description Uses yargs to parse command arguments
 */
const options = yargs
  .usage("Usage: <SERVICE> [OPTIONAL] -f <CONFIGFILE> [OPTIONAL] --quiet")
  .option("f", {
    alias: "file",
    describe: "Path to the config file",
    default: "deployer.json",
    //read this is needed for paths
    normalize: true,
    type: "string",
  })
  .option("quiet", {
    describe: "Suppresses verbose output from worker processes",
    type: "boolean",
  })
  .check((argv, options) => {
    if (argv._.length === 1) {
      return true; // tell Yargs that the arguments passed the check
    } else {
      throw new Error(err("Argument check failed: One service name must be provided."));
    }
  })
  .check((argv, options) => {
    try {
      fs.accessSync(argv.f, fs.R_OK);
      return true;
    } catch (e) {
      throw new Error(err("Argument check failed: Config is not a readable file."));
    }
  }).argv;

/**
 * @description Reads file at given path, parses it to a JSON object and then validates the structure. Calls exit when JSON structure is invalid or missing keys.
 * @param {string} configFilePath - the file path to the .json object to be parsed.
 * @return parsed JSON object.
 */
function validateConfig(configFilePath) {
  try {
    const json = JSON.parse(fs.readFileSync(configFilePath, "utf8"));
    Object.keys(json).forEach((k) => {
      if (k === "all") {
        console.log(
          err(`Config file cannot contain "all" key. Key reserved for deploying all images.`)
        );
        exit(1);
      }
      if (!(json[k].serviceName && json[k].imageName && json[k].build && json[k].sshHost)) {
        console.log(
          err(
            `Config file must contain "serviceName", "imageName", "build" and "sshHost" keys for every key.`
          )
        );
        exit(1);
      }
    });
    return json;
  } catch (e) {
    console.log(err("Exception thrown while parsing config file."));
    exit(1);
  }
}

const SERVICE_KEY = options._[0];
const CONFIG_FILE_PATH = options.f;
const QUIET = options.quiet;

/**
 * @description Deploy single image to remote host over ssh using the key specified as argv._[0].
 * @param {string} configJSON - Parsed JSON object containing the config for the image to be deployed.
 */
function deployOne(configJSON) {
  if (!configJSON[SERVICE_KEY]) {
    console.log(err(`Config file does not contain key: "${SERVICE_KEY}".`));
    exit(1);
  }
  buildLocallyAndCopy(SERVICE_KEY, configJSON[SERVICE_KEY], QUIET);
  // buildOnRemote(SERVICE_KEY, configJSON[SERVICE_KEY], QUIET);
}

/**
 * @description Deploy all images described in the config file to remote host over ssh.
 * @param {string} configJSON - Parsed JSON object containing the config for the images to be deployed.
 */
function deployAll(configJSON) {
  const workers = [];
  Object.keys(configJSON).forEach(async (k) => {
    args = [`${k}`, `-f`, `${CONFIG_FILE_PATH}`];
    QUIET ? args.push("--quiet") : args;
    const worker = spawnWorker(`deployer`, args);
    workers.push(worker);
  });
  console.log(`Deploying all images...\n`);
}

/**
 * @description Entry point to the script.
 */
async function main() {
  const configJSON = validateConfig(CONFIG_FILE_PATH);
  if (SERVICE_KEY == "all") {
    deployAll(configJSON);
  } else {
    deployOne(configJSON);
  }
}

main();
