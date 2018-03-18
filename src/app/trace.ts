// Model definitions - later transformed in a jointjs graph

// Actual node, know its connections
export interface TraceNode {
    code: string,
    destinations: number[]
    origins?: number[]
}

// Represent a graph change, used both for increments and modifications
export interface TraceGraphChange {
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
export interface TraceModification {
    type: TraceModificationType,
    causers?: number[],
    targets: number[],

    change?: TraceGraphChange[],
}

export interface TraceIncrement {
    additions: TraceGraphChange[];
}

export class Trace {
    counter: number;
    nodes: Map<number, TraceNode>;                  // The graph, represented using a map
    increments: TraceIncrement[];                  // Increments are always a pack of additions
    modifications: TraceModification[];

    private traceGraphChanges: TraceGraphChange[];  // Used by the builder
    private traceIncrement: TraceIncrement;         // Used by the builder

    peekModificationNodes: Map<number, TraceNode>;  // Small view of the next modification
    peekIncrementNodes: Map<number, TraceNode>;     // SMall view of the next increment
    undoModifications: TraceModification[];         // Used for undo

    constructor() {
        this.counter = 0;
        this.nodes = new Map<number, TraceNode>();
        this.increments = [];
        this.modifications = [];

        this.increments = [];
        this.undoModifications = [];

        this.traceGraphChanges = [];
        this.traceIncrement = { additions: [] };
    }

    appendNode(index: number, code: string, destinations: number[]): Trace {
        const tn = this.createNode(code, destinations, null);
        this.nodes.set(index, tn);
        return this;
    }

