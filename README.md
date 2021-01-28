# Deployer

Deployer is an npm package dealing with replacing the image of a service in a remote docker swarm using local docker images. This is achieved by running a local docker registry. The local machine builds and pushes the images to that registry and the remote machine pulls and deploys them using an ssh reverse tunnel.

## Prerequisites

- [Docker](https://www.docker.com/products/docker-desktop) must be installed on local machine.
- Established ssh connection between remote host and local machine (knownhosts).
- An existing docker swarm on remote machine containing the services whose image deployer should be able to change.

## Installation

Use the node package manager [npm](https://nodejs.org/en/download/) to install deployer.

```bash
npm install -g https://github.com/backslashbuild/deployer
```

## Usage

Deployer must be used in conjuction with a config file stating. By default the script looks for deployer.json at cwd. Alternatively, a path to another file can be specified using the -f option.

### Example deployer.json

```json
{
  "hello-world": {
    "serviceName": "hello-world",
    "imageName": "tutum/hello-world",
    "build": "docker pull tutum/hello-world"
  }
}
```

## Commands

```bash
deployer registry start [-p <port>]
deployer registry stop
deployer up <host> <service> [-f <ConfigFilePath>] [--quiet]
```

---

### deployer registry start [-p <port>]

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

### deployer up &lt;host> &lt;service> [-f &lt;ConfigFilePath>] [--quiet]

#### Description

Replaces the image of a service which is deployed on &lt;host> using the configuration specified in the config file. &lt;service> serves as a key of the config file describing the image.

#### Options

```
--help - Shows help
--version - Shows version number
-f --file - Path to the config file. Default: "deployer.json"
--quiet - Suppresses verbose output from worker processes
```
