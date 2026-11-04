/** Modèle partagé des héros utilisé par les vues, le service et les formulaires. */
export interface HeroInterface {
  id: string;
  name: string;
  /** Indique si le héros est actuellement actif dans la collection. */
  actif: boolean;
}
