import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Sidebar } from './ui/sidebar/sidebar';
import ClipboardJS from 'clipboard';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, Sidebar],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly title = signal('lmstudio-ui');

  constructor() {
    (globalThis as any).ClipboardJS = ClipboardJS;
  }
}
