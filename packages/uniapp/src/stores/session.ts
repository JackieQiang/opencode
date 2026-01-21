import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export interface Message {
  id: string
  sessionID: string
  role: 'user' | 'assistant' | 'system'
  time: {
    created: number
  }
  agent?: string
  model?: {
    id: string
    provider: {
      id: string
    }
  }
  content?: string
}

export interface Session {
  id: string
  title?: string
  revert?: {
    messageID: string
  }
  share?: {
    url: string
  }
  summary?: {
    files: number
  }
}

export interface SessionState {
  sessions: Map<string, Session>
  messages: Map<string, Message[]>
  currentSessionId: string | null
}

export const useSessionStore = defineStore(
  'session',
  () => {
    const sessions = ref<Map<string, Session>>(new Map())
    const messages = ref<Map<string, Message[]>>(new Map())
    const currentSessionId = ref<string | null>(null)

    const currentSession = computed(() => {
      if (!currentSessionId.value) return null
      return sessions.value.get(currentSessionId.value) || null
    })

    const currentMessages = computed(() => {
      if (!currentSessionId.value) return []
      return messages.value.get(currentSessionId.value) || []
    })

    const setCurrentSession = (id: string | null) => {
      currentSessionId.value = id
    }

    const addSession = (session: Session) => {
      sessions.value.set(session.id, session)
      saveSessions()
    }

    const updateSession = (id: string, updates: Partial<Session>) => {
      const session = sessions.value.get(id)
      if (session) {
        sessions.value.set(id, { ...session, ...updates })
        saveSessions()
      }
    }

    const removeSession = (id: string) => {
      sessions.value.delete(id)
      messages.value.delete(id)
      saveSessions()
    }

    const addMessage = (sessionId: string, message: Message) => {
      const sessionMessages = messages.value.get(sessionId) || []
      sessionMessages.push(message)
      messages.value.set(sessionId, sessionMessages)
      saveMessages()
    }

    const setMessages = (sessionId: string, msgs: Message[]) => {
      messages.value.set(sessionId, msgs)
      saveMessages()
    }

    const clearMessages = (sessionId: string) => {
      messages.value.delete(sessionId)
      saveMessages()
    }

    const saveSessions = () => {
      const obj = Object.fromEntries(sessions.value)
      uni.setStorageSync('sessions', obj)
    }

    const loadSessions = () => {
      const obj = uni.getStorageSync('sessions') as Record<string, Session> | undefined
      if (obj) {
        sessions.value = new Map(Object.entries(obj))
      }
    }

    const saveMessages = () => {
      const obj = Object.fromEntries(messages.value)
      uni.setStorageSync('session-messages', obj)
    }

    const loadMessages = () => {
      const obj = uni.getStorageSync('session-messages') as Record<string, Message[]> | undefined
      if (obj) {
        messages.value = new Map(Object.entries(obj))
      }
    }

    const init = () => {
      loadSessions()
      loadMessages()
    }

    return {
      sessions,
      messages,
      currentSessionId,
      currentSession,
      currentMessages,
      setCurrentSession,
      addSession,
      updateSession,
      removeSession,
      addMessage,
      setMessages,
      clearMessages,
      init,
    }
  },
  {
    persist: false,
  }
)
