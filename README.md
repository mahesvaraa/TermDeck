# TermDeck

<p align="center">
  <strong>Современный кроссплатформенный SSH/SFTP-клиент для разработчиков и системных администраторов</strong><br>
  Быстрый, легковесный и удобный инструмент в духе MobaXterm, созданный на современном стеке.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Platform-Windows%20%7C%20Linux%20%7C%20macOS-blue?style=flat-square" alt="Platform" />
  <img src="https://img.shields.io/badge/Electron-33-47848F?style=flat-square&logo=electron" alt="Electron" />
  <img src="https://img.shields.io/badge/React-18-61DAFB?style=flat-square&logo=react" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-Strict-3178C6?style=flat-square&logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/TailwindCSS-3.4-38B2AC?style=flat-square&logo=tailwind-css" alt="Tailwind CSS" />
  <img src="https://img.shields.io/badge/License-MIT-green?style=flat-square" alt="License" />
</p>

---

## ⚡ Особенности

### 💻 Продвинутый терминал
- **Высокая производительность:** ядро на `@xterm/xterm` 5.5 с поддержкой аппаратного ускорения WebGL, Unicode 11 и кликабельных ссылок.
- **Поддержка цветов и стилей:** полноценный Truecolor (`TERM=xterm-256color`), цветные подсказки для Linux/Unix (`bash`, `zsh`) и Windows (`PowerShell` с `PSReadLine`).
- **Сплиты терминала:** разделение экрана по горизонтали (вправо →) и вертикали (вниз ↓) в рамках одной вкладки.
- **Multi-exec:** синхронный ввод команд одновременно во все сплиты активной вкладки.
- **Поиск по буферу:** встроенный полнотекстовый поиск (`Ctrl+Shift+F`) с поддержкой регулярных выражений, регистра и целых слов.

### 📁 Интегрированный SFTP-проводник
- **Синхронизация OSC 7:** SFTP-панель автоматически следует за переходами каталогов в терминале (`cd /var/log` → переход в SFTP).
- **Виртуализированный список:** плавная работа с каталогами на десятки тысяч файлов (`@tanstack/react-virtual`).
- **Drag-and-Drop:** перетаскивание файлов и папок напрямую из проводника операционной системы с дедупликацией очередей.
- **Очередь передач:** наглядный прогресс, пауза, возобновление, повтор при ошибках и гибкое разрешение конфликтов имён.
- **Гибкая компоновка:** расположение SFTP слева или снизу от терминала, сворачивание в 1 клик и умное автоскрытие для локальных вкладок.

### 📑 Менеджер сессий и организация
- **Информативные двухстрочные ячейки:** имя сессии, хост/IP, порт, статусная точка и бейджи тегов без урезания текста.
- **Иерархические папки:** группировка серверов по проектам и окружениям с контекстным меню.
- **Тегирование:** быстрый поиск серверов по тегам (`#prod`, `#db`, `#staging`) в боковой панели и палитре команд.
- **Bastion / Jump Host:** прозрачное проксирование SSH через промежуточные шлюзы.
- **Сворачиваемый сайдбар:** мгновенное скрытие боковой панели (`Ctrl+B`) для освобождения рабочего пространства.

### 📝 Встроенный редактор удалённых файлов
- **Редактирование на лету:** открытие файлов прямо из SFTP по двойному клику в Monaco Editor (ядро VS Code).
- **Подсветка синтаксиса:** поддержка Shell, Python, TypeScript/JavaScript, JSON, YAML, SQL, Dockerfile, Markdown, Nginx/INI и др.
- **Безопасное сохранение:** сохранение по `Ctrl+S` с проверкой времени изменения (`mtime`) и предупреждением о конфликтах перезаписи.
- **Умное определение:** бинарные файлы автоматически открываются в системных приложениях ОС.

### 🌐 SSH-туннелирование (Port Forwarding)
- **Все типы туннелей:** локальные (`-L`), удалённые (`-R`) и динамические SOCKS5-прокси (`-D`).
- **Живая статистика:** статус соединения, счётчик активных клиентов, скорость и объём переданных данных в реальном времени.

### 🔑 Менеджер SSH-ключей
- **Поддержка алгоритмов:** Ed25519, RSA, ECDSA.
- **Встроенная генерация:** создание новых пар ключей прямо в приложении с заданным размером и комментарием.
- **Безопасный экспорт:** быстрый просмотр и копирование публичного ключа для авторизации на серверах.

### ⚡ Сниппеты и быстрые команды
- **Шаблоны команд:** быстрый запуск типовых сценариев из верхнего тулбара или контекстного меню вкладки.
- **Интерактивные параметры:** поддержка переменных вида `{{host}}`, `{{port}}`, `{{service}}` с удобным окном заполнения перед выполнением.
- **Опция прямого запуска:** возможность вставить команду в терминал или выполнить её немедленно (`▶`).

### 🎨 Кастомизация и темы
- **6 встроенных палитр терминала:** TermDeck Dark, Dracula, Solarized Dark, Nord, One Dark, GitHub Light.
- **Импорт тем:** поддержка цветовых схем в формате Windows Terminal JSON и iTerm2 `.itermcolors`.
- **Настройка шрифтов:** регулировка семейства шрифта (JetBrains Mono / IBM Plex Sans), кегля, межстрочного интервала, стиля курсора и размера scrollback-буфера.

