import { Trace, TraceModificationType } from "./trace";
import { TraceBuilder } from "./trace-builder";

export interface TraceSample {
    name: string,
    description: string,
    trace: Trace
}

export class TraceSamples {
    x86: X86Lipsum;
    samples: TraceSample[] = [];

    constructor() {
        this.x86 = new X86Lipsum();

        this.sample1();
        this.sample2();
        this.sample3();
    }

    getSample(index: number): TraceSample {
        return this.samples[index];
    }

    private sample1() {
        this.samples.push({
            name: "Simple graph",
            description: "Small graph showing all supported operations",
            trace: new TraceBuilder()
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

    private sample2() {
        this.samples.push({
            name: "Small x86",
            description: "Small x86 random instructions",
            trace: this.x86.tree(2, 3, 4)
                .appendAdds(1)
                .appendModifies(1)
                .appendSplits(1)
                .appendJoins(1)
                .appendRemoves(1)
                .build()
        });
    }

    private sample3() {
        this.samples.push({
            name: "Large x86",
            description: "Large x86 random instructions",
            trace: this.x86.tree(4, 5, 8)
                .appendAdds(5)
                .appendRemoves(1)
                .appendModifies(2)
                .appendJoins(2)
                .appendSplits(2)
                .appendAdds(3)
                .appendSplits(2)
                .appendRemoves(1)
                .build()
        });
    }
}

// Dummy class to generate useless X86 code
export class X86Lipsum {
    private insCount: number;
    private jumpCount: number;

    // Internal tree structures
    private minSize: number;
    private currentSize: number;
    private maxSize: number;
    private count: number;

    private traceBuilder: TraceBuilder;
    private destinations: Map<number, number[]>;
    private addDestinations: number;
    private addOrigins: number;

    private instructions: string[] = ["push rbp"
        , "mov rbp, rsp"
        , "sub rsp, 80"
        , "mov QWORD PTR [rbp-72], rdi"
        , "shr ebx, cl"
        , "mov eax, [ebx]"
        , "lea edi, [ebx+4*esi]"
        , "mov DWORD PTR [rbp-76], esi"
        , "xor edx, edx"
        , "sub eax, 216"
        , "mov edx, [esi+4*ebx]"
        , "push dword[esi+ebp+40]"
        , "fld dword[esi+ebp+40]"
        , "add dword[esi+edi],1"
        , "movss [ebp+12],xmm0"
        , "popl %ecx"
        , "imul esi, edi, 25"
        , "add eax, 10"
        , "push eax"
        , "mov DWORD PTR [rbp-80], edx"
    ];

    private jumps: string[] = ["jne .L2"
        , "jeq loop"
        , "jl label1"
        , "jg .KC"
        , "je .L4"
    ]

    constructor() {
        this.insCount = -1;
        this.jumpCount = -1;
    }

    private nextInstruction(): string {
        this.insCount++;
        if (this.insCount >= this.instructions.length) {
            this.insCount = 0;
        }
        return this.instructions[this.insCount];
    }

    private nextJump(): string {
        this.jumpCount++;
        if (this.jumpCount >= this.jumps.length) {
            this.jumpCount = 0;
        }
        return this.jumps[this.jumpCount];
    }

    private code(size: number) {
        if (size < 1) {
            throw new Error("Unexpected size: " + size);
        }
        const code = [];
        for (let i = 1; i < size; i++) {
            code.push(this.nextInstruction());
        }
        code.push(this.nextJump());
        return code.join("\n");
    }

    tree(height: number, minLen: number, maxLen: number): X86Lipsum {
        if (minLen < 1 || maxLen < 1) {
            throw new Error("Unexpected sizes: (" + minLen + ", " + maxLen + ")");
        } else if (maxLen < minLen) {
            throw new Error("Error: maxLen should be larger than minlen.");
        }

        this.minSize = minLen;
        this.maxSize = maxLen;
        this.currentSize = Math.floor((minLen + maxLen) / 2);
        this.count = 1;
        this.destinations = new Map<number, number[]>();
        this.addDestinations = 2;
        this.addOrigins = 2;

        const tb = new TraceBuilder().appendNode(0, "start", []);
        const dst = this.recursiveAppend(tb, height);

        this.traceBuilder = tb.updateDestination(0, [dst]);
        this.destinations.set(0, [dst]);

        return this;
    }

    private size(): number {
        this.currentSize++
        if (this.currentSize > this.maxSize) this.currentSize = this.minSize;
        return this.currentSize;
    }

    private recursiveAppend(tb: TraceBuilder, height: number): number {
        if (height <= 1) {
            const index = this.count++;
            tb.appendNode(index, this.code(this.size()), []);
            this.destinations.set(index, []);
            return index;
        }
        let dst1 = this.recursiveAppend(tb, height - 1);
        let dst2 = this.recursiveAppend(tb, height - 1);
        const index = this.count++;

        tb.appendNode(index, this.code(this.size()), [dst1, dst2]);
        this.destinations.set(index, [dst1, dst2]);

        return index;
    }

    private safelyCreateModificationNode(index: number, destinations: number[], origins: number[]) {
        this.traceBuilder.createTraceModificationNode(index, this.code(this.size()), destinations, origins);
        this.destinations.set(index, destinations);
        origins.forEach((v2, i2) => {
            if (this.destinations.get(v2).indexOf(index) < 0) {
                this.destinations.get(v2).push(index);
            }
        });
    }

    appendAdds(total: number): X86Lipsum {
        let done = 0;
        let goodOrigin = [];
        let goodDestination = [];
        let goodCausers = [];
        let goodTargets = [];

        while (done < total) {
            this.destinations.forEach((d, i) => {
                if ((i == 0) || (done >= total)) return;
                if (goodCausers.length < total) {
                    goodCausers.push(i);
                }

                if ((goodOrigin.length < this.addOrigins) && (d.length < 2)) {
                    if (goodOrigin.length == 0) {
                        goodTargets.push(i);
                    }
                    goodOrigin.push(i);
                } else if (goodDestination.length < this.addDestinations) {
                    goodDestination.push(i)
                }

                if (goodOrigin.length >= this.addOrigins && goodDestination.length >= this.addDestinations) {
                    const index = this.count++;
                    this.safelyCreateModificationNode(index, goodDestination, goodOrigin);
                    done++;
                    goodOrigin = [];
                    goodDestination = [];

                    // Update origins and destinations for the next added node
                    this.addDestinations = (this.addDestinations + 1) % 3;
                    this.addOrigins = (this.addOrigins % 2) + 1;
                }
            });
        }
        this.traceBuilder.appendTraceModification(TraceModificationType.add, goodCausers, goodTargets);
        return this;
    }

    private isUnique(i: number) {
        let unique = false;
        this.destinations.forEach((d2, i2) => {
            if (d2.indexOf(i) >= 0 && d2.length == 1) {
                unique = true;
            }
        });
        return unique;
    }

    appendRemoves(total: number): X86Lipsum {
        let done = 0;
        let goodCausers = [];
        let goodTargets = [];

        while (done < total) {
            this.destinations.forEach((d, i) => {
                if ((i == 0) || (done >= total)) return;
                if (goodCausers.length < total) {
                    goodCausers.push(i);
                    return;
                }

                const unique = this.isUnique(i);
                if (!unique) {
                    this.destinations.forEach((d2, i2) => {
                        this.destinations.set(i2, d2.filter(x => x != i));
                    });

                    done++;
                    goodTargets.push(i);
                    this.destinations.delete(i);
                }
            });
        }
        this.traceBuilder.appendTraceModification(TraceModificationType.remove, goodCausers, goodTargets);
        return this;
    }

    appendModifies(total: number): X86Lipsum {
        let done = 0;
        let goodCausers = [];
        let goodTargets = [];

        while (done < total) {
            this.destinations.forEach((d, i) => {
                if ((i == 0) || (done >= total)) return;
                if (goodCausers.length < total) {
                    goodCausers.push(i);
                    return;
                }

                this.safelyCreateModificationNode(i, this.destinations.get(i).slice(), []);
                goodTargets.push(i);
                done++;
            });
        }
        this.traceBuilder.appendTraceModification(TraceModificationType.modify, goodCausers, goodTargets);
        return this;
    }

    appendJoins(total: number): X86Lipsum {
        for (let done = 0; done < total; done++) {
            let part = 0;
            let goodCausers = [];
            let goodTargets = [];
            let goodDestination = [];

            while (part < 4) {
                this.destinations.forEach((d, i) => {
                    if ((i == 0) || (part >= 4)) return;
                    if (goodCausers.length < 1) {
                        goodCausers = [i, i];
                        return;
                    }

                    // Try to find a good join victims
                    if (part < 2) {
                        if (!this.isUnique(i)) {
                            this.destinations.forEach((d2, i2) => {
                                this.destinations.set(i2, d2.filter(x => x != i));
                            });

                            // Tries to get one destination from the previous nodes
                            if (goodDestination.length == 0 && d.length > 0) {
                                goodDestination.push(d[0]);
                            }

                            part++;
                            goodTargets.push(i);
                            this.destinations.delete(i);
                        }
                        return;
                    }

                    // Find one good destination
                    if (part < 3) {
                        goodDestination.push(i);
                        part++;
                        return;
                    }

                    // Just create a good target
                    const index = this.count++;
                    this.safelyCreateModificationNode(index, goodDestination, []);
                    part++;
                });
            }

            this.traceBuilder.appendTraceModification(TraceModificationType.join, goodCausers, goodTargets);
        }

        return this;
    }

    appendSplits(total: number): X86Lipsum {
        for (let done = 0; done < total; done++) {
            let part = 0;
            let goodCausers = [];
            let goodTargets = [];
            let goodDestination = [];
            let goodOrigin1 = [];
            let goodOrigin2 = [];

            while (part < 5) {
                this.destinations.forEach((d, i) => {
                    if ((i == 0) || (part >= 5)) return;
                    if (goodCausers.length < 1) {
                        goodCausers.push(i);
                        return;
                    }

                    // Try to find a good split victim
                    if (part < 1) {
                        if (!this.isUnique(i)) {
                            let previousOrigins = [];
                            this.destinations.forEach((d2, i2) => {
                                if (d2.indexOf(i) >= 0) {
                                    previousOrigins.push(i2);
                                }
                                this.destinations.set(i2, d2.filter(x => x != i));
                            });

                            // Keep the destinations
                            goodDestination = d;

                            part++;
                            goodTargets.push(i);
                            this.destinations.delete(i);

                            if (previousOrigins.length > 0) {
                                goodOrigin1.push(previousOrigins[0]);
                            }

                            if (previousOrigins.length > 1) {
                                goodOrigin2.push(previousOrigins[1]);
                            }
                        }
                        return;
                    }

                    // Find a good origin for split1 and for split 2
                    if (part < 2) {
                        goodOrigin1.push(i);
                        part++;
                        return;
                    }

                    if (part < 3) {
                        goodOrigin2.push(i);
                        part++;
                        return;
                    }

                    // Just create the two targets
                    let origin;
                    if (part < 4) {
                        origin = goodOrigin1;
                    } else {
                        origin = goodOrigin2;
                    }
                    const index = this.count++;
                    this.safelyCreateModificationNode(index, goodDestination, origin);
                    part++;
                });
            }

            this.traceBuilder.appendTraceModification(TraceModificationType.split, goodCausers, goodTargets);
        }

        return this;
    }

    build(): Trace {
        return this.traceBuilder.build();
    }
}
