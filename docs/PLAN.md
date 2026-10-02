# TermDeck — анализ, стек, архитектура и план

## 1. Анализ MobaXterm

**Берём в проект:**

| Приоритет | Функция |
|---|---|
| Must | Вкладки с терминалами (SSH, локальный shell) |
| Must | Менеджер сохранённых сессий (папки, поиск, избранное) |
| Must | SFTP-панель, которая открывается автоматически вместе с SSH-сессией |
| Must | Загрузка и скачивание файлов, drag & drop, очередь передач |
| Should | Сплит-панели (несколько терминалов в одной вкладке) |
| Should | Редактирование удалённого файла «на месте» |
| Should | SSH-туннели (port forwarding), jump host |
| Should | Менеджер ключей, проверка known_hosts |
| Could | Сниппеты, макросы, multi-exec, темы, поиск по буферу, command palette |

**Не копируем (дорого, мало пользы на старте):** встроенный X11-сервер,
Cygwin-окружение, RDP/VNC/Telnet/Serial. Можно добавить позже модулями.

## 2. Стек

Electron + TypeScript + React. Тяжелее Tauri, но для первой версии практичнее:
`ssh2` в Node.js умеет всё (shell, SFTP, exec, forwarding, jump host, agent);
нейросети хорошо знают Electron + xterm.js + ssh2; один язык на всё.

| Слой | Технология |
|---|---|
| Сборка | `electron-vite`, `electron-builder` |
| UI | React 18, Zustand, Tailwind CSS, lucide-react |
| Терминал | `@xterm/xterm` + addons: fit, webgl, search, web-links, unicode11 |
| SSH/SFTP | `ssh2` |
| Локальный shell | `@homebridge/node-pty-prebuilt-multiarch` |
| Раскладка | `react-resizable-panels` |
| Списки файлов | `@tanstack/react-virtual` |
| Хранение | `electron-store`, `safeStorage` для паролей и passphrase |
| Редактор файлов | Monaco Editor |
| Тесты | Vitest (юнит), Playwright (e2e) |

Альтернатива при требовании малого размера: Tauri 2 + Rust (`russh`, `portable-pty`).
Тогда схема сохранится, но промпты нужно переписать под Rust.

## 3. Архитектура

```
src/
  main/                  # Node-процесс: сеть, ФС
    index.ts
    ipc/                 # регистрация хендлеров, registerHandler(channel, zod, fn)
    services/
      ssh/               # SshConnectionManager, ShellChannel, Tunnel
      sftp/              # SftpService, TransferQueue
      pty/               # LocalPtyService
      sessions/          # SessionStore
      secrets/           # обёртка над safeStorage
      knownHosts/
  preload/index.ts       # contextBridge: узкое типизированное API
  renderer/              # React UI (без доступа к Node)
    app/ features/{terminal,tabs,sessions,sftp,editor,tunnels,settings}/
    stores/ components/ styles/ i18n/ mocks/
  shared/                # типы, имена IPC-каналов, zod-схемы
```

Принципы:
1. `contextIsolation: true`, `nodeIntegration: false`, `sandbox: true`.
2. Все IPC-вызовы типизированы контрактом из `shared/`, входные данные валидируются zod.
3. Одно SSH-соединение переиспользуется: shell, SFTP и туннели — каналы одного клиента.
4. Поток данных терминала батчится (8–16 мс) и использует backpressure.
5. Секреты никогда не лежат в открытом виде в JSON.
6. Состояние UI (путь SFTP, выбор, передачи, сплиты) хранится на вкладку.

## 4. План по этапам

| # | Этап | Критерий приёмки |
|---|---|---|
| 0 | Каркас | Окно запускается, типизированный IPC, линтер, сборка |
| 0.5 | UI-каркас по прототипу | Интерфейс совпадает с прототипом, все состояния на ui-gallery, данные моковые |
| 1 | Локальный терминал + вкладки | Вкладки, resize, copy/paste, работают vim/htop |
| 2 | SSH + менеджер сессий | Подключение по паролю/ключу, дерево сессий, host key prompt |
| 3 | SFTP-панель | Навигация, upload/download, очередь с прогрессом |
| 4 | Интеграция терминал ↔ SFTP, сплиты | SFTP следует за `cd` (OSC 7), деление панелей |
| 5 | Редактор удалённых файлов | Двойной клик → Monaco → Ctrl+S → файл обновлён |
| 6 | Туннели, jump host, ключи | Local/Remote/Dynamic forwarding, ProxyJump, менеджер ключей |
| 7 | Удобства | Палитра, сниппеты, multi-exec, поиск, темы, горячие клавиши |
| 8 | Упаковка и качество | Установщики, автообновление, e2e, CI |

Этапы 0–3 дают рабочий MVP.

## 5. Подводные камни

- **Синхронизация SFTP с `cd`.** Надёжный способ: инжектировать `PROMPT_COMMAND`/`precmd`,
  печатающий OSC 7 с текущим путём; xterm.js парсит через `registerOscHandler`.
  Запасной вариант: кнопка «перейти в папку терминала».
- **Host key verification.** Нельзя молча принимать ключи: диалог с fingerprint и known_hosts.
- **Keepalive и переподключение.** `keepaliveInterval`, статус вкладки, кнопка reconnect.
- **Большие каталоги и файлы.** Виртуализация списка, потоки вместо чтения в память.
- **Кодировки и ресайз.** UTF-8 по умолчанию; размеры PTY передавать при каждом `fit()`.
- **Нативные модули.** Prebuilt-форк `node-pty` плюс `asarUnpack` в electron-builder.
- **Упрощения прототипа.** В прототипе состояние глобальное, нет drag & drop, контекстных
  меню, множественного выбора; данные жёстко заданы; есть мобильный адаптив. В приложении
  состояние на вкладку, всё перечисленное реализуется по этапам, адаптив заменён
  минимальным размером окна (900 px).
