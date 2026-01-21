import { ref, onUnmounted } from 'vue'

interface WebSocketOptions {
  url: string
  onMessage?: (data: string) => void
  onConnect?: () => void
  onDisconnect?: () => void
  onError?: (error: any) => void
}

export function useWebSocket(options: WebSocketOptions) {
  const connected = ref(false)
  const socket = ref<UniWebSocket | WebSocket | null>(null)
  const messageQueue = ref<string[]>([])
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null
  let reconnectAttempts = 0
  const MAX_RECONNECT_ATTEMPTS = 5

  const connect = () => {
    // #ifdef MP-WEIXIN
    socket.value = uni.connectSocket({
      url: options.url,
      success: () => {
        console.log('WebSocket connection successful')
        connected.value = true
        reconnectAttempts = 0
        options.onConnect?.()
      },
      fail: err => {
        console.error('WebSocket connection failed:', err)
        options.onError?.(err)
        scheduleReconnect()
      },
    })

    if (socket.value) {
      socket.value.onOpen(() => {
        while (messageQueue.value.length > 0) {
          const msg = messageQueue.value.shift()
          if (msg) {
            ;(socket.value as UniWebSocket).send({ data: msg })
          }
        }
      })

      socket.value.onMessage((res: any) => {
        options.onMessage?.(res.data as string)
      })

      socket.value.onClose(() => {
        connected.value = false
        options.onDisconnect?.()
        scheduleReconnect()
      })

      socket.value.onError((err: any) => {
        options.onError?.(err)
      })
    }
    // #endif

    // #ifdef H5
    socket.value = new WebSocket(options.url)

    socket.value.onopen = () => {
      connected.value = true
      reconnectAttempts = 0
      options.onConnect?.()
    }

    socket.value.onmessage = e => {
      options.onMessage?.(e.data)
    }

    socket.value.onclose = () => {
      connected.value = false
      options.onDisconnect?.()
      scheduleReconnect()
    }

    socket.value.onerror = e => {
      options.onError?.(e)
    }
    // #endif

    // #ifdef APP-PLUS
    socket.value = plus.webview.createWebSocket(options.url)
    // #endif
  }

  const send = (data: string) => {
    if (connected.value && socket.value) {
      // #ifdef MP-WEIXIN
      ;(socket.value as UniWebSocket)
        .send({ data })(
          // #endif
          // #ifdef H5
          socket.value as WebSocket
        )
        .send(data)
      // #endif
    } else {
      messageQueue.value.push(data)
    }
  }

  const disconnect = () => {
    if (reconnectTimer) {
      clearTimeout(reconnectTimer)
      reconnectTimer = null
    }

    if (socket.value) {
      // #ifdef MP-WEIXIN
      ;(socket.value as UniWebSocket)
        .close()(
          // #endif
          // #ifdef H5
          socket.value as WebSocket
        )
        .close()
      // #endif
      socket.value = null
    }

    connected.value = false
  }

  const scheduleReconnect = () => {
    if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
      console.error('Max reconnection attempts reached')
      return
    }

    reconnectAttempts++
    const delay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000)

    reconnectTimer = setTimeout(() => {
      connect()
    }, delay)
  }

  onUnmounted(() => {
    disconnect()
  })

  return {
    connected,
    send,
    disconnect,
    reconnect: connect,
  }
}

export type { WebSocketOptions }
