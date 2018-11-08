import { HttpClient } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import * as OfficeHelpers from '@microsoft/office-js-helpers';
import { Observable } from 'rxjs';
import { map } from "rxjs/operators";

@Component({
  selector: 'app-home',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent implements OnInit {
  constructor(
    private http: HttpClient
  ) {}

  welcomeMessage = 'Welcome';
  refs$: Observable<any[]>;
  currtxt: string;

  async ngOnInit() {
    try {
      await Excel.run(async context => {
        context.workbook.onSelectionChanged.add((window as any).Zone.current.wrap(async (args: Excel.SelectionChangedEventArgs) => {
          let activeCell = args.workbook.getActiveCell();
          let srctxtCell = activeCell.getOffsetRange(0, -1);
          try {
            srctxtCell.load('text');
            await context.sync();
          } catch (outOfRangeErr) { }
          
          this.currtxt = srctxtCell.text[0][0];

          if (!this.currtxt)
            return;

          this.refs$ = this.http.get<{ r: any[] }>('/api/search', { params: { q: this.currtxt } })
            .pipe(map(res => res.r));
        }, 'onSelectionChangedCallback'));
        await context.sync();
      });
    } catch (error) {
      OfficeHelpers.UI.notify(error);
      OfficeHelpers.Utilities.log(error);
    }
  }
}
