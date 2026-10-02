# Этап 1: локальный терминал и вкладки

Прочитай `CLAUDE.md` и `docs/UI-SPEC.md`. Вёрстка вкладок и ActionBar уже есть
(этап 0.5): подключи к ним реальную логику, не переписывая её. Цвета xterm берутся из
токенов `--term`/`--termtx`, ANSI-палитра задаётся в отдельном файле темы.

ЗАДАЧА: локальный терминал и система вкладок.

СДЕЛАТЬ:
1. `main/services/pty/LocalPtyService`: создание pty (shell по умолчанию:
   PowerShell/pwsh на Windows, `$SHELL` на Unix), write, resize, kill, события data/exit.
   Хранить `Map<terminalId, pty>`. Батчить исходящие данные (8–16 мс) перед отправкой.
2. IPC-контракт: `term:create`, `term:write`, `term:resize`, `term:close` + события
   `term:data`, `term:exit`.
3. Renderer: `<TerminalView terminalId>` на xterm.js с fit, webgl (fallback на
   canvas/DOM при ошибке), search, web-links, unicode11. ResizeObserver → fit() → `term:resize`.
4. Zustand-стор вкладок: `tabs[]`, `activeTabId`; действия: open, close, rename,
   reorder (drag & drop), duplicate. Вкладка хранит тип ('local' | 'ssh'), заголовок, id терминала.
5. Вкладки: кнопка «+», закрытие по крестику и средней кнопкой мыши, контекстное
   меню (переименовать, дублировать, закрыть другие), Ctrl+T / Ctrl+W / Ctrl+Tab.
6. Копирование: Ctrl+Shift+C / выделение + ПКМ; вставка: Ctrl+Shift+V / ПКМ.
   Копирование при выделении — опция в настройках (по умолчанию выкл).
7. Неактивные вкладки не уничтожают xterm-инстанс (буфер сохраняется), но не рендерят.

КРИТЕРИИ ПРИЁМКИ:
- Можно открыть 5+ вкладок, в каждой своя сессия; переключение не теряет вывод.
- Работают vim, htop/top, nano, цвета, resize окна без артефактов.
- `cat` большого файла (50+ МБ) не вешает UI.
- Закрытие вкладки убивает процесс; закрытие окна убивает все процессы; утечек listeners нет.
- Unit-тесты на стор вкладок.
