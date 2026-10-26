import { useState, useEffect, useRef, useMemo, type MouseEvent, type DragEvent } from 'react'
import { useVirtualizer } from '@tanstack/react-virtual'
import {
  Folder,
  ArrowUp,
  RefreshCw,
  Home,
  HardDrive
} from 'lucide-react'
import type { SftpFileItem } from '@shared/types'
import { formatFileSize, formatDate } from '../../stores/sftp-store'
import { getFileIcon } from './file-table/fileTableUtils'

interface LocalFileTableProps {
  currentLocalPath: string
  onPathChange: (path: string) => void
  selectedNames: string[]
  onSelect: (name: string, isCtrl: boolean, isShift: boolean) => void
  onClearSelection: () => void
  onDropRemoteFiles?: (names: string[]) => void
}

export function LocalFileTable({
  currentLocalPath,
  onPathChange,
  selectedNames,
  onSelect,
  onClearSelection,
  onDropRemoteFiles
}: LocalFileTableProps): JSX.Element {
  const [files, setFiles] = useState<SftpFileItem[]>([])
  const [drives, setDrives] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isDragOver, setIsDragOver] = useState(false)

  const parentRef = useRef<HTMLDivElement>(null)

  // Load drives on mount
  useEffect(() => {
    if (window.api?.localFsDrives) {
      window.api.localFsDrives().then((res) => setDrives(res.drives)).catch(() => {})
    }
  }, [])

  // Load directory whenever currentLocalPath changes
  useEffect(() => {
    let isCancelled = false
    setIsLoading(true)
    setError(null)

    if (window.api?.localFsList) {
      window.api
        .localFsList({ path: currentLocalPath })
        .then((res) => {
          if (!isCancelled) {
            const mapped: SftpFileItem[] = res.items.map((it) => ({
              name: it.name,
              type: it.type,
              size: it.type === 'directory' ? '—' : formatFileSize(it.size),
              rawSize: it.size,
              permissions: it.permissions,
              date: formatDate(it.modifyTime),
              modifyTime: it.modifyTime,
              owner: it.owner,
              group: it.group
            }))
            setFiles(mapped)
            if (res.path !== currentLocalPath) {
              onPathChange(res.path)
            }
          }
        })
        .catch((err) => {
          if (!isCancelled) {
            setError((err as Error).message || 'Ошибка чтения локального каталога')
          }
        })
        .finally(() => {
          if (!isCancelled) setIsLoading(false)
        })
    }

    return () => {
      isCancelled = true
    }
  }, [currentLocalPath, onPathChange])

  // Sort files: directories first, then alphabetical
  const sortedFiles = useMemo(() => {
    return [...files].sort((a, b) => {
      if (a.type === 'directory' && b.type !== 'directory') return -1
      if (a.type !== 'directory' && b.type === 'directory') return 1
      return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
    })
  }, [files])

  const hasParentRow = currentLocalPath !== '/' && !currentLocalPath.match(/^[A-Za-z]:\\?$/)

  const rowVirtualizer = useVirtualizer({
    count: sortedFiles.length + (hasParentRow ? 1 : 0),
    getScrollElement: () => parentRef.current,
    estimateSize: () => 26,
    overscan: 10
  })

  const handleNavigateUp = (): void => {
    const isWin = currentLocalPath.includes('\\')
    const sep = isWin ? '\\' : '/'
    const parts = currentLocalPath.split(/[/\\]/).filter(Boolean)
    parts.pop()
    let parent = parts.join(sep)
    if (isWin && parts.length === 1 && parts[0].endsWith(':')) {
      parent = `${parts[0]}\\`
    } else if (!isWin) {
      parent = `/${parent}`
    }
    if (parent) {
      onPathChange(parent)
    }
  }

  const handleDoubleClick = (item: SftpFileItem): void => {
    if (item.type === 'directory') {
      const isWin = currentLocalPath.includes('\\')
      const sep = isWin ? '\\' : '/'
      const cleanBase = currentLocalPath.endsWith(sep)
        ? currentLocalPath
        : `${currentLocalPath}${sep}`
      onPathChange(`${cleanBase}${item.name}`)
    } else if (window.api?.localFsOpenPath) {
      const isWin = currentLocalPath.includes('\\')
      const sep = isWin ? '\\' : '/'
      const cleanBase = currentLocalPath.endsWith(sep)
        ? currentLocalPath
        : `${currentLocalPath}${sep}`
      window.api.localFsOpenPath({ path: `${cleanBase}${item.name}` }).catch(() => {})
    }
  }

  const handleRowClick = (e: MouseEvent, item: SftpFileItem): void => {
    e.stopPropagation()
    onSelect(item.name, e.ctrlKey || e.metaKey, e.shiftKey)
  }

  const handleDragStart = (e: DragEvent, fileName: string): void => {
    const isWin = currentLocalPath.includes('\\')
    const sep = isWin ? '\\' : '/'
    const cleanBase = currentLocalPath.endsWith(sep)
      ? currentLocalPath
      : `${currentLocalPath}${sep}`
    const fullPath = `${cleanBase}${fileName}`

    e.dataTransfer.setData('text/plain', fullPath)
    e.dataTransfer.setData('application/termdeck-local-file', fullPath)
  }

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

    const remoteNamesJson = e.dataTransfer.getData('application/termdeck-remote-files')
    if (remoteNamesJson && onDropRemoteFiles) {
      try {
        const names = JSON.parse(remoteNamesJson) as string[]
        onDropRemoteFiles(names)
      } catch {
        // Ignored
      }
    }
  }

  return (
    <div
      onClick={onClearSelection}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`flex-1 flex flex-col overflow-hidden select-none border-r border-line bg-panel transition-colors ${
        isDragOver ? 'bg-panel2 ring-2 ring-inset ring-acc' : ''
      }`}
    >
      {/* Local Path & Drive Bar */}
      <div className="flex items-center justify-between border-b border-line px-1.5 py-1 bg-panel2/60 text-xs gap-1 flex-none">
        <div className="flex items-center gap-0.5 flex-none">
          <button
            type="button"
            onClick={handleNavigateUp}
            disabled={!hasParentRow}
            title="Вверх на уровень"
            className="p-1 rounded text-mut hover:text-tx hover:bg-panel disabled:opacity-30 disabled:pointer-events-none transition-colors"
          >
            <ArrowUp className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={() => onPathChange(currentLocalPath)}
            title="Обновить"
            className="p-1 rounded text-mut hover:text-tx hover:bg-panel transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>

          {window.api?.localFsHomeDir && (
            <button
              type="button"
              onClick={async () => {
                const res = await window.api.localFsHomeDir()
                onPathChange(res.path)
              }}
              title="Домашний каталог ПК (~)"
              className="p-1 rounded text-mut hover:text-tx hover:bg-panel transition-colors"
            >
              <Home className="w-3.5 h-3.5" />
            </button>
          )}

          {/* Drive selector on Windows */}
          {drives.length > 1 && (
            <div className="flex items-center gap-1 pl-1 border-l border-line ml-0.5">
              <HardDrive className="w-3 h-3 text-mut" />
              <select
                value={drives.find((d) => currentLocalPath.startsWith(d)) || drives[0]}
                onChange={(e) => onPathChange(e.target.value)}
                className="py-0.5 px-1 rounded bg-bg border border-line text-tx font-mono text-[11px] outline-none"
              >
                {drives.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Current Path */}
        <div className="flex-1 min-w-0 font-mono text-[11px] text-tx truncate px-1 text-right">
          {currentLocalPath}
        </div>
      </div>

      {/* Table Header */}
      <div className="flex items-center bg-panel border-b border-line text-[11px] text-mut font-medium flex-none px-2 py-1 select-none">
        <div className="flex-1 min-w-0 truncate">Имя (Локальный ПК)</div>
        <div className="w-16 flex-none text-right px-1 font-mono">Размер</div>
        <div className="w-24 flex-none text-right px-1 font-mono">Дата</div>
      </div>

      {/* Table Body */}
      <div ref={parentRef} className="flex-1 overflow-y-auto">
        {error ? (
          <div className="p-4 text-center text-err text-xs">{error}</div>
        ) : files.length === 0 && !hasParentRow ? (
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
                    <div className="w-24 flex-none" />
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
                  draggable
                  onDragStart={(e) => handleDragStart(e, file.name)}
                  onClick={(e) => handleRowClick(e, file)}
                  onDoubleClick={() => handleDoubleClick(file)}
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

                  <div className="w-24 flex-none text-right text-mut font-mono text-[10px] px-1 truncate">
                    {file.date || '—'}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
