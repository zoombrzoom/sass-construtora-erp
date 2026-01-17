import { getContasPagar } from './contasPagar'
import { getContasReceber } from './contasReceber'
import { getCotacoes } from './cotacoes'
import { getFluxoCaixaHoje } from './fluxoCaixa'
import { isSameDay, isBefore } from 'date-fns'

export interface DashboardData {
  saldoGeral: number
  totalPagarHoje: number
  totalReceberHoje: number
  cotacoesPendentes: number
  contasVencidas: number
}

export async function getDashboardData(): Promise<DashboardData> {
  try {
    const hoje = new Date()
    
    // Buscar contas a pagar
    const contasPagar = await getContasPagar()
    
    // Buscar contas a receber
    const contasReceber = await getContasReceber()
    
    // Buscar cotações pendentes
    const cotacoes = await getCotacoes({ status: 'pendente' })
    
    // Calcular total a pagar hoje
    const totalPagarHoje = contasPagar
      .filter(conta => {
        const dataVenc = new Date(conta.dataVencimento)
        return isSameDay(dataVenc, hoje) && conta.status === 'pendente'
      })
      .reduce((sum, conta) => sum + conta.valor, 0)
    
    // Calcular total a receber hoje
    const totalReceberHoje = contasReceber
      .filter(conta => {
        const dataVenc = new Date(conta.dataVencimento)
        return isSameDay(dataVenc, hoje) && conta.status === 'pendente'
      })
      .reduce((sum, conta) => sum + conta.valor, 0)
    
    // Contas vencidas
    const contasVencidas = contasPagar.filter(conta => {
      const dataVenc = new Date(conta.dataVencimento)
      return isBefore(dataVenc, hoje) && conta.status === 'pendente'
    }).length
    
    // Calcular saldo geral (entradas - saídas)
    const totalPago = contasPagar
      .filter(conta => conta.status === 'pago')
      .reduce((sum, conta) => sum + conta.valor, 0)
    
    const totalRecebido = contasReceber
      .filter(conta => conta.status === 'recebido')
      .reduce((sum, conta) => sum + conta.valor, 0)
    
    const saldoGeral = totalRecebido - totalPago
    
    return {
      saldoGeral,
      totalPagarHoje,
      totalReceberHoje,
      cotacoesPendentes: cotacoes.length,
      contasVencidas,
    }
  } catch (error) {
    console.error('Erro ao buscar dados do dashboard:', error)
    throw error
  }
}
