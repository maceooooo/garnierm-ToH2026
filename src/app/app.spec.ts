import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { App } from './app';
import { routes } from './app.routes';
import { DashboardComponent } from './components/dashboard-component/dashboard-component';
import { HeroDetailComponent } from './components/hero-detail-component/hero-detail-component';
import { HomeComponent } from './components/home-component/home-component';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App],
      providers: [provideRouter(routes)],
    })
      .compileComponents();
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
    const detail = await harness.navigateByUrl('/detail/7', HeroDetailComponent);

    expect(detail.hero()?.id).toBe(7);
  });
});
