import { async } from '@angular/core/testing';
import { TraceSamples } from './samples';
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
            const j1 = s.trace.dumpString();

            while (s.trace.applyNext());
            while (s.trace.applyUndo());

            const j2 = s.trace.dumpString();
            expect(j2).toBe(j1);
        }
    }));
});
