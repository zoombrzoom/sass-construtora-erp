import { Timestamp } from 'firebase/firestore'

export interface Medicao {
  id: string
  obraId: string
  empreiteiro: string
  servico: string
  percentualExecutado: number // 0-100
  valorTotal: number
  valorLiberado: number // Calculado: valorTotal * (percentualExecutado / 100)
  dataMedicao: Timestamp | Date
  observacoes?: string
  createdAt: Timestamp | Date
  createdBy: string
}
