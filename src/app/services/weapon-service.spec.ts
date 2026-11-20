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
    bonusPv: 2,
    bonusDegats: -2,
    bonusAttaque: 1,
    bonusEsquive: -1,
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
            bonusAttaque: weapon.bonusAttaque,
            bonusEsquive: weapon.bonusEsquive,
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
          bonusAttaque: weapon.bonusAttaque,
          bonusEsquive: weapon.bonusEsquive,
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
            bonusAttaque: item.bonusAttaque,
            bonusEsquive: item.bonusEsquive,
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
        bonusPv: 5,
        bonusDegats: -5,
        bonusAttaque: -3,
        bonusEsquive: 3,
      }),
    ).resolves.toBe('weapon-new1');

    expect(addDocMock).toHaveBeenCalledWith(expect.anything(), {
      name: 'Épée',
      bonusPv: 5,
      bonusDegats: -5,
      bonusAttaque: -3,
      bonusEsquive: 3,
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
        bonusAttaque: 0,
        bonusEsquive: 0,
      }),
    ).rejects.toThrow('Le nom de l’arme est obligatoire.');
    expect(addDocMock).not.toHaveBeenCalled();
  });

  it('should accept bonuses at both range boundaries when their sum is zero', async () => {
    await expect(
      service.createWeapon({
        name: 'Arme équilibrée',
        bonusPv: 5,
        bonusDegats: -5,
        bonusAttaque: 5,
        bonusEsquive: -5,
      }),
    ).resolves.toBe('weapon-new1');
  });

  it('should reject bonuses outside -5..5 before creating or updating', async () => {
    const invalidWeapon = { ...weapon, bonusPv: -6, bonusDegats: 3 };

    await expect(service.createWeapon(invalidWeapon)).rejects.toThrow(
      'Chaque bonus doit être un entier entre -5 et 5 et la somme des 4 bonus doit être égale à 0.',
    );
    await expect(service.updateWeapon(invalidWeapon)).rejects.toThrow(
      'Le nom et les bonus de l’arme doivent être valides.',
    );
    expect(addDocMock).not.toHaveBeenCalled();
    expect(updateDocMock).not.toHaveBeenCalled();
  });

  it('should reject bonuses whose sum is not zero before creating or updating', async () => {
    const unbalancedWeapon = { ...weapon, bonusPv: 3 };

    await expect(service.createWeapon(unbalancedWeapon)).rejects.toThrow(
      'Chaque bonus doit être un entier entre -5 et 5 et la somme des 4 bonus doit être égale à 0.',
    );
    await expect(service.updateWeapon(unbalancedWeapon)).rejects.toThrow(
      'Le nom et les bonus de l’arme doivent être valides.',
    );
    expect(addDocMock).not.toHaveBeenCalled();
    expect(updateDocMock).not.toHaveBeenCalled();
  });

  it('should update all weapon fields without changing the document id', async () => {
    await service.updateWeapon({
      ...weapon,
      name: 'Hache',
      bonusDegats: -1,
      bonusAttaque: 0,
      bonusEsquive: -1,
    });

    expect(docMock).toHaveBeenCalledWith(expect.anything(), 'armes', weapon.id);
    expect(updateDocMock).toHaveBeenCalledWith(expect.anything(), {
      name: 'Hache',
      bonusPv: 2,
      bonusDegats: -1,
      bonusAttaque: 0,
      bonusEsquive: -1,
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

  it('should default new bonuses on legacy weapons and treat them as unassociated', async () => {
    docSnapshotsMock.mockReturnValueOnce(
      of({
        data: () => ({
          name: weapon.name,
          bonusPv: 2,
          bonusDegats: -2,
          bonusVitesse: -10,
        }),
        exists: () => true,
        id: weapon.id,
      }),
    );

    await expect(firstValueFrom(service.getWeapon(weapon.id))).resolves.toEqual({
      id: weapon.id,
      name: weapon.name,
      bonusPv: 2,
      bonusDegats: -2,
      bonusAttaque: 0,
      bonusEsquive: 0,
      equippedHeroIds: [],
    });
  });

  it('should reject documents with invalid bonus values', async () => {
    collectionSnapshotsMock.mockReturnValueOnce(
      of([
        {
          data: () => ({
            name: 'Arme invalide',
            bonusPv: 0,
            bonusDegats: 0,
            bonusAttaque: 6,
            bonusEsquive: 0,
          }),
          id: 'invalid-id',
        },
      ]),
    );

    await expect(firstValueFrom(service.getWeapons())).rejects.toThrow(
      'Le document arme "invalid-id" ne respecte pas le format attendu.',
    );
  });

  it('should reject documents whose valid bonuses do not sum to zero', async () => {
    collectionSnapshotsMock.mockReturnValueOnce(
      of([
        {
          data: () => ({
            name: 'Arme déséquilibrée',
            bonusPv: 1,
            bonusDegats: 0,
            bonusAttaque: 0,
            bonusEsquive: 0,
          }),
          id: 'unbalanced-id',
        },
      ]),
    );

    await expect(firstValueFrom(service.getWeapons())).rejects.toThrow(
      'Le document arme "unbalanced-id" ne respecte pas le format attendu.',
    );
  });

  it('should reject an invalid equipped hero id list', async () => {
    docSnapshotsMock.mockReturnValueOnce(
      of({
        data: () => ({
          name: weapon.name,
          bonusPv: weapon.bonusPv,
          bonusDegats: weapon.bonusDegats,
          bonusAttaque: weapon.bonusAttaque,
          bonusEsquive: weapon.bonusEsquive,
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
