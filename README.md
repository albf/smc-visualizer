# SmcVisualizer

Web-based visualization tool for interpreting self modifying code (SMC) code, by providing a timeline for the control flow graph (CFG). A tracer and a conversion would be required to use it for real workloads. There are some samples as a proof-of-concept.

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

## Unit Tests

Run `ng test` (watcher) or `npm start` (no watcher) to execute the unit tests via [Karma](https://karma-runner.github.io), using headless chrome.
