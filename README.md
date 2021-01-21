# Deployer

Deployer is an npm package dealing with deploying local docker images to a remote docker swarm.

## Installation

Use the node package manager [npm](https://nodejs.org/en/download/) to install deployer.

```bash
npm install -g deployer
```

## Usage

```bash
deployer <SERVICE> [OPTIONAL] -f <CONFIGFILE>
```

Must be used in conjuction with a config file. By default the script looks for deployer.json. Alternatively, a path to another file can be specified using the -f option.

Example deployer.json
```json
{
    "hello-world": {
        "serviceName":"hello-world",
        "imageName": "tutum/hello-world",
        "build":"docker pull tutum/hello-world",
        "sshHost":"user@example.com"
    }
}
```

To run the test configuration:

```bash
deployer hello-world
```
