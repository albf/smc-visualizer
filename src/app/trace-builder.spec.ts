import { async } from '@angular/core/testing';
import { TraceBuilder } from './trace-builder';
import { TraceModificationType } from './trace';

function initialTrace(): TraceBuilder {
    return new TraceBuilder()
        .appendNode(0, 'a', [1, 2])
        .appendNode(1, 'b', [3])
        .appendNode(2, 'c', [])
        .appendNode(3, 'd', []);
}

const traceJson = `{
    "nodes": {
        "0": {
            "code": "start",
            "destinations": [0],
            "origins": []
        }
    },
    "modifications": [
        {
            "type": "remove",
            "causers": [0],
            "targets": [0],
            "change": null
        }
    ],
    "increments": [
        {
            "additions": [
                {
                    "raw": {
                        "code": "new",
                        "destinations": [],
                        "origins": []
                    },
                    "index": 5
                }
            ]
        }
    ]
}`;

describe('TraceBuilder', () => {
    it('should throw on already used index append', async(() => {
        expect(() => { initialTrace().appendNode(0, 'k', [1, 2, 3]).build() }).toThrow();
    }));

    it('should throw when there are more increments than modifications', async(() => {
        expect(() => { initialTrace().appendIncrement().build() }).toThrowError(new RegExp("Number of modifications"));
    }));

    it('should throw if increment uses an already used index', async(() => {
        const t = initialTrace()
            .appendTraceModification(TraceModificationType.remove, [1], [2])
            .createIncrementNode(1, "inc-1-3", [], [3])
            .appendIncrement();
        expect(() => { t.build() }).toThrowError(new RegExp("Increments\/Addition"));
    }));

    it('should throw if addition uses an already used index', async(() => {
        const t = initialTrace()
            .createTraceModificationNode(1, "k", [2], [])
            .appendTraceModification(TraceModificationType.add, [0], [1]);
        expect(() => { t.build() }).toThrowError(new RegExp("Addition"));
    }));

    it('should throw if removes a unknown or already removed node', async(() => {
        let t = initialTrace()
            .appendTraceModification(TraceModificationType.remove, [1], [20]);
        expect(() => { t.build() }).toThrowError(new RegExp("completely unknown"));

        t = initialTrace()
            .appendTraceModification(TraceModificationType.remove, [1], [2])
            .appendTraceModification(TraceModificationType.remove, [1], [2])
        expect(() => { t.build() }).toThrowError(new RegExp("currently unknown"));
    }));

    it('should throw if modifies a unknown node', async(() => {
        let t = initialTrace()
            .createTraceModificationNode(10, "k", [3], [])
            .appendTraceModification(TraceModificationType.modify, [1], [20]);
        expect(() => { t.build() }).toThrowError(new RegExp("completely unknown"));
    }));

    it('should throw if join is malformed', async(() => {
        let t = initialTrace()
            .createTraceModificationNode(10, "joined code", [3], [])
            .appendTraceModification(TraceModificationType.join, [0, 0], [2])
        expect(() => { t.build() }).toThrowError(new RegExp("exactly two targets"));
    }));

    it('should throw if split is malformed', async(() => {
        let t = initialTrace()
            .createTraceModificationNode(11, "f-1", [], [0])
            .createTraceModificationNode(12, "f-2", [], [0])
            .appendTraceModification(TraceModificationType.split, [], [])
        expect(() => { t.build() }).toThrowError(new RegExp("one target"));
    }));

    it('should not throw if modifications are fine', async(() => {
        let t = initialTrace()
            .createTraceModificationNode(10, "k", [2], [0])
            .appendTraceModification(TraceModificationType.add, [0], [1])

            .createIncrementNode(9, "inc-1-3", [], [3])
            .appendIncrement()

            .createTraceModificationNode(10, "k", [3], [])
            .appendTraceModification(TraceModificationType.modify, [1], [10])

            .appendTraceModification(TraceModificationType.remove, [1], [10])

            .createTraceModificationNode(11, "f-1", [], [1])
            .createTraceModificationNode(12, "f-2", [], [1])
            .appendTraceModification(TraceModificationType.split, [2], [3])

            .createTraceModificationNode(13, "joined code", [2], [])
            .appendTraceModification(TraceModificationType.join, [0, 0], [11, 12]);

        expect(() => { t.build() }).not.toThrow();
    }));

    it('should throw if uses a unknown destination', async(() => {
        const t = initialTrace()
            .createTraceModificationNode(5, "k", [999], [])
            .appendTraceModification(TraceModificationType.add, [0], [1]);
        expect(() => { t.build() }).toThrowError(new RegExp("bad destination"));
    }));

    it('should throw if a join has a origin', async(() => {
        const t = initialTrace()
            .createTraceModificationNode(13, "joined code", [3], [0])
            .appendTraceModification(TraceModificationType.join, [0, 0], [1, 2]);

        expect(() => { t.build() }).toThrowError(new RegExp("empty origin"));
    }));

    it('should throw if a modify has a origin', async(() => {
        const t = initialTrace()
            .createTraceModificationNode(3, "k", [], [1])
            .appendTraceModification(TraceModificationType.modify, [1], [3])

        expect(() => { t.build() }).toThrowError(new RegExp("unexpected origin usage"));
    }));

    it('should parse a correct JSON trace', async(() => {
        const t = new TraceBuilder().fromFile(traceJson);

        expect(t.nodes.size).toBe(1);
        expect(t.modifications.length).toBe(1);
        expect(t.increments.length).toBe(1);
    }));

    it('should throw if initial nodes has a unknown destination', async(() => {
        expect(() => { initialTrace().appendNode(10, "bla", [666]).build() }).toThrowError(new RegExp("bad destination"));
    }));
});