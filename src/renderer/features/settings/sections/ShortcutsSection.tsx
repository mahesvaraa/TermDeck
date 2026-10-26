import { useSettingsStore } from '../../../stores/settings-store'

export function ShortcutsSection(): JSX.Element {
  const shortcuts = useSettingsStore((s) => s.shortcuts)
  const updateShortcut = useSettingsStore((s) => s.updateShortcut)
  const resetShortcuts = useSettingsStore((s) => s.resetShortcuts)

  return (
    <div className="space-y-4 text-xs">
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
  )
}
