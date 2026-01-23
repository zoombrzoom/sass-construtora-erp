'use client'

import { AlertTriangle } from 'lucide-react'

export function FirebaseNotConfigured() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-dark-800 p-4">
      <div className="max-w-md w-full space-y-6 p-6 sm:p-8 bg-dark-500 rounded-xl border border-dark-100 shadow-dark-lg">
        <div className="text-center">
          <div className="flex justify-center mb-4">
            <div className="p-3 bg-warning/20 rounded-full">
              <AlertTriangle className="w-8 h-8 text-warning" />
            </div>
          </div>
          <h2 className="text-xl sm:text-2xl font-bold text-gray-100 mb-4">
            Firebase Não Configurado
          </h2>
          <p className="text-gray-400 mb-6">
            O sistema precisa das credenciais do Firebase para funcionar.
          </p>
          <div className="bg-warning/10 border border-warning/30 rounded-lg p-4 text-left">
            <p className="text-sm text-warning font-medium mb-2">
              Para configurar:
            </p>
            <ol className="text-sm text-gray-300 list-decimal list-inside space-y-1">
              <li>Crie um projeto no Firebase Console</li>
              <li>Copie as credenciais do projeto</li>
              <li>Crie o arquivo <code className="bg-dark-400 px-1.5 py-0.5 rounded text-brand">.env.local</code> na raiz do projeto</li>
              <li>Adicione as variáveis de ambiente conforme o arquivo <code className="bg-dark-400 px-1.5 py-0.5 rounded text-brand">INSTALACAO.md</code></li>
            </ol>
          </div>
          <p className="text-xs text-gray-500 mt-4">
            Consulte o arquivo INSTALACAO.md para instruções detalhadas.
          </p>
        </div>
      </div>
    </div>
  )
}
