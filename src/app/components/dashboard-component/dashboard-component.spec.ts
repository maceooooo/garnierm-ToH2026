import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { HeroInterface } from '../../data/heroInterface';
import { HeroService } from '../../services/hero-service';
import { DashboardComponent } from './dashboard-component';

// Le test vérifie que le tableau de bord peut être créé avec son fournisseur de navigation.
describe('DashboardComponent', () => {
  let component: DashboardComponent;
  let fixture: ComponentFixture<DashboardComponent>;
  const hero: HeroInterface = {
    id: 'hero-b2',
    name: 'Hero B',
    favori: true,
    pv: 80,
    degats: 25,
    vitesse: 60,
  };
  const getHeroes = vi.fn(() => of([hero]));

  beforeEach(async () => {
    getHeroes.mockClear();
    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [provideRouter([]), { provide: HeroService, useValue: { getHeroes } }],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardComponent);
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
    expect(heroLink.closest('ul')?.classList.contains('entity-list')).toBe(true);
    expect(heroLink.classList.contains('entity-view-link')).toBe(true);
    expect(editLink.classList.contains('entity-edit-link')).toBe(true);
    expect(heroLink.textContent).toContain('Hero B');
    expect(heroLink.textContent).not.toContain('hero-b2');
    expect(heroLink.getAttribute('href')).toBe('/detail/hero-b2');
    expect(heroLink.querySelector('.hero-favorite')?.textContent).toContain('★');
    expect(editLink.getAttribute('href')).toBe('/heroes/hero-b2/edit');
  });

  it('should request only favorites for the dashboard', () => {
    expect(getHeroes).toHaveBeenLastCalledWith(4, true);
  });
});
