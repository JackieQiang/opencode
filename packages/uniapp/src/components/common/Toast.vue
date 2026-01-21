<template>
  <view v-if="visible" class="toast" :class="typeClass">
    <text class="toast-title">{{ title }}</text>
    <text v-if="description" class="toast-description">{{ description }}</text>
    <view v-if="closable" class="toast-close" @click="close">×</view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'

const props = withDefaults(
  defineProps<{
    title: string
    description?: string
    type?: 'success' | 'error' | 'warning' | 'info'
    duration?: number
    closable?: boolean
  }>(),
  {
    type: 'info',
    duration: 3000,
    closable: false,
  }
)

const emit = defineEmits<{
  close: []
}>()

const visible = ref(true)

const typeClass = computed(() => `toast-${props.type}`)

let timer: ReturnType<typeof setTimeout> | null = null

const close = () => {
  visible.value = false
  emit('close')
}

onMounted(() => {
  if (props.duration > 0) {
    timer = setTimeout(() => {
      close()
    }, props.duration)
  }
})

onUnmounted(() => {
  if (timer) {
    clearTimeout(timer)
  }
})
</script>

<style lang="scss" scoped>
.toast {
  position: fixed;
  top: 50px;
  left: 50%;
  transform: translateX(-50%);
  min-width: 280px;
  max-width: 400px;
  padding: 16px;
  border-radius: 12px;
  background-color: var(--surface-raised-stronger);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  z-index: 1000;
}

.toast-success {
  border-left: 4px solid var(--icon-info-active);
}

.toast-error {
  border-left: 4px solid var(--icon-danger);
}

.toast-warning {
  border-left: 4px solid var(--icon-warning);
}

.toast-info {
  border-left: 4px solid var(--icon-info-active);
}

.toast-title {
  display: block;
  font-size: 15px;
  font-weight: 500;
  color: var(--text-strong);
  margin-bottom: 4px;
}

.toast-description {
  display: block;
  font-size: 13px;
  color: var(--text-weak);
}

.toast-close {
  position: absolute;
  top: 8px;
  right: 12px;
  font-size: 20px;
  color: var(--text-subtle);
  cursor: pointer;
}
</style>
