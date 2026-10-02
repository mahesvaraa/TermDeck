export const ru = {
  app: {
    title: 'TermDeck',
    loading: 'Загрузка…'
  },
  sidebar: {
    sessionsTitle: 'Сессии',
    searchPlaceholder: 'Поиск сессии…',
    newSession: 'Новая сессия',
    keys: 'Ключи'
  },
  tabs: {
    newTab: 'Новая вкладка',
    closeTab: 'Закрыть вкладку'
  },
  status: {
    connected: 'Подключено',
    disconnected: 'Отключено',
    local: 'Локально',
    versionPrefix: 'Версия'
  },
  placeholder: {
    contentTitle: 'Область терминала и SFTP',
    contentDescription: 'Интерфейс будет расширен на этапе 0.5'
  }
} as const

export type I18nDict = typeof ru
