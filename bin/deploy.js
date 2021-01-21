const shell = require("shelljs");
const { gzip } = require("node-gzip");
const { err, success, info } = require("./utils");
fs = require("fs");
const fsPromises = fs.promises;

function generateFileName(key) {
  return `deployer-${key}-${Date.now()}`;
}

//Info stage
function displayInfo({ serviceName, imageName, build, sshHost }) {
  shell.echo(`Service name: ${info(serviceName)}`);
  shell.echo(`Image name: ${info(imageName)}`);
  shell.echo(`Build command: ${info(build)}`);
  shell.echo(`SSH host: ${info(sshHost)}`);
  shell.echo("");
}

//Building stage
function buildingStage({ build }) {
  shell.echo(`Building the image...`);
  shell.exec(build);
  shell.echo(success(`Building completed.`));
  shell.echo("");
}

//Saving stage
async function savingStage(fileName, { imageName }) {
  shell.echo(`Saving image to ${info(`${fileName}.tar.gz`)} ...`);

  shell.echo(`Creating intermediate file ${info(`${fileName}.tar`)} ...`);
  const saveResult = shell.exec(`docker save ${imageName} -o ${fileName}.tar`);
  if (saveResult.code !== 0) {
    shell.echo(err(saveResult.stderr));
    shell.exit(1);
  }

  shell.echo(`Creating ${info(`${fileName}.tar.gz`)} ...`);
  const tarData = await fsPromises.readFile(`${fileName}.tar`);
  const compressed = await gzip(tarData);
  await fsPromises.writeFile(`${fileName}.tar.gz`, compressed);

  shell.echo(success("Saving completed."));
  shell.echo("");
}

//Copying stage
function copyingStage(fileName, { sshHost }) {
  shell.echo(`Copying ${info(`${fileName}.tar.gz`)} to ${info(sshHost)} ...`);
  const copyResult = shell.exec(`scp ./${fileName}.tar.gz ${sshHost}:${fileName}.tar.gz`, {
    silent: true,
  });
  if (copyResult.code !== 0) {
    shell.echo(err(copyResult.stderr));
    shell.exit(1);
  }
  shell.echo(success(`Copy successful.`));
  shell.echo("");
}

//Loading stage
function loadingStage(fileName, { sshHost }) {
  shell.echo(`Loading the image...`);

  shell.env.DOCKER_HOST = `ssh://${sshHost}`;
  const loadResult = shell.exec(`docker load -i ${fileName}.tar.gz`, { silent: true });
  if (loadResult.code !== 0) {
    shell.echo(err(loadResult.stderr));
    shell.exit(1);
  }

  shell.echo(success(`Loading completed.`));
  shell.echo("");
}

//Deployment stage
function deploymentStage({ serviceName, imageName }) {
  shell.echo(`Deploying the image...`);
  //TODO
  shell.exec(`docker service update --image ${imageName} ${serviceName}`);

  shell.echo(success(`Deployment completed.`));
  shell.echo("");
}

//Cleanup stage
function cleanupStage(fileName, { sshHost }) {
  shell.echo("Starting clean-up ...");
  fs.unlinkSync(`${fileName}.tar`);
  fs.unlinkSync(`${fileName}.tar.gz`);
  if (shell.exec(`ssh ${sshHost} "rm ${fileName}.tar.gz"`).code === 0) {
    shell.echo(success("Cleanup completed."));
  } else {
    shell.echo(err(`Failed to remove ${fileName}.tar.gz from remote host.`));
  }
  shell.env.DOCKER_HOST = "";
  shell.echo(success("Clean-up completed."));
}

async function deploy(key, config) {
  const fileName = generateFileName(key);
  displayInfo(config);
  buildingStage(config);
  await savingStage(fileName, config);
  copyingStage(fileName, config);
  loadingStage(fileName, config);
  deploymentStage(config);
  cleanupStage(fileName, config);
}

module.exports = { deploy };

//Notes:
// Async shell - potentially useful to deploy multiple images
// var child = exec('some_long_running_process', {async:true});
// child.stdout.on('data', function(data) {
//   /* ... do something with data ... */
// });
