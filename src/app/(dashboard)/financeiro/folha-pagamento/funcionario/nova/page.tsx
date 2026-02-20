'use client'

import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { FolhaFuncionarioForm } from '@/components/modules/financeiro/FolhaFuncionarioForm'

export default function NovaFolhaFuncionarioPage() {
  return (
    <div>
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-brand">Novo Funcionário</h1>
        <Link
          href="/financeiro/folha-pagamento"
          className="flex items-center px-4 py-2 border border-dark-100 rounded-lg text-gray-400 hover:border-brand hover:text-brand transition-colors"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Voltar
        </Link>
      </div>
      <div className="bg-dark-500 border border-dark-100 rounded-xl p-4 sm:p-6">
        <FolhaFuncionarioForm />
      </div>
    </div>
  )
}
