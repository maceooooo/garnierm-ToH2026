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

  hideMessage(): void {
    this.messageService.clear();
  }
}
