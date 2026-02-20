'use client'

import { useState, useEffect, useMemo } from 'react'
import { ComprovanteMensal, ContaPagar, ContaPagarFormaPagamento, ContaPagarStatus, ContaPagarTipo } from '@/types/financeiro'
import { createContaPagar, createContasPagarParceladasMensais, getContasPagarPorGrupo, updateContaPagar } from '@/lib/db/contasPagar'
import { getObras } from '@/lib/db/obras'
import { OBRA_ID_FOLHA_SEM_OBRA } from '@/lib/folha/gerarContasFolha'
import { getRequisicoes } from '@/lib/db/requisicoes'
import { getCotacoes } from '@/lib/db/cotacoes'
import { getDadosBancarios, saveDadosBancarios, type DadosBancarios } from '@/lib/db/dadosBancarios'
import { uploadImage } from '@/lib/storage/upload'
import { useAuth } from '@/hooks/useAuth'
import { useRouter } from 'next/navigation'
import { Obra } from '@/types/obra'
import { toDate, formatIsoToBr, parseBrToIso } from '@/utils/date'
import { formatCurrencyInput, parseCurrencyInput, sanitizeCurrencyInput } from '@/utils/currency'
import { Cotacao, Requisicao } from '@/types/compras'
import { getPermissions } from '@/lib/permissions/check'
import { AlertCircle, Save, ArrowLeft, Upload, ExternalLink } from 'lucide-react'
import { format } from 'date-fns'

interface ContaPagarFormProps {
  conta?: ContaPagar
  onSuccess?: () => void
  // Quando true, salva a conta com tag "pessoal" (para aparecer no geral com badge).
  pessoal?: boolean
}

interface ParcelaEdicaoForm {
  parcela: number
  dataVencimento: string
  valor: string
}

const FORMAS_PAGAMENTO: { value: ContaPagarFormaPagamento; label: string }[] = [
  { value: 'boleto', label: 'Boleto' },
  { value: 'pix', label: 'PIX' },
  { value: 'deposito', label: 'Depósito' },
  { value: 'transferencia', label: 'Transferência' },
  { value: 'ted', label: 'TED' },
  { value: 'doc', label: 'DOC' },
  { value: 'dinheiro', label: 'Dinheiro' },
  { value: 'cartao', label: 'Cartão' },
  { value: 'outro', label: 'Outro' },
]

function parseDateInput(value: string): Date {
  const [year, month, day] = value.split('-').map(Number)
  return new Date(year, month - 1, day, 12, 0, 0)
}

function toInputDate(value?: Date): string {
  if (!value) return ''
  return value.toISOString().split('T')[0]
}

function toInputMonth(value?: Date): string {
  if (!value) return ''
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, '0')
  return `${year}-${month}`
}

function formatMonthLabel(value: string): string {
  if (!value || !value.includes('-')) return value
  const [year, month] = value.split('-')
  return `${month}/${year}`
}

function safeFormatDate(value: any, pattern: string): string {
  try {
    if (!value) return '-'
    return format(toDate(value as any), pattern)
  } catch {
    return '-'
  }
}

function normalizeText(value: any): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value.trim()
  return String(value).trim()
}

function addMonthsKeepingDay(value: Date, monthsToAdd: number): Date {
  const base = new Date(value)
  const baseDay = base.getDate()
  const shifted = new Date(base.getFullYear(), base.getMonth() + monthsToAdd, 1, 12, 0, 0, 0)
  const lastDay = new Date(shifted.getFullYear(), shifted.getMonth() + 1, 0).getDate()
  shifted.setDate(Math.min(baseDay, lastDay))
  return shifted
}

function buildParcelasPadrao(params: {
  parcelaInicial: number
  totalParcelas: number
  dataVencimentoBase: string
  valorBase: string
}): ParcelaEdicaoForm[] {
  const { parcelaInicial, totalParcelas, dataVencimentoBase, valorBase } = params
  if (!dataVencimentoBase) return []

  const baseDate = parseDateInput(dataVencimentoBase)
  if (Number.isNaN(baseDate.getTime())) return []

  const valorFormatado = valorBase ? formatCurrencyInput(valorBase) : ''
  const parcelas: ParcelaEdicaoForm[] = []

  for (let parcela = parcelaInicial; parcela <= totalParcelas; parcela++) {
    const monthOffset = parcela - parcelaInicial
    parcelas.push({
      parcela,
      dataVencimento: toInputDate(addMonthsKeepingDay(baseDate, monthOffset)),
      valor: valorFormatado,
    })
  }

  return parcelas
}

function getRequisicaoStatusBadge(status: Requisicao['status']): string {
  if (status === 'entregue') return 'bg-success/20 text-success'
  if (status === 'comprado') return 'bg-blue-500/20 text-blue-400'
  if (status === 'aprovado') return 'bg-warning/20 text-warning'
  if (status === 'em_cotacao') return 'bg-purple-500/20 text-purple-400'
  return 'bg-gray-500/20 text-gray-400'
}

