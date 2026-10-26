import type { I18nDict } from './ru'

export const en: I18nDict = {
  app: {
    title: 'TermDeck',
    loading: 'Loading…',
    versionPrefix: 'Version'
  },
  sidebar: {
    sessionsTitle: 'Sessions',
    searchPlaceholder: 'Search sessions or #tags…',
    newSession: 'New Session',
    newFolder: 'New Folder',
    keys: 'Keys',
    tunnels: 'Tunnels',
    settings: 'Settings',
    importExport: 'Import & Export Sessions',
    collapse: 'Collapse Sessions Sidebar (Ctrl+B)',
    noFolder: 'Unfiled'
  },
  tabs: {
    newTab: 'New Tab',
    closeTab: 'Close Tab',
    renameTab: 'Rename',
    duplicateTab: 'Duplicate',
    closeOthers: 'Close Other Tabs',
    close: 'Close',
    splitRight: 'Split Right →',
    splitDown: 'Split Down ↓',
    multiExec: 'Synchronous Input (Multi-exec)',
    disableMultiExec: 'Disable Multi-exec',
    enableMultiExec: 'Enable Multi-exec',
    snippets: 'Snippets',
    tunnels: 'Tunnels',
    toggleSftp: 'SFTP Panel (Ctrl+Shift+B)',
    toggleSidebar: 'Sessions Sidebar (Ctrl+B)',
    theme: 'Theme Mode'
  },
  sftp: {
    title: 'SFTP Explorer',
    newFolder: 'New Folder',
    upload: 'Upload file to server',
    download: 'Download to local PC',
    rename: 'Rename',
    delete: 'Delete',
    permissions: 'Change Permissions (chmod)',
    openTerminalHere: 'Open terminal here',
    editFile: 'Edit in TermDeck',
    openExternal: 'Open in external app',
    followTerminalOn: 'Terminal tracking (OSC 7) on',
    followTerminalOff: 'Follow terminal directory',
    itemsCount: 'items',
    positionToggle: 'SFTP Position (left / bottom)',
    collapse: 'Collapse SFTP Panel (Ctrl+Shift+B)'
  },
  status: {
    connected: 'Connected',
    connecting: 'Connecting…',
    disconnected: 'Disconnected',
    error: 'Connection error',
    local: 'Local'
  },
  settings: {
    title: 'Settings',
    general: 'General',
    terminal: 'Terminal',
    appearance: 'Appearance',
    shortcuts: 'Shortcuts',
    restore: 'Session Restore',
    logging: 'Logging',
    updates: 'Updates',
    language: 'Interface Language',
    languageDesc: 'Choose preferred language for TermDeck'
  },
  common: {
    save: 'Save',
    cancel: 'Cancel',
    close: 'Close',
    apply: 'Apply',
    confirm: 'Confirm',
    delete: 'Delete',
    edit: 'Edit',
    search: 'Search…',
    loading: 'Loading…',
    success: 'Success',
    error: 'Error'
  }
}
