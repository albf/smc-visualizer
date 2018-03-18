import { TraceSample } from "./samples"

interface summarizedSample {
    name: string,
    description: string
}

export class SummarizedSample {
    private summarizedSamples: summarizedSample[] = [];
    private samples: TraceSample[] = [];

    constructor(traceSamples: TraceSample[]) {
        this.samples = traceSamples;
    }

    getSummarizedSamples(): summarizedSample[] {
        this.samples.forEach((sample) => this.summarizedSamples.push({
            name: sample.name,
            description: sample.description
        }));
        return this.summarizedSamples;
    }
}
