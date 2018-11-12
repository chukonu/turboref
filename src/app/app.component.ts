import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import * as OfficeHelpers from '@microsoft/office-js-helpers';
import { Observable, of } from 'rxjs';
import { catchError, map, tap } from "rxjs/operators";
import { Ref } from './ref';

@Component({
  selector: 'app-home',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  constructor(
    private http: HttpClient
  ) {}

  refs$: Observable<{ exact: Ref[], similar: Ref[] }>;
  currtxt: string;
  lastqry: string;

  currCellAddr: string;

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

      let qry = this.stripHtmlTags(this.currtxt);
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
    });
  }

  public stripHtmlTags(html: string): string {
    let div = document.createElement('div');
    div.innerHTML = html;
    let stripped = div.textContent || div.innerText || '';
    return stripped.trim();
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
    let keywords = this.stripHtmlTags(this.lastqry).match(/(\w+)/g);
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
}
