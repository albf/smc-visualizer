import { Component, OnInit } from '@angular/core';
import "fabric";

import * as jQuery from 'jquery';
import * as _ from 'lodash';
import * as $ from 'backbone';
//const joint = require('../../../../node_modules/jointjs/dist/joint.js');
import * as joint from 'jointjs';

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


    let graph = new joint.dia.Graph;

    let paper = new joint.dia.Paper({
      el: jQuery("#paper"),
      width: 600,
      height: 400,
      model: graph,
      gridSize: 1
    });

    let rect = new joint.shapes.basic.Rect({
      position: { x: 100, y: 30 },
      size: { width: 100, height: 30 },
      attrs: { rect: { fill: 'blue' }, text: { text: 'my box', fill: 'white' } }
    });

    let rect2 = rect.clone();
    let rect3 = rect.clone();
    let rect4 = rect.clone();
    // rect2.translate(300);

    var Link = joint.dia.Link.define('demo.Link', {
      attrs: {
          '.connection': {
              stroke: 'gray',
              strokeWidth: 2,
              pointerEvents: 'none',
              targetMarker: {
                  type: 'path',
                  fill: 'gray',
                  stroke: 'none',
                  d: 'M 10 -10 0 0 10 10 z'
              }
          }
      },
      connector: {
          name: 'rounded'
      },
      z: -1,
      weight: 1,
      minLen: 1,
      labelPosition: 'c',
      labelOffset: 10,
      labelSize: {
          width: 50,
          height: 30
      },
      labels: [{
          markup: '<rect/><text/>',
          attrs: {
              text: {
                  fill: 'gray',
                  textAnchor: 'middle',
                  refY: 5,
                  refY2: '-50%',
                  fontSize: 20,
                  cursor: 'pointer'
              },
              rect: {
                  fill: 'lightgray',
                  stroke: 'gray',
                  strokeWidth: 2,
                  refWidth: '100%',
                  refHeight: '100%',
                  refX: '-50%',
                  refY: '-50%',
                  rx: 5,
                  ry: 5
              }
          },
          size: {
              width: 50, height: 30
          }
      }]
  }, {
    markup: '<path class="connection"/><g class="labels"/>',

    connect: function(sourceId, targetId) {
        return this.set({
            source: { id: sourceId },
            target: { id: targetId }
        });
    },

    setLabelText: function(text) {
        return this.prop('labels/0/attrs/text/text', text || '');
    }
});

    /*var link1 = new joint.dia.Link({
      source: { id: rect.id },
      target: { id: rect2.id }
    }); */
    //var link1 = new Link().connect(rect.id, rect2.id);
    var attrs = {
          '.connection': {
              stroke: 'gray',
              strokeWidth: 2,
              pointerEvents: 'none',
              targetMarker: {
                  type: 'path',
                  fill: 'gray',
                  stroke: 'none',
                  d: 'M 10 -10 0 0 10 10 z'
              }
          }
      };

    var link1 = new joint.dia.Link({attrs,
        source: { id: rect.id } ,
        target: { id: rect2.id}
    });

    var link2 = new joint.dia.Link({
      source: { id: rect.id },
      target: { id: rect3.id }
    });

    var link3 = new joint.dia.Link({
      source: { id: rect3.id },
      target: { id: rect4.id }
    });

    var link4 = new joint.dia.Link({
      source: { id: rect.id },
      target: { id: rect4.id }
    });

     graph.addCells([rect, rect2, rect3, rect4, link1, link2, link3, link4]);

    joint.layout.DirectedGraph.layout(graph, {
        setVertices: true,
        ranker: "longest-path",
        rankDir: "TB",
        rankSep: 0,
        edgeSep: 0,
        nodeSep: 0
    });
    /* joint.layout.DirectedGraph.layout(graph, {
                setVertices: true,
                setLabels: true,
                ranker: "longer-path",
                rankDir: "TB",
                align: "UL",
                rankSep: 0,
                edgeSep: 0,
                nodeSep: 0
            }); */
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
