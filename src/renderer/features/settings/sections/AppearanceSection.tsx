import { useSettingsStore } from '../../../stores/settings-store'

export function AppearanceSection(): JSX.Element {
  const theme = useSettingsStore((s) => s.theme)
  const setTheme = useSettingsStore((s) => s.setTheme)

  return (
    <div className="space-y-4 text-xs">
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
            <div className="text-[10px] text-mut mt-0.5">Автоматически по ОС</div>
          </button>
        </div>
      </div>
    </div>
  )
}
