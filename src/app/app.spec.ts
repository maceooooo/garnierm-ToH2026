import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { of } from 'rxjs';
import { App } from './app';
import { routes } from './app.routes';
import { DashboardComponent } from './components/dashboard-component/dashboard-component';
import { HeroDetailComponent } from './components/hero-detail-component/hero-detail-component';
import { HomeComponent } from './components/home-component/home-component';
import { HeroService } from './services/hero-service';
import { WeaponService } from './services/weapon-service';
import { WeaponsComponent } from './components/weapons-component/weapons-component';
import { WeaponDetailComponent } from './components/weapon-detail-component/weapon-detail-component';
import { WeaponFormComponent } from './components/weapon-form-component/weapon-form-component';

// Ces tests couvrent le montage de l'application et la résolution de ses routes essentielles.
describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter(routes),
        {
          provide: HeroService,
          useValue: {
            getHeroes: () => of([]),
            getHero: (id: string) =>
              of({ id, name: 'Hero V', favori: true, pv: 80, degats: 25, vitesse: 60 }),
          },
        },
        {
          provide: WeaponService,
          useValue: {
            getWeapons: () => of([]),
            getWeapon: (id: string) =>
              of({ id, name: 'Épée', bonusPv: 0, bonusDegats: 25, bonusVitesse: -10 }),
            createWeapon: () => Promise.resolve('weapon-a1'),
            updateWeapon: () => Promise.resolve(),
            deleteWeapon: () => Promise.resolve(),
          },
        },
      ],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render title', async () => {
    const fixture = TestBed.createComponent(App);
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('Macéo Garnier ToH2026');
  });

  it('should open the home page at the root and resolve a hero detail URL', async () => {
    const harness = await RouterTestingHarness.create();

    const home = await harness.navigateByUrl('/', HomeComponent);
    expect(home).toBeTruthy();

    await harness.navigateByUrl('/dashboard', DashboardComponent);
    // L'identifiant de l'URL est transmis à la fiche du héros correspondante.
    const detail = await harness.navigateByUrl('/detail/hero-a1', HeroDetailComponent);

    expect(detail.hero()?.id).toBe('hero-a1');
  });

  it('should resolve the weapon list, create, detail and edit routes', async () => {
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/weapons', WeaponsComponent);
    await harness.navigateByUrl('/weapons/new', WeaponFormComponent);
    const detail = await harness.navigateByUrl('/weapons/weapon-a1', WeaponDetailComponent);
    expect(detail.weapon()?.id).toBe('weapon-a1');
    await harness.navigateByUrl('/weapons/weapon-a1/edit', WeaponFormComponent);
  });
});
