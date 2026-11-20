/** Modèle d'une arme et des bonus qu'elle apporte aux caractéristiques d'un héros. */
export interface WeaponInterface {
  id: string;
  name: string;
  bonusPv: number;
  bonusDegats: number;
  bonusVitesse: number;
  equippedHeroIds: string[];
}
