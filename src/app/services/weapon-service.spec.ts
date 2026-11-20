import { TestBed } from '@angular/core/testing';
import { Firestore } from '@angular/fire/firestore';
import { firstValueFrom, of } from 'rxjs';
import { afterEach, vi } from 'vitest';
import { WeaponInterface } from '../data/weapon-interface';
import { MessageService } from './message-service';
import { WeaponService } from './weapon-service';

const {
  addDocMock,
  arrayRemoveMock,
  arrayUnionMock,
  collectionMock,
  collectionSnapshotsMock,
  deleteDocMock,
  docMock,
  docSnapshotsMock,
  orderByMock,
  queryMock,
  updateDocMock,
} = vi.hoisted(() => ({
  addDocMock: vi.fn(),
  arrayRemoveMock: vi.fn((value: string) => ({ arrayRemove: value })),
  arrayUnionMock: vi.fn((value: string) => ({ arrayUnion: value })),
  collectionMock: vi.fn(() => ({})),
  collectionSnapshotsMock: vi.fn(),
  deleteDocMock: vi.fn(),
  docMock: vi.fn(() => ({})),
  docSnapshotsMock: vi.fn(),
  orderByMock: vi.fn(() => ({})),
  queryMock: vi.fn(() => ({})),
  updateDocMock: vi.fn(),
}));

vi.mock('@angular/fire/firestore', () => ({
  Firestore: class Firestore {},
  addDoc: addDocMock,
  arrayRemove: arrayRemoveMock,
  arrayUnion: arrayUnionMock,
  collection: collectionMock,
  collectionSnapshots: collectionSnapshotsMock,
  deleteDoc: deleteDocMock,
  doc: docMock,
  docSnapshots: docSnapshotsMock,
  orderBy: orderByMock,
  query: queryMock,
  updateDoc: updateDocMock,
}));

