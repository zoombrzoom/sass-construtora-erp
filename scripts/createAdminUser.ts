/**
 * Script para criar o usuário administrador inicial
 * 
 * IMPORTANTE: Este script deve ser executado APENAS UMA VEZ para criar o usuário admin.
 * 
 * Para executar:
 * 1. Certifique-se de ter o Firebase Admin SDK configurado
 * 2. Execute: npx ts-node scripts/createAdminUser.ts
 * 
 * Ou você pode criar o usuário manualmente no Firebase Console:
 * 1. Vá em Authentication > Users > Add user
 * 2. Email: majollo@majollo.com.br
 * 3. Senha: 123567majollo
 * 4. Depois, vá em Firestore > users > adicionar documento com o ID do usuário criado
 */

import * as admin from 'firebase-admin'

// Inicializar o Firebase Admin (precisa do arquivo serviceAccount.json)
// Baixe o arquivo em: Firebase Console > Project Settings > Service Accounts > Generate new private key
const serviceAccount = require('./serviceAccount.json')

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
})

const auth = admin.auth()
const db = admin.firestore()

async function createAdminUser() {
  const email = 'majollo@majollo.com.br'
  const temporaryPassword = '123567majollo'
  
  try {
    console.log('Criando usuário administrador...')
    
    // Criar usuário no Firebase Authentication
    const userRecord = await auth.createUser({
      email: email,
      password: temporaryPassword,
      emailVerified: true,
      displayName: 'Administrador Majollo',
    })
    
    console.log('Usuário criado no Authentication:', userRecord.uid)
    
    // Criar documento do usuário no Firestore
    await db.collection('users').doc(userRecord.uid).set({
      email: email,
      nome: 'Administrador Majollo',
      role: 'admin',
      mustChangePassword: true, // Força troca de senha no primeiro acesso
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    })
    
    console.log('Documento do usuário criado no Firestore')
    console.log('')
    console.log('====================================')
    console.log('USUÁRIO ADMINISTRADOR CRIADO COM SUCESSO!')
    console.log('====================================')
    console.log('')
    console.log('Email:', email)
    console.log('Senha provisória:', temporaryPassword)
    console.log('')
    console.log('No primeiro login, o usuário será solicitado a definir uma nova senha.')
    console.log('')
    
  } catch (error: any) {
    if (error.code === 'auth/email-already-exists') {
      console.log('O usuário já existe. Atualizando apenas o documento no Firestore...')
      
      // Buscar o usuário existente
      const existingUser = await auth.getUserByEmail(email)
      
      // Atualizar ou criar documento no Firestore
      await db.collection('users').doc(existingUser.uid).set({
        email: email,
        nome: 'Administrador Majollo',
        role: 'admin',
        mustChangePassword: true,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true })
      
      console.log('Documento do usuário atualizado no Firestore')
      console.log('')
      console.log('Para redefinir a senha provisória, use o Firebase Console.')
    } else {
      console.error('Erro ao criar usuário:', error)
    }
  }
  
  process.exit(0)
}

createAdminUser()
