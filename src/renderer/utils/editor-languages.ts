/**
 * Map file name or path to a supported Monaco editor language id.
 */
export function getLanguageFromPath(filePath: string): string {
  const fileName = filePath.split('/').filter(Boolean).pop()?.toLowerCase() || ''

  if (fileName === 'dockerfile') return 'dockerfile'
  if (fileName.includes('nginx') && fileName.endsWith('.conf')) return 'ini'
  if (fileName.startsWith('.env')) return 'ini'

  const ext = fileName.includes('.') ? fileName.slice(fileName.lastIndexOf('.')).toLowerCase() : ''

  switch (ext) {
    case '.js':
    case '.mjs':
    case '.cjs':
    case '.jsx':
      return 'javascript'
    case '.ts':
    case '.mts':
    case '.cts':
    case '.tsx':
      return 'typescript'
    case '.json':
    case '.jsonc':
      return 'json'
    case '.html':
    case '.htm':
      return 'html'
    case '.css':
      return 'css'
    case '.scss':
    case '.sass':
      return 'scss'
    case '.less':
      return 'less'
    case '.py':
      return 'python'
    case '.sh':
    case '.bash':
    case '.zsh':
      return 'shell'
    case '.yaml':
    case '.yml':
      return 'yaml'
    case '.md':
    case '.markdown':
      return 'markdown'
    case '.sql':
      return 'sql'
    case '.xml':
    case '.svg':
      return 'xml'
    case '.ini':
    case '.conf':
    case '.cfg':
      return 'ini'
    case '.c':
    case '.h':
      return 'c'
    case '.cpp':
    case '.hpp':
    case '.cc':
      return 'cpp'
    case '.go':
      return 'go'
    case '.rs':
      return 'rust'
    case '.php':
      return 'php'
    case '.java':
      return 'java'
    default:
      return 'plaintext'
  }
}
