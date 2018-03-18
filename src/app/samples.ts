import { Trace, TraceModificationType } from "./trace";

export interface TraceSample {
    name: string,
    description: string,
    trace: Trace
}

export class TraceSamples {
    samples: TraceSample[] = [];

    constructor() {
        this.sample1();
    }

    getSample(index: number): TraceSample {
        return this.samples[index];
    }

    private sample1() {
        this.samples.push({
            name: "Simple graph",
            description: "Small graph showing all supported operations",
            trace: new Trace()
                .appendNode(0, "a", [1, 3, 4, 5])
                .appendNode(1, "b", [2, 3])
                .appendNode(2, "c", [3])
                .appendNode(3, "d", [])
                .appendNode(4, "e", [])
                .appendNode(5, "f", [6])
                .appendNode(6, "g", [7])
                .appendNode(7, "h", [8])
                .appendNode(8, "i", [9])
                .appendNode(9, "j", [])

                .appendTraceModification(TraceModificationType.remove, [3], [9])
                .createIncrementNode(20, "inc-1-1", [21, 22], [3])
                .createIncrementNode(21, "inc-1-2", [], [20])
                .createIncrementNode(22, "inc-1-3", [], [20])
                .appendIncrement()

                .createTraceModificationNode(15, "new code", [3, 4], [0, 1])
                .appendTraceModification(TraceModificationType.add, [], [0])
                .appendIncrement()

                .createTraceModificationNode(2, "changed code", [3, 4], [])
                .appendTraceModification(TraceModificationType.modify, [5], [2])
                .appendIncrement()

                .createTraceModificationNode(10, "joined code", [8], [])
                .appendTraceModification(TraceModificationType.join, [3, 3], [6, 7])
                .appendIncrement()

                .createTraceModificationNode(11, "f-1", [10], [0])
                .createTraceModificationNode(12, "f-2", [10], [0])
                .appendTraceModification(TraceModificationType.split, [0], [5])
                .appendIncrement()
                .build()
        });
    }
}
