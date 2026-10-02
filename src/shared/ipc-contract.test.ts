import { describe, it, expect } from 'vitest'
import { IpcInvokeContracts } from './ipc-contract'

describe('IPC Invoke Contracts', () => {
  describe('app:getVersion', () => {
    it('validates a correct getVersion response', () => {
      const contract = IpcInvokeContracts['app:getVersion']
      const validData = {
        version: '0.1.0',
        name: 'termdeck'
      }

      const result = contract.output.safeParse(validData)
      expect(result.success).toBe(true)
      if (result.success) {
        expect(result.data.version).toBe('0.1.0')
        expect(result.data.name).toBe('termdeck')
      }
    })

    it('rejects an invalid getVersion response missing required properties', () => {
      const contract = IpcInvokeContracts['app:getVersion']
      const invalidData = {
        version: '0.1.0'
        // name is missing
      }

      const result = contract.output.safeParse(invalidData)
      expect(result.success).toBe(false)
    })

    it('accepts undefined/void as valid input', () => {
      const contract = IpcInvokeContracts['app:getVersion']
      const result = contract.input.safeParse(undefined)
      expect(result.success).toBe(true)
    })
  })
})
