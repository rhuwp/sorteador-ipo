import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
// 1. Importamos as funções necessárias para o Cache
import { 
  getFirestore, 
  initializeFirestore, 
  persistentLocalCache, 
  persistentMultipleTabManager 
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Garante que o App só seja inicializado uma vez
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

// 2. Inicializamos o Firestore com as configurações de persistência
let db;

try {
  // Tenta inicializar com o cache persistente e o gerenciador de múltiplas abas
  db = initializeFirestore(app, {
    localCache: persistentLocalCache({
     
      tabManager: persistentMultipleTabManager()
    })
  });
} catch (e) {
  db = getFirestore(app);
}

export const auth = getAuth(app);
export { db };