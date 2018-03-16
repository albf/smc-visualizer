import { Component, OnInit } from '@angular/core';
import { TraceGraph } from "./trace-graph";
import { Trace, TraceModificationType } from "./trace";

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.css']
})

export class AppComponent {
    private title = 'SMC Visualizer';

    private graph: TraceGraph;
    private trace: Trace;

    constructor() { }

    ngOnInit() {
        let trace = new Trace()
            .appendNode(0, "a", [1, 3, 4, 5])
            .appendNode(1, "b", [2, 3])
            .appendNode(2, "c", [3])
            .appendNode(3, "d", [])
            .appendNode(4, "e", [])
            .appendNode(5, "f", [6])
            .appendNode(6, "g", [7])
            .appendNode(7, "h", [])
            //.appendTraceModification(TraceModificationType.remove, [5])

            // .createTraceModificationNode(6, "new code", [3, 4], [0, 1])
            // .appendTraceModification(TraceModificationType.add, [0])

            .createTraceModificationNode(10, "changed code", [3, 4], [])
            .appendTraceModification(TraceModificationType.modify, [], [2])

            //.createTraceModificationNode(10, "joined code", [7], [])
            //.appendTraceModification(TraceModificationType.join, [5, 6])

            //.createTraceModificationNode(11, "g-1", [7], [5])
            //.createTraceModificationNode(12, "g-2", [7], [5])
            //.appendTraceModification(TraceModificationType.split, [0], [6])

            .assignInverse()

        //console.log(trace);
        //trace.applyNext();
        //console.log(trace);

        this.graph = new TraceGraph();
        this.graph.drawTrace(trace);
        this.trace = trace;
    }

    peekView() {
        this.graph.drawPeek(this.trace);
    }

    advanceTime() {
        if (this.trace.applyNext()) {
            this.graph.drawTrace(this.trace);
        }
    }

    zoomIn() {
        this.graph.zoomIn()
    }

    zoomOut() {
        this.graph.zoomOut()
    }

    expandCanvas() {
        this.graph.expandPaper();
    }

    compressCanvas() {
        this.graph.compressPaper();
    }
}
