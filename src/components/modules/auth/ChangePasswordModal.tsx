'use client'

import { useState } from 'react'
import { updatePassword, reauthenticateWithCredential, EmailAuthProvider } from 'firebase/auth'
import { auth } from '@/lib/firebase/config'
import { X, Lock, Eye, EyeOff, CheckCircle, AlertCircle } from 'lucide-react'

interface ChangePasswordModalProps {
  isOpen: boolean
  onClose: () => void
}

export function ChangePasswordModal({ isOpen, onClose }: ChangePasswordModalProps) {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [loading, setLoading] = useState(false)

  const passwordRequirements = [
    { label: 'Mínimo 8 caracteres', valid: newPassword.length >= 8 },
    { label: 'Pelo menos uma letra maiúscula', valid: /[A-Z]/.test(newPassword) },
    { label: 'Pelo menos uma letra minúscula', valid: /[a-z]/.test(newPassword) },
    { label: 'Pelo menos um número', valid: /[0-9]/.test(newPassword) },
  ]

  const allRequirementsMet = passwordRequirements.every(req => req.valid)
  const passwordsMatch = newPassword === confirmPassword && confirmPassword.length > 0

  const resetForm = () => {
    setCurrentPassword('')
    setNewPassword('')
    setConfirmPassword('')
    setError('')
    setSuccess(false)
  }

  const handleClose = () => {
    resetForm()
    onClose()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!allRequirementsMet) {
      setError('A nova senha não atende todos os requisitos')
      return
    }

    if (!passwordsMatch) {
      setError('As senhas não coincidem')
      return
    }

    if (!currentPassword) {
      setError('Digite sua senha atual')
      return
    }

    setLoading(true)

    try {
      const user = auth?.currentUser
      if (!user || !user.email) {
        throw new Error('Usuário não autenticado')
      }

      // Reautenticar o usuário com a senha atual
      const credential = EmailAuthProvider.credential(user.email, currentPassword)
      await reauthenticateWithCredential(user, credential)

      // Atualizar para a nova senha
      await updatePassword(user, newPassword)

      setSuccess(true)
      
      // Fechar modal após sucesso
      setTimeout(() => {
        handleClose()
      }, 2000)

    } catch (err: any) {
      console.error('Erro ao alterar senha:', err)
      
      if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('Senha atual incorreta')
      } else if (err.code === 'auth/too-many-requests') {
        setError('Muitas tentativas. Aguarde um momento e tente novamente.')
      } else if (err.code === 'auth/requires-recent-login') {
        setError('Por segurança, faça logout e login novamente antes de alterar a senha.')
      } else {
        setError(err.message || 'Erro ao alterar senha')
      }
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity"
        onClick={handleClose}
      />
      
      {/* Modal */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-md bg-dark-500 rounded-xl shadow-dark-lg border border-dark-100 transform transition-all">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-dark-100">
            <h3 className="text-lg font-semibold text-gray-100 flex items-center gap-2">
              <Lock className="w-5 h-5 text-brand" />
              Alterar Senha
            </h3>
            <button
              onClick={handleClose}
              className="p-1 text-gray-400 hover:text-gray-200 hover:bg-dark-400 rounded-lg transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Content */}
          <form onSubmit={handleSubmit} className="p-4 space-y-4">
            {success ? (
              <div className="text-center py-8">
                <div className="w-16 h-16 bg-success/20 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle className="w-8 h-8 text-success" />
                </div>
                <h4 className="text-lg font-medium text-gray-100 mb-2">Senha alterada!</h4>
                <p className="text-sm text-gray-400">Sua senha foi atualizada com sucesso.</p>
              </div>
            ) : (
              <>
                {error && (
                  <div className="bg-error/10 border border-error/30 text-error px-4 py-3 rounded-lg text-sm flex items-start gap-2">
                    <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                    {error}
                  </div>
                )}

                {/* Senha atual */}
                <div>
                  <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-300 mb-1.5">
                    Senha Atual
                  </label>
                  <div className="relative">
                    <input
                      id="currentPassword"
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={currentPassword}
                      onChange={(e) => setCurrentPassword(e.target.value)}
                      className="block w-full px-3 pr-10 py-2.5 bg-dark-400 border border-dark-100 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition-all"
                      placeholder="Digite sua senha atual"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-300"
                    >
                      {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Nova senha */}
                <div>
                  <label htmlFor="newPassword" className="block text-sm font-medium text-gray-300 mb-1.5">
                    Nova Senha
                  </label>
                  <div className="relative">
                    <input
                      id="newPassword"
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="block w-full px-3 pr-10 py-2.5 bg-dark-400 border border-dark-100 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition-all"
                      placeholder="Digite a nova senha"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-300"
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Requisitos de senha */}
                {newPassword && (
                  <div className="bg-dark-400 rounded-lg p-3 space-y-1.5">
                    <p className="text-xs font-medium text-gray-400 mb-2">Requisitos:</p>
                    {passwordRequirements.map((req, index) => (
                      <div key={index} className="flex items-center gap-2 text-xs">
                        {req.valid ? (
                          <CheckCircle className="w-3.5 h-3.5 text-success" />
                        ) : (
                          <div className="w-3.5 h-3.5 rounded-full border border-gray-600" />
                        )}
                        <span className={req.valid ? 'text-success' : 'text-gray-500'}>
                          {req.label}
                        </span>
                      </div>
                    ))}
                  </div>
                )}

                {/* Confirmar senha */}
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-300 mb-1.5">
                    Confirmar Nova Senha
                  </label>
                  <div className="relative">
                    <input
                      id="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className={`block w-full px-3 pr-10 py-2.5 bg-dark-400 border rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition-all ${
                        confirmPassword && !passwordsMatch ? 'border-error' : 'border-dark-100'
                      }`}
                      placeholder="Confirme a nova senha"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-500 hover:text-gray-300"
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  {confirmPassword && !passwordsMatch && (
                    <p className="mt-1 text-xs text-error">As senhas não coincidem</p>
                  )}
                </div>

                {/* Botões */}
                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={handleClose}
                    className="flex-1 py-2.5 px-4 border border-dark-100 rounded-lg text-sm font-medium text-gray-300 hover:bg-dark-400 transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={loading || !allRequirementsMet || !passwordsMatch || !currentPassword}
                    className="flex-1 py-2.5 px-4 bg-brand text-dark-800 rounded-lg text-sm font-semibold hover:bg-brand-light disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
                  >
                    {loading ? (
                      <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                    ) : (
                      'Alterar Senha'
                    )}
                  </button>
                </div>
              </>
            )}
          </form>
        </div>
      </div>
    </div>
  )
}
