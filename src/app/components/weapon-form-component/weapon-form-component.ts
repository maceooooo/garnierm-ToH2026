import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { FormField, form, max, min, required, schema } from '@angular/forms/signals';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { catchError, finalize, of, switchMap, tap } from 'rxjs';
import { StatIconComponent } from '../stat-icon-component/stat-icon-component';
import { MessageService } from '../../services/message-service';
import { WeaponService } from '../../services/weapon-service';

@Component({
  imports: [FormField, RouterLink, StatIconComponent],
  selector: 'app-weapon-form-component',
  styleUrl: '../shared/entity-form.css',
  templateUrl: './weapon-form-component.html',
})
export class WeaponFormComponent {
  private route = inject(ActivatedRoute);
  private destroyRef = inject(DestroyRef);
  private weaponService = inject(WeaponService);
  private messageService = inject(MessageService);
  private router = inject(Router);

  weaponId = signal<string | null>(null);
  isEditing = computed(() => this.weaponId() !== null);
  isLoading = signal(false);
  isSaving = signal(false);
  weaponModel = signal({ name: '', bonusPv: 0, bonusDegats: 0, bonusVitesse: 0 });
  weaponForm = form(
    this.weaponModel,
    schema((path) => {
      required(path.name, { message: 'Le nom de l’arme est obligatoire.' });
      min(path.bonusPv, -50, { message: 'Le bonus doit être compris entre -50 et 50.' });
      max(path.bonusPv, 50, { message: 'Le bonus doit être compris entre -50 et 50.' });
      min(path.bonusDegats, -50, { message: 'Le bonus doit être compris entre -50 et 50.' });
      max(path.bonusDegats, 50, { message: 'Le bonus doit être compris entre -50 et 50.' });
      min(path.bonusVitesse, -50, { message: 'Le bonus doit être compris entre -50 et 50.' });
      max(path.bonusVitesse, 50, { message: 'Le bonus doit être compris entre -50 et 50.' });
    }),
  );

  ngOnInit(): void {
    this.route.paramMap
      .pipe(
        switchMap((params) => {
          const id = params.get('id');
          this.weaponId.set(id);
          this.isLoading.set(id !== null);
          this.weaponModel.set({ name: '', bonusPv: 0, bonusDegats: 0, bonusVitesse: 0 });

          return id
            ? this.weaponService.getWeapon(id).pipe(
                tap(() => this.isLoading.set(false)),
                catchError(() => {
                  this.messageService.add('Impossible de charger cette arme.');
                  return of(undefined);
                }),
                finalize(() => this.isLoading.set(false)),
              )
            : of(undefined);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((weapon) => {
        if (this.weaponId() && !weapon) {
          return;
        }
        if (weapon) {
          this.weaponModel.set({
            name: weapon.name,
            bonusPv: weapon.bonusPv,
            bonusDegats: weapon.bonusDegats,
            bonusVitesse: weapon.bonusVitesse,
          });
        }
      });
  }

  async saveWeapon(): Promise<void> {
    const { name: rawName, bonusPv, bonusDegats, bonusVitesse } = this.weaponModel();
    const name = rawName.trim();
    if (!name || this.isSaving()) {
      if (!name) {
        this.messageService.add('Saisissez un nom pour l’arme.');
      }
      return;
    }

    if (
      ![bonusPv, bonusDegats, bonusVitesse].every(
        (bonus) => Number.isInteger(bonus) && bonus >= -50 && bonus <= 50,
      )
    ) {
      this.messageService.add('Chaque bonus doit être un nombre entier compris entre -50 et 50.');
      return;
    }

    this.isSaving.set(true);
    try {
      const weapon = { name, bonusPv, bonusDegats, bonusVitesse };
      const id = this.weaponId();
      if (id) {
        await this.weaponService.updateWeapon({ id, ...weapon });
      } else {
        await this.weaponService.createWeapon(weapon);
      }
    } catch {
      this.messageService.add(
        `Impossible de ${this.isEditing() ? 'modifier' : 'créer'} l’arme. Vérifiez la connexion et les règles Firestore.`,
      );
      this.isSaving.set(false);
      return;
    }

    this.messageService.add(`L’arme a été ${this.isEditing() ? 'modifiée' : 'créée'} avec succès.`);
    await this.router.navigateByUrl('/weapons');
  }
}
