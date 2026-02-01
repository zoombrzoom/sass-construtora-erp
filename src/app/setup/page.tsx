'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { createUserWithEmailAndPassword } from 'firebase/auth'
import { doc, setDoc, collection, getDocs, query, where, serverTimestamp } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase/config'
import { UserPlus, Shield, AlertTriangle, CheckCircle } from 'lucide-react'

export default function SetupPage() {
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [hasAdmin, setHasAdmin] = useState(false)
  const [success, setSuccess] = useState(false)
  const [error, setError] = useState('')
  const router = useRouter()

  // Dados do admin pré-configurados
  const adminEmail = 'majollo@majollo.com.br'
  const adminPassword = '123567majollo'
  const adminName = 'Administrador Majollo'

  useEffect(() => {
    checkExistingAdmin()
  }, [])

  const checkExistingAdmin = async () => {
    if (!db) {
      setError('Firebase não configurado')
      setLoading(false)
      return
    }

    try {
      // Verificar se já existe um admin
      const usersRef = collection(db, 'users')
      const q = query(usersRef, where('role', '==', 'admin'))
      const snapshot = await getDocs(q)
      
      if (!snapshot.empty) {
        setHasAdmin(true)
      }
    } catch (err) {
      console.error('Erro ao verificar admin:', err)
    }
    
    setLoading(false)
  }

  const createAdmin = async () => {
    if (!auth || !db) {
      setError('Firebase não configurado')
      return
    }

    setCreating(true)
    setError('')

    try {
      // Criar usuário no Authentication
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        adminEmail,
        adminPassword
      )

      const uid = userCredential.user.uid

      // Criar documento no Firestore
      await setDoc(doc(db, 'users', uid), {
        email: adminEmail,
        nome: adminName,
        role: 'admin',
        mustChangePassword: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      })

      setSuccess(true)
      
      // Aguardar um pouco e redirecionar
      setTimeout(() => {
        router.push('/login')
      }, 3000)

    } catch (err: any) {
      if (err.code === 'auth/email-already-in-use') {
        setError('Este email já está cadastrado. Vá para a página de login.')
      } else {
        setError(err.message || 'Erro ao criar administrador')
      }
    } finally {
      setCreating(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-800">
        <div className="flex flex-col items-center gap-4">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-brand"></div>
          <p className="text-gray-400">Verificando sistema...</p>
        </div>
      </div>
    )
  }

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-800 px-4">
        <div className="max-w-md w-full space-y-6 p-8 bg-dark-500 rounded-xl shadow-dark-lg border border-dark-100 text-center">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-success/20 rounded-full flex items-center justify-center">
              <CheckCircle className="w-8 h-8 text-success" />
            </div>
          </div>
          <h2 className="text-xl font-bold text-gray-100">Administrador Criado!</h2>
          <div className="bg-dark-400 rounded-lg p-4 text-left space-y-2">
            <p className="text-sm text-gray-300">
              <span className="text-gray-500">Email:</span> {adminEmail}
            </p>
            <p className="text-sm text-gray-300">
              <span className="text-gray-500">Senha provisória:</span> {adminPassword}
            </p>
          </div>
          <p className="text-sm text-gray-400">
            Redirecionando para o login...
          </p>
          <div className="animate-spin rounded-full h-6 w-6 border-t-2 border-b-2 border-brand mx-auto"></div>
        </div>
      </div>
    )
  }

  if (hasAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark-800 px-4">
        <div className="max-w-md w-full space-y-6 p-8 bg-dark-500 rounded-xl shadow-dark-lg border border-dark-100 text-center">
          <div className="flex justify-center">
            <div className="w-16 h-16 bg-warning/20 rounded-full flex items-center justify-center">
              <AlertTriangle className="w-8 h-8 text-warning" />
            </div>
          </div>
          <h2 className="text-xl font-bold text-gray-100">Sistema já configurado</h2>
          <p className="text-gray-400">
            Já existe um administrador cadastrado no sistema.
          </p>
          <button
            onClick={() => router.push('/login')}
            className="w-full py-3 px-4 bg-brand text-dark-800 font-semibold rounded-lg hover:bg-brand-light transition-colors"
          >
            Ir para Login
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-800 px-4">
      <div className="max-w-md w-full space-y-8 p-6 sm:p-8 bg-dark-500 rounded-xl shadow-dark-lg border border-dark-100">
        <div>
          <div className="flex justify-center mb-6">
            <Image 
              src="/logo_x1.png" 
              alt="Majollo" 
              width={180}
              height={60}
              className="h-14 w-auto"
              priority
            />
          </div>
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-brand/20 rounded-full flex items-center justify-center">
              <Shield className="w-8 h-8 text-brand" />
            </div>
          </div>
          <h2 className="text-center text-xl font-bold text-gray-100 mb-2">
            Configuração Inicial
          </h2>
          <p className="text-center text-sm text-gray-400">
            Crie o primeiro administrador do sistema
          </p>
        </div>

        <div className="bg-dark-400 rounded-lg p-4 space-y-3">
          <h3 className="text-sm font-medium text-gray-300">Dados do Administrador:</h3>
          <div className="space-y-2 text-sm">
            <p className="text-gray-400">
              <span className="text-gray-500">Email:</span> {adminEmail}
            </p>
            <p className="text-gray-400">
              <span className="text-gray-500">Nome:</span> {adminName}
            </p>
            <p className="text-gray-400">
              <span className="text-gray-500">Senha provisória:</span> {adminPassword}
            </p>
          </div>
          <p className="text-xs text-gray-500 mt-2">
            * A senha deverá ser alterada no primeiro acesso
          </p>
        </div>

        {error && (
          <div className="bg-error/10 border border-error/30 text-error px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <button
          onClick={createAdmin}
          disabled={creating}
          className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg text-sm font-semibold text-dark-800 bg-brand hover:bg-brand-light focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-dark-500 focus:ring-brand disabled:opacity-50 disabled:cursor-not-allowed transition-all min-h-touch shadow-brand"
        >
          {creating ? (
            <span className="flex items-center">
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              Criando...
            </span>
          ) : (
            <span className="flex items-center">
              <UserPlus className="w-4 h-4 mr-2" />
              Criar Administrador
            </span>
          )}
        </button>

        <p className="text-center text-xs text-gray-600">
          Sistema de Gestão Majollo
        </p>
      </div>
    </div>
  )
}
