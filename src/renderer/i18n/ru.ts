export interface I18nDict {
  app: {
    title: string
    loading: string
    versionPrefix: string
  }
  sidebar: {
    sessionsTitle: string
    searchPlaceholder: string
    newSession: string
    newFolder: string
    keys: string
    tunnels: string
    settings: string
    importExport: string
    collapse: string
    noFolder: string
  }
  tabs: {
    newTab: string
    closeTab: string
    renameTab: string
    duplicateTab: string
    closeOthers: string
    close: string
    splitRight: string
    splitDown: string
    multiExec: string
    disableMultiExec: string
    enableMultiExec: string
    snippets: string
    tunnels: string
    toggleSftp: string
    toggleSidebar: string
    theme: string
  }
  sftp: {
    title: string
    newFolder: string
    upload: string
    download: string
    rename: string
    delete: string
    permissions: string
    openTerminalHere: string
    editFile: string
    openExternal: string
    followTerminalOn: string
    followTerminalOff: string
    itemsCount: string
    positionToggle: string
    collapse: string
  }
  status: {
    connected: string
    connecting: string
    disconnected: string
    error: string
    local: string
  }
  settings: {
    title: string
    general: string
    terminal: string
    appearance: string
    shortcuts: string
    restore: string
    logging: string
    updates: string
    language: string
    languageDesc: string
  }
  common: {
    save: string
    cancel: string
    close: string
    apply: string
    confirm: string
    delete: string
    edit: string
    search: string
    loading: string
    success: string
    error: string
  }
}

export const ru: I18nDict = {
  app: {
    title: 'TermDeck',
    loading: 'Загрузка…',
    versionPrefix: 'Версия'
  },
  sidebar: {
    sessionsTitle: 'Сессии',
    searchPlaceholder: 'Поиск сессии или #тега…',
    newSession: 'Новая сессия',
    newFolder: 'Новая папка',
    keys: 'Ключи',
    tunnels: 'Туннели',
    settings: 'Настройки',
    importExport: 'Импорт и экспорт сессий',
    collapse: 'Свернуть панель сессий (Ctrl+B)',
    noFolder: 'Без папки'
  },
  tabs: {
    newTab: 'Новая вкладка',
    closeTab: 'Закрыть вкладку',
    renameTab: 'Переименовать',
    duplicateTab: 'Дублировать',
    closeOthers: 'Закрыть другие',
    close: 'Закрыть',
    splitRight: 'Разделить по горизонтали →',
    splitDown: 'Разделить по вертикали ↓',
    multiExec: 'Синхронный ввод (Multi-exec)',
    disableMultiExec: 'Отключить Multi-exec',
    enableMultiExec: 'Включить Multi-exec',
    snippets: 'Сниппеты',
    tunnels: 'Туннели',
    toggleSftp: 'Панель SFTP (Ctrl+Shift+B)',
    toggleSidebar: 'Панель сессий (Ctrl+B)',
    theme: 'Тема оформления'
  },
  sftp: {
    title: 'SFTP Проводник',
    newFolder: 'Создать новую папку',
    upload: 'Загрузить файл на сервер',
    download: 'Скачать на локальный ПК',
    rename: 'Переименовать',
    delete: 'Удалить',
    permissions: 'Изменить права (chmod)',
    openTerminalHere: 'Открыть терминал здесь',
    editFile: 'Редактировать файл в TermDeck',
    openExternal: 'Открыть во внешнем приложении',
    followTerminalOn: 'Следование (OSC 7) включено',
    followTerminalOff: 'Следование за терминалом',
    itemsCount: 'объектов',
    positionToggle: 'Положение SFTP (слева / снизу)',
    collapse: 'Свернуть панель SFTP (Ctrl+Shift+B)'
  },
  status: {
    connected: 'Подключено',
    connecting: 'Подключение…',
    disconnected: 'Отключено',
    error: 'Ошибка соединения',
    local: 'Локально'
  },
  settings: {
    title: 'Настройки',
    general: 'Основные',
    terminal: 'Терминал',
    appearance: 'Внешний вид',
    shortcuts: 'Горячие клавиши',
    restore: 'Восстановление',
    logging: 'Логирование',
    updates: 'Обновления',
    language: 'Язык интерфейса',
    languageDesc: 'Выберите предпочтительный язык для TermDeck'
  },
  common: {
    save: 'Сохранить',
    cancel: 'Отмена',
    close: 'Закрыть',
    apply: 'Применить',
    confirm: 'Подтвердить',
    delete: 'Удалить',
    edit: 'Редактировать',
    search: 'Поиск…',
    loading: 'Загрузка…',
    success: 'Успешно',
    error: 'Ошибка'
  }
}
