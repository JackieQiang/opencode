<template>
  <view class="icon" :style="iconStyle">
    <text>{{ iconName }}</text>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  name: string
  size?: 'small' | 'medium' | 'large'
}>()

const iconMap: Record<string, string> = {
  home: '🏠',
  chat: '💬',
  settings: '⚙️',
  close: '✕',
  send: '➤',
  attach: '📎',
  terminal: '⌨️',
  file: '📄',
  folder: '📁',
  search: '🔍',
  plus: '+',
  'chevron-down': '▼',
  'chevron-right': '▶',
  check: '✓',
  brain: '🧠',
  photo: '🖼️',
  'folder-open': '📂',
}

const iconName = computed(() => iconMap[props.name] || '?')

const iconStyle = computed(() => {
  const sizes = {
    small: '14px',
    medium: '18px',
    large: '24px',
  }
  const size = sizes[props.size || 'medium']
  return {
    fontSize: size,
  }
})
</script>

<style lang="scss" scoped>
.icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
</style>
