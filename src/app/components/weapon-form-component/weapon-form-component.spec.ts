import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import {
  ActivatedRoute,
  convertToParamMap,
  ParamMap,
  provideRouter,
  Router,
  RouterLink,
} from '@angular/router';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { vi } from 'vitest';
import { WeaponService } from '../../services/weapon-service';
import { MessageService } from '../../services/message-service';
import { WeaponFormComponent } from './weapon-form-component';

describe('WeaponFormComponent', () => {
  let component: WeaponFormComponent;
  let fixture: ComponentFixture<WeaponFormComponent>;
  let createWeapon: ReturnType<typeof vi.fn>;
  let updateWeapon: ReturnType<typeof vi.fn>;
  let getWeapon: ReturnType<typeof vi.fn>;
  let addMessage: ReturnType<typeof vi.fn>;
  let navigateByUrl: ReturnType<typeof vi.spyOn>;
  let routeParams: BehaviorSubject<ParamMap>;

  beforeEach(async () => {
    createWeapon = vi.fn().mockResolvedValue('weapon-new1');
    updateWeapon = vi.fn().mockResolvedValue(undefined);
    getWeapon = vi.fn(() =>
      of({
        id: 'weapon-a1',
        name: 'Épée',
        bonusPv: 0,
        bonusDegats: -2,
        bonusAttaque: 1,
        bonusEsquive: 1,
      }),
    );
    addMessage = vi.fn();
    routeParams = new BehaviorSubject(convertToParamMap({}));

    await TestBed.configureTestingModule({
      imports: [WeaponFormComponent],
      providers: [
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { paramMap: routeParams.asObservable() } },
        { provide: WeaponService, useValue: { createWeapon, updateWeapon, getWeapon } },
        { provide: MessageService, useValue: { add: addMessage } },
      ],
    }).compileComponents();

    navigateByUrl = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    fixture = TestBed.createComponent(WeaponFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should default all bonuses to zero and create the weapon', async () => {
    expect(component.weaponModel()).toEqual({
      name: '',
      bonusPv: 0,
      bonusDegats: 0,
      bonusAttaque: 0,
      bonusEsquive: 0,
    });
    expect(component.remainingPoints()).toBe(0);

    component.weaponModel.set({
      name: '  Épée  ',
      bonusPv: 0,
      bonusDegats: -2,
      bonusAttaque: 1,
      bonusEsquive: 1,
    });
    await component.saveWeapon();

    expect(createWeapon).toHaveBeenCalledWith({
      name: 'Épée',
      bonusPv: 0,
      bonusDegats: -2,
      bonusAttaque: 1,
      bonusEsquive: 1,
    });
    expect(navigateByUrl).toHaveBeenCalledWith('/weapons');
    expect(addMessage).toHaveBeenCalledWith('L’arme a été créée avec succès.');
  });

  it('should show the remaining balance and enable saving only when the bonuses sum to zero', () => {
    component.weaponModel.update((weapon) => ({ ...weapon, bonusPv: 2 }));
    fixture.detectChanges();

    expect(component.remainingPoints()).toBe(-2);
    expect(fixture.nativeElement.textContent.replace(/\s+/g, ' ')).toContain(
      'Solde à répartir pour atteindre 0 : -2',
    );
    expect(fixture.nativeElement.textContent).toContain('retirez 2 point(s)');
    const saveButton = fixture.nativeElement.querySelector(
      'button[type="submit"]',
    ) as HTMLButtonElement;
    expect(saveButton.disabled).toBe(true);

    component.weaponModel.update((weapon) => ({ ...weapon, bonusDegats: -2 }));
    fixture.detectChanges();

    expect(component.remainingPoints()).toBe(0);
    expect(saveButton.disabled).toBe(false);
  });

  it('should load an existing weapon and update it with the same form', async () => {
    routeParams.next(convertToParamMap({ id: 'weapon-a1' }));
    await fixture.whenStable();
    component.weaponModel.set({
      name: 'Hache',
      bonusPv: -5,
      bonusDegats: 3,
      bonusAttaque: 1,
      bonusEsquive: 1,
    });
    await component.saveWeapon();

    expect(getWeapon).toHaveBeenCalledWith('weapon-a1');
    expect(updateWeapon).toHaveBeenCalledWith({
      id: 'weapon-a1',
      name: 'Hache',
      bonusPv: -5,
      bonusDegats: 3,
      bonusAttaque: 1,
      bonusEsquive: 1,
    });
    expect(createWeapon).not.toHaveBeenCalled();
  });

  it('should expose validation boundaries and use one editable form for create and update', () => {
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.entity-form-shell')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.entity-form')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('.entity-form-stats')).not.toBeNull();
    expect(fixture.nativeElement.querySelectorAll('input[type="number"]')).toHaveLength(4);
    expect(fixture.nativeElement.querySelectorAll('app-stat-icon')).toHaveLength(4);
    const cancelLink = fixture.debugElement
      .query(By.css('.navigation-button'))
      .injector.get(RouterLink);
    expect(cancelLink.urlTree?.toString()).toBe('/weapons');

    component.weaponModel.update((weapon) => ({ ...weapon, bonusPv: -6 }));
    fixture.detectChanges();
    expect(component.weaponForm.bonusPv().errors()[0]?.message).toContain('-5 et 5');
  });

  it('should reject bonuses outside the allowed range without calling the service', async () => {
    component.weaponModel.set({
      name: 'Arme invalide',
      bonusPv: 0,
      bonusDegats: 6,
      bonusAttaque: 0,
      bonusEsquive: 0,
    });
    await component.saveWeapon();

    expect(createWeapon).not.toHaveBeenCalled();
    expect(addMessage).toHaveBeenCalledWith(
      'Chaque bonus doit être un entier entre -5 et 5 et la somme des 4 bonus doit être égale à 0.',
    );
  });

  it('should reject an unbalanced allocation even when all bonuses are in range', async () => {
    component.weaponModel.set({
      name: 'Arme déséquilibrée',
      bonusPv: 1,
      bonusDegats: 0,
      bonusAttaque: 0,
      bonusEsquive: 0,
    });

    await component.saveWeapon();

    expect(createWeapon).not.toHaveBeenCalled();
    expect(addMessage).toHaveBeenCalledWith(
      'Chaque bonus doit être un entier entre -5 et 5 et la somme des 4 bonus doit être égale à 0.',
    );
  });

  it('should stop showing the loading state after the first snapshot', () => {
    getWeapon.mockReturnValueOnce(
      new Observable((subscriber) => {
        subscriber.next({
          id: 'weapon-a1',
          name: 'Épée',
          bonusPv: 0,
          bonusDegats: -2,
          bonusAttaque: 1,
          bonusEsquive: 1,
        });
      }),
    );
    routeParams.next(convertToParamMap({ id: 'weapon-a1' }));
    fixture.detectChanges();

    expect(component.isLoading()).toBe(false);
    expect(fixture.nativeElement.textContent).toContain('Modifier l’arme');
  });
});
