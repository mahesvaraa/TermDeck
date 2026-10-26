import { useState } from 'react'
import { FolderSync, Check } from 'lucide-react'
import { useSettingsStore } from '../../../stores/settings-store'
import { useTranslation } from '../../../i18n'
import { SessionImportExportModal } from '../../sessions/SessionImportExportModal'

export function GeneralSection(): JSX.Element {
  const { t, lang, setLanguage } = useTranslation()
  const copyOnSelect = useSettingsStore((s) => s.copyOnSelect)
  const setCopyOnSelect = useSettingsStore((s) => s.setCopyOnSelect)
  const [isImportExportOpen, setIsImportExportOpen] = useState(false)

  return (
    <div className="space-y-5 text-xs">
      <h4 className="text-sm font-semibold border-b border-line pb-2">
        {t.settings.general}
      </h4>

      {/* Language Selection */}
      <div className="space-y-2">
        <label className="block text-xs font-medium text-mut">
          {t.settings.language}
        </label>
        <p className="text-[11px] text-mut">
          {t.settings.languageDesc}
        </p>

        <div className="grid grid-cols-2 gap-3 max-w-sm pt-1">
          <button
            type="button"
            onClick={() => setLanguage('ru')}
            className={`p-2.5 rounded border text-left flex items-center justify-between transition-colors ${
              lang === 'ru'
                ? 'border-acc bg-acc/10 text-tx font-medium'
                : 'border-line bg-bg hover:border-tx/40 text-mut'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-base leading-none">🇷🇺</span>
              <span>Русский</span>
            </div>
            {lang === 'ru' && <Check className="w-3.5 h-3.5 text-acc" />}
          </button>

          <button
            type="button"
            onClick={() => setLanguage('en')}
            className={`p-2.5 rounded border text-left flex items-center justify-between transition-colors ${
              lang === 'en'
                ? 'border-acc bg-acc/10 text-tx font-medium'
                : 'border-line bg-bg hover:border-tx/40 text-mut'
            }`}
          >
            <div className="flex items-center gap-2">
              <span className="text-base leading-none">🇬🇧</span>
              <span>English</span>
            </div>
            {lang === 'en' && <Check className="w-3.5 h-3.5 text-acc" />}
          </button>
        </div>
      </div>

      {/* Sessions Import / Export */}
      <div className="space-y-2 pt-2 border-t border-line">
        <label className="block text-xs font-medium text-mut">
          Сессии и резервное копирование
        </label>
        <p className="text-[11px] text-mut">
          Импорт хостов из ~/.ssh/config, экспорт сессий в JSON и восстановление из файла
        </p>
        <div className="pt-1">
          <button
            type="button"
            onClick={() => setIsImportExportOpen(true)}
            className="flex items-center gap-2 py-1.5 px-3 rounded border border-line bg-panel2 text-tx hover:border-acc transition-colors text-xs font-medium"
          >
            <FolderSync className="w-3.5 h-3.5 text-acc" />
            <span>Управление импортом и экспортом сессий...</span>
          </button>
        </div>
      </div>

      {/* Copy on select */}
      <div className="space-y-2 pt-2 border-t border-line">
        <label className="block text-xs font-medium text-mut">
          Буфер обмена
        </label>
        <div className="flex items-center gap-2 pt-1">
          <input
            type="checkbox"
            id="chk-copy-select-general"
            checked={copyOnSelect}
            onChange={(e) => setCopyOnSelect(e.target.checked)}
            className="rounded border-line text-acc focus:ring-acc"
          />
          <label htmlFor="chk-copy-select-general" className="text-xs text-tx cursor-pointer">
            Автоматически копировать выделенный текст в терминале (Copy on Select)
          </label>
        </div>
      </div>

      <SessionImportExportModal
        isOpen={isImportExportOpen}
        onClose={() => setIsImportExportOpen(false)}
      />
    </div>
  )
}
