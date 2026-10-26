import { describe, it, expect } from 'vitest'
import { homedir } from 'node:os'
import {
  getFriendlySshErrorMessage,
  resolveSshKeyPath
} from './ssh-error-translator'

describe('ssh-error-translator', () => {
  it('translates auth failure message', () => {
    const err = new Error('All configured authentication methods failed')
    expect(getFriendlySshErrorMessage(err)).toBe(
      'Ошибка аутентификации: неверный пароль, passphrase или приватный ключ'
    )
  })

  it('translates connection refused', () => {
    const err = new Error('connect ECONNREFUSED 192.168.1.10:22')
    expect(getFriendlySshErrorMessage(err)).toBe(
      'Сервер отклонил подключение (порт закрыт или SSH-сервис не запущен)'
    )
  })

  it('translates timeout errors', () => {
    const err = new Error('Timed out while waiting for handshake')
    expect(getFriendlySshErrorMessage(err)).toBe(
      'Таймаут подключения: удалённый сервер не отвечает'
    )
  })

  it('expands ~ in ssh key paths', () => {
    expect(resolveSshKeyPath('~/.ssh/id_ed25519')).toBe(
      `${homedir()}/.ssh/id_ed25519`
    )
    expect(resolveSshKeyPath('C:/keys/server.key')).toBe('C:/keys/server.key')
    expect(resolveSshKeyPath(undefined)).toBeUndefined()
  })
})
