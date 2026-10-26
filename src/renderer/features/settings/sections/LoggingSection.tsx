import { useSettingsStore } from '../../../stores/settings-store'

export function LoggingSection(): JSX.Element {
  const logging = useSettingsStore((s) => s.logging)
  const updateLogging = useSettingsStore((s) => s.updateLogging)

  return (
    <div className="space-y-4 text-xs">
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
  )
}
