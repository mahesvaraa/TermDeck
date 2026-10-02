import { describe, it, expect } from 'vitest'
import { extractSnippetVariables, interpolateSnippet } from './snippets'

describe('snippets utils', () => {
  describe('extractSnippetVariables', () => {
    it('returns empty array when there are no variables', () => {
      expect(extractSnippetVariables('docker ps -a')).toEqual([])
    })

    it('extracts single variable', () => {
      expect(extractSnippetVariables('tail -f {{logfile}}')).toEqual(['logfile'])
    })

    it('extracts multiple unique variables with dashes and underscores', () => {
      const template = 'docker logs -f --tail={{tail_lines}} {{container-name}}'
      const vars = extractSnippetVariables(template)
      expect(vars).toEqual(['tail_lines', 'container-name'])
    })

    it('deduplicates identical variables', () => {
      const template = 'cp {{file}} {{file}}.bak'
      expect(extractSnippetVariables(template)).toEqual(['file'])
    })
  })

  describe('interpolateSnippet', () => {
    it('replaces single variable', () => {
      const result = interpolateSnippet('cat {{file}}', { file: '/etc/hosts' })
      expect(result).toBe('cat /etc/hosts')
    })

    it('replaces multiple occurrences and distinct variables', () => {
      const result = interpolateSnippet('docker run -d --name {{name}} {{image}}:{{tag}}', {
        name: 'my-redis',
        image: 'redis',
        tag: 'alpine'
      })
      expect(result).toBe('docker run -d --name my-redis redis:alpine')
    })

    it('preserves placeholder if value is not provided', () => {
      const result = interpolateSnippet('ping {{host}} -c {{count}}', {
        host: '127.0.0.1'
      })
      expect(result).toBe('ping 127.0.0.1 -c {{count}}')
    })
  })
})
