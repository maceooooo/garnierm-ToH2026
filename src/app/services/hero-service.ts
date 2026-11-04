import { Service, inject } from '@angular/core';
import {
  DocumentSnapshot,
  Firestore,
  collection,
  collectionSnapshots,
  doc,
  docSnapshots,
  orderBy,
  query,
  updateDoc,
} from '@angular/fire/firestore';
import { HeroInterface } from '../data/heroInterface';
import { Observable, concatMap, from, map, of, switchMap, tap, timer } from 'rxjs';
import { MessageService } from './message-service';

/** Valide le contenu stocké et utilise l'ID Firestore comme identité du héros. */
function mapHeroDocument(document: DocumentSnapshot): HeroInterface {
  const data = document.data();
  if (!data || typeof data['name'] !== 'string' || typeof data['actif'] !== 'boolean') {
    throw new Error(`Le document héros "${document.id}" ne respecte pas le format attendu.`);
  }

  // L'identifiant Firestore est la clé canonique, même si le document contient aussi un champ `id`.
  return { id: document.id, name: data['name'], actif: data['actif'] };
}

@Service()
export class HeroService {
  private firestore = inject(Firestore);
  private messageService = inject(MessageService);

  /**
   * Écoute les héros Firestore et révèle progressivement le premier résultat.
   *
   * @param maxHeroes Nombre maximal de héros à émettre, ou -1 pour tous les héros.
   * @returns Un Observable actualisé à chaque changement de la collection.
   * @remarks Les erreurs Firestore et les documents invalides sont émises par l'Observable.
   */
  getHeroes(maxHeroes: number = -1): Observable<HeroInterface[]> {
    let isInitialSnapshot = true;
    const heroesCollection = collection(this.firestore, 'heroes');
    const heroesQuery = query(heroesCollection, orderBy('name'));

    // Chaque instantané est validé puis limité; seule la réponse initiale est révélée progressivement.
    return collectionSnapshots(heroesQuery).pipe(
      map((documents) =>
        documents.map(mapHeroDocument),
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
   * Met à jour le nom et l'état actif sans modifier l'identifiant du document.
   *
   * @param updatedHero Héros contenant son ID Firestore et les valeurs à enregistrer.
   * @returns Une promesse résolue après l'écriture, rejetée si Firestore refuse la mise à jour.
   */
  updateHero(updatedHero: HeroInterface): Promise<void> {
    const heroDocument = doc(this.firestore, 'heroes', updatedHero.id);
    // Une mise à jour partielle préserve les autres champs éventuels du document.
    return updateDoc(heroDocument, {
      name: updatedHero.name,
      actif: updatedHero.actif,
    });
  }
}
