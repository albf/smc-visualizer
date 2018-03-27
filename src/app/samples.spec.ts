import { async } from '@angular/core/testing';
import { TraceSamples, X86Lipsum } from './samples';
import { Trace } from './trace';

describe('TraceSamples', () => {
    it('should build all samples correctly', async(() => {
        const ts = new TraceSamples();
    }));

    it('should have all fields correctly initialized', async(() => {
        const ts = new TraceSamples();
        for (let s of ts.samples) {
            expect(s.description).toBeDefined();
            expect(s.description).not.toBe("");
            expect(s.name).toBeDefined();
            expect(s.name).not.toBe("");
            expect(s.trace).toBeDefined();
            expect(s.trace.nodes).toBeDefined();
        }
    }));

    it('should advance and back time without modifying or crashing on all', async(() => {
        const ts = new TraceSamples();

        for (let s of ts.samples) {
            const j1 = s.trace.dumpStringAll();

            while (s.trace.applyNext());
            while (s.trace.applyUndo());

            const j2 = s.trace.dumpStringAll();
            expect(j2).toBe(j1);
        }
    }));

    it('should construct valid x86 tree samples', async(() => {
        const x86 = new X86Lipsum();

        for (let i = 0; i < 10; i++) {
            const t = x86.tree(1 + i, 1 + i, 3 + i);
            t.build();  // build will validate tree constructs
        }
    }));
});
