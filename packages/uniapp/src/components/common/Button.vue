<template>
  <view class="button" :class="[variantClass, sizeClass, { disabled }]" @click="handleClick">
    <text>{{ label }}</text>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  label: string
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  size?: 'small' | 'medium' | 'large'
  disabled?: boolean
}>()

const emit = defineEmits<{
  click: []
}>()

const variantClass = computed(() => {
  return props.variant ? `button-${props.variant}` : 'button-primary'
})

const sizeClass = computed(() => {
  return props.size ? `button-${props.size}` : 'button-medium'
})

const handleClick = () => {
  if (!props.disabled) {
    emit('click')
  }
}
</script>

<style lang="scss" scoped>
.button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.15s ease;
}

.button.disabled {
  opacity: 0.5;
  cursor: not-allowed;
  pointer-events: none;
}

.button-primary {
  background-color: var(--icon-info-active);
  color: white;
}

.button-primary:hover:not(.disabled) {
  opacity: 0.9;
}

.button-secondary {
  background-color: var(--surface-raised-base);
  color: var(--text-regular);
  border: 1px solid var(--border-base);
}

.button-secondary:hover:not(.disabled) {
  background-color: var(--surface-base);
}

.button-ghost {
  background-color: transparent;
  color: var(--icon-info-active);
}

.button-ghost:hover:not(.disabled) {
  background-color: var(--surface-raised-base);
}

.button-danger {
  background-color: var(--icon-danger);
  color: white;
}

.button-danger:hover:not(.disabled) {
  opacity: 0.9;
}

.button-small {
  padding: 6px 12px;
  font-size: 12px;
}

.button-medium {
  padding: 10px 20px;
  font-size: 14px;
}

.button-large {
  padding: 14px 28px;
  font-size: 16px;
}
</style>
