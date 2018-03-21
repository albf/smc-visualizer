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

    containerWidth: number;
    containerHeight: number;
    scale = 1;
    count = 500;

    textCanvas: any;
    startNode: joint.shapes.basic.Rect;

    currentMarginX: number;
    currentMarginY: number;

    constructor() {
        const element = jQuery("#paper");
        const container = jQuery("#paper-container");
        this.containerWidth = container.width();
        this.containerHeight = container.height();

        this.graph = new joint.dia.Graph;

        this.paper = new joint.dia.Paper({
            el: element,
            width: this.containerWidth,
            height: this.containerHeight,
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
        opts['marginX'] = ((this.containerWidth / 2) - this.scale * (parseInt(position['x']) + (parseInt(size['width']) / 2))) / this.scale;
        opts['marginY'] = (this.containerHeight / 50) - parseInt(position['y']);

        // Don't accept negative margin. TODO: maybe try to set the scroll initial position?
        if (opts['marginX'] < 0) {
            opts['marginX'] = 0;
        }

        this.currentMarginX = opts['marginX'];
        this.currentMarginY = opts['marginY'];

        joint.layout.DirectedGraph.layout(this.graph, opts);

        this.definePaperDimension();
    }

    private definePaperDimension() {
        var bbox = this.graph.getBBox();

        // Idea is to set a good dimenion for the paper, which is inside the container. Both will have,
        // at least the size of the container (this.containerWidth and this.containerHeight).
        // The max would be the size of the graph + the margin, but multiplication by the scale is necessary.
        // An extra safety margin (2% of the container) is added.
        this.paper.setDimensions(Math.max((bbox.width + this.currentMarginX) * this.scale + (this.containerHeight / 50), this.containerWidth),
            Math.max((bbox.height + this.currentMarginY) * this.scale + (this.containerHeight / 50), this.containerHeight));
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

    private getSVG(): SVGSVGElement {
        const svgOriginal = document.getElementById('paper').getElementsByTagName("svg")[0];
        const svg = svgOriginal.cloneNode(true) as SVGSVGElement;

        // BBox doesn't get copied. It's required to get the size.
        // Store it in the cloned element.
        const bbox = svgOriginal.getBBox();

        // Scale will make bbox dirty. Fix it.
        svg.style['bbox-width'] = bbox.width / this.scale;
        svg.style['bbox-height'] = bbox.height / this.scale;

        // Important, otherwise background will have black marks.
        // Also fix the initial position and remove scale transformation (if any).
        svg.style['fill'] = 'white';
        svg.setAttribute('transform', 'translate(' + (-this.currentMarginX) + ')');
        svg.firstElementChild.setAttribute('transform', '');

        return svg;
    }

    saveSVG() {
        const svgString = new XMLSerializer().serializeToString(this.getSVG());
        const a = document.createElement('a');

        a.href = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svgString);
        a.download = "smc-visualizer.svg";
        document.body.appendChild(a);
        a.click();
    }

    saveToPNG() {
        const svg = this.getSVG();
        const svgString = new XMLSerializer().serializeToString(svg);

        const canvas = document.createElement("canvas");

        const marginX = this.currentMarginX;
        const marginY = this.currentMarginY;

        canvas.width = svg.style['bbox-width'] + marginX;
        canvas.height = svg.style['bbox-height'] + marginY * 2;

        const ctx = canvas.getContext("2d");
        const DOMURL = self.URL || (self as any).webkitURL || self;

        const img = new Image;

        const svgBlob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
        const url = DOMURL.createObjectURL(svgBlob);

        img.onload = function () {
            // Background
            ctx.globalCompositeOperation = 'source-over';
            ctx.fillStyle = 'white';
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Draw the whole graph into the canvas.
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height, 0, 0, canvas.width, canvas.height) //, 0, 0, 0, 0);

            // Use a second canvas to properly cut the data.
            // Using only one would be ideal, but it's now working in Chrome.
            const cutCanvas = document.createElement('canvas');
            const cutCtx = cutCanvas.getContext("2d");

            cutCanvas.width = svg.style['bbox-width'];
            cutCanvas.height = svg.style['bbox-height'];

            var data = ctx.getImageData(0, 0, cutCanvas.width, cutCanvas.height);
            cutCtx.putImageData(data, 0, 0);

            DOMURL.revokeObjectURL(url);
            if (typeof navigator !== "undefined" && navigator.msSaveOrOpenBlob) {
                const blob = cutCanvas.msToBlob();
                navigator.msSaveOrOpenBlob(blob, "smc-visualizer.png");
            }
            else {
                const imgURI = cutCanvas
                    .toDataURL("image/png", )
                    .replace("image/png", "image/octet-stream");
                const a = document.createElement('a');
                a.href = imgURI;
                a.download = "smc-visualizer.png";
                document.body.appendChild(a);
                a.click();
            }
        }
        img.src = url;
    }

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
            'markup': [
                '<path class="connection" stroke="black" d="M 0 0 0 0"/>',
                '<path class="marker-source" fill="black" stroke="black" d="M 0 0 0 0"/>',
                '<path class="marker-target" fill="black" stroke="black" d="M 0 0 0 0"/>'].join(''),
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

    private updateContainerHeight(difference: number) {
        const element = jQuery("#paper-container");
        this.containerHeight += difference;

        element.height(this.containerHeight);
        element.css("max-height", this.containerHeight);
        this.definePaperDimension();
    }

    expandPaper(): void {
        this.updateContainerHeight(100);
    }

    compressPaper(): void {
        if (this.containerHeight > 100) {
            this.updateContainerHeight(-100);
        }
    }
}
