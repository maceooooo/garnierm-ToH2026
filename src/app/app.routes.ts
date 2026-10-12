import { Routes } from '@angular/router';
import { HeroesComponent } from './components/heroes-component/heroes-component';
import { HeroDetailComponent} from './components/hero-detail-component/hero-detail-component';

export const routes: Routes = [
  { path: 'heroes', component: HeroesComponent },
  { path: 'dashboard', component: HeroesComponent},
];
