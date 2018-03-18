import * as jQuery from 'jquery';
import * as _ from 'lodash';
import * as $ from 'backbone';
import * as joint from 'jointjs';
import { Trace, TraceNode } from './trace';

interface SpecialEdges {
    start: number[],
    end: number[]
}

// Actual graph display and helper functions

export class TraceGraph {
    graph: joint.dia.Graph;
    paper: joint.dia.Paper;

    paperWidth: number;
    paperHeight: number;
    scale = 1;

    textCanvas: any;
    startNode: joint.shapes.basic.Rect;

    constructor() {
        const element = jQuery("#graph");
        this.paperWidth = element.width();
        this.paperHeight = element.height();

        this.graph = new joint.dia.Graph;

        this.paper = new joint.dia.Paper({
            el: element,
            width: this.paperWidth,
            height: this.paperHeight,
            model: this.graph,
            gridSize: 1
        });
    }

    private updateLayout(): void {
        let marginX = 0;
        let marginY = 0;

        let rankDir: 'TB' | 'BT' | 'LR' | 'RL';
        let ranker: 'network-simplex' | 'tight-tree' | 'longest-path';

        rankDir = 'TB';
        ranker = 'network-simplex';

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

    // Use canvas meaureText to calculate text width. Shouldn't mess with the DOM.
    private getTextWidth(text, font) {
        // if exists, use cached canvas for better performance
        var canvas = this.textCanvas || (this.textCanvas = document.createElement("canvas"));
        var context = canvas.getContext("2d");
        context.font = font;
        var metrics = context.measureText(text);
        return metrics.width;
    };

    private createRect(code: string, color = 'white'): joint.shapes.basic.Rect {
        const lines = code.split(/\r\n|\r|\n/);
        const fontSize = 14;
        const fontFamily = "sans-serif";
        const borderSize = 10;
        let maxWidth = 0;

        lines.forEach((value) => {
            let width = this.getTextWidth(value, String(fontSize + "px " + String(fontFamily)));
            if (width > maxWidth) {
                maxWidth = width;
            }
        });

        return new joint.shapes.basic.Rect({
            size: { width: maxWidth + borderSize, height: lines.length * fontSize + borderSize },
            attrs: { rect: { fill: color }, text: { text: code, fill: 'gray', fontSize: fontSize, fontFamily } }
        });
    }

    private createLink(sourceId: string | number, targetId: string | number, color: string = 'gray', dashed: boolean = false): joint.dia.Link {
        let attrs = {
            '.connection': {
                stroke: color,
                strokeWidth: 2,
                pointerEvents: 'none',
                targetMarker: {
                    type: 'path',
                    fill: color,
                    stroke: 'none',
                    d: 'M 10 -10 0 0 10 10 z'
                }
            }
        };

        if (dashed) {
            attrs['.connection']['stroke-dasharray'] = '5 2';
        }

        return new joint.dia.Link({
            attrs,
            source: { id: sourceId },
            target: { id: targetId }
        });
    }

    private draw(nodes: Map<number, TraceNode>, specialEdges: SpecialEdges = null): void {
        const graphElements = [];
        const nodesMap = new Map<number, joint.shapes.basic.Rect>();  // Needed to created links

        // Frist create nodes
        nodes.forEach((n, k) => {
            const rect = this.createRect(n.code);
            graphElements.push(rect);
            nodesMap.set(k, rect);
        });

        // Then, create edges - mandatory to do be after nodes
        nodes.forEach((n, sourceIndex) => {
            n.destinations.forEach((targetIndex) => {
                graphElements.push(this.createLink(nodesMap.get(sourceIndex).id, nodesMap.get(targetIndex).id));
            })
        })

        // Create change edges
        if (specialEdges != null) {
            specialEdges.start.forEach((v, i) => {
                const startNode = nodesMap.get(specialEdges.start[i]);
                const endNode = nodesMap.get(specialEdges.end[i]);
                graphElements.push(this.createLink(startNode.id, endNode.id, 'red', true));
            });
        }

        // Save starting node
        this.startNode = graphElements[0];

        // TODO: Might be optmized by only changing the modified nodes
        this.graph.clear();
        this.graph.addCells(graphElements);
        this.updateLayout();
    }

    drawTrace(trace: Trace) {
        let specialEdges = null;
        const latestModification = trace.getLatestModification();
        if (latestModification != null) {
            specialEdges = {
                start: latestModification.causers,
                end: latestModification.targets
            }
        }

        this.draw(trace.nodes, specialEdges);
    }

    drawModificationPeek(trace: Trace): void {
        trace.createModificationPeek();
        this.draw(trace.peekModificationNodes);
    }

    drawIncrementPeek(trace: Trace): void {
        trace.createIncrementPeek();
        this.draw(trace.peekIncrementNodes);
    }

    zoomIn(): void {
        this.scale += 0.1;
        this.paper.scale(this.scale, this.scale);
        this.updateLayout();
    }

    zoomOut(): void {
        if (this.scale > 0.1) {
            this.scale -= 0.1;
            this.paper.scale(this.scale, this.scale);
            this.updateLayout();
        }
    }

    expandPaper(): void {
        this.paperHeight += 100;
        this.paper.setDimensions(this.paperWidth, this.paperHeight);
    }

    compressPaper(): void {
        if (this.paperHeight > 100) {
            this.paperHeight -= 100;
            this.paper.setDimensions(this.paperWidth, this.paperHeight);
        }
    }
}
