import { Component, input } from '@angular/core';

export type StatIconKind = 'pv' | 'degats' | 'attaque' | 'esquive';

@Component({
  host: { 'aria-hidden': 'true' },
  selector: 'app-stat-icon',
  styleUrl: './stat-icon-component.css',
  templateUrl: './stat-icon-component.html',
})
export class StatIconComponent {
  kind = input.required<StatIconKind>();
}
