import { Upload, X, StopCircle, RefreshCw } from 'lucide-react'
import type { ExternalEditorWatchEvent } from '@shared/types'

interface ExternalSyncModalProps {
  event: ExternalEditorWatchEvent | null
  isSyncing: boolean
  onSync: () => void
  onDismiss: () => void
  onStopWatching: () => void
}

export function ExternalSyncModal({
  event,
  isSyncing,
  onSync,
  onDismiss,
  onStopWatching
}: ExternalSyncModalProps): JSX.Element | null {
  if (!event) return null

  const fileName = event.remotePath.split('/').filter(Boolean).pop() || event.remotePath

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 font-sans select-none">
      <div className="bg-panel2 border border-line rounded-lg shadow-2xl w-full max-w-md overflow-hidden text-xs text-tx">
        <div className="p-4 flex gap-3 items-start border-b border-line bg-panel/50">
          <div className="p-2 rounded-full bg-ok/15 text-ok flex-none mt-0.5">
            <RefreshCw className="w-5 h-5" />
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-tx mb-1">Изменения во внешнем редакторе</h3>
            <p className="text-mut text-xs leading-relaxed">
              Файл <span className="font-mono text-tx font-medium">«{fileName}»</span> был сохранён
              во внешней программе. Загрузить обновлённую версию на сервер?
            </p>
          </div>
        </div>

        <div className="px-4 py-3 bg-panel/30 border-b border-line text-[11px] font-mono text-mut truncate">
          {event.remotePath}
        </div>

        <div className="flex items-center justify-between gap-2 px-4 py-3 bg-panel/70">
          <button
            type="button"
            onClick={onStopWatching}
            title="Прекратить отслеживание и удалить локальный временный файл"
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md border border-line text-mut hover:text-err hover:bg-bg/50 transition-colors"
          >
            <StopCircle className="w-3.5 h-3.5" />
            <span>Завершить слежение</span>
          </button>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onDismiss}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-line bg-panel2 text-tx hover:border-tx/40 transition-colors"
            >
              <X className="w-3.5 h-3.5 text-mut" />
              <span>Позже</span>
            </button>

            <button
              type="button"
              disabled={isSyncing}
              onClick={onSync}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-md bg-acc text-bg font-medium hover:bg-acc/90 transition-colors"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>{isSyncing ? 'Загрузка…' : 'Загрузить на сервер'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
