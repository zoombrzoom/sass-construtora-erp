import { RequisicaoForm } from '@/components/modules/compras/RequisicaoForm'

export default function NovaRequisicaoPage() {
  return (
    <div>
      <h1 className="text-2xl sm:text-3xl font-bold text-brand mb-6">Novo Pedido e Compra</h1>
      <div className="bg-dark-500 border border-dark-100 rounded-xl p-4 sm:p-6">
        <RequisicaoForm />
      </div>
    </div>
  )
}
