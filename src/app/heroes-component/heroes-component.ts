import { Component, signal } from '@angular/core';
import { HeroInterface } from '../data/heroInterface';
import { UpperCasePipe } from '@angular/common';
import { form, FormField } from '@angular/forms/signals';

@Component({
  imports: [FormField, UpperCasePipe], // les modules/composants utilisés peuvent s'ajouter ici (optionnel)
  selector: 'app-heroes-component', // tag pour importer le composant
  styleUrl: './heroes-component.css',
  templateUrl: './heroes-component.html',
})
export class HeroesComponent {
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
}
