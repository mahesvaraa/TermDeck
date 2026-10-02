import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { ITheme } from '@xterm/xterm'

export type ThemeMode = 'system' | 'dark' | 'light'

export interface TerminalSettings {
  colorScheme: string
  customThemes: Record<string, ITheme>
  fontFamily: string
  fontSize: number
  lineHeight: number
  cursorStyle: 'block' | 'underline' | 'bar'
  cursorBlink: boolean
  scrollback: number
}

export interface SessionRestoreSettings {
  autoRestore: boolean
  hasPendingRestore: boolean
}

export interface TerminalLoggingSettings {
  enabled: boolean
  stripAnsi: boolean
}

export const DEFAULT_SHORTCUTS: Record<string, string> = {
  newLocalTab: 'Ctrl+T',
  closeTab: 'Ctrl+W',
  toggleSidebar: 'Ctrl+B',
  toggleSftp: 'Ctrl+Shift+B',
  commandPalette: 'Ctrl+Shift+P',
  searchBuffer: 'Ctrl+Shift+F',
  nextTab: 'Ctrl+Tab',
  prevTab: 'Ctrl+Shift+Tab'
}

interface SettingsState {
  theme: ThemeMode
  sidebarVisible: boolean
  sftpVisible: boolean
  sidebarWidth: number
  sftpWidth: number
  copyOnSelect: boolean
  terminalSettings: TerminalSettings
  sessionRestore: SessionRestoreSettings
  logging: TerminalLoggingSettings
  shortcuts: Record<string, string>

  setTheme: (theme: ThemeMode) => void
  toggleSidebar: () => void
  setSidebarVisible: (visible: boolean) => void
  toggleSftp: () => void
  setSftpVisible: (visible: boolean) => void
  setSidebarWidth: (width: number) => void
  setSftpWidth: (width: number) => void
  setCopyOnSelect: (enabled: boolean) => void

  updateTerminalSettings: (patch: Partial<TerminalSettings>) => void
  addCustomTheme: (name: string, theme: ITheme) => void
  updateSessionRestore: (patch: Partial<SessionRestoreSettings>) => void
  updateLogging: (patch: Partial<TerminalLoggingSettings>) => void
  updateShortcut: (actionId: string, shortcut: string) => void
  resetShortcuts: () => void
}

function applyThemeToDocument(theme: ThemeMode): void {
  const resolved =
    theme === 'system'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light'
      : theme

  document.documentElement.setAttribute('data-theme', resolved)
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: 'dark',
      sidebarVisible: true,
      sftpVisible: true,
      sidebarWidth: 230,
      sftpWidth: 310,
      copyOnSelect: false,

      setTheme: (theme) => {
        applyThemeToDocument(theme)
        set({ theme })
      },

      toggleSidebar: () => set((state) => ({ sidebarVisible: !state.sidebarVisible })),
      setSidebarVisible: (sidebarVisible) => set({ sidebarVisible }),

      toggleSftp: () => set((state) => ({ sftpVisible: !state.sftpVisible })),
      setSftpVisible: (sftpVisible) => set({ sftpVisible }),

      setSidebarWidth: (sidebarWidth) => set({ sidebarWidth }),
      setSftpWidth: (sftpWidth) => set({ sftpWidth }),
      setCopyOnSelect: (copyOnSelect) => set({ copyOnSelect }),

      terminalSettings: {
        colorScheme: 'TermDeck Dark',
        customThemes: {},
        fontFamily: "'JetBrains Mono', 'Cascadia Code', Consolas, monospace",
        fontSize: 13,
        lineHeight: 1.3,
        cursorStyle: 'block',
        cursorBlink: true,
        scrollback: 10000
      },

      sessionRestore: {
        autoRestore: false,
        hasPendingRestore: false
      },

      logging: {
        enabled: false,
        stripAnsi: true
      },

      shortcuts: DEFAULT_SHORTCUTS,

      updateTerminalSettings: (patch) =>
        set((state) => ({
          terminalSettings: { ...state.terminalSettings, ...patch }
        })),

      addCustomTheme: (name, theme) =>
        set((state) => ({
          terminalSettings: {
            ...state.terminalSettings,
            customThemes: { ...state.terminalSettings.customThemes, [name]: theme }
          }
        })),

      updateSessionRestore: (patch) =>
        set((state) => ({
          sessionRestore: { ...state.sessionRestore, ...patch }
        })),

      updateLogging: (patch) =>
        set((state) => ({
          logging: { ...state.logging, ...patch }
        })),

      updateShortcut: (actionId, shortcut) =>
        set((state) => ({
          shortcuts: { ...state.shortcuts, [actionId]: shortcut }
        })),

      resetShortcuts: () => set({ shortcuts: DEFAULT_SHORTCUTS })
    }),
    {
      name: 'termdeck-settings'
    }
  )
)

// Initialize theme on script load
if (typeof window !== 'undefined') {
  const initialTheme = useSettingsStore.getState().theme
  applyThemeToDocument(initialTheme)

  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (useSettingsStore.getState().theme === 'system') {
      applyThemeToDocument('system')
    }
  })
}
