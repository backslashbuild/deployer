#!/usr/bin/env node
const yargs = require("yargs");
fs = require("fs");

/**
 * @description Uses yargs to parse command arguments
 */
const options = yargs.commandDir("cmds").demandCommand().strict().help().wrap(90).argv;
