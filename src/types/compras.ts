import { Timestamp } from 'firebase/firestore'

export type RequisicaoStatus = 'pendente' | 'em_cotacao' | 'aprovado' | 'comprado' | 'entregue'
export type CotacaoStatus = 'pendente' | 'aprovado' | 'rejeitado'
export type PedidoCompraStatus = 'gerado' | 'enviado' | 'confirmado'

export interface RequisicaoItem {
  descricao: string
  quantidade: number
  valorUnitario?: number
  info?: string // Peso, tamanho, modelo, etc (substitui unidade)
  unidade?: string // Mantido para compatibilidade com dados antigos
}

export interface RequisicaoAnexo {
  nome: string
  url: string
}

export interface Requisicao {
  id: string
  obraId: string
  solicitadoPor: string
  itens: RequisicaoItem[]
  status: RequisicaoStatus
  pedido?: boolean
  aprovado?: boolean
  observacoes?: string
  dataEntrega?: Timestamp | Date
  notaFiscal?: RequisicaoAnexo
  comprovantePagamento?: RequisicaoAnexo
  createdAt: Timestamp | Date
}

export interface FornecedorCotacao {
  nome: string
  preco: number
  cnpj?: string
}

export interface FornecedorCotacaoItem {
  nome: string
  cnpj?: string
  precosPorItem: { [itemIndex: number]: number } // Índice do item -> preço
}

export interface Cotacao {
  id: string
  requisicaoId: string
  item: string // Mantido para compatibilidade
  itensSelecionados?: number[] // Índices dos itens selecionados da requisição
  fornecedorA: FornecedorCotacao | FornecedorCotacaoItem
  fornecedorB: FornecedorCotacao | FornecedorCotacaoItem
  fornecedorC: FornecedorCotacao | FornecedorCotacaoItem
  menorPreco: number // Calculado
  fornecedorMenorPreco: string // 'A', 'B' ou 'C'
  fornecedorSelecionado?: string // 'A', 'B' ou 'C' - Fornecedor escolhido pelo usuário
  status: CotacaoStatus
  aprovadoPor?: string
  aprovadoEm?: Timestamp | Date
  createdAt: Timestamp | Date
}

export interface PedidoCompra {
  id: string
  cotacaoId: string
  fornecedorSelecionado: string
  pdfUrl?: string // Firebase Storage URL
  status: PedidoCompraStatus
  createdAt: Timestamp | Date
  createdBy: string
}
