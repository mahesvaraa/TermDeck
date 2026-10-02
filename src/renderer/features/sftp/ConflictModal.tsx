import { useState } from 'react'
import { AlertTriangle, FileText, ArrowRight } from 'lucide-react'
import type { TransferConflictPrompt, TransferConflictAction } from '@shared/types'
import { formatFileSize } from '../../stores/sftp-store'

interface ConflictModalProps {
  prompt: TransferConflictPrompt
  onResolve: (action: TransferConflictAction, applyToAll: boolean, newName?: string) => void
  onCancel: () => void
}

export function ConflictModal({ prompt, onResolve, onCancel }: ConflictModalProps): JSX.Element {
  const [applyToAll, setApplyToAll] = useState(false)
  const [customName, setCustomName] = useState(() => {
    const dot = prompt.fileName.lastIndexOf('.')
    if (dot > 0) {
      return `${prompt.fileName.substring(0, dot)} (1)${prompt.fileName.substring(dot)}`
    }
    return `${prompt.fileName} (1)`
  })
  const [showRenameInput, setShowRenameInput] = useState(false)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs select-none">
      <div className="bg-panel border border-line rounded-lg w-[460px] max-w-[95vw] shadow-2xl overflow-hidden font-sans flex flex-col text-tx">
        {/* Header */}
        <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-line bg-panel2 text-tx">
          <AlertTriangle className="w-4 h-4 text-warn flex-none" />
          <h2 className="text-sm font-semibold">Конфликт имён файлов</h2>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 text-xs">
          <p className="text-mut leading-relaxed">
            Файл <strong>{prompt.fileName}</strong> уже существует в целевом каталоге (
            {prompt.direction === 'upload' ? 'на сервере' : 'на локальном диске'}).
          </p>

          {/* Details */}
          <div className="p-3 rounded bg-bg border border-line space-y-2">
            <div className="flex items-center justify-between text-[11px] text-mut">
              <span>Существующий файл:</span>
              <span className="font-mono text-tx">
                {prompt.existingSize !== undefined ? formatFileSize(prompt.existingSize) : '—'}
              </span>
            </div>
            <div className="flex items-center justify-between text-[11px] text-mut">
              <span>Новый файл:</span>
              <span className="font-mono text-tx">
                {prompt.newSize !== undefined ? formatFileSize(prompt.newSize) : '—'}
              </span>
            </div>
          </div>

          {/* Rename option */}
          {showRenameInput ? (
            <div className="space-y-1">
              <label className="block text-[11px] font-medium text-mut">Новое имя:</label>
              <div className="flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-mut flex-none" />
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  className="flex-1 py-1 px-2 rounded bg-bg border border-line focus:border-acc text-tx text-xs outline-none"
                />
              </div>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setShowRenameInput(true)}
              className="text-acc text-xs hover:underline flex items-center gap-1"
            >
              <ArrowRight className="w-3 h-3" />
              <span>Сохранить с другим именем…</span>
            </button>
          )}

          {/* Apply to all checkbox */}
          <div className="pt-2 border-t border-line">
            <label className="flex items-center gap-2 cursor-pointer text-mut hover:text-tx">
              <input
                type="checkbox"
                checked={applyToAll}
                onChange={(e) => setApplyToAll(e.target.checked)}
                className="rounded border-line text-acc focus:ring-0"
              />
              <span>Применить ко всем оставшимся конфликтам этой сессии</span>
            </label>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-line">
            <button
              type="button"
              onClick={onCancel}
              className="py-1.5 px-3 rounded border border-line bg-panel2 text-tx hover:border-mut text-xs transition-colors"
            >
              Отмена
            </button>
            <button
              type="button"
              onClick={() => onResolve('skip', applyToAll)}
              className="py-1.5 px-3 rounded border border-line bg-panel2 text-tx hover:border-acc text-xs transition-colors"
            >
              Пропустить
            </button>

            {showRenameInput ? (
              <button
                type="button"
                onClick={() => onResolve('rename', applyToAll, customName)}
                className="py-1.5 px-3.5 rounded bg-acc hover:bg-acc/90 text-white font-medium text-xs transition-colors"
              >
                Переименовать
              </button>
            ) : (
              <button
                type="button"
                onClick={() => onResolve('overwrite', applyToAll)}
                className="py-1.5 px-3.5 rounded bg-err hover:bg-err/90 text-white font-medium text-xs transition-colors"
              >
                Перезаписать
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
