import { AlertCircle } from 'lucide-react'

interface CloseConfirmModalProps {
  isOpen: boolean
  fileName: string
  onSaveAndClose: () => void
  onDiscardAndClose: () => void
  onCancel: () => void
}

export function CloseConfirmModal({
  isOpen,
  fileName,
  onSaveAndClose,
  onDiscardAndClose,
  onCancel
}: CloseConfirmModalProps): JSX.Element | null {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 font-sans select-none">
      <div className="bg-panel2 border border-line rounded-lg shadow-2xl w-full max-w-md overflow-hidden text-xs text-tx">
        <div className="p-4 flex gap-3 items-start">
          <div className="p-2 rounded-full bg-warn/15 text-warn flex-none mt-0.5">
            <AlertCircle className="w-5 h-5" />
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-tx mb-1">Несохранённые изменения</h3>
            <p className="text-mut text-xs leading-relaxed">
              Файл <span className="font-mono text-tx font-medium">«{fileName}»</span> содержит
              несохранённые изменения. Сохранить их перед закрытием?
            </p>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 px-4 py-3 bg-panel/70 border-t border-line">
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1.5 rounded-md border border-line bg-panel2 text-tx hover:border-tx/40 transition-colors"
          >
            Отмена
          </button>

          <button
            type="button"
            onClick={onDiscardAndClose}
            className="px-3 py-1.5 rounded-md border border-err/40 bg-err/10 text-err hover:bg-err/20 transition-colors"
          >
            Не сохранять
          </button>

          <button
            type="button"
            onClick={onSaveAndClose}
            className="px-3 py-1.5 rounded-md bg-acc text-bg font-medium hover:bg-acc/90 transition-colors"
          >
            Сохранить
          </button>
        </div>
      </div>
    </div>
  )
}
