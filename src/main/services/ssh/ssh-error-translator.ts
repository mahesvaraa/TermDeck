import { homedir } from 'node:os'

/**
 * Translates common SSH errors to user-friendly Russian messages.
 */
export function getFriendlySshErrorMessage(err: Error | string): string {
  const msg = typeof err === 'string' ? err : err.message || ''

  if (msg.includes('All configured authentication methods failed')) {
    return 'Ошибка аутентификации: неверный пароль, passphrase или приватный ключ'
  }
  if (msg.includes('Timed out') || msg.includes('ETIMEDOUT')) {
    return 'Таймаут подключения: удалённый сервер не отвечает'
  }
  if (msg.includes('ECONNREFUSED')) {
    return 'Сервер отклонил подключение (порт закрыт или SSH-сервис не запущен)'
  }
  if (msg.includes('EHOSTUNREACH') || msg.includes('ENETUNREACH')) {
    return 'Хост недоступен: проверьте сетевое подключение'
  }
  if (msg.includes('ENOTFOUND')) {
    return 'Хост не найден (ошибка разрешения доменного имени)'
  }
  if (msg.includes('Host key verification failed')) {
    return 'Проверка подлинности сервера отклонена'
  }
  return `Ошибка SSH-соединения: ${msg}`
}

export function resolveSshKeyPath(keyPath?: string): string | undefined {
  if (!keyPath) return undefined
  if (keyPath.startsWith('~')) {
    return keyPath.replace(/^~/, homedir())
  }
  return keyPath
}
