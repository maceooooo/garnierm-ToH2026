import { Component, computed, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { of, switchMap } from 'rxjs';
import { HeroInterface } from '../../data/heroInterface';
import { DeleteConfirmationComponent } from '../delete-confirmation-component/delete-confirmation-component';
import { StatIconComponent } from '../stat-icon-component/stat-icon-component';
import { HeroService } from '../../services/hero-service';
import { MessageService } from '../../services/message-service';
import { WeaponInterface } from '../../data/weapon-interface';
import { WeaponService } from '../../services/weapon-service';

@Component({
  imports: [RouterLink, StatIconComponent, DeleteConfirmationComponent],
  selector: 'app-hero-detail-component',
  styleUrl: '../shared/entity-detail.css',
  templateUrl: './hero-detail-component.html',
})
export class HeroDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private destroyRef = inject(DestroyRef);
  private heroService = inject(HeroService);
  private weaponService = inject(WeaponService);
  private messageService = inject(MessageService);
  private router = inject(Router);

  isDeleting = signal(false);
  isDeleteConfirmationOpen = signal(false);
  isLoading = signal(true);
  weapons = signal<WeaponInterface[]>([]);
  weaponLoadError = signal(false);

  hero = signal<HeroInterface | null>(null);
  // Les bonus sont dérivés des armes en temps réel; les statistiques de base restent inchangées en base.
  heroWithBonuses = computed(() => {
    const hero = this.hero();
    if (!hero) {
      return null;
    }

    const equippedWeapons = this.weapons().filter((weapon) =>
      weapon.equippedHeroIds.includes(hero.id),
    );
    const bonusPv = equippedWeapons.reduce((total, weapon) => total + weapon.bonusPv, 0);
    const bonusDegats = equippedWeapons.reduce((total, weapon) => total + weapon.bonusDegats, 0);
    const bonusVitesse = equippedWeapons.reduce((total, weapon) => total + weapon.bonusVitesse, 0);

    return {
      ...hero,
      equippedWeapons,
      stats: {
        pv: this.getStatDetails(hero.pv, bonusPv),
        degats: this.getStatDetails(hero.degats, bonusDegats),
        vitesse: this.getStatDetails(hero.vitesse, bonusVitesse),
      },
    };
  });

  private getStatDetails(base: number, bonus: number): { total: number; breakdown: string } {
    const operator = bonus < 0 ? '−' : '+';
    return {
      total: base + bonus,
      breakdown: `${base} ${operator} ${Math.abs(bonus)}`,
    };
  }

  ngOnInit(): void {
    this.weaponService
      .getWeapons(false)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (weapons) => {
          this.weapons.set(weapons);
          this.weaponLoadError.set(false);
        },
        error: () => {
          this.weapons.set([]);
          this.weaponLoadError.set(true);
          this.messageService.add('Impossible de charger les bonus des armes équipées.');
        },
      });

    // Si l'identifiant change, switchMap remplace l'écoute précédente; la destruction du composant termine l'écoute courante.
    this.route.paramMap
      .pipe(
        switchMap((params) => {
          const id = params.get('id');
          this.isLoading.set(true);
          return id ? this.heroService.getHero(id) : of(undefined);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (hero) => {
          this.hero.set(hero ?? null);
          this.isLoading.set(false);
        },
        error: () => {
          this.isLoading.set(false);
          this.messageService.add('Impossible de charger les détails du héros.');
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

  async deleteHero(hero: HeroInterface): Promise<void> {
    if (this.isDeleting()) {
      return;
    }

    this.isDeleting.set(true);
    try {
      await this.heroService.deleteHero(hero.id);
    } catch {
      this.isDeleting.set(false);
      this.messageService.add(
        'Impossible de supprimer le héros. Vérifiez la connexion et les règles Firestore.',
      );
      return;
    }

    this.messageService.add('Le héros a été supprimé.');
    this.isDeleteConfirmationOpen.set(false);
    await this.router.navigateByUrl('/heroes');
  }
}
