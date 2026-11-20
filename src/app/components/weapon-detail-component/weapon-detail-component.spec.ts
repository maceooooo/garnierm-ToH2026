import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
  ActivatedRoute,
  convertToParamMap,
  provideRouter,
  Router,
  RouterLink,
} from '@angular/router';
import { By } from '@angular/platform-browser';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { WeaponInterface } from '../../data/weapon-interface';
import { MessageService } from '../../services/message-service';
import { WeaponService } from '../../services/weapon-service';
import { HeroService } from '../../services/hero-service';
import { WeaponDetailComponent } from './weapon-detail-component';

describe('WeaponDetailComponent', () => {
  let fixture: ComponentFixture<WeaponDetailComponent>;
  let component: WeaponDetailComponent;
  let deleteWeapon: ReturnType<typeof vi.fn>;
  let addMessage: ReturnType<typeof vi.fn>;
  let navigateByUrl: ReturnType<typeof vi.spyOn>;
  const weapon: WeaponInterface = {
    id: 'weapon-a1',
    name: 'Épée',
    bonusPv: 0,
    bonusDegats: 25,
    bonusVitesse: -10,
    equippedHeroIds: [],
  };

  beforeEach(async () => {
    deleteWeapon = vi.fn().mockResolvedValue(undefined);
    addMessage = vi.fn();
    await TestBed.configureTestingModule({
      imports: [WeaponDetailComponent],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: { paramMap: of(convertToParamMap({ id: weapon.id })) },
        },
        {
          provide: WeaponService,
          useValue: {
            getWeapons: () => of([]),
            getWeapon: (id: string) =>
              of<WeaponInterface | undefined>(id === weapon.id ? weapon : undefined),
            deleteWeapon,
            associateHero: vi.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: HeroService,
          useValue: {
            getHeroes: () =>
              of([
                { id: 'hero-a1', name: 'Archer', favori: true, pv: 80, degats: 25, vitesse: 60 },
              ]),
          },
        },
        { provide: MessageService, useValue: { add: addMessage } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(WeaponDetailComponent);
    navigateByUrl = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should display all bonuses and their shared stat icons', () => {
    fixture.detectChanges();

    const bonuses = fixture.nativeElement.querySelector('.weapon-bonuses') as HTMLElement;
    expect(bonuses.classList.contains('entity-attributes')).toBe(true);
    expect(bonuses.parentElement?.classList.contains('entity-detail-content')).toBe(true);
    expect(fixture.nativeElement.querySelector('.weapon-back-link')).toBeNull();
    expect(bonuses.textContent).toContain('Bonus de PV : 0');
    expect(bonuses.textContent).toContain('Bonus de dégâts : 25');
    expect(bonuses.textContent).toContain('Bonus de vitesse : -10');
    expect(bonuses.querySelectorAll('app-stat-icon')).toHaveLength(3);
  });

  it('should link to edit and share the delete confirmation dialog', () => {
    fixture.detectChanges();

    const editButton = fixture.debugElement.query(By.css('.weapon-edit-action'));
    const deleteButton = fixture.nativeElement.querySelector(
      '.weapon-delete-action',
    ) as HTMLButtonElement;
    expect(editButton.nativeElement.tagName).toBe('BUTTON');
    expect(editButton.nativeElement.classList.contains('entity-action')).toBe(true);
    expect(editButton.injector.get(RouterLink).urlTree?.toString()).toBe('/weapons/weapon-a1/edit');
    expect(deleteButton.getAttribute('aria-label')).toBe('Supprimer Épée');

    deleteButton.click();
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Épée');
    expect(deleteWeapon).not.toHaveBeenCalled();
  });

  it('should open the hero selection dialog from weapon details', () => {
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.weapon-associate-action') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Associer l’arme à un héros');
    expect(fixture.nativeElement.querySelector('.association-hero')?.textContent).toContain(
      'Archer',
    );
  });

  it('should delete only after confirmation and return to the weapon list', async () => {
    component.openDeleteConfirmation();
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.delete-confirm-button') as HTMLButtonElement).click();
    await fixture.whenStable();

    expect(deleteWeapon).toHaveBeenCalledWith('weapon-a1');
    expect(navigateByUrl).toHaveBeenCalledWith('/weapons');
    expect(addMessage).toHaveBeenCalledWith('L’arme a été supprimée.');
  });

  it('should report deletion failures and remain on the detail page', async () => {
    deleteWeapon.mockRejectedValueOnce(new Error('permission-denied'));
    await component.deleteWeapon(weapon);

    expect(addMessage).toHaveBeenCalledWith(
      'Impossible de supprimer l’arme. Vérifiez la connexion et les règles Firestore.',
    );
    expect(navigateByUrl).not.toHaveBeenCalled();
    expect(component.isDeleting()).toBe(false);
  });
});
