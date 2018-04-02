import { Component, OnInit } from '@angular/core';
import { TraceGraph } from "./trace-graph";
import { NgbModal, ModalDismissReasons } from '@ng-bootstrap/ng-bootstrap';

import { Trace } from "./trace";
import { TraceSamples } from "./samples";
import { TraceBuilder } from "./trace-builder";

type ViewType = "normal" | "modification" | "increment";

type Bookmark = {
    viewType: ViewType,
    time: number
    selection: number[];
}

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
    private viewSelected: ViewType;

    selected: number[];     // Used to track selected nodes
    currentMask: number[];  // Current used mask, required for bookmark and clean selections

    playing: boolean;
    playExit: boolean;

    bookmarks: Bookmark[];

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
                        this.currentMask = this.selected;
                        this.drawTrace();
                    }
                }
            });

        this.currentMask = null;
        this.playing = false;
        this.playExit = true;
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
        this.bookmarks = [];
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
        this.currentMask = null;
        this.trace.cleanMask();
        this.drawTrace();
    }

    advanceTime(ignoreStop: boolean = false): boolean {
        if (!ignoreStop) {
            this.stopIfPlaying();
        }
        if (this.trace.applyNext()) {
            this.currentTime++;
            this.drawTrace();
            return true;
        }
        return false;
    }

    advanceToEnd() {
        this.stopIfPlaying();
        while (this.trace.applyNext()) {
            this.currentTime++;
        }
        this.drawTrace();
    }

    backTime() {
        this.stopIfPlaying();
        if (this.trace.applyUndo()) {
            this.currentTime--;
            this.drawTrace();
        }
    }

    backToStart() {
        this.stopIfPlaying();
        while (this.trace.applyUndo()) {
            this.currentTime--;
        }
        this.drawTrace();
    }

    play() {
        // If received a play request and is already playing, it's a stop.
        if (this.stopIfPlaying()) {
            return;
        }

        this.playing = true;
        // It's possible there is a waiting thread, check if that's the case
        if (!this.playExit) {
            return;
        }

        const fn = (time: number) => {
            if (this.playing && this.advanceTime(true)) {
                setTimeout(fn, 1000);
            } else {
                this.playExit = true;
            }
        }

        this.playExit = false;
        setTimeout(fn, 1000);

        // Update play button
        const button = document.getElementById("play-button-text");
        button.setAttribute("class", "fa fa-stop");
    }

    stopIfPlaying(): boolean {
        if (!this.playing) {
            return false;
        }

        this.playing = false;
        const button = document.getElementById("play-button-text");
        button.setAttribute("class", "fa fa-play");
        return true;
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
            try {
                this.initTrace(new TraceBuilder()
                    .fromFile(event.target["result"]));
            } catch (e) {
                alert(e.toString());
            }
        }.bind(this);
        reader.readAsText(fileToUpload);
    }

    saveBookmark() {
        this.bookmarks.unshift({
            viewType: this.viewSelected,
            time: this.currentTime,
            selection: this.currentMask
        });

        // If getting too big, remove the first added.
        if (this.bookmarks.length > 10) {
            this.bookmarks = this.bookmarks.slice(0, this.bookmarks.length - 1);
        }
        alert("Bookmark saved!");
    }

    openBookmark(element: number) {
        const bk = this.bookmarks[element];

        // Fix any time difference
        while (bk.time > this.currentTime) this.advanceTime();
        while (bk.time < this.currentTime) this.backTime();

        // Update view type and selection
        this.viewSelected = bk.viewType;
        this.currentMask = bk.selection;

        if (this.currentMask != null) {
            this.trace.updateSelection(this.currentMask);
        } else {
            this.trace.cleanMask();
        }

        this.drawTrace();
    }
}
