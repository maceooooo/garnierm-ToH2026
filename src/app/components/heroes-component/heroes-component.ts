import { Component, signal, inject, computed } from '@angular/core';
import { HeroInterface } from '../../data/heroInterface';
import { UpperCasePipe } from '@angular/common';
import { form, FormField } from '@angular/forms/signals';
import { HeroService } from '../../services/hero-service';
import { HeroDetailComponent } from '../hero-detail-component/hero-detail-component';
import { HeroEditComponent } from '../hero-edit-component/hero-edit-component';

@Component({
  imports: [FormField, UpperCasePipe, HeroDetailComponent, HeroEditComponent], // les modules/composants utilisés peuvent s'ajouter ici (optionnel)
  selector: 'app-heroes-component', // tag pour importer le composant
  styleUrl: './heroes-component.css',
  templateUrl: './heroes-component.html',
})
export class HeroesComponent {
  /*
  heroModel = signal<HeroInterface>({
    id: 1,
    name: 'Hervé',
    actif: true,
  });

  protected changerHeroName($name : string) {
    this.heroModel.update((hero) => ({ ...hero, name: $name }));
  }

  protected changerHeroActif() {
    this.heroModel.update((hero) => ({ ...hero, actif: !hero.actif }));
  }

  heroForm = form(this.heroModel);
*/

  // Injection du service HeroService
  private heroService = inject(HeroService);

  // Signal contenant la liste des héros
  heroesModel = signal<HeroInterface[]>([]);

  // Signal contenant le héros sélectionné
  selectedHeroModel = signal<HeroInterface | null>(null);

  // Selection d'un héros
  onSelect(hero: HeroInterface): void {
    this.selectedHeroModel.set(hero);
    console.log(this.selectedHeroModel());
  }
  protected onHeroChange(updatedHero: HeroInterface) {
    // Met à jour la liste des héros avec le héros modifié
    this.heroesModel.update((heroes) =>
      heroes.map((hero) => (hero.id === updatedHero.id ? updatedHero : hero)),
    );

    // Met à jour le héros sélectionné
    this.selectedHeroModel.set(updatedHero);
  }

  // Mise à jour de la liste des héros lors de l'initialisation du composant
  ngOnInit() {
    this.heroService.getHeroes().subscribe((heroes) => {
      this.heroesModel.set(heroes);
    });  }
}
