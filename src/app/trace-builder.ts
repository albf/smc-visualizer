import { Trace, TraceNode, TraceGraphChange, TraceIncrement, TraceModification, TraceModificationType } from "./trace";

export class TraceBuilder {
    private traceGraphChanges: TraceGraphChange[];      // Keep previous values, before inserting
    private traceIncrement: TraceIncrement;

    private trace: Trace;
    private nodes: Map<number, TraceNode>;                  // The graph, represented using a map
    private increments: TraceIncrement[];               // Increments are always a pack of additions
    private modifications: TraceModification[];

    constructor() {
        this.init();
    }

    private init() {
        this.traceGraphChanges = [];
        this.traceIncrement = { additions: [] };

        this.trace = new Trace();
        this.nodes = this.trace.nodes;
        this.increments = this.trace.increments;
        this.modifications = this.trace.modifications;
    }

    private validateAddNode(nodes: Map<number, boolean>, elem: number, what: string, index: number) {
        if (nodes.has(elem)) {
            throw new SyntaxError(what + " of element " + elem + " already used at index: " + index);
        }
        nodes.set(elem, true);
    }

    private validateConnections(nodes: Map<number, boolean>, elem: number, n: TraceNode, what: string, index: number, emptyOrigins: boolean = false) {
        n.destinations.forEach((v) => {
            if (!nodes.has(v) || !nodes.get(v)) {
                throw new SyntaxError(what + " of element " + elem + " has bad destination " + v + " at index: " + index);
            }
        });

        if (emptyOrigins && n.origins != null && n.origins.length > 0) {
            throw new SyntaxError(what + " of element " + elem + " have unexpected origin usage at index: " + index);
        }

        n.origins.forEach((v) => {
            if (!nodes.has(v) || !nodes.get(v)) {
                throw new SyntaxError(what + " of element " + elem + " has bad origin " + v + " at index: " + index);
            }
        });
    }

    private validateExistNode(nodes: Map<number, boolean>, elem: number, what: string, index: number) {
        if (!nodes.has(elem)) {
            throw new SyntaxError(what + " of element " + elem + " completely unknown at index: " + index);
        } else if (!nodes.get(elem)) {
            throw new SyntaxError(what + " of element " + elem + " currently unknown at index: " + index);
        }
    }

    private validateRemoveNode(nodes: Map<number, boolean>, elem: number, what: string, index: number) {
        this.validateExistNode(nodes, elem, what, index);
        nodes.set(elem, false);
    }

    private validateSplit(nodes: Map<number, boolean>, traceModification: TraceModification, index: number): void {
        let str: string = null;

        if (traceModification.targets.length != 1) {
            str = "should have exactly one target";
        } else if (traceModification.change.length != 2) {
            str = "requires new code";
        } else if (nodes.has(traceModification.change[0].index)
            || nodes.has(traceModification.change[1].index)) {

            str = "new nodes should be new values";
        }

        if (str != null) {
            throw new SyntaxError("Split Error: " + str + " at index: " + index);
        }
    }

    private validateJoin(nodes: Map<number, boolean>, traceModification: TraceModification, index: number): void {
        let str: string = null;

        if (traceModification.targets.length != 2) {
            str = "should have exactly two targets";
        } else if ((traceModification.change.length != 1) ||
            (traceModification.change[0].raw.code == null)) {

            str = "requires exactly one new code";
        } else if (traceModification.change[0].raw.origins != null &&
            traceModification.change[0].raw.origins.length > 0) {

            str = "requires empty origin for joined node";
        }

        if (str != null) {
            throw new SyntaxError("Join Error: " + str + " at index: " + index);
        }

        this.validateExistNode(nodes, traceModification.targets[0], "Split/Removal", index);
        this.validateExistNode(nodes, traceModification.targets[1], "Split/Removal", index);
    }

