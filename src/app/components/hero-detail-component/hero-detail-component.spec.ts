import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { Router } from '@angular/router';
import {
  ActivatedRoute,
  convertToParamMap,
  provideRouter,
  RouterLink,
} from '@angular/router';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { HeroInterface } from '../../data/heroInterface';
import { HeroService } from '../../services/hero-service';
import { MessageService } from '../../services/message-service';
import { HeroDetailComponent } from './hero-detail-component';

// Le paramètre simulé vérifie que la fiche interprète l'identifiant fourni par la route.
describe('HeroDetailComponent', () => {
  let component: HeroDetailComponent;
  let fixture: ComponentFixture<HeroDetailComponent>;
  let deleteHero: ReturnType<typeof vi.fn>;
  let addMessage: ReturnType<typeof vi.fn>;
  let navigateByUrl: ReturnType<typeof vi.spyOn>;

  beforeEach(async () => {
    vi.restoreAllMocks();
    deleteHero = vi.fn().mockResolvedValue(undefined);
    addMessage = vi.fn();
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
                  ? { id, name: 'Hero A', favori: true }
                  : undefined,
              ),
            deleteHero,
          },
        },
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

  it('should render accessible edit and delete icon buttons beside the title', () => {
    fixture.detectChanges();

    const title = fixture.nativeElement.querySelector('.hero-detail-title') as HTMLElement;
    const editButton = fixture.nativeElement.querySelector('.hero-edit-action') as HTMLButtonElement;
    const deleteButton = fixture.nativeElement.querySelector('.hero-delete-action') as HTMLButtonElement;
    expect(title.textContent).toContain('Détails de Hero A');
    expect(editButton.getAttribute('aria-label')).toBe('Modifier Hero A');
    expect(editButton.textContent).toContain('✎');
    expect(deleteButton.getAttribute('aria-label')).toBe('Supprimer Hero A');
    expect(deleteButton.textContent).toContain('🗑');
    const editRoute = fixture.debugElement
      .query(By.css('.hero-edit-action'))
      .injector.get(RouterLink);
    expect(editRoute.urlTree?.toString()).toBe('/heroes/hero-a1/edit');
  });

  it('should open a styled confirmation without deleting immediately', () => {
    fixture.detectChanges();

    const deleteButton = fixture.nativeElement.querySelector('.hero-delete-action') as HTMLButtonElement;
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
