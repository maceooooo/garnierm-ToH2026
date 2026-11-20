import { Service, inject } from '@angular/core';
import {
  DocumentSnapshot,
  Firestore,
  addDoc,
  collection,
  collectionSnapshots,
  deleteDoc,
  doc,
  docSnapshots,
  orderBy,
  query,
  updateDoc,
  where,
} from '@angular/fire/firestore';
import { HeroInterface } from '../data/heroInterface';
import { Observable, map } from 'rxjs';
import { MessageService } from './message-service';
import { revealInitialList } from './progressive-list';

function isValidStat(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 1;
}

function hasValidStats(
  stats: Pick<HeroInterface, 'pv' | 'degats' | 'attaque' | 'esquive'>,
): boolean {
  const values = [stats.pv, stats.degats, stats.attaque, stats.esquive];
  return values.every(isValidStat) && values.reduce((total, value) => total + value, 0) <= 40;
}

/** Valide le contenu stocké et utilise l'ID Firestore comme identité du héros. */
function mapHeroDocument(document: DocumentSnapshot): HeroInterface {
  const data = document.data();
  if (
    !data ||
    typeof data['name'] !== 'string' ||
    (data['favori'] !== undefined && typeof data['favori'] !== 'boolean') ||
    !isValidStat(data['pv']) ||
    !isValidStat(data['degats']) ||
    !isValidStat(data['attaque']) ||
    !isValidStat(data['esquive']) ||
    !hasValidStats({
      pv: data['pv'],
      degats: data['degats'],
      attaque: data['attaque'],
      esquive: data['esquive'],
    })
  ) {
    throw new Error(`Le document héros "${document.id}" ne respecte pas le format attendu.`);
  }

  // L'identifiant Firestore est la clé canonique, même si le document contient aussi un champ `id`.
  // Les anciens documents restent lisibles avant migration et deviennent non favoris par défaut.
  return {
    id: document.id,
    name: data['name'],
    favori: typeof data['favori'] === 'boolean' ? data['favori'] : false,
    pv: data['pv'],
    degats: data['degats'],
    attaque: data['attaque'],
    esquive: data['esquive'],
  };
}

@Service()
export class HeroService {
  private firestore = inject(Firestore);
  private messageService = inject(MessageService);

  /**
   * Écoute les héros Firestore et révèle progressivement le premier résultat.
   *
   * @param maxHeroes Nombre maximal de héros à émettre, ou -1 pour tous les héros.
   * @param favoritesOnly Limite les résultats aux héros marqués comme favoris.
   * @returns Un Observable actualisé à chaque changement de la collection.
   * @remarks Les erreurs Firestore et les documents invalides sont émises par l'Observable.
   */
  getHeroes(maxHeroes: number = -1, favoritesOnly = false): Observable<HeroInterface[]> {
    const heroesCollection = collection(this.firestore, 'heroes');
    const heroesQuery = favoritesOnly
      ? query(heroesCollection, where('favori', '==', true))
      : query(heroesCollection, orderBy('name'));

    // Chaque instantané est validé puis limité avant la révélation progressive de la première liste.
    const snapshots = collectionSnapshots(heroesQuery).pipe(
      map((documents) => documents.map(mapHeroDocument)),
      map((heroes) =>
        favoritesOnly
          ? heroes
              .filter((hero) => hero.favori)
              .sort((first, second) => first.name.localeCompare(second.name, 'fr'))
          : heroes,
      ),
      map((heroes) => (maxHeroes === -1 ? heroes : heroes.slice(0, maxHeroes))),
    );

    return revealInitialList(snapshots, 200, () =>
      this.messageService.add('HeroService : héros récupérés avec succès'),
    );
  }

  /**
   * Écoute un document héros par son identifiant Firestore.
   *
   * @param id Identifiant du document Firestore.
   * @returns Un Observable actualisé à chaque changement, avec `undefined` si le document n'existe pas.
   * @remarks Les erreurs Firestore et les documents invalides sont émises par l'Observable.
   */
  getHero(id: string): Observable<HeroInterface | undefined> {
    const heroDocument = doc(this.firestore, 'heroes', id);
    return docSnapshots(heroDocument).pipe(
      map((document) => (document.exists() ? mapHeroDocument(document) : undefined)),
    );
  }

  /**
   * Met à jour les informations du héros sans modifier l'identifiant du document.
   *
   * @param updatedHero Héros contenant son ID Firestore et les valeurs à enregistrer.
   * @returns Une promesse résolue après l'écriture, rejetée si les données sont invalides ou si Firestore refuse la mise à jour.
   */
  updateHero(updatedHero: HeroInterface): Promise<void> {
    if (!updatedHero.name.trim() || !hasValidStats(updatedHero)) {
      return Promise.reject(
        new Error(
          'Le nom doit être renseigné et les 4 caractéristiques totaliser au maximum 40 points.',
        ),
      );
    }

    const heroDocument = doc(this.firestore, 'heroes', updatedHero.id);
    // Une mise à jour partielle préserve les autres champs éventuels du document.
    return updateDoc(heroDocument, {
      name: updatedHero.name,
      favori: updatedHero.favori,
      pv: updatedHero.pv,
      degats: updatedHero.degats,
      attaque: updatedHero.attaque,
      esquive: updatedHero.esquive,
    });
  }

  /**
   * Crée un document héros et laisse Firestore générer son identifiant.
   *
   * @param hero Nom, statut favori et compétences du nouveau héros.
   * @returns L'identifiant Firestore du document créé.
   * @throws Une erreur si le nom ou les compétences sont invalides, ou si Firestore refuse l'écriture.
   */
  async createHero(hero: Omit<HeroInterface, 'id'>): Promise<string> {
    const name = hero.name.trim();
    if (!name) {
      throw new Error('Le nom du héros est obligatoire.');
    }
    if (!hasValidStats(hero)) {
      throw new Error(
        'Chaque caractéristique doit être au moins à 1 et leur somme ne peut pas dépasser 40.',
      );
    }

    // addDoc génère un ID unique; les données ne contiennent que les champs métier du héros.
    const document = await addDoc(collection(this.firestore, 'heroes'), {
      name,
      favori: hero.favori,
      pv: hero.pv,
      degats: hero.degats,
      attaque: hero.attaque,
      esquive: hero.esquive,
    });
    return document.id;
  }

  /**
   * Supprime définitivement le document héros identifié dans Firestore.
   *
   * @param id Identifiant Firestore du héros à supprimer.
   * @returns Une promesse résolue après la suppression ou rejetée si Firestore la refuse.
   */
  deleteHero(id: string): Promise<void> {
    return deleteDoc(doc(this.firestore, 'heroes', id));
  }
}
