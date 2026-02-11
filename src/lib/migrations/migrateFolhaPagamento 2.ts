import { createContaPagar, getContasPagarPorTipo } from '@/lib/db/contasPagar'
import { getFolhasPagamento, markFolhaPagamentoMigradaContaPagar } from '@/lib/db/folhaPagamento'
import { toDate } from '@/utils/date'

export async function migrateFolhaPagamentoToContasPagar(params: {
  userId: string
  limit?: number
}): Promise<{ migrated: number; skipped: number }> {
  const limit = Math.max(1, Math.min(800, Number(params.limit) || 300))

  const [folhas, contasFolha] = await Promise.all([
    getFolhasPagamento(),
    getContasPagarPorTipo('folha'),
  ])

  // Prioriza migrar os lançamentos mais recentes primeiro, para que ao trocar o mês
  // no Contas a Pagar as recorrências recém-"seedadas" apareçam sem depender do volume total.
  const folhasOrdenadas = [...folhas].sort(
    (a, b) => toDate(b.dataReferencia).getTime() - toDate(a.dataReferencia).getTime()
  )

  const existingByFolhaId = new Set<string>()
  const contaIdByFolhaId = new Map<string, string>()
  contasFolha.forEach((c) => {
    if (c.folhaPagamentoId) {
      existingByFolhaId.add(c.folhaPagamentoId)
      contaIdByFolhaId.set(c.folhaPagamentoId, c.id)
    }
  })

  let migrated = 0
  let skipped = 0

  for (const folha of folhasOrdenadas) {
    // If already marked as migrated, never recreate (even if conta was deleted).
    if ((folha as any).migradoContaPagarId) {
      skipped += 1
      continue
    }

    if (existingByFolhaId.has(folha.id)) {
      const contaId = contaIdByFolhaId.get(folha.id)
      if (contaId) {
        try {
          await markFolhaPagamentoMigradaContaPagar({ folhaPagamentoId: folha.id, contaPagarId: contaId })
        } catch (err) {
          // best-effort: migration still considered done
          console.warn('Falha ao marcar folha como migrada (já existia conta):', err)
        }
      }
      skipped += 1
      continue
    }

    const status = folha.status === 'pago' ? 'pago' : 'pendente'
    const createdId = await createContaPagar({
      valor: folha.valor,
      dataVencimento: folha.dataReferencia as any,
      dataPagamento: folha.dataPagamento as any,
      tipo: 'folha',
      obraId: 'FOLHA',
      status,
      formaPagamento: folha.formaPagamento || '',
      descricao: folha.funcionarioNome,
      favorecido: folha.funcionarioNome,
      comprovanteUrl: folha.comprovanteUrl || '',
      parcelaAtual: 1,
      totalParcelas: 1,
      recorrenciaMensal: false,
      folhaPagamentoId: folha.id,
      createdBy: params.userId,
    })

    try {
      await markFolhaPagamentoMigradaContaPagar({ folhaPagamentoId: folha.id, contaPagarId: createdId })
    } catch (err) {
      console.warn('Falha ao marcar folha como migrada:', err)
    }

    migrated += 1
    existingByFolhaId.add(folha.id)
    // Evita warning de unused em alguns bundlers quando createContaPagar retorna id.
    void createdId

    if (migrated >= limit) break
  }

  return { migrated, skipped }
}
