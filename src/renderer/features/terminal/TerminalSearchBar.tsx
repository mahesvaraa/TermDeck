import { useState, useEffect, useRef } from 'react'
import type { SearchAddon } from '@xterm/addon-search'
import { ArrowUp, ArrowDown, X } from 'lucide-react'

interface TerminalSearchBarProps {
  searchAddon: SearchAddon | null
  isOpen: boolean
  onClose: () => void
}

export function TerminalSearchBar({
  searchAddon,
  isOpen,
  onClose
}: TerminalSearchBarProps): JSX.Element | null {
  const [query, setQuery] = useState('')
  const [caseSensitive, setCaseSensitive] = useState(false)
  const [wholeWord, setWholeWord] = useState(false)
  const [regex, setRegex] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus()
      inputRef.current?.select()
    } else {
      searchAddon?.clearDecorations?.()
    }
  }, [isOpen, searchAddon])

  // Trigger search on query or options change
  useEffect(() => {
    if (!isOpen || !searchAddon) return
    if (!query) {
      searchAddon.clearDecorations?.()
      return
    }
    searchAddon.findNext(query, {
      caseSensitive,
      wholeWord,
      regex,
      incremental: true
    })
  }, [query, caseSensitive, wholeWord, regex, isOpen, searchAddon])

  if (!isOpen) return null

  const handleNext = (): void => {
    if (!searchAddon || !query) return
    searchAddon.findNext(query, {
      caseSensitive,
      wholeWord,
      regex
    })
  }

  const handlePrevious = (): void => {
    if (!searchAddon || !query) return
    searchAddon.findPrevious(query, {
      caseSensitive,
      wholeWord,
      regex
    })
  }

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>): void => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (e.shiftKey) {
        handlePrevious()
      } else {
        handleNext()
      }
    } else if (e.key === 'Escape') {
      e.preventDefault()
      onClose()
    }
  }

  return (
    <div className="absolute top-2 right-4 z-20 flex items-center gap-1 p-1 bg-panel2/95 border border-line rounded-md shadow-lg backdrop-blur-sm text-xs font-sans select-none animate-in fade-in duration-150">
      <input
        ref={inputRef}
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Поиск по буферу… (Enter / Shift+Enter)"
        className="w-56 py-1 px-2 rounded bg-bg border border-line text-tx placeholder:text-mut focus:border-acc text-xs outline-none"
      />

      {/* Option: Case Sensitive */}
      <button
        type="button"
        onClick={() => setCaseSensitive((prev) => !prev)}
        title="Учитывать регистр (Alt+C)"
        className={`px-1.5 py-0.5 rounded text-[11px] font-mono border transition-colors ${
          caseSensitive
            ? 'bg-acc/20 border-acc text-acc font-bold'
            : 'border-transparent text-mut hover:text-tx hover:bg-panel'
        }`}
      >
        Aa
      </button>

      {/* Option: Whole Word */}
      <button
        type="button"
        onClick={() => setWholeWord((prev) => !prev)}
        title="Слово целиком (Alt+W)"
        className={`px-1.5 py-0.5 rounded text-[11px] font-mono border transition-colors ${
          wholeWord
            ? 'bg-acc/20 border-acc text-acc font-bold'
            : 'border-transparent text-mut hover:text-tx hover:bg-panel'
        }`}
      >
        \b
      </button>

      {/* Option: Regex */}
      <button
        type="button"
        onClick={() => setRegex((prev) => !prev)}
        title="Регулярное выражение (Alt+R)"
        className={`px-1.5 py-0.5 rounded text-[11px] font-mono border transition-colors ${
          regex
            ? 'bg-acc/20 border-acc text-acc font-bold'
            : 'border-transparent text-mut hover:text-tx hover:bg-panel'
        }`}
      >
        .*
      </button>

      <div className="w-[1px] h-4 bg-line mx-0.5" />

      {/* Navigation buttons */}
      <button
        type="button"
        onClick={handlePrevious}
        title="Предыдущее совпадение (Shift+Enter)"
        className="p-1 rounded text-mut hover:text-tx hover:bg-panel transition-colors"
      >
        <ArrowUp className="w-3.5 h-3.5" />
      </button>

      <button
        type="button"
        onClick={handleNext}
        title="Следующее совпадение (Enter)"
        className="p-1 rounded text-mut hover:text-tx hover:bg-panel transition-colors"
      >
        <ArrowDown className="w-3.5 h-3.5" />
      </button>

      <button
        type="button"
        onClick={onClose}
        title="Закрыть поиск (Escape)"
        className="p-1 rounded text-mut hover:text-tx hover:bg-panel transition-colors"
      >
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}
