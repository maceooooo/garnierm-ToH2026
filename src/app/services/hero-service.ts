import { Service, inject } from '@angular/core';
import { HeroInterface } from '../data/heroInterface';
import { HEROES } from '../data/mock-heroes';
import { Observable, of } from 'rxjs';
import { MessageService } from './message-service';

@Service()
export class HeroService {
  private heroes: HeroInterface[] = HEROES;

  private messageService = inject(MessageService);

  // Retourne la liste des héros sous forme d'Observable
  getHeroes(maxHeroes: number = -1): Observable<HeroInterface[]> {
    // Simulation d'une arrivée en retard des données
    const heroes: Observable<HeroInterface[]> = new Observable((observer) => {
      // Si maxHeroes vaut -1, on récupère tous les héros
      const listeHeroes = maxHeroes === -1 ? this.heroes : this.heroes.slice(0, maxHeroes);
      observer.next(listeHeroes.slice(0, 2)); // émission des 2 premiers héros
      setTimeout(() => {
        observer.next(listeHeroes); // émission de tous les héros
        this.messageService.add('HeroService : héros récupérés avec succès');
        observer.complete();
      }, 3000);
    });

    return heroes;
  }
}

