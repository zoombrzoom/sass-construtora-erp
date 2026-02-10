import { FolhaPagamentoForm } from '@/components/modules/financeiro/FolhaPagamentoForm'

export default function NovaFolhaPagamentoPage() {
  return (
    <div>
      <h1 className="text-2xl sm:text-3xl font-bold text-brand mb-6">Novo Lançamento de Folha</h1>
      <div className="bg-dark-500 border border-dark-100 rounded-xl p-4 sm:p-6">
        <FolhaPagamentoForm />
      </div>
    </div>
  )
}
