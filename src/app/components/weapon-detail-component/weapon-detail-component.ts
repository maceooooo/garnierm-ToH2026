import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { of, switchMap } from 'rxjs';
import { WeaponInterface } from '../../data/weapon-interface';
import { DeleteConfirmationComponent } from '../delete-confirmation-component/delete-confirmation-component';
import { StatIconComponent } from '../stat-icon-component/stat-icon-component';
import { MessageService } from '../../services/message-service';
import { WeaponService } from '../../services/weapon-service';
import { WeaponAssociationDialogComponent } from '../weapon-association-dialog/weapon-association-dialog';

@Component({
  imports: [
    RouterLink,
    StatIconComponent,
    DeleteConfirmationComponent,
    WeaponAssociationDialogComponent,
  ],
  selector: 'app-weapon-detail-component',
  styleUrl: '../shared/entity-detail.css',
  templateUrl: './weapon-detail-component.html',
})
export class WeaponDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private destroyRef = inject(DestroyRef);
  private weaponService = inject(WeaponService);
  private messageService = inject(MessageService);
  private router = inject(Router);

  weapon = signal<WeaponInterface | null>(null);
  isLoading = signal(true);
  isDeleting = signal(false);
  isDeleteConfirmationOpen = signal(false);
  isAssociationOpen = signal(false);

  ngOnInit(): void {
    this.route.paramMap
      .pipe(
        switchMap((params) => {
          const id = params.get('id');
          this.isLoading.set(true);
          return id ? this.weaponService.getWeapon(id) : of(undefined);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (weapon) => {
          this.weapon.set(weapon ?? null);
          this.isLoading.set(false);
        },
        error: () => {
          this.isLoading.set(false);
          this.messageService.add('Impossible de charger les détails de l’arme.');
        },
      });
  }

  openDeleteConfirmation(): void {
    if (!this.isDeleting()) {
      this.isDeleteConfirmationOpen.set(true);
    }
  }

  closeDeleteConfirmation(): void {
    if (!this.isDeleting()) {
      this.isDeleteConfirmationOpen.set(false);
    }
  }

  openAssociation(): void {
    this.isAssociationOpen.set(true);
  }

  closeAssociation(): void {
    this.isAssociationOpen.set(false);
  }

  async deleteWeapon(weapon: WeaponInterface): Promise<void> {
    if (this.isDeleting()) {
      return;
    }

    this.isDeleting.set(true);
    try {
      await this.weaponService.deleteWeapon(weapon.id);
    } catch {
      this.isDeleting.set(false);
      this.messageService.add(
        'Impossible de supprimer l’arme. Vérifiez la connexion et les règles Firestore.',
      );
      return;
    }

    this.messageService.add('L’arme a été supprimée.');
    this.isDeleteConfirmationOpen.set(false);
    await this.router.navigateByUrl('/weapons');
  }
}
