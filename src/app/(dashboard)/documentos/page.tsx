'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import {
  ChevronDown,
  ChevronRight,
  ExternalLink,
  File,
  FileArchive,
  FileAudio,
  FileImage,
  FileText,
  FileVideo,
  Folder,
  MoreVertical,
  Plus,
  Search,
  Upload,
} from 'lucide-react'
import { format } from 'date-fns'
import { useAuth } from '@/hooks/useAuth'
import { getPermissions } from '@/lib/permissions/check'
import { uploadImage } from '@/lib/storage/upload'
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
import type { Documento, DocumentoPasta } from '@/types/documentos'
import { toDate } from '@/utils/date'

type Row =
  | { kind: 'folder'; folder: DocumentoPasta }
  | { kind: 'file'; file: Documento }

function normalizeId(value?: string): string | null {
  return value || null
}

function formatSize(bytes?: number): string {
  if (!bytes || bytes <= 0) return '-'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  let value = bytes
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit += 1
  }
  const fixed = value >= 10 || unit === 0 ? 0 : 1
  return `${value.toFixed(fixed)} ${units[unit]}`
}

function getFileIcon(mimeType?: string, fileName?: string) {
  const mt = (mimeType || '').toLowerCase()
  const name = (fileName || '').toLowerCase()
  if (mt.startsWith('image/') || /\.(png|jpe?g|gif|webp|svg)$/.test(name)) return FileImage
  if (mt.startsWith('video/') || /\.(mp4|mov|mkv|webm)$/.test(name)) return FileVideo
  if (mt.startsWith('audio/') || /\.(mp3|wav|ogg)$/.test(name)) return FileAudio
  if (mt === 'application/pdf' || /\.(pdf)$/.test(name)) return FileText
  if (/\.(zip|rar|7z)$/.test(name)) return FileArchive
  return File
}

const FOLDER_COLORS = [
  '#1A73E8', // blue
  '#34A853', // green
  '#FBBC04', // yellow
  '#EA4335', // red
  '#A142F4', // purple
  '#00ACC1', // cyan
  '#D4AF37', // gold (brand-ish)
  '#9AA0A6', // gray
]