### 🔒 Безопасность
- **Шифрование секретов:** пароли и кодовые фразы ключей шифруются аппаратным хранилищем ОС (`safeStorage`: DPAPI на Windows, Keychain на macOS, Secret Service на Linux).
- **Песочница Electron:** строгая изоляция (`contextIsolation=true`, `nodeIntegration=false`, `sandbox=true`).
- **Офлайн CSP:** полный запрет внешних сетевых запросов — все шрифты и зависимости упакованы локально.
- **Контроль Host Keys:** строгая проверка `known_hosts` с предупреждением при первом подключении или несовпадении отпечатка хоста.

---

## ⌨️ Горячие клавиши

| Сочетание клавиш | Действие |
|---|---|
| `Ctrl + T` | Открыть новый локальный терминал |
| `Ctrl + W` | Закрыть текущую вкладку |
| `Ctrl + Tab` / `Ctrl + Shift + Tab` | Переключение между вкладками (вперёд / назад) |
| `Ctrl + 1` .. `Ctrl + 9` | Переход к вкладке по номеру |
| `Ctrl + P` / `Ctrl + Shift + P` | Открыть палитру команд (Command Palette) |
| `Ctrl + B` | Свернуть / развернуть боковую панель сессий |
| `Ctrl + Shift + B` | Скрыть / показать панель SFTP |
| `Ctrl + Shift + F` | Поиск текста в текущем буфере терминала |
| `Ctrl + Shift + T` | Открыть менеджер SSH-туннелей |
| `Ctrl + Shift + K` | Открыть менеджер SSH-ключей |
| `Alt + Стрелки` | Навигация фокуса между сплит-окнами терминала |
| `Ctrl + S` | Сохранить файл в удалённом редакторе |

---

## 🛠 Технологический стек

- **Платформа:** [Electron 33](https://www.electronjs.org/) + [electron-vite](https://electron-vite.org/)
- **Язык:** [TypeScript](https://www.typescriptlang.org/) (Strict mode, нулевая терпимость к `any`)
- **Интерфейс:** [React 18](https://react.dev/), [Tailwind CSS 3.4](https://tailwindcss.com/), [lucide-react](https://lucide.dev/)
- **Управление состоянием:** [Zustand 5](https://zustand-demo.pmnd.rs/)
- **Терминал:** [@xterm/xterm 5.5](https://xtermjs.org/) (addon-fit, addon-webgl, addon-search, addon-web-links)
- **SSH/SFTP:** [ssh2](https://github.com/mscdex/ssh2), [@homebridge/node-pty-prebuilt-multiarch](https://github.com/homebridge/node-pty-prebuilt-multiarch)
- **Редактор:** [Monaco Editor](https://microsoft.github.io/monaco-editor/) (локальный бандл языков и воркеров)
- **Валидация и контракты:** [Zod](https://zod.dev/)
- **Тестирование:** [Vitest](https://vitest.dev/) (интеграционные тесты с mock SSH-сервером, стресс-тесты)

---

## 🚀 Установка и запуск

### Требования
- **Node.js** >= 20.x
- **npm** >= 10.x
- Для Windows: установленные инструменты сборки C++ (`windows-build-tools` или Visual Studio Build Tools для `node-pty`)

### Клонирование и установка зависимостей

```bash
git clone https://github.com/your-username/termdeck.git
cd termdeck
npm install
```

### Запуск в режиме разработки

```bash
npm run dev
```

### Проверка качества кода и тесты

```bash
# Проверка типов TypeScript (node + web)
npm run typecheck

# Проверка линтером ESLint
npm run lint

# Запуск полного набора тестов Vitest
npm test
```

---

## 📦 Сборка дистрибутивов

TermDeck собирается с помощью `electron-builder` в переносимые установщики и портативные версии:

```bash
# Сборка под текущую операционную систему
npm run dist

# Сборка для Windows (NSIS Installer + Portable .exe)
npm run dist:win

# Сборка для Linux (AppImage + .deb)
npm run dist:linux

# Сборка для macOS (DMG + .zip)
npm run dist:mac
```

Готовые пакеты формируются в каталоге `dist/`:
- `TermDeck Setup 0.1.0.exe` — установщик для Windows
- `TermDeck 0.1.0.exe` — портативная (standalone) версия для Windows
- `win-unpacked/` — распакованная готовая сборка

---

## 📁 Структура проекта

```
termdeck/
├── src/
│   ├── main/                   # Главный процесс Node.js (Electron)
│   │   ├── services/           # SSH, SFTP, PTY, Tunnels, Keys, Sessions
│   │   ├── ipc/                # Валидация и обработчики IPC каналов
│   │   └── index.ts            # Точка входа основного процесса
│   ├── preload/                # Изолированный contextBridge мост
│   │   └── index.ts            # Строго типизированный window.api
│   ├── renderer/               # Рендерер (React 18 + Tailwind)
│   │   ├── app/                # Корневой компонент App, StatusBar
│   │   ├── features/           # Модули: terminal, sftp, sessions, tabs,
│   │   │                       # editor, tunnels, keys, snippets, commands
│   │   ├── stores/             # Zustand хранилища состояния
│   │   ├── styles/             # CSS токены темы, шрифты
│   │   └── utils/              # Хелперы (OSC 7, split tree, темы)
│   └── shared/                 # Общие типы, IPC-контракты, Zod-схемы
├── docs/                       # Спецификации, прототипы и документация
├── electron-builder.yml        # Конфигурация сборщика дистрибутивов
└── package.json
```

---

## 📄 Лицензия

Проект распространяется под лицензией **MIT**. Подробности в файле [LICENSE](LICENSE).
