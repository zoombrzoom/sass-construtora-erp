'use client'

export function FirebaseNotConfigured() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="max-w-md w-full space-y-8 p-8 bg-white rounded-lg shadow-md">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            Firebase Não Configurado
          </h2>
          <p className="text-gray-600 mb-4">
            O sistema precisa das credenciais do Firebase para funcionar.
          </p>
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-left">
            <p className="text-sm text-yellow-800 font-medium mb-2">
              Para configurar:
            </p>
            <ol className="text-sm text-yellow-700 list-decimal list-inside space-y-1">
              <li>Crie um projeto no Firebase Console</li>
              <li>Copie as credenciais do projeto</li>
              <li>Crie o arquivo <code className="bg-yellow-100 px-1 rounded">.env.local</code> na raiz do projeto</li>
              <li>Adicione as variáveis de ambiente conforme o arquivo <code className="bg-yellow-100 px-1 rounded">INSTALACAO.md</code></li>
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
