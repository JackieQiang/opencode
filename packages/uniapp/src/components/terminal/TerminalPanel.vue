<template>
  <view class="terminal-panel">
    <view class="terminal-header">
      <view class="terminal-tabs">
        <scroll-view class="tabs-scroll" :scroll-x="true" :show-scrollbar="false">
          <view
            v-for="terminal in terminals"
            :key="terminal.id"
            class="terminal-tab"
            :class="{ active: terminal.id === activeTerminal?.id }"
            @click="selectTerminal(terminal.id)"
          >
            <text class="tab-title">{{ terminal.title }}</text>
            <view class="close-btn" @click.stop="closeTerminal(terminal.id)">×</view>
          </view>
        </scroll-view>
      </view>
      <view class="terminal-actions">
        <view class="action-btn" @click="createTerminal">
          <text>+</text>
        </view>
      </view>
    </view>

    <view class="terminal-content">
      <scroll-view
        ref="scrollRef"
        class="terminal-output"
        :scroll-y="true"
        :scroll-into-view="scrollToView"
        :scroll-with-animation="true"
      >
        <view class="output-content">
          <view
            v-for="(line, index) in currentOutput"
            :key="index"
            :id="'line-' + index"
            class="output-line"
          >
            <text class="line-text">{{ line }}</text>
          </view>
        </view>
      </scroll-view>

      <view class="terminal-input-area">
        <text class="prompt-char">$</text>
        <input
          v-model="inputValue"
          class="terminal-input"
          type="text"
          :placeholder="t('prompt.placeholder.shell')"
          confirm-type="send"
          @confirm="submitCommand"
          @keydown="handleKeydown"
        />
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick, onMounted } from 'vue'
import { useI18n } from '@/composables/useLanguage'
import { useTerminalStore } from '@/stores/terminal'
import { useTerminal } from '@/composables/useTerminal'
import { useAutoScroll } from '@/composables/useAutoScroll'

const { t } = useI18n()
const terminalStore = useTerminalStore()
const terminalComposable = useTerminal()

const scrollRef = ref<any>(null)
const inputValue = ref('')
const scrollToView = ref('')

const terminals = computed(() => terminalStore.terminals)
const activeTerminal = computed(() => terminalStore.activeTerminal)
const currentOutput = computed(() => terminalComposable.currentOutput.value)
const connected = computed(() => terminalComposable.connected.value)
const history = computed(() => terminalComposable.history.value)
const historyIndex = computed(() => terminalComposable.historyIndex.value)

const autoScroll = useAutoScroll({
  working: () => true,
})

onMounted(() => {
  terminalComposable.init()
})

watch(
  currentOutput,
  () => {
    nextTick(() => {
      if (currentOutput.value.length > 0) {
        scrollToView.value = `line-${currentOutput.value.length - 1}`
      }
    })
  },
  { deep: true }
)

const selectTerminal = (id: string) => {
  terminalStore.setActiveTerminal(id)
  terminalComposable.init()
}

const closeTerminal = async (id: string) => {
  await terminalStore.closeTerminal(id)
}

const createTerminal = async () => {
  await terminalComposable.init()
  await terminalStore.createTerminal()
  await terminalComposable.init()
}

const submitCommand = () => {
  if (!inputValue.value.trim() || !connected.value) return

  terminalComposable.submitCommand(inputValue.value)
  inputValue.value = ''
}

const handleKeydown = (e: any) => {
  if (e.key === 'ArrowUp') {
    e.preventDefault()
    terminalComposable.navigateHistory('up')
    inputValue.value = terminalComposable.currentInput.value
  } else if (e.key === 'ArrowDown') {
    e.preventDefault()
    terminalComposable.navigateHistory('down')
    inputValue.value = terminalComposable.currentInput.value
  }
}
</script>

<style lang="scss" scoped>
.terminal-panel {
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: var(--background-base);
}

.terminal-header {
  display: flex;
  align-items: center;
  background-color: var(--background-stronger);
  border-bottom: 1px solid var(--border-base);
  height: 40px;
}

.terminal-tabs {
  flex: 1;
  overflow: hidden;
}

.tabs-scroll {
  white-space: nowrap;
  height: 40px;
}

.terminal-tab {
  display: inline-flex;
  align-items: center;
  padding: 0 12px;
  height: 40px;
  background-color: transparent;
  border-bottom: 2px solid transparent;
  white-space: nowrap;
}

.terminal-tab.active {
  border-bottom-color: var(--icon-info-active);
}

.tab-title {
  font-size: 13px;
  color: var(--text-regular);
}

.terminal-tab.active .tab-title {
  color: var(--icon-info-active);
}

.close-btn {
  margin-left: 8px;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background-color: var(--surface-base);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  color: var(--text-weak);
}

.terminal-actions {
  padding: 0 8px;
}

.action-btn {
  width: 28px;
  height: 28px;
  border-radius: 4px;
  background-color: var(--surface-raised-base);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 18px;
  color: var(--text-regular);
}

.terminal-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.terminal-output {
  flex: 1;
  padding: 12px;
}

.output-content {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.output-line {
  font-family: var(--font-family-mono);
  font-size: 13px;
  line-height: 1.5;
  color: var(--text-regular);
  white-space: pre-wrap;
  word-break: break-all;
}

.terminal-input-area {
  display: flex;
  align-items: center;
  padding: 8px 12px;
  background-color: var(--background-stronger);
  border-top: 1px solid var(--border-base);
}

.prompt-char {
  font-family: var(--font-family-mono);
  font-size: 13px;
  color: var(--icon-info-active);
  margin-right: 8px;
}

.terminal-input {
  flex: 1;
  font-family: var(--font-family-mono);
  font-size: 13px;
  color: var(--text-regular);
  background-color: transparent;
  border: none;
  outline: none;
}
</style>
