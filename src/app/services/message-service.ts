import { Service, signal } from '@angular/core';

@Service()
export class MessageService {
  messages = signal<string[]>([]);

  add(message: string): void {
    this.messages.update((messages) => [...messages, message]);
  }

  clear(): void {
    this.messages.set([]);
  }
}
