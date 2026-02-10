import { ContaPagarForm } from '@/components/modules/financeiro/ContaPagarForm'

export default function NovaContaPagarPage({
  searchParams,
}: {
  searchParams?: { pessoal?: string | string[] }
}) {
  const pessoalParam = Array.isArray(searchParams?.pessoal) ? searchParams?.pessoal[0] : searchParams?.pessoal
  const pessoal = pessoalParam === '1' || pessoalParam === 'true'
  return (
    <div>
      <h1 className="text-2xl sm:text-3xl font-bold text-brand mb-6">Nova Conta a Pagar</h1>
      <div className="bg-dark-500 border border-dark-100 rounded-xl p-4 sm:p-6">
        <ContaPagarForm pessoal={pessoal} />
      </div>
    </div>
  )
}
