import { useState } from 'react'
import { Tab } from '../tabs/Tab'
import { FileTable } from '../sftp/FileTable'
import { TransferItem } from '../sftp/TransferItem'
import { TerminalView } from '../terminal/TerminalView'
import { mockAllStatusTransfers } from '../../mocks/transfers'
import { mockFileSystem } from '../../mocks/sftp'
import type { TabData } from '../../stores/tabs-store'
import { useSettingsStore } from '../../stores/settings-store'
import { FileCode, ArrowLeft } from 'lucide-react'

interface UiGalleryProps {
  onBackToApp: () => void
}

export function UiGallery({ onBackToApp }: UiGalleryProps): JSX.Element {
  const theme = useSettingsStore((s) => s.theme)
  const setTheme = useSettingsStore((s) => s.setTheme)

  const [selectedFile, setSelectedFile] = useState<string | null>('deploy.sh')

  // Sample tab states
  const sampleTabs: TabData[] = [
    {
      id: 'tab-connected',
      title: 'prod-web-01 (подключено)',
      host: '10.0.4.21',
      type: 'ssh',
      status: 'connected',
      uptime: '3д 4ч',
      termText: '$ uptime\n 3 days',
      currentPath: '/var/www',
      selectedFileName: null,
      osc7Follow: true,
      transfers: []
    },
    {
      id: 'tab-connecting',
      title: 'stage-db (подключение…)',
      host: '10.0.7.5',
      type: 'ssh',
      status: 'connecting',
      uptime: '—',
      termText: '$ connecting...',
      currentPath: '/',
      selectedFileName: null,
      osc7Follow: true,
      transfers: []
    },
    {
      id: 'tab-disconnected',
      title: 'backup-srv (разрыв)',
      host: '10.0.9.1',
      type: 'ssh',
      status: 'disconnected',
      uptime: '—',
      termText: 'Session disconnected',
      currentPath: '/',
      selectedFileName: null,
      osc7Follow: false,
      transfers: []
    },
    {
      id: 'tab-error',
      title: 'auth-host (ошибка)',
      host: '10.0.2.2',
      type: 'ssh',
      status: 'error',
      uptime: '—',
      termText: 'Connection timed out',
      currentPath: '/',
      selectedFileName: null,
      osc7Follow: false,
      transfers: []
    }
  ]

  return (
    <div className="h-screen w-screen overflow-y-auto bg-bg text-tx p-6 select-none font-sans">
      <div className="max-w-5xl mx-auto space-y-8 pb-12">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-line pb-4">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onBackToApp}
              className="flex items-center gap-1.5 py-1 px-2.5 rounded-md border border-line bg-panel2 text-tx text-xs hover:border-acc transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Вернуться в приложение</span>
            </button>
            <h1 className="text-lg font-bold text-tx">TermDeck UI Gallery (Dev)</h1>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-mut">Тема:</span>
            <button
              type="button"
              onClick={() => setTheme('dark')}
              className={`py-1 px-2.5 rounded text-xs border ${
                theme === 'dark' ? 'border-acc bg-acc/20 text-acc' : 'border-line bg-panel2'
              }`}
            >
              Dark
            </button>
            <button
              type="button"
              onClick={() => setTheme('light')}
              className={`py-1 px-2.5 rounded text-xs border ${
                theme === 'light' ? 'border-acc bg-acc/20 text-acc' : 'border-line bg-panel2'
              }`}
            >
              Light
            </button>
          </div>
        </div>

        {/* Section 1: Tab States */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-mut uppercase tracking-wider">
            1. Состояния вкладок (Tabs)
          </h2>
          <div className="flex flex-wrap items-end gap-2 bg-panel p-3 rounded-lg border border-line">
            {sampleTabs.map((tab, idx) => (
              <Tab
                key={tab.id}
                tab={tab}
                index={idx}
                isActive={idx === 0}
                onSelect={() => {}}
                onClose={() => {}}
                onRename={() => {}}
                onDuplicate={() => {}}
                onCloseOthers={() => {}}
                onReorder={() => {}}
              />
            ))}

            {/* Editor tab mockup */}
            <div className="flex items-center gap-2 py-1.5 px-3 rounded-t-[7px] bg-panel2 text-tx text-xs select-none">
              <FileCode className="w-3.5 h-3.5 text-acc flex-none" />
              <span className="font-medium">server.conf</span>
              <span
                className="w-2 h-2 rounded-full bg-acc flex-none"
                title="Несохранённые изменения"
              />
            </div>
          </div>
        </section>

        {/* Section 2: Pill (OSC 7 Integration) States */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-mut uppercase tracking-wider">
            2. Плашка «SFTP следует за терминалом (OSC 7)»
          </h2>
          <div className="flex items-center gap-4 bg-panel p-4 rounded-lg border border-line">
            <div>
              <div className="text-[11px] text-mut mb-1">Активна:</div>
              <span className="py-0.5 px-2 rounded-[9px] border border-ok/40 bg-bg text-ok text-[11px] font-mono">
                SFTP следует за терминалом (OSC 7)
              </span>
            </div>
            <div>
              <div className="text-[11px] text-mut mb-1">Выключена:</div>
              <span className="py-0.5 px-2 rounded-[9px] border border-line bg-bg text-mut text-[11px] font-mono">
                SFTP: следование выключено
              </span>
            </div>
            <div>
              <div className="text-[11px] text-mut mb-1">Недоступна (локальный):</div>
              <span className="py-0.5 px-2 rounded-[9px] border border-line bg-bg text-mut text-[11px] font-mono">
                Локальный терминал
              </span>
            </div>
          </div>
        </section>

        {/* Section 3: SFTP File Table States */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-mut uppercase tracking-wider">
            3. Состояния SFTP-панели и строк файлов
          </h2>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Normal + Selection */}
            <div className="bg-panel rounded-lg border border-line flex flex-col h-[220px] overflow-hidden">
              <div className="px-3 py-1.5 border-b border-line text-xs font-semibold text-mut bg-panel2">
                Обычная таблица + Выбранная строка
              </div>
              <FileTable
                currentPath="/var/www"
                files={mockFileSystem['/var/www']}
                selectedNames={selectedFile ? [selectedFile] : []}
                state="normal"
                onNavigate={() => {}}
                onSelect={(name) => setSelectedFile(name)}
                onClearSelection={() => setSelectedFile(null)}
              />
            </div>

            {/* Empty Folder */}
            <div className="bg-panel rounded-lg border border-line flex flex-col h-[220px] overflow-hidden">
              <div className="px-3 py-1.5 border-b border-line text-xs font-semibold text-mut bg-panel2">
                Пустая папка («Папка пуста»)
              </div>
              <FileTable
                currentPath="/var/tmp"
                files={[]}
                selectedNames={[]}
                state="empty"
                onNavigate={() => {}}
                onSelect={() => {}}
                onClearSelection={() => {}}
              />
            </div>

            {/* Loading Skeleton */}
            <div className="bg-panel rounded-lg border border-line flex flex-col h-[220px] overflow-hidden">
              <div className="px-3 py-1.5 border-b border-line text-xs font-semibold text-mut bg-panel2">
                Загрузка (Skeleton)
              </div>
              <FileTable
                currentPath="/var/log"
                files={[]}
                selectedNames={[]}
                state="loading"
                onNavigate={() => {}}
                onSelect={() => {}}
                onClearSelection={() => {}}
              />
            </div>

            {/* Permission Denied */}
            <div className="bg-panel rounded-lg border border-line flex flex-col h-[220px] overflow-hidden">
              <div className="px-3 py-1.5 border-b border-line text-xs font-semibold text-mut bg-panel2">
                Нет прав (Permission denied)
              </div>
              <FileTable
                currentPath="/root"
                files={[]}
                selectedNames={[]}
                state="permission_denied"
                onNavigate={() => {}}
                onSelect={() => {}}
                onClearSelection={() => {}}
                onRetry={() => {}}
              />
            </div>
          </div>
        </section>

        {/* Section 4: Transfer Item States */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-mut uppercase tracking-wider">
            4. Состояния блока «Передачи» (в очереди, идёт, пауза, готово, ошибка)
          </h2>
          <div className="bg-panel p-4 rounded-lg border border-line space-y-3 max-w-lg">
            {mockAllStatusTransfers.map((item) => (
              <TransferItem key={item.id} transfer={item} onRetry={() => {}} />
            ))}
          </div>
        </section>

        {/* Section 5: Terminal Disconnection Banner */}
        <section className="space-y-3">
          <h2 className="text-sm font-semibold text-mut uppercase tracking-wider">
            5. Терминал: баннер разрыва соединения / ошибки
          </h2>
          <div className="h-[180px] rounded-lg border border-line overflow-hidden flex flex-col">
            <TerminalView tab={sampleTabs.find((t) => t.id === 'tab-error')} isActive={true} />
          </div>
        </section>
      </div>
    </div>
  )
}
