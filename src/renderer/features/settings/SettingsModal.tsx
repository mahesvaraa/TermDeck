import { useState, useEffect } from 'react'
import {
  X,
  Sliders,
  Terminal,
  Keyboard,
  RotateCcw,
  FileText,
  Upload,
  Check,
  Palette,
  RefreshCw
} from 'lucide-react'
import { useSettingsStore } from '../../stores/settings-store'
import {
  BUILTIN_THEMES,
  parseWindowsTerminalTheme,
  parseIterm2Theme
} from '../../utils/theme-importer'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

type SettingsSection = 'terminal' | 'appearance' | 'shortcuts' | 'restore' | 'logging' | 'updates'

export function SettingsModal({ isOpen, onClose }: SettingsModalProps): JSX.Element | null {
  const [activeSection, setActiveSection] = useState<SettingsSection>('terminal')
  const [importStatus, setImportStatus] = useState<string | null>(null)
  const [updaterStatus, setUpdaterStatus] = useState<{
    status: string
    version?: string
    percent?: number
    error?: string
  } | null>(null)
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false)

  const theme = useSettingsStore((s) => s.theme)
  const setTheme = useSettingsStore((s) => s.setTheme)
  const copyOnSelect = useSettingsStore((s) => s.copyOnSelect)
  const setCopyOnSelect = useSettingsStore((s) => s.setCopyOnSelect)

  const terminalSettings = useSettingsStore((s) => s.terminalSettings)
  const updateTerminalSettings = useSettingsStore((s) => s.updateTerminalSettings)
  const addCustomTheme = useSettingsStore((s) => s.addCustomTheme)

  const sessionRestore = useSettingsStore((s) => s.sessionRestore)
  const updateSessionRestore = useSettingsStore((s) => s.updateSessionRestore)

  const logging = useSettingsStore((s) => s.logging)
  const updateLogging = useSettingsStore((s) => s.updateLogging)

  const shortcuts = useSettingsStore((s) => s.shortcuts)
  const updateShortcut = useSettingsStore((s) => s.updateShortcut)
  const resetShortcuts = useSettingsStore((s) => s.resetShortcuts)

  useEffect(() => {
    if (!isOpen || !window.api?.onUpdaterStatus) return
    const unsubscribe = window.api.onUpdaterStatus((status) => {
      setUpdaterStatus(status)
      if (status.status !== 'checking') {
        setIsCheckingUpdate(false)
      }
    })
    return () => {
      unsubscribe()
    }
  }, [isOpen])

  if (!isOpen) return null

  const handleImportThemeFile = async (): Promise<void> => {
    if (!window.api?.showOpenDialog) return
    try {
      const res = await window.api.showOpenDialog({
        title: 'Импорт темы (Windows Terminal JSON или iTerm2 plist)',
        properties: ['openFile']
      })
      if (res && res.filePaths.length > 0) {
        const filePath = res.filePaths[0]
        // Read file through preload/renderer dialog or fetch
        // For file content import, we use a basic fetch from file:// or IPC
        const response = await fetch(`file://${filePath}`)
        const text = await response.text()

        let parsed = parseWindowsTerminalTheme(text)
        if (!parsed) {
          parsed = parseIterm2Theme(text)
        }

        if (parsed) {
          addCustomTheme(parsed.name, parsed.theme)
          updateTerminalSettings({ colorScheme: parsed.name })
          setImportStatus(`Тема «${parsed.name}» успешно импортирована`)
          setTimeout(() => setImportStatus(null), 3000)
        } else {
          setImportStatus('Не удалось распознать формат темы (поддерживаются JSON и .itermcolors)')
        }
      }
    } catch (err) {
      setImportStatus(`Ошибка импорта: ${(err as Error).message}`)
    }
  }

  const allThemeNames = [
    ...Object.keys(BUILTIN_THEMES),
    ...Object.keys(terminalSettings.customThemes)
  ]

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 font-sans select-none">
      <div className="bg-panel2 border border-line rounded-lg shadow-2xl w-full max-w-3xl overflow-hidden flex flex-col h-[70vh] max-h-[600px] text-tx text-xs">
        {/* Header */}
        <div className="px-4 py-3 border-b border-line flex items-center justify-between bg-panel/70">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-acc" />
            <span className="font-semibold text-sm">Настройки TermDeck</span>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-mut hover:text-tx hover:bg-panel transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Layout */}
        <div className="flex-1 flex min-h-0">
          {/* Left Navigation */}
          <div className="w-48 border-r border-line bg-panel/30 flex flex-col p-2 space-y-1">
            <button
              type="button"
              onClick={() => setActiveSection('terminal')}
              className={`w-full text-left px-2.5 py-2 rounded text-xs flex items-center gap-2 transition-colors ${
                activeSection === 'terminal'
                  ? 'bg-acc/15 text-tx font-medium'
                  : 'text-mut hover:text-tx hover:bg-panel/50'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>Терминал</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSection('appearance')}
              className={`w-full text-left px-2.5 py-2 rounded text-xs flex items-center gap-2 transition-colors ${
                activeSection === 'appearance'
                  ? 'bg-acc/15 text-tx font-medium'
                  : 'text-mut hover:text-tx hover:bg-panel/50'
              }`}
            >
              <Palette className="w-3.5 h-3.5" />
              <span>Внешний вид</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSection('shortcuts')}
              className={`w-full text-left px-2.5 py-2 rounded text-xs flex items-center gap-2 transition-colors ${
                activeSection === 'shortcuts'
                  ? 'bg-acc/15 text-tx font-medium'
                  : 'text-mut hover:text-tx hover:bg-panel/50'
              }`}
            >
              <Keyboard className="w-3.5 h-3.5" />
              <span>Горячие клавиши</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSection('restore')}
              className={`w-full text-left px-2.5 py-2 rounded text-xs flex items-center gap-2 transition-colors ${
                activeSection === 'restore'
                  ? 'bg-acc/15 text-tx font-medium'
                  : 'text-mut hover:text-tx hover:bg-panel/50'
              }`}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Восстановление</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSection('logging')}
              className={`w-full text-left px-2.5 py-2 rounded text-xs flex items-center gap-2 transition-colors ${
                activeSection === 'logging'
                  ? 'bg-acc/15 text-tx font-medium'
                  : 'text-mut hover:text-tx hover:bg-panel/50'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Логирование</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveSection('updates')}
              className={`w-full text-left px-2.5 py-2 rounded text-xs flex items-center gap-2 transition-colors ${
                activeSection === 'updates'
                  ? 'bg-acc/15 text-tx font-medium'
                  : 'text-mut hover:text-tx hover:bg-panel/50'
              }`}
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Обновления</span>
            </button>
          </div>

          {/* Right Section Details */}
          <div className="flex-1 p-5 overflow-y-auto bg-panel2 space-y-4">
            {importStatus && (
              <div className="p-2.5 rounded bg-acc/10 border border-acc/30 text-acc flex items-center gap-2 text-xs">
                <Check className="w-3.5 h-3.5 flex-none" />
                <span>{importStatus}</span>
              </div>
            )}

            {activeSection === 'terminal' && (
              <div className="space-y-4">
                <h4 className="text-sm font-semibold border-b border-line pb-2">
                  Параметры терминала
                </h4>

                {/* Color Scheme */}
                <div>
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

                {/* Copy on Select */}
                <div className="flex items-center gap-2 pt-2 border-t border-line">
                  <input
                    type="checkbox"
                    id="chk-copy-select"
                    checked={copyOnSelect}
                    onChange={(e) => setCopyOnSelect(e.target.checked)}
                    className="rounded border-line text-acc focus:ring-acc"
                  />
                  <label htmlFor="chk-copy-select" className="text-xs text-tx cursor-pointer">
                    Копировать выделенный текст в буфер автоматически (Copy on Select)
                  </label>
                </div>
              </div>
            )}

            {activeSection === 'appearance' && (
              <div className="space-y-4">
                <h4 className="text-sm font-semibold border-b border-line pb-2">Тема интерфейса</h4>

                <div>
                  <label className="block text-xs font-medium text-mut mb-2">
                    Тема оформления приложения
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setTheme('dark')}
                      className={`p-3 rounded border text-left transition-colors ${
                        theme === 'dark'
                          ? 'border-acc bg-acc/10 text-tx'
                          : 'border-line bg-panel hover:border-tx/40 text-mut'
                      }`}
                    >
                      <div className="font-semibold text-xs text-tx">Тёмная</div>
                      <div className="text-[10px] text-mut mt-0.5">Контрастная ночная палитра</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setTheme('light')}
                      className={`p-3 rounded border text-left transition-colors ${
                        theme === 'light'
                          ? 'border-acc bg-acc/10 text-tx'
                          : 'border-line bg-panel hover:border-tx/40 text-mut'
                      }`}
                    >
                      <div className="font-semibold text-xs text-tx">Светлая</div>
                      <div className="text-[10px] text-mut mt-0.5">Дневная мягкая тема</div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setTheme('system')}
                      className={`p-3 rounded border text-left transition-colors ${
                        theme === 'system'
                          ? 'border-acc bg-acc/10 text-tx'
                          : 'border-line bg-panel hover:border-tx/40 text-mut'
                      }`}
                    >
                      <div className="font-semibold text-xs text-tx">Системная</div>
                      <div className="text-[10px] text-mut mt-0.5">Следовать теме ОС</div>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {activeSection === 'shortcuts' && (
              <div className="space-y-4">
                <div className="flex items-center justify-between border-b border-line pb-2">
                  <h4 className="text-sm font-semibold">Горячие клавиши</h4>
                  <button
                    type="button"
                    onClick={resetShortcuts}
                    className="text-[11px] text-mut hover:text-tx underline"
                  >
                    Сбросить по умолчанию
                  </button>
                </div>

                <div className="space-y-2.5">
                  {Object.entries(shortcuts).map(([actionKey, currentShortcut]) => (
                    <div
                      key={actionKey}
                      className="flex items-center justify-between p-2 rounded bg-panel border border-line"
                    >
                      <span className="text-xs text-tx">
                        {actionKey === 'newLocalTab' && 'Новый локальный терминал'}
                        {actionKey === 'closeTab' && 'Закрыть активную вкладку'}
                        {actionKey === 'toggleSidebar' && 'Показать/скрыть сайдбар сессий'}
                        {actionKey === 'toggleSftp' && 'Показать/скрыть SFTP-панель'}
                        {actionKey === 'commandPalette' && 'Палитра команд'}
                        {actionKey === 'searchBuffer' && 'Поиск по буферу терминала'}
                        {actionKey === 'nextTab' && 'Следующая вкладка'}
                        {actionKey === 'prevTab' && 'Предыдущая вкладка'}
                      </span>

                      <input
                        type="text"
                        value={currentShortcut}
                        onChange={(e) => updateShortcut(actionKey, e.target.value)}
                        className="py-1 px-2 w-32 text-center rounded bg-bg border border-line font-mono text-xs text-tx outline-none focus:border-acc"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeSection === 'restore' && (
              <div className="space-y-4">
                <h4 className="text-sm font-semibold border-b border-line pb-2">
                  Восстановление сессий
                </h4>

                <div className="p-3 bg-panel rounded border border-line space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="chk-auto-restore"
                      checked={sessionRestore.autoRestore}
                      onChange={(e) => updateSessionRestore({ autoRestore: e.target.checked })}
                      className="rounded border-line text-acc focus:ring-acc"
                    />
                    <label
                      htmlFor="chk-auto-restore"
                      className="text-xs text-tx cursor-pointer font-medium"
                    >
                      Автоматически восстанавливать открытые вкладки при запуске
                    </label>
                  </div>
                  <p className="text-[11px] text-mut leading-relaxed">
                    TermDeck сохраняет снимок открытых вкладок и раскладок сплитов при выходе. При
                    следующем старте они будут перезапущены.
                  </p>
                </div>
              </div>
            )}

            {activeSection === 'logging' && (
              <div className="space-y-4">
                <h4 className="text-sm font-semibold border-b border-line pb-2">
                  Логирование вывода терминала
                </h4>

                <div className="p-3 bg-panel rounded border border-line space-y-3">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="chk-log-enable"
                      checked={logging.enabled}
                      onChange={(e) => updateLogging({ enabled: e.target.checked })}
                      className="rounded border-line text-acc focus:ring-acc"
                    />
                    <label
                      htmlFor="chk-log-enable"
                      className="text-xs text-tx cursor-pointer font-medium"
                    >
                      Включить запись истории сессий в файлы логов
                    </label>
                  </div>

                  <div className="flex items-center gap-2 pl-5">
                    <input
                      type="checkbox"
                      id="chk-log-strip"
                      disabled={!logging.enabled}
                      checked={logging.stripAnsi}
                      onChange={(e) => updateLogging({ stripAnsi: e.target.checked })}
                      className="rounded border-line text-acc focus:ring-acc disabled:opacity-50"
                    />
                    <label htmlFor="chk-log-strip" className="text-xs text-mut cursor-pointer">
                      Вырезать управляющие ANSI-последовательности (чистый читаемый текст)
                    </label>
                  </div>

                  <p className="text-[11px] text-mut leading-relaxed">
                    Логи сохраняются в директорию логов приложения с разбивкой по датам и сессиям.
                  </p>
                </div>
              </div>
            )}

            {activeSection === 'updates' && (
              <div className="space-y-4">
                <h4 className="text-sm font-semibold border-b border-line pb-2">
                  Обновления приложения
                </h4>

                <div className="p-4 bg-panel rounded border border-line space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="text-xs font-medium text-tx">Версия TermDeck</div>
                      <div className="text-[11px] text-mut">v0.1.0</div>
                    </div>

                    <button
                      type="button"
                      disabled={isCheckingUpdate}
                      onClick={async () => {
                        setIsCheckingUpdate(true)
                        try {
                          await window.api?.checkForUpdates(true)
                        } catch {
                          // Handled by event
                        }
                      }}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded bg-acc text-bg font-medium hover:bg-acc/90 disabled:opacity-50 text-xs transition-colors"
                    >
                      <RefreshCw
                        className={`w-3.5 h-3.5 ${isCheckingUpdate ? 'animate-spin' : ''}`}
                      />
                      <span>{isCheckingUpdate ? 'Проверка…' : 'Проверить обновления'}</span>
                    </button>
                  </div>

                  {updaterStatus && (
                    <div className="mt-3 p-2.5 rounded bg-panel2 border border-line text-xs">
                      {updaterStatus.status === 'checking' && (
                        <div className="text-mut">Выполняется поиск новых версий…</div>
                      )}
                      {updaterStatus.status === 'available' && (
                        <div className="text-acc">
                          Доступна новая версия: {updaterStatus.version || ''}. Начинается загрузка…
                        </div>
                      )}
                      {updaterStatus.status === 'not-available' && (
                        <div className="text-ok">У вас установлена последняя версия TermDeck.</div>
                      )}
                      {updaterStatus.status === 'downloading' && (
                        <div className="space-y-1">
                          <div className="flex justify-between text-tx">
                            <span>Загрузка обновления…</span>
                            <span>{updaterStatus.percent || 0}%</span>
                          </div>
                          <div className="w-full bg-line rounded-full h-1.5 overflow-hidden">
                            <div
                              className="bg-acc h-1.5 transition-all duration-300"
                              style={{ width: `${updaterStatus.percent || 0}%` }}
                            />
                          </div>
                        </div>
                      )}
                      {updaterStatus.status === 'downloaded' && (
                        <div className="flex items-center justify-between">
                          <span className="text-ok font-medium">
                            Обновление {updaterStatus.version || ''} готово к установке
                          </span>
                          <button
                            type="button"
                            onClick={() => window.api?.installUpdate()}
                            className="px-2.5 py-1 rounded bg-ok text-bg font-medium hover:bg-ok/90 text-xs"
                          >
                            Перезапустить сейчас
                          </button>
                        </div>
                      )}
                      {updaterStatus.status === 'error' && (
                        <div className="text-err">
                          {updaterStatus.error || 'Ошибка проверки обновлений'}
                        </div>
                      )}
                    </div>
                  )}

                  <p className="text-[11px] text-mut leading-relaxed">
                    TermDeck автоматически проверяет доступность обновлений при старте и загружает
                    их в фоновом режиме.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 border-t border-line bg-panel/40 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded bg-acc text-bg font-medium hover:bg-acc/90 transition-colors"
          >
            Готово
          </button>
        </div>
      </div>
    </div>
  )
}
