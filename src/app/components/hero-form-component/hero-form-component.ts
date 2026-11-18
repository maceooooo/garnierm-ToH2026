import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { FormField, form, required, schema } from '@angular/forms/signals';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, finalize, of, switchMap, tap } from 'rxjs';
import { HeroService } from '../../services/hero-service';
import { MessageService } from '../../services/message-service';

@Component({
  imports: [FormField, RouterLink],
  selector: 'app-hero-form-component',
  styleUrl: './hero-form-component.css',
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
  isLoading = signal(false);
  isSaving = signal(false);
  heroModel = signal({ name: '', favori: false });
  heroForm = form(
    this.heroModel,
    schema((path) => required(path.name, { message: 'Le nom du héros est obligatoire.' })),
  );

  ngOnInit(): void {
    // L'absence d'ID indique la création; un ID déclenche la lecture temps réel avant d'afficher le formulaire.
    this.route.paramMap
      .pipe(
        switchMap((params) => {
          const id = params.get('id');
          this.heroId.set(id);
          this.isLoading.set(id !== null);
          this.heroModel.set({ name: '', favori: false });

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
          this.heroModel.set({ name: hero.name, favori: hero.favori });
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

    this.isSaving.set(true);
    try {
      const hero = { name, favori: this.heroModel().favori };
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

    this.messageService.add(
      `Le héros a été ${this.isEditing() ? 'modifié' : 'créé'} avec succès.`,
    );
    await this.router.navigateByUrl('/heroes');
  }
}
