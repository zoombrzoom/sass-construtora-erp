'use client'

import { useEffect, useMemo, useState } from 'react'
import { format } from 'date-fns'
import {
  Archive,
  ArrowDown,
  ArrowUp,
  Briefcase,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  FileText,
  Folder,
  Plus,
  Search,
  Shield,
  Star,
  Trash2,
  Upload,
  type LucideIcon,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { getPermissions } from '@/lib/permissions/check'
import { uploadImage } from '@/lib/storage/upload'
import { getObras } from '@/lib/db/obras'
import { Obra } from '@/types/obra'
import {
  DocumentoCategoria,
  DocumentoPasta,
  DocumentoPastaIcone,
  DocumentoVisibilidade,
  type Documento,
} from '@/types/documentos'
import {
  createDocumento,
  createDocumentoPasta,
  deleteDocumento,
  deleteDocumentoPasta,
  getDocumentos,
  getDocumentosPastas,
  updateDocumento,
  updateDocumentoPasta,
} from '@/lib/db/documentos'
import { toDate } from '@/utils/date'

const CATEGORIAS: { value: DocumentoCategoria; label: string }[] = [
  { value: 'contrato', label: 'Contrato' },
  { value: 'documento', label: 'Documento' },
  { value: 'aditivo', label: 'Aditivo' },
  { value: 'outro', label: 'Outro' },
]

const ICON_OPTIONS: { value: DocumentoPastaIcone; label: string; icon: LucideIcon }[] = [
  { value: 'folder', label: 'Pasta', icon: Folder },
  { value: 'briefcase', label: 'Maleta', icon: Briefcase },
  { value: 'shield', label: 'Escudo', icon: Shield },
  { value: 'archive', label: 'Arquivo', icon: Archive },
  { value: 'star', label: 'Estrela', icon: Star },
  { value: 'file-text', label: 'Documento', icon: FileText },
]

const ICON_MAP: Record<DocumentoPastaIcone, LucideIcon> = ICON_OPTIONS.reduce((acc, item) => {
  acc[item.value] = item.icon
  return acc
}, {} as Record<DocumentoPastaIcone, LucideIcon>)

function normalizeId(value?: string): string | null {
  return value || null
}

function sortByOrdem<T extends { ordem?: number; createdAt?: Date }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const ordemA = typeof a.ordem === 'number' ? a.ordem : 0
    const ordemB = typeof b.ordem === 'number' ? b.ordem : 0
    if (ordemA !== ordemB) return ordemA - ordemB
    const aDate = a.createdAt ? toDate(a.createdAt).getTime() : 0
    const bDate = b.createdAt ? toDate(b.createdAt).getTime() : 0
    return bDate - aDate
  })
}

