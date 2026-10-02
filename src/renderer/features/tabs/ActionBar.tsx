import { Columns, Rows, Network, Code, Layers, PanelLeft, PanelBottom } from 'lucide-react'
import { useTabsStore } from '../../stores/tabs-store'
import { useSftpStore } from '../../stores/sftp-store'

interface ActionBarProps {
  onKeysClick?: () => void
  onTunnelsClick?: () => void
  onSnippetsClick?: () => void
  activeTunnelCount?: number
}

export function ActionBar({
  onKeysClick: _onKeysClick,
  onTunnelsClick,
  onSnippetsClick,
  activeTunnelCount
}: ActionBarProps): JSX.Element {
  const getActiveTab = useTabsStore((s) => s.getActiveTab)
  const toggleOsc7 = useTabsStore((s) => s.toggleOsc7)
  const splitActivePane = useTabsStore((s) => s.splitActivePane)
  const toggleMultiExec = useTabsStore((s) => s.toggleMultiExec)
  const panelPosition = useSftpStore((s) => s.panelPosition)
  const setPanelPosition = useSftpStore((s) => s.setPanelPosition)
  const activeTab = getActiveTab()

  const isSsh = activeTab?.type === 'ssh'

  const handlePillClick = (): void => {
    if (activeTab && isSsh) {
      toggleOsc7(activeTab.id)
    }
  }

  const togglePosition = (): void => {
    setPanelPosition(panelPosition === 'left' ? 'bottom' : 'left')
  }

  const getPillState = (): { text: string; style: string; title: string; disabled: boolean } => {
    if (!activeTab) {
      return {
        text: 'SFTP: нет активной сессии',
        style: 'bg-bg text-mut/50 border-line/40 opacity-70 cursor-not-allowed',
        title: 'Выберите вкладку терминала',
        disabled: true
      }
    }
    if (activeTab.type === 'editor') {
      return {
        text: `Редактор: ${activeTab.title}`,
        style: 'bg-bg text-acc/80 border-acc/30 cursor-default',
        title: activeTab.editorState?.remotePath
          ? `Удалённый файл: ${activeTab.editorState.remotePath}`
          : `Файл: ${activeTab.title}`,
        disabled: true
      }
    }
    if (!isSsh) {
      return {
        text: 'SFTP: недоступно для локального терминала',
        style: 'bg-bg text-mut/50 border-line/40 opacity-70 cursor-not-allowed',
        title: 'Следование SFTP доступно только для удалённых SSH-сессий',
        disabled: true
      }
    }
    if (activeTab.osc7Follow) {
      return {
        text: 'SFTP следует за терминалом (OSC 7)',
        style: 'bg-bg text-ok border-ok/40 hover:border-ok cursor-pointer',
        title: 'Клик для выключения следования за терминалом',
        disabled: false
      }
    }
    return {
      text: 'SFTP: следование выключено',
      style: 'bg-bg text-mut border-line hover:border-tx/40 cursor-pointer',
      title: 'Клик для включения следования за терминалом (OSC 7)',
      disabled: false
    }
  }

  const pillState = getPillState()
  const isEditor = activeTab?.type === 'editor'

  return (
    <div className="flex items-center gap-1.5 py-1.5 px-2.5 bg-panel border-b border-line flex-none overflow-x-auto select-none text-xs">
      <button
        type="button"
        onClick={() => splitActivePane('horizontal')}
        disabled={isEditor}
        title="Разделить терминал по горизонтали (Split Right)"
        className={`flex items-center gap-1.5 py-1 px-2.5 border rounded-md text-xs transition-colors ${
          isEditor
            ? 'opacity-40 cursor-not-allowed border-line bg-panel2 text-mut'
            : 'border-line bg-panel2 text-tx hover:border-acc focus-visible:outline-2 focus-visible:outline-acc'
        }`}
      >
        <Columns className="w-3.5 h-3.5 text-mut" />
        <span>Разделить →</span>
      </button>

      <button
        type="button"
        onClick={() => splitActivePane('vertical')}
        disabled={isEditor}
        title="Разделить терминал по вертикали (Split Down)"
        className={`flex items-center gap-1.5 py-1 px-2.5 border rounded-md text-xs transition-colors ${
          isEditor
            ? 'opacity-40 cursor-not-allowed border-line bg-panel2 text-mut'
            : 'border-line bg-panel2 text-tx hover:border-acc focus-visible:outline-2 focus-visible:outline-acc'
        }`}
      >
        <Rows className="w-3.5 h-3.5 text-mut" />
        <span>Разделить ↓</span>
      </button>

      <button
        type="button"
        onClick={onTunnelsClick}
        title="Управление SSH-туннелями (-L, -R, -D)"
        className={`flex items-center gap-1.5 py-1 px-2.5 border rounded-md text-xs transition-colors ${
          (activeTunnelCount ?? 0) > 0
            ? 'border-acc/40 bg-acc/10 text-acc font-medium'
            : 'border-line bg-panel2 text-tx hover:border-acc'
        }`}
      >
        <Network
          className={`w-3.5 h-3.5 ${(activeTunnelCount ?? 0) > 0 ? 'text-acc' : 'text-mut'}`}
        />
        <span>Туннели {activeTunnelCount !== undefined ? `(${activeTunnelCount})` : ''}</span>
      </button>

      <button
        type="button"
        onClick={onSnippetsClick}
        title="Библиотека сниппетов команд с переменными {{var}}"
        className="flex items-center gap-1.5 py-1 px-2.5 border border-line rounded-md bg-panel2 text-tx text-xs hover:border-acc focus-visible:outline-2 focus-visible:outline-acc transition-colors"
      >
        <Code className="w-3.5 h-3.5 text-mut" />
        <span>Сниппеты</span>
      </button>

      <button
        type="button"
        onClick={() => activeTab && toggleMultiExec(activeTab.id)}
        title="Синхронный ввод во все сплиты активной вкладки"
        className={`flex items-center gap-1.5 py-1 px-2.5 border rounded-md text-xs focus-visible:outline-2 focus-visible:outline-acc transition-colors ${
          activeTab?.isMultiExec
            ? 'bg-acc/20 border-acc text-acc font-medium'
            : 'border-line bg-panel2 text-tx hover:border-acc'
        }`}
      >
        <Layers className={`w-3.5 h-3.5 ${activeTab?.isMultiExec ? 'text-acc' : 'text-mut'}`} />
        <span>Multi-exec</span>
      </button>

      <span className="flex-1" />

      <button
        type="button"
        onClick={togglePosition}
        title="Переключить положение SFTP панели (слева / снизу)"
        className="flex items-center gap-1.5 py-1 px-2 border border-line rounded-md bg-panel2 text-tx text-[11px] hover:border-acc transition-colors"
      >
        {panelPosition === 'left' ? (
          <>
            <PanelLeft className="w-3.5 h-3.5 text-acc" />
            <span>SFTP: слева</span>
          </>
        ) : (
          <>
            <PanelBottom className="w-3.5 h-3.5 text-acc" />
            <span>SFTP: снизу</span>
          </>
        )}
      </button>

      <button
        type="button"
        onClick={handlePillClick}
        disabled={pillState.disabled}
        title={pillState.title}
        className={`py-0.5 px-2 rounded-[9px] border text-[11px] font-mono select-none transition-colors ${pillState.style}`}
      >
        {pillState.text}
      </button>
    </div>
  )
}
