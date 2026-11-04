import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { HeroInterface } from '../../data/heroInterface';
import { HeroService } from '../../services/hero-service';
import { HeroDetailComponent } from './hero-detail-component';

// Le paramètre simulé vérifie que la fiche interprète l'identifiant fourni par la route.
describe('HeroDetailComponent', () => {
  let component: HeroDetailComponent;
  let fixture: ComponentFixture<HeroDetailComponent>;

  beforeEach(async () => {
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
                  ? { id, name: 'Hero A', actif: true }
                  : undefined,
              ),
            updateHero: () => Promise.resolve(),
          },
        },
        {
          provide: ActivatedRoute,
          useValue: { paramMap: of(convertToParamMap({ id: 'hero-a1' })) },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(HeroDetailComponent);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
    expect(component.hero()?.id).toBe('hero-a1');
  });
});
