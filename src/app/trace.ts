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

    change: TraceGraphChange[],
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

    applyNext(): void {
        this.apply(this.modifications[this.counter]);
        this.counter++;
    }

    apply(traceModification: TraceModification): void {
        if (traceModification == null) {
            console.log("Empty traceModification");
            return;
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
            default: {
                console.log('Error, unknown type for traceModification: ' + traceModification);
            }
        }
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
            this.nodes.delete(t);

            // TODO: Also remove orphans
        });
    }

}