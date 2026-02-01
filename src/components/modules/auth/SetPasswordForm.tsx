'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { updatePassword } from 'firebase/auth'
import { doc, updateDoc } from 'firebase/firestore'
import { auth, db } from '@/lib/firebase/config'
import { Lock, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react'

interface SetPasswordFormProps {
  userId: string
  userEmail: string
}

export function SetPasswordForm({ userId, userEmail }: SetPasswordFormProps) {
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const passwordRequirements = [
    { label: 'Mínimo 8 caracteres', valid: password.length >= 8 },
    { label: 'Pelo menos uma letra maiúscula', valid: /[A-Z]/.test(password) },
    { label: 'Pelo menos uma letra minúscula', valid: /[a-z]/.test(password) },
    { label: 'Pelo menos um número', valid: /[0-9]/.test(password) },
  ]

  const allRequirementsMet = passwordRequirements.every(req => req.valid)
  const passwordsMatch = password === confirmPassword && confirmPassword.length > 0

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!allRequirementsMet) {
      setError('A senha não atende todos os requisitos')
      return
    }

    if (!passwordsMatch) {
      setError('As senhas não coincidem')
      return
    }

    setLoading(true)

    try {
      const currentUser = auth?.currentUser
      if (!currentUser) {
        throw new Error('Usuário não autenticado')
      }

      // Atualizar senha no Firebase Auth
      await updatePassword(currentUser, password)

      // Atualizar flag no Firestore
      if (db) {
        await updateDoc(doc(db, 'users', userId), {
          mustChangePassword: false,
          updatedAt: new Date(),
        })
      }

      // Redirecionar para o dashboard
      router.push('/dashboard')
    } catch (err: any) {
      console.error('Erro ao atualizar senha:', err)
      if (err.code === 'auth/requires-recent-login') {
        setError('Por segurança, faça login novamente antes de alterar a senha.')
      } else {
        setError(err.message || 'Erro ao definir nova senha')
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
          <h2 className="text-center text-xl font-bold text-gray-100 mb-2">
            Defina sua senha
          </h2>
          <p className="text-center text-sm text-gray-400">
            Bem-vindo! Por favor, defina uma senha segura para sua conta.
          </p>
          <p className="text-center text-xs text-gray-500 mt-2">
            {userEmail}
          </p>
        </div>
        
        <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-error/10 border border-error/30 text-error px-4 py-3 rounded-lg text-sm flex items-start gap-2">
              <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
              {error}
            </div>
          )}
          
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1.5">
              Nova Senha
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-500" />
              </div>
              <input
                id="password"
                name="password"
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full pl-10 pr-10 py-3 bg-dark-400 border border-dark-100 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition-all min-h-touch"
                placeholder="Digite sua nova senha"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-300"
              >
                {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
          </div>

          {/* Requisitos de senha */}
          <div className="bg-dark-400 rounded-lg p-3 space-y-2">
            <p className="text-xs font-medium text-gray-400 mb-2">Requisitos da senha:</p>
            {passwordRequirements.map((req, index) => (
              <div key={index} className="flex items-center gap-2 text-xs">
                {req.valid ? (
                  <CheckCircle className="w-4 h-4 text-success" />
                ) : (
                  <div className="w-4 h-4 rounded-full border border-gray-600" />
                )}
                <span className={req.valid ? 'text-success' : 'text-gray-500'}>
                  {req.label}
                </span>
              </div>
            ))}
          </div>
          
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-1.5">
              Confirmar Senha
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-gray-500" />
              </div>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type={showConfirmPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className={`block w-full pl-10 pr-10 py-3 bg-dark-400 border rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition-all min-h-touch ${
                  confirmPassword && !passwordsMatch ? 'border-error' : 'border-dark-100'
                }`}
                placeholder="Confirme sua nova senha"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-300"
              >
                {showConfirmPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
              </button>
            </div>
            {confirmPassword && !passwordsMatch && (
              <p className="mt-1 text-xs text-error">As senhas não coincidem</p>
            )}
          </div>
          
          <button
            type="submit"
            disabled={loading || !allRequirementsMet || !passwordsMatch}
            className="w-full flex justify-center items-center py-3 px-4 border border-transparent rounded-lg text-sm font-semibold text-dark-800 bg-brand hover:bg-brand-light focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-dark-500 focus:ring-brand disabled:opacity-50 disabled:cursor-not-allowed transition-all min-h-touch shadow-brand"
          >
            {loading ? (
              <span className="flex items-center">
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Salvando...
              </span>
            ) : (
              <span className="flex items-center">
                <CheckCircle className="w-4 h-4 mr-2" />
                Definir Senha e Continuar
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
