<template>
  <view class="file-icon" :style="{ width: size, height: size }">
    <text class="icon-text">{{ icon }}</text>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  node: {
    path: string
    type: 'file' | 'directory'
  }
  size?: string
}>()

const icon = computed(() => {
  if (props.node.type === 'directory') {
    return '📁'
  }

  const ext = props.node.path.split('.').pop()?.toLowerCase() || ''

  const iconMap: Record<string, string> = {
    ts: '📘',
    tsx: '📘',
    js: '📜',
    jsx: '📜',
    vue: '💚',
    json: '📋',
    html: '🌐',
    css: '🎨',
    scss: '🎨',
    sass: '🎨',
    md: '📝',
    txt: '📄',
    png: '🖼️',
    jpg: '🖼️',
    jpeg: '🖼️',
    gif: '🖼️',
    svg: '🖼️',
    py: '🐍',
    go: '🔷',
    rs: '🦀',
    java: '☕',
    c: '©️',
    cpp: '➕',
    h: '©️',
    hpp: '➕',
    rb: '💎',
    php: '🐘',
    sql: '🗃️',
    xml: '📄',
    yaml: '📄',
    yml: '📄',
    dockerfile: '🐳',
    gitignore: '📛',
    env: '🔒',
    lock: '🔒',
  }

  return iconMap[ext] || '📄'
})
</script>

<style lang="scss" scoped>
.file-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.icon-text {
  font-size: inherit;
}
</style>
