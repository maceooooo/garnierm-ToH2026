import { Component, signal } from '@angular/core';
import { RouterLink, RouterOutlet } from '@angular/router';
import { HeroesComponent } from './components/heroes-component/heroes-component';
import { MessageComponent } from './components/message-component/message-component';

@Component({
  imports: [RouterOutlet, MessageComponent, RouterLink],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  title = signal('Macéo Garnier ToH2026');
}
