import { Trace, TraceModificationType } from "./trace";

interface traceSample {
    name: string,
    description: string,
    trace: Trace
}

export class TraceSamples {
    private samples: traceSample[] = [];

    constructor() {
        this.sample1();
    }

    getSample(index: number): traceSample {
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

                .createTraceModificationNode(15, "new code", [3, 4], [0, 1])
                .appendTraceModification(TraceModificationType.add, [], [0])

                .createTraceModificationNode(2, "changed code", [3, 4], [])
                .appendTraceModification(TraceModificationType.modify, [5], [2])

                .createTraceModificationNode(10, "joined code", [8], [])
                .appendTraceModification(TraceModificationType.join, [3, 3], [6, 7])

                .createTraceModificationNode(11, "f-1", [10], [0])
                .createTraceModificationNode(12, "f-2", [10], [0])
                .appendTraceModification(TraceModificationType.split, [0], [5])
                .build()
        });
    }
}
