import { RecebimentoFisicoForm } from '@/components/modules/compras/RecebimentoFisicoForm'

export default function NovoRecebimentoPage() {
  return (
    <div className="px-4 py-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Novo Recebimento Físico</h1>
      <div className="bg-white shadow rounded-lg p-6">
        <RecebimentoFisicoForm />
      </div>
    </div>
  )
}
