import { Component, signal, inject } from '@angular/core';
import { HeroInterface } from '../../data/heroInterface';
import { HeroService } from '../../services/hero-service';
import { RouterLink } from '@angular/router';

@Component({
  imports: [RouterLink],
  selector: 'app-heroes-component',
  styleUrl: './heroes-component.css',
  templateUrl: './heroes-component.html',
})
export class HeroesComponent {
  private heroService = inject(HeroService);

  heroesModel = signal<HeroInterface[]>([]);

  ngOnInit() {
    this.heroService.getHeroes().subscribe((heroes) => {
      this.heroesModel.set(heroes);
    });
  }
}
