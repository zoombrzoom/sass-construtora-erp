import { getContasPagar } from './contasPagar'
import { getContasReceber } from './contasReceber'
import { ContaPagar, ContaReceber } from '@/types/financeiro'
import { format, startOfDay, endOfDay, isSameDay, parseISO } from 'date-fns'

export interface FluxoCaixaDia {
  data: Date
  entradas: number
  saidas: number
  saldo: number
  contasPagar: ContaPagar[]
  contasReceber: ContaReceber[]
}

export interface FluxoCaixaPeriodo {
  inicio: Date
  fim: Date
  dias: FluxoCaixaDia[]
  saldoInicial: number
  saldoFinal: number
  totalEntradas: number
  totalSaidas: number
}

export async function getFluxoCaixa(inicio: Date, fim: Date): Promise<FluxoCaixaPeriodo> {
  try {
    // Buscar todas as contas no período
    const contasPagar = await getContasPagar({
      dataVencimentoInicio: inicio,
      dataVencimentoFim: fim,
    })
    
    const contasReceber = await getContasReceber()
    
    // Filtrar contas receber no período
    const contasReceberFiltradas = contasReceber.filter(conta => {
      const dataVenc = new Date(conta.dataVencimento)
      return dataVenc >= inicio && dataVenc <= fim
    })
    
    // Agrupar por dia
    const diasMap = new Map<string, FluxoCaixaDia>()
    
    // Inicializar todos os dias do período
    const currentDate = new Date(inicio)
    while (currentDate <= fim) {
      const dateKey = format(currentDate, 'yyyy-MM-dd')
      diasMap.set(dateKey, {
        data: new Date(currentDate),
        entradas: 0,
        saidas: 0,
        saldo: 0,
        contasPagar: [],
        contasReceber: [],
      })
      currentDate.setDate(currentDate.getDate() + 1)
    }
    
    // Adicionar contas a pagar
    contasPagar.forEach(conta => {
      const dataVenc = new Date(conta.dataVencimento)
      const dateKey = format(dataVenc, 'yyyy-MM-dd')
      const dia = diasMap.get(dateKey)
      
      if (dia) {
        dia.saidas += conta.valor
        dia.contasPagar.push(conta)
      }
    })
    
    // Adicionar contas a receber
    contasReceberFiltradas.forEach(conta => {
      const dataVenc = new Date(conta.dataVencimento)
      const dateKey = format(dataVenc, 'yyyy-MM-dd')
      const dia = diasMap.get(dateKey)
      
      if (dia) {
        dia.entradas += conta.valor
        dia.contasReceber.push(conta)
      }
    })
    
    // Calcular saldos
    let saldoAcumulado = 0
    const dias = Array.from(diasMap.values()).sort((a, b) => 
      a.data.getTime() - b.data.getTime()
    )
    
    dias.forEach(dia => {
      saldoAcumulado = saldoAcumulado + dia.entradas - dia.saidas
      dia.saldo = saldoAcumulado
    })
    
    const totalEntradas = dias.reduce((sum, dia) => sum + dia.entradas, 0)
    const totalSaidas = dias.reduce((sum, dia) => sum + dia.saidas, 0)
    
    return {
      inicio,
      fim,
      dias,
      saldoInicial: 0, // Pode ser calculado buscando saldo anterior
      saldoFinal: saldoAcumulado,
      totalEntradas,
      totalSaidas,
    }
  } catch (error) {
    console.error('Erro ao calcular fluxo de caixa:', error)
    throw error
  }
}

export async function getFluxoCaixaHoje(): Promise<FluxoCaixaDia> {
  const hoje = new Date()
  const periodo = await getFluxoCaixa(hoje, hoje)
  return periodo.dias[0] || {
    data: hoje,
    entradas: 0,
    saidas: 0,
    saldo: 0,
    contasPagar: [],
    contasReceber: [],
  }
}
