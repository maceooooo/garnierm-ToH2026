import { Component, input, linkedSignal, output, inject } from '@angular/core';
import { HeroInterface } from '../../data/heroInterface';
import { form, FormField } from '@angular/forms/signals';
import { MessageService } from '../../services/message-service';

@Component({
  imports: [FormField],
  selector: 'app-hero-edit-component',
  styleUrl: './hero-edit-component.css',
  templateUrl: './hero-edit-component.html',
})
export class HeroEditComponent {
  // INPUT : Signal contenant le héros en entrée, pas modifiable directement par le composant
  hero = input.required<HeroInterface>();

  messageService = inject(MessageService);

  // OUTPUT : Signal de sortie pour notifier le parent d'un changement de héros
  heroChange = output<HeroInterface>();

  // Utilisation de linkedSignal pour créer un signal contenant une copie du héros en entrée, afin de pouvoir le modifier dans le formulaire
  heroModel = linkedSignal(() => ({ ...this.hero() }));

  // Création du formulaire à partir du signal heroModel
  heroForm = form(this.heroModel);

  // Retourne le signal du héros modifié
  save() {
    this.heroChange.emit(this.heroModel());
    this.messageService.add('Les modifications du héros ont été enregistrées.');
  }
}
