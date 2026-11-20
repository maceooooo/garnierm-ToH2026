import { TestBed } from '@angular/core/testing';
import { Firestore } from '@angular/fire/firestore';
import { afterEach, vi } from 'vitest';
import { firstValueFrom, of } from 'rxjs';
import { HeroInterface } from '../data/heroInterface';
import { HeroService } from './hero-service';
import { MessageService } from './message-service';

const { addDocMock, collectionSnapshotsMock, deleteDocMock, docSnapshotsMock, updateDocMock } =
  vi.hoisted(() => ({
    addDocMock: vi.fn(),
    collectionSnapshotsMock: vi.fn(),
    deleteDocMock: vi.fn(),
    docSnapshotsMock: vi.fn(),
    updateDocMock: vi.fn(),
  }));

vi.mock('@angular/fire/firestore', () => ({
  Firestore: class Firestore {},
  addDoc: addDocMock,
  collection: vi.fn(() => ({})),
  collectionSnapshots: collectionSnapshotsMock,
  deleteDoc: deleteDocMock,
  doc: vi.fn(() => ({})),
  docSnapshots: docSnapshotsMock,
  orderBy: vi.fn(() => ({})),
  query: vi.fn(() => ({})),
  updateDoc: updateDocMock,
  where: vi.fn(() => ({})),
}));

