export function getFilename(path: string): string {
  if (!path) return ''
  const parts = path.split('/')
  return parts[parts.length - 1] || ''
}

export function getDirectory(path: string): string {
  if (!path) return ''
  const parts = path.split('/')
  return parts.slice(0, -1).join('/') || ''
}

export function stripFileProtocol(path: string): string {
  if (path.startsWith('file://')) {
    return path.slice(7)
  }
  return path
}

export function normalizePath(path: string): string {
  return path.replace(/\/+/g, '/').replace(/\/$/, '')
}
