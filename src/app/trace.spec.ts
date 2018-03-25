import { async } from '@angular/core/testing';
import { TraceBuilder } from './trace-builder';
import { Trace, TraceModificationType } from './trace';

function initialTrace(): TraceBuilder {
    return new TraceBuilder()
        .appendNode(0, 'a', [1, 2])
        .appendNode(1, 'b', [2])
        .appendNode(2, 'c', [])
}

describe('Trace', () => {
    it('should handle perform an add correctly', async(() => {
        const t = initialTrace()
            .createTraceModificationNode(3, "c", [2], [0])
            .appendTraceModification(TraceModificationType.add, [0], [1])
            .build();

        let dump = t.dumpString();
        dump = dump.replace("counter: 0", "counter: 1")
            .replace("  k 0 - v { code : a | destinations: 1,2 | origins:  }",
            "  k 0 - v { code : a | destinations: 1,2,3 | origins:  }")
            .replace("  k 2 - v { code : c | destinations:  | origins: 0,1 }",
            "  k 2 - v { code : c | destinations:  | origins: 0,1,3 }");
        dump = dump + "\n" + "  k 3 - v { code : c | destinations: 2 | origins: 0 }"

        t.applyNext();
        expect(dump).toBe(t.dumpString());
    }));

    it('should handle perform a remove correctly', async(() => {
        const t = initialTrace()
            .appendTraceModification(TraceModificationType.remove, [0], [2])
            .build();

        let dump = t.dumpString();
        dump = dump.replace("counter: 0", "counter: 1")
            .replace("  k 0 - v { code : a | destinations: 1,2 | origins:  }",
            "  k 0 - v { code : a | destinations: 1 | origins:  }")
            .replace("  k 1 - v { code : b | destinations: 2 | origins: 0 }",
            "  k 1 - v { code : b | destinations:  | origins: 0 }")
            .replace("\n  k 2 - v { code : c | destinations:  | origins: 0,1 }", "");

        t.applyNext();
        expect(dump).toBe(t.dumpString());
    }));

    it('should handle perform a modify correctly', async(() => {
        const t = initialTrace()
            .createTraceModificationNode(1, "b2", [], [])
            .appendTraceModification(TraceModificationType.modify, [0], [1])
            .build();

        let dump = t.dumpString();
        dump = dump.replace("counter: 0", "counter: 1")
            .replace("  k 1 - v { code : b | destinations: 2 | origins: 0 }",
            "  k 1 - v { code : b2 | destinations:  | origins: 0 }")
            .replace("  k 2 - v { code : c | destinations:  | origins: 0,1 }",
            "  k 2 - v { code : c | destinations:  | origins: 0 }");

        t.applyNext();
        expect(dump).toBe(t.dumpString());
    }));

    it('should handle perform a join correctly', async(() => {
        const t = initialTrace()
            .createTraceModificationNode(4, "joined", [], [])
            .appendTraceModification(TraceModificationType.join, [0, 0], [1, 2])
            .appendIncrement()
            .build();

        let dump = t.dumpString();
        dump = dump.replace("counter: 0", "counter: 1")
            .replace("  k 0 - v { code : a | destinations: 1,2 | origins:  }",
            "  k 0 - v { code : a | destinations: 4 | origins:  }")
            .replace("  k 1 - v { code : b | destinations: 2 | origins: 0 }",
            "  k 4 - v { code : joined | destinations:  | origins: 0 }")
            .replace("\n  k 2 - v { code : c | destinations:  | origins: 0,1 }", "");

        t.applyNext();
        expect(dump).toBe(t.dumpString());
    }));

    it('should handle perform a split correctly', async(() => {
        const t = initialTrace()
            .createTraceModificationNode(3, "c-1", [], [0, 1])
            .createTraceModificationNode(4, "c-2", [], [0])
            .appendTraceModification(TraceModificationType.split, [0], [2])
            .build();

        let dump = t.dumpString();
        dump = dump.replace("counter: 0", "counter: 1")
            .replace("  k 0 - v { code : a | destinations: 1,2 | origins:  }",
            "  k 0 - v { code : a | destinations: 1,3,4 | origins:  }")
            .replace("  k 1 - v { code : b | destinations: 2 | origins: 0 }",
            "  k 1 - v { code : b | destinations: 3 | origins: 0 }")
            .replace("  k 2 - v { code : c | destinations:  | origins: 0,1 }",
            "  k 3 - v { code : c-1 | destinations:  | origins: 0,1 }")
        dump = dump + "\n" + "  k 4 - v { code : c-2 | destinations:  | origins: 0 }"

        t.applyNext();
        expect(dump).toBe(t.dumpString());
    }));
});
