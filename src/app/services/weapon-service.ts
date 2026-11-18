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
} from '@angular/fire/firestore';
import { Observable, map } from 'rxjs';
import { WeaponInterface } from '../data/weapon-interface';

function isValidBonus(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= -50 && value <= 50;
}

export class InvalidWeaponDocumentError extends Error {
  constructor(documentId: string) {
    super(`Le document arme "${documentId}" ne respecte pas le format attendu.`);
    this.name = 'InvalidWeaponDocumentError';
  }
}

function mapWeaponDocument(document: DocumentSnapshot): WeaponInterface {
  const data = document.data();
  if (
    !data ||
    typeof data['name'] !== 'string' ||
    !data['name'].trim() ||
    !isValidBonus(data['bonusPv']) ||
    !isValidBonus(data['bonusDegats']) ||
    !isValidBonus(data['bonusVitesse'])
  ) {
    throw new InvalidWeaponDocumentError(document.id);
  }

  return {
    id: document.id,
    name: data['name'],
    bonusPv: data['bonusPv'],
    bonusDegats: data['bonusDegats'],
    bonusVitesse: data['bonusVitesse'],
  };
}

@Service()
export class WeaponService {
  private firestore = inject(Firestore);

  /**
   * Écoute la collection d'armes et trie les résultats par nom.
   *
   * @returns Un Observable réactualisé à chaque changement Firestore.
   * @remarks Les erreurs Firestore et les documents invalides sont émises par l'Observable.
   */
  getWeapons(): Observable<WeaponInterface[]> {
    const weaponsCollection = collection(this.firestore, 'armes');
    return collectionSnapshots(query(weaponsCollection, orderBy('name'))).pipe(
      map((documents) => documents.map(mapWeaponDocument)),
    );
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
  async createWeapon(weapon: Omit<WeaponInterface, 'id'>): Promise<string> {
    const name = weapon.name.trim();
    if (!name) {
      throw new Error('Le nom de l’arme est obligatoire.');
    }
    if (!this.hasValidBonuses(weapon)) {
      throw new Error('Chaque bonus doit être un nombre entier compris entre -50 et 50.');
    }

    const createdDocument = await addDoc(collection(this.firestore, 'armes'), {
      name,
      bonusPv: weapon.bonusPv,
      bonusDegats: weapon.bonusDegats,
      bonusVitesse: weapon.bonusVitesse,
    });
    return createdDocument.id;
  }

  /**
   * Met à jour le nom et les bonus d'une arme sans changer son identifiant.
   *
   * @param weapon Arme contenant son identifiant et les valeurs à enregistrer.
   * @returns Une promesse rejetée si les valeurs sont invalides ou si Firestore refuse la mise à jour.
   */
  updateWeapon(weapon: WeaponInterface): Promise<void> {
    if (!weapon.name.trim() || !this.hasValidBonuses(weapon)) {
      return Promise.reject(new Error('Le nom et les bonus de l’arme doivent être valides.'));
    }

    return updateDoc(doc(this.firestore, 'armes', weapon.id), {
      name: weapon.name.trim(),
      bonusPv: weapon.bonusPv,
      bonusDegats: weapon.bonusDegats,
      bonusVitesse: weapon.bonusVitesse,
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
    weapon: Pick<WeaponInterface, 'bonusPv' | 'bonusDegats' | 'bonusVitesse'>,
  ): boolean {
    return [weapon.bonusPv, weapon.bonusDegats, weapon.bonusVitesse].every(isValidBonus);
  }
}
