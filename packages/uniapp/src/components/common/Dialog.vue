<template>
  <view class="dialog-overlay" v-if="visible" @click="handleOverlayClick">
    <view class="dialog-container" @click.stop>
      <view class="dialog-header">
        <text class="dialog-title">{{ title }}</text>
        <view v-if="closable" class="dialog-close" @click="close">×</view>
      </view>
      <view class="dialog-content">
        <slot></slot>
      </view>
      <view v-if="$slots.footer" class="dialog-footer">
        <slot name="footer"></slot>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(
  defineProps<{
    visible: boolean
    title: string
    closable?: boolean
  }>(),
  {
    closable: true,
  }
)

const emit = defineEmits<{
  close: []
  overlayClick: []
}>()

const handleOverlayClick = () => {
  emit('overlayClick')
  if (props.closable) {
    close()
  }
}

const close = () => {
  emit('close')
}
</script>

<style lang="scss" scoped>
.dialog-overlay {
  position: fixed;
  inset: 0;
  background-color: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 24px;
}

.dialog-container {
  width: 100%;
  max-width: 480px;
  max-height: 80vh;
  background-color: var(--surface-raised-stronger);
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid var(--border-base);
}

.dialog-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-strong);
}

.dialog-close {
  width: 28px;
  height: 28px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
  color: var(--text-weak);
  cursor: pointer;
}

.dialog-content {
  flex: 1;
  overflow-y: auto;
  padding: 20px;
}

.dialog-footer {
  padding: 16px 20px;
  border-top: 1px solid var(--border-base);
  display: flex;
  justify-content: flex-end;
  gap: 12px;
}
</style>
