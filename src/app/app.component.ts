import { HttpClient } from '@angular/common/http';
import { ChangeDetectorRef, Component, ElementRef, OnInit, ViewChild } from '@angular/core';
import * as OfficeHelpers from '@microsoft/office-js-helpers';
import { Observable, of } from 'rxjs';
import { catchError, map, tap } from "rxjs/operators";
import { Ref } from './ref';
import { RefsetFilterOption } from './refset-filter-option';

@Component({
  selector: 'app-home',
  host: {
    '(window:resize)': 'onResize($event)'
  },
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  constructor(
    private chngDt: ChangeDetectorRef,
    private http: HttpClient
  ) {}

  onResize(_) {
    if (this.isPinned)
      this.chngDt.detectChanges();
  }

  refs$: Observable<{ exact: Ref[], similar: Ref[] }>;
  currtxt: string;
  lastqry: string;

  currCellAddr: string;

  refSetList: RefsetFilterOption[];

  get whitespaceRendered(): string {
    return this.renderWhitespace(this.currtxt);
  }

  isInPlainTextMode: boolean = true;

  renderWhitespace(txt: string): string {
    // ·
    return this.escapeHtml(txt).replace(/\s+/g,
      (m) => `<span class="whitespace">${m.replace(/\s/g, '•')}</span>`);
  }

  async ngOnInit() {
    try {
      await Excel.run(async context => {
        context.workbook.onSelectionChanged.add(this.selectionChangeHandlerFn());
        await context.sync();
        
        this.onSelectionChanged(null);
      });
    } catch (err) {
      this.logErr(err);
    }
  }

  private selectionChangeHandlerFn(): (args: Excel.SelectionChangedEventArgs) => Promise<any> {
    return (window as any).Zone.current.wrap(this.onSelectionChanged.bind(this), 'onSelectionChangedCallback');
  }

  private logErr(err: Error) {
    OfficeHelpers.UI.notify(err);
    OfficeHelpers.Utilities.log(err);
  }

  async onSelectionChanged(args: Excel.SelectionChangedEventArgs) {
    scrollTo(0, 0);
    try {
      await this._onSelectionChanged(args);
    } catch (err) {
      this.logErr(err);
    }
  }

  private async _onSelectionChanged(_: Excel.SelectionChangedEventArgs) {
    await Excel.run(async ctx => {
      let activeCell = ctx.workbook.getActiveCell();
      activeCell.load('address');
      let srctxtCell = activeCell.getOffsetRange(0, -1);
      try {
        srctxtCell.load('text');
        await ctx.sync();
        this.currtxt = srctxtCell.text[0][0];
      } catch (err) {
        activeCell.load('text');
        await ctx.sync();
        this.currtxt = activeCell.text[0][0];
      }

      if (!this.currtxt)
        return;

      this.currCellAddr = activeCell.address;

      let qry = this.htmlToPlainText(this.currtxt);
      let sentences: string[] = ((window as any).nlp as any)(qry).sentences().data().map(x => x.normal);
      sentences.unshift(qry);

      if (qry == this.lastqry)
        return;

      this.refs$ = this.http.post<Ref[]>('/api/search', sentences)
        .pipe(map<Ref[], { exact: Ref[], similar: Ref[] }>(res => {
          if (!res) {
            return { exact: null, similar: null };
          }
          return {
            exact: res.filter(ref => ref.s == this.currtxt).filter(
              (value, index, self) => self.findIndex(x => x.t == value.t) == index),
            similar: res.filter(ref => ref.s != this.currtxt).filter(
              (value, index, self) => self.findIndex(x => x.s == value.s) == index)
          };
        }))
        .pipe(tap(() => this.lastqry = this.currtxt))
        .pipe(catchError(err => {
          this.logErr(err);
          return of(null);
        }));
      this.refs$.subscribe(data => {
        if (!data || !data.similar)
          return;
        let sets = data.similar.reduce<RefsetFilterOption[]>((prev, curr) => {
          let rfo: RefsetFilterOption;
          if (rfo = prev.find(x => x.name == curr.n))
            rfo.count++;
          else
            prev.push({ name: curr.n, count: 1 });
          return prev;
        }, [])
        .sort((a, b) => {
          if (a.count - b.count < 0) return 1;
          if (a.count - b.count > 0) return -1;
          return 0;
        });
        this.refSetList = sets;
      });
    });
  }

  private htmlToPlainText(html: string): string {
    const linebreak = '$$LINEBREAK$$';
    const div = document.createElement('div');
    div.innerHTML = html;
    const blocks = div.querySelectorAll('p, li');
    for (let i = 0; i < blocks.length; i++) {
      const b = blocks[i];
      const span = document.createElement('span');
      span.innerText = linebreak;
      b.appendChild(span);
    }
    let plaintext = div.textContent || div.innerText || '';
    plaintext = plaintext.replace(/\$\$LINEBREAK\$\$/g, '\n');
    return plaintext.trim();
  }

  escapeHtml(html: string) {
    var map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return html.replace(/[&<>"']/g, m => map[m]);
  }

  public highlightSimilar(txt: string): string {
    let keywords = this.htmlToPlainText(this.lastqry).match(/(\w+)/g);
    if (keywords)
      keywords.forEach(kw => {
        txt = txt.replace(new RegExp(`\\b(${kw})\\b`, 'gi'), m => `<span class="highlighted">${m}</span>`);
      });
    return txt;
  }

  async adopt(refs: any, source: string, index: number) {
    if (source != 'exact')
      return;
    try {
      await Excel.run(async ctx => {
        let selected = ctx.workbook.getSelectedRange();
        selected.values = [ [ refs.exact[index].t ] ];
        await ctx.sync();
      });
    } catch (err) {
      this.logErr(err);
      return;
    }
    refs.exact.forEach(ref => ref.hasBeenAdopted = false);
    refs.exact[index].hasBeenAdopted = true;
  }

  isPinned: boolean = false;

  pin() {
    this.isPinned = !this.isPinned;
  }

  @ViewChild('srcPane') srcPane: ElementRef;

  get srcPaneHeight(): string {
    return getComputedStyle(this.srcPane.nativeElement).getPropertyValue('height');
  }

  get refListMarginTop(): string {
    return this.isPinned ? this.srcPaneHeight : '0';
  }
}
