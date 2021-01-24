# Deployer

Deployer is an npm package dealing with deploying local docker images to a remote docker swarm.

## Installation

Use the node package manager [npm](https://nodejs.org/en/download/) to install deployer.

```bash
npm install -g deployer
```

## Usage

```bash
deployer <SERVICE> [OPTIONAL] -f <CONFIGFILE> [OPTIONAL] --quiet
```

Deployer must be used in conjuction with a config file stating. By default the script looks for deployer.json. Alternatively, a path to another file can be specified using the -f option.

### Options

```
--help - Shows help
--version - Shows version number
-f, --file <CONFIGFILE> - Path to the config file to be used when deploying the service
--quiet - Suppresses verbose output from worker processes
```

### Special case

&lt;SERVICE> "all", deploys all services listed in provided config file.

```bash
deployer all [OPTIONAL] -f <CONFIGFILE> [OPTIONAL] --quiet
```

## Example deployer.json

```json
{
  "hello-world": {
    "serviceName": "hello-world",
    "imageName": "tutum/hello-world",
    "build": "docker pull tutum/hello-world",
    "sshHost": "user@example.com"
  }
}
```

Top level key "all" is reserved and cannot be used in the config file.

## Test

To run the test configuration:

```bash
deployer hello-world
```
