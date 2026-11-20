import { Service, inject } from '@angular/core';
import {
  DocumentSnapshot,
  Firestore,
  addDoc,
  arrayRemove,
  arrayUnion,
  collection,
  collectionSnapshots,
  deleteDoc,
  doc,
  docSnapshots,
  orderBy,
  query,
  updateDoc,
} from '@angular/fire/firestore';
import { Observable, map } from 'rxjs';
import { WeaponInterface } from '../data/weapon-interface';
import { MessageService } from './message-service';
import { revealInitialList } from './progressive-list';

type NewWeapon = Omit<WeaponInterface, 'id' | 'equippedHeroIds'>;

function isValidBonus(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= -5 && value <= 5;
}

function isValidBonusOrMissing(value: unknown): value is number | undefined {
  return value === undefined || isValidBonus(value);
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string' && item.length > 0);
}

export class InvalidWeaponDocumentError extends Error {
  constructor(documentId: string) {
    super(`Le document arme "${documentId}" ne respecte pas le format attendu.`);
    this.name = 'InvalidWeaponDocumentError';
  }
}

function mapWeaponDocument(document: DocumentSnapshot): WeaponInterface {
  const data = document.data();
  const equippedHeroIds = data?.['equippedHeroIds'];
  const bonuses = {
    bonusPv: data?.['bonusPv'],
    bonusDegats: data?.['bonusDegats'],
    bonusAttaque: data?.['bonusAttaque'] ?? 0,
    bonusEsquive: data?.['bonusEsquive'] ?? 0,
  };
  if (
    !data ||
    typeof data['name'] !== 'string' ||
    !data['name'].trim() ||
    !isValidBonus(data['bonusPv']) ||
    !isValidBonus(data['bonusDegats']) ||
    !isValidBonusOrMissing(data['bonusAttaque']) ||
    !isValidBonusOrMissing(data['bonusEsquive']) ||
    !isValidWeaponBonuses(bonuses) ||
    (equippedHeroIds !== undefined && !isStringArray(equippedHeroIds))
  ) {
    throw new InvalidWeaponDocumentError(document.id);
  }

  return {
    id: document.id,
    name: data['name'],
    ...bonuses,
    equippedHeroIds: equippedHeroIds === undefined ? [] : equippedHeroIds,
  };
}

@Service()
export class WeaponService {
  private firestore = inject(Firestore);
  private messageService = inject(MessageService);

  /**
   * Écoute la collection d'armes et trie les résultats par nom.
   *
   * @param revealProgressively Révèle l'instantané initial progressivement pour les listes d'armes.
   * @returns Un Observable réactualisé à chaque changement Firestore.
   * @remarks Les erreurs Firestore et les documents invalides sont émises par l'Observable.
   */
  getWeapons(revealProgressively = true): Observable<WeaponInterface[]> {
    const weaponsCollection = collection(this.firestore, 'armes');
    const snapshots = collectionSnapshots(query(weaponsCollection, orderBy('name'))).pipe(
      map((documents) => documents.map(mapWeaponDocument)),
    );

    return revealProgressively
      ? revealInitialList(snapshots, 200, () =>
          this.messageService.add('WeaponService : armes récupérées avec succès'),
        )
      : snapshots;
  }

  /**
   * Écoute une arme par son identifiant Firestore.
   *
   * @param id Identifiant du document à lire.
   * @returns L'arme actualisée ou `undefined` si le document n'existe pas.
   */
  getWeapon(id: string): Observable<WeaponInterface | undefined> {
    const weaponDocument = doc(this.firestore, 'armes', id);
    return docSnapshots(weaponDocument).pipe(
      map((document) => (document.exists() ? mapWeaponDocument(document) : undefined)),
    );
  }

