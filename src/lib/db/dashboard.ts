import { getContasPagar } from './contasPagar'
import { getContasReceber } from './contasReceber'
import { getCotacoes } from './cotacoes'
import { getObras } from './obras'
import { getRequisicoes } from './requisicoes'
import { isSameDay, isBefore, format, subMonths, startOfMonth, endOfMonth, isWithinInterval } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { toDate } from '@/utils/date'

export interface FluxoMensal {
  mes: string
  entradas: number
  saidas: number
  saldo: number
}

export interface GastoPorObra {
  obraId: string
  obraNome: string
  valor: number
  percentual: number
}

export interface ContaProxima {
  id: string
  descricao: string
  valor: number
  dataVencimento: Date
  tipo: 'pagar' | 'receber'
  diasRestantes: number
}

export interface ObraResumo {
  id: string
  nome: string
  status: string
  totalGasto: number
  orcamento: number
  percentualGasto: number
}

export interface DashboardData {
  // Resumo principal
  saldoGeral: number
  totalPagarHoje: number
  totalReceberHoje: number
  cotacoesPendentes: number
  contasVencidas: number
  
  // Totais do mês
  totalPagarMes: number
  totalReceberMes: number
  totalPagoMes: number
  totalRecebidoMes: number
  
  // Contadores
  obrasAtivas: number
  requisicoesAbertas: number
  pedidosPendentes: number
  
  // Gráficos
  fluxoMensal: FluxoMensal[]
  gastosPorObra: GastoPorObra[]
  
  // Listas
  proximasContas: ContaProxima[]
  obrasResumo: ObraResumo[]
}

