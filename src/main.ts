import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { App } from './app/app';

// Le démarrage instancie le composant racine avec ses fournisseurs; journaliser un échec évite de le masquer.
bootstrapApplication(App, appConfig)
  .catch((err) => console.error(err));