    private createNode(code: string, destinations: number[], origins: number[]): TraceNode {
        let tn = {
            code: code,
            destinations: destinations
        }
        if (origins != null) {
            tn["origins"] = origins;
        }
        return tn;
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

    appendTraceModification(type: TraceModificationType, causers: number[], targets: number[]): Trace {
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

    createIncrementNode(index: number, code: string, destinations: number[], origins: number[]): Trace {
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

    appendIncrement(): Trace {
        this.increments.push(this.traceIncrement);
        this.traceIncrement = { additions: [] };

        return this;
    }

    build(): Trace {
        // Assign inverses
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

    getLatestModification(): TraceModification {
        if (this.counter >= this.modifications.length) {
            return null;
        }
        return this.modifications[this.counter];
    }

    applyNext(): boolean {
        const latestModification = this.getLatestModification();
        const latestIncrement = this.increments[this.counter];

        // No more modifications allowed
        if (latestModification == null) {
            return false;
        }

        // Update counter, calculate how to undo the current state.
        this.counter++;
        if (this.counter > this.undoModifications.length) {
            this.createUndo(latestModification);
        }

        // Lastly, apply the change and increment.
        const ret = this.applyModification(latestModification);
        this.applyIncrement(latestIncrement);
        return ret;
    }

    applyUndo(): boolean {
        if (this.counter <= 0) {
            return false;
        }

        const previousUndo = this.undoModifications[this.counter - 1];
        const previousIncrement = this.increments[this.counter - 1];

        if (previousUndo == undefined) {
            console.log("Error: previous undo modification is null");
            return false;
        }
        this.counter--;

        this.undoIncrement(previousIncrement);
        return this.applyModification(previousUndo);
    }

    applyModification(traceModification: TraceModification): boolean {
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

    createModificationPeek(): void {
        this.peekModificationNodes = new Map<number, TraceNode>();
        const traceModification = this.getLatestModification();

        if (traceModification == null) {
            console.log("Empty traceModification");
            return;
        }

        switch (traceModification.type) {
            case TraceModificationType.modify: {
                this.peekModify(traceModification);
                break;
            }
            case TraceModificationType.add: {
                this.peekAdd(traceModification);
                break;
            }
            case TraceModificationType.remove: {
                this.peekRemove(traceModification);
                break;
            }
            case TraceModificationType.join: {
                this.peekJoin(traceModification);
                break;
            }
            case TraceModificationType.split: {
                this.peekSplit(traceModification);
                break;
            }
            default: {
                console.log('Error, unknown type for traceModification: ' + traceModification);
            }
        }
    }

    createUndo(traceModification: TraceModification): void {
        if (traceModification == null) {
            return;
        }

        switch (traceModification.type) {
            case TraceModificationType.modify: {
                this.createModifyUndo(traceModification);
                break;
            }
            case TraceModificationType.add: {
                this.createAddUndo(traceModification);
                break;
            }
            case TraceModificationType.remove: {
                this.createRemoveUndo(traceModification);
                break;
            }
            case TraceModificationType.join: {
                this.createJoinUndo(traceModification);
                break;
            }
            case TraceModificationType.split: {
                this.createSplitUndo(traceModification);
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

    private peekModify(traceModification: TraceModification): void {
        this.peekModificationNodes.set(0, this.createNode("Modify", traceModification.targets.slice(), null));

        traceModification.targets.forEach((t, i) => {
            // Add both original and modified
            const node = this.nodes.get(t);

            const original = this.createNode(node.code, [-t], null);
            const changed = this.createNode(traceModification.change[i].raw.code, [], null);

            this.peekModificationNodes.set(t, original);
            this.peekModificationNodes.set(-t, changed);
        });
    }

    private createModifyUndo(traceModification: TraceModification): void {
        const targets: number[] = [];
        const changes: TraceGraphChange[] = [];

        traceModification.targets.forEach((t, i) => {
            const node = this.nodes.get(t);
            targets.push(t);
            changes.push({
                index: t,
                raw: JSON.parse(JSON.stringify(node))
            });
        });

        this.undoModifications.push({
            type: TraceModificationType.modify,
            targets: targets,
            change: changes
        })
    }

    private applyAdd(traceModification: TraceModification): void {
        traceModification.change.forEach((change, i) => {
            if (traceModification.change[i].index == null) {
                console.log("Expected new node index");
                return;
            }

            this.nodes.set(change.index, JSON.parse(JSON.stringify(change.raw)));
            this.nodes.get(change.index).destinations.filter((d) => !this.hasNode(d, null));

            change.raw.origins.forEach((d) => {
                if (!this.hasNode(d, true)) {
                    console.log("Missing origin node: " + d);
                    return;
                }
                if (this.nodes.get(d).destinations.indexOf(change.index) < 0) {
                    this.nodes.get(d).destinations.push(change.index);
                }
            });
            change.raw.destinations.forEach((d) => {
                if (!this.hasNode(d, true)) {
                    console.log("Missing destination node: " + d);
                    return;
                }
                if (this.nodes.get(d).origins.indexOf(change.index) < 0) {
                    this.nodes.get(d).origins.push(change.index);
                }
            })
        });
    }

    private peekAdd(traceModification: TraceModification): void {
        let dst = [];
        traceModification.change.forEach((v) => { dst.push(v.index) });

        this.peekModificationNodes.set(0, this.createNode("Add", dst, null));

        traceModification.change.forEach((v) => {
            // Add both original and modified
            const node = this.nodes.get(v.index);

            const added = this.createNode(v.raw.code, [], null);

            this.peekModificationNodes.set(v.index, added);
        });
    }

    private createAddUndo(traceModification: TraceModification): void {
        const targets: number[] = [];

        traceModification.change.forEach((v) => {
            targets.push(v.index);
        });

        this.undoModifications.push({
            type: TraceModificationType.remove,
            targets: targets
        })
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

            // TODO: Check for orphans?
        });
    }

    private peekRemove(traceModification: TraceModification): void {
        this.peekModificationNodes.set(0, this.createNode("Remove", traceModification.targets.slice(), null));

        traceModification.targets.forEach((t, i) => {
            const removed = this.createNode(this.nodes.get(t).code, [], null);
            this.peekModificationNodes.set(t, removed);
        });
    }

    private createRemoveUndo(traceModification: TraceModification): void {
        const targets: number[] = [];
        const changes: TraceGraphChange[] = [];

        traceModification.targets.forEach((t, i) => {
            const node = this.nodes.get(t);
            targets.push(t);
            changes.push({
                index: t,
                raw: JSON.parse(JSON.stringify(node))
            });
        });

        this.undoModifications.push({
            type: TraceModificationType.add,
            targets: targets,
            change: changes
        })
    }

    private isJoinValid(traceModification: TraceModification): boolean {
        if (traceModification.targets.length != 2) {
            console.log("Error: join should have exactly two targets");
            return false;
        } else if ((traceModification.change.length != 1) ||
            (traceModification.change[0].raw.code == null)) {

            console.log("Error: join requires exactly one new code");
            return false;
        }

        return true;
    }

    private applyJoin(traceModification: TraceModification): void {
        if (!this.isJoinValid(traceModification)) {
            return;
        }

        const t0 = traceModification.targets[0];
        const t1 = traceModification.targets[1];

        if (!this.hasNode(t0, true) || !this.hasNode(t1, true)) return;

        const node0 = this.nodes.get(t0);
        const node1 = this.nodes.get(t1);
        const origins = [];
        const isOriginsEmpty = traceModification.change[0].raw.origins == null
            || traceModification.change[0].raw.origins.length == 0;

        if (isOriginsEmpty) {
            // Add origins from previous nodes
            node0.origins.concat(node1.origins).forEach((r) => {
                if (origins.indexOf(r) < 0 && [t0, t1].indexOf(r) < 0) {
                    origins.push(r);
                }
            })
        }

        // Remove node1 and node2
        this.applyRemove({ type: TraceModificationType.remove, targets: [t0, t1] });

        // Adds the new node. Add requires origins to be set
        if (isOriginsEmpty) {
            traceModification.change[0].raw.origins = origins;
        }
        this.applyAdd(traceModification);
        if (isOriginsEmpty) {
            traceModification.change[0].raw.origins = null;;
        }

        // TODO: Check for orphans?
    }

    private peekJoin(traceModification: TraceModification): void {
        if (!this.isJoinValid(traceModification)) {
            return;
        }

        this.peekModificationNodes.set(0, this.createNode("Join", [1, 2], null));

        let t0 = traceModification.targets[0];
        let t1 = traceModification.targets[1];

        if (!this.hasNode(t0, true) || !this.hasNode(t1, true)) return;

        let node0 = this.nodes.get(t0);
        let node1 = this.nodes.get(t1);

        this.peekModificationNodes.set(1, this.createNode(node0.code, [3], null));
        this.peekModificationNodes.set(2, this.createNode(node1.code, [3], null));

        this.peekModificationNodes.set(3, this.createNode(traceModification.change[0].raw.code, [], null));
    }

    private createJoinUndo(traceModification: TraceModification): void {
        let t0 = traceModification.targets[0];
        let change0: TraceGraphChange = {
            index: t0,
            raw: JSON.parse(JSON.stringify(this.nodes.get(t0)))
        }

        let t1 = traceModification.targets[1];
        let change1: TraceGraphChange = {
            index: t1,
            raw: JSON.parse(JSON.stringify(this.nodes.get(t1)))
        }

        this.undoModifications.push({
            type: TraceModificationType.split,
            targets: [traceModification.change[0].index],
            change: [change0, change1]
        })
    }

    private isSplitValid(traceModification: TraceModification): boolean {
        if (traceModification.targets.length != 1) {
            console.log("Error: splits should have exactly one target");
            return false;
        } else if (traceModification.change.length != 2) {
            console.log("Error: join requires new code");
            return false;
        }
        return true;
    }

    private applySplit(traceModification: TraceModification): void {
        if (!this.isSplitValid(traceModification)) {
            return;
        }

        let t0 = traceModification.targets[0];
        let change = traceModification.change;

        if (this.hasNode(change[0].index, false) || this.hasNode(change[1].index, false)) {
            console.log("Error: split new nodes should be new values");
        }

        // Remove t0
        this.applyRemove({ type: TraceModificationType.remove, targets: [t0] });

        // Add c0 and c1
        this.applyAdd({
            type: TraceModificationType.add,
            targets: [t0, t0],
            change: change
        });
    }

    private peekSplit(traceModification: TraceModification): void {
        if (!this.isSplitValid(traceModification)) {
            return;
        }

        this.peekModificationNodes.set(0, this.createNode("split", [1], null));

        let change = traceModification.change;
        let original = this.nodes.get(traceModification.targets[0]);

        this.peekModificationNodes.set(1, this.createNode(original.code, [2, 3], null));
        this.peekModificationNodes.set(2, this.createNode(change[0].raw.code, [], null));
        this.peekModificationNodes.set(3, this.createNode(change[1].raw.code, [], null));
    }

    private createSplitUndo(traceModification: TraceModification): void {
        const c0 = traceModification.change[0].index;
        const c1 = traceModification.change[1].index;
        const target = traceModification.targets[0];

        let change: TraceGraphChange = {
            index: target,
            raw: JSON.parse(JSON.stringify(this.nodes.get(target)))
        }

        this.undoModifications.push({
            type: TraceModificationType.join,
            targets: [c0, c1],
            change: [change]
        })
    }

    createIncrementPeek(): void {
        this.peekIncrementNodes = new Map<number, TraceNode>();

        if (this.increments[this.counter] == null) return;
        const increments = JSON.parse(JSON.stringify(this.increments[this.counter]));

        // First, set all increment nodes
        increments.additions.forEach(add => {
            this.peekIncrementNodes.set(add.index, add.raw);
        });

        // Now, filter destinations and origins
        this.peekIncrementNodes.forEach(node => {
            node.destinations = node.destinations.filter(item => this.peekIncrementNodes.has(item));
            node.origins = node.origins.filter(item => this.peekIncrementNodes.has(item));
        });
    }

    private applyIncrement(increment: TraceIncrement): void {
        if (increment == null) {
            console.log("Error: Unexpected null increment");
            return;
        }
        increment.additions.forEach(add => {
            this.applyAdd({
                type: TraceModificationType.add,
                targets: null,
                change: increment.additions
            });
        });
    }

    private undoIncrement(increments: TraceIncrement): void {
        if (increments == null) {
            console.log("Error: Unexpected null increment");
            return;
        }
        increments.additions.forEach(add => {
            this.applyRemove({
                type: TraceModificationType.remove,
                targets: [add.index],
                change: null
            });
        });
    }
}