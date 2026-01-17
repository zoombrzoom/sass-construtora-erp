import { ContaPagarForm } from '@/components/modules/financeiro/ContaPagarForm'

export default function NovaContaPagarPage() {
  return (
    <div className="px-4 py-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Nova Conta a Pagar</h1>
      <div className="bg-white shadow rounded-lg p-6">
        <ContaPagarForm />
      </div>
    </div>
  )
}
