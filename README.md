<h1 style="font-size:40px"> Deployer v2.1.0</h1>

Deployer is an npm package dealing with replacing the image of a service in a remote docker swarm using local docker images. This is achieved by running a local docker registry. The local machine builds and pushes the images to that registry and the remote machine pulls and deploys them using an ssh reverse tunnel.

Version 2 enables the functionality in a multi-node environment. This is done by running a docker registry as a service in the swarm, which allows all nodes to access the newly pulled image.

# Prerequisites

- [Docker](https://www.docker.com/products/docker-desktop) must be installed on local machine.
- Established ssh connection between remote host and local machine (authorized_keys).

```bash
cat ~/.ssh/<YOUR_KEY>.pub | ssh <YOUR_USER>@<YOUR_HOST> "mkdir -p ~/.ssh && chmod 700 ~/.ssh && cat >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys"
```

- An existing docker swarm on the remote machine that contains the services which deployer will update with new images.

# Installation

Use the node package manager [npm](https://nodejs.org/en/download/) to install deployer.

```bash
npm install -g https://github.com/backslashbuild/deployer
```

# Usage

Deployer requires a local docker registry to be running which can be created by running `deployer registry start`. Deployer must be used in conjuction with a config file describing the build command as well as image and service names. By default the script looks for `deployer.yml` at cwd and if not found, recursively looks in parent directories. Alternatively, a path to another yml file can be specified using the -f option.

## Example `deployer.yml`

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

- **"serviceName"**: The name of the service as it appears on the swarm.
- **"build"**: The command used to build the image.
- **"imageName"**: The name of the image used to update the remote service. This key is optional. If omitted it defaults to the name of the service. In the example below, for "hello-world2" service, "imageName" will take the value "hello-world2".

# Documentation

- [Registry](#registry)
  - [Start](#registry-start)
  - [Stop](#registry-stop)
- [Up](#up)
- [Config](#config)
  - [Set](#config-set)
  - [Unset](#config-unset)
  - [Reset](#config-reset)

---

## <a name="registry"></a>Registry

### Description

To operate using deployer, it is required to have a locally running docker registry. Deployer provides CLI to assist in creation and maintenance of that registry. A registry can be started by running `docker registry start`. The registry container is configured to automatically start at startup to enable immediate use of Deployer. The registry can removed and have its resources cleaned up by running `deployer registry stop`.

### Commands

### <a name="registry-start"></a>`deployer registry start [-p <port>]`

#### Description

Starts up deployer local registry.

#### Options

```
-p --port - The port the registry should listen on. Default: 20000
```

### <a name="registry-stop"></a>`deployer registry stop`

#### Description

Removes local deployer registry and cleans up its resources.

---

## <a name="up"></a>Up

### Description

This is deployer's core functionality, named to match the convention of `docker-compose up`, which replaces the image of one or more services on the remote docker swarm with a locally built image.

### Commands

### `deployer up <host> <service> [services..] [-f <ConfigFilePath>] [--quiet]`

#### Description

Replaces the image of one or service which is deployed on `<host>` using the configuration specified in the config file. A config file is required to run this command. `<service>` serves as a key of the config file to lookup build and service configurations. More than one services can be passed as arguments to the function and they will be deployed in parallel. If the `--file` option which specifies an exact path is not defined, Deployer will look for "deployer.yml" in the current directory and in the case of miss recursively in the parent directories.

#### Arguments

```
host - The ssh target. For example "user@example.com"
service - The name of a key from deployer.yaml. Using example deployer.yaml provided above: "my-hello"
services - Additional deployer.yaml keys to be deployed in parallel
```

### Example command

`deployer up user@example.com my-hello hello-world1 --quiet`

#### Options

```
-f --file - Path to the config file. Default: "deployer.yml"
--quiet - Suppresses verbose output from worker processes
```

---

## <a name="config"></a>Config

### Description

Deployer uses global configuration, stored in `config.json` at the installation directory. Deployer comes with a default set of values configuration all of which can be changed using `deployer config set` and can be reset to default using `deployer config unset`. The config can be reset to default using `deployer config reset`.

### Default config file

```json
{
  "name": "deployer"
}
```

### Dictionary

- "**name**": A string that may contain alphanumeric characters and "-" which is used when deployer tags images. It is advised that a meaningful `name` is set to enable communication in a team environment.

### Commands

### <a name="config-set"></a>`deployer config set <key> <value>`

#### Description

Updates the deployer config `<key>` to provided `<value>`.

#### Arguments

```
key - The key of the config to be updated
value - The value to be stored in the key
```

### <a name="config-unset"></a>`deployer config unset <key>`

#### Description

Resets the deployer config `<key>`.

#### Arguments

```
key - The key of the config to be reset
```

### <a name="config-reset"></a>`deployer config reset`

#### Description

Resets the deployer config to default values.
