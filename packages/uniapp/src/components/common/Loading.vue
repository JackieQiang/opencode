<template>
  <view class="loading">
    <view class="spinner"></view>
    <text v-if="text" class="loading-text">{{ text }}</text>
  </view>
</template>

<script setup lang="ts">
defineProps<{
  text?: string
}>()
</script>

<style lang="scss" scoped>
.loading {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.spinner {
  width: 32px;
  height: 32px;
  border: 3px solid var(--border-base);
  border-top-color: var(--icon-info-active);
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

.loading-text {
  margin-top: 12px;
  font-size: 14px;
  color: var(--text-weak);
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
