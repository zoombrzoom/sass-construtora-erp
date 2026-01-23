import { ContaPagarForm } from '@/components/modules/financeiro/ContaPagarForm'

export default function NovaContaPagarPage() {
  return (
    <div>
      <h1 className="text-2xl sm:text-3xl font-bold text-brand mb-6">Nova Conta a Pagar</h1>
      <div className="bg-dark-500 border border-dark-100 rounded-xl p-4 sm:p-6">
        <ContaPagarForm />
      </div>
    </div>
  )
}