describe('WeaponService', () => {
  let service: WeaponService;
  const addMessage = vi.fn();
  const weapon: WeaponInterface = {
    id: 'weapon-a1',
    name: 'Épée',
    bonusPv: 0,
    bonusDegats: 25,
    bonusVitesse: -10,
    equippedHeroIds: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    collectionSnapshotsMock.mockReturnValue(
      of([
        {
          data: () => ({
            name: weapon.name,
            bonusPv: weapon.bonusPv,
            bonusDegats: weapon.bonusDegats,
            bonusVitesse: weapon.bonusVitesse,
            equippedHeroIds: weapon.equippedHeroIds,
          }),
          id: weapon.id,
        },
      ]),
    );
    docSnapshotsMock.mockReturnValue(
      of({
        data: () => ({
          name: weapon.name,
          bonusPv: weapon.bonusPv,
          bonusDegats: weapon.bonusDegats,
          bonusVitesse: weapon.bonusVitesse,
          equippedHeroIds: weapon.equippedHeroIds,
        }),
        exists: () => true,
        id: weapon.id,
      }),
    );
    addDocMock.mockResolvedValue({ id: 'weapon-new1' });
    updateDocMock.mockResolvedValue(undefined);
    deleteDocMock.mockResolvedValue(undefined);
    TestBed.configureTestingModule({
      providers: [
        { provide: Firestore, useValue: {} },
        { provide: MessageService, useValue: { add: addMessage } },
      ],
    });
    service = TestBed.inject(WeaponService);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('should read weapons from the armes collection', async () => {
    await expect(firstValueFrom(service.getWeapons())).resolves.toEqual([weapon]);
    expect(collectionMock).toHaveBeenCalledWith(expect.anything(), 'armes');
  });

  it('should reveal the first weapon list progressively and use live snapshots immediately after', () => {
    vi.useFakeTimers();
    const secondWeapon = { ...weapon, id: 'weapon-b2', name: 'Hache' };
    collectionSnapshotsMock.mockReturnValueOnce(
      of(
        [weapon, secondWeapon].map((item) => ({
          data: () => ({
            name: item.name,
            bonusPv: item.bonusPv,
            bonusDegats: item.bonusDegats,
            bonusVitesse: item.bonusVitesse,
            equippedHeroIds: item.equippedHeroIds,
          }),
          id: item.id,
        })),
      ),
    );
    const received: string[][] = [];

    service.getWeapons().subscribe((weapons) => {
      received.push(weapons.map((item) => item.id));
    });

    vi.advanceTimersByTime(0);
    expect(received).toEqual([['weapon-a1']]);
    vi.advanceTimersByTime(199);
    expect(received).toEqual([['weapon-a1']]);
    vi.advanceTimersByTime(1);
    expect(received).toEqual([['weapon-a1'], ['weapon-a1', 'weapon-b2']]);
    expect(addMessage).toHaveBeenCalledWith('WeaponService : armes récupérées avec succès');
  });

  it('should return a weapon by Firestore id', async () => {
    await expect(firstValueFrom(service.getWeapon(weapon.id))).resolves.toEqual(weapon);
    expect(docMock).toHaveBeenCalledWith(expect.anything(), 'armes', weapon.id);
  });

  it('should emit the complete weapon snapshot immediately when progressive reveal is disabled', async () => {
    await expect(firstValueFrom(service.getWeapons(false))).resolves.toEqual([weapon]);
    expect(addMessage).not.toHaveBeenCalled();
  });

  it('should return undefined for a missing weapon', async () => {
    docSnapshotsMock.mockReturnValueOnce(of({ exists: () => false, id: 'missing' }));

    await expect(firstValueFrom(service.getWeapon('missing'))).resolves.toBeUndefined();
  });

  it('should create a weapon with trimmed name and bonus values, including zero and negatives', async () => {
    await expect(
      service.createWeapon({
        name: '  Épée  ',
        bonusPv: 0,
        bonusDegats: 50,
        bonusVitesse: -50,
      }),
    ).resolves.toBe('weapon-new1');

    expect(addDocMock).toHaveBeenCalledWith(expect.anything(), {
      name: 'Épée',
      bonusPv: 0,
      bonusDegats: 50,
      bonusVitesse: -50,
      equippedHeroIds: [],
    });
    expect(collectionMock).toHaveBeenCalledWith(expect.anything(), 'armes');
  });

  it('should reject a blank weapon name without writing to Firestore', async () => {
    await expect(
      service.createWeapon({
        name: '   ',
        bonusPv: 0,
        bonusDegats: 0,
        bonusVitesse: 0,
      }),
    ).rejects.toThrow('Le nom de l’arme est obligatoire.');
    expect(addDocMock).not.toHaveBeenCalled();
  });

  it('should reject bonuses outside -50..50 before creating or updating', async () => {
    const invalidWeapon = { ...weapon, bonusPv: -51 };

    await expect(service.createWeapon(invalidWeapon)).rejects.toThrow(
      'Chaque bonus doit être un nombre entier compris entre -50 et 50.',
    );
    await expect(service.updateWeapon(invalidWeapon)).rejects.toThrow(
      'Le nom et les bonus de l’arme doivent être valides.',
    );
    expect(addDocMock).not.toHaveBeenCalled();
    expect(updateDocMock).not.toHaveBeenCalled();
  });

  it('should update all weapon fields without changing the document id', async () => {
    await service.updateWeapon({ ...weapon, name: 'Hache', bonusDegats: -5 });

    expect(docMock).toHaveBeenCalledWith(expect.anything(), 'armes', weapon.id);
    expect(updateDocMock).toHaveBeenCalledWith(expect.anything(), {
      name: 'Hache',
      bonusPv: 0,
      bonusDegats: -5,
      bonusVitesse: -10,
    });
  });

  it('should delete the weapon document by its Firestore id', async () => {
    await service.deleteWeapon(weapon.id);

    expect(docMock).toHaveBeenCalledWith(expect.anything(), 'armes', weapon.id);
    expect(deleteDocMock).toHaveBeenCalledWith(expect.anything());
  });

  it('should associate a hero id with a weapon using an idempotent array update', async () => {
    await service.associateHero(weapon.id, 'hero-a1');

    expect(docMock).toHaveBeenCalledWith(expect.anything(), 'armes', weapon.id);
    expect(arrayUnionMock).toHaveBeenCalledWith('hero-a1');
    expect(updateDocMock).toHaveBeenCalledWith(expect.anything(), {
      equippedHeroIds: { arrayUnion: 'hero-a1' },
    });
  });

  it('should remove only the requested hero id from a weapon association list', async () => {
    await service.disassociateHero(weapon.id, 'hero-a1');

    expect(docMock).toHaveBeenCalledWith(expect.anything(), 'armes', weapon.id);
    expect(arrayRemoveMock).toHaveBeenCalledWith('hero-a1');
    expect(updateDocMock).toHaveBeenCalledWith(expect.anything(), {
      equippedHeroIds: { arrayRemove: 'hero-a1' },
    });
  });

  it('should treat legacy weapons without equipped hero ids as unassociated', async () => {
    docSnapshotsMock.mockReturnValueOnce(
      of({
        data: () => ({
          name: weapon.name,
          bonusPv: weapon.bonusPv,
          bonusDegats: weapon.bonusDegats,
          bonusVitesse: weapon.bonusVitesse,
        }),
        exists: () => true,
        id: weapon.id,
      }),
    );

    await expect(firstValueFrom(service.getWeapon(weapon.id))).resolves.toEqual({
      ...weapon,
      equippedHeroIds: [],
    });
  });

  it('should reject documents with invalid bonus values', async () => {
    collectionSnapshotsMock.mockReturnValueOnce(
      of([
        {
          data: () => ({ name: 'Arme invalide', bonusPv: 0, bonusDegats: 51, bonusVitesse: 0 }),
          id: 'invalid-id',
        },
      ]),
    );

    await expect(firstValueFrom(service.getWeapons())).rejects.toThrow(
      'Le document arme "invalid-id" ne respecte pas le format attendu.',
    );
  });

  it('should reject an invalid equipped hero id list', async () => {
    docSnapshotsMock.mockReturnValueOnce(
      of({
        data: () => ({
          name: weapon.name,
          bonusPv: weapon.bonusPv,
          bonusDegats: weapon.bonusDegats,
          bonusVitesse: weapon.bonusVitesse,
          equippedHeroIds: ['hero-a1', ''],
        }),
        exists: () => true,
        id: weapon.id,
      }),
    );

    await expect(firstValueFrom(service.getWeapon(weapon.id))).rejects.toThrow(
      `Le document arme "${weapon.id}" ne respecte pas le format attendu.`,
    );
  });
});
