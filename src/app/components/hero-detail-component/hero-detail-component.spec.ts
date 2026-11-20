import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { ActivatedRoute, convertToParamMap, provideRouter, RouterLink } from '@angular/router';
import { BehaviorSubject, of } from 'rxjs';
import { vi } from 'vitest';
import { HeroInterface } from '../../data/heroInterface';
import { HeroService } from '../../services/hero-service';
import { MessageService } from '../../services/message-service';
import { WeaponInterface } from '../../data/weapon-interface';
import { WeaponService } from '../../services/weapon-service';
import { HeroDetailComponent } from './hero-detail-component';

// Le paramètre simulé vérifie que la fiche interprète l'identifiant fourni par la route.
describe('HeroDetailComponent', () => {
  let component: HeroDetailComponent;
  let fixture: ComponentFixture<HeroDetailComponent>;
  let deleteHero: ReturnType<typeof vi.fn>;
  let addMessage: ReturnType<typeof vi.fn>;
  let navigateByUrl: ReturnType<typeof vi.spyOn>;
  let getWeapons: ReturnType<typeof vi.fn>;
  let disassociateHero: ReturnType<typeof vi.fn>;
  let weaponSnapshots: BehaviorSubject<WeaponInterface[]>;

  beforeEach(async () => {
    vi.restoreAllMocks();
    deleteHero = vi.fn().mockResolvedValue(undefined);
    addMessage = vi.fn();
    weaponSnapshots = new BehaviorSubject<WeaponInterface[]>([]);
    getWeapons = vi.fn(() => weaponSnapshots.asObservable());
    disassociateHero = vi.fn().mockResolvedValue(undefined);
    await TestBed.configureTestingModule({
      imports: [HeroDetailComponent],
      providers: [
        provideRouter([]),
        {
          provide: HeroService,
          useValue: {
            getHero: (id: string) =>
              of<HeroInterface | undefined>(
                id === 'hero-a1'
                  ? {
                      id,
                      name: 'Hero A',
                      favori: true,
                      pv: 10,
                      degats: 10,
                      attaque: 10,
                      esquive: 10,
                    }
                  : undefined,
              ),
            deleteHero,
          },
        },
        { provide: WeaponService, useValue: { getWeapons, disassociateHero } },
        { provide: MessageService, useValue: { add: addMessage } },
        {
          provide: ActivatedRoute,
          useValue: { paramMap: of(convertToParamMap({ id: 'hero-a1' })) },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HeroDetailComponent);
    navigateByUrl = vi.spyOn(TestBed.inject(Router), 'navigateByUrl').mockResolvedValue(true);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
    expect(component.hero()?.id).toBe('hero-a1');
  });

  it('should display the hero skills with simple decorative icons', () => {
    fixture.detectChanges();

    const skills = fixture.nativeElement.querySelector('.hero-stats') as HTMLElement;
    const skillText = skills.textContent?.replace(/\s+/g, ' ') ?? '';
    expect(skillText).toContain('Points de vie (PV) : 10');
    expect(skillText).toContain('Dégâts : 10');
    expect(skillText).toContain('Attaque : 10');
    expect(skillText).toContain('Esquive : 10');
    expect(skills.querySelector('.hero-stat-total')?.textContent?.trim()).toBe('10');
    expect(skills.querySelector('.hero-stat-breakdown')?.textContent?.trim()).toBe('10');
    expect(skills.querySelector('.hero-stat-breakdown')?.getAttribute('aria-hidden')).toBe('true');
    expect(skills.querySelectorAll('p[tabindex="0"]')).toHaveLength(4);
    expect(skills.querySelectorAll('p[data-tooltip]')).toHaveLength(0);
    expect(skills.querySelectorAll('.stat-icon svg')).toHaveLength(4);
    expect(skills.querySelectorAll('.stat-icon[aria-hidden="true"]')).toHaveLength(4);
    expect(skills.parentElement?.querySelector('.hero-info')).not.toBeNull();
    expect(skills.parentElement?.firstElementChild?.classList.contains('hero-info')).toBe(true);
    expect(skills.parentElement?.lastElementChild).toBe(skills);
    expect(skills.classList.contains('entity-attributes')).toBe(true);
    expect(skills.parentElement?.classList.contains('entity-detail-content')).toBe(true);
  });

  it('should add the bonuses of every equipped weapon to the base statistics', () => {
    weaponSnapshots.next([
      {
        id: 'weapon-a1',
        name: 'Épée',
        bonusPv: 2,
        bonusDegats: 1,
        bonusAttaque: -2,
        bonusEsquive: -1,
        equippedHeroIds: ['hero-a1'],
      },
      {
        id: 'weapon-b2',
        name: 'Bouclier',
        bonusPv: -1,
        bonusDegats: 1,
        bonusAttaque: 2,
        bonusEsquive: -2,
        equippedHeroIds: ['hero-a1', 'hero-other'],
      },
      {
        id: 'weapon-c3',
        name: 'Autre arme',
        bonusPv: 5,
        bonusDegats: -5,
        bonusAttaque: 2,
        bonusEsquive: -2,
        equippedHeroIds: ['hero-other'],
      },
    ]);

    expect(component.heroWithBonuses()?.stats).toEqual({
      pv: { total: 11, breakdown: '10 + 2 − 1' },
      degats: { total: 12, breakdown: '10 + 1 + 1' },
      attaque: { total: 10, breakdown: '10 − 2 + 2' },
      esquive: { total: 7, breakdown: '10 − 1 − 2' },
    });
  });

  it('should display only linked equipped weapon names beneath hero details', () => {
    weaponSnapshots.next([
      {
        id: 'weapon-a1',
        name: 'Épée',
        bonusPv: 2,
        bonusDegats: -1,
        bonusAttaque: -1,
        bonusEsquive: 0,
        equippedHeroIds: ['hero-a1'],
      },
    ]);
    fixture.detectChanges();

    const section = fixture.nativeElement.querySelector('.equipped-weapons') as HTMLElement;
    const heroDetails = fixture.nativeElement.querySelector('.hero-detail-content') as HTMLElement;
    const weaponLink = section.querySelector('.equipped-weapon-link') as HTMLAnchorElement;
    expect(heroDetails.nextElementSibling).toBe(section);
    expect(weaponLink.parentElement?.tagName).toBe('LI');
    expect(weaponLink.classList.contains('equipped-weapon-link')).toBe(true);
    expect(getComputedStyle(weaponLink).width).toBe('140px');
    expect(getComputedStyle(weaponLink).minHeight).toBe('36px');
    expect(weaponLink.textContent?.trim()).toBe('Épée');
    expect(weaponLink.getAttribute('href')).toBe('/weapons/weapon-a1');
    expect(section.textContent?.replace(/\s+/g, ' ').trim()).toBe('Armes équipées Épée ×');
    const statRows = fixture.nativeElement.querySelectorAll(
      '.hero-stats p',
    ) as NodeListOf<HTMLParagraphElement>;
    expect(statRows[0].querySelector('.hero-stat-total')?.textContent?.trim()).toBe('12');
    expect(statRows[0].querySelector('.hero-stat-breakdown')?.textContent?.trim()).toBe('10 + 2');
    expect(statRows[1].querySelector('.hero-stat-total')?.textContent?.trim()).toBe('9');
    expect(statRows[1].querySelector('.hero-stat-breakdown')?.textContent?.trim()).toBe('10 − 1');
  });

  it('should explain when the hero has no equipped weapons', () => {
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('.no-equipped-weapons')?.textContent).toContain(
      'Aucune arme équipée.',
    );
  });

  it('should ask for confirmation before detaching an equipped weapon', () => {
    weaponSnapshots.next([
      {
        id: 'weapon-a1',
        name: 'Épée',
        bonusPv: 2,
        bonusDegats: 0,
        bonusAttaque: -1,
        bonusEsquive: -1,
        equippedHeroIds: ['hero-a1'],
      },
    ]);
    fixture.detectChanges();

    (fixture.nativeElement.querySelector('.detach-weapon-button') as HTMLButtonElement).click();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Détacher l’arme ?');
    expect(fixture.nativeElement.textContent).toContain('« Épée » sera détachée de Hero A.');
    expect(disassociateHero).not.toHaveBeenCalled();
  });

  it('should cancel detaching without changing the weapon association', () => {
    const weapon: WeaponInterface = {
      id: 'weapon-a1',
      name: 'Épée',
      bonusPv: 2,
      bonusDegats: 0,
      bonusAttaque: -1,
      bonusEsquive: -1,
      equippedHeroIds: ['hero-a1'],
    };
    component.openDetachConfirmation(weapon);
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.delete-cancel-button') as HTMLButtonElement).click();

    expect(component.weaponToDetach()).toBeNull();
    expect(disassociateHero).not.toHaveBeenCalled();
  });

  it('should detach the weapon after confirmation', async () => {
    const weapon: WeaponInterface = {
      id: 'weapon-a1',
      name: 'Épée',
      bonusPv: 2,
      bonusDegats: 0,
      bonusAttaque: -1,
      bonusEsquive: -1,
      equippedHeroIds: ['hero-a1'],
    };
    component.openDetachConfirmation(weapon);
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.delete-confirm-button') as HTMLButtonElement).click();
    await fixture.whenStable();

    expect(disassociateHero).toHaveBeenCalledWith('weapon-a1', 'hero-a1');
    expect(component.weaponToDetach()).toBeNull();
    expect(addMessage).toHaveBeenCalledWith('L’arme « Épée » a été détachée de Hero A.');
  });

  it('should keep the confirmation open and report errors when detaching fails', async () => {
    disassociateHero.mockRejectedValueOnce(new Error('permission-denied'));
    const weapon: WeaponInterface = {
      id: 'weapon-a1',
      name: 'Épée',
      bonusPv: 2,
      bonusDegats: 0,
      bonusAttaque: -1,
      bonusEsquive: -1,
      equippedHeroIds: ['hero-a1'],
    };
    component.openDetachConfirmation(weapon);

    await component.detachWeapon(component.hero()!, weapon);

    expect(component.weaponToDetach()).toEqual(weapon);
    expect(component.isDetachingWeapon()).toBe(false);
    expect(addMessage).toHaveBeenCalledWith(
      'Impossible de détacher l’arme. Vérifiez la connexion et les règles Firestore.',
    );
  });

  it('should render accessible edit and delete icon buttons beside the title', () => {
    fixture.detectChanges();

    const title = fixture.nativeElement.querySelector('.hero-detail-title') as HTMLElement;
    const editButton = fixture.nativeElement.querySelector(
      '.hero-edit-action',
    ) as HTMLButtonElement;
    const deleteButton = fixture.nativeElement.querySelector(
      '.hero-delete-action',
    ) as HTMLButtonElement;
    expect(title.textContent).toContain('Détails de Hero A');
    expect(editButton.getAttribute('aria-label')).toBe('Modifier Hero A');
    expect(editButton.textContent).toContain('✎');
    expect(deleteButton.getAttribute('aria-label')).toBe('Supprimer Hero A');
    expect(deleteButton.textContent).toContain('🗑');
    const editRoute = fixture.debugElement
      .query(By.css('.hero-edit-action'))
      .injector.get(RouterLink);
    expect(editRoute.urlTree?.toString()).toBe('/heroes/hero-a1/edit?returnTo=detail');
  });

  it('should open a styled confirmation without deleting immediately', () => {
    fixture.detectChanges();

    const deleteButton = fixture.nativeElement.querySelector(
      '.hero-delete-action',
    ) as HTMLButtonElement;
    deleteButton.click();
    fixture.detectChanges();

    expect(component.isDeleteConfirmationOpen()).toBe(true);
    expect(fixture.nativeElement.textContent).toContain('Hero A');
    expect(deleteHero).not.toHaveBeenCalled();
  });

  it('should cancel deletion without calling Firestore', () => {
    component.openDeleteConfirmation();
    fixture.detectChanges();
    (fixture.nativeElement.querySelector('.delete-cancel-button') as HTMLButtonElement).click();

    expect(component.isDeleteConfirmationOpen()).toBe(false);
    expect(deleteHero).not.toHaveBeenCalled();
  });

  it('should delete the hero after the custom dialog is confirmed', async () => {
    component.openDeleteConfirmation();
    await component.deleteHero(component.hero()!);

    expect(deleteHero).toHaveBeenCalledWith('hero-a1');
    expect(addMessage).toHaveBeenCalledWith('Le héros a été supprimé.');
    expect(navigateByUrl).toHaveBeenCalledWith('/heroes');
  });

  it('should report deletion errors and stay on the detail page', async () => {
    deleteHero.mockRejectedValueOnce(new Error('permission-denied'));

    await component.deleteHero(component.hero()!);

    expect(addMessage).toHaveBeenCalledWith(
      'Impossible de supprimer le héros. Vérifiez la connexion et les règles Firestore.',
    );
    expect(navigateByUrl).not.toHaveBeenCalled();
    expect(component.isDeleting()).toBe(false);
  });
});
