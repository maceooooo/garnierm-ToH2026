import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeroesComponent } from './heroes-component/heroes-component';

@Component({
  imports: [RouterOutlet, HeroesComponent],
  selector: 'app-root',
  styleUrl: './app.css',
  templateUrl: './app.html',
})
export class App {
  title = signal('Macéo Garnier ToH2026');
}
