import { Component, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { HeroService } from '../../services/hero-service';
import { HeroInterface } from '../../data/heroInterface';
import { MessageService } from '../../services/message-service';

@Component({
  imports: [RouterLink],
  selector: 'app-dashboard-component',
  styleUrl: './dashboard-component.css',
  templateUrl: './dashboard-component.html',
})
export class DashboardComponent {
  // Le tableau de bord limite sa requête aux quatre premiers héros triés par le service.
  private heroService = inject(HeroService);
  private messageService = inject(MessageService);

  heroesModel = signal<HeroInterface[]>([]);

  ngOnInit() {
    // Chaque émission (y compris les mises à jour Firestore) remplace la liste affichée par le nouvel instantané.
    this.heroService.getHeroes(4).subscribe({
      next: (heroes) => this.heroesModel.set(heroes),
      error: () => this.messageService.add('Impossible de charger les héros du tableau de bord.'),
    });
  }
}
