import { describe, it, expect, beforeEach } from 'vitest'
import { TransferQueue } from './TransferQueue'

describe('TransferQueue', () => {
  let queue: TransferQueue

  beforeEach(() => {
    queue = new TransferQueue()
  })

  it('adds transfer task with queued status and lists by sessionId', async () => {
    const id = await queue.addTransfer({
      sessionId: 'sess-abc',
      direction: 'upload',
      localPath: '/tmp/local.txt',
      remotePath: '/var/www/remote.txt'
    })

    expect(id).toBeDefined()
    const task = queue.getTransfer(id)
    expect(task).toBeDefined()
    expect(task?.fileName).toBe('local.txt')
    expect(task?.sessionId).toBe('sess-abc')

    const sessList = queue.listTransfers('sess-abc')
    expect(sessList.some((t) => t.id === id)).toBe(true)

    const otherList = queue.listTransfers('sess-other')
    expect(otherList.some((t) => t.id === id)).toBe(false)
  })

  it('pauses, resumes and cancels a transfer', async () => {
    const id = await queue.addTransfer({
      sessionId: 'sess-abc',
      direction: 'download',
      localPath: '/tmp/dest.txt',
      remotePath: '/var/www/source.txt'
    })

    // Pause
    const paused = queue.pause(id)
    expect(paused).toBe(true)
    expect(queue.getTransfer(id)?.status).toBe('paused')

    // Resume
    const resumed = queue.resume(id)
    expect(resumed).toBe(true)
    expect(['queued', 'in_progress']).toContain(queue.getTransfer(id)?.status)

    // Cancel
    const cancelled = queue.cancel(id)
    expect(cancelled).toBe(true)
    expect(queue.getTransfer(id)?.status).toBe('cancelled')
  })

  it('retries a cancelled or failed transfer', async () => {
    const id = await queue.addTransfer({
      sessionId: 'sess-abc',
      direction: 'upload',
      localPath: '/tmp/data.csv',
      remotePath: '/remote/data.csv'
    })

    queue.cancel(id)
    expect(queue.getTransfer(id)?.status).toBe('cancelled')

    const retried = queue.retry(id)
    expect(retried).toBe(true)
    expect(['queued', 'in_progress']).toContain(queue.getTransfer(id)?.status)
  })

  it('cancels all transfers for a specific session', async () => {
    const id1 = await queue.addTransfer({
      sessionId: 'sess-to-close',
      direction: 'upload',
      localPath: '/tmp/1.txt',
      remotePath: '/1.txt'
    })

    const id2 = await queue.addTransfer({
      sessionId: 'sess-to-close',
      direction: 'download',
      localPath: '/tmp/2.txt',
      remotePath: '/2.txt'
    })

    const idOther = await queue.addTransfer({
      sessionId: 'sess-keep',
      direction: 'upload',
      localPath: '/tmp/3.txt',
      remotePath: '/3.txt'
    })

    queue.cancelSessionTransfers('sess-to-close')

    expect(queue.getTransfer(id1)?.status).toBe('cancelled')
    expect(queue.getTransfer(id2)?.status).toBe('cancelled')
    expect(queue.getTransfer(idOther)?.status).not.toBe('cancelled')
  })

  it('handles conflict resolver lifecycle correctly', async () => {
    const id = await queue.addTransfer({
      sessionId: 'sess-conflict',
      direction: 'upload',
      localPath: '/tmp/test.txt',
      remotePath: '/remote/test.txt'
    })

    // Resolving non-existent or unprompted conflict returns false gracefully
    const resolved = queue.resolveConflict(id, 'skip')
    expect(resolved).toBe(false)
  })
})
