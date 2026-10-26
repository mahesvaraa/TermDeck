import { useState, useRef, useMemo, useEffect, type MouseEvent, type DragEvent } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import { Folder, SlidersHorizontal } from 'lucide-react'
import type { SftpFileItem, SftpPanelState } from '@shared/types'
import { useSftpStore } from '../../stores/sftp-store'
import { getFileIcon, isBinaryFile } from './file-table/fileTableUtils'
import { FileTableEmptyState } from './file-table/FileTableEmptyState'
import { FileContextMenu, HeaderColumnMenu } from './file-table/FileContextMenu'

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
  onCompareDiff?: (names: [string, string]) => void
}

type SortField = 'name' | 'size' | 'date' | 'permissions' | 'owner'
type SortOrder = 'asc' | 'desc'

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
  onOpenExternal,
  onCompareDiff
}: FileTableProps): JSX.Element {
  const [sortField, setSortField] = useState<SortField>('name')
  const [sortOrder, setSortOrder] = useState<SortOrder>('asc')
  const [contextMenu, setContextMenu] = useState<{
    x: number
    y: number
    targetItem?: SftpFileItem
  } | null>(null)
  const [headerMenu, setHeaderMenu] = useState<{ x: number; y: number } | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)

  const parentRef = useRef<HTMLDivElement>(null)

  const columnSettings = useSftpStore((s) => s.columnSettings)
  const toggleColumn = useSftpStore((s) => s.toggleColumn)

  // Sort files: folders always on top, then sort by field
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

  // Virtualizer for smooth scrolling over large directory listings
  const hasParentRow = currentPath !== '/'
  const rowVirtualizer = useVirtualizer({
    count: sortedFiles.length + (hasParentRow ? 1 : 0),
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
      if (isBinaryFile(item.name) && onOpenExternal) {
        onOpenExternal(fullPath)
      } else if (onOpenFile) {
        onOpenFile(fullPath)
      }
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

  const setSorting = (field: SortField): void => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
  }

  // Handle Drag & Drop
  const handleDragOver = (e: DragEvent): void => {
    e.preventDefault()
    e.stopPropagation()
    if (!isDragOver) setIsDragOver(true)
  }

  const handleDragLeave = (e: DragEvent): void => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)
  }

  const handleDrop = (e: DragEvent): void => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragOver(false)

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0 && onDropFiles) {
      const paths: string[] = []
      for (let i = 0; i < e.dataTransfer.files.length; i++) {
        const file = e.dataTransfer.files[i]
        let filePath = file.path
        if (!filePath && typeof window !== 'undefined' && window.api?.getPathForFile) {
          try {
            filePath = window.api.getPathForFile(file)
          } catch {
            // Ignore
          }
        }
        if (filePath) paths.push(filePath)
      }
      if (paths.length > 0) {
        onDropFiles(paths)
      }
    }
  }

  // Close menus on outside click
  useEffect(() => {
    const handleClickOutside = (): void => {
      setContextMenu(null)
      setHeaderMenu(null)
    }
    window.addEventListener('click', handleClickOutside)
    return () => window.removeEventListener('click', handleClickOutside)
  }, [])

  if (state === 'loading' || state === 'permission_denied' || errorMessage) {
    return (
      <FileTableEmptyState
        state={state}
        errorMessage={errorMessage}
        onRetry={onRetry}
      />
    )
  }

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

      {/* Header Context Menu */}
      {headerMenu && (
        <HeaderColumnMenu
          headerMenu={headerMenu}
          columnSettings={columnSettings}
          onToggleColumn={toggleColumn}
        />
      )}

      {/* Item Context Menu */}
      {contextMenu && (
        <FileContextMenu
          contextMenu={contextMenu}
          selectedNames={selectedNames}
          currentPath={currentPath}
          onClose={() => setContextMenu(null)}
          onDownload={onDownload}
          onUpload={onUpload}
          onNewFolder={onNewFolder}
          onRename={onRename}
          onDelete={onDelete}
          onChmod={onChmod}
          onOpenTerminalHere={onOpenTerminalHere}
          onOpenFile={onOpenFile}
          onOpenExternal={onOpenExternal}
          onCompareDiff={onCompareDiff}
        />
      )}
    </div>
  )
}
