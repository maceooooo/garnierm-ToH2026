import { TestBed } from '@angular/core/testing';
import { MessageService } from './message-service';

// Le scénario vérifie que le service de notifications est disponible via l'injection Angular.
describe('MessageService', () => {
  let service: MessageService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(MessageService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
