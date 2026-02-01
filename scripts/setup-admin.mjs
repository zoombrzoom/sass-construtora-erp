/**
 * Script para criar o usuário administrador inicial
 * Execute com: node scripts/setup-admin.mjs
 */

import { initializeApp } from 'firebase/app'
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth'
import { getFirestore, doc, setDoc, serverTimestamp } from 'firebase/firestore'
import { config } from 'dotenv'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

// Carregar variáveis de ambiente
const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)
config({ path: join(__dirname, '..', '.env.local') })

// Configuração do Firebase
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
}

// Dados do administrador
const ADMIN_EMAIL = 'majollo@majollo.com.br'
const ADMIN_TEMP_PASSWORD = '123567majollo'
const ADMIN_NAME = 'Administrador Majollo'

async function createAdminUser() {
  console.log('🚀 Iniciando criação do usuário administrador...\n')
  
  // Verificar configurações
  if (!firebaseConfig.apiKey || !firebaseConfig.projectId) {
    console.error('❌ Erro: Variáveis de ambiente do Firebase não configuradas.')
    console.error('   Verifique o arquivo .env.local')
    process.exit(1)
  }
  
  console.log('📋 Configurações:')
  console.log(`   Project ID: ${firebaseConfig.projectId}`)
  console.log(`   Email: ${ADMIN_EMAIL}`)
  console.log(`   Senha provisória: ${ADMIN_TEMP_PASSWORD}\n`)
  
  try {
    // Inicializar Firebase
    const app = initializeApp(firebaseConfig)
    const auth = getAuth(app)
    const db = getFirestore(app)
    
    console.log('🔐 Criando usuário no Firebase Authentication...')
    
    // Criar usuário no Authentication
    const userCredential = await createUserWithEmailAndPassword(
      auth, 
      ADMIN_EMAIL, 
      ADMIN_TEMP_PASSWORD
    )
    
    const uid = userCredential.user.uid
    console.log(`✅ Usuário criado! UID: ${uid}\n`)
    
    console.log('📝 Criando documento no Firestore...')
    
    // Criar documento do usuário no Firestore
    await setDoc(doc(db, 'users', uid), {
      email: ADMIN_EMAIL,
      nome: ADMIN_NAME,
      role: 'admin',
      mustChangePassword: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
    
    console.log('✅ Documento criado no Firestore!\n')
    
    console.log('═══════════════════════════════════════════════════')
    console.log('  ✅ USUÁRIO ADMINISTRADOR CRIADO COM SUCESSO!')
    console.log('═══════════════════════════════════════════════════')
    console.log('')
    console.log('  📧 Email:', ADMIN_EMAIL)
    console.log('  🔑 Senha provisória:', ADMIN_TEMP_PASSWORD)
    console.log('  👤 Função: Administrador (acesso total)')
    console.log('')
    console.log('  ⚠️  No primeiro login, o usuário será solicitado')
    console.log('     a definir uma nova senha permanente.')
    console.log('')
    console.log('═══════════════════════════════════════════════════')
    
    process.exit(0)
    
  } catch (error) {
    if (error.code === 'auth/email-already-in-use') {
      console.log('⚠️  O email já está cadastrado no sistema.')
      console.log('   Se precisar redefinir, exclua o usuário no Firebase Console.')
    } else {
      console.error('❌ Erro ao criar usuário:', error.message)
    }
    process.exit(1)
  }
}

createAdminUser()