export default function DocumentosPage() {
  const { user } = useAuth()
  const permissions = getPermissions(user)
  const canViewPrivateDocuments = permissions.canViewPrivateDocuments
  // Pode gerenciar (renomear/mover/excluir) seguindo regras do Firestore.
  const canManageDrive = Boolean(user && (user.role === 'admin' || user.role === 'financeiro' || user.role === 'secretaria'))

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [folders, setFolders] = useState<DocumentoPasta[]>([])
  const [files, setFiles] = useState<Documento[]>([])

  const [activeFolderId, setActiveFolderId] = useState<string | null>(null)
  const [expandedFolders, setExpandedFolders] = useState<string[]>([])
  const [search, setSearch] = useState('')

  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const [menuNewOpen, setMenuNewOpen] = useState(false)
  const [rowMenu, setRowMenu] = useState<{ id: string; kind: Row['kind'] } | null>(null)

  const [modalCreateFolder, setModalCreateFolder] = useState(false)
  const [newFolderName, setNewFolderName] = useState('')
  const [newFolderColor, setNewFolderColor] = useState(FOLDER_COLORS[0])

  const [modalRename, setModalRename] = useState<{ kind: Row['kind']; id: string } | null>(null)
  const [renameValue, setRenameValue] = useState('')

  const [modalMove, setModalMove] = useState<{ kind: Row['kind']; id: string } | null>(null)
  const [moveTargetFolderId, setMoveTargetFolderId] = useState<string>('') // '' == root

  const [modalColor, setModalColor] = useState<string | null>(null) // folder id
  const [colorValue, setColorValue] = useState(FOLDER_COLORS[0])

  const [uploading, setUploading] = useState(false)

  useEffect(() => {
    loadData()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canViewPrivateDocuments])

  const loadData = async () => {
    try {
      setLoading(true)
      setError('')
      const [docs, pastas] = await Promise.all([
        getDocumentos({ includePrivate: canViewPrivateDocuments }),
        getDocumentosPastas({ includePrivate: canViewPrivateDocuments }),
      ])
      setFiles(docs)
      setFolders(pastas)
      setExpandedFolders((prev) => {
        const topLevel = pastas.filter((p) => !p.parentId).map((p) => p.id)
        const next = new Set([...prev, ...topLevel])
        return Array.from(next)
      })
    } catch (err: any) {
      console.error('Erro ao carregar documentos:', err)
      setError(err?.message || 'Erro ao carregar documentos.')
    } finally {
      setLoading(false)
    }
  }

  const getFolderById = (id: string | null) => {
    if (!id) return null
    return folders.find((f) => f.id === id) || null
  }

  const breadcrumb = useMemo(() => {
    const items: DocumentoPasta[] = []
    let current = getFolderById(activeFolderId)
    while (current) {
      items.unshift(current)
      current = current.parentId ? getFolderById(current.parentId) : null
    }
    return items
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeFolderId, folders])

  const childFolders = useMemo(() => {
    const parentId = activeFolderId
    const list = folders.filter((f) => normalizeId(f.parentId) === parentId)
    return [...list].sort((a, b) => a.nome.localeCompare(b.nome))
  }, [activeFolderId, folders])

  const childFiles = useMemo(() => {
    const parentId = activeFolderId
    const list = files.filter((d) => normalizeId(d.folderId) === parentId)
    return [...list].sort((a, b) => a.nome.localeCompare(b.nome))
  }, [activeFolderId, files])

  const rows = useMemo(() => {
    const q = search.trim().toLowerCase()
    const f = childFolders
      .filter((item) => !q || item.nome.toLowerCase().includes(q))
      .map((folder) => ({ kind: 'folder' as const, folder }))
    const d = childFiles
      .filter((item) => {
        if (!q) return true
        const nome = item.nome.toLowerCase()
        const arquivo = item.arquivoNome.toLowerCase()
        return nome.includes(q) || arquivo.includes(q)
      })
      .map((file) => ({ kind: 'file' as const, file }))
    return [...f, ...d]
  }, [childFolders, childFiles, search])

  const folderOptions = useMemo(() => {
    const options: Array<{ id: string; label: string }> = []
    const walk = (parentId: string | null, depth: number) => {
      const children = folders
        .filter((f) => normalizeId(f.parentId) === parentId)
        .sort((a, b) => a.nome.localeCompare(b.nome))
      for (const child of children) {
        options.push({ id: child.id, label: `${'  '.repeat(depth)}${child.nome}` })
        walk(child.id, depth + 1)
      }
    }
    walk(null, 0)
    return options
  }, [folders])

  const getFolderDescendants = (folderId: string) => {
    const descendants = new Set<string>()
    const stack = [folderId]
    while (stack.length > 0) {
      const current = stack.pop()!
      const children = folders.filter((f) => f.parentId === current).map((f) => f.id)
      for (const child of children) {
        if (descendants.has(child)) continue
        descendants.add(child)
        stack.push(child)
      }
    }
    return descendants
  }

  const toggleExpanded = (folderId: string) => {
    setExpandedFolders((prev) => (prev.includes(folderId) ? prev.filter((id) => id !== folderId) : [...prev, folderId]))
  }

  const expandPathToFolder = (folderId: string) => {
    const toExpand: string[] = []
    let current = getFolderById(folderId)
    while (current?.parentId) {
      toExpand.push(current.parentId)
      current = getFolderById(current.parentId)
    }
    setExpandedFolders((prev) => Array.from(new Set([...prev, ...toExpand])))
  }

  const openCreateFolder = () => {
    if (!canManageDrive) return
    setNewFolderName('')
    setNewFolderColor(FOLDER_COLORS[0])
    setModalCreateFolder(true)
    setMenuNewOpen(false)
  }

  const handleCreateFolder = async () => {
    if (!canManageDrive) return
    if (!user) return
    if (!newFolderName.trim()) {
      alert('Informe o nome da pasta.')
      return
    }
    try {
      await createDocumentoPasta({
        nome: newFolderName.trim(),
        parentId: activeFolderId || undefined,
        cor: newFolderColor,
        icone: 'folder',
        visibilidade: canViewPrivateDocuments ? 'publico' : 'publico',
        ordem: Date.now(),
        createdBy: user.id,
      })
      setModalCreateFolder(false)
      await loadData()
    } catch (err) {
      console.error('Erro ao criar pasta:', err)
      alert('Erro ao criar pasta.')
    }
  }

  const triggerUpload = () => {
    if (!canManageDrive) return
    setMenuNewOpen(false)
    fileInputRef.current?.click()
  }

  const handleUploadFiles = async (fileList: FileList | null) => {
    if (!canManageDrive) return
    if (!user) return
    if (!fileList || fileList.length === 0) return

    setUploading(true)
    setError('')
    try {
      const folderId = activeFolderId || undefined
      const filesArr = Array.from(fileList)

      for (let i = 0; i < filesArr.length; i++) {
        const file = filesArr[i]
        const baseName = file.name
          .normalize('NFD')
          .replace(/[\u0300-\u036f]/g, '')
          .replace(/[^\w.-]+/g, '_')
        const uploadToken = `${user.id}_${Date.now()}_${i}`
        const candidatePaths = [
          `documentos/${uploadToken}_${baseName}`,
          `uploads/documentos/${uploadToken}_${baseName}`,
          `comprovantes/${uploadToken}_${baseName}`,
        ]

        let arquivoUrl = ''
        let arquivoPath = ''
        let uploadError: any = null

        for (const path of candidatePaths) {
          try {
            arquivoUrl = await uploadImage(file, path, false)
            arquivoPath = path
            uploadError = null
            break
          } catch (err) {
            uploadError = err
          }
        }

        if (!arquivoUrl) {
          throw uploadError || new Error('Falha no upload do arquivo')
        }

        await createDocumento({
          nome: file.name,
          arquivoNome: file.name,
          arquivoUrl,
          arquivoPath,
          mimeType: file.type || '',
          tamanho: typeof file.size === 'number' ? file.size : undefined,
          visibilidade: 'publico',
          categoria: 'documento',
          ordem: Date.now() + i,
          folderId,
          createdBy: user.id,
        })
      }

      await loadData()
    } catch (err: any) {
      console.error('Erro no upload:', err)
      const rawMessage = String(err?.message || '')
      const unauthorized =
        rawMessage.includes('storage/unauthorized') ||
        rawMessage.toLowerCase().includes('permission') ||
        rawMessage.toLowerCase().includes('unauthorized')
      const message = unauthorized
        ? 'Sem permissão para upload no Firebase Storage. Ajuste as regras do Storage.'
        : rawMessage
          ? rawMessage
          : 'Erro ao fazer upload.'
      setError(message)
      alert(message)
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const openRename = (row: Row) => {
    if (row.kind === 'folder') {
      setRenameValue(row.folder.nome)
      setModalRename({ kind: 'folder', id: row.folder.id })
    } else {
      setRenameValue(row.file.nome)
      setModalRename({ kind: 'file', id: row.file.id })
    }
    setRowMenu(null)
  }

  const handleRename = async () => {
    if (!modalRename) return
    if (!renameValue.trim()) {
      alert('Informe um nome.')
      return
    }
    try {
      if (modalRename.kind === 'folder') {
        await updateDocumentoPasta(modalRename.id, { nome: renameValue.trim() })
      } else {
        await updateDocumento(modalRename.id, { nome: renameValue.trim() })
      }
      setModalRename(null)
      await loadData()
    } catch (err) {
      console.error('Erro ao renomear:', err)
      alert('Erro ao renomear.')
    }
  }

  const openMove = (row: Row) => {
    if (row.kind === 'folder') {
      setMoveTargetFolderId(row.folder.parentId || '')
      setModalMove({ kind: 'folder', id: row.folder.id })
    } else {
      setMoveTargetFolderId(row.file.folderId || '')
      setModalMove({ kind: 'file', id: row.file.id })
    }
    setRowMenu(null)
  }

  const handleMove = async () => {
    if (!modalMove) return

    try {
      if (modalMove.kind === 'folder') {
        const folder = folders.find((f) => f.id === modalMove.id)
        if (!folder) return
        const target = moveTargetFolderId || null
        if (target === folder.id) {
          alert('Selecione uma pasta diferente.')
          return
        }
        // Evita ciclos: nao permitir mover para dentro de um filho.
        const descendants = getFolderDescendants(folder.id)
        if (target && descendants.has(target)) {
          alert('Nao e possivel mover uma pasta para dentro de uma subpasta dela.')
          return
        }
        await updateDocumentoPasta(folder.id, { parentId: target || null })
        if (target) expandPathToFolder(target)
      } else {
        await updateDocumento(modalMove.id, { folderId: moveTargetFolderId || null })
      }

      setModalMove(null)
      await loadData()
    } catch (err) {
      console.error('Erro ao mover:', err)
      alert('Erro ao mover.')
    }
  }

  const openColor = (folder: DocumentoPasta) => {
    setModalColor(folder.id)
    setColorValue(folder.cor || FOLDER_COLORS[0])
    setRowMenu(null)
  }

  const handleColorSave = async () => {
    if (!modalColor) return
    try {
      await updateDocumentoPasta(modalColor, { cor: colorValue })
      setModalColor(null)
      await loadData()
    } catch (err) {
      console.error('Erro ao salvar cor:', err)
      alert('Erro ao salvar cor.')
    }
  }

  const handleDeleteRow = async (row: Row) => {
    if (!canManageDrive) return
    setRowMenu(null)

    try {
      if (row.kind === 'file') {
        if (!confirm(`Excluir "${row.file.nome}"?`)) return
        await deleteDocumento(row.file.id)
        await loadData()
        return
      }

      const folder = row.folder
      if (!confirm(`Excluir a pasta "${folder.nome}" e tudo dentro?`)) return

      const toDeleteFolders = Array.from(getFolderDescendants(folder.id))
      toDeleteFolders.push(folder.id)

      const toDeleteFiles = files.filter((f) => f.folderId && toDeleteFolders.includes(f.folderId))

      // Deleta arquivos primeiro, depois pastas (mais profundo primeiro).
      for (const docItem of toDeleteFiles) {
        await deleteDocumento(docItem.id)
      }

      const foldersSorted = toDeleteFolders
        .map((id) => folders.find((f) => f.id === id))
        .filter(Boolean) as DocumentoPasta[]
      foldersSorted.sort((a, b) => (b.parentId ? 1 : 0) - (a.parentId ? 1 : 0))

      for (const f of foldersSorted) {
        await deleteDocumentoPasta(f.id)
      }

      if (activeFolderId && (activeFolderId === folder.id || toDeleteFolders.includes(activeFolderId))) {
        setActiveFolderId(null)
      }
      await loadData()
    } catch (err) {
      console.error('Erro ao excluir:', err)
      alert('Erro ao excluir.')
    }
  }

  const renderTree = (parentId: string | null, depth = 0): React.ReactNode => {
    const children = folders
      .filter((f) => normalizeId(f.parentId) === parentId)
      .sort((a, b) => a.nome.localeCompare(b.nome))

    if (children.length === 0) return null

    return (
      <ul className="space-y-1">
        {children.map((folder) => {
          const hasChildren = folders.some((f) => f.parentId === folder.id)
          const isExpanded = expandedFolders.includes(folder.id)
          const isSelected = activeFolderId === folder.id
          return (
            <li key={folder.id}>
              <div
                className={`flex items-center gap-1 rounded-md px-2 py-1.5 cursor-pointer ${
                  isSelected ? 'bg-dark-300 text-gray-100' : 'text-gray-300 hover:bg-dark-400'
                }`}
                style={{ marginLeft: depth * 10 }}
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    if (hasChildren) toggleExpanded(folder.id)
                  }}
                  className={`p-0.5 rounded hover:bg-dark-200 ${hasChildren ? '' : 'opacity-30 cursor-default'}`}
                  aria-label={isExpanded ? 'Recolher' : 'Expandir'}
                >
                  {hasChildren ? (
                    isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />
                  ) : (
                    <ChevronRight className="w-4 h-4" />
                  )}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveFolderId(folder.id)
                    expandPathToFolder(folder.id)
                  }}
                  className="flex items-center gap-2 min-w-0 flex-1 text-left"
                >
                  <Folder className="w-4 h-4 shrink-0" style={{ color: folder.cor || FOLDER_COLORS[0] }} />
                  <span className="truncate text-sm">{folder.nome}</span>
                </button>
              </div>
              {hasChildren && isExpanded && renderTree(folder.id, depth + 1)}
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
    <div className="grid grid-cols-1 lg:grid-cols-[260px_1fr] gap-4">
      <aside className="bg-dark-500 border border-dark-100 rounded-xl p-3 h-fit">
        <div className="relative">
          <button
            type="button"
            onClick={() => setMenuNewOpen((prev) => !prev)}
            disabled={!canManageDrive}
            className="w-full inline-flex items-center justify-center gap-2 px-3 py-2.5 bg-dark-400 border border-dark-100 rounded-lg text-gray-100 hover:border-brand hover:text-brand transition-colors"
          >
            <Plus className="w-4 h-4" />
            Novo
          </button>

          {menuNewOpen && (
            <div className="absolute z-20 mt-2 w-full bg-dark-500 border border-dark-100 rounded-lg overflow-hidden shadow-xl">
              <button
                type="button"
                onClick={openCreateFolder}
                className="w-full px-3 py-2 text-sm text-left text-gray-200 hover:bg-dark-400"
              >
                Nova pasta
              </button>
              <button
                type="button"
                onClick={triggerUpload}
                className="w-full px-3 py-2 text-sm text-left text-gray-200 hover:bg-dark-400"
              >
                Upload de arquivos
              </button>
            </div>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={(e) => handleUploadFiles(e.target.files)}
        />

        <div className="mt-4">
          <button
            type="button"
            onClick={() => setActiveFolderId(null)}
            className={`w-full flex items-center gap-2 px-2 py-2 rounded-md ${
              activeFolderId === null ? 'bg-dark-300 text-gray-100' : 'text-gray-300 hover:bg-dark-400'
            }`}
          >
            <Folder className="w-4 h-4" />
            <span className="text-sm">Meu Drive</span>
          </button>
          <div className="mt-2">{renderTree(null, 0)}</div>
        </div>
      </aside>

      <main className="bg-dark-500 border border-dark-100 rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-dark-100 bg-dark-400 flex flex-col gap-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-semibold text-gray-100">Documentos</h1>
              <div className="mt-1 flex items-center gap-2 text-xs text-gray-400 flex-wrap">
                <button type="button" className="hover:text-brand" onClick={() => setActiveFolderId(null)}>
                  Meu Drive
                </button>
                {breadcrumb.map((b) => (
                  <div key={b.id} className="flex items-center gap-2">
                    <span>/</span>
                    <button
                      type="button"
                      className="hover:text-brand truncate max-w-[240px]"
                      onClick={() => setActiveFolderId(b.id)}
                      title={b.nome}
                    >
                      {b.nome}
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="relative w-full sm:w-80">
                <Search className="w-4 h-4 text-gray-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-dark-500 border border-dark-100 rounded-lg text-gray-100 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-brand"
                  placeholder="Pesquisar no Drive..."
                />
              </div>
              <button
                type="button"
                onClick={triggerUpload}
                disabled={uploading || !canManageDrive}
                className="inline-flex items-center gap-2 px-3 py-2.5 bg-brand text-dark-800 font-semibold rounded-lg hover:bg-brand-light disabled:opacity-60 transition-colors"
              >
                <Upload className="w-4 h-4" />
                Upload
              </button>
            </div>
          </div>

          {error && (
            <div className="text-sm text-error bg-error/10 border border-error/20 rounded-lg px-3 py-2">
              {error}
            </div>
          )}
        </div>

        <div className="px-4 py-2 text-xs text-gray-500 border-b border-dark-100">
          {rows.length} item(ns)
        </div>

        <div className="overflow-x-auto">
          <div className="min-w-[760px]">
            <div className="grid grid-cols-[1fr_180px_110px_44px] px-4 py-2 text-xs uppercase tracking-wide text-gray-500">
              <div>Nome</div>
              <div>Modificado</div>
              <div>Tamanho</div>
              <div />
            </div>

            <ul className="divide-y divide-dark-100">
              {rows.map((row) => {
                const isFolder = row.kind === 'folder'
                const id = isFolder ? row.folder.id : row.file.id
                const name = isFolder ? row.folder.nome : row.file.nome
                const updatedAt = isFolder ? row.folder.updatedAt : row.file.updatedAt
                const modLabel = updatedAt ? format(toDate(updatedAt), 'dd/MM/yyyy HH:mm') : '-'
                const size = isFolder ? '-' : formatSize(row.file.tamanho)
                const Icon = isFolder ? Folder : getFileIcon(row.file.mimeType, row.file.arquivoNome)
                const iconColor = isFolder ? (row.folder.cor || FOLDER_COLORS[0]) : undefined

                return (
                  <li key={`${row.kind}:${id}`} className="relative">
                    <div className="grid grid-cols-[1fr_180px_110px_44px] px-4 py-2.5 items-center hover:bg-dark-400 transition-colors">
                      <button
                        type="button"
                        className="flex items-center gap-3 min-w-0 text-left"
                        onClick={() => {
                          if (row.kind === 'folder') {
                            setActiveFolderId(row.folder.id)
                            expandPathToFolder(row.folder.id)
                          } else {
                            window.open(row.file.arquivoUrl, '_blank', 'noopener,noreferrer')
                          }
                        }}
                      >
                        <Icon className="w-5 h-5 shrink-0" style={iconColor ? { color: iconColor } : undefined} />
                        <span className="truncate text-sm text-gray-100">{name}</span>
                        {row.kind === 'file' && (
                          <ExternalLink className="w-3.5 h-3.5 text-gray-600 shrink-0" />
                        )}
                      </button>

                      <div className="text-xs text-gray-400">{modLabel}</div>
                      <div className="text-xs text-gray-400">{size}</div>

                      <div className="flex justify-end">
                        <button
                          type="button"
                          onClick={() => setRowMenu((prev) => (prev?.id === id ? null : { id, kind: row.kind }))}
                          className="p-2 rounded-md hover:bg-dark-300 text-gray-400 hover:text-gray-100"
                          aria-label="Mais ações"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {rowMenu?.id === id && rowMenu.kind === row.kind && (
                      <div className="absolute right-3 top-11 z-20 w-48 bg-dark-500 border border-dark-100 rounded-lg overflow-hidden shadow-xl">
                        <button
                          type="button"
                          onClick={() => canManageDrive && openRename(row)}
                          disabled={!canManageDrive}
                          className="w-full px-3 py-2 text-sm text-left text-gray-200 hover:bg-dark-400 disabled:opacity-50"
                        >
                          Renomear
                        </button>
                        <button
                          type="button"
                          onClick={() => canManageDrive && openMove(row)}
                          disabled={!canManageDrive}
                          className="w-full px-3 py-2 text-sm text-left text-gray-200 hover:bg-dark-400 disabled:opacity-50"
                        >
                          Mover
                        </button>
                        {row.kind === 'folder' && (
                          <button
                            type="button"
                            onClick={() => canManageDrive && openColor(row.folder)}
                            disabled={!canManageDrive}
                            className="w-full px-3 py-2 text-sm text-left text-gray-200 hover:bg-dark-400 disabled:opacity-50"
                          >
                            Cor da pasta
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleDeleteRow(row)}
                          disabled={!canManageDrive}
                          className="w-full px-3 py-2 text-sm text-left text-error hover:bg-dark-400 disabled:opacity-50"
                        >
                          Excluir
                        </button>
                      </div>
                    )}
                  </li>
                )
              })}
            </ul>
          </div>
        </div>
      </main>

      {modalCreateFolder && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-dark-500 border border-dark-100 rounded-xl overflow-hidden">
            <div className="px-4 py-3 bg-dark-400 border-b border-dark-100 flex items-center justify-between">
              <p className="text-sm font-semibold text-gray-100">Nova pasta</p>
              <button
                type="button"
                onClick={() => setModalCreateFolder(false)}
                className="p-2 rounded-md hover:bg-dark-300 text-gray-400 hover:text-gray-100"
                aria-label="Fechar"
              >
                <ChevronDown className="w-4 h-4 rotate-90" />
              </button>
            </div>
            <div className="p-4 space-y-4">
              <div>
                <label className="block text-sm text-gray-300 mb-1">Nome</label>
                <input
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  className="w-full px-3 py-2.5 bg-dark-400 border border-dark-100 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand"
                  placeholder="Ex: Contratos 2026"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-300 mb-2">Cor</label>
                <div className="flex flex-wrap gap-2">
                  {FOLDER_COLORS.map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setNewFolderColor(c)}
                      className={`w-8 h-8 rounded-full border ${newFolderColor === c ? 'border-brand' : 'border-dark-100'}`}
                      style={{ backgroundColor: c }}
                      aria-label={`Cor ${c}`}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="px-4 py-3 border-t border-dark-100 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setModalCreateFolder(false)}
                className="px-4 py-2.5 border border-dark-100 rounded-lg text-gray-300 hover:text-gray-100 hover:border-gray-500 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleCreateFolder}
                className="px-5 py-2.5 bg-brand text-dark-800 font-semibold rounded-lg hover:bg-brand-light transition-colors"
              >
                Criar
              </button>
            </div>
          </div>
        </div>
      )}

      {modalRename && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-dark-500 border border-dark-100 rounded-xl overflow-hidden">
            <div className="px-4 py-3 bg-dark-400 border-b border-dark-100">
              <p className="text-sm font-semibold text-gray-100">Renomear</p>
            </div>
            <div className="p-4">
              <label className="block text-sm text-gray-300 mb-1">Nome</label>
              <input
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                className="w-full px-3 py-2.5 bg-dark-400 border border-dark-100 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand"
              />
            </div>
            <div className="px-4 py-3 border-t border-dark-100 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setModalRename(null)}
                className="px-4 py-2.5 border border-dark-100 rounded-lg text-gray-300 hover:text-gray-100 hover:border-gray-500 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleRename}
                className="px-5 py-2.5 bg-brand text-dark-800 font-semibold rounded-lg hover:bg-brand-light transition-colors"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}

      {modalMove && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-dark-500 border border-dark-100 rounded-xl overflow-hidden">
            <div className="px-4 py-3 bg-dark-400 border-b border-dark-100">
              <p className="text-sm font-semibold text-gray-100">Mover para...</p>
            </div>
            <div className="p-4">
              <label className="block text-sm text-gray-300 mb-1">Destino</label>
              <select
                value={moveTargetFolderId}
                onChange={(e) => setMoveTargetFolderId(e.target.value)}
                className="w-full px-3 py-2.5 bg-dark-400 border border-dark-100 rounded-lg text-gray-100 focus:outline-none focus:ring-2 focus:ring-brand"
              >
                <option value="">Meu Drive (raiz)</option>
                {folderOptions
                  .filter((opt) => {
                    if (modalMove.kind !== 'folder') return true
                    if (opt.id === modalMove.id) return false
                    const descendants = getFolderDescendants(modalMove.id)
                    return !descendants.has(opt.id)
                  })
                  .map((opt) => (
                    <option key={opt.id} value={opt.id}>{opt.label}</option>
                  ))}
              </select>
            </div>
            <div className="px-4 py-3 border-t border-dark-100 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setModalMove(null)}
                className="px-4 py-2.5 border border-dark-100 rounded-lg text-gray-300 hover:text-gray-100 hover:border-gray-500 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleMove}
                className="px-5 py-2.5 bg-brand text-dark-800 font-semibold rounded-lg hover:bg-brand-light transition-colors"
              >
                Mover
              </button>
            </div>
          </div>
        </div>
      )}

      {modalColor && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-dark-500 border border-dark-100 rounded-xl overflow-hidden">
            <div className="px-4 py-3 bg-dark-400 border-b border-dark-100">
              <p className="text-sm font-semibold text-gray-100">Cor da pasta</p>
            </div>
            <div className="p-4">
              <div className="flex flex-wrap gap-2">
                {FOLDER_COLORS.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setColorValue(c)}
                    className={`w-9 h-9 rounded-full border ${colorValue === c ? 'border-brand' : 'border-dark-100'}`}
                    style={{ backgroundColor: c }}
                    aria-label={`Cor ${c}`}
                  />
                ))}
              </div>
            </div>
            <div className="px-4 py-3 border-t border-dark-100 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setModalColor(null)}
                className="px-4 py-2.5 border border-dark-100 rounded-lg text-gray-300 hover:text-gray-100 hover:border-gray-500 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleColorSave}
                className="px-5 py-2.5 bg-brand text-dark-800 font-semibold rounded-lg hover:bg-brand-light transition-colors"
              >
                Salvar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
