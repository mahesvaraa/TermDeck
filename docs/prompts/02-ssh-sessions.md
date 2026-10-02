# Этап 2: SSH и менеджер сессий

Прочитай `CLAUDE.md` и `docs/UI-SPEC.md`. Дерево сессий и индикаторы статуса уже
вёрстаны: замени моки в `useSessions` реальным IPC. Диалог «Новая сессия» делай в стиле
прототипа (панели, границы `--line`, primary-кнопка `--acc`).

ЗАДАЧА: SSH-подключения и менеджер сохранённых сессий.

СДЕЛАТЬ:
1. `shared/types`: `SessionConfig { id, name, folderId?, host, port, username,
   auth: 'password' | 'key' | 'agent', keyPath?, color?, tags?, startupCommand?,
   keepaliveSec, encoding }`.
2. `main/services/secrets`: обёртка над safeStorage (encrypt/decrypt строк).
   Пароли и passphrase хранить отдельно от SessionConfig, под ключом sessionId.
   Если safeStorage недоступен — спрашивать пароль при каждом подключении, не писать на диск.
3. `main/services/sessions/SessionStore` (electron-store): CRUD сессий и папок.
4. `main/services/ssh/SshConnectionManager`:
   - `connect(sessionId)` → создаёт ssh2 Client, возвращает connectionId
   - password, privateKey (+passphrase), ssh-agent
   - keepaliveInterval, readyTimeout, состояния connecting/ready/closed/error
   - `openShell(connectionId, {cols, rows})` → ShellChannel с тем же интерфейсом, что
     у LocalPty (write/resize/close/data)
   - одно соединение — несколько shell-каналов (счётчик ссылок; закрывается, когда
     закрыт последний потребитель)
5. Проверка host key: `hostVerifier` сравнивает fingerprint с known_hosts приложения.
   Новый хост → диалог с fingerprint (SHA256): «Доверять один раз / Сохранить / Отмена».
   Изменённый ключ → красное предупреждение, подключение блокируется по умолчанию.
6. UI: боковая панель «Сессии» с деревом (папки, drag & drop, поиск, избранное);
   диалог создания/редактирования; двойной клик → новая вкладка с SSH-терминалом.
   Статус вкладки (подключение/ок/разрыв) индикатором; при разрыве — баннер «Переподключиться».
7. Ошибки (неверный пароль, таймаут, host unreachable) показывать понятным текстом.

КРИТЕРИИ ПРИЁМКИ:
- Подключение к реальному серверу по паролю и по ключу.
- Пароль не лежит в открытом виде в файле конфигурации (проверить вручную).
- Две вкладки к одной сессии используют одно соединение.
- При обрыве сети вкладка показывает статус и позволяет переподключиться.
- Юнит-тесты на SessionStore и логику known_hosts (с мок-клиентом).
