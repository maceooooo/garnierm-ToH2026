import { Component, signal, inject } from '@angular/core';
import { HeroInterface } from '../../data/heroInterface';
import { HeroService } from '../../services/hero-service';
import { RouterLink } from '@angular/router';
import { MessageService } from '../../services/message-service';

@Component({
  imports: [RouterLink],
  selector: 'app-heroes-component',
  styleUrl: './heroes-component.css',
  templateUrl: './heroes-component.html',
})
export class HeroesComponent {
  // La liste et les fiches lisent la même collection via le service, sans copie de données propre à cette vue.
  private heroService = inject(HeroService);
  private messageService = inject(MessageService);

  heroesModel = signal<HeroInterface[]>([]);

  ngOnInit() {
    // L'abonnement répercute les instantanés de la collection dans le signal utilisé par le template.
    this.heroService.getHeroes().subscribe({
      next: (heroes) => this.heroesModel.set(heroes),
      error: () => this.messageService.add('Impossible de charger la liste des héros.'),
    });
  }
}
