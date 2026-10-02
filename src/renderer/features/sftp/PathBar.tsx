import { useState, useRef, useEffect, Fragment, type KeyboardEvent } from 'react'
import {
  ArrowUp,
  RefreshCw,
  FolderPlus,
  Upload,
  Home,
  PanelLeft,
  PanelBottom,
  PanelLeftClose
} from 'lucide-react'

interface PathBarProps {
  currentPath: string
  onNavigate: (path: string) => void
  onRefresh?: () => void
  onNewFolder?: () => void
  onUpload?: () => void
  panelPosition?: 'left' | 'bottom'
  onTogglePosition?: () => void
  onCollapse?: () => void
}

export function PathBar({
  currentPath,
  onNavigate,
  onRefresh,
  onNewFolder,
  onUpload,
  panelPosition,
  onTogglePosition,
  onCollapse
}: PathBarProps): JSX.Element {
  const [isEditing, setIsEditing] = useState(false)
  const [inputVal, setInputVal] = useState(currentPath)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    setInputVal(currentPath)
  }, [currentPath])

  useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus()
      inputRef.current?.select()
    }
  }, [isEditing])

  const handleInputKeyDown = (e: KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter') {
      const trimmed = inputVal.trim()
      if (trimmed) {
        onNavigate(trimmed)
      }
      setIsEditing(false)
    } else if (e.key === 'Escape') {
      setInputVal(currentPath)
      setIsEditing(false)
    }
  }

  const handleNavigateUp = (): void => {
    if (currentPath === '/') return
    const parts = currentPath.split('/').filter(Boolean)
    parts.pop()
    const parent = parts.length > 0 ? `/${parts.join('/')}` : '/'
    onNavigate(parent)
  }

  const parts = currentPath.split('/').filter(Boolean)
  let accumulated = ''
  const segments = parts.map((segment) => {
    accumulated += `/${segment}`
    return { name: segment, path: accumulated }
  })

  return (
    <div className="flex items-center justify-between border-b border-line px-1.5 py-1 bg-panel text-xs select-none min-h-[32px] gap-1">
      {/* Navigation Buttons: Up & Refresh */}
      <div className="flex items-center gap-0.5 flex-none">
        <button
          type="button"
          onClick={handleNavigateUp}
          disabled={currentPath === '/'}
          title="Вверх на один уровень"
          className="p-1 rounded text-mut hover:text-tx hover:bg-panel2 disabled:opacity-30 disabled:pointer-events-none transition-colors"
        >
          <ArrowUp className="w-3.5 h-3.5" />
        </button>

        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            title="Обновить каталог"
            className="p-1 rounded text-mut hover:text-tx hover:bg-panel2 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Path Breadcrumbs or Editable Input */}
      <div className="flex-1 min-w-0 flex items-center overflow-hidden">
        {isEditing ? (
          <input
            ref={inputRef}
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={handleInputKeyDown}
            onBlur={() => setIsEditing(false)}
            className="w-full py-0.5 px-2 rounded bg-bg border border-acc text-tx font-mono text-xs outline-none"
          />
        ) : (
          <div
            onDoubleClick={() => setIsEditing(true)}
            title="Двойной клик для редактирования пути"
            className="flex items-center gap-0.5 overflow-x-auto whitespace-nowrap text-xs text-tx font-mono py-0.5 px-1 rounded hover:bg-panel2/60 cursor-text transition-colors w-full"
          >
            <button
              type="button"
              onClick={() => onNavigate('/')}
              className="py-0.5 px-1 rounded hover:bg-panel2 hover:text-acc transition-colors flex items-center gap-1"
              title="Корневой каталог (/)"
            >
              <Home className="w-3 h-3 text-mut" />
            </button>
            <span className="text-mut">/</span>

            {segments.map((seg, idx) => (
              <Fragment key={seg.path}>
                <button
                  type="button"
                  onClick={() => onNavigate(seg.path)}
                  className={`py-0.5 px-1 rounded hover:bg-panel2 hover:text-acc transition-colors ${
                    idx === segments.length - 1 ? 'font-semibold text-tx' : 'text-mut'
                  }`}
                >
                  {seg.name}
                </button>
                {idx < segments.length - 1 && <span className="text-mut">/</span>}
              </Fragment>
            ))}
          </div>
        )}
      </div>

      {/* Action Buttons: New Folder, Upload, Position Toggle & Collapse */}
      <div className="flex items-center gap-0.5 flex-none">
        {onNewFolder && (
          <button
            type="button"
            onClick={onNewFolder}
            title="Создать новую папку"
            className="p-1 rounded text-mut hover:text-tx hover:bg-panel2 transition-colors"
          >
            <FolderPlus className="w-3.5 h-3.5" />
          </button>
        )}

        {onUpload && (
          <button
            type="button"
            onClick={onUpload}
            title="Загрузить файл на сервер"
            className="p-1 rounded text-mut hover:text-tx hover:bg-panel2 transition-colors"
          >
            <Upload className="w-3.5 h-3.5" />
          </button>
        )}

        {onTogglePosition && (
          <button
            type="button"
            onClick={onTogglePosition}
            title={panelPosition === 'left' ? 'Переместить SFTP вниз' : 'Переместить SFTP влево'}
            className="p-1 rounded text-mut hover:text-tx hover:bg-panel2 transition-colors ml-0.5"
          >
            {panelPosition === 'left' ? (
              <PanelBottom className="w-3.5 h-3.5 text-acc" />
            ) : (
              <PanelLeft className="w-3.5 h-3.5 text-acc" />
            )}
          </button>
        )}

        {onCollapse && (
          <button
            type="button"
            onClick={onCollapse}
            title="Свернуть панель SFTP (Ctrl+Shift+B)"
            className="p-1 rounded text-mut hover:text-tx hover:bg-panel2 transition-colors"
          >
            <PanelLeftClose className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
    </div>
  )
}
