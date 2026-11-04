import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { of, switchMap } from 'rxjs';
import { HeroInterface } from '../../data/heroInterface';
import { HeroService } from '../../services/hero-service';
import { MessageService } from '../../services/message-service';
import { HeroEditComponent } from '../hero-edit-component/hero-edit-component';

@Component({
  imports: [HeroEditComponent, RouterLink],
  selector: 'app-hero-detail-component',
  styleUrl: './hero-detail-component.css',
  templateUrl: './hero-detail-component.html',
})
export class HeroDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private destroyRef = inject(DestroyRef);
  private heroService = inject(HeroService);
  private messageService = inject(MessageService);

  hero = signal<HeroInterface | null>(null);

  ngOnInit(): void {
    // Si l'identifiant change, switchMap remplace l'écoute précédente; la destruction du composant termine l'écoute courante.
    this.route.paramMap
      .pipe(
        switchMap((params) => {
          const id = params.get('id');
          return id ? this.heroService.getHero(id) : of(undefined);
        }),
        takeUntilDestroyed(this.destroyRef),
      )
      .subscribe({
        next: (hero) => this.hero.set(hero ?? null),
        error: () =>
          this.messageService.add('Impossible de charger les détails du héros.'),
      });
  }

  async onHeroChange(updatedHero: HeroInterface): Promise<void> {
    // L'affichage local n'est confirmé qu'après l'écriture; l'écoute Firestore reste la source des mises à jour ultérieures.
    try {
      await this.heroService.updateHero(updatedHero);
      this.hero.set(updatedHero);
      this.messageService.add('Les modifications du héros ont été enregistrées.');
    } catch {
      this.messageService.add('Impossible d’enregistrer les modifications du héros.');
    }
  }
}
