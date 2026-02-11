import { Timestamp } from 'firebase/firestore'

export type DocumentoVisibilidade = 'publico' | 'admin_only'
export type DocumentoCategoria = 'contrato' | 'documento' | 'aditivo' | 'outro'
export type DocumentoPastaIcone = 'folder' | 'briefcase' | 'shield' | 'archive' | 'star' | 'file-text'

export interface DocumentoPasta {
  id: string
  nome: string
  parentId?: string
  cor: string
  icone: DocumentoPastaIcone
  visibilidade: DocumentoVisibilidade
  ordem: number
  createdAt: Timestamp | Date
  updatedAt?: Timestamp | Date
  createdBy: string
}

export interface Documento {
  id: string
  nome: string
  descricao?: string
  arquivoNome: string
  arquivoUrl: string
  arquivoPath?: string
  mimeType?: string
  tamanho?: number
  visibilidade: DocumentoVisibilidade
  obraId?: string
  folderId?: string
  ordem: number
  categoria: DocumentoCategoria
  createdAt: Timestamp | Date
  updatedAt?: Timestamp | Date
  createdBy: string
}
