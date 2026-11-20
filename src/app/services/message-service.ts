import { Service, computed, signal } from '@angular/core';

interface Notification {
  id: number;
  message: string;
}

@Service()
export class MessageService {
  private notifications = signal<Notification[]>([]);
  private expirationTimers = new Map<number, ReturnType<typeof setTimeout>>();
  private nextNotificationId = 0;

  // L'interface publique reste une liste de textes, tout en gardant un identifiant interne par notification.
  messages = computed(() => this.notifications().map(({ message }) => message));

  /**
   * Ajoute une notification qui expire après cinq secondes et garde au plus trois messages.
   * @param message Texte de la notification à afficher.
   */
  add(message: string): void {
    const notification = { id: ++this.nextNotificationId, message };
    const visibleNotifications = [...this.notifications(), notification].slice(-3);
    const visibleIds = new Set(visibleNotifications.map(({ id }) => id));

    for (const previous of this.notifications()) {
      if (!visibleIds.has(previous.id)) {
        this.clearExpirationTimer(previous.id);
      }
    }

    this.notifications.set(visibleNotifications);
    this.expirationTimers.set(
      notification.id,
      setTimeout(() => this.remove(notification.id), 5000),
    );
  }

  /** Efface les notifications visibles et annule leurs expirations programmées. */
  clear(): void {
    for (const timer of this.expirationTimers.values()) {
      clearTimeout(timer);
    }
    this.expirationTimers.clear();
    this.notifications.set([]);
  }

  private remove(id: number): void {
    this.clearExpirationTimer(id);
    this.notifications.update((notifications) =>
      notifications.filter((notification) => notification.id !== id),
    );
  }

  private clearExpirationTimer(id: number): void {
    const timer = this.expirationTimers.get(id);
    if (timer !== undefined) {
      clearTimeout(timer);
      this.expirationTimers.delete(id);
    }
  }
}