// Ces tests vérifient le flux Firestore, l'identifiant de document et la persistance des modifications.
describe('HeroService', () => {
  let service: HeroService;
  const mockHeroes: HeroInterface[] = [
    { id: 'hero-a1', name: 'Hero A', favori: true, pv: 10, degats: 10, attaque: 10, esquive: 10 },
    { id: 'hero-b2', name: 'Hero B', favori: false, pv: 10, degats: 10, attaque: 10, esquive: 10 },
  ];

  afterEach(() => {
    vi.useRealTimers();
  });

  beforeEach(() => {
    collectionSnapshotsMock.mockReturnValue(
      of(
        mockHeroes.map((hero) => ({
          data: () => ({
            name: hero.name,
            favori: hero.favori,
            pv: hero.pv,
            degats: hero.degats,
            attaque: hero.attaque,
            esquive: hero.esquive,
          }),
          id: hero.id,
        })),
      ),
    );
    docSnapshotsMock.mockReturnValue(
      of({
        data: () => ({
          name: mockHeroes[0].name,
          favori: mockHeroes[0].favori,
          pv: mockHeroes[0].pv,
          degats: mockHeroes[0].degats,
          attaque: mockHeroes[0].attaque,
          esquive: mockHeroes[0].esquive,
        }),
        exists: () => true,
        id: mockHeroes[0].id,
      }),
    );
    addDocMock.mockResolvedValue({ id: 'hero-new1' });
    deleteDocMock.mockResolvedValue(undefined);
    updateDocMock.mockResolvedValue(undefined);
    TestBed.configureTestingModule({
      providers: [{ provide: Firestore, useValue: {} }],
    });
    service = TestBed.inject(HeroService);
  });

  it('should load a hero by its Firebase document id', async () => {
    await expect(firstValueFrom(service.getHero('hero-a1'))).resolves.toEqual(mockHeroes[0]);
  });

  it('should return undefined when the requested document does not exist', async () => {
    docSnapshotsMock.mockReturnValueOnce(of({ exists: () => false, id: 'missing-document' }));

    await expect(firstValueFrom(service.getHero('missing-document'))).resolves.toBeUndefined();
  });

  it('should update the document fields without overwriting its id', async () => {
    const updatedHero = { ...mockHeroes[0], name: 'Hero modifié', favori: false };

    await service.updateHero(updatedHero);

    expect(updateDocMock).toHaveBeenCalledWith(expect.anything(), {
      name: 'Hero modifié',
      favori: false,
      pv: 10,
      degats: 10,
      attaque: 10,
      esquive: 10,
    });
  });

  it('should reject statistics below one before updating Firestore', async () => {
    updateDocMock.mockClear();

    await expect(service.updateHero({ ...mockHeroes[0], esquive: 0 })).rejects.toThrow(
      'Le nom doit être renseigné et les 4 caractéristiques totaliser au maximum 40 points.',
    );

    expect(updateDocMock).not.toHaveBeenCalled();
  });

  it('should reject a total allocation above 40 before updating Firestore', async () => {
    await expect(service.updateHero({ ...mockHeroes[0], pv: 11 })).rejects.toThrow(
      'Le nom doit être renseigné et les 4 caractéristiques totaliser au maximum 40 points.',
    );
    expect(updateDocMock).not.toHaveBeenCalled();
  });

  it('should create a hero with a generated Firebase id and trimmed name', async () => {
    await expect(
      service.createHero({
        name: '  Nouveau héros  ',
        favori: true,
        pv: 15,
        degats: 10,
        attaque: 10,
        esquive: 5,
      }),
    ).resolves.toBe('hero-new1');

    expect(addDocMock).toHaveBeenCalledWith(expect.anything(), {
      name: 'Nouveau héros',
      favori: true,
      pv: 15,
      degats: 10,
      attaque: 10,
      esquive: 5,
    });
  });

  it('should allow a valid allocation below 40 points', async () => {
    await expect(
      service.createHero({
        name: 'Héros équilibré',
        favori: false,
        pv: 1,
        degats: 1,
        attaque: 1,
        esquive: 1,
      }),
    ).resolves.toBe('hero-new1');
  });

  it('should reject a hero with an empty name without writing to Firestore', async () => {
    await expect(
      service.createHero({
        name: '   ',
        favori: true,
        pv: 10,
        degats: 10,
        attaque: 10,
        esquive: 10,
      }),
    ).rejects.toThrow('Le nom du héros est obligatoire.');
    expect(addDocMock).not.toHaveBeenCalled();
  });

  it('should reject a total allocation above 40 without writing to Firestore', async () => {
    await expect(
      service.createHero({
        name: 'Héros invalide',
        favori: false,
        pv: 11,
        degats: 10,
        attaque: 10,
        esquive: 10,
      }),
    ).rejects.toThrow(
      'Chaque caractéristique doit être au moins à 1 et leur somme ne peut pas dépasser 40.',
    );
    expect(addDocMock).not.toHaveBeenCalled();
  });

  it('should delete the hero document by its Firebase id', async () => {
    await service.deleteHero('hero-a1');

    expect(deleteDocMock).toHaveBeenCalledWith(expect.anything());
  });

  it('should emit heroes progressively every 200 ms on the initial snapshot', () => {
    vi.useFakeTimers();
    const receivedHeroIds: string[][] = [];

    service.getHeroes(2).subscribe((heroes) => {
      receivedHeroIds.push(heroes.map((hero) => hero.id));
    });

    vi.advanceTimersByTime(0);
    expect(receivedHeroIds).toEqual([['hero-a1']]);

    vi.advanceTimersByTime(199);
    expect(receivedHeroIds).toEqual([['hero-a1']]);

    vi.advanceTimersByTime(1);
    expect(receivedHeroIds).toEqual([['hero-a1'], ['hero-a1', 'hero-b2']]);
    expect(TestBed.inject(MessageService).messages()).toEqual([
      'HeroService : héros récupérés avec succès',
    ]);
  });

  it('should only return favorite heroes for the dashboard', async () => {
    const received = await firstValueFrom(service.getHeroes(-1, true));

    expect(received).toEqual([mockHeroes[0]]);
  });

  it('should treat documents without a favorite field as non-favorites', async () => {
    collectionSnapshotsMock.mockReturnValueOnce(
      of([
        {
          data: () => ({
            name: 'Legacy Hero',
            actif: true,
            pv: 10,
            degats: 10,
            attaque: 10,
            esquive: 10,
          }),
          id: 'legacy-id',
        },
      ]),
    );

    const received = await firstValueFrom(service.getHeroes());

    expect(received).toEqual([
      {
        id: 'legacy-id',
        name: 'Legacy Hero',
        favori: false,
        pv: 10,
        degats: 10,
        attaque: 10,
        esquive: 10,
      },
    ]);
  });

  it('should reject documents with invalid skill values', async () => {
    collectionSnapshotsMock.mockReturnValueOnce(
      of([
        {
          data: () => ({ name: 'Héros invalide', pv: 0, degats: 10, attaque: 10, esquive: 10 }),
          id: 'invalid-id',
        },
      ]),
    );

    await expect(firstValueFrom(service.getHeroes())).rejects.toThrow(
      'Le document héros "invalid-id" ne respecte pas le format attendu.',
    );
  });
});
