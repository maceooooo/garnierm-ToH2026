import { TestBed } from '@angular/core/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MessageService } from './message-service';

describe('MessageService', () => {
  let service: MessageService;

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({ providers: [MessageService] });
    service = TestBed.inject(MessageService);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should expire each message five seconds after it is added', () => {
    service.add('Premier message');
    vi.advanceTimersByTime(2500);
    service.add('Deuxième message');

    vi.advanceTimersByTime(2500);
    expect(service.messages()).toEqual(['Deuxième message']);

    vi.advanceTimersByTime(2500);
    expect(service.messages()).toEqual([]);
  });

  it('should expire duplicate message texts independently', () => {
    service.add('Même texte');
    vi.advanceTimersByTime(1000);
    service.add('Même texte');

    vi.advanceTimersByTime(4000);
    expect(service.messages()).toEqual(['Même texte']);

    vi.advanceTimersByTime(1000);
    expect(service.messages()).toEqual([]);
  });

  it('should keep at most three messages and expire each remaining message', () => {
    service.add('Un');
    service.add('Deux');
    service.add('Trois');
    service.add('Quatre');

    expect(service.messages()).toEqual(['Deux', 'Trois', 'Quatre']);
    vi.advanceTimersByTime(5000);
    expect(service.messages()).toEqual([]);
  });

  it('should clear messages and cancel their pending expirations', () => {
    service.add('Message');
    service.clear();
    vi.advanceTimersByTime(5000);

    expect(service.messages()).toEqual([]);
  });
});
