import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { FormField, form, max, min, required, schema } from '@angular/forms/signals';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, finalize, of, switchMap, tap } from 'rxjs';
import { HeroService } from '../../services/hero-service';
import { MessageService } from '../../services/message-service';
import { StatIconComponent } from '../stat-icon-component/stat-icon-component';

@Component({
  imports: [FormField, RouterLink, StatIconComponent],
  selector: 'app-hero-form-component',
  styleUrl: '../shared/entity-form.css',
  templateUrl: './hero-form-component.html',
})
export class HeroFormComponent {
  private route = inject(ActivatedRoute);
  private destroyRef = inject(DestroyRef);
  private heroService = inject(HeroService);
  private messageService = inject(MessageService);
  private router = inject(Router);

  heroId = signal<string | null>(null);
  isEditing = computed(() => this.heroId() !== null);
  returnTo = signal<'dashboard' | 'detail' | null>(null);
  cancelRoute = computed(() => {
    if (this.returnTo() === 'dashboard') {
      return ['/dashboard'];
    }

    const heroId = this.heroId();
    return this.returnTo() === 'detail' && heroId ? ['/detail', heroId] : ['/heroes'];
  });
  isLoading = signal(false);
  isSaving = signal(false);
  heroModel = signal({ name: '', favori: false, pv: 10, degats: 10, attaque: 10, esquive: 10 });
  allocatedPoints = computed(() => {
    const { pv, degats, attaque, esquive } = this.heroModel();
    return pv + degats + attaque + esquive;
  });
  hasValidAllocation = computed(() => {
    const { pv, degats, attaque, esquive } = this.heroModel();
    return (
      [pv, degats, attaque, esquive].every((stat) => Number.isInteger(stat) && stat >= 1) &&
      this.allocatedPoints() <= 40
    );
  });
  heroForm = form(
    this.heroModel,
    schema((path) => {
      required(path.name, { message: 'Le nom du héros est obligatoire.' });
      min(path.pv, 1, { message: 'Chaque caractéristique doit être au moins égale à 1.' });
      min(path.degats, 1, { message: 'Chaque caractéristique doit être au moins égale à 1.' });
      min(path.attaque, 1, { message: 'Chaque caractéristique doit être au moins égale à 1.' });
      min(path.esquive, 1, { message: 'Chaque caractéristique doit être au moins égale à 1.' });
    }),
  );

  ngOnInit(): void {
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const returnTo = params.get('returnTo');
      // Seules les pages d'origine prévues sont acceptées; toute autre valeur revient à la liste.
      this.returnTo.set(returnTo === 'dashboard' || returnTo === 'detail' ? returnTo : null);
    });

    // L'absence d'ID indique la création; un ID déclenche la lecture temps réel avant d'afficher le formulaire.
    this.route.paramMap
      .pipe(
        switchMap((params) => {
          const id = params.get('id');
          this.heroId.set(id);
          this.isLoading.set(id !== null);
          this.heroModel.set({
            name: '',
            favori: false,
            pv: 10,
            degats: 10,
            attaque: 10,
            esquive: 10,
          });

          return id
            ? this.heroService.getHero(id).pipe(
                // L'écoute Firestore reste ouverte; le formulaire peut s'afficher dès le premier instantané.
                tap(() => this.isLoading.set(false)),
                catchError(() => {
                  this.messageService.add('Impossible de charger ce héros.');
                  return of(undefined);
                }),
                finalize(() => this.isLoading.set(false)),
              )
            : of(undefined);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe((hero) => {
        if (this.heroId() && !hero) {
          return;
        }

        if (hero) {
          this.heroModel.set({
            name: hero.name,
            favori: hero.favori,
            pv: hero.pv,
            degats: hero.degats,
            attaque: hero.attaque,
            esquive: hero.esquive,
          });
        }
      });
  }

  async saveHero(): Promise<void> {
    const name = this.heroModel().name.trim();
    if (!name || this.isSaving()) {
      if (!name) {
        this.messageService.add('Saisissez un nom pour le héros.');
      }
      return;
    }

    const { pv, degats, attaque, esquive } = this.heroModel();
    if (!this.hasValidAllocation()) {
      this.messageService.add(
        'Les caractéristiques doivent être au moins à 1 et leur somme ne peut pas dépasser 40.',
      );
      return;
    }

    this.isSaving.set(true);
    try {
      const hero = { name, favori: this.heroModel().favori, pv, degats, attaque, esquive };
      const id = this.heroId();
      if (id) {
        await this.heroService.updateHero({ id, ...hero });
      } else {
        await this.heroService.createHero(hero);
      }
    } catch {
      this.messageService.add(
        `Impossible de ${this.isEditing() ? 'modifier' : 'créer'} le héros. Vérifiez la connexion et les règles Firestore.`,
      );
      this.isSaving.set(false);
      return;
    }

    this.messageService.add(`Le héros a été ${this.isEditing() ? 'modifié' : 'créé'} avec succès.`);
    await this.router.navigate(this.cancelRoute());
  }
}
