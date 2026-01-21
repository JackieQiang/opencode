import { ref } from 'vue'

interface Toast {
  id: string
  title: string
  description?: string
  type: 'success' | 'error' | 'warning' | 'info'
  duration: number
}

interface Notification {
  id: string
  title: string
  description?: string
  type: 'permission' | 'question' | 'responseReady' | 'error'
  sessionId?: string
  projectName?: string
  timestamp: number
  read: boolean
}

export const useNotificationStore = defineStore('notification', () => {
  const toasts = ref<Toast[]>([])
  const notifications = ref<Notification[]>([])

  const showToast = (options: Omit<Toast, 'id'>) => {
    const id = `toast-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    const toast: Toast = {
      ...options,
      id,
      type: options.type || 'info',
      duration: options.duration || 3000,
    }
    toasts.value.push(toast)

    setTimeout(() => {
      removeToast(id)
    }, toast.duration)

    return id
  }

  const removeToast = (id: string) => {
    const index = toasts.value.findIndex(t => t.id === id)
    if (index > -1) {
      toasts.value.splice(index, 1)
    }
  }

  const success = (title: string, description?: string) => {
    return showToast({ title, description, type: 'success' })
  }

  const error = (title: string, description?: string) => {
    return showToast({ title, description, type: 'error', duration: 5000 })
  }

  const warning = (title: string, description?: string) => {
    return showToast({ title, description, type: 'warning' })
  }

  const info = (title: string, description?: string) => {
    return showToast({ title, description, type: 'info' })
  }

  const addNotification = (notification: Omit<Notification, 'id' | 'timestamp' | 'read'>) => {
    const id = `notif-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
    notifications.value.unshift({
      ...notification,
      id,
      timestamp: Date.now(),
      read: false,
    })
  }

  const markAsRead = (id: string) => {
    const notif = notifications.value.find(n => n.id === id)
    if (notif) {
      notif.read = true
    }
  }

  const markAllAsRead = () => {
    notifications.value.forEach(n => (n.read = true))
  }

  const clearNotifications = () => {
    notifications.value = []
  }

  const unreadCount = () => {
    return notifications.value.filter(n => !n.read).length
  }

  return {
    toasts,
    notifications,
    showToast,
    removeToast,
    success,
    error,
    warning,
    info,
    addNotification,
    markAsRead,
    markAllAsRead,
    clearNotifications,
    unreadCount,
  }
})
