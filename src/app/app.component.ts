import { Component, OnInit } from '@angular/core';
import { TraceGraph } from "./trace-graph";
import { NgbModal, ModalDismissReasons } from '@ng-bootstrap/ng-bootstrap';

import { Trace } from "./trace";
import { TraceSamples } from "./samples";
import { TraceBuilder } from "./trace-builder";


@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.css']
})

export class AppComponent {
    private title = 'SMC Visualizer';

    private traceGraph: TraceGraph;
    private trace: Trace;
    private traceSamples: TraceSamples;
    private modalService: NgbModal;

    currentTime = 0;
    maxTime = 0;
    private viewSelected: "normal" | "modification" | "increment";

    selected: number[];     // Used to track selected nodes
    masked: boolean;        // Indicate if it's under a mask due a selection

    constructor(modalService: NgbModal) {
        this.modalService = modalService;
    }

    ngOnInit() {
        this.traceGraph = new TraceGraph();

        // pointerClick handler needs to be here, as it needs to have access to
        // both screen elements and trace elements. traceGraph shouldn't be aware of such structures.
        this.traceGraph.paper.on('cell:pointerclick',
            (cellView, evt, x, y) => {
                const nodeId = this.traceGraph.translateRectIdToNodeId(cellView.model.id.toString());

                if (this.selected.indexOf(nodeId) >= 0) {
                    this.selected = this.selected.filter(x => x != nodeId);
                    const cell = this.traceGraph.graph.getCell(cellView.model.id).attr('rect/fill', 'white');
                } else {
                    const cell = this.traceGraph.graph.getCell(cellView.model.id).attr('rect/fill', 'yellow');
                    this.selected.push(nodeId);
                    if (this.selected.length == 2) {
                        this.trace.updateSelection(this.selected);
                        this.selected = [];
                        this.masked = true;
                        this.drawTrace();
                    }
                }
            });

        this.masked = false;
        this.traceSamples = new TraceSamples();
        this.drawSample(0);
    }

    drawTrace() {
        // Solve sselection
        this.selected = [];

        switch (this.viewSelected) {
            case "normal": {
                this.traceGraph.drawTrace(this.trace);
                break;
            }
            case "modification": {
                this.traceGraph.drawModificationPeek(this.trace);
                break;
            }
            case "increment": {
                this.traceGraph.drawIncrementPeek(this.trace);
                break;
            }
        }
    }

    drawSample(index: number) {
        this.initTrace(this.traceSamples.getSample(index).trace);
    }

    initTrace(trace: Trace) {
        this.trace = trace;
        this.currentTime = 0;
        this.maxTime = this.trace.modifications.length;
        this.normalView();
    }

    normalView() {
        this.viewSelected = "normal";
        this.drawTrace();
    }

    peekModificationView() {
        this.viewSelected = "modification";
        this.drawTrace();
    }

    peekIncrementView() {
        this.viewSelected = "increment";
        this.drawTrace();
    }

    cleanSelections() {
        this.masked = false;
        this.trace.cleanMask();
        this.drawTrace();
    }

    advanceTime() {
        if (this.trace.applyNext()) {
            this.currentTime++;
            this.drawTrace();
        }
    }

    advanceToEnd() {
        while (this.trace.applyNext()) {
            this.currentTime++;
        }
        this.drawTrace();
    }

    backTime() {
        if (this.trace.applyUndo()) {
            this.currentTime--;
            this.drawTrace();
        }
    }

    backToStart() {
        while (this.trace.applyUndo()) {
            this.currentTime--;
        }
        this.drawTrace();
    }

    play() {
    }

    zoomIn() {
        this.traceGraph.zoomIn()
    }

    zoomOut() {
        this.traceGraph.zoomOut()
    }

    expandCanvas() {
        this.traceGraph.expandPaper();
    }

    compressCanvas() {
        this.traceGraph.compressPaper();
    }

    showSamplesModal(content) {
        this.modalService.open(content);
    }

    selectSample(element) {
        this.drawSample(element);
    }

    rasterize() {
        this.traceGraph.saveToPNG();
    }

    rasterizeSVG() {
        this.traceGraph.saveSVG();
    }

    loadTraceFile(files: FileList) {
        let fileToUpload: File = files.item(0);

        var reader = new FileReader();
        reader.onload = function (event) {
            this.initTrace(new TraceBuilder()
                .fromFile(event.target["result"]));
        }.bind(this);
        reader.readAsText(fileToUpload);
    }
}
