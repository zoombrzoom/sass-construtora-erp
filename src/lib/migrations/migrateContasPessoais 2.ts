import { createContaPagar } from '@/lib/db/contasPagar'
import { getCategoriasPessoais, getLancamentosPessoais, marcarLancamentoPessoalMigrado } from '@/lib/db/contasPessoais'

export async function migrateContasPessoaisToContasPagar(params: {
  userId: string
  limit?: number
}): Promise<{ migrated: number; skipped: number }> {
  const limit = Math.max(1, Math.min(500, Number(params.limit) || 200))

  const [categorias, lancamentos] = await Promise.all([
    getCategoriasPessoais(),
    getLancamentosPessoais(),
  ])

  const categoriaNomePorId = new Map<string, string>()
  categorias.forEach((c) => categoriaNomePorId.set(c.id, c.nome))

  let migrated = 0
  let skipped = 0

  for (const lanc of lancamentos) {
    if (lanc.migradoContaPagarId) {
      skipped += 1
      continue
    }

    const categoriaNome = categoriaNomePorId.get(lanc.categoriaId) || 'Pessoal'
    const descricao = (lanc.descricao || '').trim()
    const descricaoFinal = descricao ? `${categoriaNome} - ${descricao}` : categoriaNome
    const baseDate = lanc.createdAt || new Date()
    const pago = Boolean(lanc.pago)

    const contaId = await createContaPagar({
      valor: lanc.valor,
      dataVencimento: baseDate,
      tipo: 'outro',
      obraId: 'PESSOAL',
      pessoal: true,
      status: pago ? 'pago' : 'pendente',
      descricao: descricaoFinal,
      comprovanteUrl: lanc.comprovanteUrl || '',
      createdBy: params.userId,
      // Informacoes de pagamento antigas nao existem aqui.
      formaPagamento: '',
      dataPagamento: pago ? baseDate : undefined,
      parcelaAtual: 1,
      totalParcelas: 1,
      recorrenciaMensal: false,
    })

    await marcarLancamentoPessoalMigrado(lanc.id, contaId)
    migrated += 1

    if (migrated >= limit) break
  }

  return { migrated, skipped }
}

