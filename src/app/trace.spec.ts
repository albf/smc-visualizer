import { async } from '@angular/core/testing';
import { TraceBuilder } from './trace-builder';
import { Trace, TraceModificationType } from './trace';

function initialTrace(): TraceBuilder {
    return new TraceBuilder()
        .appendNode(0, 'a', [1, 2])
        .appendNode(1, 'b', [2])
        .appendNode(2, 'c', [])
}

function addTrace(): Trace {
    return initialTrace()
        .createTraceModificationNode(3, "c", [2], [0])
        .appendTraceModification(TraceModificationType.add, [0], [1])
        .build();
}

function removeTrace(): Trace {
    return initialTrace()
        .appendTraceModification(TraceModificationType.remove, [0], [2])
        .build();
}

function modificationTrace(): Trace {
    return initialTrace()
        .createTraceModificationNode(1, "b2", [], [])
        .appendTraceModification(TraceModificationType.modify, [0], [1])
        .build();
}

function joinTrace(): Trace {
    return initialTrace()
        .createTraceModificationNode(4, "joined", [], [])
        .appendTraceModification(TraceModificationType.join, [0, 0], [1, 2])
        .appendIncrement()
        .build();
}

function splitTrace(): Trace {
    return initialTrace()
        .createTraceModificationNode(3, "c-1", [], [0, 1])
        .createTraceModificationNode(4, "c-2", [], [0])
        .appendTraceModification(TraceModificationType.split, [0], [2])
        .build();
}

