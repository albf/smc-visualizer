// Model definitions - later transformed in a jointjs graph

// Actual node, know its connections
interface TraceNode {
    code: string,
    destinations: number[]
    origins?: number[]
}

// Represent a graph change, used both for increments and modifications
interface TraceGraphChange {
    raw: TraceNode,
    index: number,
}

export enum TraceModificationType {
    modify = 'modify',
    add = 'add',
    remove = 'remove',
    join = 'join',
    split = 'split'
}

// Finally, the "self-modification" part
interface TraceModification {
    type: TraceModificationType,
    targets: number[],

    change?: TraceGraphChange[],
}

export class Trace {
    counter: number;
    nodes: Map<number, TraceNode>;                  // The graph, represented using a map
    increments: TraceModification[];
    modifications: TraceModification[];

    private traceGraphChanges: TraceGraphChange[];  // Used by the builder

    constructor() {
        this.counter = 0;
        this.nodes = new Map<number, TraceNode>();
        this.increments = [];
        this.modifications = [];

        this.traceGraphChanges = [];
        this.assignInverse();
    }

    appendNode(index: number, code: string, destinations: number[]): Trace {
        let tn = {
            code: code,
            destinations: destinations,
        }
        this.nodes.set(index, tn);
        return this;
    }

    createTraceModificationNode(index: number, code: string, destinations: number[], origins: number[]): Trace {
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

    appendTraceModification(type: TraceModificationType, targets: number[]): Trace {
        let modification = {
            type: type,
            targets: targets,
            change: null
        }
        if (this.traceGraphChanges != null) {
            modification.change = this.traceGraphChanges;
            this.traceGraphChanges = null;
        }
        this.modifications.push(modification);
        return this;
    }

    assignInverse(): Trace {
        this.nodes.forEach((value, key) => { this.nodes.get(key).origins = []; });
        this.nodes.forEach((value, origin) => {
            value.destinations.forEach(destination => {
                this.nodes.get(destination).origins.push(origin);
            });
        });
        return this;
    }

    private hasSameLength(a1: any[], a2: any[]): boolean {
        if (a1.length == a2.length) {
            return true;
        }
        console.log('Error, expected same length for ' + a1 + ' | and: ' + a2);
        return false;
    }

    private hasNode(n: number, expected: boolean): boolean {
        if (this.nodes.has(n)) {
            if (expected !== null && !expected) console.log("Unexpected node: " + n);
            return true;
        }
        if (expected !== null && expected) console.log("Missing node: " + n);
        return false;
    }

    applyNext(): boolean {
        // No more modifications allowed
        if (this.counter >= this.modifications.length) {
            return false;
        }

        this.counter++;
        return this.apply(this.modifications[this.counter - 1]);
    }

    apply(traceModification: TraceModification): boolean {
        if (traceModification == null) {
            console.log("Empty traceModification");
            return false;
        }
        switch (traceModification.type) {
            case TraceModificationType.modify: {
                this.applyModify(traceModification);
                break;
            }
            case TraceModificationType.add: {
                this.applyAdd(traceModification);
                break;
            }
            case TraceModificationType.remove: {
                this.applyRemove(traceModification);
                break;
            }
            case TraceModificationType.join: {
                this.applyJoin(traceModification);
                break;
            }
            case TraceModificationType.split: {
                this.applySplit(traceModification);
                break;
            }
            default: {
                console.log('Error, unknown type for traceModification: ' + traceModification);
                return false;
            }
        }
        return true;
    }

    private applyModify(traceModification: TraceModification): void {
        if (!this.hasSameLength(traceModification.targets, traceModification.change)) return;
        traceModification.targets.forEach((t, i) => {
            if (!this.hasNode(t, true)) return;
            if (t != traceModification.change[i].index) {
                console.log("Warning: Mismatch index for traceModification. Using target value.");
            }

            let changeNode = traceModification.change[i].raw;
            let node = this.nodes.get(t);

            if (changeNode.code != null) {
                this.nodes.get(t).code = traceModification.change[i].raw.code;
            }
            if (changeNode.destinations != null) {
                node.destinations.forEach((v) => {
                    node.origins.filter(item => item != t);
                });
                let dst = JSON.parse(JSON.stringify(changeNode.destinations));
                this.nodes.get(t).destinations = dst;
            }
        });
    }

    private applyAdd(traceModification: TraceModification): void {
        if (!this.hasSameLength(traceModification.targets, traceModification.change)) return;
        traceModification.change.forEach((change, i) => {
            if (traceModification.change[i].index == null) {
                console.log("Expected new node index");
                return;
            }

            this.nodes.set(change.index, JSON.parse(JSON.stringify(change.raw)));
            this.nodes.get(change.index).destinations.filter((d) => !this.hasNode(d, null));

            change.raw.origins.forEach((d) => {
                if (this.hasNode(d, true)) {
                    this.nodes.get(d).destinations.push(change.index);
                }
            });
        });
    }

    private applyRemove(traceModification: TraceModification): void {
        traceModification.targets.forEach((t, i) => {
            if (!this.hasNode(t, true)) {
                return;
            }

            this.nodes.get(t).origins.forEach((r) => {
                this.nodes.get(r).destinations = this.nodes.get(r).destinations.filter((d) => d != t);
            });
            this.nodes.get(t).destinations.forEach((r) => {
                this.nodes.get(r).origins = this.nodes.get(r).origins.filter((d) => { d != t });
            });
            this.nodes.delete(t);

            // TODO: Check for orphans
        });
    }

    private applyJoin(traceModification: TraceModification): void {
        if (traceModification.targets.length != 2) {
            console.log("Error: join should have exactly two targets");
            return;
        } else if ((traceModification.change.length == 0) ||
            (traceModification.change[0].raw.code == null)) {

            console.log("Error: join requires new code");
            return;
        } else if ((traceModification.change[0].raw.origins != null) &&
            (traceModification.change[0].raw.origins.length != 0)) {

            console.log("Error: join don't accept origin change");
            return;
        }

        let t0 = traceModification.targets[0];
        let t1 = traceModification.targets[1];

        if (!this.hasNode(t0, true) || !this.hasNode(t1, true)) return;

        let node0 = this.nodes.get(t0);
        let node1 = this.nodes.get(t1);

        // Move node1 origins to node0
        node1.origins.forEach((r) => {
            // Check if wasn't already a origin or adding to itself
            if (this.nodes.get(r).destinations.indexOf(t0) < 0 && t0 != r) {
                this.nodes.get(r).destinations.push(t0)
                node0.origins.push(r);
            }
        });

        // Set destinations and code
        node0.destinations = traceModification.change[0].raw.destinations.slice();
        node0.code = traceModification.change[0].raw.code;

        // Remove node1
        this.applyRemove({ type: TraceModificationType.remove, targets: [t1] });

        // TODO: Check for orphans
    }

    private applySplit(traceModification: TraceModification): void {
        if (traceModification.targets.length != 1) {
            console.log("Error: splits should have exactly one target");
            return;
        } else if (traceModification.change.length != 2) {
            console.log("Error: join requires new code");
            return;
        }

        let t0 = traceModification.targets[0];
        let change = traceModification.change;

        if (this.hasNode(change[0].index, false) || this.hasNode(change[1].index, false)) {
            console.log("Error: split new nods should be new values");
        }

        // Remove t0
        this.applyRemove({ type: TraceModificationType.remove, targets: [t0] });

        // Add c0 and c1
        this.applyAdd({
            type: TraceModificationType.add, targets: [t0, t0],
            change: change
        });
    }

}