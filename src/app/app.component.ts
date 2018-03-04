import { Component, OnInit } from '@angular/core';
import "fabric";

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

  }

  _updateCanvasSize() {
    this.canvas.setWidth(this.canvasWidth);
    this.canvas.setHeight(this.canvasHeight);
  }
}
