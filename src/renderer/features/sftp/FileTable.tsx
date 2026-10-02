import { useState, useRef, useMemo, useEffect, type MouseEvent, type DragEvent } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import {
  Folder,
  FileText,
  FileCode,
  FileArchive,
  FileImage,
  CornerUpRight,
  AlertCircle,
  RefreshCw,
  Download,
  Upload,
  FolderPlus,
  Edit2,
  Trash2,
  Shield,
  Copy,
  SlidersHorizontal,
  Terminal as TerminalIcon,
  ExternalLink
} from 'lucide-react'
import type { SftpFileItem, SftpPanelState } from '@shared/types'
import { useSftpStore } from '../../stores/sftp-store'

interface FileTableProps {
  currentPath: string
  files: SftpFileItem[]
  selectedNames: string[]
  state?: SftpPanelState
  errorMessage?: string | null
  onNavigate: (path: string) => void
  onSelect: (name: string, isCtrl: boolean, isShift: boolean) => void
  onClearSelection: () => void
  onRetry?: () => void
  onDownload?: (names: string[]) => void
  onUpload?: () => void
  onNewFolder?: () => void
  onRename?: (oldName: string) => void
  onDelete?: (names: string[]) => void
  onChmod?: (name: string) => void
  onDropFiles?: (filePaths: string[]) => void
  onOpenTerminalHere?: (dirPath: string) => void
  onOpenFile?: (remotePath: string) => void
  onOpenExternal?: (remotePath: string) => void
}

function getFileIcon(item: SftpFileItem): JSX.Element {
  if (item.type === 'directory') {
    return <Folder className="w-3.5 h-3.5 text-acc flex-none" />
  }
  if (item.type === 'symlink') {
    return <CornerUpRight className="w-3.5 h-3.5 text-ok flex-none" />
  }

  const ext = item.name.split('.').pop()?.toLowerCase() || ''
  if (['zip', 'tar', 'gz', 'bz2', 'xz', '7z', 'rar', 'tgz'].includes(ext)) {
    return <FileArchive className="w-3.5 h-3.5 text-warn flex-none" />
  }
  if (
    [
      'ts',
      'tsx',
      'js',
      'jsx',
      'json',
      'yaml',
      'yml',
      'py',
      'sh',
      'css',
      'html',
      'sql',
      'md'
    ].includes(ext)
  ) {
    return <FileCode className="w-3.5 h-3.5 text-tx flex-none" />
  }
  if (['png', 'jpg', 'jpeg', 'svg', 'gif', 'webp', 'ico'].includes(ext)) {
    return <FileImage className="w-3.5 h-3.5 text-ok flex-none" />
  }
  return <FileText className="w-3.5 h-3.5 text-mut flex-none" />
}

