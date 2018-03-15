import { Component, OnInit } from '@angular/core';
import { TraceGraph } from "./trace-graph";
import { Trace } from "./trace";

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.css']
})

export class AppComponent {
    private title = 'SMC Visualizer';

    private graph: TraceGraph;

    constructor() { }

    ngOnInit() {
        let trace = new Trace()
            .appendNode(0, "a", [1, 3, 4, 5])
            .appendNode(1, "b", [2, 3])
            .appendNode(2, "c", [3])
            .appendNode(3, "d", [])
            .appendNode(4, "e", [])
            .appendNode(5, "e", [])
            .assignInverse()

        console.log(trace);

        this.graph = new TraceGraph();
        this.graph.draw(trace);
    }

    zoomIn() {
        this.graph.zoomIn()
    }

    zoomOut() {
        this.graph.zoomOut()
    }

    _updateCanvasSize() {
        //this.canvas.setWidth(this.canvasWidth);
        //this.canvas.setHeight(this.canvasHeight);
    }

    expandCanvas() {
        this.graph.expandPaper();
    }

    compressCanvas() {
        this.graph.compressPaper();
    }
}
