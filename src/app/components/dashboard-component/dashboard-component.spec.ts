import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { HeroInterface } from '../../data/heroInterface';
import { HeroService } from '../../services/hero-service';
import { DashboardComponent } from './dashboard-component';

// Le test vérifie que le tableau de bord peut être créé avec son fournisseur de navigation.
describe('DashboardComponent', () => {
  let component: DashboardComponent;
  let fixture: ComponentFixture<DashboardComponent>;
  const hero: HeroInterface = { id: 'hero-b2', name: 'Hero B', actif: true };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [
        provideRouter([]),
        { provide: HeroService, useValue: { getHeroes: () => of([hero]) } },
      ],
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
    expect(heroLink.textContent).toContain('Hero B');
    expect(heroLink.textContent).not.toContain('hero-b2');
    expect(heroLink.getAttribute('href')).toBe('/detail/hero-b2');
  });
});
