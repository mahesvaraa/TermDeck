import { useSettingsStore } from '../../../stores/settings-store'

export function RestoreSection(): JSX.Element {
  const sessionRestore = useSettingsStore((s) => s.sessionRestore)
  const updateSessionRestore = useSettingsStore((s) => s.updateSessionRestore)

  return (
    <div className="space-y-4 text-xs">
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
  )
}
