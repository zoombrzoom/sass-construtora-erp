import { Timestamp } from 'firebase/firestore'

export type ContaPagarTipo = 'boleto' | 'folha' | 'empreiteiro' | 'outro'
export type ContaPagarStatus = 'pendente' | 'pago' | 'vencido'
export type ContaReceberOrigem = 'financiamento' | 'cliente' | 'outro'
export type ContaReceberStatus = 'pendente' | 'recebido' | 'atrasado'

export interface Rateio {
  obraId: string
  percentual: number
}

export interface ContaPagar {
  id: string
  valor: number
  dataVencimento: Timestamp | Date
  dataPagamento?: Timestamp | Date
  tipo: ContaPagarTipo
  obraId: string // Obrigatório - centro de custo
  rateio?: Rateio[] // Para dividir entre múltiplas obras
  comprovanteUrl?: string // Firebase Storage URL (opcional)
  status: ContaPagarStatus
  descricao?: string
  createdAt: Timestamp | Date
  createdBy: string
}

export interface ContaReceber {
  id: string
  valor: number
  dataVencimento: Timestamp | Date
  dataRecebimento?: Timestamp | Date
  origem: ContaReceberOrigem
  obraId?: string // Opcional
  status: ContaReceberStatus
  descricao?: string
  createdAt: Timestamp | Date
  createdBy: string
}
