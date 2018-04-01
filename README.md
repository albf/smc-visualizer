# SmcVisualizer

Web-based visualization tool for interpreting self modifying code (SMC) code, by providing a timeline for the control flow graph (CFG). A tracer and a conversion would be required to use it for real workloads. There are some samples as a proof-of-concept.

Try it out by clicking [here](https://albf.github.io/smc/index.html).

## Building

Running it is quite easy, there is nothing sneaky about it. You have two options:

### Docker

Requires a recent docker version (tested with Docker version 17.12.0-ce, build c97c6d6). To build, as usual:

```
$ docker build . -t smc-vis
```

To start:

```
$ docker run -d -p 4200:80 smc-vis
```

Just access localhost:4200 in your browser.

### Local

Requires a recent node/npm installation (tested with node v9.2.0 and npm v5.5.1).

```
$ npm install
$ npm start
```

Since it's an Angular app, the CLI tool will watch for modified files.

## Model

Currently, the model support is a JSON file with the following properties:

- nodes: contain a map of the initial graph. Although there is an origin array field for each entry they are optional since they are dynamically calculated.

- modifications: an array of modifications, where time is indicated by the index. Accepts:
  - "add" - adds a group of new nodes.
  - "modify" - modify a group of existing nodes.
  - "remove" - remove a group of existing nodes.
  - "join" - join two existing nodes into a new one.
  - "split" - split one existing node into two different ones.

- increments: an array of increments, nodes that are added and are not part of a modification - just make the graph larger.

For each giving time, the graph would be: nodes(t+1) = nodes(t) + modifications(t) + increments(t).

There some examples inside the [traces](traces) directory and a [builder](src/app/samples.ts) that could be used to understand the format.


## Unit Tests

Run `ng test` (watcher) or `npm start` (no watcher) to execute the unit tests via [Karma](https://karma-runner.github.io), using headless chrome.
