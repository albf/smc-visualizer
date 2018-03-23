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

    private validateExistNode(nodes: Map<number, boolean>, elem: number, what: string, index: number) {
        if (!nodes.has(elem)) {
            throw new SyntaxError(what + " of element " + elem + " completely unknown at index: " + index);
        } else if (!nodes.get(elem)) {
            throw new SyntaxError(what + " of element " + elem + " current unknown at index: " + index);
        }
    }

    private validateRemoveNode(nodes: Map<number, boolean>, elem: number, what: string, index: number) {
        this.validateExistNode(nodes, elem, what, index);
        nodes.set(elem, false);
    }

    private validateSplit(traceModification: TraceModification, index: number): void {
        let str: string = null;

        if (traceModification.targets.length != 1) {
            str = "should have exactly one target at index";
        } else if (traceModification.change.length != 2) {
            str = "requires new code at index";
        } else if (this.trace.hasNode(traceModification.change[0].index, false)
            || this.trace.hasNode(traceModification.change[1].index, false)) {

            str = "new nodes should be new values";
        }

        if (str != null) {
            throw new SyntaxError("Split Error: " + str + " at index: " + index);
        }
    }

    private validateJoin(traceModification: TraceModification, index: number): void {
        let str: string = null;

        if (traceModification.targets.length != 2) {
            str = "should have exactly two targets";
        } else if ((traceModification.change.length != 1) ||
            (traceModification.change[0].raw.code == null)) {

            str = "requires exactly one new code";
        } else if (!this.trace.hasNode(traceModification.targets[0], true)
            || !this.trace.hasNode(traceModification.targets[1], true)) {

            str = "join expects both targets to exist";
        }
        if (str != null) {
            throw new SyntaxError("Join Error: " + str + " at index: " + index);
        }
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
                        this.validateExistNode(currentNodes, t, "Modification--", i);
                    });
                    break;
                }
                case TraceModificationType.join: {
                    this.validateJoin(mod, i);
                    this.validateRemoveNode(currentNodes, mod.targets[0], "Join/Removal", i);
                    this.validateRemoveNode(currentNodes, mod.targets[1], "Join/Removal", i);
                    this.validateAddNode(currentNodes, mod.change[0].index, "Join/Addition", i);
                    break;
                }
                case TraceModificationType.split: {
                    this.validateSplit(mod, i);
                    this.validateRemoveNode(currentNodes, mod.targets[0], "Join/Removal", i);
                    this.validateAddNode(currentNodes, mod.change[0].index, "Join/Addition", i);
                    this.validateAddNode(currentNodes, mod.change[1].index, "Join/Addition", i);
                    break;
                }
                default: {
                    throw new SyntaxError("Unexpected modification type");
                }
            }

            // Check if not incrementing some node already used.
            if (this.increments.length >= i) {
                this.increments[i].additions.forEach(tgc => {
                    this.validateAddNode(currentNodes, tgc.index, "Modification/Addition", i);
                });
            }
        }
    }

    appendNode(index: number, code: string, destinations: number[]): TraceBuilder {
        const tn = this.trace.createNode(code, destinations, null);
        this.nodes.set(index, tn);
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
