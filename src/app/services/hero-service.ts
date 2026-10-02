import { Service } from '@angular/core';
import { HeroInterface } from '../data/heroInterface';
import { HEROES } from '../data/mock-heroes';
import { Observable, of } from 'rxjs';

@Service()
export class HeroService {
  private heroes: HeroInterface[] = HEROES;

  // Retourne la liste des héros sous forme d'Observable
  getHeroes(): Observable<HeroInterface[]> {
    //return of(this.heroes);

    // Simulation d'une arrivée en retard des données
    const heroes: Observable<HeroInterface[]> = new Observable((observer) => {
      observer.next(HEROES.slice(0, 2)); // émission des 2 premiers héros
      setTimeout(() => {
        observer.next(HEROES); // émission de tous les héros
        observer.complete();
      }, 3000);
    });

    return heroes;
  }
}