export function ContaPagarForm({ conta, onSuccess, pessoal }: ContaPagarFormProps) {
  const isPessoal = Boolean(pessoal) || Boolean(conta?.pessoal)
  const contaDataVencimento = conta?.dataVencimento ? toDate(conta.dataVencimento) : undefined
  const comprovantesMensaisIniciais: ComprovanteMensal[] = conta?.comprovantesMensais || []

  const [origemImportacao, setOrigemImportacao] = useState<'em_branco' | 'requisicao' | 'cotacao'>('em_branco')
  const [idImportacao, setIdImportacao] = useState('')
  const [valor, setValor] = useState(conta?.valor !== undefined ? formatCurrencyInput(conta.valor) : '')
  const [dataVencimento, setDataVencimento] = useState(
    contaDataVencimento ? toInputDate(contaDataVencimento) : toInputDate(new Date())
  )
  const [dataVencimentoDisplay, setDataVencimentoDisplay] = useState('')
  const [dataPagamento, setDataPagamento] = useState(
    conta?.dataPagamento ? toInputDate(toDate(conta.dataPagamento)) : ''
  )
  const [dataPagamentoDisplay, setDataPagamentoDisplay] = useState('')
  const [status, setStatus] = useState<ContaPagarStatus>(conta?.status || 'pendente')
  const [tipo, setTipo] = useState<ContaPagarTipo>(conta?.tipo || 'outro')
  // Contas pessoais aparecem no geral com tag "pessoal" e usam um centro de custo fixo.
  const [obraId, setObraId] = useState(conta?.obraId || (isPessoal ? 'PESSOAL' : ''))
  const [descricao, setDescricao] = useState(conta?.descricao || '')
  const [favorecido, setFavorecido] = useState(conta?.favorecido || '')
  const [contaPagamento, setContaPagamento] = useState(conta?.contaPagamento || '')
  const [linhaDigitavel, setLinhaDigitavel] = useState(conta?.linhaDigitavel || '')
  const [codigoBarras, setCodigoBarras] = useState(conta?.codigoBarras || '')
  const [formaPagamento, setFormaPagamento] = useState<ContaPagarFormaPagamento | ''>(conta?.formaPagamento || '')
  const [banco, setBanco] = useState(conta?.banco || '')
  const [agencia, setAgencia] = useState(conta?.agencia || '')
  const [contaBancaria, setContaBancaria] = useState(conta?.conta || '')
  const [chavePix, setChavePix] = useState(conta?.chavePix || '')
  const [parcelaAtualInput, setParcelaAtualInput] = useState<string>(() => {
    const value = Number(conta?.parcelaAtual ?? 1)
    return value > 1 ? String(value) : ''
  })
  const [totalParcelasInput, setTotalParcelasInput] = useState<string>(() => {
    const value = Number(conta?.totalParcelas ?? 1)
    return value > 1 ? String(value) : ''
  })
  const [recorrenciaMensal, setRecorrenciaMensal] = useState<boolean>(conta?.recorrenciaMensal || false)
  const [tipoRecorrenciaMensal, setTipoRecorrenciaMensal] = useState<'em_branco' | 'boleto' | 'conta'>(
    conta?.recorrenciaMensal ? (conta?.tipo === 'boleto' ? 'boleto' : 'conta') : 'em_branco'
  )
  const [gerarParcelasMensais, setGerarParcelasMensais] = useState<boolean>(
    Boolean(conta?.recorrenciaMensal && (conta?.totalParcelas || 1) > 1)
  )
  const [gerarParcelasTouched, setGerarParcelasTouched] = useState<boolean>(false)
  const [editarParcelasAvancado, setEditarParcelasAvancado] = useState<boolean>(false)
  const [parcelasEdicao, setParcelasEdicao] = useState<ParcelaEdicaoForm[]>([])

  const [boletoFile, setBoletoFile] = useState<File | null>(null)
  const [comprovanteFile, setComprovanteFile] = useState<File | null>(null)
  const [boletoUrl, setBoletoUrl] = useState(conta?.boletoUrl || '')
  const [comprovanteUrl, setComprovanteUrl] = useState(conta?.comprovanteUrl || '')
  const [comprovantesMensais, setComprovantesMensais] = useState<ComprovanteMensal[]>(comprovantesMensaisIniciais)
  const [comprovanteMesReferencia, setComprovanteMesReferencia] = useState(
    toInputMonth(contaDataVencimento || new Date())
  )
  const [comprovanteParcelaReferencia, setComprovanteParcelaReferencia] = useState<number>(conta?.parcelaAtual || 1)

  const [obras, setObras] = useState<Obra[]>([])
  const [requisicoes, setRequisicoes] = useState<Requisicao[]>([])
  const [cotacoes, setCotacoes] = useState<Cotacao[]>([])
  const [dadosBancarios, setDadosBancarios] = useState<DadosBancarios[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const { user } = useAuth()
  const router = useRouter()
  const permissions = getPermissions(user)
  const canAccessParticular = permissions.canAccessContasParticulares
  const pessoalFinal = isPessoal

  const requisicaoSelecionada = useMemo(() => {
    if (!idImportacao) return null
    if (origemImportacao === 'em_branco') return null
    if (origemImportacao === 'requisicao') {
      return requisicoes.find((item) => item.id === idImportacao) || null
    }
    const cotacao = cotacoes.find((item) => item.id === idImportacao)
    if (!cotacao) return null
    return requisicoes.find((item) => item.id === cotacao.requisicaoId) || null
  }, [idImportacao, origemImportacao, requisicoes, cotacoes])

  const bancosSugestoes = useMemo(() => {
    const valores = dadosBancarios
      .map((item: any) => normalizeText(item?.banco))
      .filter((v) => v.length > 0)
    return Array.from(new Set(valores)).sort((a, b) => a.localeCompare(b, 'pt-BR'))
  }, [dadosBancarios])

  const favorecidosSugestoes = useMemo(() => {
    const valores = dadosBancarios
      .map((item: any) => normalizeText(item?.favorecido))
      .filter((v) => v.length > 0)
    return Array.from(new Set(valores)).sort((a, b) => a.localeCompare(b, 'pt-BR'))
  }, [dadosBancarios])

  const getObraNome = (id: string) => obras.find((obra) => obra.id === id)?.nome || id
  const parcelaAtualNumero = Math.max(1, Number(parcelaAtualInput) || 1)
  const totalParcelasNumero = Math.max(1, Number(totalParcelasInput) || 1)
  const parcelamentoAvancadoDisponivel = gerarParcelasMensais && totalParcelasNumero > 1
  const hasParcelamento = totalParcelasNumero > 1
  const obraIsPessoal = (obraId || '').trim() === 'PESSOAL'

  useEffect(() => {
    loadFormData()
  }, [])

  useEffect(() => {
    setDataVencimentoDisplay(formatIsoToBr(dataVencimento))
  }, [dataVencimento])

  useEffect(() => {
    setDataPagamentoDisplay(dataPagamento ? formatIsoToBr(dataPagamento) : '')
  }, [dataPagamento])

  useEffect(() => {
    if (!pessoalFinal) return
    if (!obraId) setObraId('PESSOAL')
  }, [pessoalFinal, obraId])

  // UX: se o usuario colocou "12x" (ou qualquer total > 1), habilita gerar parcelas automaticamente
  // sem exigir que ele marque "Conta recorrente". Ele ainda pode desmarcar manualmente.
  useEffect(() => {
    if (!hasParcelamento) {
      if (!gerarParcelasTouched && gerarParcelasMensais) {
        setGerarParcelasMensais(false)
      }
      if (editarParcelasAvancado) setEditarParcelasAvancado(false)
      return
    }

    if (!gerarParcelasTouched && parcelaAtualNumero < totalParcelasNumero && !gerarParcelasMensais) {
      setGerarParcelasMensais(true)
    }
  }, [hasParcelamento, parcelaAtualNumero, totalParcelasNumero, gerarParcelasTouched, gerarParcelasMensais, editarParcelasAvancado])

  useEffect(() => {
    if (totalParcelasInput === '') return
    const totalNormalizado = Math.max(1, Number(totalParcelasInput) || 1)
    if (String(totalNormalizado) !== totalParcelasInput) {
      setTotalParcelasInput(String(totalNormalizado))
    }

    if (parcelaAtualInput === '') return
    const parcelaNormalizada = Math.max(1, Number(parcelaAtualInput) || 1)
    if (parcelaNormalizada > totalNormalizado) {
      setParcelaAtualInput(String(totalNormalizado))
    } else if (String(parcelaNormalizada) !== parcelaAtualInput) {
      setParcelaAtualInput(String(parcelaNormalizada))
    }
  }, [parcelaAtualInput, totalParcelasInput])

  useEffect(() => {
    const parcelaNormalizada = Math.min(Math.max(1, comprovanteParcelaReferencia || 1), Math.max(1, totalParcelasNumero))
    if (parcelaNormalizada !== comprovanteParcelaReferencia) {
      setComprovanteParcelaReferencia(parcelaNormalizada)
    }
  }, [comprovanteParcelaReferencia, totalParcelasNumero])

  useEffect(() => {
    setComprovanteParcelaReferencia((prev) => {
      if (prev !== 1 && prev !== parcelaAtualNumero) return prev
      return parcelaAtualNumero
    })
  }, [parcelaAtualNumero])

  useEffect(() => {
    if (!dataVencimento) return
    const mes = dataVencimento.slice(0, 7)
    if (!comprovanteMesReferencia) {
      setComprovanteMesReferencia(mes)
    }
  }, [dataVencimento, comprovanteMesReferencia])

  useEffect(() => {
    if (!parcelamentoAvancadoDisponivel && editarParcelasAvancado) {
      setEditarParcelasAvancado(false)
    }
  }, [parcelamentoAvancadoDisponivel, editarParcelasAvancado])

  useEffect(() => {
    const parcelaInicial = Math.max(1, Math.min(parcelaAtualNumero, totalParcelasNumero))
    const padrao = buildParcelasPadrao({
      parcelaInicial,
      totalParcelas: totalParcelasNumero,
      dataVencimentoBase: dataVencimento,
      valorBase: valor,
    })

    setParcelasEdicao((prev) => {
      const prevMap = new Map(prev.map((item) => [item.parcela, item]))
      return padrao.map((item) => {
        if (!editarParcelasAvancado) return item
        const anterior = prevMap.get(item.parcela)
        if (!anterior) return item
        return {
          parcela: item.parcela,
          dataVencimento: anterior.dataVencimento || item.dataVencimento,
          valor: anterior.valor || item.valor,
        }
      })
    })
  }, [parcelaAtualNumero, totalParcelasNumero, dataVencimento, valor, editarParcelasAvancado])

  const loadFormData = async () => {
    try {
      const results = await Promise.allSettled([
        getObras(),
        getRequisicoes(),
        getCotacoes(),
        getDadosBancarios(),
      ])
      if (results[0].status === 'fulfilled') setObras(results[0].value)
      else console.warn('Erro ao carregar obras:', results[0].reason)
      if (results[1].status === 'fulfilled') setRequisicoes(results[1].value)
      else console.warn('Erro ao carregar requisições:', results[1].reason)
      if (results[2].status === 'fulfilled') setCotacoes(results[2].value)
      else console.warn('Erro ao carregar cotações:', results[2].reason)
      if (results[3].status === 'fulfilled') setDadosBancarios(results[3].value)
      else console.warn('Erro ao carregar dados bancários:', results[3].reason)
    } catch (err) {
      console.error('Erro ao carregar dados do formulário:', err)
    }
  }

  useEffect(() => {
    const normalized = favorecido.trim().toLowerCase()
    if (!normalized) return

    const sugestao = dadosBancarios.find(
      (item: any) => normalizeText(item?.favorecido).toLowerCase() === normalized
    )
    if (!sugestao) return

    const bancoSug = normalizeText((sugestao as any).banco)
    const agenciaSug = normalizeText((sugestao as any).agencia)
    const contaSug = normalizeText((sugestao as any).conta)
    const pixSug = normalizeText((sugestao as any).chavePix)

    if (!banco && bancoSug) setBanco(bancoSug)
    if (!agencia && agenciaSug) setAgencia(agenciaSug)
    if (!contaBancaria && contaSug) setContaBancaria(contaSug)
    if (!chavePix && pixSug) setChavePix(pixSug)
  }, [favorecido, dadosBancarios, banco, agencia, contaBancaria, chavePix])

  const aplicarImportacao = () => {
    if (origemImportacao === 'em_branco') {
      setError('')
      return
    }

    if (!idImportacao) {
      setError(`Selecione uma ${origemImportacao === 'requisicao' ? 'pedido' : 'cotação'} para importar`)
      return
    }

	    if (origemImportacao === 'requisicao') {
	      const requisicao = requisicoes.find((item) => item.id === idImportacao)
	      if (!requisicao) return
	
		      const resumoItens = ((requisicao as any).itens || [])
		        .map((item: any) => `${item.descricao} (${item.quantidade})`)
		        .join(' | ')
		        .slice(0, 240)

      setObraId(requisicao.obraId)
      setTipo('outro')
      setDescricao(`Pedido #${requisicao.id.slice(0, 8)} - ${resumoItens}`)
	      if ((requisicao as any).dataEntrega) {
	        try {
	          setDataVencimento(toInputDate(toDate((requisicao as any).dataEntrega)))
	        } catch {
	          // ignore invalid date types from legacy docs
	        }
	      }
      setError('')
      return
    }

    const cotacao = cotacoes.find((item) => item.id === idImportacao)
    if (!cotacao) return

	    const requisicaoCotacao = requisicoes.find((item) => item.id === cotacao.requisicaoId)
	    if (requisicaoCotacao) {
	      setObraId(requisicaoCotacao.obraId)
	      if ((requisicaoCotacao as any).dataEntrega) {
	        try {
	          setDataVencimento(toInputDate(toDate((requisicaoCotacao as any).dataEntrega)))
	        } catch {
	          // ignore invalid date types from legacy docs
	        }
	      }
	    }

    if (cotacao.menorPreco > 0) {
      setValor(formatCurrencyInput(cotacao.menorPreco))
    }
    setTipo('outro')
    setDescricao(`Cotação #${cotacao.id.slice(0, 8)} - ${cotacao.item}`)
    setError('')
  }

  const handleBoletoFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setBoletoFile(file)
    }
  }

  const handleComprovanteFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setComprovanteFile(file)
    }
  }

  const handleStatusChange = (nextStatus: ContaPagarStatus) => {
    setStatus(nextStatus)

    if (nextStatus === 'pago') {
      if (!dataPagamento) {
        setDataPagamento(toInputDate(new Date()))
      }
      if (!formaPagamento) {
        setFormaPagamento('pix')
      }
      return
    }

    setDataPagamento('')
  }

  const handleParcelaDataChange = (parcela: number, nextData: string) => {
    setParcelasEdicao((prev) =>
      prev.map((item) =>
        item.parcela === parcela
          ? { ...item, dataVencimento: nextData }
          : item
      )
    )
  }

  const handleParcelaValorChange = (parcela: number, nextValor: string) => {
    setParcelasEdicao((prev) =>
      prev.map((item) =>
        item.parcela === parcela
          ? { ...item, valor: sanitizeCurrencyInput(nextValor) }
          : item
      )
    )
  }

  const handleParcelaValorBlur = (parcela: number) => {
    setParcelasEdicao((prev) =>
      prev.map((item) =>
        item.parcela === parcela
          ? { ...item, valor: item.valor ? formatCurrencyInput(item.valor) : '' }
          : item
      )
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!obraId && pessoalFinal) {
      setObraId('PESSOAL')
    }

    const valorNumero = parseCurrencyInput(valor)
    if (!valor || Number.isNaN(valorNumero) || valorNumero <= 0) {
      setError('Informe um valor válido')
      return
    }

    if (!dataVencimento) {
      setError('Informe a data de vencimento')
      return
    }

	    const totalParcelasNumero = Math.max(1, Number(totalParcelasInput) || 1)
	    const parcelaAtualNumero = Math.max(1, Number(parcelaAtualInput) || 1)

	    // Nao depende do useEffect (o usuario pode salvar logo apos digitar "12x").
	    // Se o usuario nao mexeu no checkbox, assumimos que quer gerar as parcelas futuras.
	    const shouldCreateMonthlyInstallments =
	      totalParcelasNumero > 1 &&
	      (gerarParcelasMensais || (!gerarParcelasTouched && parcelaAtualNumero < totalParcelasNumero))

    if (parcelaAtualNumero > totalParcelasNumero) {
      setError('A parcela atual não pode ser maior que o total de parcelas')
      return
    }

    if (comprovanteFile && !comprovanteMesReferencia) {
      setError('Selecione o mês de referência do comprovante')
      return
    }

    let parcelasConfigAvancado:
      | Array<{ parcela: number; valor: number; dataVencimento: Date }>
      | undefined

    if (gerarParcelasMensais && totalParcelasNumero > 1 && editarParcelasAvancado) {
      const totalEsperado = totalParcelasNumero - parcelaAtualNumero + 1
      if (parcelasEdicao.length !== totalEsperado) {
        setError('Falha ao montar as parcelas avançadas. Ajuste os campos e tente novamente.')
        return
      }

      const parsed: Array<{ parcela: number; valor: number; dataVencimento: Date }> = []

      for (const item of parcelasEdicao) {
        if (!item.dataVencimento) {
          setError(`Informe a data da parcela ${item.parcela}/${totalParcelasNumero}`)
          return
        }

        const valorItem = parseCurrencyInput(item.valor)
        if (!item.valor || Number.isNaN(valorItem) || valorItem <= 0) {
          setError(`Informe um valor válido na parcela ${item.parcela}/${totalParcelasNumero}`)
          return
        }

        const dataItem = parseDateInput(item.dataVencimento)
        if (Number.isNaN(dataItem.getTime())) {
          setError(`Informe uma data válida na parcela ${item.parcela}/${totalParcelasNumero}`)
          return
        }

        parsed.push({
          parcela: item.parcela,
          valor: valorItem,
          dataVencimento: dataItem,
        })
      }

      parcelasConfigAvancado = parsed
    }

    setLoading(true)

    try {
      if (!user) throw new Error('Usuário não autenticado')

      let nextBoletoUrl = boletoUrl
      let nextComprovanteUrl = comprovanteUrl
      let nextComprovantesMensais = [...comprovantesMensais]
      let nextStatus = status
      let nextFormaPagamento = formaPagamento
      let nextDataPagamento = dataPagamento

      if (boletoFile) {
        const path = `boletos/${user.id}_${Date.now()}_${boletoFile.name}`
        nextBoletoUrl = await uploadImage(boletoFile, path, false)
        setBoletoUrl(nextBoletoUrl)
      }

      if (comprovanteFile) {
        const path = `comprovantes/${user.id}_${Date.now()}_${comprovanteFile.name}`
        nextComprovanteUrl = await uploadImage(comprovanteFile, path, false)
        setComprovanteUrl(nextComprovanteUrl)

        const comprovanteMensal: ComprovanteMensal = {
          parcela: Math.min(Math.max(1, Number(comprovanteParcelaReferencia) || 1), totalParcelasNumero),
          mesReferencia: comprovanteMesReferencia,
          url: nextComprovanteUrl,
          nomeArquivo: comprovanteFile.name,
          enviadoEm: new Date(),
        }

        nextComprovantesMensais = [
          comprovanteMensal,
          ...nextComprovantesMensais.filter(
            (item) =>
              !(item.parcela === comprovanteMensal.parcela && item.mesReferencia === comprovanteMensal.mesReferencia)
          ),
        ]
        setComprovantesMensais(nextComprovantesMensais)

        // Upload de comprovante confirma pagamento automaticamente.
        handleStatusChange('pago')
        nextStatus = 'pago'
        if (!nextDataPagamento) {
          nextDataPagamento = toInputDate(new Date())
          setDataPagamento(nextDataPagamento)
        }
        if (!nextFormaPagamento) {
          nextFormaPagamento = 'pix'
          setFormaPagamento(nextFormaPagamento)
        }
        setStatus('pago')
      }

      if (nextStatus === 'pago' && !nextFormaPagamento) {
        setError('Selecione a forma de pagamento')
        return
      }

      if (nextStatus === 'pago' && !nextDataPagamento) {
        setError('Informe a data de pagamento')
        return
      }

	      const payload: any = {
	        valor: valorNumero,
	        dataVencimento: parseDateInput(dataVencimento),
	        tipo,
	        obraId: obraId || (pessoalFinal ? 'PESSOAL' : OBRA_ID_FOLHA_SEM_OBRA),
	        pessoal: (pessoalFinal || obraIsPessoal) ? true : undefined,
	        status: nextStatus,
	        descricao: descricao.trim(),
	        favorecido: favorecido.trim(),
	        contaPagamento: contaPagamento.trim(),
	        linhaDigitavel: linhaDigitavel.trim(),
	        codigoBarras: codigoBarras.trim(),
	        formaPagamento: nextStatus === 'pago' ? nextFormaPagamento || '' : '',
	        banco: banco.trim(),
	        agencia: agencia.trim(),
	        conta: contaBancaria.trim(),
	        chavePix: chavePix.trim(),
	        boletoUrl: nextBoletoUrl,
	        comprovanteUrl: nextComprovanteUrl,
	        comprovantesMensais: nextComprovantesMensais,
	        parcelaAtual: parcelaAtualNumero,
	        totalParcelas: totalParcelasNumero,
	        recorrenciaMensal: recorrenciaMensal || shouldCreateMonthlyInstallments,
	      }

      if (nextStatus === 'pago' && nextDataPagamento) {
        payload.dataPagamento = parseDateInput(nextDataPagamento)
      } else {
        payload.dataPagamento = null
      }

      if (!conta) {
        payload.createdBy = user.id
      }

	      if (conta) {
	        if (!shouldCreateMonthlyInstallments) {
	          await updateContaPagar(conta.id, payload)
	        } else {
          const groupId =
            conta.grupoParcelamentoId || `${user.id}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
          const existentes = conta.grupoParcelamentoId
            ? await getContasPagarPorGrupo(conta.grupoParcelamentoId)
            : []
          const parcelasExistentes = new Set(
            existentes
              .filter((item) => item.id !== conta.id)
              .map((item) => Math.max(1, item.parcelaAtual || 1))
          )

          await updateContaPagar(conta.id, {
            ...payload,
            grupoParcelamentoId: groupId,
            recorrenciaMensal: true,
          })

          const baseDataVencimento = parseDateInput(dataVencimento)
          const configPorParcela = new Map(
            (parcelasConfigAvancado || []).map((item) => [item.parcela, item])
          )

          const creates: Promise<string>[] = []
          for (let parcela = parcelaAtualNumero + 1; parcela <= totalParcelasNumero; parcela++) {
            if (parcelasExistentes.has(parcela)) continue
            const custom = configPorParcela.get(parcela)
            const monthOffset = parcela - parcelaAtualNumero
            const dataVencimentoParcela =
              custom?.dataVencimento || addMonthsKeepingDay(baseDataVencimento, monthOffset)
            const valorParcela = custom?.valor ?? valorNumero

            creates.push(
              createContaPagar({
                ...payload,
                valor: valorParcela,
                dataVencimento: dataVencimentoParcela,
                status: 'pendente',
                formaPagamento: '',
                dataPagamento: undefined,
                comprovanteUrl: '',
                comprovantesMensais: [],
                parcelaAtual: parcela,
                totalParcelas: totalParcelasNumero,
                grupoParcelamentoId: groupId,
                recorrenciaMensal: true,
                createdBy: user.id,
              })
            )
          }

          if (creates.length > 0) {
            await Promise.all(creates)
          }
        }
	      } else {
	        if (shouldCreateMonthlyInstallments) {
	          await createContasPagarParceladasMensais({
	            ...payload,
            createdBy: user.id,
            totalParcelas: totalParcelasNumero,
            parcelaInicial: parcelaAtualNumero,
            parcelasConfig: parcelasConfigAvancado,
          })
        } else {
          await createContaPagar(payload)
        }
      }

      if (favorecido.trim() && banco.trim()) {
        await saveDadosBancarios({
          favorecido: favorecido.trim(),
          banco: banco.trim(),
          agencia: agencia.trim(),
          conta: contaBancaria.trim(),
          chavePix: chavePix.trim(),
        })
      }

      if (onSuccess) {
        onSuccess()
      } else {
        router.push('/financeiro/contas-pagar')
      }
    } catch (err: any) {
      const code = err?.code || err?.name
      if (code === 'permission-denied') {
        setError('Sem permissão para criar esta conta. Peça a um usuário Admin/Financeiro para criar.')
      } else {
        setError(err?.message || 'Erro ao salvar conta')
      }
    } finally {
      setLoading(false)
    }
  }

  const inputClass = 'mt-1 block w-full px-3 py-2.5 bg-dark-400 border border-dark-100 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand focus:border-transparent transition-all min-h-touch'
  const labelClass = 'block text-sm font-medium text-gray-300 mb-1'

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && (
        <div className="bg-error/20 border border-error/30 text-error px-4 py-3 rounded-lg flex items-center">
          <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
          {error}
        </div>
      )}

      <div>
        <label htmlFor="descricao" className={labelClass}>Nome da conta</label>
        <input
          id="descricao"
          type="text"
          value={descricao}
          onChange={(e) => setDescricao(e.target.value)}
          className={inputClass}
          placeholder="Ex.: Aluguel escritório, boleto fornecedor..."
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label htmlFor="contato" className={labelClass}>Contato</label>
          <input
            id="contato"
            type="text"
            list="favorecidos-sugeridos"
            value={favorecido}
            onChange={(e) => setFavorecido(e.target.value)}
            className={inputClass}
            placeholder="Nome do beneficiado, fornecedor..."
          />
          <datalist id="favorecidos-sugeridos">
            {favorecidosSugestoes.map((item) => (
              <option key={item} value={item} />
            ))}
          </datalist>
        </div>

        <div>
          <label htmlFor="contaPagamento" className={labelClass}>Conta</label>
          <input
            id="contaPagamento"
            type="text"
            value={contaPagamento}
            onChange={(e) => setContaPagamento(e.target.value)}
            className={inputClass}
            placeholder="Conta usada para pagar (ex.: Caixa interno)"
          />
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold uppercase tracking-wide text-brand mb-3">
          Importar de Compras{' '}
          <span className="normal-case text-xs font-normal text-gray-400">
            (se aplicável, caso não deixe em branco)
          </span>
        </h3>
        <div className="border border-dark-100 rounded-xl p-4 sm:p-5 bg-dark-400/40 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label htmlFor="origemImportacao" className={labelClass}>Origem</label>
              <select
                id="origemImportacao"
                value={origemImportacao}
                onChange={(e) => {
                  setOrigemImportacao(e.target.value as 'em_branco' | 'requisicao' | 'cotacao')
                  setIdImportacao('')
                  setError('')
                }}
                className={inputClass}
              >
                <option value="em_branco">Em branco</option>
                <option value="requisicao">Pedido</option>
                <option value="cotacao">Cotação</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="idImportacao" className={labelClass}>
                {origemImportacao === 'requisicao'
                  ? 'Selecionar Pedido'
                  : origemImportacao === 'cotacao'
                    ? 'Selecionar Cotação'
                    : 'Importação'}
              </label>
              <select
                id="idImportacao"
                value={idImportacao}
                onChange={(e) => setIdImportacao(e.target.value)}
                disabled={origemImportacao === 'em_branco'}
                className={inputClass}
              >
                <option value="">
                  {origemImportacao === 'em_branco' ? 'Deixe em branco quando não for importar' : 'Selecione...'}
                </option>
                {origemImportacao === 'requisicao'
                  ? requisicoes.map((item) => (
                    <option key={item.id} value={item.id}>
                      Pedido #{item.id.slice(0, 8)} | Obra: {getObraNome(item.obraId)} | Data: {safeFormatDate((item as any).createdAt, 'dd/MM/yyyy')} | {(item as any).itens?.length || 0} item(ns)
                    </option>
                  ))
	                  : cotacoes.map((item) => (
	                    <option key={item.id} value={item.id}>
	                      {(() => {
	                        const requisicaoIdRaw = (item as any).requisicaoId
	                        const requisicaoId = typeof requisicaoIdRaw === 'string' ? requisicaoIdRaw : ''
	                        const req = requisicaoId ? requisicoes.find((r) => r.id === requisicaoId) : undefined
	                        const menor = Number((item as any).menorPreco) || 0
	                        const dataReq = req ? safeFormatDate((req as any).createdAt, 'dd/MM/yyyy') : '-'
	                        const pedidoLabel = requisicaoId ? `Pedido #${requisicaoId.slice(0, 8)}` : 'Pedido -'
	                        const obraLabel = req ? getObraNome((req as any).obraId) : '-'
	                        return `Cot #${item.id.slice(0, 8)} | ${pedidoLabel} | Obra: ${obraLabel} | Data: ${dataReq} | Menor preço: R$ ${menor.toFixed(2).replace('.', ',')}`
	                      })()}
	                    </option>
	                  ))}
	              </select>
            </div>
          </div>

          <div className="flex justify-end">
            <button
              type="button"
              onClick={aplicarImportacao}
              disabled={origemImportacao === 'em_branco'}
              className="px-4 py-2.5 bg-dark-300 border border-dark-100 rounded-lg text-gray-200 hover:text-brand hover:border-brand transition-colors"
            >
              Importar dados para o formulário
            </button>
          </div>

          {requisicaoSelecionada && (
            <div className="rounded-lg border border-brand/30 bg-brand/10 p-3">
              <p className="text-sm font-medium text-brand mb-1">
                Resumo do Pedido #{requisicaoSelecionada.id.slice(0, 8)}
              </p>

              <div className="flex items-center flex-wrap gap-2">
                <p className="text-sm font-medium text-gray-100">
                  Obra: {getObraNome(requisicaoSelecionada.obraId)}
                </p>
                <span className={`px-2 py-0.5 text-xs font-medium rounded-full ${getRequisicaoStatusBadge(requisicaoSelecionada.status)}`}>
                  {requisicaoSelecionada.status}
                </span>
              </div>

              <p className="mt-1 text-xs text-gray-300">
                {(requisicaoSelecionada as any).itens?.length || 0} item(ns) | Criado em {safeFormatDate((requisicaoSelecionada as any).createdAt, 'dd/MM/yyyy')}
                {' '}| Entrega {requisicaoSelecionada.dataEntrega ? safeFormatDate((requisicaoSelecionada as any).dataEntrega, 'dd/MM/yyyy') : '-'}
              </p>

              <p className="mt-1 text-xs text-gray-300">
                Solicitado por: {requisicaoSelecionada.solicitadoPor || '-'}
              </p>

              <div className="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-xl">
                <p className="text-xs text-gray-300">
                  Pedido realizado: <span className="font-medium">{requisicaoSelecionada.pedido ? 'Sim' : 'Não'}</span>
                </p>
                <p className="text-xs text-gray-300">
                  Aprovado para compra: <span className="font-medium">{requisicaoSelecionada.aprovado ? 'Sim' : 'Não'}</span>
                </p>
              </div>

              <div className="mt-2 text-xs text-gray-300 space-y-0.5">
                {(requisicaoSelecionada as any).itens?.slice(0, 3)?.map((item: any, index: number) => (
                  <p key={`${item.descricao}-${index}`}>
                    {item.descricao} ({item.quantidade})
                  </p>
                ))}
                {((requisicaoSelecionada as any).itens?.length || 0) > 3 && (
                  <p>+ {((requisicaoSelecionada as any).itens?.length || 0) - 3} item(ns)</p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      <div>
        <label htmlFor="obraId" className={labelClass}>
          {pessoalFinal ? 'Centro de Custo' : 'Obra (Centro de Custo)'}
        </label>
        {pessoalFinal ? (
          <input
            id="obraId"
            type="text"
            value="Pessoal"
            disabled
            className={`${inputClass} opacity-80 cursor-not-allowed`}
          />
        ) : (
          <select
            id="obraId"
            value={obraId}
            onChange={(e) => setObraId(e.target.value)}
            className={inputClass}
          >
            <option value="">Nenhuma (opcional)</option>
            {obras.map((obra) => (
              <option key={obra.id} value={obra.id}>{obra.nome}</option>
            ))}
          </select>
        )}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <label htmlFor="valor" className={labelClass}>Valor *</label>
          <input
            id="valor"
            type="text"
            inputMode="decimal"
            required
            value={valor}
            onChange={(e) => setValor(sanitizeCurrencyInput(e.target.value))}
            onBlur={() => {
              if (valor) {
                setValor(formatCurrencyInput(valor))
              }
            }}
            className={inputClass}
            placeholder="0,00"
          />
        </div>

        <div>
          <label htmlFor="dataVencimento" className={labelClass}>Data de Vencimento *</label>
          <input
            id="dataVencimento"
            type="text"
            required
            value={dataVencimentoDisplay}
            onChange={(e) => setDataVencimentoDisplay(e.target.value)}
            onBlur={() => {
              const iso = parseBrToIso(dataVencimentoDisplay)
              if (iso) {
                setDataVencimento(iso)
                setDataVencimentoDisplay(formatIsoToBr(iso))
              } else if (dataVencimento) {
                setDataVencimentoDisplay(formatIsoToBr(dataVencimento))
              }
            }}
            placeholder="DD/MM/AAAA"
            className={inputClass}
          />
          <p className="text-xs text-gray-500 mt-1">
            Formato: Dia/Mês/Ano. Datas passadas são permitidas.
          </p>
        </div>

        <div>
          <label htmlFor="status" className={labelClass}>Status *</label>
          <select
            id="status"
            value={status}
            onChange={(e) => handleStatusChange(e.target.value as ContaPagarStatus)}
            className={inputClass}
          >
            <option value="pendente">Pendente</option>
            <option value="vencido">Vencido</option>
            <option value="pago">Pago</option>
          </select>
        </div>

        <div>
          <label htmlFor="tipo" className={labelClass}>Tipo *</label>
          <select
            id="tipo"
            value={tipo}
            onChange={(e) => setTipo(e.target.value as ContaPagarTipo)}
            className={inputClass}
          >
            <option value="boleto">Boleto</option>
            <option value="escritorio">Escritório</option>
            <option value="folha">Folha de Pagamento</option>
            <option value="empreiteiro">Empreiteiro</option>
            {(canAccessParticular || conta?.tipo === 'particular') && (
              <option value="particular">Particular</option>
            )}
            <option value="outro">Outro</option>
          </select>
        </div>
      </div>

      <div className="border border-dark-100 rounded-xl p-4 sm:p-5 bg-dark-400/40 space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-brand">
          Parcelamento{' '}
          <span className="normal-case text-xs font-normal text-gray-400">
            (opcional, em branco = 1)
          </span>
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label htmlFor="parcelaAtual" className={labelClass}>Parcela atual</label>
            <input
              id="parcelaAtual"
              type="text"
              inputMode="numeric"
              value={parcelaAtualInput}
              onChange={(e) => {
                const next = e.target.value.replace(/[^\d]/g, '')
                setParcelaAtualInput(next)
              }}
              className={inputClass}
              placeholder="1"
            />
          </div>

          <div>
            <label htmlFor="totalParcelas" className={labelClass}>Total de parcelas</label>
            <input
              id="totalParcelas"
              type="text"
              inputMode="numeric"
              value={totalParcelasInput}
              onChange={(e) => {
                const next = e.target.value.replace(/[^\d]/g, '')
                setTotalParcelasInput(next)
              }}
              className={inputClass}
              placeholder="1"
            />
          </div>

          <div className="sm:col-span-2 flex items-end">
            <p className="text-sm text-gray-300">
              Referência da conta: <span className="font-semibold text-brand">{parcelaAtualNumero}/{Math.max(1, totalParcelasNumero)}</span>
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="sm:col-span-2">
            <label htmlFor="tipoRecorrenciaMensal" className={labelClass}>
              Conta recorrente{' '}
              <span className="normal-case text-xs font-normal text-gray-400">
                (se aplicável, caso não deixe em branco)
              </span>
            </label>
            <select
              id="tipoRecorrenciaMensal"
              value={tipoRecorrenciaMensal}
              onChange={(e) => {
                const nextTipo = e.target.value as 'em_branco' | 'boleto' | 'conta'
                setTipoRecorrenciaMensal(nextTipo)
                if (nextTipo === 'em_branco') {
                  setRecorrenciaMensal(false)
                  return
                }
                setRecorrenciaMensal(true)
              }}
              className={inputClass}
            >
              <option value="em_branco">Em branco</option>
              <option value="boleto">Boleto com cobrança mensal recorrente</option>
              <option value="conta">Conta recorrente mensal</option>
            </select>
          </div>
        </div>

        {hasParcelamento && (
          <div className="space-y-3">
            <label className="inline-flex items-center gap-2 text-sm text-gray-300 ml-0 sm:ml-4">
              <input
                type="checkbox"
                checked={gerarParcelasMensais}
                onChange={(e) => {
                  const nextChecked = e.target.checked
                  setGerarParcelasTouched(true)
                  setGerarParcelasMensais(nextChecked)
                  if (nextChecked) setRecorrenciaMensal(true)
                  if (!nextChecked) setEditarParcelasAvancado(false)
                }}
                className="rounded border-dark-100 bg-dark-500 text-brand focus:ring-brand"
              />
              Gerar cobranças automaticamente mês a mês ({parcelaAtualNumero}/{Math.max(1, totalParcelasNumero)} até {Math.max(1, totalParcelasNumero)}/{Math.max(1, totalParcelasNumero)})
            </label>

            {parcelamentoAvancadoDisponivel && (
              <label className="inline-flex items-center gap-2 text-sm text-gray-300 ml-0 sm:ml-4">
                <input
                  type="checkbox"
                  checked={editarParcelasAvancado}
                  onChange={(e) => setEditarParcelasAvancado(e.target.checked)}
                  className="rounded border-dark-100 bg-dark-500 text-brand focus:ring-brand"
                />
                Opção avançada: editar valor e vencimento de cada mês
              </label>
            )}
          </div>
        )}

        {parcelamentoAvancadoDisponivel && editarParcelasAvancado && (
          <div className="rounded-lg border border-dark-100 bg-dark-500 p-3">
            <p className="text-xs text-gray-400 mb-3">
              Configure individualmente o valor e a data de vencimento de cada mês.
            </p>

            <div className="space-y-2 max-h-80 overflow-auto pr-1">
	                  {parcelasEdicao.map((item) => (
	                <div key={item.parcela} className="grid grid-cols-1 sm:grid-cols-[110px_1fr_1fr] gap-2">
	                  <div className="px-3 py-2.5 rounded-lg border border-dark-100 bg-dark-400 text-sm text-gray-200 flex items-center">
	                    {item.parcela}/{Math.max(1, totalParcelasNumero)}
	                  </div>

                  <input
                    type="date"
                    value={item.dataVencimento}
                    onChange={(e) => handleParcelaDataChange(item.parcela, e.target.value)}
                    className="px-3 py-2.5 rounded-lg border border-dark-100 bg-dark-400 text-sm text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand"
                  />

                  <input
                    type="text"
                    inputMode="decimal"
                    value={item.valor}
                    onChange={(e) => handleParcelaValorChange(item.parcela, e.target.value)}
                    onBlur={() => handleParcelaValorBlur(item.parcela)}
                    placeholder="0,00"
                    className="px-3 py-2.5 rounded-lg border border-dark-100 bg-dark-400 text-sm text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand"
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="border border-dark-100 rounded-xl p-4 sm:p-5 bg-dark-400/40 space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-brand">Boleto e Código</h3>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div>
            <label htmlFor="linhaDigitavel" className={labelClass}>Linha Digitável</label>
            <textarea
              id="linhaDigitavel"
              value={linhaDigitavel}
              onChange={(e) => setLinhaDigitavel(e.target.value)}
              rows={2}
              className={inputClass}
              placeholder="Números do boleto..."
            />
          </div>
          <div>
            <label htmlFor="codigoBarras" className={labelClass}>Código de Barras (texto)</label>
            <textarea
              id="codigoBarras"
              value={codigoBarras}
              onChange={(e) => setCodigoBarras(e.target.value)}
              rows={2}
              className={inputClass}
              placeholder="Código de barras..."
            />
          </div>
        </div>

        <div>
          <label htmlFor="boletoFile" className={labelClass}>Arquivo do Boleto (PDF ou imagem)</label>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <label className="flex items-center px-4 py-2.5 bg-dark-400 border border-dark-100 rounded-lg text-gray-300 cursor-pointer hover:border-brand hover:text-brand transition-colors">
              <Upload className="w-4 h-4 mr-2" />
              {boletoFile ? 'Trocar boleto' : boletoUrl ? 'Substituir boleto' : 'Escolher boleto'}
              <input
                id="boletoFile"
                type="file"
                accept=".pdf,image/*"
                onChange={handleBoletoFileChange}
                className="hidden"
              />
            </label>
            <span className="text-sm text-gray-400 truncate max-w-full">
              {boletoFile?.name || (boletoUrl ? 'Boleto anexado' : 'Nenhum arquivo enviado')}
            </span>
            {boletoUrl && (
              <a
                href={boletoUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center text-sm text-brand hover:text-brand-light"
              >
                <ExternalLink className="w-4 h-4 mr-1.5" />
                Abrir boleto atual
              </a>
            )}
          </div>
        </div>
      </div>

      <div className="border border-dark-100 rounded-xl p-4 sm:p-5 bg-dark-400/40 space-y-4">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-brand">Forma de Pagamento</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label htmlFor="formaPagamento" className={labelClass}>Forma</label>
            <select
              id="formaPagamento"
              value={formaPagamento}
              onChange={(e) => setFormaPagamento(e.target.value as ContaPagarFormaPagamento)}
              className={inputClass}
            >
              <option value="">Selecione</option>
              {FORMAS_PAGAMENTO.map((forma) => (
                <option key={forma.value} value={forma.value}>{forma.label}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="dataPagamento" className={labelClass}>Data de Pagamento</label>
            <input
              id="dataPagamento"
              type="text"
              value={dataPagamentoDisplay}
              onChange={(e) => setDataPagamentoDisplay(e.target.value)}
              onBlur={() => {
                const iso = parseBrToIso(dataPagamentoDisplay)
                if (iso) {
                  setDataPagamento(iso)
                  setDataPagamentoDisplay(formatIsoToBr(iso))
                } else {
                  setDataPagamentoDisplay(dataPagamento ? formatIsoToBr(dataPagamento) : '')
                }
              }}
              placeholder="DD/MM/AAAA"
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="banco" className={labelClass}>Banco</label>
            <input
              id="banco"
              type="text"
              list="bancos-sugeridos"
              value={banco}
              onChange={(e) => setBanco(e.target.value)}
              className={inputClass}
              placeholder="Ex: Caixa, Itaú"
            />
            <datalist id="bancos-sugeridos">
              {bancosSugestoes.map((item) => (
                <option key={item} value={item} />
              ))}
            </datalist>
          </div>

          <div>
            <label htmlFor="agencia" className={labelClass}>Agência</label>
            <input
              id="agencia"
              type="text"
              value={agencia}
              onChange={(e) => setAgencia(e.target.value)}
              className={inputClass}
              placeholder="Ex: 1234"
            />
          </div>

          <div>
            <label htmlFor="contaBancaria" className={labelClass}>Conta do favorecido</label>
            <input
              id="contaBancaria"
              type="text"
              value={contaBancaria}
              onChange={(e) => setContaBancaria(e.target.value)}
              className={inputClass}
              placeholder="Ex: 12345-6"
            />
          </div>

          <div>
            <label htmlFor="chavePix" className={labelClass}>Chave PIX</label>
            <input
              id="chavePix"
              type="text"
              value={chavePix}
              onChange={(e) => setChavePix(e.target.value)}
              className={inputClass}
              placeholder="CPF, email, telefone..."
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label htmlFor="comprovanteMesReferencia" className={labelClass}>Mês de referência do comprovante</label>
            <input
              id="comprovanteMesReferencia"
              type="month"
              value={comprovanteMesReferencia}
              onChange={(e) => setComprovanteMesReferencia(e.target.value)}
              className={inputClass}
            />
          </div>

          <div>
            <label htmlFor="comprovanteParcelaReferencia" className={labelClass}>Parcela do comprovante</label>
	            <input
	              id="comprovanteParcelaReferencia"
	              type="number"
	              min={1}
	              max={Math.max(1, totalParcelasNumero)}
	              value={comprovanteParcelaReferencia}
	              onChange={(e) => setComprovanteParcelaReferencia(Number(e.target.value) || 1)}
	              className={inputClass}
	            />
          </div>
        </div>

        <div>
          <label htmlFor="comprovanteFile" className={labelClass}>Comprovante mensal (PDF ou imagem)</label>
          <div className="mt-1 flex flex-wrap items-center gap-3">
            <label className="flex items-center px-4 py-2.5 bg-dark-400 border border-dark-100 rounded-lg text-gray-300 cursor-pointer hover:border-brand hover:text-brand transition-colors">
              <Upload className="w-4 h-4 mr-2" />
              {comprovanteFile ? 'Trocar comprovante' : comprovanteUrl ? 'Substituir comprovante' : 'Escolher comprovante'}
              <input
                id="comprovanteFile"
                type="file"
                accept=".pdf,image/*"
                onChange={handleComprovanteFileChange}
                className="hidden"
              />
            </label>
            <span className="text-sm text-gray-400 truncate max-w-full">
              {comprovanteFile?.name || (comprovanteUrl ? 'Comprovante anexado' : 'Nenhum arquivo enviado')}
            </span>
            {comprovanteUrl && (
              <a
                href={comprovanteUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center text-sm text-brand hover:text-brand-light"
              >
                <ExternalLink className="w-4 h-4 mr-1.5" />
                Abrir comprovante atual
              </a>
            )}
          </div>
        </div>

        {comprovantesMensais.length > 0 && (
          <div>
            <p className="text-sm font-medium text-gray-300 mb-2">Comprovantes por mês/parcela</p>
            <div className="space-y-2">
	              {comprovantesMensais.map((item, index) => (
	                <div key={`${item.mesReferencia}-${item.parcela}-${index}`} className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-lg border border-dark-100 bg-dark-500 px-3 py-2">
	                  <p className="text-sm text-gray-200">
	                    Parcela {item.parcela}/{Math.max(1, totalParcelasNumero)} | Mês {formatMonthLabel(item.mesReferencia)}
	                  </p>
	                  <a
	                    href={item.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center text-sm text-brand hover:text-brand-light"
                  >
                    <ExternalLink className="w-4 h-4 mr-1.5" />
                    Abrir comprovante
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="flex flex-col sm:flex-row justify-end gap-3 pt-4 border-t border-dark-100">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex items-center justify-center px-4 py-2.5 border border-dark-100 rounded-lg text-gray-400 hover:border-gray-500 hover:text-gray-300 transition-colors min-h-touch"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Cancelar
        </button>
        <button
          type="submit"
          disabled={loading}
          className="flex items-center justify-center px-6 py-2.5 bg-brand text-dark-800 font-semibold rounded-lg hover:bg-brand-light disabled:opacity-50 transition-colors min-h-touch"
        >
          <Save className="w-4 h-4 mr-2" />
          {loading ? 'Salvando...' : conta ? 'Atualizar' : 'Criar'}
        </button>
      </div>
    </form>
  )
}
