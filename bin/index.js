#!/usr/bin/env node
const yargs = require("yargs");
const { exit } = require("process");
const { err } = require("./utils");
const { deploy } = require("./deploy");
fs = require("fs");

const options = yargs
  .usage("Usage: <SERVICE> [OPTIONAL] -f <CONFIGFILE>")
  .option("f", {
    alias: "file",
    describe: "Path to the config file.",
    default: "deployer.json",
    //read this is needed for paths
    normalize: true,
    type: "string",
  })
  .coerce("f", validateConfig)
  .check((argv, options) => {
    if (argv._.length !== 1) {
      throw new Error("Service name must be provided.");
    } else {
      return true; // tell Yargs that the arguments passed the check
    }
  }).argv;

function validateConfig(configFilePath) {
  try {
    const json = JSON.parse(fs.readFileSync(configFilePath, "utf8"));
    Object.keys(json).forEach((k) => {
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
    console.log(e);
    exit(1);
  }
}

if (!options.f[options._]) {
  console.log(err(`Config file does not contain key: "${options._}".`));
  exit(1);
}

deploy(options._, options.f[options._]);
