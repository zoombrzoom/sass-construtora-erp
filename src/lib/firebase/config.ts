import { initializeApp, getApps, FirebaseApp } from 'firebase/app'
import { getAuth, Auth } from 'firebase/auth'
import { getFirestore, Firestore } from 'firebase/firestore'
import { getStorage, FirebaseStorage } from 'firebase/storage'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

// Inicializar Firebase apenas no cliente
function initializeFirebase() {
  if (typeof window === 'undefined') {
    return {
      app: undefined,
      auth: undefined,
      db: undefined,
      storage: undefined,
    }
  }

  try {
    // Verificar se as variáveis de ambiente estão configuradas
    if (!firebaseConfig.apiKey || !firebaseConfig.projectId || firebaseConfig.apiKey === 'undefined' || firebaseConfig.projectId === 'undefined') {
      console.warn('Firebase não configurado. Verifique as variáveis de ambiente.')
      console.warn('API Key:', firebaseConfig.apiKey ? 'Configurada' : 'Não configurada')
      console.warn('Project ID:', firebaseConfig.projectId ? 'Configurado' : 'Não configurado')
      return {
        app: undefined,
        auth: undefined,
        db: undefined,
        storage: undefined,
      }
    }

    let app: FirebaseApp
    if (!getApps().length) {
      app = initializeApp(firebaseConfig)
    } else {
      app = getApps()[0]
    }
    
    const auth = getAuth(app)
    const db = getFirestore(app)
    const storage = getStorage(app)
    
    return { app, auth, db, storage }
  } catch (error) {
    console.error('Erro ao inicializar Firebase:', error)
    return {
      app: undefined,
      auth: undefined,
      db: undefined,
      storage: undefined,
    }
  }
}

const { app, auth, db, storage } = initializeFirebase()

export { auth, db, storage }
export default app