  /**
   * Crée une arme dans la collection `armes`.
   *
   * @param weapon Nom et bonus à enregistrer.
   * @returns L'identifiant Firestore généré pour le document.
   * @throws Une erreur si le nom ou un bonus est invalide, ou si Firestore refuse l'écriture.
   */
  async createWeapon(weapon: NewWeapon): Promise<string> {
    const name = weapon.name.trim();
    if (!name) {
      throw new Error('Le nom de l’arme est obligatoire.');
    }
    if (!this.hasValidBonuses(weapon)) {
      throw new Error(
        'Chaque bonus doit être un entier entre -5 et 5 et la somme des 4 bonus doit être égale à 0.',
      );
    }

    const createdDocument = await addDoc(collection(this.firestore, 'armes'), {
      name,
      bonusPv: weapon.bonusPv,
      bonusDegats: weapon.bonusDegats,
      bonusAttaque: weapon.bonusAttaque,
      bonusEsquive: weapon.bonusEsquive,
      equippedHeroIds: [],
    });
    return createdDocument.id;
  }

  /**
   * Met à jour le nom et les bonus d'une arme sans changer son identifiant.
   *
   * @param weapon Arme contenant son identifiant et les valeurs à enregistrer.
   * @returns Une promesse rejetée si les valeurs sont invalides ou si Firestore refuse la mise à jour.
   */
  updateWeapon(weapon: Omit<WeaponInterface, 'equippedHeroIds'>): Promise<void> {
    if (!weapon.name.trim() || !this.hasValidBonuses(weapon)) {
      return Promise.reject(new Error('Le nom et les bonus de l’arme doivent être valides.'));
    }

    return updateDoc(doc(this.firestore, 'armes', weapon.id), {
      name: weapon.name.trim(),
      bonusPv: weapon.bonusPv,
      bonusDegats: weapon.bonusDegats,
      bonusAttaque: weapon.bonusAttaque,
      bonusEsquive: weapon.bonusEsquive,
    });
  }

  /**
   * Associe une arme à un héros sans dupliquer l'identifiant en cas de requêtes concurrentes.
   *
   * @param weaponId Identifiant Firestore de l'arme.
   * @param heroId Identifiant Firestore du héros équipé.
   * @returns Une promesse rejetée si Firestore refuse la mise à jour.
   */
  associateHero(weaponId: string, heroId: string): Promise<void> {
    if (!weaponId || !heroId) {
      return Promise.reject(new Error('Les identifiants de l’arme et du héros sont obligatoires.'));
    }

    return updateDoc(doc(this.firestore, 'armes', weaponId), {
      equippedHeroIds: arrayUnion(heroId),
    });
  }

  /**
   * Détache un héros d'une arme sans modifier les autres associations.
   *
   * @param weaponId Identifiant Firestore de l'arme.
   * @param heroId Identifiant Firestore du héros à détacher.
   * @returns Une promesse rejetée si Firestore refuse la mise à jour.
   */
  disassociateHero(weaponId: string, heroId: string): Promise<void> {
    if (!weaponId || !heroId) {
      return Promise.reject(new Error('Les identifiants de l’arme et du héros sont obligatoires.'));
    }

    return updateDoc(doc(this.firestore, 'armes', weaponId), {
      equippedHeroIds: arrayRemove(heroId),
    });
  }

  /**
   * Supprime une arme de la collection Firestore.
   *
   * @param id Identifiant Firestore du document à supprimer.
   * @returns Une promesse rejetée si Firestore refuse la suppression.
   */
  deleteWeapon(id: string): Promise<void> {
    return deleteDoc(doc(this.firestore, 'armes', id));
  }

  private hasValidBonuses(
    weapon: Pick<WeaponInterface, 'bonusPv' | 'bonusDegats' | 'bonusAttaque' | 'bonusEsquive'>,
  ): boolean {
    return isValidWeaponBonuses(weapon);
  }
}

function isValidWeaponBonuses(
  weapon: Pick<WeaponInterface, 'bonusPv' | 'bonusDegats' | 'bonusAttaque' | 'bonusEsquive'>,
): boolean {
  const bonuses = [weapon.bonusPv, weapon.bonusDegats, weapon.bonusAttaque, weapon.bonusEsquive];
  return bonuses.every(isValidBonus) && bonuses.reduce((total, bonus) => total + bonus, 0) === 0;
}
