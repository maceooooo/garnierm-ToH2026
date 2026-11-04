import { Component, input, linkedSignal, output } from '@angular/core';
import { HeroInterface } from '../../data/heroInterface';
import { form, FormField } from '@angular/forms/signals';

@Component({
  imports: [FormField],
  selector: 'app-hero-edit-component',
  styleUrl: './hero-edit-component.css',
  templateUrl: './hero-edit-component.html',
})
export class HeroEditComponent {
  // L'entrée conserve la valeur de référence du parent; le brouillon peut donc être modifié sans l'écraser.
  hero = input.required<HeroInterface>();

  // Le parent reçoit le brouillon uniquement à l'enregistrement, pas à chaque frappe.
  heroChange = output<HeroInterface>();

  // linkedSignal réinitialise le brouillon si le parent sélectionne ou recharge un autre héros.
  heroModel = linkedSignal(() => ({ ...this.hero() }));

  heroForm = form(this.heroModel);

  /** Émet le brouillon au parent, qui effectue l'écriture persistante et gère son résultat. */
  save() {
    this.heroChange.emit(this.heroModel());
  }
}
