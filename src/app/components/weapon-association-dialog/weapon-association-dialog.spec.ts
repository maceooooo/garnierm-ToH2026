import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { HeroInterface } from '../../data/heroInterface';
import { HeroService } from '../../services/hero-service';
import { MessageService } from '../../services/message-service';
import { WeaponService } from '../../services/weapon-service';
import { WeaponAssociationDialogComponent } from './weapon-association-dialog';

describe('WeaponAssociationDialogComponent', () => {
  let fixture: ComponentFixture<WeaponAssociationDialogComponent>;
  let associateHero: ReturnType<typeof vi.fn>;
  let addMessage: ReturnType<typeof vi.fn>;
  const heroes: HeroInterface[] = [
    { id: 'hero-a1', name: 'Archer', favori: true, pv: 80, degats: 25, vitesse: 60 },
    { id: 'hero-b2', name: 'Berserker', favori: false, pv: 90, degats: 40, vitesse: 30 },
  ];

  beforeEach(async () => {
    associateHero = vi.fn().mockResolvedValue(undefined);
    addMessage = vi.fn();
    await TestBed.configureTestingModule({
      imports: [WeaponAssociationDialogComponent],
      providers: [
        { provide: HeroService, useValue: { getHeroes: () => of(heroes) } },
        { provide: WeaponService, useValue: { associateHero } },
        { provide: MessageService, useValue: { add: addMessage } },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(WeaponAssociationDialogComponent);
    fixture.componentRef.setInput('weaponId', 'weapon-a1');
    fixture.detectChanges();
  });

  it('should filter heroes by name and associate the selected hero on confirmation', async () => {
    const search = fixture.nativeElement.querySelector('#hero-search') as HTMLInputElement;
    search.value = 'bers';
    search.dispatchEvent(new Event('input'));
    fixture.detectChanges();

    const heroButtons = fixture.nativeElement.querySelectorAll(
      '.association-hero',
    ) as NodeListOf<HTMLButtonElement>;
    expect(heroButtons).toHaveLength(1);
    expect(heroButtons[0].textContent).toContain('Berserker');
    heroButtons[0].click();
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.association-confirm') as HTMLButtonElement).click();
    await fixture.whenStable();

    expect(associateHero).toHaveBeenCalledWith('weapon-a1', 'hero-b2');
    expect(addMessage).toHaveBeenCalledWith('L’arme a été associée à Berserker.');
  });

  it('should confirm the selected hero on double click', async () => {
    const heroButton = fixture.nativeElement.querySelector(
      '.association-hero',
    ) as HTMLButtonElement;
    heroButton.dispatchEvent(new MouseEvent('dblclick'));
    await fixture.whenStable();

    expect(associateHero).toHaveBeenCalledWith('weapon-a1', 'hero-a1');
  });

  it('should keep the dialog open and report association errors', async () => {
    associateHero.mockRejectedValueOnce(new Error('permission-denied'));
    fixture.componentInstance.selectHero('hero-a1');
    await fixture.componentInstance.confirmAssociation();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain(
      'Impossible d’associer l’arme à ce héros. Vérifiez la connexion.',
    );
    expect(addMessage).toHaveBeenCalledWith('Impossible d’associer l’arme à ce héros.');
  });
});
