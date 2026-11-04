import { ComponentFixture, TestBed } from '@angular/core/testing';
import { HeroEditComponent } from './hero-edit-component';

// Le test fournit l'entrée obligatoire afin de vérifier le montage du formulaire d'édition.
describe('HeroEditComponent', () => {
  let component: HeroEditComponent;
  let fixture: ComponentFixture<HeroEditComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HeroEditComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(HeroEditComponent);
    fixture.componentRef.setInput('hero', { id: 'hero-a1', name: 'Hero V', actif: true });
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
