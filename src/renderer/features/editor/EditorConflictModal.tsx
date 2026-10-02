import { AlertTriangle, Copy, RotateCcw, X } from 'lucide-react'

interface EditorConflictModalProps {
  isOpen: boolean
  remotePath: string
  localMtime: number
  localSize: number
  serverMtime: number
  serverSize: number
  onForceOverwrite: () => void
  onSaveAsCopy: () => void
  onCancel: () => void
}

function formatDate(ms: number): string {
  if (!ms) return '—'
  return new Date(ms).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  })
}

function formatSize(bytes: number): string {
  if (bytes === 0) return '0 B'
  const k = 1024
  const sizes = ['B', 'KB', 'MB', 'GB']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`
}

export function EditorConflictModal({
  isOpen,
  remotePath,
  localMtime,
  localSize,
  serverMtime,
  serverSize,
  onForceOverwrite,
  onSaveAsCopy,
  onCancel
}: EditorConflictModalProps): JSX.Element | null {
  if (!isOpen) return null

  const fileName = remotePath.split('/').filter(Boolean).pop() || remotePath

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/65 backdrop-blur-sm p-4 font-sans select-none">
      <div className="bg-panel2 border border-line rounded-lg shadow-2xl w-full max-w-lg overflow-hidden text-xs text-tx">
        <div className="p-4 flex gap-3 items-start border-b border-line bg-panel/50">
          <div className="p-2 rounded-full bg-warn/15 text-warn flex-none mt-0.5">
            <AlertTriangle className="w-5 h-5" />
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-tx mb-1">Конфликт изменений на сервере</h3>
            <p className="text-mut text-xs leading-relaxed">
              Файл <span className="font-mono text-tx font-medium">«{fileName}»</span> был изменён
              на сервере другой программой или пользователем после того, как вы его открыли.
            </p>
          </div>
        </div>

        {/* Comparison table */}
        <div className="p-4 space-y-3">
          <div className="grid grid-cols-2 gap-3 p-3 bg-panel rounded-md border border-line">
            <div className="space-y-1">
              <span className="text-[11px] font-medium text-mut uppercase tracking-wider">
                Ваша версия (при открытии)
              </span>
              <div className="text-tx font-mono text-[11px]">{formatDate(localMtime)}</div>
              <div className="text-mut text-[11px]">Размер: {formatSize(localSize)}</div>
            </div>

            <div className="space-y-1 border-l border-line pl-3">
              <span className="text-[11px] font-medium text-warn uppercase tracking-wider">
                Текущая версия на сервере
              </span>
              <div className="text-tx font-mono text-[11px]">{formatDate(serverMtime)}</div>
              <div className="text-mut text-[11px]">Размер: {formatSize(serverSize)}</div>
            </div>
          </div>

          <p className="text-[11px] text-mut">
            Выберите действие: перезаписать версию на сервере вашими изменениями или сохранить ваши
            изменения в отдельный файл рядом.
          </p>
        </div>

        {/* Action buttons */}
        <div className="flex items-center justify-end gap-2 px-4 py-3 bg-panel/70 border-t border-line">
          <button
            type="button"
            onClick={onCancel}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-line bg-panel2 text-tx hover:border-tx/40 transition-colors"
          >
            <X className="w-3.5 h-3.5 text-mut" />
            <span>Отмена</span>
          </button>

          <button
            type="button"
            onClick={onSaveAsCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-acc/40 bg-acc/10 text-acc hover:bg-acc/20 transition-colors"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Сохранить как копию</span>
          </button>

          <button
            type="button"
            onClick={onForceOverwrite}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-warn text-bg font-medium hover:bg-warn/90 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Перезаписать серверный</span>
          </button>
        </div>
      </div>
    </div>
  )
}
