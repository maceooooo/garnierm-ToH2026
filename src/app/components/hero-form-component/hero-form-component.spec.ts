import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  ActivatedRoute,
  convertToParamMap,
  ParamMap,
  provideRouter,
  Router,
  RouterLink,
} from '@angular/router';
import { By } from '@angular/platform-browser';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { vi } from 'vitest';
import { HeroService } from '../../services/hero-service';
import { MessageService } from '../../services/message-service';
import { HeroFormComponent } from './hero-form-component';

describe('HeroFormComponent', () => {
  let component: HeroFormComponent;
  let fixture: ComponentFixture<HeroFormComponent>;
  let createHero: ReturnType<typeof vi.fn>;
  let updateHero: ReturnType<typeof vi.fn>;
  let getHero: ReturnType<typeof vi.fn>;
  let addMessage: ReturnType<typeof vi.fn>;
  let navigate: ReturnType<typeof vi.spyOn>;
  let routeParams: BehaviorSubject<ParamMap>;
  let routeQueryParams: BehaviorSubject<ParamMap>;

  beforeEach(async () => {
    createHero = vi.fn().mockResolvedValue('hero-new1');
    updateHero = vi.fn().mockResolvedValue(undefined);
    getHero = vi.fn(() =>
      of({ id: 'hero-a1', name: 'Hero A', favori: true, pv: 80, degats: 25, vitesse: 60 }),
    );
    addMessage = vi.fn();
    routeParams = new BehaviorSubject(convertToParamMap({}));
    routeQueryParams = new BehaviorSubject(convertToParamMap({}));

    await TestBed.configureTestingModule({
      imports: [HeroFormComponent],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: routeParams.asObservable(),
            queryParamMap: routeQueryParams.asObservable(),
          },
        },
        { provide: HeroService, useValue: { createHero, updateHero, getHero } },
        { provide: MessageService, useValue: { add: addMessage } },
      ],
    }).compileComponents();

    navigate = vi.spyOn(TestBed.inject(Router), 'navigate').mockResolvedValue(true);
    fixture = TestBed.createComponent(HeroFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create a hero with a normalized name and favorite state', async () => {
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.entity-form-shell')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.entity-form')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.entity-form-stats')).not.toBeNull();
    const cancelButton = fixture.nativeElement.querySelector(
      '.navigation-button',
    ) as HTMLButtonElement;
    expect(cancelButton.tagName).toBe('BUTTON');
    expect(cancelButton.textContent).toContain('Annuler');
    const cancelRoute = fixture.debugElement
      .query(By.css('.navigation-button'))
      .injector.get(RouterLink);
    expect(cancelRoute.urlTree?.toString()).toBe('/heroes');
    component.heroModel.set({
      name: '  Nouveau héros  ',
      favori: true,
      pv: 100,
      degats: 1,
      vitesse: 50,
    });

    await component.saveHero();

    expect(createHero).toHaveBeenCalledWith({
      name: 'Nouveau héros',
      favori: true,
      pv: 100,
      degats: 1,
      vitesse: 50,
    });
    expect(addMessage).toHaveBeenCalledWith('Le héros a été créé avec succès.');
    expect(navigate).toHaveBeenCalledWith(['/heroes']);
  });

  it('should return to the dashboard when editing was opened there', () => {
    routeQueryParams.next(convertToParamMap({ returnTo: 'dashboard' }));
    fixture.detectChanges();

    const cancelRoute = fixture.debugElement
      .query(By.css('.navigation-button'))
      .injector.get(RouterLink);
    expect(cancelRoute.urlTree?.toString()).toBe('/dashboard');
  });

  it('should return to the dashboard after saving an edit opened there', async () => {
    routeParams.next(convertToParamMap({ id: 'hero-a1' }));
    routeQueryParams.next(convertToParamMap({ returnTo: 'dashboard' }));
    await fixture.whenStable();

    await component.saveHero();

    expect(updateHero).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith(['/dashboard']);
  });

  it('should return to the hero details when editing was opened there', () => {
    routeParams.next(convertToParamMap({ id: 'hero-a1' }));
    routeQueryParams.next(convertToParamMap({ returnTo: 'detail' }));
    fixture.detectChanges();

    const cancelRoute = fixture.debugElement
      .query(By.css('.navigation-button'))
      .injector.get(RouterLink);
    expect(cancelRoute.urlTree?.toString()).toBe('/detail/hero-a1');
  });

  it('should return to the hero details after saving an edit opened there', async () => {
    routeParams.next(convertToParamMap({ id: 'hero-a1' }));
    routeQueryParams.next(convertToParamMap({ returnTo: 'detail' }));
    await fixture.whenStable();

    await component.saveHero();

    expect(updateHero).toHaveBeenCalled();
    expect(navigate).toHaveBeenCalledWith(['/detail', 'hero-a1']);
  });

  it('should use the hero list for an unrecognized return destination', () => {
    routeQueryParams.next(convertToParamMap({ returnTo: '/external' }));
    fixture.detectChanges();

    const cancelRoute = fixture.debugElement
      .query(By.css('.navigation-button'))
      .injector.get(RouterLink);
    expect(cancelRoute.urlTree?.toString()).toBe('/heroes');
  });

  it('should reject a blank name without writing to Firestore', async () => {
    component.heroModel.set({
      name: '   ',
      favori: false,
      pv: 50,
      degats: 50,
      vitesse: 50,
    });

    await component.saveHero();

    expect(createHero).not.toHaveBeenCalled();
    expect(addMessage).toHaveBeenCalledWith('Saisissez un nom pour le héros.');
  });

  it('should report write errors without navigating', async () => {
    createHero.mockRejectedValueOnce(new Error('permission-denied'));
    component.heroModel.set({
      name: 'Nouveau héros',
      favori: false,
      pv: 50,
      degats: 50,
      vitesse: 50,
    });

    await component.saveHero();

    expect(addMessage).toHaveBeenCalledWith(
      'Impossible de créer le héros. Vérifiez la connexion et les règles Firestore.',
    );
    expect(navigate).not.toHaveBeenCalled();
  });

  it('should load an existing hero and update it through the same form', async () => {
    routeParams.next(convertToParamMap({ id: 'hero-a1' }));
    await fixture.whenStable();
    component.heroModel.set({
      name: 'Hero A modifié',
      favori: false,
      pv: 90,
      degats: 35,
      vitesse: 40,
    });

    await component.saveHero();

    expect(getHero).toHaveBeenCalledWith('hero-a1');
    expect(updateHero).toHaveBeenCalledWith({
      id: 'hero-a1',
      name: 'Hero A modifié',
      favori: false,
      pv: 90,
      degats: 35,
      vitesse: 40,
    });
    expect(createHero).not.toHaveBeenCalled();
    expect(addMessage).toHaveBeenCalledWith('Le héros a été modifié avec succès.');
  });

  it('should stop showing the loading state after the first Firestore snapshot', async () => {
    getHero.mockReturnValueOnce(
      new Observable((subscriber) => {
        subscriber.next({
          id: 'hero-a1',
          name: 'Hero A',
          favori: true,
          pv: 80,
          degats: 25,
          vitesse: 60,
        });
      }),
    );
    routeParams.next(convertToParamMap({ id: 'hero-a1' }));
    fixture.detectChanges();

    expect(component.isLoading()).toBe(false);
    expect(fixture.nativeElement.textContent).toContain('Modifier le héros');
  });

  it('should not save skills outside the allowed range', async () => {
    component.heroModel.set({
      name: 'Héros invalide',
      favori: false,
      pv: 50,
      degats: 50,
      vitesse: 101,
    });

    await component.saveHero();

    expect(createHero).not.toHaveBeenCalled();
    expect(addMessage).toHaveBeenCalledWith(
      'Chaque compétence doit être un nombre entier entre 1 et 100.',
    );
  });
});