export default function DocumentosPage() {
  const { user } = useAuth()
  const permissions = getPermissions(user)
  const canViewPrivateDocuments = permissions.canViewPrivateDocuments
  const canManageFolders = permissions.canManageUsers

  const [documentos, setDocumentos] = useState<Documento[]>([])
  const [pastas, setPastas] = useState<DocumentoPasta[]>([])
  const [obras, setObras] = useState<Obra[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [submittingDocumento, setSubmittingDocumento] = useState(false)
  const [submittingPasta, setSubmittingPasta] = useState(false)

  const [activeFolderId, setActiveFolderId] = useState<string | null>(null)
  const [expandedFolders, setExpandedFolders] = useState<string[]>([])

  const [busca, setBusca] = useState('')
  const [filtroObraId, setFiltroObraId] = useState('')
  const [filtroCategoria, setFiltroCategoria] = useState<DocumentoCategoria | 'todas'>('todas')
  const [filtroVisibilidade, setFiltroVisibilidade] = useState<'todas' | DocumentoVisibilidade>('todas')

  const [nomeDocumento, setNomeDocumento] = useState('')
  const [descricaoDocumento, setDescricaoDocumento] = useState('')
  const [categoriaDocumento, setCategoriaDocumento] = useState<DocumentoCategoria>('documento')
  const [obraIdDocumento, setObraIdDocumento] = useState('')
  const [visibilidadeDocumento, setVisibilidadeDocumento] = useState<DocumentoVisibilidade>('publico')
  const [folderIdDocumento, setFolderIdDocumento] = useState('')
  const [arquivoDocumento, setArquivoDocumento] = useState<File | null>(null)

  const [nomeNovaPasta, setNomeNovaPasta] = useState('')
  const [corNovaPasta, setCorNovaPasta] = useState('#D4AF37')
  const [iconeNovaPasta, setIconeNovaPasta] = useState<DocumentoPastaIcone>('folder')
  const [visibilidadeNovaPasta, setVisibilidadeNovaPasta] = useState<DocumentoVisibilidade>('publico')

  const [nomePastaEdicao, setNomePastaEdicao] = useState('')
  const [corPastaEdicao, setCorPastaEdicao] = useState('#D4AF37')
  const [iconePastaEdicao, setIconePastaEdicao] = useState<DocumentoPastaIcone>('folder')
  const [visibilidadePastaEdicao, setVisibilidadePastaEdicao] = useState<DocumentoVisibilidade>('publico')

  useEffect(() => {
    if (!canViewPrivateDocuments) {
      setVisibilidadeDocumento('publico')
      setVisibilidadeNovaPasta('publico')
      setVisibilidadePastaEdicao('publico')
    }
  }, [canViewPrivateDocuments])

  useEffect(() => {
    loadData()
  }, [canViewPrivateDocuments])

  useEffect(() => {
    setFolderIdDocumento(activeFolderId || '')
  }, [activeFolderId])

  const loadData = async () => {
    try {
      setLoading(true)
      const [docs, pastasData, obrasData] = await Promise.all([
        getDocumentos({ includePrivate: canViewPrivateDocuments }),
        getDocumentosPastas({ includePrivate: canViewPrivateDocuments }),
        getObras(),
      ])
      setDocumentos(docs)
      setPastas(pastasData)
      setObras(obrasData)
      setExpandedFolders((prev) => {
        const ids = new Set([...prev, ...pastasData.filter((item) => !item.parentId).map((item) => item.id)])
        return Array.from(ids)
      })
    } catch (err: any) {
      console.error('Erro ao carregar documentos:', err)
      setError(err?.message || 'Erro ao carregar dados')
    } finally {
      setLoading(false)
    }
  }

  const getObraNome = (id?: string) => {
    if (!id) return 'Sem obra'
    return obras.find((obra) => obra.id === id)?.nome || id
  }

  const getPastaById = (id: string | null) => {
    if (!id) return null
    return pastas.find((item) => item.id === id) || null
  }

  const getPastasFilhas = (parentId: string | null) => {
    return sortByOrdem(pastas.filter((item) => normalizeId(item.parentId) === parentId))
  }

  const getDocumentosDaPasta = (folderId: string | null) => {
    return sortByOrdem(
      documentos.filter((item) => normalizeId(item.folderId) === folderId)
    )
  }

  const pastaAtiva = useMemo(() => getPastaById(activeFolderId), [activeFolderId, pastas])

  useEffect(() => {
    if (!pastaAtiva) {
      setNomePastaEdicao('')
      setCorPastaEdicao('#D4AF37')
      setIconePastaEdicao('folder')
      setVisibilidadePastaEdicao('publico')
      return
    }
    setNomePastaEdicao(pastaAtiva.nome)
    setCorPastaEdicao(pastaAtiva.cor || '#D4AF37')
    setIconePastaEdicao(pastaAtiva.icone || 'folder')
    setVisibilidadePastaEdicao(pastaAtiva.visibilidade || 'publico')
  }, [pastaAtiva])

  const breadcrumb = useMemo(() => {
    const items: DocumentoPasta[] = []
    let current = pastaAtiva
    while (current) {
      items.unshift(current)
      current = current.parentId ? getPastaById(current.parentId) : null
    }
    return items
  }, [pastaAtiva, pastas])

  const filtrosAplicados = useMemo(() => {
    const buscaLower = busca.trim().toLowerCase()
    const folderId = activeFolderId

    const pastasFilhas = getPastasFilhas(folderId).filter((item) => {
      if (filtroVisibilidade !== 'todas' && item.visibilidade !== filtroVisibilidade) return false
      if (buscaLower && !item.nome.toLowerCase().includes(buscaLower)) return false
      return true
    })

    const docs = getDocumentosDaPasta(folderId).filter((item) => {
      if (filtroVisibilidade !== 'todas' && item.visibilidade !== filtroVisibilidade) return false
      if (filtroObraId && item.obraId !== filtroObraId) return false
      if (filtroCategoria !== 'todas' && item.categoria !== filtroCategoria) return false
      if (!buscaLower) return true
      const nome = item.nome.toLowerCase()
      const descricao = item.descricao?.toLowerCase() || ''
      const arquivo = item.arquivoNome.toLowerCase()
      return nome.includes(buscaLower) || descricao.includes(buscaLower) || arquivo.includes(buscaLower)
    })

    return { pastasFilhas, docs }
  }, [activeFolderId, busca, filtroObraId, filtroCategoria, filtroVisibilidade, pastas, documentos])

  const totaisComFiltrosGlobais = useMemo(() => {
    const buscaLower = busca.trim().toLowerCase()

    const pastasCount = pastas.filter((item) => {
      if (filtroVisibilidade !== 'todas' && item.visibilidade !== filtroVisibilidade) return false
      if (buscaLower && !item.nome.toLowerCase().includes(buscaLower)) return false
      return true
    }).length

    const docsCount = documentos.filter((item) => {
      if (filtroVisibilidade !== 'todas' && item.visibilidade !== filtroVisibilidade) return false
      if (filtroObraId && item.obraId !== filtroObraId) return false
      if (filtroCategoria !== 'todas' && item.categoria !== filtroCategoria) return false
      if (!buscaLower) return true
      const nome = item.nome.toLowerCase()
      const descricao = item.descricao?.toLowerCase() || ''
      const arquivo = item.arquivoNome.toLowerCase()
      return nome.includes(buscaLower) || descricao.includes(buscaLower) || arquivo.includes(buscaLower)
    }).length

    return { pastasCount, docsCount }
  }, [busca, filtroObraId, filtroCategoria, filtroVisibilidade, pastas, documentos])

  const folderOptions = useMemo(() => {
    const options: Array<{ id: string; label: string }> = []

    const appendRecursive = (parentId: string | null, depth: number) => {
      const children = getPastasFilhas(parentId)
      children.forEach((child) => {
        options.push({ id: child.id, label: `${'  '.repeat(depth)}${child.nome}` })
        appendRecursive(child.id, depth + 1)
      })
    }

    appendRecursive(null, 0)
    return options
  }, [pastas])

  const toggleExpanded = (id: string) => {
    setExpandedFolders((prev) => (
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    ))
  }

  const expandPathToFolder = (folderId: string | null) => {
    if (!folderId) return
    const ids: string[] = []
    let current = getPastaById(folderId)
    while (current) {
      ids.push(current.id)
      current = current.parentId ? getPastaById(current.parentId) : null
    }
    setExpandedFolders((prev) => Array.from(new Set([...prev, ...ids])))
  }

  const resetDocumentoForm = () => {
    setNomeDocumento('')
    setDescricaoDocumento('')
    setCategoriaDocumento('documento')
    setObraIdDocumento('')
    setVisibilidadeDocumento('publico')
    setArquivoDocumento(null)
  }

  const getNextOrdemPasta = (parentId: string | null) => {
    const siblings = getPastasFilhas(parentId)
    const maxOrdem = siblings.reduce((acc, item) => Math.max(acc, item.ordem || 0), 0)
    return maxOrdem + 1
  }

  const getNextOrdemDocumento = (folderId: string | null) => {
    const siblings = getDocumentosDaPasta(folderId)
    const maxOrdem = siblings.reduce((acc, item) => Math.max(acc, item.ordem || 0), 0)
    return maxOrdem + 1
  }

  const handleCreatePasta = async (parentId: string | null) => {
    if (!canManageFolders) {
      alert('Sem permissão para criar pastas.')
      return
    }
    if (!user) {
      alert('Usuário não autenticado.')
      return
    }
    if (!nomeNovaPasta.trim()) {
      alert('Informe o nome da pasta.')
      return
    }

    try {
      setSubmittingPasta(true)
      const visibilidadeFinal = canViewPrivateDocuments ? visibilidadeNovaPasta : 'publico'
      await createDocumentoPasta({
        nome: nomeNovaPasta.trim(),
        parentId: parentId || undefined,
        cor: corNovaPasta,
        icone: iconeNovaPasta,
        visibilidade: visibilidadeFinal,
        ordem: getNextOrdemPasta(parentId),
        createdBy: user.id,
      })
      setNomeNovaPasta('')
      await loadData()
      if (parentId) {
        expandPathToFolder(parentId)
      }
    } catch (err) {
      console.error('Erro ao criar pasta:', err)
      alert('Erro ao criar pasta.')
    } finally {
      setSubmittingPasta(false)
    }
  }

  const handleSavePastaEdicao = async () => {
    if (!canManageFolders || !activeFolderId) return
    if (!nomePastaEdicao.trim()) {
      alert('Informe o nome da pasta.')
      return
    }

    try {
      const visibilidadeFinal = canViewPrivateDocuments ? visibilidadePastaEdicao : 'publico'
      await updateDocumentoPasta(activeFolderId, {
        nome: nomePastaEdicao.trim(),
        cor: corPastaEdicao,
        icone: iconePastaEdicao,
        visibilidade: visibilidadeFinal,
      })
      await loadData()
    } catch (err) {
      console.error('Erro ao salvar pasta:', err)
      alert('Erro ao salvar pasta.')
    }
  }

  const handleDeletePasta = async (pastaId: string) => {
    if (!canManageFolders) return
    const hasChildren = pastas.some((item) => normalizeId(item.parentId) === pastaId)
    const hasDocs = documentos.some((item) => normalizeId(item.folderId) === pastaId)

    if (hasChildren || hasDocs) {
      alert('A pasta precisa estar vazia (sem pastas dentro e sem documentos) para excluir.')
      return
    }

    if (!confirm('Excluir esta pasta?')) return

    try {
      await deleteDocumentoPasta(pastaId)
      if (activeFolderId === pastaId) setActiveFolderId(null)
      await loadData()
    } catch (err) {
      console.error('Erro ao excluir pasta:', err)
      alert('Erro ao excluir pasta.')
    }
  }

  const movePasta = async (pastaId: string, direction: 'up' | 'down') => {
    if (!canManageFolders) return
    const pasta = getPastaById(pastaId)
    if (!pasta) return

    const siblings = getPastasFilhas(normalizeId(pasta.parentId))
    const currentIndex = siblings.findIndex((item) => item.id === pastaId)
    if (currentIndex < 0) return
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
    if (targetIndex < 0 || targetIndex >= siblings.length) return

    const target = siblings[targetIndex]
    try {
      await Promise.all([
        updateDocumentoPasta(pasta.id, { ordem: target.ordem }),
        updateDocumentoPasta(target.id, { ordem: pasta.ordem }),
      ])
      await loadData()
    } catch (err) {
      console.error('Erro ao mover pasta:', err)
      alert('Erro ao mover pasta.')
    }
  }

  const moveDocumento = async (documentoId: string, direction: 'up' | 'down') => {
    if (!canManageFolders) return
    const documento = documentos.find((item) => item.id === documentoId)
    if (!documento) return

    const siblings = getDocumentosDaPasta(normalizeId(documento.folderId))
    const currentIndex = siblings.findIndex((item) => item.id === documentoId)
    if (currentIndex < 0) return
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1
    if (targetIndex < 0 || targetIndex >= siblings.length) return

    const target = siblings[targetIndex]
    try {
      await Promise.all([
        updateDocumento(documento.id, { ordem: target.ordem }),
        updateDocumento(target.id, { ordem: documento.ordem }),
      ])
      await loadData()
    } catch (err) {
      console.error('Erro ao mover documento:', err)
      alert('Erro ao mover documento.')
    }
  }

  const handleDeleteDocumento = async (id: string) => {
    if (!canManageFolders) {
      alert('Sem permissão para excluir documentos.')
      return
    }
    if (!confirm('Excluir este documento?')) return

    try {
      await deleteDocumento(id)
      await loadData()
    } catch (err) {
      console.error('Erro ao excluir documento:', err)
      alert('Erro ao excluir documento.')
    }
  }

  const handleCreateDocumento = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!user) {
      alert('Usuário não autenticado.')
      return
    }
    if (!nomeDocumento.trim()) {
      alert('Informe o nome do documento.')
      return
    }
    if (!arquivoDocumento) {
      alert('Selecione um arquivo.')
      return
    }

    try {
      setSubmittingDocumento(true)
      const visibilidadeFinal = canViewPrivateDocuments ? visibilidadeDocumento : 'publico'
      const folderId = normalizeId(folderIdDocumento)
      const baseName = arquivoDocumento.name
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^\w.-]+/g, '_')
      const uploadToken = `${user.id}_${Date.now()}`
      const candidatePaths = [
        `documentos/${uploadToken}_${baseName}`,
        `uploads/documentos/${uploadToken}_${baseName}`,
        `comprovantes/${uploadToken}_${baseName}`,
      ]
      let arquivoUrl = ''
      let uploadError: any = null

      for (const path of candidatePaths) {
        try {
          arquivoUrl = await uploadImage(arquivoDocumento, path, false)
          uploadError = null
          break
        } catch (err) {
          uploadError = err
          console.warn(`Falha no upload para "${path}"`, err)
        }
      }

      if (!arquivoUrl) {
        throw uploadError || new Error('Falha no upload do arquivo')
      }

      await createDocumento({
        nome: nomeDocumento.trim(),
        descricao: descricaoDocumento.trim(),
        categoria: categoriaDocumento,
        obraId: obraIdDocumento || undefined,
        folderId: folderId || undefined,
        visibilidade: visibilidadeFinal,
        arquivoNome: arquivoDocumento.name,
        arquivoUrl,
        ordem: getNextOrdemDocumento(folderId),
        createdBy: user.id,
      })

      resetDocumentoForm()
      setError('')
      await loadData()
    } catch (err: any) {
      console.error('Erro ao criar documento:', err)
      const rawMessage = String(err?.message || '')
      const unauthorized =
        rawMessage.includes('storage/unauthorized') ||
        rawMessage.toLowerCase().includes('permission') ||
        rawMessage.toLowerCase().includes('unauthorized')
      const storageUnknown =
        rawMessage.includes('storage/unknown') ||
        rawMessage.toLowerCase().includes('check the error payload for server response')
      const message = unauthorized
        ? 'Erro ao salvar documento: sem permissão para upload. Verifique regras do Firebase Storage.'
        : storageUnknown
          ? 'Erro ao salvar documento: o Firebase Storage do projeto ainda não está configurado. Abra o Firebase Console > Storage > Começar.'
        : `Erro ao salvar documento${rawMessage ? `: ${rawMessage}` : '.'}`
      setError(message)
      alert(message)
    } finally {
      setSubmittingDocumento(false)
    }
  }

  const renderFolderTree = (parentId: string | null, depth = 0): React.ReactNode => {
    const children = getPastasFilhas(parentId)
    if (children.length === 0) return null

    return (
      <ul className="space-y-1">
        {children.map((folder) => {
          const hasChildren = getPastasFilhas(folder.id).length > 0
          const isExpanded = expandedFolders.includes(folder.id)
          const isSelected = activeFolderId === folder.id
          const Icon = ICON_MAP[folder.icone || 'folder'] || Folder

          return (
            <li key={folder.id}>
              <div
                className={`flex items-center gap-1 rounded-lg px-2 py-1.5 ${
                  isSelected ? 'bg-brand/20 border border-brand/40' : 'hover:bg-dark-400'
                }`}
                style={{ marginLeft: depth * 12 }}
              >
                <button
                  type="button"
                  onClick={() => hasChildren && toggleExpanded(folder.id)}
                  className="text-gray-400 hover:text-gray-200 w-4 h-4 flex items-center justify-center"
                >
                  {hasChildren ? (
                    isExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />
                  ) : (
                    <span className="w-3.5 h-3.5" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => {
                    setActiveFolderId(folder.id)
                    expandPathToFolder(folder.id)
                  }}
                  className="flex items-center gap-2 flex-1 min-w-0 text-left"
                >
                  <Icon className="w-4 h-4 flex-shrink-0" style={{ color: folder.cor || '#D4AF37' }} />
                  <span className="text-sm text-gray-200 truncate">{folder.nome}</span>
                </button>
              </div>

              {hasChildren && isExpanded && renderFolderTree(folder.id, depth + 1)}
            </li>
          )
        })}
      </ul>
    )
  }

  if (loading) {
    return <div className="text-center py-12 text-gray-400">Carregando...</div>
  }

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <FileText className="w-7 h-7 text-brand" />
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-brand">Documentos e Contratos</h1>
          <p className="text-sm text-gray-400 mt-1">
            Organização em pastas por níveis com filtros, posição, cor e ícone.
          </p>
        </div>
      </div>

      {error && (
        <div className="mb-4 text-sm text-error bg-error/20 border border-error/30 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[360px_1fr] gap-4">
        <aside className="space-y-4">
          <section className="bg-dark-500 border border-dark-100 rounded-xl p-4 sm:p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-brand mb-3">Pastas</h2>

            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Nome da pasta</label>
                <input
                  type="text"
                  value={nomeNovaPasta}
                  onChange={(e) => setNomeNovaPasta(e.target.value)}
                  placeholder="Nova pasta"
                  className="w-full px-3 py-2.5 bg-dark-400 border border-dark-100 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Cor</label>
                  <input
                    type="color"
                    value={corNovaPasta}
                    onChange={(e) => setCorNovaPasta(e.target.value)}
                    className="w-full h-10 rounded-lg border border-dark-100 bg-dark-400 cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-400 mb-1">Ícone</label>
                  <select
                    value={iconeNovaPasta}
                    onChange={(e) => setIconeNovaPasta(e.target.value as DocumentoPastaIcone)}
                    className="w-full px-3 py-2.5 bg-dark-400 border border-dark-100 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand"
                  >
                    {ICON_OPTIONS.map((item) => (
                      <option key={item.value} value={item.value}>{item.label}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1">Visibilidade</label>
                <select
                  value={visibilidadeNovaPasta}
                  onChange={(e) => setVisibilidadeNovaPasta(e.target.value as DocumentoVisibilidade)}
                  disabled={!canViewPrivateDocuments}
                  className="w-full px-3 py-2.5 bg-dark-400 border border-dark-100 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand disabled:opacity-60"
                >
                  <option value="publico">Público</option>
                  {canViewPrivateDocuments && <option value="admin_only">Apenas admin</option>}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  disabled={!canManageFolders || submittingPasta}
                  onClick={() => handleCreatePasta(null)}
                  className="inline-flex items-center justify-center px-3 py-2.5 bg-dark-300 border border-dark-100 rounded-lg text-gray-200 hover:text-brand hover:border-brand disabled:opacity-50 transition-colors"
                >
                  <Plus className="w-4 h-4 mr-1.5" />
                  Nova pasta
                </button>
                <button
                  type="button"
                  disabled={!canManageFolders || !activeFolderId || submittingPasta}
                  onClick={() => handleCreatePasta(activeFolderId)}
                  className="inline-flex items-center justify-center px-3 py-2.5 bg-dark-300 border border-dark-100 rounded-lg text-gray-200 hover:text-brand hover:border-brand disabled:opacity-50 transition-colors"
                >
                  <Plus className="w-4 h-4 mr-1.5" />
                  Pasta dentro
                </button>
              </div>
            </div>

            <div className="mt-4 pt-4 border-t border-dark-100">
              <button
                type="button"
                onClick={() => setActiveFolderId(null)}
                className={`w-full text-left px-3 py-2 rounded-lg mb-2 ${
                  activeFolderId === null ? 'bg-brand/20 text-brand border border-brand/40' : 'text-gray-300 hover:bg-dark-400'
                }`}
              >
                Início
              </button>

              <div className="max-h-72 overflow-y-auto pr-1">
                {renderFolderTree(null)}
              </div>
            </div>

            {pastaAtiva && (
              <div className="mt-4 pt-4 border-t border-dark-100 space-y-3">
                <h3 className="text-xs uppercase tracking-wide text-gray-500">Editar pasta ativa</h3>
                <input
                  type="text"
                  value={nomePastaEdicao}
                  onChange={(e) => setNomePastaEdicao(e.target.value)}
                  className="w-full px-3 py-2.5 bg-dark-400 border border-dark-100 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand"
                />
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="color"
                    value={corPastaEdicao}
                    onChange={(e) => setCorPastaEdicao(e.target.value)}
                    className="w-full h-10 rounded-lg border border-dark-100 bg-dark-400 cursor-pointer"
                  />
                  <select
                    value={iconePastaEdicao}
                    onChange={(e) => setIconePastaEdicao(e.target.value as DocumentoPastaIcone)}
                    className="w-full px-3 py-2.5 bg-dark-400 border border-dark-100 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand"
                  >
                    {ICON_OPTIONS.map((item) => (
                      <option key={item.value} value={item.value}>{item.label}</option>
                    ))}
                  </select>
                </div>
                <select
                  value={visibilidadePastaEdicao}
                  onChange={(e) => setVisibilidadePastaEdicao(e.target.value as DocumentoVisibilidade)}
                  disabled={!canViewPrivateDocuments}
                  className="w-full px-3 py-2.5 bg-dark-400 border border-dark-100 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand disabled:opacity-60"
                >
                  <option value="publico">Público</option>
                  {canViewPrivateDocuments && <option value="admin_only">Apenas admin</option>}
                </select>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={!canManageFolders}
                    onClick={handleSavePastaEdicao}
                    className="px-3 py-2.5 bg-brand text-dark-800 font-semibold rounded-lg hover:bg-brand-light disabled:opacity-50"
                  >
                    Salvar
                  </button>
                  <button
                    type="button"
                    disabled={!canManageFolders}
                    onClick={() => handleDeletePasta(pastaAtiva.id)}
                    className="inline-flex items-center justify-center px-3 py-2.5 border border-error/40 rounded-lg text-error hover:bg-error/10 disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4 mr-1.5" />
                    Excluir
                  </button>
                </div>
              </div>
            )}
          </section>

          <section className="bg-dark-500 border border-dark-100 rounded-xl p-4 sm:p-5">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-brand mb-3">Novo Documento</h2>

            <form onSubmit={handleCreateDocumento} className="space-y-3">
              <div>
                <label className="block text-xs text-gray-400 mb-1">Nome *</label>
                <input
                  type="text"
                  value={nomeDocumento}
                  onChange={(e) => setNomeDocumento(e.target.value)}
                  className="w-full px-3 py-2.5 bg-dark-400 border border-dark-100 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1">Descrição</label>
                <textarea
                  rows={3}
                  value={descricaoDocumento}
                  onChange={(e) => setDescricaoDocumento(e.target.value)}
                  className="w-full px-3 py-2.5 bg-dark-400 border border-dark-100 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand"
                />
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1">Categoria</label>
                <select
                  value={categoriaDocumento}
                  onChange={(e) => setCategoriaDocumento(e.target.value as DocumentoCategoria)}
                  className="w-full px-3 py-2.5 bg-dark-400 border border-dark-100 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand"
                >
                  {CATEGORIAS.map((item) => (
                    <option key={item.value} value={item.value}>{item.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1">Pasta</label>
                <select
                  value={folderIdDocumento}
                  onChange={(e) => setFolderIdDocumento(e.target.value)}
                  className="w-full px-3 py-2.5 bg-dark-400 border border-dark-100 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand"
                >
                  <option value="">Sem pasta (início)</option>
                  {folderOptions.map((item) => (
                    <option key={item.id} value={item.id}>{item.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1">Obra</label>
                <select
                  value={obraIdDocumento}
                  onChange={(e) => setObraIdDocumento(e.target.value)}
                  className="w-full px-3 py-2.5 bg-dark-400 border border-dark-100 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand"
                >
                  <option value="">Sem obra</option>
                  {obras.map((obra) => (
                    <option key={obra.id} value={obra.id}>{obra.nome}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1">Visibilidade</label>
                <select
                  value={visibilidadeDocumento}
                  onChange={(e) => setVisibilidadeDocumento(e.target.value as DocumentoVisibilidade)}
                  disabled={!canViewPrivateDocuments}
                  className="w-full px-3 py-2.5 bg-dark-400 border border-dark-100 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand disabled:opacity-60"
                >
                  <option value="publico">Público</option>
                  {canViewPrivateDocuments && <option value="admin_only">Apenas admin</option>}
                </select>
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1">Arquivo *</label>
                <label className="flex items-center justify-center px-3 py-2.5 border border-dashed border-dark-100 rounded-lg bg-dark-400 text-gray-300 hover:border-brand hover:text-brand transition-colors cursor-pointer">
                  <Upload className="w-4 h-4 mr-2" />
                  {arquivoDocumento ? 'Trocar arquivo' : 'Selecionar arquivo'}
                  <input
                    type="file"
                    accept=".pdf,image/*,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.zip,.rar"
                    onChange={(e) => setArquivoDocumento(e.target.files?.[0] || null)}
                    className="hidden"
                  />
                </label>
                <p className="text-xs text-gray-500 mt-1 truncate">
                  {arquivoDocumento?.name || 'Nenhum arquivo selecionado'}
                </p>
              </div>

              <button
                type="submit"
                disabled={submittingDocumento}
                className="w-full flex items-center justify-center px-4 py-2.5 bg-brand text-dark-800 font-semibold rounded-lg hover:bg-brand-light disabled:opacity-50 transition-colors"
              >
                {submittingDocumento ? 'Enviando...' : 'Salvar Documento'}
              </button>
            </form>
          </section>
        </aside>

        <section className="bg-dark-500 border border-dark-100 rounded-xl p-4 sm:p-5">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between mb-4">
            <div>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-brand">Arquivos</h2>
              <div className="text-xs text-gray-400 mt-1 flex flex-wrap items-center gap-1">
                <button type="button" onClick={() => setActiveFolderId(null)} className="hover:text-brand">
                  Início
                </button>
                {breadcrumb.map((item) => (
                  <span key={item.id} className="inline-flex items-center gap-1">
                    <ChevronRight className="w-3.5 h-3.5" />
                    <button
                      type="button"
                      onClick={() => setActiveFolderId(item.id)}
                      className="hover:text-brand"
                    >
                      {item.nome}
                    </button>
                  </span>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 w-full md:w-auto md:min-w-[620px]">
              <div className="sm:col-span-2 relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
                <input
                  type="text"
                  value={busca}
                  onChange={(e) => setBusca(e.target.value)}
                  placeholder="Buscar pasta ou documento..."
                  className="w-full pl-9 pr-3 py-2.5 bg-dark-400 border border-dark-100 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand"
                />
              </div>
              <select
                value={filtroObraId}
                onChange={(e) => setFiltroObraId(e.target.value)}
                className="w-full px-3 py-2.5 bg-dark-400 border border-dark-100 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand"
              >
                <option value="">Todas as obras</option>
                {obras.map((obra) => (
                  <option key={obra.id} value={obra.id}>{obra.nome}</option>
                ))}
              </select>
              <div className="grid grid-cols-2 gap-2">
                <select
                  value={filtroCategoria}
                  onChange={(e) => setFiltroCategoria(e.target.value as DocumentoCategoria | 'todas')}
                  className="w-full px-2 py-2.5 bg-dark-400 border border-dark-100 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand"
                >
                  <option value="todas">Categoria</option>
                  {CATEGORIAS.map((item) => (
                    <option key={item.value} value={item.value}>{item.label}</option>
                  ))}
                </select>
                <select
                  value={filtroVisibilidade}
                  onChange={(e) => setFiltroVisibilidade(e.target.value as 'todas' | DocumentoVisibilidade)}
                  className="w-full px-2 py-2.5 bg-dark-400 border border-dark-100 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand"
                >
                  <option value="todas">Visibilidade</option>
                  <option value="publico">Público</option>
                  {canViewPrivateDocuments && <option value="admin_only">Admin</option>}
                </select>
              </div>
            </div>
          </div>

          {(filtrosAplicados.pastasFilhas.length === 0 && filtrosAplicados.docs.length === 0) ? (
            <div className="text-center py-14 text-gray-500">
              <p>Nenhum item nesta pasta com os filtros atuais.</p>
              {activeFolderId && (totaisComFiltrosGlobais.pastasCount > 0 || totaisComFiltrosGlobais.docsCount > 0) && (
                <div className="mt-4 space-y-2">
                  <p className="text-xs text-gray-400">
                    Existem {totaisComFiltrosGlobais.pastasCount} pasta(s) e {totaisComFiltrosGlobais.docsCount} documento(s) em outras pastas.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveFolderId(null)}
                    className="inline-flex items-center px-3 py-2 rounded-lg border border-dark-100 bg-dark-400 text-gray-200 hover:text-brand hover:border-brand transition-colors"
                  >
                    Ver tudo no Início
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filtrosAplicados.pastasFilhas.length > 0 && (
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">Pastas</p>
                  <ul className="space-y-2">
                    {filtrosAplicados.pastasFilhas.map((folder) => {
                      const Icon = ICON_MAP[folder.icone || 'folder'] || Folder
                      const qtdSubpastas = getPastasFilhas(folder.id).length
                      const qtdDocs = getDocumentosDaPasta(folder.id).length
                      return (
                        <li key={folder.id} className="bg-dark-400 border border-dark-100 rounded-lg p-3">
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                            <button
                              type="button"
                              onClick={() => {
                                setActiveFolderId(folder.id)
                                expandPathToFolder(folder.id)
                              }}
                              className="flex items-center gap-2 text-left"
                            >
                              <Icon className="w-4 h-4" style={{ color: folder.cor || '#D4AF37' }} />
                              <span className="text-sm font-medium text-gray-100">{folder.nome}</span>
                            </button>

                            <div className="flex items-center gap-2">
                              <span className="text-xs text-gray-500">
                                {qtdSubpastas} pasta(s) dentro | {qtdDocs} arquivo(s)
                              </span>
                              {canManageFolders && (
                                <>
                                  <button
                                    type="button"
                                    onClick={() => movePasta(folder.id, 'up')}
                                    className="p-1.5 rounded border border-dark-100 text-gray-300 hover:text-brand hover:border-brand"
                                    title="Mover para cima"
                                  >
                                    <ArrowUp className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => movePasta(folder.id, 'down')}
                                    className="p-1.5 rounded border border-dark-100 text-gray-300 hover:text-brand hover:border-brand"
                                    title="Mover para baixo"
                                  >
                                    <ArrowDown className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => handleDeletePasta(folder.id)}
                                    className="p-1.5 rounded border border-error/40 text-error hover:bg-error/10"
                                    title="Excluir pasta"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </>
                              )}
                            </div>
                          </div>
                        </li>
                      )
                    })}
                  </ul>
                </div>
              )}

              {filtrosAplicados.docs.length > 0 && (
                <div>
                  <p className="text-xs uppercase tracking-wide text-gray-500 mb-2">Documentos</p>
                  <ul className="space-y-2">
                    {filtrosAplicados.docs.map((item) => (
                      <li key={item.id} className="bg-dark-400 border border-dark-100 rounded-lg p-3">
                        <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-2">
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-gray-100 truncate">{item.nome}</p>
                            <p className="text-xs text-gray-500 mt-0.5">
                              {item.visibilidade === 'admin_only' ? 'Privado (admin)' : 'Público'}
                              {' '}| {getObraNome(item.obraId)}
                              {' '}| {format(toDate(item.createdAt), 'dd/MM/yyyy')}
                            </p>
                            {item.descricao && (
                              <p className="text-xs text-gray-400 mt-2 whitespace-pre-wrap">{item.descricao}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            <a
                              href={item.arquivoUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center text-sm text-brand hover:text-brand-light"
                            >
                              <ExternalLink className="w-4 h-4 mr-1" />
                              Abrir
                            </a>
                            {canManageFolders && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => moveDocumento(item.id, 'up')}
                                  className="p-1.5 rounded border border-dark-100 text-gray-300 hover:text-brand hover:border-brand"
                                  title="Mover para cima"
                                >
                                  <ArrowUp className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => moveDocumento(item.id, 'down')}
                                  className="p-1.5 rounded border border-dark-100 text-gray-300 hover:text-brand hover:border-brand"
                                  title="Mover para baixo"
                                >
                                  <ArrowDown className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteDocumento(item.id)}
                                  className="p-1.5 rounded border border-error/40 text-error hover:bg-error/10"
                                  title="Excluir documento"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}