    validate() {
        let currentNodes: Map<number, boolean> = new Map<number, boolean>();

        if (this.increments.length > this.modifications.length) {
            throw new RangeError("Number of modifications should be >= number of increments");
        }

        this.nodes.forEach((v, i) => {
            currentNodes.set(i, true);
        })

        for (let i = 0; i < this.modifications.length; i++) {
            const mod = this.modifications[i];
            switch (mod.type) {
                case TraceModificationType.add: {
                    mod.change.forEach(c => {
                        this.validateAddNode(currentNodes, c.index, "Addition", i);
                    });

                    // Should validate connections only after adding everyone
                    mod.change.forEach(c => {
                        this.validateConnections(currentNodes, c.index, c.raw, "Addition", i);
                    })
                    break;
                }
                case TraceModificationType.remove: {
                    mod.targets.forEach(t => {
                        this.validateRemoveNode(currentNodes, t, "Removal", i);
                    });
                    break;
                }
                case TraceModificationType.modify: {
                    mod.targets.forEach(t => {
                        this.validateExistNode(currentNodes, t, "Modification", i);
                    });

                    mod.change.forEach(c => {
                        this.validateConnections(currentNodes, c.index, c.raw, "Addition", i, true);
                    })
                    break;
                }
                case TraceModificationType.join: {
                    this.validateJoin(currentNodes, mod, i);
                    this.validateRemoveNode(currentNodes, mod.targets[0], "Join/Removal", i);
                    this.validateRemoveNode(currentNodes, mod.targets[1], "Join/Removal", i);
                    this.validateAddNode(currentNodes, mod.change[0].index, "Join/Addition", i);
                    this.validateConnections(currentNodes, mod.change[0].index, mod.change[0].raw, "Join/Addition", i);
                    break;
                }
                case TraceModificationType.split: {
                    this.validateSplit(currentNodes, mod, i);
                    this.validateRemoveNode(currentNodes, mod.targets[0], "Split/Removal", i);
                    this.validateAddNode(currentNodes, mod.change[0].index, "Split/Addition", i);
                    this.validateAddNode(currentNodes, mod.change[1].index, "Split/Addition", i);
                    this.validateConnections(currentNodes, mod.change[0].index, mod.change[0].raw, "Split/Addition", i);
                    this.validateConnections(currentNodes, mod.change[1].index, mod.change[1].raw, "Split/Addition", i);
                    break;
                }
                default: {
                    throw new SyntaxError("Unexpected modification type");
                }
            }

            // Check if not incrementing some node already used.
            if (this.increments.length > i) {
                this.increments[i].additions.forEach(tgc => {
                    this.validateAddNode(currentNodes, tgc.index, "Increments/Addition", i);
                });

                // Should validate connections only after adding everyone
                this.increments[i].additions.forEach(tgc => {
                    this.validateConnections(currentNodes, tgc.index, tgc.raw, "Increments/Addition", i);
                });
            }
        }
    }

    appendNode(index: number, code: string, destinations: number[]): TraceBuilder {
        if (this.nodes.has(index)) {
            throw new SyntaxError("Node append of element " + index + " already used.");
        }
        const tn = this.trace.createNode(code, destinations, null);
        this.nodes.set(index, tn);
        return this;
    }

    updateDestination(index: number, destination: number[]): TraceBuilder {
        if (!this.nodes.has(index)) {
            throw new SyntaxError("Can't update element " + index + ", it doesn't exist.");
        }
        this.nodes.get(index).destinations = destination;
        return this;
    }

    createTraceModificationNode(index: number, code: string, destinations: number[], origins: number[]): TraceBuilder {
        let tn = {
            code: code,
            destinations: destinations,
            origins: origins
        }
        this.traceGraphChanges.push({
            raw: tn,
            index: index
        });
        return this;
    }

    appendTraceModification(type: TraceModificationType, causers: number[], targets: number[]): TraceBuilder {
        let modification = {
            type: type,
            causers: causers,
            targets: targets,
            change: null
        }
        if (this.traceGraphChanges.length > 0) {
            modification.change = this.traceGraphChanges;
            this.traceGraphChanges = [];
        }
        this.modifications.push(modification);
        return this;
    }

    createIncrementNode(index: number, code: string, destinations: number[], origins: number[]): TraceBuilder {
        let tn = {
            code: code,
            destinations: destinations,
            origins: origins
        }
        this.traceIncrement.additions.push({
            raw: tn,
            index: index
        });

        return this;
    }

    appendIncrement(): TraceBuilder {
        this.increments.push(this.traceIncrement);
        this.traceIncrement = { additions: [] };

        return this;
    }

    fromFile(json: string): Trace {
        let parsed = JSON.parse(json);

        this.init();

        if (parsed["modifications"] == undefined) {
            console.log("Warning: Unexpected modifications undefined");

        } else {
            this.modifications = parsed["modifications"];
        }

        if (parsed["increments"] == undefined) {
            console.log("Warning: Unexpected increments undefined");

        } else {
            this.increments = parsed["increments"];
        }

        if (parsed["nodes"] == undefined) {
            console.log("Warning: Unexpected nodes undefined");

        } else if (typeof parsed["nodes"] != 'object') {
            console.log("Error: Nodes should be an object of TraceNode entries");
        }
        else {
            Object.keys((parsed["nodes"] as Object)).forEach((v) => {
                this.nodes.set(parseInt(v), parsed["nodes"][v]);
            });
        }

        return this.build();
    }

    build(): Trace {
        // Assign inverses
        this.nodes.forEach((value, key) => { this.nodes.get(key).origins = []; });
        this.nodes.forEach((value, origin) => {
            value.destinations.forEach(destination => {
                this.nodes.get(destination).origins.push(origin);
            });
        });

        // Validate before build
        this.validate();
        return this.trace;
    }
}
