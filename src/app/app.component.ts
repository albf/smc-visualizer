import { Component, OnInit } from '@angular/core';
import { TraceGraph } from "./trace-graph";
import { NgbModal, ModalDismissReasons } from '@ng-bootstrap/ng-bootstrap';

import { Trace } from "./trace";
import { TraceSamples } from "./samples";
import { SummarizedSample } from "./summarized-sample";


@Component({
    selector: 'app-root',
    templateUrl: './app.component.html',
    styleUrls: ['./app.component.css']
})

export class AppComponent {
    private title = 'SMC Visualizer';

    private graph: TraceGraph;
    private trace: Trace;
    private traceSamples: TraceSamples;
    private summarizedSample: SummarizedSample;
    private summarizedSamples;

    private currentTime = 0;
    private maxTime = 0;

    constructor(private modalService: NgbModal) {

    }

    ngOnInit() {
        this.graph = new TraceGraph();
        this.traceSamples = new TraceSamples();
        this.summarizedSample = new SummarizedSample(this.traceSamples.samples);
        this.summarizedSamples = this.summarizedSample.getSummarizedSamples();
        this.drawSample(0);
    }

    drawSample(index: number) {
        this.trace = this.traceSamples.getSample(index).trace;
        this.currentTime = 0;
        this.maxTime = this.trace.modifications.length;
        this.graph.drawTrace(this.trace);
    }

    peekView() {
        this.graph.drawPeek(this.trace);
    }

    peekIncrementView() {
        this.graph.drawIncrementPeek(this.trace);
    }

    advanceTime() {
        if (this.trace.applyNext()) {
            this.currentTime++;
            this.graph.drawTrace(this.trace);
        }
    }

    advanceToEnd() {
        while (this.trace.applyNext()) {
            this.currentTime++;
        }
        this.graph.drawTrace(this.trace);
    }

    backTime() {
        if (this.trace.applyUndo()) {
            this.currentTime--;
            this.graph.drawTrace(this.trace);
        }
    }

    backToStart() {
        while (this.trace.applyUndo()) {
            this.currentTime--;
        }
        this.graph.drawTrace(this.trace);
    }

    zoomIn() {
        this.graph.zoomIn()
    }

    zoomOut() {
        this.graph.zoomOut()
    }

    expandCanvas() {
        this.graph.expandPaper();
    }

    compressCanvas() {
        this.graph.compressPaper();
    }

    showSamplesModal(content) {
        this.modalService.open(content);
    }
}
