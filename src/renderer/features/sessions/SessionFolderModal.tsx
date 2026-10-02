import { useState, type FormEvent } from 'react'
import { FolderPlus, Folder, X } from 'lucide-react'
import type { SessionFolder } from '@shared/types'

interface SessionFolderModalProps {
  folder?: SessionFolder | null
  onSave: (name: string, folderId?: string) => void
  onClose: () => void
}

export function SessionFolderModal({
  folder,
  onSave,
  onClose
}: SessionFolderModalProps): JSX.Element {
  const [folderName, setFolderName] = useState(folder?.name || '')
  const isEditing = Boolean(folder)

  const handleSubmit = (e: FormEvent): void => {
    e.preventDefault()
    if (folderName.trim()) {
      onSave(folderName.trim(), folder?.id)
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs select-none">
      <div className="bg-panel border border-line rounded-lg w-[380px] max-w-[95vw] shadow-2xl overflow-hidden font-sans flex flex-col text-tx">
        <div className="flex items-center justify-between px-4 py-3 border-b border-line bg-panel2">
          <div className="flex items-center gap-2">
            {isEditing ? (
              <Folder className="w-4 h-4 text-acc" />
            ) : (
              <FolderPlus className="w-4 h-4 text-acc" />
            )}
            <h3 className="text-xs font-semibold">
              {isEditing ? 'Переименовать папку' : 'Новая папка сессий'}
            </h3>
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
              Название папки
            </label>
            <input
              type="text"
              required
              autoFocus
              value={folderName}
              onChange={(e) => setFolderName(e.target.value)}
              placeholder="Production, Staging, Базы данных…"
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
              disabled={!folderName.trim()}
              className="py-1 px-3 rounded bg-acc text-bg text-xs font-medium hover:bg-acc/90 disabled:opacity-50 transition-colors"
            >
              {isEditing ? 'Сохранить' : 'Создать'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
