import { Timestamp } from 'firebase/firestore'

export type ObraStatus = 'ativa' | 'pausada' | 'concluida'

export interface Obra {
  id: string
  nome: string
  endereco: string
  status: ObraStatus
  categoriaId?: string
  createdAt: Timestamp | Date
  createdBy: string
  updatedAt?: Timestamp | Date
}

export interface ObraCategoria {
  id: string
  nome: string
  createdAt: Timestamp | Date
  createdBy: string
  updatedAt?: Timestamp | Date
}
