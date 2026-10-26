import { useState, useRef } from 'react'
import { Upload, Check } from 'lucide-react'
import type { ITheme } from '@xterm/xterm'
import { useSettingsStore } from '../../../stores/settings-store'
import {
  BUILTIN_THEMES,
  parseWindowsTerminalTheme,
  parseIterm2Theme
} from '../../../utils/theme-importer'

export function TerminalSection(): JSX.Element {
  const terminalSettings = useSettingsStore((s) => s.terminalSettings)
  const updateTerminalSettings = useSettingsStore((s) => s.updateTerminalSettings)
  const addCustomTheme = useSettingsStore((s) => s.addCustomTheme)
  const [importStatus, setImportStatus] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const allThemeNames = [
    ...Object.keys(BUILTIN_THEMES),
    ...Object.keys(terminalSettings.customThemes)
  ]

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>): void => {
    const file = e.target.files?.[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (event) => {
      const content = event.target?.result as string
      if (!content) return

      let parsed: { name: string; theme: ITheme } | null = null
      if (file.name.endsWith('.json')) {
        parsed = parseWindowsTerminalTheme(content)
      } else if (file.name.endsWith('.itermcolors')) {
        parsed = parseIterm2Theme(content)
        if (parsed && !parsed.name) {
          parsed.name = file.name.replace('.itermcolors', '') || 'Custom'
        }
      }

      if (parsed) {
        addCustomTheme(parsed.name, parsed.theme)
        updateTerminalSettings({ colorScheme: parsed.name })
        setImportStatus(`Тема "${parsed.name}" успешно импортирована!`)
        setTimeout(() => setImportStatus(null), 4000)
      } else {
        alert('Не удалось распознать формат темы.')
      }
    }
    reader.readAsText(file)
  }

  const handleImportThemeFile = (): void => {
    fileInputRef.current?.click()
  }

  return (
    <div className="space-y-4 text-xs">
      <h4 className="text-sm font-semibold border-b border-line pb-2">
        Параметры терминала
      </h4>

      {importStatus && (
        <div className="p-2.5 rounded bg-acc/10 border border-acc/30 text-acc flex items-center gap-2 text-xs">
          <Check className="w-3.5 h-3.5 flex-none" />
          <span>{importStatus}</span>
        </div>
      )}

      {/* Color Scheme */}
      <div>
        <input
          type="file"
          ref={fileInputRef}
          onChange={handleFileChange}
          accept=".json,.itermcolors"
          className="hidden"
        />
        <div className="flex items-center justify-between mb-1">
          <label className="text-xs font-medium text-mut">Цветовая схема</label>
          <button
            type="button"
            onClick={handleImportThemeFile}
            className="flex items-center gap-1 text-[11px] text-acc hover:underline"
          >
            <Upload className="w-3 h-3" />
            <span>Импорт схемы (JSON / iTerm2)</span>
          </button>
        </div>
        <select
          value={terminalSettings.colorScheme}
          onChange={(e) => updateTerminalSettings({ colorScheme: e.target.value })}
          className="w-full py-1.5 px-2.5 rounded bg-bg border border-line focus:border-acc text-tx text-xs outline-none"
        >
          {allThemeNames.map((name) => (
            <option key={name} value={name}>
              {name} {terminalSettings.customThemes[name] ? '(пользовательская)' : ''}
            </option>
          ))}
        </select>
      </div>

      {/* Font Family */}
      <div>
        <label className="block text-xs font-medium text-mut mb-1">Шрифт терминала</label>
        <select
          value={terminalSettings.fontFamily}
          onChange={(e) => updateTerminalSettings({ fontFamily: e.target.value })}
          className="w-full py-1.5 px-2.5 rounded bg-bg border border-line focus:border-acc text-tx text-xs outline-none"
        >
          <option value="'JetBrains Mono', 'Cascadia Code', Consolas, monospace">
            JetBrains Mono (по умолчанию)
          </option>
          <option value="'Cascadia Code', Consolas, monospace">Cascadia Code</option>
          <option value="Consolas, monospace">Consolas</option>
          <option value="'Fira Code', monospace">Fira Code</option>
          <option value="'Courier New', monospace">Courier New</option>
          <option value="monospace">Системный monospace</option>
        </select>
      </div>

      {/* Font Size & Line Height */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-mut mb-1">
            Размер шрифта (px)
          </label>
          <input
            type="number"
            min={10}
            max={24}
            value={terminalSettings.fontSize}
            onChange={(e) => updateTerminalSettings({ fontSize: Number(e.target.value) })}
            className="w-full py-1.5 px-2.5 rounded bg-bg border border-line focus:border-acc text-tx text-xs font-mono outline-none"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-mut mb-1">Высота строки</label>
          <input
            type="number"
            step={0.1}
            min={1.0}
            max={2.0}
            value={terminalSettings.lineHeight}
            onChange={(e) =>
              updateTerminalSettings({ lineHeight: Number(e.target.value) })
            }
            className="w-full py-1.5 px-2.5 rounded bg-bg border border-line focus:border-acc text-tx text-xs font-mono outline-none"
          />
        </div>
      </div>

      {/* Cursor Style & Blink */}
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs font-medium text-mut mb-1">Стиль курсора</label>
          <select
            value={terminalSettings.cursorStyle}
            onChange={(e) =>
              updateTerminalSettings({
                cursorStyle: e.target.value as 'block' | 'underline' | 'bar'
              })
            }
            className="w-full py-1.5 px-2.5 rounded bg-bg border border-line focus:border-acc text-tx text-xs outline-none"
          >
            <option value="block">Блок █</option>
            <option value="underline">Подчёркивание </option>
            <option value="bar">Вертикальная черта |</option>
          </select>
        </div>

        <div className="flex items-center gap-2 pt-6">
          <input
            type="checkbox"
            id="chk-cursor-blink"
            checked={terminalSettings.cursorBlink}
            onChange={(e) => updateTerminalSettings({ cursorBlink: e.target.checked })}
            className="rounded border-line text-acc focus:ring-acc"
          />
          <label htmlFor="chk-cursor-blink" className="text-xs text-tx cursor-pointer">
            Мигающий курсор
          </label>
        </div>
      </div>

      {/* Scrollback Buffer */}
      <div>
        <label className="block text-xs font-medium text-mut mb-1">
          Размер буфера прокрутки (строк)
        </label>
        <input
          type="number"
          min={1000}
          max={100000}
          step={1000}
          value={terminalSettings.scrollback}
          onChange={(e) => updateTerminalSettings({ scrollback: Number(e.target.value) })}
          className="w-full py-1.5 px-2.5 rounded bg-bg border border-line focus:border-acc text-tx text-xs font-mono outline-none"
        />
      </div>
    </div>
  )
}
