import { Component, DestroyRef, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { HeroInterface } from '../../data/heroInterface';
import { HeroService } from '../../services/hero-service';
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

  hero = signal<HeroInterface | null>(null);

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const id = Number(params.get('id'));
      this.hero.set(Number.isSafeInteger(id) ? this.heroService.getHero(id) ?? null : null);
    });
  }

  onHeroChange(updatedHero: HeroInterface): void {
    this.heroService.updateHero(updatedHero);
    this.hero.set(updatedHero);
  }
}