describe('Trace', () => {
    it('should handle perform an add correctly', async(() => {
        const t = addTrace();

        let dump = t.dumpStringAll();
        dump = dump.replace("counter: 0", "counter: 1")
            .replace("  k 0 - v { code : a | destinations: 1,2 | origins:  }",
            "  k 0 - v { code : a | destinations: 1,2,3 | origins:  }")
            .replace("  k 2 - v { code : c | destinations:  | origins: 0,1 }",
            "  k 2 - v { code : c | destinations:  | origins: 0,1,3 }");
        dump = dump + "\n" + "  k 3 - v { code : c | destinations: 2 | origins: 0 }"

        t.applyNext();
        expect(dump).toBe(t.dumpStringAll());
    }));

    it('should create an add peek correctly', async(() => {
        const expected = "nodes:\n"
            + "  k 0 - v { code : Add | destinations: 3 | origins:  }\n"
            + "  k 3 - v { code : c | destinations:  | origins:  }"

        const t = addTrace();
        t.createModificationPeek();

        expect(t.dumpStringNodes(t.peekModificationNodes)).toBe(expected);
    }));

    it('should handle perform a remove correctly', async(() => {
        const t = removeTrace();

        let dump = t.dumpStringAll();
        dump = dump.replace("counter: 0", "counter: 1")
            .replace("  k 0 - v { code : a | destinations: 1,2 | origins:  }",
            "  k 0 - v { code : a | destinations: 1 | origins:  }")
            .replace("  k 1 - v { code : b | destinations: 2 | origins: 0 }",
            "  k 1 - v { code : b | destinations:  | origins: 0 }")
            .replace("\n  k 2 - v { code : c | destinations:  | origins: 0,1 }", "");

        t.applyNext();
        expect(dump).toBe(t.dumpStringAll());
    }));

    it('should create a remove peek correctly', async(() => {
        const expected = "nodes:\n"
            + "  k 0 - v { code : Remove | destinations: 2 | origins:  }\n"
            + "  k 2 - v { code : c | destinations:  | origins:  }"

        const t = removeTrace();
        t.createModificationPeek();

        expect(t.dumpStringNodes(t.peekModificationNodes)).toBe(expected);
    }));

    it('should handle perform a modify correctly', async(() => {
        const t = modificationTrace();

        let dump = t.dumpStringAll();
        dump = dump.replace("counter: 0", "counter: 1")
            .replace("  k 1 - v { code : b | destinations: 2 | origins: 0 }",
            "  k 1 - v { code : b2 | destinations:  | origins: 0 }")
            .replace("  k 2 - v { code : c | destinations:  | origins: 0,1 }",
            "  k 2 - v { code : c | destinations:  | origins: 0 }");

        t.applyNext();
        expect(dump).toBe(t.dumpStringAll());
    }));

    it('should create a modify peek correctly', async(() => {
        const expected = "nodes:\n"
            + "  k -1 - v { code : b2 | destinations:  | origins:  }\n"
            + "  k 0 - v { code : Modify | destinations: 1 | origins:  }\n"
            + "  k 1 - v { code : b | destinations: -1 | origins:  }";

        const t = modificationTrace();
        t.createModificationPeek();

        expect(t.dumpStringNodes(t.peekModificationNodes)).toBe(expected);
    }));

    it('should handle perform a join correctly', async(() => {
        const t = joinTrace();

        let dump = t.dumpStringAll();
        dump = dump.replace("counter: 0", "counter: 1")
            .replace("  k 0 - v { code : a | destinations: 1,2 | origins:  }",
            "  k 0 - v { code : a | destinations: 4 | origins:  }")
            .replace("  k 1 - v { code : b | destinations: 2 | origins: 0 }",
            "  k 4 - v { code : joined | destinations:  | origins: 0 }")
            .replace("\n  k 2 - v { code : c | destinations:  | origins: 0,1 }", "");

        t.applyNext();
        expect(dump).toBe(t.dumpStringAll());
    }));

    it('should create a join peek correctly', async(() => {
        const expected = "nodes:\n"
            + "  k 0 - v { code : Join | destinations: 1,2 | origins:  }\n"
            + "  k 1 - v { code : b | destinations: 3 | origins:  }\n"
            + "  k 2 - v { code : c | destinations: 3 | origins:  }\n"
            + "  k 3 - v { code : joined | destinations:  | origins:  }";

        const t = joinTrace();
        t.createModificationPeek();

        expect(t.dumpStringNodes(t.peekModificationNodes)).toBe(expected);
    }));

    it('should handle perform a split correctly', async(() => {
        const t = splitTrace();

        let dump = t.dumpStringAll();
        dump = dump.replace("counter: 0", "counter: 1")
            .replace("  k 0 - v { code : a | destinations: 1,2 | origins:  }",
            "  k 0 - v { code : a | destinations: 1,3,4 | origins:  }")
            .replace("  k 1 - v { code : b | destinations: 2 | origins: 0 }",
            "  k 1 - v { code : b | destinations: 3 | origins: 0 }")
            .replace("  k 2 - v { code : c | destinations:  | origins: 0,1 }",
            "  k 3 - v { code : c-1 | destinations:  | origins: 0,1 }")
        dump = dump + "\n" + "  k 4 - v { code : c-2 | destinations:  | origins: 0 }"

        t.applyNext();
        expect(dump).toBe(t.dumpStringAll());
    }));

    it('should create a split peek correctly', async(() => {
        const expected = "nodes:\n"
            + "  k 0 - v { code : split | destinations: 1 | origins:  }\n"
            + "  k 1 - v { code : c | destinations: 2,3 | origins:  }\n"
            + "  k 2 - v { code : c-1 | destinations:  | origins:  }\n"
            + "  k 3 - v { code : c-2 | destinations:  | origins:  }";

        const t = splitTrace();
        t.createModificationPeek();

        expect(t.dumpStringNodes(t.peekModificationNodes)).toBe(expected);
    }));

    it('should mask a simple graph correctly', async(() => {
        const expected = "nodes:\n"
            + "  k 0 - v { code : a | destinations: 1 | origins:  }\n"
            + "  k 1 - v { code : b | destinations:  | origins: 0 }";

        const t = initialTrace().build();
        t.updateSelection([0, 1]);

        expect(t.dumpStringNodes(t.maskIfAvailable(t.nodes))).toBe(expected);
    }));

    it('should ignore previous masks for a simple graph', async(() => {
        const t = initialTrace().build();
        const expected = t.dumpStringNodes(t.nodes);

        t.updateSelection([0, 1]);
        t.cleanMask();

        expect(t.dumpStringNodes(t.maskIfAvailable(t.nodes))).toBe(expected);
    }));
});
