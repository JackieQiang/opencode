<template>
  <view class="index-page">
    <view class="header">
      <text class="title">OpenCode</text>
      <text class="subtitle">AI 编程助手</text>
    </view>

    <view class="content">
      <view v-if="recentProjects.length === 0" class="empty-state">
        <view class="empty-icon">
          <text class="icon-text">📁</text>
        </view>
        <text class="empty-title">{{ t('home.empty.title') }}</text>
        <text class="empty-description">{{ t('home.empty.description') }}</text>
        <button class="btn-primary" @click="openDirectory">
          <text>打开项目</text>
        </button>
      </view>

      <view v-else class="recent-projects">
        <text class="section-title">{{ t('home.recentProjects') }}</text>
        <view class="project-list">
          <view
            v-for="project in recentProjects"
            :key="project.path"
            class="project-item"
            @click="openProject(project.path)"
          >
            <view class="project-info">
              <text class="project-name">{{ project.name }}</text>
              <text class="project-path">{{ project.path }}</text>
            </view>
          </view>
        </view>
        <button class="btn-secondary" @click="openDirectory">
          <text>打开其他项目</text>
        </button>
      </view>
    </view>

    <view class="footer">
      <view class="status-indicator" :class="{ connected: isConnected }">
        <text class="status-dot"></text>
        <text class="status-text">{{ isConnected ? '已连接' : '未连接' }}</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from '@/composables/useLanguage'
import { useGlobalStore } from '@/stores/global'

const router = useRouter()
const { t } = useI18n()
const globalStore = useGlobalStore()

interface Project {
  path: string
  name: string
}

const recentProjects = ref<Project[]>([])
const isConnected = computed(() => globalStore.connected)

onMounted(() => {
  loadRecentProjects()
})

const loadRecentProjects = () => {
  const saved = uni.getStorageSync('recent-projects') as Project[] | undefined
  if (saved) {
    recentProjects.value = saved
  }
}

const openProject = (path: string) => {
  globalStore.setDirectory(path)
  router.push('/session')
}

const openDirectory = () => {
  // #ifdef MP-WEIXIN
  uni.chooseMessageFile({
    type: 'folder',
    success: res => {
      const path = res.tempFiles[0]?.path
      if (path) {
        openProject(path)
      }
    },
  })
  // #endif

  // #ifdef H5
  const input = document.createElement('input')
  input.type = 'file'
  input.webkitdirectory = true
  input.onchange = e => {
    const files = (e.target as HTMLInputElement).files
    if (files && files.length > 0) {
      const path = files[0].webkitRelativePath.split('/')[0]
      openProject(path)
    }
  }
  input.click()
  // #endif
}
</script>

<style lang="scss" scoped>
.index-page {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: var(--background-base);
  padding: 24px;
}

.header {
  padding: 32px 0;
  text-align: center;
}

.title {
  display: block;
  font-size: 32px;
  font-weight: 700;
  color: var(--text-strong);
  margin-bottom: 8px;
}

.subtitle {
  display: block;
  font-size: 16px;
  color: var(--text-weak);
}

.content {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 48px 24px;
}

.empty-icon {
  width: 80px;
  height: 80px;
  border-radius: 16px;
  background-color: var(--surface-raised-base);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24px;
}

.icon-text {
  font-size: 40px;
}

.empty-title {
  font-size: 20px;
  font-weight: 600;
  color: var(--text-strong);
  margin-bottom: 8px;
}

.empty-description {
  font-size: 14px;
  color: var(--text-weak);
  text-align: center;
  margin-bottom: 32px;
}

.btn-primary {
  background-color: var(--icon-info-active);
  color: white;
  padding: 12px 24px;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 500;
}

.btn-secondary {
  background-color: transparent;
  color: var(--icon-info-active);
  padding: 12px 24px;
  border: 1px solid var(--icon-info-active);
  border-radius: 8px;
  font-size: 16px;
  margin-top: 24px;
}

.recent-projects {
  padding: 24px 0;
}

.section-title {
  font-size: 18px;
  font-weight: 600;
  color: var(--text-strong);
  margin-bottom: 16px;
  display: block;
}

.project-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.project-item {
  padding: 16px;
  background-color: var(--surface-raised-base);
  border-radius: 8px;
  border: 1px solid var(--border-base);
}

.project-info {
  display: flex;
  flex-direction: column;
}

.project-name {
  font-size: 16px;
  font-weight: 500;
  color: var(--text-strong);
  margin-bottom: 4px;
}

.project-path {
  font-size: 12px;
  color: var(--text-weak);
}

.footer {
  padding: 24px 0;
}

.status-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.status-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background-color: var(--text-subtle);
}

.status-indicator.connected .status-dot {
  background-color: var(--icon-info-active);
}

.status-text {
  font-size: 14px;
  color: var(--text-weak);
}
</style>
