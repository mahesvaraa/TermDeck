import {
  Download,
  Upload,
  FolderPlus,
  FileCode,
  ExternalLink,
  Edit2,
  Shield,
  Terminal as TerminalIcon,
  Copy,
  Trash2,
  GitCompare
} from 'lucide-react'
import type { SftpFileItem } from '@shared/types'

interface ContextMenuPos {
  x: number
  y: number
  targetItem?: SftpFileItem
}

interface FileContextMenuProps {
  contextMenu: ContextMenuPos
  selectedNames: string[]
  currentPath: string
  onClose: () => void
  onDownload?: (names: string[]) => void
  onUpload?: () => void
  onNewFolder?: () => void
  onRename?: (oldName: string) => void
  onDelete?: (names: string[]) => void
  onChmod?: (name: string) => void
  onOpenTerminalHere?: (dirPath: string) => void
  onOpenFile?: (remotePath: string) => void
  onOpenExternal?: (remotePath: string) => void
  onCompareDiff?: (names: [string, string]) => void
}

export function FileContextMenu({
  contextMenu,
  selectedNames,
  currentPath,
  onClose,
  onDownload,
  onUpload,
  onNewFolder,
  onRename,
  onDelete,
  onChmod,
  onOpenTerminalHere,
  onOpenFile,
  onOpenExternal,
  onCompareDiff
}: FileContextMenuProps): JSX.Element {
  return (
    <div
      style={{
        top: window.innerHeight - contextMenu.y < 350 ? undefined : contextMenu.y,
        bottom:
          window.innerHeight - contextMenu.y < 350
            ? Math.max(8, window.innerHeight - contextMenu.y)
            : undefined,
        left: window.innerWidth - contextMenu.x < 220 ? undefined : contextMenu.x,
        right:
          window.innerWidth - contextMenu.x < 220
            ? Math.max(8, window.innerWidth - contextMenu.x)
            : undefined
      }}
      onClick={(e) => e.stopPropagation()}
      className="fixed z-50 bg-panel border border-line rounded-md shadow-xl py-1 w-48 text-xs font-sans text-tx max-h-[calc(100vh-16px)] overflow-y-auto select-none"
    >
      {selectedNames.length > 0 && onDownload && (
        <button
          type="button"
          onClick={() => {
            onDownload(selectedNames)
            onClose()
          }}
          className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-panel2 text-left"
        >
          <Download className="w-3.5 h-3.5 text-acc" />
          <span>Скачать</span>
        </button>
      )}

      {selectedNames.length === 2 && onCompareDiff && (
        <button
          type="button"
          onClick={() => {
            onCompareDiff([selectedNames[0], selectedNames[1]])
            onClose()
          }}
          className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-panel2 text-left text-acc"
        >
          <GitCompare className="w-3.5 h-3.5" />
          <span>Сравнить файлы (Diff)</span>
        </button>
      )}

      {onUpload && (
        <button
          type="button"
          onClick={() => {
            onUpload()
            onClose()
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
            onClose()
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
                  onClose()
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
                  onClose()
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
            onClose()
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
            onClose()
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
            onClose()
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
            onClose()
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
              onClose()
            }}
            className="w-full flex items-center gap-2 px-3 py-1.5 hover:bg-err/15 text-err text-left"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Удалить ({selectedNames.length})</span>
          </button>
        </>
      )}
    </div>
  )
}

interface HeaderColumnMenuProps {
  headerMenu: { x: number; y: number }
  columnSettings: {
    showDate: boolean
    showPermissions: boolean
    showOwner: boolean
  }
  onToggleColumn: (key: 'showDate' | 'showPermissions' | 'showOwner') => void
}

export function HeaderColumnMenu({
  headerMenu,
  columnSettings,
  onToggleColumn
}: HeaderColumnMenuProps): JSX.Element {
  return (
    <div
      style={{
        top: window.innerHeight - headerMenu.y < 220 ? undefined : headerMenu.y,
        bottom:
          window.innerHeight - headerMenu.y < 220
            ? Math.max(8, window.innerHeight - headerMenu.y)
            : undefined,
        left: window.innerWidth - headerMenu.x < 210 ? undefined : headerMenu.x,
        right:
          window.innerWidth - headerMenu.x < 210
            ? Math.max(8, window.innerWidth - headerMenu.x)
            : undefined
      }}
      onClick={(e) => e.stopPropagation()}
      className="fixed z-50 bg-panel2 border border-line rounded-md shadow-xl py-1.5 w-48 text-xs font-sans select-none max-h-[calc(100vh-16px)] overflow-y-auto"
    >
      <div className="px-3 py-1 font-semibold text-tx text-xs border-b border-line flex items-center justify-between">
        <span>Колонки таблицы</span>
      </div>

      <div className="p-1 space-y-0.5">
        <label
          onClick={() => onToggleColumn('showDate')}
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
          onClick={() => onToggleColumn('showPermissions')}
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
          onClick={() => onToggleColumn('showOwner')}
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
  )
}
