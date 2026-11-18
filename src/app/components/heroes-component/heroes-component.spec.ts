import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { HeroInterface } from '../../data/heroInterface';
import { HeroService } from '../../services/hero-service';
import { HeroesComponent } from './heroes-component';

// Vérifie que la page de liste peut être instanciée avec ses dépendances de routage.
describe('HeroesComponent', () => {
  let component: HeroesComponent;
  let fixture: ComponentFixture<HeroesComponent>;
  const hero: HeroInterface = {
    id: 'hero-a1',
    name: 'Hero A',
    favori: true,
    pv: 80,
    degats: 25,
    vitesse: 60,
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HeroesComponent],
      providers: [
        provideRouter([]),
        { provide: HeroService, useValue: { getHeroes: () => of([hero]) } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HeroesComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should display the hero name instead of its Firebase id', () => {
    fixture.detectChanges();

    const heroLink = fixture.nativeElement.querySelector('.heroes a') as HTMLAnchorElement;
    const editLink = fixture.nativeElement.querySelector('.hero-edit-link') as HTMLAnchorElement;
    const favorite = heroLink.querySelector('.hero-favorite') as HTMLElement;
    expect(heroLink.textContent).toContain('Hero A');
    expect(heroLink.textContent).not.toContain('hero-a1');
    expect(heroLink.getAttribute('href')).toBe('/detail/hero-a1');
    expect(favorite.textContent).toContain('★');
    expect(editLink.getAttribute('href')).toBe('/heroes/hero-a1/edit');
  });
});
