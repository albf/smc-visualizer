import { TestBed, async } from '@angular/core/testing';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { AppComponent } from './app.component';

describe('AppComponent', () => {
    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [
                AppComponent
            ],
            imports: [
                NgbModule.forRoot()
            ],
        }).compileComponents();
    }));
    it('should create the app', async(() => {
        const fixture = TestBed.createComponent(AppComponent);
        const app = fixture.debugElement.componentInstance;
        expect(app).toBeTruthy();
    }));
    it(`should have as title 'SMC Visualizer'`, async(() => {
        const fixture = TestBed.createComponent(AppComponent);
        const app = fixture.debugElement.componentInstance;
        expect(app.title).toEqual('SMC Visualizer');
    }));
    it('should render paper div with initial graph', async(() => {
        const fixture = TestBed.createComponent(AppComponent);
        fixture.detectChanges();
        const compiled: HTMLElement = fixture.debugElement.nativeElement;

        expect(compiled.innerHTML).toContain('id="paper" class="joint-paper joint-theme-default');
        expect(compiled.getElementsByTagName("svg")[0].innerHTML).toContain("basic.Rect");
    }));
    it('should update current time correctly', async(() => {
        const fixture = TestBed.createComponent(AppComponent);
        fixture.detectChanges();
        const compiled: HTMLElement = fixture.debugElement.nativeElement;

        const expected = fixture.componentInstance['traceSamples'].getSample(0).trace.modifications.length.toString();
        expect(compiled.getElementsByClassName("card-nav").item(0).innerHTML).toContain("0 of " + expected);
    }));
});
