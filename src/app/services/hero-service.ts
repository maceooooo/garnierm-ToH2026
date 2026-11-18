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
import { Observable, concatMap, from, map, of, switchMap, tap, timer } from 'rxjs';
import { MessageService } from './message-service';

/** Valide le contenu stocké et utilise l'ID Firestore comme identité du héros. */
function mapHeroDocument(document: DocumentSnapshot): HeroInterface {
  const data = document.data();
  if (
    !data ||
    typeof data['name'] !== 'string' ||
    (data['favori'] !== undefined && typeof data['favori'] !== 'boolean')
  ) {
    throw new Error(`Le document héros "${document.id}" ne respecte pas le format attendu.`);
  }

  // L'identifiant Firestore est la clé canonique, même si le document contient aussi un champ `id`.
  // Les anciens documents restent lisibles avant migration et deviennent non favoris par défaut.
  return {
    id: document.id,
    name: data['name'],
    favori: typeof data['favori'] === 'boolean' ? data['favori'] : false,
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
    let isInitialSnapshot = true;
    const heroesCollection = collection(this.firestore, 'heroes');
    const heroesQuery = favoritesOnly
      ? query(heroesCollection, where('favori', '==', true))
      : query(heroesCollection, orderBy('name'));

    // Chaque instantané est validé puis limité; seule la réponse initiale est révélée progressivement.
    return collectionSnapshots(heroesQuery).pipe(
      map((documents) => documents.map(mapHeroDocument)),
      map((heroes) =>
        favoritesOnly
          ? heroes
              .filter((hero) => hero.favori)
              .sort((first, second) => first.name.localeCompare(second.name, 'fr'))
          : heroes,
      ),
      map((heroes) => (maxHeroes === -1 ? heroes : heroes.slice(0, maxHeroes))),
      switchMap((heroes) => {
        if (!isInitialSnapshot) {
          // Les changements suivants remplacent immédiatement la liste complète, sans rejouer l'animation initiale.
          return of(heroes);
        }

        isInitialSnapshot = false;
        // Les émissions partielles affichent les héros au fil de l'arrivée, plutôt que d'attendre toute la séquence.
        return from(heroes).pipe(
          concatMap((_, index) =>
            timer(index === 0 ? 0 : 200).pipe(
              map(() => heroes.slice(0, index + 1)),
            ),
          ),
          tap({
            // Le signalement intervient après la séquence initiale complète, pas à chaque émission partielle.
            complete: () =>
              this.messageService.add('HeroService : héros récupérés avec succès'),
          }),
        );
      }),
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
      map((document) =>
        document.exists() ? mapHeroDocument(document) : undefined,
      ),
    );
  }

  /**
   * Met à jour le nom et le statut favori sans modifier l'identifiant du document.
   *
   * @param updatedHero Héros contenant son ID Firestore et les valeurs à enregistrer.
   * @returns Une promesse résolue après l'écriture, rejetée si Firestore refuse la mise à jour.
   */
  updateHero(updatedHero: HeroInterface): Promise<void> {
    const heroDocument = doc(this.firestore, 'heroes', updatedHero.id);
    // Une mise à jour partielle préserve les autres champs éventuels du document.
    return updateDoc(heroDocument, {
      name: updatedHero.name,
      favori: updatedHero.favori,
    });
  }

  /**
   * Crée un document héros et laisse Firestore générer son identifiant.
   *
   * @param hero Nom et statut favori du nouveau héros.
   * @returns L'identifiant Firestore du document créé.
   * @throws Une erreur si le nom est vide ou si Firestore refuse l'écriture.
   */
  async createHero(hero: Omit<HeroInterface, 'id'>): Promise<string> {
    const name = hero.name.trim();
    if (!name) {
      throw new Error('Le nom du héros est obligatoire.');
    }

    // addDoc génère un ID unique; les données ne contiennent que les champs métier du héros.
    const document = await addDoc(collection(this.firestore, 'heroes'), {
      name,
      favori: hero.favori,
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
