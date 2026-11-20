import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { WeaponInterface } from '../../data/weapon-interface';
import { MessageService } from '../../services/message-service';
import { InvalidWeaponDocumentError, WeaponService } from '../../services/weapon-service';
import { WeaponAssociationDialogComponent } from '../weapon-association-dialog/weapon-association-dialog';

@Component({
  imports: [RouterLink, WeaponAssociationDialogComponent],
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
  weaponToAssociate = signal<WeaponInterface | null>(null);

  openAssociation(weapon: WeaponInterface): void {
    this.weaponToAssociate.set(weapon);
  }

  closeAssociation(): void {
    this.weaponToAssociate.set(null);
  }

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
      return `${error.message} Vérifiez name, les bonus bonusPv, bonusDegats, bonusAttaque et bonusEsquive (entiers de -5 à 5, somme égale à 0), ainsi que equippedHeroIds (facultatif, liste d’identifiants de héros).`;
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
