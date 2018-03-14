import { Component, OnInit } from '@angular/core';
import "fabric";
import { Graph } from "./graph";

declare const fabric: any;

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})

export class AppComponent {
  private title = 'SMC Visualizer';

  private canvas: any;
  private canvasWidth = 800;
  private canvasHeight = 600;

  constructor() {}

  ngOnInit() {
    this.canvas = new fabric.Canvas('canvas', {
      hoverCursor: 'pointer',
      selection: true,
      selectionBorderColor: 'blue'
    });

    this._updateCanvasSize();

    let add = new fabric.Rect({
      width: 200, height: 100, left: 10, top: 10, angle: 0,
      fill: '#3f51b5'
    });
    this.canvas.add(add);

    let graph = new Graph();
    graph.draw({
        nodes: [
            {
                code: "abc",
                destinations: [1, 3]
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
        ],
        changes: []
    })
  }

  _updateCanvasSize() {
    this.canvas.setWidth(this.canvasWidth);
    this.canvas.setHeight(this.canvasHeight);
  }

  expandCanvas() {
    console.log("Expand!");
    this.canvasWidth += 100;
    this.canvasHeight += 100;
    this._updateCanvasSize();
  }

  compressCanvas() {
    this.canvasWidth -= 100;
    this.canvasHeight -= 100;
    this._updateCanvasSize();
  }
}
