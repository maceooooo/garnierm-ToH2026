import { Component, signal } from '@angular/core';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { MessageComponent } from './components/message-component/message-component';

@Component({
  imports: [RouterOutlet, MessageComponent, RouterLink, RouterLinkActive],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  title = signal('Macéo Garnier ToH2026');
}
