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
            trace: this.x86.tree(3, 5, 8)
                .createTraceModificationNode(8, this.x86.code(6), [], [1, 2])
                .appendTraceModification(TraceModificationType.add, [7], [1])
                .appendIncrement()

                .createTraceModificationNode(3, this.x86.code(10), [1, 2], [])
                .appendTraceModification(TraceModificationType.modify, [0], [3])
                .appendIncrement()

                .appendTraceModification(TraceModificationType.remove, [4], [1])
                .appendIncrement()

                .createTraceModificationNode(9, this.x86.code(6), [], [6])
                .createTraceModificationNode(10, this.x86.code(5), [], [6])
                .appendTraceModification(TraceModificationType.split, [7], [5])
                .appendIncrement()

                .createTraceModificationNode(11, this.x86.code(15), [6], [])
                .appendTraceModification(TraceModificationType.join, [4, 4], [9, 10])
                .appendIncrement()

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

    code(size: number) {
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

    tree(height: number, minLen: number, maxLen: number): TraceBuilder {
        if (minLen < 1 || maxLen < 1) {
            throw new Error("Unexpected sizes: (" + minLen + ", " + maxLen + ")");
        } else if (maxLen < minLen) {
            throw new Error("Error: maxLen should be larger than minlen.");
        }

        this.minSize = minLen;
        this.maxSize = maxLen;
        this.currentSize = Math.floor((minLen + maxLen) / 2);
        this.count = 1;

        const tb = new TraceBuilder().appendNode(0, "start", []);
        const dst = this.recursiveAppend(tb, height);
        return tb.updateDestination(0, [dst]);
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
            return index;
        }
        let dst1 = this.recursiveAppend(tb, height - 1);
        let dst2 = this.recursiveAppend(tb, height - 1);
        const index = this.count++;
        tb.appendNode(index, this.code(this.size()), [dst1, dst2]);
        return index;
    }
}
