import { RequisicaoForm } from '@/components/modules/compras/RequisicaoForm'

export default function NovaRequisicaoPage() {
  return (
    <div className="px-4 py-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Nova Requisição</h1>
      <div className="bg-white shadow rounded-lg p-6">
        <RequisicaoForm />
      </div>
    </div>
  )
}
