import { Timestamp } from 'firebase/firestore'

export type ContaPagarTipo = 'boleto' | 'folha' | 'empreiteiro' | 'escritorio' | 'particular' | 'outro'
export type ContaPagarStatus = 'pendente' | 'pago' | 'vencido'
export type ContaPagarFormaPagamento = 'boleto' | 'pix' | 'deposito' | 'dinheiro' | 'transferencia' | 'ted' | 'doc' | 'cartao' | 'outro'
export type ContaReceberOrigem = 'financiamento' | 'cliente' | 'outro'
export type ContaReceberStatus = 'pendente' | 'recebido' | 'atrasado'
export type FolhaPagamentoStatus = 'aberto' | 'parcial' | 'pago'
export type FolhaPagamentoFormaPagamento = 'pix' | 'deposito' | 'dinheiro' | 'transferencia' | 'ted' | 'doc' | 'outro'
export type FolhaPagamentoRecorrenciaTipo = 'mensal' | 'quinzenal' | 'semanal' | 'personalizado'

export interface Rateio {
  obraId: string
  percentual: number
}

export interface ComprovanteMensal {
  parcela: number
  mesReferencia: string // Formato YYYY-MM
  url: string
  nomeArquivo?: string
  enviadoEm?: Timestamp | Date
}

export interface ContaPagar {
  id: string
  valor: number
  dataVencimento: Timestamp | Date
  dataPagamento?: Timestamp | Date
  tipo: ContaPagarTipo
  obraId: string // Obrigatório - centro de custo
  // Marca contas "pessoais" para aparecerem no geral com tag.
  pessoal?: boolean
  // Link opcional para lancamento da Folha de Pagamento (para aparecer no geral).
  folhaPagamentoId?: string
  rateio?: Rateio[] // Para dividir entre múltiplas obras
  comprovanteUrl?: string // Firebase Storage URL (opcional)
  comprovantesMensais?: ComprovanteMensal[] // Histórico de comprovantes por mês/parcela
  boletoUrl?: string // PDF ou imagem do boleto para pagamento rápido
  linhaDigitavel?: string // Números do boleto
  codigoBarras?: string // Código de barras (texto)
  parcelaAtual?: number // Ex.: 1 (de 50)
  totalParcelas?: number // Ex.: 50
  grupoParcelamentoId?: string // Identifica todas as parcelas do mesmo boleto
  recorrenciaMensal?: boolean // Indica que foi gerado para cobrança mensal
  formaPagamento?: ContaPagarFormaPagamento
  // Conta usada para efetuar o pagamento (ex.: "Roberts Santander", "Caixa interno").
  contaPagamento?: string
  favorecido?: string
  banco?: string
  agencia?: string
  conta?: string
  chavePix?: string
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

export interface FolhaPagamento {
  id: string
  funcionarioNome: string
  cpf?: string
  agencia?: string
  conta?: string
  valor: number
  valorPago: number
  status: FolhaPagamentoStatus
  formaPagamento?: FolhaPagamentoFormaPagamento
  categoriaId?: string
  recorrenciaTipo?: FolhaPagamentoRecorrenciaTipo
  recorrenciaIntervaloDias?: number
  // Quando true, a recorrencia eh por tempo indeterminado (sem pre-gerar 12 meses, por exemplo).
  recorrenciaIndeterminada?: boolean
  // Para mensal/quinzenal: n-esimo dia util do mes (ex.: 5 = 5o dia util).
  recorrenciaDiaUtil?: number
  // Para quinzenal: segundo pagamento no dia do mes (ex.: 20).
  recorrenciaDiaMes2?: number
  recorrenciaGrupoId?: string
  recorrenciaIndex?: number
  recorrenciaTotal?: number
  dataReferencia: Timestamp | Date
  dataPagamento?: Timestamp | Date
  comprovanteUrl?: string
  observacoes?: string
  // Marker: once migrated to Contas a Pagar, we should not recreate even if the conta is deleted later.
  migradoContaPagarId?: string
  createdAt: Timestamp | Date
  createdBy: string
}

export interface FolhaPagamentoCategoria {
  id: string
  nome: string
  createdAt: Timestamp | Date
  createdBy: string
  updatedAt?: Timestamp | Date
}

export type EmpreiteiroStatus = 'aberto' | 'parcial' | 'pago'
export type EmpreiteiroFormaPagamento = 'pix' | 'deposito' | 'dinheiro' | 'transferencia' | 'ted' | 'doc' | 'outro'

export interface Empreiteiro {
  id: string
  empreiteiroNome: string
  cpf?: string
  agencia?: string
  conta?: string
  // Dados da medição
  obraId: string
  servico: string
  medicaoNumero: number // Nº da medição (1, 2, 3...)
  percentualExecutado: number // 0-100
  valorContrato: number // Valor total do contrato
  valorMedicao: number // Valor desta medição (contrato × percentual ou manual)
  // Controle de pagamento
  valor: number // Valor a pagar nesta medição
  valorPago: number
  status: EmpreiteiroStatus
  formaPagamento?: EmpreiteiroFormaPagamento
  dataReferencia: Timestamp | Date
  dataPagamento?: Timestamp | Date
  comprovanteUrl?: string
  observacoes?: string
  createdAt: Timestamp | Date
  createdBy: string
}
