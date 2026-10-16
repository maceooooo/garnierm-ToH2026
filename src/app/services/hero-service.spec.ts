import { TestBed } from '@angular/core/testing';
import { HeroService } from './hero-service';

describe('HeroService', () => {
  let service: HeroService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(HeroService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should return and update a hero by id', () => {
    const hero = service.getHero(7);
    expect(hero?.name).toBe('Hero V');

    service.updateHero({ id: 7, name: 'Hero modifié', actif: false });

    expect(service.getHero(7)).toEqual({ id: 7, name: 'Hero modifié', actif: false });
  });
});
