import { Component, DestroyRef, computed, inject, input, output, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HeroInterface } from '../../data/heroInterface';
import { HeroService } from '../../services/hero-service';
import { MessageService } from '../../services/message-service';
import { WeaponService } from '../../services/weapon-service';

@Component({
  selector: 'app-weapon-association-dialog',
  styleUrl: './weapon-association-dialog.css',
  templateUrl: './weapon-association-dialog.html',
})
export class WeaponAssociationDialogComponent {
  weaponId = input.required<string>();
  equippedHeroIds = input<string[]>([]);
  close = output<void>();

  private destroyRef = inject(DestroyRef);
  private heroService = inject(HeroService);
  private weaponService = inject(WeaponService);
  private messageService = inject(MessageService);

  heroes = signal<HeroInterface[]>([]);
  searchTerm = signal('');
  selectedHeroId = signal<string | null>(null);
  isLoading = signal(true);
  isAssociating = signal(false);
  errorMessage = signal<string | null>(null);

  availableHeroes = computed(() => {
    const equippedHeroIds = new Set(this.equippedHeroIds());
    return this.heroes().filter((hero) => !equippedHeroIds.has(hero.id));
  });

  filteredHeroes = computed(() => {
    const search = this.searchTerm().trim().toLocaleLowerCase('fr');
    return this.availableHeroes().filter((hero) =>
      hero.name.toLocaleLowerCase('fr').includes(search),
    );
  });

  ngOnInit(): void {
    this.heroService
      .getHeroes()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (heroes) => {
          this.heroes.set(heroes);
          this.isLoading.set(false);
          this.errorMessage.set(null);
        },
        error: () => {
          this.heroes.set([]);
          this.isLoading.set(false);
          this.errorMessage.set('Impossible de charger la liste des héros.');
        },
      });
  }

  selectHero(heroId: string): void {
    this.selectedHeroId.set(heroId);
  }

  updateSearchTerm(event: Event): void {
    if (event.target instanceof HTMLInputElement) {
      this.searchTerm.set(event.target.value);
    }
  }

  async confirmAssociation(): Promise<void> {
    const selectedHero = this.availableHeroes().find((hero) => hero.id === this.selectedHeroId());
    if (!selectedHero || this.isAssociating()) {
      return;
    }

    this.isAssociating.set(true);
    this.errorMessage.set(null);
    try {
      await this.weaponService.associateHero(this.weaponId(), selectedHero.id);
    } catch {
      this.isAssociating.set(false);
      this.errorMessage.set('Impossible d’associer l’arme à ce héros. Vérifiez la connexion.');
      this.messageService.add('Impossible d’associer l’arme à ce héros.');
      return;
    }

    this.messageService.add(`L’arme a été associée à ${selectedHero.name}.`);
    this.close.emit();
  }

  async confirmOnDoubleClick(hero: HeroInterface): Promise<void> {
    this.selectHero(hero.id);
    await this.confirmAssociation();
  }
}
