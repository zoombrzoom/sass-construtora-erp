import { Timestamp } from 'firebase/firestore'

export type ObraStatus = 'ativa' | 'pausada' | 'concluida'

export interface Obra {
  id: string
  nome: string
  endereco: string
  status: ObraStatus
  createdAt: Timestamp | Date
  createdBy: string
  updatedAt?: Timestamp | Date
}
