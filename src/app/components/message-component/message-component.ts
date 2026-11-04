import { Component, inject } from '@angular/core';
import { MessageService } from '../../services/message-service';

@Component({
  imports: [],
  selector: 'app-message-component',
  styleUrl: './message-component.css',
  templateUrl: './message-component.html',
})
export class MessageComponent {
  messageService = inject(MessageService);

  /** Efface toutes les notifications affichées par le service partagé. */
  hideMessage(): void {
    this.messageService.clear();
  }
}
