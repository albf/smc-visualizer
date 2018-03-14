import { Component, OnInit } from '@angular/core';
import { TraceGraph } from "./graph";

@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.css']
})

export class AppComponent {
    private title = 'SMC Visualizer';

    private paperWidth = 800;
    private paperHeight = 600;
    private graph;

    constructor() { }

    ngOnInit() {
        this.graph = new TraceGraph(this.paperWidth, this.paperHeight);
        this.graph.draw({
            nodes: [
                {
                    code: "abc",
                    destinations: [1, 3, 4, 5]
                },
                {
                    code: "dce",
                    destinations: [2, 3]
                },
                {
                    code: "fgh",
                    destinations: [3]
                },
                {
                    code: "ijk",
                    destinations: []
                },

                {
                    code: "ijk",
                    destinations: []
                },


                {
                    code: "ijk",
                    destinations: []
                },


            ],
            changes: []
        })
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
        //console.log("Expand!");
        //this.canvasWidth += 100;
        //this.canvasHeight += 100;
        //this._updateCanvasSize();
    }

    compressCanvas() {
        //this.canvasWidth -= 100;
        //this.canvasHeight -= 100;
        //this._updateCanvasSize();
    }
}