export async function getDashboardData(): Promise<DashboardData> {
  try {
    const hoje = new Date()
    const inicioMes = startOfMonth(hoje)
    const fimMes = endOfMonth(hoje)
    
    // Buscar dados
    const [contasPagar, contasReceber, cotacoes, obras, requisicoes] = await Promise.all([
      getContasPagar(),
      getContasReceber(),
      getCotacoes({ status: 'pendente' }),
      getObras(),
      getRequisicoes()
    ])
    
    // === CÁLCULOS PRINCIPAIS ===
    
    // Total a pagar hoje
    const totalPagarHoje = contasPagar
      .filter(conta => {
        const dataVenc = toDate(conta.dataVencimento)
        return isSameDay(dataVenc, hoje) && conta.status === 'pendente'
      })
      .reduce((sum, conta) => sum + conta.valor, 0)
    
    // Total a receber hoje
    const totalReceberHoje = contasReceber
      .filter(conta => {
        const dataVenc = toDate(conta.dataVencimento)
        return isSameDay(dataVenc, hoje) && conta.status === 'pendente'
      })
      .reduce((sum, conta) => sum + conta.valor, 0)
    
    // Contas vencidas
    const contasVencidas = contasPagar.filter(conta => {
      const dataVenc = toDate(conta.dataVencimento)
      return isBefore(dataVenc, hoje) && !isSameDay(dataVenc, hoje) && conta.status === 'pendente'
    }).length
    
    // Saldo geral
    const totalPago = contasPagar
      .filter(conta => conta.status === 'pago')
      .reduce((sum, conta) => sum + conta.valor, 0)
    
    const totalRecebido = contasReceber
      .filter(conta => conta.status === 'recebido')
      .reduce((sum, conta) => sum + conta.valor, 0)
    
    const saldoGeral = totalRecebido - totalPago
    
    // === TOTAIS DO MÊS ===
    
    const totalPagarMes = contasPagar
      .filter(conta => {
        const dataVenc = toDate(conta.dataVencimento)
        return isWithinInterval(dataVenc, { start: inicioMes, end: fimMes }) && conta.status === 'pendente'
      })
      .reduce((sum, conta) => sum + conta.valor, 0)
    
    const totalReceberMes = contasReceber
      .filter(conta => {
        const dataVenc = toDate(conta.dataVencimento)
        return isWithinInterval(dataVenc, { start: inicioMes, end: fimMes }) && conta.status === 'pendente'
      })
      .reduce((sum, conta) => sum + conta.valor, 0)
    
    const totalPagoMes = contasPagar
      .filter(conta => {
        if (conta.status !== 'pago' || !conta.dataPagamento) return false
        const dataPag = toDate(conta.dataPagamento)
        return isWithinInterval(dataPag, { start: inicioMes, end: fimMes })
      })
      .reduce((sum, conta) => sum + conta.valor, 0)
    
    const totalRecebidoMes = contasReceber
      .filter(conta => {
        if (conta.status !== 'recebido' || !conta.dataRecebimento) return false
        const dataRec = toDate(conta.dataRecebimento)
        return isWithinInterval(dataRec, { start: inicioMes, end: fimMes })
      })
      .reduce((sum, conta) => sum + conta.valor, 0)
    
    // === CONTADORES ===
    
    const obrasAtivas = obras.filter(o => o.status === 'ativa').length
    const requisicoesAbertas = requisicoes.filter(r => r.status === 'pendente' || r.status === 'aprovado').length
    const pedidosPendentes = cotacoes.length
    
    // === FLUXO MENSAL (últimos 6 meses) ===
    
    const fluxoMensal: FluxoMensal[] = []
    for (let i = 5; i >= 0; i--) {
      const mesData = subMonths(hoje, i)
      const inicioMesCalc = startOfMonth(mesData)
      const fimMesCalc = endOfMonth(mesData)
      
      const entradasMes = contasReceber
        .filter(conta => {
          if (conta.status !== 'recebido' || !conta.dataRecebimento) return false
          const dataRec = toDate(conta.dataRecebimento)
          return isWithinInterval(dataRec, { start: inicioMesCalc, end: fimMesCalc })
        })
        .reduce((sum, conta) => sum + conta.valor, 0)
      
      const saidasMes = contasPagar
        .filter(conta => {
          if (conta.status !== 'pago' || !conta.dataPagamento) return false
          const dataPag = toDate(conta.dataPagamento)
          return isWithinInterval(dataPag, { start: inicioMesCalc, end: fimMesCalc })
        })
        .reduce((sum, conta) => sum + conta.valor, 0)
      
      fluxoMensal.push({
        mes: format(mesData, 'MMM', { locale: ptBR }),
        entradas: entradasMes,
        saidas: saidasMes,
        saldo: entradasMes - saidasMes
      })
    }
    
    // === GASTOS POR OBRA ===
    
    const gastosPorObraMap = new Map<string, { nome: string; valor: number }>()
    
    contasPagar
      .filter(conta => conta.status === 'pago' && conta.obraId)
      .forEach(conta => {
        const obra = obras.find(o => o.id === conta.obraId)
        const obraNome = obra?.nome || 'Sem obra'
        const current = gastosPorObraMap.get(conta.obraId || 'sem-obra') || { nome: obraNome, valor: 0 }
        current.valor += conta.valor
        gastosPorObraMap.set(conta.obraId || 'sem-obra', current)
      })
    
    const totalGastos = Array.from(gastosPorObraMap.values()).reduce((sum, g) => sum + g.valor, 0)
    
    const gastosPorObra: GastoPorObra[] = Array.from(gastosPorObraMap.entries())
      .map(([obraId, { nome, valor }]) => ({
        obraId,
        obraNome: nome,
        valor,
        percentual: totalGastos > 0 ? (valor / totalGastos) * 100 : 0
      }))
      .sort((a, b) => b.valor - a.valor)
      .slice(0, 5)
    
    // === PRÓXIMAS CONTAS ===
    
    const proximasContas: ContaProxima[] = []
    
    contasPagar
      .filter(conta => conta.status === 'pendente')
      .forEach(conta => {
        const dataVenc = toDate(conta.dataVencimento)
        const diasRestantes = Math.ceil((dataVenc.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24))
        if (diasRestantes >= -30 && diasRestantes <= 7) {
          proximasContas.push({
            id: conta.id,
            descricao: conta.descricao,
            valor: conta.valor,
            dataVencimento: dataVenc,
            tipo: 'pagar',
            diasRestantes
          })
        }
      })
    
    contasReceber
      .filter(conta => conta.status === 'pendente')
      .forEach(conta => {
        const dataVenc = toDate(conta.dataVencimento)
        const diasRestantes = Math.ceil((dataVenc.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24))
        if (diasRestantes >= -30 && diasRestantes <= 7) {
          proximasContas.push({
            id: conta.id,
            descricao: conta.descricao,
            valor: conta.valor,
            dataVencimento: dataVenc,
            tipo: 'receber',
            diasRestantes
          })
        }
      })
    
    proximasContas.sort((a, b) => a.diasRestantes - b.diasRestantes)
    
    // === RESUMO DAS OBRAS ===
    
    const obrasResumo: ObraResumo[] = obras
      .filter(o => o.status === 'ativa')
      .map(obra => {
        const totalGastoObra = contasPagar
          .filter(c => c.obraId === obra.id && c.status === 'pago')
          .reduce((sum, c) => sum + c.valor, 0)
        
        const orcamento = obra.orcamento || 0
        const percentualGasto = orcamento > 0 ? (totalGastoObra / orcamento) * 100 : 0
        
        return {
          id: obra.id,
          nome: obra.nome,
          status: obra.status,
          totalGasto: totalGastoObra,
          orcamento,
          percentualGasto
        }
      })
      .slice(0, 5)
    
    return {
      saldoGeral,
      totalPagarHoje,
      totalReceberHoje,
      cotacoesPendentes: cotacoes.length,
      contasVencidas,
      totalPagarMes,
      totalReceberMes,
      totalPagoMes,
      totalRecebidoMes,
      obrasAtivas,
      requisicoesAbertas,
      pedidosPendentes,
      fluxoMensal,
      gastosPorObra,
      proximasContas: proximasContas.slice(0, 5),
      obrasResumo
    }
  } catch (error) {
    console.error('Erro ao buscar dados do dashboard:', error)
    throw error
  }
}
