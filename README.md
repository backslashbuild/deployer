# Deployer v2.0.0

Deployer is an npm package dealing with replacing the image of a service in a remote docker swarm using local docker images. This is achieved by running a local docker registry. The local machine builds and pushes the images to that registry and the remote machine pulls and deploys them using an ssh reverse tunnel.

Version 2 enables the functionality in a multi-node environment. This id one by running a docker registry as a service in the swarm, which allows all nodes to access the newly pulled image.

## Prerequisites

- [Docker](https://www.docker.com/products/docker-desktop) must be installed on local machine.
- Established ssh connection between remote host and local machine (authorized_keys).
- An existing docker swarm on remote machine containing the services whose image deployer should be able to change.

## Installation

Use the node package manager [npm](https://nodejs.org/en/download/) to install deployer.

```bash
npm install -g https://github.com/backslashbuild/deployer
```

## Usage

Deployer must be used in conjuction with a config file stating. By default the script looks for deployer.yml at cwd. Alternatively, a path to another yml file can be specified using the -f option.

### Example deployer.yml

- **"serviceName"**: The name of the service as it appears on the swarm.
- **"build"**: The command used to build the image.
- **"imageName"**: The name of the image used to update the remote service. This key is optional. If omitted it defaults to the name of the service. In the example below, for "hello-world2" service, "imageName" will take the value "hello-world2".

```yml
services:
  hello-world1:
    serviceName: stack_hello-world1
    imageName: tutum/hello-world
    build: docker pull tutum/hello-world --quiet

  my-hello:
    serviceName: stack_my-hello
    #imageName: my-hello        ---       imageName defaults to the key but can be overwritten
    build: docker-compose -f docker-compose.yml build my-hello
```

## Commands

```bash
deployer registry start [-p <port>]
deployer registry stop
deployer up <host> <service> [services..] [-f <ConfigFilePath>] [--quiet]
```

---

### deployer registry start [-p &lt;port>]

#### Description

Starts up deployer local registry

#### Options

```
--help - Shows help
--version - Shows version number
-p --port - The port the registry should listen on. Default: 20000
```

---

### deployer registry stop

#### Description

Stops local registry

#### Options

```
--help - Shows help
--version - Shows version number
```

---

### deployer up &lt;host> &lt;service> [services..] [-f &lt;ConfigFilePath>] [--quiet]

#### Description

Replaces the image of a service which is deployed on &lt;host> using the configuration specified in the config file. &lt;service> serves as a key of the config file describing the image. More than one services can be passed as arguments to the function and they will be deployed in parallel.

#### Options

```
--help - Shows help
--version - Shows version number
-f --file - Path to the config file. Default: "deployer.yml"
--quiet - Suppresses verbose output from worker processes
```
