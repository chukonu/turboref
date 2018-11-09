import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import * as OfficeHelpers from '@microsoft/office-js-helpers';
import { Observable, of } from 'rxjs';
import { catchError, map, tap } from "rxjs/operators";

@Component({
  selector: 'app-home',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  constructor(
    private http: HttpClient
  ) {}

  refs$: Observable<any[]>;
  currtxt: string;
  lastqry: string;

  async ngOnInit() {
    try {
      await Excel.run(async context => {
        context.workbook.onSelectionChanged.add(this.selectionChangeHandlerFn());
        await context.sync();
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

      let qry = this.stripHtmlTags(this.currtxt);

      if (qry == this.lastqry)
        return;

      this.refs$ = this.http.get<{ r: any[] }>('/api/search', { params: { q: qry } })
        .pipe(map<{ r: any[] }, any[]>(res => res.r))
        .pipe(tap(() => this.lastqry = this.currtxt))
        .pipe(catchError(err => {
          this.logErr(err);
          return of(null);
        }));
    });
  }

  private stripHtmlTags(html: string): string {
    let div = document.createElement('div');
    div.innerHTML = html;
    let stripped = div.textContent || div.innerText || '';
    return stripped.trim();
  }
}
