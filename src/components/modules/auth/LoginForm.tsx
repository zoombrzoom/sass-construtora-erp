'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { auth } from '@/lib/firebase/config'
import { FirebaseNotConfigured } from './FirebaseNotConfigured'
import { Mail, Lock, LogIn } from 'lucide-react'

export function LoginForm() {
  const [firebaseConfigured, setFirebaseConfigured] = useState(true)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const router = useRouter()

  useEffect(() => {
    const checkFirebase = () => {
      if (auth) {
        setFirebaseConfigured(true)
      } else {
        setTimeout(() => {
          setFirebaseConfigured(!!auth)
        }, 100)
      }
    }
    checkFirebase()
  }, [])

  if (!firebaseConfigured) {
    return <FirebaseNotConfigured />
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const normalizedEmail = email.trim().toLowerCase()
      const result = await login(normalizedEmail, password)
      
      // Verificar se precisa trocar a senha (primeiro acesso)
      if (result.mustChangePassword) {
        router.push('/set-password')
      } else {
        router.push('/dashboard')
      }
    } catch (err: any) {
      const message = err?.message || 'Erro ao fazer login'
      if (message.includes('auth/invalid-credential')) {
        setError('Email ou senha inválidos. Confira os dados e tente novamente.')
      } else {
        setError(message)
      }
    } finally {
      setLoading(false)
    }
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
          <p className="text-center text-sm text-gray-400">
            Faça login para acessar o sistema
          </p>
        </div>
        
        <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-error/10 border border-error/30 text-error px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}
          
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1.5">
              Email
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Mail className="h-5 w-5 text-gray-500" />
              </div>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onBlur={(e) => setEmail(e.target.value.trim().toLowerCase())}
                className="block w-full pl-10 pr-3 py-3 bg-dark-400 border border-dark-100 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition-all min-h-touch"
                placeholder="seu@email.com"
              />
            </div>
          </div>
          
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1.5">
              Senha
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-500" />
              </div>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full pl-10 pr-3 py-3 bg-dark-400 border border-dark-100 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition-all min-h-touch"
                placeholder="••••••••"
              />
            </div>
          </div>
          
          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg text-sm font-semibold text-dark-800 bg-brand hover:bg-brand-light focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-dark-500 focus:ring-brand disabled:opacity-50 disabled:cursor-not-allowed transition-all min-h-touch shadow-brand"
          >
            {loading ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Entrando...
              </span>
            ) : (
              <span className="flex items-center">
                <LogIn className="w-4 h-4 mr-2" />
                Entrar
              </span>
            )}
          </button>
        </form>
        
        <p className="text-center text-xs text-gray-600 mt-6">
          Sistema de Gestão Majollo
        </p>
      </div>
    </div>
  )
}
