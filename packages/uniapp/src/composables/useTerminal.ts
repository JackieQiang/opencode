import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useWebSocket } from './useWebSocket'
import { useTerminalStore } from '@/stores/terminal'
import { useGlobalStore } from '@/stores/global'

export function useTerminal() {
  const terminalStore = useTerminalStore()
  const globalStore = useGlobalStore()
  const currentOutput = ref<string[]>([])
  const currentInput = ref('')
  const history = ref<string[]>([])
  const historyIndex = ref(-1)
  const connected = ref(false)

  const ptyId = computed(() => terminalStore.activeTerminal?.id)

  const {
    connected: wsConnected,
    send,
    disconnect,
  } = useWebSocket({
    url: computed(() =>
      ptyId.value
        ? `${globalStore.serverUrl}/pty/${ptyId.value}/connect?directory=${encodeURIComponent(globalStore.directory)}`
        : ''
    ),
    onMessage: data => {
      currentOutput.value.push(data)
      if (ptyId.value) {
        terminalStore.addOutput(ptyId.value, data)
      }
    },
    onConnect: () => {
      connected.value = true
    },
    onDisconnect: () => {
      connected.value = false
    },
    onError: err => {
      console.error('Terminal WebSocket error:', err)
    },
  })

  const init = async () => {
    if (!terminalStore.terminals.length) {
      await terminalStore.createTerminal()
    }
    if (ptyId.value) {
      currentOutput.value = terminalStore.getOutput(ptyId.value)
      currentInput.value = terminalStore.terminalInput.get(ptyId.value) || ''
    }
  }

  const submitCommand = (command: string) => {
    if (!connected.value || !command.trim()) return

    send(command + '\r')

    history.value.unshift(command)
    historyIndex.value = -1
    currentInput.value = ''

    if (ptyId.value) {
      terminalStore.setInput(ptyId.value, '')
    }
  }

  const navigateHistory = (direction: 'up' | 'down') => {
    if (direction === 'up' && historyIndex.value < history.value.length - 1) {
      historyIndex.value++
      currentInput.value = history.value[historyIndex.value]
    } else if (direction === 'down' && historyIndex.value > 0) {
      historyIndex.value--
      currentInput.value = history.value[historyIndex.value]
    } else if (direction === 'down' && historyIndex.value === 0) {
      historyIndex.value = -1
      currentInput.value = ''
    }
  }

  const clear = () => {
    currentOutput.value = []
    if (ptyId.value) {
      terminalStore.clearOutput(ptyId.value)
    }
  }

  const updateInput = (value: string) => {
    currentInput.value = value
    if (ptyId.value) {
      terminalStore.setInput(ptyId.value, value)
    }
  }

  return {
    terminals: terminalStore.terminals,
    activeTerminal: terminalStore.activeTerminal,
    currentOutput,
    currentInput,
    history,
    historyIndex,
    connected,
    init,
    submitCommand,
    navigateHistory,
    clear,
    updateInput,
  }
}

export type Terminal = ReturnType<typeof useTerminal>
