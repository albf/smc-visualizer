import * as jQuery from 'jquery';
import * as _ from 'lodash';
import * as $ from 'backbone';
import * as joint from 'jointjs';

// Model definitions - later transformed in a jointjs graph

interface TraceNode {
    code: string,
    destinations: number[]
}

interface TraceChange {
    type: 'modify' | 'remove' | 'add',
    target: number
    result: TraceNode
}

interface Trace {
    nodes: TraceNode[];
    changes: TraceChange[];
}

// Actual graph and helper functions

export class TraceGraph {
    graph: joint.dia.Graph;
    paper: joint.dia.Paper;

    paperWidth: number;
    paperHeight: number;
    scale = 1;

    startNode: joint.shapes.basic.Rect;

    constructor(width, height) {
        this.paperWidth = width;
        this.paperHeight = height;

        this.graph = new joint.dia.Graph;

        this.paper = new joint.dia.Paper({
            el: jQuery("#paper"),
            width: this.paperWidth,
            height: this.paperHeight,
            model: this.graph,
            gridSize: 1
        });
    }

    updateLayout(): void {
        let marginX = 0;
        let marginY = 0;

        let rankDir: 'TB' | 'BT' | 'LR' | 'RL';
        let ranker: 'network-simplex' | 'tight-tree' | 'longest-path';

        rankDir = 'TB';
        ranker = 'longest-path';

        let opts = {
            setVertices: true,
            ranker: ranker,
            rankDir: rankDir,
            rankSep: 0, // TODO: find a good configuration here
            edgeSep: 10,
            nodeSep: 0,
            marginX: marginX,
            marginY: marginY
        };

        // Draw twice: first one will just allow us to get the relative position
        // for the startNode. With such values, we can correctly calculate margins
        joint.layout.DirectedGraph.layout(this.graph, opts);

        let position = this.startNode.get('position');
        let size = this.startNode.get('size');

        // marginX is exactly the middle and marginX is just 2% paper size
        // Scale should be considered, as values keep the same value and there is a "movement" impression.
        opts['marginX'] = ((this.paperWidth / 2) - this.scale * (parseInt(position['x']) + (parseInt(size['width']) / 2))) / this.scale;
        opts['marginY'] = (this.paperHeight / 50) - parseInt(position['y']);

        joint.layout.DirectedGraph.layout(this.graph, opts);
    }

    createRect(code: string): joint.shapes.basic.Rect {
        return new joint.shapes.basic.Rect({
            position: { x: 100, y: 30 },
            size: { width: 100, height: 30 }, // TODO: find how to resize based on text
            attrs: { rect: { fill: 'white' }, text: { text: code, fill: 'gray' } }
        });
    }

    createLink(sourceId: string | number, targetId: string | number): joint.dia.Link {
        let attrs = {
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

        return new joint.dia.Link({
            attrs,
            source: { id: sourceId },
            target: { id: targetId }
        });
    }

    draw(trace: Trace): void {
        let graphElements = [];

        // Frist create nodes
        for (let n of trace.nodes) {
            graphElements.push(this.createRect(n.code));
        }

        // Then, create edges - mandatory to do be after nodes
        trace.nodes.forEach((n, sourceIndex) => {
            n.destinations.forEach((targetIndex) => {
                graphElements.push(this.createLink(graphElements[sourceIndex].id, graphElements[targetIndex].id));
            })
        })

        // Save starting node
        this.startNode = graphElements[0];

        this.graph.addCells(graphElements);
        this.updateLayout();
    }

    zoomIn(): void {
        this.scale += 0.1;
        this.paper.scale(this.scale, this.scale);
        this.updateLayout();
    }

    zoomOut(): void {
        if (this.scale > 0.1) {
            this.scale -= 0.1;
        }
        console.log("scale: " + (this.scale));
        this.paper.scale(this.scale, this.scale);
        this.updateLayout();
    }
}