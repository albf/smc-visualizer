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

    constructor(width, height) {
        this.graph = new joint.dia.Graph;

        this.paper = new joint.dia.Paper({
            el: jQuery("#paper"),
            width: width,
            height: height,
            model: this.graph,
            gridSize: 1
        });
    }

    updateLayout(): void {
        joint.layout.DirectedGraph.layout(this.graph, {
            setVertices: true,
            ranker: "longest-path",
            rankDir: "TB",
            rankSep: 0, // TODO: find a good configuration here
            edgeSep: 10,
            nodeSep: 0
        });
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

        this.graph.addCells(graphElements);
        this.updateLayout();
    }
}