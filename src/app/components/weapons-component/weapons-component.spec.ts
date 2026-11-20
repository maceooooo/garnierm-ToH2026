import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { vi } from 'vitest';
import { WeaponInterface } from '../../data/weapon-interface';
import { HeroService } from '../../services/hero-service';
import { MessageService } from '../../services/message-service';
import { InvalidWeaponDocumentError, WeaponService } from '../../services/weapon-service';
import { WeaponsComponent } from './weapons-component';

describe('WeaponsComponent', () => {
  let fixture: ComponentFixture<WeaponsComponent>;
  let getWeapons: ReturnType<typeof vi.fn>;
  let addMessage: ReturnType<typeof vi.fn>;
  let associateHero: ReturnType<typeof vi.fn>;
  const weapon: WeaponInterface = {
    id: 'weapon-a1',
    name: 'Épée',
    bonusPv: 0,
    bonusDegats: 2,
    bonusAttaque: -1,
    bonusEsquive: -1,
    equippedHeroIds: [],
  };

  beforeEach(async () => {
    getWeapons = vi.fn(() => of([weapon]));
    addMessage = vi.fn();
    associateHero = vi.fn().mockResolvedValue(undefined);
    await TestBed.configureTestingModule({
      imports: [WeaponsComponent],
      providers: [
        provideRouter([]),
        { provide: WeaponService, useValue: { getWeapons, associateHero } },
        {
          provide: HeroService,
          useValue: {
            getHeroes: () =>
              of([
                {
                  id: 'hero-a1',
                  name: 'Archer',
                  favori: true,
                  pv: 10,
                  degats: 10,
                  attaque: 10,
                  esquive: 10,
                },
              ]),
          },
        },
        { provide: MessageService, useValue: { add: addMessage } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(WeaponsComponent);
    await fixture.whenStable();
  });

  it('should link each weapon to its detail and edit routes', () => {
    fixture.detectChanges();

    const list = fixture.nativeElement.querySelector('.entity-list') as HTMLElement;
    const viewLink = fixture.nativeElement.querySelector('.weapon-view-link') as HTMLAnchorElement;
    const editLink = fixture.nativeElement.querySelector('.weapon-edit-link') as HTMLAnchorElement;
    const createLink = fixture.nativeElement.querySelector(
      '.create-weapon-button',
    ) as HTMLAnchorElement;

    expect(viewLink.textContent).toContain('Épée');
    expect(list).not.toBeNull();
    expect(viewLink.classList.contains('entity-view-link')).toBe(true);
    expect(editLink.classList.contains('entity-edit-link')).toBe(true);
    expect(fixture.nativeElement.querySelector('.hero-favorite')).toBeNull();
    expect(viewLink.getAttribute('href')).toBe('/weapons/weapon-a1');
    expect(editLink.getAttribute('href')).toBe('/weapons/weapon-a1/edit');
    expect(editLink.getAttribute('aria-label')).toBe('Modifier Épée');
    expect(createLink.getAttribute('href')).toBe('/weapons/new');
  });

  it('should open the hero selection dialog from the weapon list', () => {
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('.weapon-associate-button') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Associer l’arme à un héros');
    expect(fixture.nativeElement.querySelector('.association-hero')?.textContent).toContain(
      'Archer',
    );
  });

  it('should explain when Firestore denies reading the armes collection', async () => {
    getWeapons.mockReturnValueOnce(throwError(() => ({ code: 'permission-denied' })));
    const errorFixture = TestBed.createComponent(WeaponsComponent);
    await errorFixture.whenStable();
    errorFixture.detectChanges();

    const errorMessage = errorFixture.nativeElement.querySelector(
      '.weapon-load-error',
    ) as HTMLElement;
    expect(errorMessage.textContent).toContain('Lecture de la collection « armes » refusée');
    expect(errorMessage.textContent).toContain('règles de lecture');
    expect(errorFixture.componentInstance.weapons()).toEqual([]);
    expect(addMessage).toHaveBeenCalledWith(errorMessage.textContent);
  });

  it('should identify the expected fields when a weapon document is invalid', async () => {
    getWeapons.mockReturnValueOnce(throwError(() => new InvalidWeaponDocumentError('weapon-bad1')));
    const errorFixture = TestBed.createComponent(WeaponsComponent);
    await errorFixture.whenStable();
    errorFixture.detectChanges();

    const errorMessage = errorFixture.nativeElement.querySelector(
      '.weapon-load-error',
    ) as HTMLElement;
    expect(errorMessage.textContent).toContain('weapon-bad1');
    expect(errorMessage.textContent).toContain(
      'bonusPv, bonusDegats, bonusAttaque et bonusEsquive (entiers de -5 à 5, somme égale à 0)',
    );
    expect(errorFixture.componentInstance.weapons()).toEqual([]);
  });
});
