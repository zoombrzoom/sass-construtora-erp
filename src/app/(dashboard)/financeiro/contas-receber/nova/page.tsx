import { ContaReceberForm } from '@/components/modules/financeiro/ContaReceberForm'

export default function NovaContaReceberPage() {
  return (
    <div className="px-4 py-6">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">Nova Conta a Receber</h1>
      <div className="bg-white shadow rounded-lg p-6">
        <ContaReceberForm />
      </div>
    </div>
  )
}
