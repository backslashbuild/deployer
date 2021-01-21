const yargs = require("yargs");
const shell = require("shelljs");
const colors = require("colors");
const { gzip } = require("node-gzip");
fs = require("fs");
const fsPromises = fs.promises;

function err(text) {
  return colors.red(text);
}

function info(text) {
  return colors.yellow(text);
}

function success(text) {
  return colors.green(text);
}

const options = yargs
  .usage("Usage: -s <service> [OPTIONAL] -u <url> [OPTIONAL]")
  .option("s", { alias: "service", describe: "Service name", type: "string", demandOption: true })
  .option("u", {
    alias: "url",
    describe: "Remote user host. Example: user@example.com",
    type: "string",
    demandOption: true,
  }).argv;

const serviceName = options.service;
const imageName = serviceName;
const sshTarget = options.url;
console;

//Info stage
function displayInfo() {
  shell.echo(`Service name: ${info(serviceName)}`);
  shell.echo(`Image name: ${info(imageName)}`);
  shell.echo(`SSH host: ${info(sshTarget)}`);
}

//Building stage
function buildingStage() {
  shell.echo(`Building the image...`);
  shell.echo(success(`Building completed.`));
}

//Saving stage
async function savingStage() {
  shell.echo(`Saving image to ${info(`${imageName}.tar.gz`)} ...`);
  const saveResult = shell.exec(`docker save ${imageName} -o ${imageName}.tar`);
  if (saveResult.code !== 0) {
    shell.echo(err(saveResult.stderr));
    shell.exit(1);
  }
  const tarData = await fsPromises.readFile(`${imageName}.tar`);
  const compressed = await gzip(tarData);
  await fsPromises.writeFile(`${imageName}.tar.gz`, compressed);

  // The intermediate .tar file is created because of the way powershell handles stdout which break tar headers.
  // https://stackoverflow.com/questions/40622162/docker-load-and-save-archive-tar-invalid-tar-header
  // const compressed = await gzip(
  //   shell.exec(`docker save tutum/hello-world`, { silent: true }).stdout
  // );
  // await fsPromises.writeFile(`${imageName}.tar.gz`, compressed);

  shell.echo(success("Saving completed."));
}

//Copying stage
function copyingStage() {
  shell.echo(`Copying ${info(`${imageName}.tar.gz`)} to ${info(sshTarget)} ...`);
  const copyResult = shell.exec(`scp ./${imageName}.tar.gz ${sshTarget}:${imageName}.tar.gz`, {
    silent: true,
  });
  if (copyResult.code !== 0) {
    shell.echo(err(copyResult.stderr));
    shell.exit(1);
  }
  shell.echo(success(`Copy successful.`));
}

//Loading stage
function loadingStage() {
  shell.echo(`Loading the image...`);
  shell.env.DOCKER_HOST = `ssh://${sshTarget}`;
  const loadResult = shell.exec(`docker load -i ${imageName}.tar.gz`, { silent: true });
  if (loadResult.code !== 0) {
    shell.echo(err(loadResult.stderr));
    shell.exit(1);
  }
  shell.echo(success(`Loading completed.`));
}

//Deployment stage
function deploymentStage() {
  shell.echo(`Deploying the image...`);
  shell.echo(success(`Deployment completed.`));
}

//Cleanup stage
function cleanupStage() {
  shell.echo("Starting clean-up ...");
  fs.unlinkSync(`${imageName}.tar`);
  fs.unlinkSync(`${imageName}.tar.gz`);
  if (shell.exec(`ssh ${sshTarget} "rm ${imageName}.tar.gz"`).code === 0) {
    shell.echo(success("Cleanup completed."));
  } else {
    shell.echo(err(`Failed to remove ${imageName}.tar from remote host.`));
  }
  shell.env.DOCKER_HOST = "";
}

async function deployImageOverSSH() {
  displayInfo();
  shell.echo("");
  // buildingStage();
  shell.echo("");
  await savingStage();
  shell.echo("");
  copyingStage();
  shell.echo("");
  loadingStage();
  shell.echo("");
  // deploymentStage();
  shell.echo("");
  cleanupStage();
  shell.echo("");
}

deployImageOverSSH();

//Notes:
// Async shell - potentially useful to deploy multiple images
// var child = exec('some_long_running_process', {async:true});
// child.stdout.on('data', function(data) {
//   /* ... do something with data ... */
// });
