import { Component, input, output } from '@angular/core';

@Component({
  selector: 'app-delete-confirmation',
  styleUrl: './delete-confirmation-component.css',
  templateUrl: './delete-confirmation-component.html',
})
export class DeleteConfirmationComponent {
  itemName = input.required<string>();
  isDeleting = input(false);
  cancel = output<void>();
  confirm = output<void>();
}
