import { useState, type FormEvent } from 'react'
import { Edit2, X } from 'lucide-react'

interface RenameModalProps {
  currentName: string
  onConfirm: (newName: string) => void
  onClose: () => void
}

export function RenameModal({ currentName, onConfirm, onClose }: RenameModalProps): JSX.Element {
  const [newName, setNewName] = useState(currentName)

  const handleSubmit = (e: FormEvent): void => {
    e.preventDefault()
    if (newName.trim() && newName.trim() !== currentName) {
      onConfirm(newName.trim())
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs select-none">
      <div className="bg-panel border border-line rounded-lg w-[380px] max-w-[95vw] shadow-2xl overflow-hidden font-sans flex flex-col text-tx">
        <div className="flex items-center justify-between px-4 py-3 border-b border-line bg-panel2">
          <div className="flex items-center gap-2">
            <Edit2 className="w-4 h-4 text-acc" />
            <h3 className="text-xs font-semibold">Переименовать</h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-mut hover:text-tx hover:bg-bg transition-colors"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3">
          <div>
            <label className="block text-[11px] font-medium text-mut mb-1">
              Новое имя файла / папки
            </label>
            <input
              type="text"
              required
              autoFocus
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              className="w-full py-1.5 px-2.5 rounded bg-bg border border-line focus:border-acc text-tx text-xs outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-line">
            <button
              type="button"
              onClick={onClose}
              className="py-1 px-3 rounded border border-line bg-panel2 text-tx text-xs hover:border-mut transition-colors"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={!newName.trim() || newName.trim() === currentName}
              className="py-1 px-3 rounded bg-acc text-white text-xs font-medium hover:bg-acc/90 disabled:opacity-50 transition-colors"
            >
              Сохранить
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
