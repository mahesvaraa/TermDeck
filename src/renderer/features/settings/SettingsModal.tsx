import { useState } from 'react'
import {
  X,
  Sliders,
  Terminal,
  Keyboard,
  RotateCcw,
  FileText,
  Palette,
  RefreshCw
} from 'lucide-react'
import { useTranslation } from '../../i18n'
import { GeneralSection } from './sections/GeneralSection'
import { TerminalSection } from './sections/TerminalSection'
import { AppearanceSection } from './sections/AppearanceSection'
import { ShortcutsSection } from './sections/ShortcutsSection'
import { RestoreSection } from './sections/RestoreSection'
import { LoggingSection } from './sections/LoggingSection'
import { UpdatesSection } from './sections/UpdatesSection'

interface SettingsModalProps {
  isOpen: boolean
  onClose: () => void
}

type SettingsSection =
  | 'general'
  | 'terminal'
  | 'appearance'
  | 'shortcuts'
  | 'restore'
  | 'logging'
  | 'updates'

export function SettingsModal({ isOpen, onClose }: SettingsModalProps): JSX.Element | null {
  const [activeSection, setActiveSection] = useState<SettingsSection>('general')
  const { t } = useTranslation()

  if (!isOpen) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 font-sans select-none"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-panel border border-line rounded-lg shadow-2xl flex flex-col max-h-[85vh] overflow-hidden animate-in fade-in zoom-in-95 duration-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-line bg-panel2/50">
          <div className="flex items-center gap-2 text-sm font-semibold text-tx">
            <Sliders className="w-4 h-4 text-acc" />
            <span>{t.settings.title}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded text-mut hover:text-tx hover:bg-panel2 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body (Sidebar + Content) */}
        <div className="flex flex-1 min-h-[420px] overflow-hidden">
          {/* Left Navigation */}
          <div className="w-48 bg-panel2/30 border-r border-line p-2 space-y-1 flex-none">
            <button
              type="button"
              onClick={() => setActiveSection('general')}
              className={`w-full text-left px-2.5 py-2 rounded text-xs flex items-center gap-2 transition-colors ${
                activeSection === 'general'
                  ? 'bg-acc/15 text-tx font-medium'
                  : 'text-mut hover:text-tx hover:bg-panel/50'
              }`}
            >
              <Sliders className="w-3.5 h-3.5 text-acc" />
              <span>{t.settings.general}</span>
            </button>

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
              <span>{t.settings.terminal}</span>
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
              <span>{t.settings.appearance}</span>
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
              <span>{t.settings.shortcuts}</span>
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
              <span>{t.settings.restore}</span>
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
              <span>{t.settings.logging}</span>
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
              <span>{t.settings.updates}</span>
            </button>
          </div>

          {/* Right Section Content */}
          <div className="flex-1 p-5 overflow-y-auto">
            {activeSection === 'general' && <GeneralSection />}
            {activeSection === 'terminal' && <TerminalSection />}
            {activeSection === 'appearance' && <AppearanceSection />}
            {activeSection === 'shortcuts' && <ShortcutsSection />}
            {activeSection === 'restore' && <RestoreSection />}
            {activeSection === 'logging' && <LoggingSection />}
            {activeSection === 'updates' && <UpdatesSection />}
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 border-t border-line bg-panel/40 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded bg-acc text-bg font-medium hover:bg-acc/90 transition-colors text-xs"
          >
            {t.common.close}
          </button>
        </div>
      </div>
    </div>
  )
}
