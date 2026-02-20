'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function NovaFolhaPagamentoRedirectPage() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/financeiro/folha-pagamento/funcionario/nova')
  }, [router])

  return (
    <div className="flex items-center justify-center py-12 text-gray-400">
      Redirecionando para Novo Funcionário...
    </div>
  )
}
