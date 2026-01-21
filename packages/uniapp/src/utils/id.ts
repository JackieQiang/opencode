export function generateId(prefix: string = 'id'): string {
  const timestamp = Date.now().toString(36)
  const random = Math.random().toString(36).substr(2, 9)
  return `${prefix}-${timestamp}-${random}`
}

export function ascendingId(prefix: string = 'id'): string {
  const counter = (globalThis as any).__idCounter__ || 0
  ;(globalThis as any).__idCounter__ = counter + 1
  return `${prefix}-${counter.toString(36)}`
}
