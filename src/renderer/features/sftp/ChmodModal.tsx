import { useState, type FormEvent } from 'react'
import { Shield, X } from 'lucide-react'

interface ChmodModalProps {
  fileName: string
  onConfirm: (mode: number) => void
  onClose: () => void
}

export function ChmodModal({ fileName, onConfirm, onClose }: ChmodModalProps): JSX.Element {
  const [octal, setOctal] = useState('755')

  const handleSubmit = (e: FormEvent): void => {
    e.preventDefault()
    const mode = parseInt(octal.trim(), 8)
    if (!isNaN(mode)) {
      onConfirm(mode)
      onClose()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs select-none">
      <div className="bg-panel border border-line rounded-lg w-[360px] max-w-[95vw] shadow-2xl overflow-hidden font-sans flex flex-col text-tx">
        <div className="flex items-center justify-between px-4 py-3 border-b border-line bg-panel2">
          <div className="flex items-center gap-2">
            <Shield className="w-4 h-4 text-acc" />
            <h3 className="text-xs font-semibold">Права доступа (chmod)</h3>
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
          <p className="text-[11px] text-mut">
            Укажите восьмеричные права для <strong>{fileName}</strong>:
          </p>

          <div>
            <label className="block text-[11px] font-medium text-mut mb-1">
              Режим (восьмеричный, например 755 или 644)
            </label>
            <input
              type="text"
              required
              autoFocus
              maxLength={4}
              value={octal}
              onChange={(e) => setOctal(e.target.value)}
              className="w-full py-1.5 px-2.5 rounded bg-bg border border-line focus:border-acc text-tx font-mono text-xs outline-none"
            />
          </div>

          <div className="grid grid-cols-3 gap-1.5 pt-1 text-[11px]">
            <button
              type="button"
              onClick={() => setOctal('755')}
              className="py-1 px-2 rounded border border-line bg-panel2 hover:border-acc text-center"
            >
              755 (rwxr-xr-x)
            </button>
            <button
              type="button"
              onClick={() => setOctal('644')}
              className="py-1 px-2 rounded border border-line bg-panel2 hover:border-acc text-center"
            >
              644 (rw-r--r--)
            </button>
            <button
              type="button"
              onClick={() => setOctal('777')}
              className="py-1 px-2 rounded border border-line bg-panel2 hover:border-acc text-center"
            >
              777 (rwxrwxrwx)
            </button>
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
              className="py-1 px-3 rounded bg-acc text-white text-xs font-medium hover:bg-acc/90 transition-colors"
            >
              Применить
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
