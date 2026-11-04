import { Service, signal } from '@angular/core';

@Service()
export class MessageService {
  // Le signal conserve au plus trois messages pour limiter l'encombrement de l'interface.
  messages = signal<string[]>([]);

  /**
   * Ajoute une notification récente tout en gardant une taille bornée.
   * @param message Texte de la notification à afficher.
   */
  add(message: string): void {
    this.messages.update((messages) => [...messages, message].slice(-3));
  }

  /** Réinitialise l'ensemble des notifications visibles. */
  clear(): void {
    this.messages.set([]);
  }
}
