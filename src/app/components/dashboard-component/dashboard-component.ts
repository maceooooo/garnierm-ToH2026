import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HeroService } from '../../services/hero-service';
import { HeroInterface } from '../../data/heroInterface';

@Component({
  imports: [RouterLink],
  selector: 'app-dashboard-component',
  styleUrl: './dashboard-component.css',
  templateUrl: './dashboard-component.html',
})
export class DashboardComponent {
  // Injection du service HeroService
  private heroService = inject(HeroService);

  // Signal contenant la liste des héros
  heroesModel = signal<HeroInterface[]>([]);

  ngOnInit() {
    this.heroService.getHeroes(4).subscribe((heroes) => {
      this.heroesModel.set(heroes);
    });
  }
}
