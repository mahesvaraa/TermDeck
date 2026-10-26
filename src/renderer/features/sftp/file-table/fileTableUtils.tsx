import {
  Folder,
  FileCode,
  FileArchive,
  FileImage,
  CornerUpRight,
  FileText
} from 'lucide-react'
import type { SftpFileItem } from '@shared/types'

export function getFileIcon(item: SftpFileItem): JSX.Element {
  if (item.type === 'directory') {
    return <Folder className="w-3.5 h-3.5 text-acc flex-none" />
  }
  if (item.type === 'symlink') {
    return <CornerUpRight className="w-3.5 h-3.5 text-ok flex-none" />
  }

  const ext = item.name.split('.').pop()?.toLowerCase() || ''
  if (['zip', 'tar', 'gz', 'bz2', 'xz', '7z', 'rar', 'tgz'].includes(ext)) {
    return <FileArchive className="w-3.5 h-3.5 text-warn flex-none" />
  }
  if (
    [
      'ts',
      'tsx',
      'js',
      'jsx',
      'json',
      'yaml',
      'yml',
      'py',
      'sh',
      'css',
      'html',
      'sql',
      'md'
    ].includes(ext)
  ) {
    return <FileCode className="w-3.5 h-3.5 text-tx flex-none" />
  }
  if (['png', 'jpg', 'jpeg', 'svg', 'gif', 'webp', 'ico'].includes(ext)) {
    return <FileImage className="w-3.5 h-3.5 text-ok flex-none" />
  }

  return <FileText className="w-3.5 h-3.5 text-mut flex-none" />
}

export function isBinaryFile(name: string): boolean {
  const binaryExtensions = new Set([
    'png',
    'jpg',
    'jpeg',
    'gif',
    'bmp',
    'webp',
    'ico',
    'tiff',
    'pdf',
    'doc',
    'docx',
    'xls',
    'xlsx',
    'ppt',
    'pptx',
    'zip',
    'tar',
    'gz',
    'bz2',
    'xz',
    '7z',
    'rar',
    'iso',
    'bin',
    'exe',
    'dll',
    'so',
    'dylib',
    'apk',
    'dmg',
    'mp3',
    'mp4',
    'avi',
    'mov',
    'mkv',
    'wav',
    'ogg',
    'flac'
  ])
  const ext = name.split('.').pop()?.toLowerCase() || ''
  return binaryExtensions.has(ext)
}
