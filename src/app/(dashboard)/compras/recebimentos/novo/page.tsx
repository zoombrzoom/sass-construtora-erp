import { RecebimentoFisicoForm } from '@/components/modules/compras/RecebimentoFisicoForm'

export default function NovoRecebimentoPage() {
  return (
    <div>
      <h1 className="text-2xl sm:text-3xl font-bold text-brand mb-6">Novo Recebimento Físico</h1>
      <div className="bg-dark-500 border border-dark-100 rounded-xl p-4 sm:p-6">
        <RecebimentoFisicoForm />
      </div>
    </div>
  )
}
