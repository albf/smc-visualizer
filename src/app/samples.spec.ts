import { async } from '@angular/core/testing';
import { TraceSamples } from './samples';

describe('TraceSamples', () => {
    it('should build all samples correctly', async(() => {
        const ts = new TraceSamples();
    }));

    it('should advance and back time without modifying or crashing on all', async(() => {
        const ts = new TraceSamples();

        for (let s of ts.samples) {
            let original = JSON.parse(JSON.stringify(s.trace));

            while (s.trace.applyNext());
            while (s.trace.applyUndo());

            const j1 = JSON.stringify(original);
            const j2 = JSON.stringify(s.trace);

            expect(j2).toBe(j2);
        }
    }));
});