export function FileTable({
  currentPath,
  files,
  selectedNames,
  state = 'normal',
  errorMessage,
  onNavigate,
  onSelect,
  onClearSelection,
  onRetry,
  onDownload,
  onUpload,
  onNewFolder,
  onRename,
  onDelete,
  onChmod,
  onDropFiles,
  onOpenTerminalHere,
  onOpenFile,
  onOpenExternal
}: FileTableProps): JSX.Element {
  const parentRef = useRef<HTMLDivElement>(null)
  const [isDragOver, setIsDragOver] = useState(false)

  // Context Menu State
  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
    targetItem?: SftpFileItem
  } | null>(null)

  // Header Context Menu State (column toggle)
  const [headerMenu, setHeaderMenu] = useState<{ x: number; y: number } | null>(null)

  const columnSettings = useSftpStore((s) => s.columnSettings)
  const toggleColumn = useSftpStore((s) => s.toggleColumn)
  const sortField = useSftpStore((s) => s.sortField)
  const sortOrder = useSftpStore((s) => s.sortOrder)
  const setSorting = useSftpStore((s) => s.setSorting)

  // Sort files: directories always first, then by chosen field
  const sortedFiles = useMemo(() => {
    return [...files].sort((a, b) => {
      if (a.type === 'directory' && b.type !== 'directory') return -1
      if (a.type !== 'directory' && b.type === 'directory') return 1

      let comp = 0
      switch (sortField) {
        case 'name':
          comp = a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
          break
        case 'size':
          comp = (a.rawSize || 0) - (b.rawSize || 0)
          break
        case 'date':
          comp = (a.modifyTime || 0) - (b.modifyTime || 0)
          break
        case 'permissions':
          comp = a.permissions.localeCompare(b.permissions)
          break
        case 'owner':
          comp = (a.owner || '').localeCompare(b.owner || '')
          break
      }
      return sortOrder === 'asc' ? comp : -comp
    })
  }, [files, sortField, sortOrder])

  // Virtualizer for 10,000+ files
  const rowVirtualizer = useVirtualizer({
    count: sortedFiles.length + (currentPath !== '/' ? 1 : 0),
    getScrollElement: () => parentRef.current,
    estimateSize: () => 26,
    overscan: 10
  })

  const handleNavigateUp = (): void => {
    if (currentPath === '/') return
    const parts = currentPath.split('/').filter(Boolean)
    parts.pop()
    const parent = parts.length > 0 ? `/${parts.join('/')}` : '/'
    onNavigate(parent)
  }

  const handleItemDoubleClick = (item: SftpFileItem): void => {
    if (item.type === 'directory') {
      const next =
        currentPath === '/' ? `/${item.name}` : `${currentPath.replace(/\/+$/, '')}/${item.name}`
      onNavigate(next)
    } else if (item.type === 'file' || item.type === 'symlink') {
      const fullPath =
        currentPath === '/' ? `/${item.name}` : `${currentPath.replace(/\/+$/, '')}/${item.name}`
      onOpenFile?.(fullPath)
    }
  }

  const handleRowClick = (e: MouseEvent, item: SftpFileItem): void => {
    e.stopPropagation()
    onSelect(item.name, e.ctrlKey || e.metaKey, e.shiftKey)
  }

  const handleContextMenu = (e: MouseEvent, item?: SftpFileItem): void => {
    e.preventDefault()
    e.stopPropagation()

    if (item && !selectedNames.includes(item.name)) {
      onSelect(item.name, false, false)
    }

    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      targetItem: item
    })
  }

  const handleHeaderContextMenu = (e: MouseEvent): void => {
    e.preventDefault()
    setHeaderMenu({ x: e.clientX, y: e.clientY })
  }

  const handleDragOver = (e: DragEvent): void => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = (): void => {
    setIsDragOver(false)
  }

  const handleDrop = (e: DragEvent): void => {
    e.preventDefault()
    setIsDragOver(false)

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const paths: string[] = []
      for (let i = 0; i < e.dataTransfer.files.length; i++) {
        const file = e.dataTransfer.files[i] as unknown as { path?: string }
        if (file.path) {
          paths.push(file.path)
        }
      }
      if (paths.length > 0 && onDropFiles) {
        onDropFiles(paths)
      }
    }
  }

  // Dismiss context menus when clicking outside
  useEffect(() => {
    const handleGlobalClick = (): void => {
      if (contextMenu) setContextMenu(null)
      if (headerMenu) setHeaderMenu(null)
    }
    window.addEventListener('click', handleGlobalClick)
    return () => window.removeEventListener('click', handleGlobalClick)
  }, [contextMenu, headerMenu])

  if (state === 'loading') {
    return (
      <div className="flex-1 p-3 space-y-2 animate-pulse overflow-y-auto">
        {[1, 2, 3, 4, 5, 6, 7].map((i) => (
          <div key={i} className="flex items-center gap-3 py-1">
            <div className="w-4 h-4 rounded bg-panel2" />
            <div className="h-3 rounded bg-panel2 flex-1" />
            <div className="h-3 rounded bg-panel2 w-16" />
          </div>
        ))}
      </div>
    )
  }

  if (state === 'permission_denied' || state === 'no_connection') {
    const isConnectingOrNotReady =
      errorMessage?.includes('не подключена') ||
      errorMessage?.includes('не готова') ||
      errorMessage?.toLowerCase().includes('connecting')

    const isPermDenied =
      !isConnectingOrNotReady &&
      (state === 'permission_denied' ||
        errorMessage?.toLowerCase().includes('permission') ||
        errorMessage?.toLowerCase().includes('доступ') ||
        errorMessage?.toLowerCase().includes('прав'))

    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center select-none">
        {isConnectingOrNotReady ? (
          <>
            <RefreshCw className="w-8 h-8 text-warn mb-2 opacity-80 animate-spin" />
            <div className="text-xs text-tx font-medium mb-1">Подключение к SSH/SFTP…</div>
            <div className="text-[11px] text-mut mb-3 max-w-[240px] leading-relaxed">
              Устанавливается соединение с сервером. Список файлов загрузится сразу после
              авторизации.
            </div>
          </>
        ) : isPermDenied ? (
          <>
            <AlertCircle className="w-8 h-8 text-err mb-2 opacity-80" />
            <div className="text-xs text-tx font-medium mb-1">Отказано в доступе</div>
            <div className="text-[11px] text-mut mb-3 max-w-[240px] leading-relaxed">
              У пользователя недостаточно прав для чтения этого каталога на сервере.
            </div>
          </>
        ) : (
          <>
            <AlertCircle className="w-8 h-8 text-warn mb-2 opacity-80" />
            <div className="text-xs text-tx font-medium mb-1">
              {errorMessage || 'Нет соединения с SFTP'}
            </div>
            <div className="text-[11px] text-mut mb-3 max-w-[240px] leading-relaxed">
              Проверьте статус подключения к серверу или повторите попытку.
            </div>
          </>
        )}

        {onRetry && !isConnectingOrNotReady && (
          <button
            type="button"
            onClick={onRetry}
            className="flex items-center gap-1.5 py-1 px-3 border border-line rounded-md bg-panel2 text-tx text-xs hover:border-acc transition-colors"
          >
            <RefreshCw className="w-3 h-3 text-mut" />
            <span>Повторить</span>
          </button>
        )}
      </div>
    )
  }

  const hasParentRow = currentPath !== '/'

  return (
    <div
      onClick={() => {
        onClearSelection()
        setContextMenu(null)
        setHeaderMenu(null)
      }}
      onContextMenu={(e) => handleContextMenu(e)}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`flex-1 flex flex-col overflow-hidden select-none transition-colors relative ${
        isDragOver ? 'bg-panel2 ring-2 ring-inset ring-acc' : ''
      }`}
    >
      {/* Table Header */}
      <div
        onContextMenu={handleHeaderContextMenu}
        className="flex items-center bg-panel border-b border-line text-[11px] text-mut font-medium flex-none px-2 py-1 select-none"
      >
        <button
          type="button"
          onClick={() => setSorting('name')}
          className="flex-1 min-w-0 flex items-center gap-1 text-left hover:text-tx transition-colors truncate pr-2"
        >
          <span>Имя</span>
          {sortField === 'name' && (
            <span className="text-acc">{sortOrder === 'asc' ? '↑' : '↓'}</span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setSorting('size')}
          className="w-16 flex-none text-right hover:text-tx transition-colors px-1 font-mono"
        >
          <span>Размер</span>
          {sortField === 'size' && (
            <span className="text-acc ml-0.5">{sortOrder === 'asc' ? '↑' : '↓'}</span>
          )}
        </button>

        {columnSettings.showDate && (
          <button
            type="button"
            onClick={() => setSorting('date')}
            className="w-24 flex-none text-right hover:text-tx transition-colors px-1 font-mono"
          >
            <span>Дата</span>
            {sortField === 'date' && (
              <span className="text-acc ml-0.5">{sortOrder === 'asc' ? '↑' : '↓'}</span>
            )}
          </button>
        )}

        {columnSettings.showPermissions && (
          <button
            type="button"
            onClick={() => setSorting('permissions')}
            className="w-20 flex-none text-center hover:text-tx transition-colors px-1 font-mono"
          >
            <span>Права</span>
            {sortField === 'permissions' && (
              <span className="text-acc ml-0.5">{sortOrder === 'asc' ? '↑' : '↓'}</span>
            )}
          </button>
        )}

        {columnSettings.showOwner && (
          <button
            type="button"
            onClick={() => setSorting('owner')}
            className="w-16 flex-none text-right hover:text-tx transition-colors px-1 font-mono"
          >
            <span>Владелец</span>
            {sortField === 'owner' && (
              <span className="text-acc ml-0.5">{sortOrder === 'asc' ? '↑' : '↓'}</span>
            )}
          </button>
        )}

        {/* Column config button */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            const rect = e.currentTarget.getBoundingClientRect()
            setHeaderMenu(
              headerMenu ? null : { x: Math.max(10, rect.right - 180), y: rect.bottom + 4 }
            )
          }}
          title="Настройка отображаемых колонок таблицы"
          className="p-0.5 rounded text-mut hover:text-tx hover:bg-panel2 transition-colors ml-1 flex-none"
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Virtualized Table Body */}
      <div ref={parentRef} className="flex-1 overflow-y-auto">
        {files.length === 0 && !hasParentRow ? (
          <div className="py-8 text-center text-mut text-xs">Каталог пуст</div>
        ) : (
          <div
            style={{
              height: `${rowVirtualizer.getTotalSize()}px`,
              width: '100%',
              position: 'relative'
            }}
          >
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const index = virtualRow.index

              // If parent row exists at index 0
              if (hasParentRow && index === 0) {
                return (
                  <div
                    key="__parent__"
                    onDoubleClick={handleNavigateUp}
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      width: '100%',
                      height: `${virtualRow.size}px`,
                      transform: `translateY(${virtualRow.start}px)`
                    }}
                    className="flex items-center px-2 text-xs hover:bg-panel2 cursor-pointer transition-colors"
                  >
                    <div className="flex-1 min-w-0 flex items-center gap-1.5 text-tx font-medium pr-2 truncate">
                      <Folder className="w-3.5 h-3.5 text-acc flex-none" />
                      <span>..</span>
                    </div>
                    <div className="w-16 flex-none text-right text-mut font-mono text-[11px]">
                      —
                    </div>
                    {columnSettings.showDate && <div className="w-24 flex-none" />}
                    {columnSettings.showPermissions && <div className="w-20 flex-none" />}
                    {columnSettings.showOwner && <div className="w-16 flex-none" />}
                    <div className="w-4 flex-none" />
                  </div>
                )
              }

              const fileIndex = hasParentRow ? index - 1 : index
              const file = sortedFiles[fileIndex]
              if (!file) return null

              const isSelected = selectedNames.includes(file.name)

              return (
                <div
                  key={file.name}
                  onClick={(e) => handleRowClick(e, file)}
                  onDoubleClick={() => handleItemDoubleClick(file)}
                  onContextMenu={(e) => handleContextMenu(e, file)}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`
                  }}
                  className={`flex items-center px-2 text-xs cursor-pointer transition-colors ${
                    isSelected ? 'bg-acc/25 text-tx' : 'hover:bg-panel2 text-tx'
                  }`}
                >
                  <div className="flex-1 min-w-0 flex items-center gap-1.5 truncate pr-2">
                    {getFileIcon(file)}
                    <span className="truncate">{file.name}</span>
                  </div>

                  <div className="w-16 flex-none text-right text-mut font-mono text-[11px] px-1 truncate">
                    {file.size}
                  </div>

                  {columnSettings.showDate && (
                    <div className="w-24 flex-none text-right text-mut font-mono text-[10px] px-1 truncate">
                      {file.date || '—'}
                    </div>
                  )}

                  {columnSettings.showPermissions && (
                    <div className="w-20 flex-none text-center text-mut font-mono text-[10px] px-1 truncate">
                      {file.permissions}
                    </div>
                  )}

                  {columnSettings.showOwner && (
                    <div className="w-16 flex-none text-right text-mut font-mono text-[10px] px-1 truncate">
                      {file.owner || '—'}
                    </div>
                  )}

                  <div className="w-4 flex-none" />
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Header Context Menu (Column Visibility) */}
      {headerMenu && (
        <div
          style={{ top: headerMenu.y, left: headerMenu.x }}
          onClick={(e) => e.stopPropagation()}
          className="fixed z-50 bg-panel2 border border-line rounded-md shadow-xl py-1.5 w-48 text-xs font-sans select-none"
        >
          <div className="px-3 py-1 font-semibold text-tx text-xs border-b border-line flex items-center justify-between">
            <span>Колонки таблицы</span>
          </div>

          <div className="p-1 space-y-0.5">
            <label
              onClick={() => toggleColumn('showDate')}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded hover:bg-panel cursor-pointer text-tx"
            >
              <input
                type="checkbox"
                checked={columnSettings.showDate}
                onChange={() => {}}
                className="rounded border-line text-acc focus:ring-0"
              />
              <span>Дата изменения</span>
            </label>

            <label
              onClick={() => toggleColumn('showPermissions')}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded hover:bg-panel cursor-pointer text-tx"
            >
              <input
                type="checkbox"
                checked={columnSettings.showPermissions}
                onChange={() => {}}
                className="rounded border-line text-acc focus:ring-0"
              />
              <span>Права (POSIX)</span>
            </label>

            <label
              onClick={() => toggleColumn('showOwner')}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded hover:bg-panel cursor-pointer text-tx"
            >
              <input
                type="checkbox"
                checked={columnSettings.showOwner}
                onChange={() => {}}
                className="rounded border-line text-acc focus:ring-0"
              />
              <span>Владелец / Группа</span>
            </label>
          </div>
        </div>
      )}

      {/* Item Context Menu */}
      {contextMenu && (
        <div
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
          className="fixed z-50 bg-panel border border-line rounded-md shadow-xl py-1 w-48 text-xs font-sans text-tx"
        >
          {selectedNames.length > 0 && onDownload && (
            <button
              type="button"
              onClick={() => {
                onDownload(selectedNames)
                setContextMenu(null)
              }}
              className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-panel2 text-left"
            >
              <Download className="w-3.5 h-3.5 text-acc" />
              <span>Скачать</span>
            </button>
          )}

          {onUpload && (
            <button
              type="button"
              onClick={() => {
                onUpload()
                setContextMenu(null)
              }}
              className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-panel2 text-left"
            >
              <Upload className="w-3.5 h-3.5 text-ok" />
              <span>Загрузить сюда…</span>
            </button>
          )}

          {onNewFolder && (
            <button
              type="button"
              onClick={() => {
                onNewFolder()
                setContextMenu(null)
              }}
              className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-panel2 text-left"
            >
              <FolderPlus className="w-3.5 h-3.5 text-mut" />
              <span>Новая папка…</span>
            </button>
          )}

          <div className="h-px bg-line my-1" />

          {selectedNames.length === 1 &&
            contextMenu.targetItem &&
            contextMenu.targetItem.type !== 'directory' && (
              <>
                {onOpenFile && (
                  <button
                    type="button"
                    onClick={() => {
                      const fullPath = `${currentPath.replace(/\/+$/, '')}/${selectedNames[0]}`
                      onOpenFile(fullPath)
                      setContextMenu(null)
                    }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-panel2 text-left"
                  >
                    <FileCode className="w-3.5 h-3.5 text-acc" />
                    <span>Открыть в редакторе</span>
                  </button>
                )}

                {onOpenExternal && (
                  <button
                    type="button"
                    onClick={() => {
                      const fullPath = `${currentPath.replace(/\/+$/, '')}/${selectedNames[0]}`
                      onOpenExternal(fullPath)
                      setContextMenu(null)
                    }}
                    className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-panel2 text-left"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-mut" />
                    <span>Открыть во внешнем…</span>
                  </button>
                )}
              </>
            )}

          {selectedNames.length === 1 && onRename && (
            <button
              type="button"
              onClick={() => {
                onRename(selectedNames[0])
                setContextMenu(null)
              }}
              className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-panel2 text-left"
            >
              <Edit2 className="w-3.5 h-3.5 text-mut" />
              <span>Переименовать…</span>
            </button>
          )}

          {selectedNames.length === 1 && onChmod && (
            <button
              type="button"
              onClick={() => {
                onChmod(selectedNames[0])
                setContextMenu(null)
              }}
              className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-panel2 text-left"
            >
              <Shield className="w-3.5 h-3.5 text-mut" />
              <span>Права доступа…</span>
            </button>
          )}

          {onOpenTerminalHere && (
            <button
              type="button"
              onClick={() => {
                let targetDir = currentPath
                if (contextMenu.targetItem) {
                  if (contextMenu.targetItem.type === 'directory') {
                    targetDir = `${currentPath.replace(/\/+$/, '')}/${contextMenu.targetItem.name}`
                  } else {
                    targetDir = currentPath
                  }
                }
                onOpenTerminalHere(targetDir)
                setContextMenu(null)
              }}
              className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-panel2 text-left"
            >
              <TerminalIcon className="w-3.5 h-3.5 text-acc" />
              <span>Открыть терминал здесь</span>
            </button>
          )}

          {selectedNames.length > 0 && (
            <button
              type="button"
              onClick={() => {
                const fullPaths = selectedNames.map(
                  (n) => `${currentPath.replace(/\/+$/, '')}/${n}`
                )
                navigator.clipboard.writeText(fullPaths.join('\n'))
                setContextMenu(null)
              }}
              className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-panel2 text-left"
            >
              <Copy className="w-3.5 h-3.5 text-mut" />
              <span>Копировать путь</span>
            </button>
          )}

          {selectedNames.length > 0 && onDelete && (
            <>
              <div className="h-px bg-line my-1" />
              <button
                type="button"
                onClick={() => {
                  onDelete(selectedNames)
                  setContextMenu(null)
                }}
                className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-err/15 text-err text-left"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Удалить ({selectedNames.length})</span>
              </button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
