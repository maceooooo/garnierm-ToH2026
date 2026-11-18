import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { WeaponInterface } from '../../data/weapon-interface';
import { MessageService } from '../../services/message-service';
import { InvalidWeaponDocumentError, WeaponService } from '../../services/weapon-service';

@Component({
  imports: [RouterLink],
  selector: 'app-weapons-component',
  styleUrl: './weapons-component.css',
  templateUrl: './weapons-component.html',
})
export class WeaponsComponent {
  private destroyRef = inject(DestroyRef);
  private weaponService = inject(WeaponService);
  private messageService = inject(MessageService);

  weapons = signal<WeaponInterface[]>([]);
  loadError = signal<string | null>(null);

  ngOnInit(): void {
    this.weaponService
      .getWeapons()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (weapons) => {
          this.weapons.set(weapons);
          this.loadError.set(null);
        },
        error: (error: unknown) => {
          const message = this.getLoadErrorMessage(error);
          this.loadError.set(message);
          this.messageService.add(message);
        },
      });
  }

  private getLoadErrorMessage(error: unknown): string {
    if (error instanceof InvalidWeaponDocumentError) {
      return `${error.message} Vérifiez que chaque document contient name et les bonus bonusPv, bonusDegats et bonusVitesse (entiers de -50 à 50).`;
    }

    const code = this.getErrorCode(error);
    if (code === 'permission-denied' || code === 'unauthenticated') {
      return 'Lecture de la collection « armes » refusée par Firestore. Vérifiez les règles de lecture de cette collection.';
    }
    if (code) {
      return `Impossible de charger la collection « armes » (erreur Firestore : ${code}).`;
    }

    return 'Impossible de charger la liste des armes. Vérifiez la connexion et les données de la collection « armes ».';
  }

  private getErrorCode(error: unknown): string | undefined {
    if (typeof error !== 'object' || error === null || !('code' in error)) {
      return undefined;
    }

    const code = error.code;
    return typeof code === 'string' ? code : undefined;
  }
}
