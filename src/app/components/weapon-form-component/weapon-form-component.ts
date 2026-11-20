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
  weaponModel = signal({
    name: '',
    bonusPv: 0,
    bonusDegats: 0,
    bonusAttaque: 0,
    bonusEsquive: 0,
  });
  remainingPoints = computed(() => {
    const { bonusPv, bonusDegats, bonusAttaque, bonusEsquive } = this.weaponModel();
    const balance = bonusPv + bonusDegats + bonusAttaque + bonusEsquive;
    return balance === 0 ? 0 : -balance;
  });
  hasValidBonuses = computed(() => {
    const { bonusPv, bonusDegats, bonusAttaque, bonusEsquive } = this.weaponModel();
    const bonuses = [bonusPv, bonusDegats, bonusAttaque, bonusEsquive];
    return (
      bonuses.every((bonus) => Number.isInteger(bonus) && bonus >= -5 && bonus <= 5) &&
      bonuses.reduce((total, bonus) => total + bonus, 0) === 0
    );
  });
  weaponForm = form(
    this.weaponModel,
    schema((path) => {
      required(path.name, { message: 'Le nom de l’arme est obligatoire.' });
      min(path.bonusPv, -5, { message: 'Chaque bonus doit être compris entre -5 et 5.' });
      max(path.bonusPv, 5, { message: 'Chaque bonus doit être compris entre -5 et 5.' });
      min(path.bonusDegats, -5, { message: 'Chaque bonus doit être compris entre -5 et 5.' });
      max(path.bonusDegats, 5, { message: 'Chaque bonus doit être compris entre -5 et 5.' });
      min(path.bonusAttaque, -5, { message: 'Chaque bonus doit être compris entre -5 et 5.' });
      max(path.bonusAttaque, 5, { message: 'Chaque bonus doit être compris entre -5 et 5.' });
      min(path.bonusEsquive, -5, { message: 'Chaque bonus doit être compris entre -5 et 5.' });
      max(path.bonusEsquive, 5, { message: 'Chaque bonus doit être compris entre -5 et 5.' });
    }),
  );

  ngOnInit(): void {
    this.route.paramMap
      .pipe(
        switchMap((params) => {
          const id = params.get('id');
          this.weaponId.set(id);
          this.isLoading.set(id !== null);
          this.weaponModel.set({
            name: '',
            bonusPv: 0,
            bonusDegats: 0,
            bonusAttaque: 0,
            bonusEsquive: 0,
          });

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
            bonusAttaque: weapon.bonusAttaque,
            bonusEsquive: weapon.bonusEsquive,
          });
        }
      });
  }

  async saveWeapon(): Promise<void> {
    const { name: rawName, bonusPv, bonusDegats, bonusAttaque, bonusEsquive } = this.weaponModel();
    const name = rawName.trim();
    if (!name || this.isSaving()) {
      if (!name) {
        this.messageService.add('Saisissez un nom pour l’arme.');
      }
      return;
    }

    if (!this.hasValidBonuses()) {
      this.messageService.add(
        'Chaque bonus doit être un entier entre -5 et 5 et la somme des 4 bonus doit être égale à 0.',
      );
      return;
    }

    this.isSaving.set(true);
    try {
      const weapon = { name, bonusPv, bonusDegats, bonusAttaque, bonusEsquive };
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
