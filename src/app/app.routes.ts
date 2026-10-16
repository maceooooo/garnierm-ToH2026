import { Routes } from '@angular/router';
import { HeroesComponent } from './components/heroes-component/heroes-component';
import { HeroDetailComponent } from './components/hero-detail-component/hero-detail-component';
import { DashboardComponent } from './components/dashboard-component/dashboard-component';
import { HomeComponent } from './components/home-component/home-component';

export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'dashboard', component: DashboardComponent },
  { path: 'heroes', component: HeroesComponent },
  { path: 'detail/:id', component: HeroDetailComponent },
  { path: '**', redirectTo: '' },
];
