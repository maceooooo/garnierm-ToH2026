import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { of, switchMap } from 'rxjs';
import { HeroInterface } from '../../data/heroInterface';
import { DeleteConfirmationComponent } from '../delete-confirmation-component/delete-confirmation-component';
import { StatIconComponent } from '../stat-icon-component/stat-icon-component';
import { HeroService } from '../../services/hero-service';
import { MessageService } from '../../services/message-service';

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
  private messageService = inject(MessageService);
  private router = inject(Router);

  isDeleting = signal(false);
  isDeleteConfirmationOpen = signal(false);
  isLoading = signal(true);

  hero = signal<HeroInterface | null>(null);

  ngOnInit(): void {
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
