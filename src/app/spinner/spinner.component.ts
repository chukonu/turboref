import { Component, OnInit, Attribute, ElementRef, ViewChild } from '@angular/core';

@Component({
  selector: 'app-spinner',
  templateUrl: './spinner.component.html',
  styleUrls: ['./spinner.component.css']
})
export class SpinnerComponent implements OnInit {

  @ViewChild('spinner') spinner: ElementRef;

  constructor(
    @Attribute('label') public label: string
  ) { }

  ngOnInit() {
    new ((window as any).fabric)['Spinner'](this.spinner.nativeElement);
  }

}
