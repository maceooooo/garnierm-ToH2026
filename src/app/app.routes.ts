import { Routes } from '@angular/router';
import { HeroesComponent } from './components/heroes-component/heroes-component';
import { HeroDetailComponent } from './components/hero-detail-component/hero-detail-component';
import { DashboardComponent } from './components/dashboard-component/dashboard-component';
import { HomeComponent } from './components/home-component/home-component';
import { HeroFormComponent } from './components/hero-form-component/hero-form-component';
import { WeaponDetailComponent } from './components/weapon-detail-component/weapon-detail-component';
import { WeaponFormComponent } from './components/weapon-form-component/weapon-form-component';
import { WeaponsComponent } from './components/weapons-component/weapons-component';

// Les routes nommées exposent les vues de l'application; le joker ramène les URL inconnues à l'accueil.
export const routes: Routes = [
  { path: '', component: HomeComponent },
  { path: 'dashboard', component: DashboardComponent },
  { path: 'heroes', component: HeroesComponent },
  { path: 'heroes/new', component: HeroFormComponent },
  { path: 'heroes/:id/edit', component: HeroFormComponent },
  { path: 'detail/:id', component: HeroDetailComponent },
  { path: 'weapons', component: WeaponsComponent },
  { path: 'weapons/new', component: WeaponFormComponent },
  { path: 'weapons/:id/edit', component: WeaponFormComponent },
  { path: 'weapons/:id', component: WeaponDetailComponent },
  { path: '**', redirectTo: '' },
];
