import { ApplicationConfig, importProvidersFrom } from '@angular/core';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { provideAnimationsAsync } from '@angular/platform-browser/animations/async';
import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { provideStorage, getStorage } from '@angular/fire/storage';
import { getFirestore, provideFirestore } from '@angular/fire/firestore';
import { environment } from '../environments/environment.development';

const firebaseConfig = {
  apiKey: "AIzaSyADIl6lFvZbcvTiNMtyRwYxjris5fs4xrw",
  authDomain: "da-bubble-c165e.firebaseapp.com",
  projectId: "da-bubble-c165e",
  storageBucket: "da-bubble-c165e.appspot.com",
  messagingSenderId: "148990953407",
  appId: "1:148990953407:web:faf415ee7e1ac38142430a"
};

export const appConfig: ApplicationConfig = {
  providers: [
    provideRouter(routes),
    provideAnimationsAsync(),
    importProvidersFrom([
      provideFirebaseApp(() => initializeApp(firebaseConfig)),
      provideStorage(() => getStorage()),
      provideFirestore(() => getFirestore()),
    ]),
  ],
};
