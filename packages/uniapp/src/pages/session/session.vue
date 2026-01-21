<template>
  <view class="session-page">
    <view class="session-container">
      <view class="session-content">
        <view v-if="!currentSessionId" class="new-session">
          <view class="new-session-content">
            <view class="logo">
              <text class="logo-text">🤖</text>
            </view>
            <text class="welcome-text">开始新对话</text>
            <view class="prompt-input-container">
              <textarea
                v-model="prompt"
                class="prompt-input"
                :placeholder="t('prompt.placeholder.normal')"
                :maxlength="-1"
                @confirm="sendPrompt"
              />
            </view>
            <view v-if="imageAttachments.length > 0" class="attachments">
              <view v-for="img in imageAttachments" :key="img.id" class="attachment-item">
                <image :src="img.dataUrl" mode="aspectFill" class="attachment-image" />
                <view class="remove-btn" @click="removeImage(img.id)">×</view>
              </view>
            </view>
            <view class="input-actions">
              <view class="left-actions">
                <button class="action-btn" @click="attachImage">
                  <text>📎</text>
                </button>
              </view>
              <button class="send-btn" :disabled="!canSubmit" @click="sendPrompt">
                <text>发送</text>
              </button>
            </view>
          </view>
        </view>

        <view v-else class="chat-container">
          <scroll-view
            class="messages-scroll"
            :scroll-y="true"
            :scroll-into-view="scrollToView"
            :scroll-with-animation="true"
            @scroll="onScroll"
          >
            <view class="messages-list">
              <view
                v-for="(msg, index) in messages"
                :key="msg.id"
                :id="'msg-' + msg.id"
                class="message-item"
                :class="{ 'user-message': msg.role === 'user' }"
              >
                <view class="message-content">
                  <text class="message-text">{{ msg.content || '' }}</text>
                </view>
              </view>
            </view>
          </scroll-view>

          <view class="input-container">
            <view class="input-box">
              <textarea
                v-model="prompt"
                class="chat-input"
                :placeholder="t('prompt.placeholder.normal')"
                :maxlength="-1"
                @confirm="sendPrompt"
              />
              <button class="send-btn-small" :disabled="!canSubmit" @click="sendPrompt">
                <text>➤</text>
              </button>
            </view>
          </view>
        </view>
      </view>

      <view v-if="showTerminal" class="terminal-panel">
        <TerminalPanel />
      </view>
    </view>

    <view class="bottom-bar">
      <view class="tab-bar">
        <view
          class="tab-item"
          :class="{ active: activeTab === 'session' }"
          @click="activeTab = 'session'"
        >
          <text>{{ t('session.tab.session') }}</text>
        </view>
        <view
          class="tab-item"
          :class="{ active: activeTab === 'review' }"
          @click="activeTab = 'review'"
        >
          <text>{{ t('session.tab.review') }}</text>
        </view>
        <view
          class="tab-item"
          :class="{ active: activeTab === 'terminal' }"
          @click="activeTab = 'terminal'"
        >
          <text>{{ t('command.category.terminal') }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, nextTick } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from '@/composables/useLanguage'
import { useSessionStore } from '@/stores/session'
import { useGlobalStore } from '@/stores/global'
import { usePrompt } from '@/composables/usePrompt'
import { useAutoScroll } from '@/composables/useAutoScroll'
import TerminalPanel from '@/components/terminal/TerminalPanel.vue'

const route = useRoute()
const router = useRouter()
const { t } = useI18n()
const sessionStore = useSessionStore()
const globalStore = useGlobalStore()
const promptComposable = usePrompt()

const prompt = ref('')
const activeTab = ref('session')
const showTerminal = ref(false)
const scrollToView = ref('')

const currentSessionId = computed(() => sessionStore.currentSessionId)
const messages = computed(() => sessionStore.currentMessages)
const canSubmit = computed(
  () => prompt.value.trim().length > 0 || promptComposable.imageAttachments.value.length > 0
)

const autoScroll = useAutoScroll({
  working: () => true,
})

onMounted(() => {
  sessionStore.init()
  promptComposable.loadHistory()

  const sessionId = route.params.id as string | undefined
  if (sessionId) {
    sessionStore.setCurrentSession(sessionId)
  }
})

const sendPrompt = async () => {
  if (!canSubmit.value) return

  const result = await promptComposable.submit()
  if (!result) return

  if (!currentSessionId.value) {
    const res = await uni.request({
      url: '/api/session/create',
      method: 'POST',
      baseUrl: globalStore.serverUrl,
    })

    if (res.data && (res.data as any).data?.id) {
      sessionStore.setCurrentSession((res.data as any).data.id)
      router.push(`/session/${(res.data as any).data.id}`)
    }
  }

  prompt.value = ''
}

const attachImage = () => {
  // #ifdef MP-WEIXIN
  uni.chooseMedia({
    count: 9,
    mediaType: ['image'],
    sourceType: ['album', 'camera'],
    success: res => {
      res.tempFiles.forEach((file: any) => {
        promptComposable.addImage(file)
      })
    },
  })
  // #endif

  // #ifdef H5
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  input.multiple = true
  input.onchange = e => {
    const files = (e.target as HTMLInputElement).files
    if (files) {
      Array.from(files).forEach(file => {
        promptComposable.addImage(file)
      })
    }
  }
  input.click()
  // #endif
}

const removeImage = (id: string) => {
  promptComposable.removeImage(id)
}

const onScroll = (e: any) => {
  const { scrollTop, scrollHeight, clientHeight } = e.detail
  const atBottom = scrollHeight - scrollTop - clientHeight < 50
  if (atBottom) {
    autoScroll.userScrolled.value = false
  } else {
    autoScroll.userScrolled.value = true
  }
}

watch(
  messages,
  () => {
    nextTick(() => {
      if (!autoScroll.userScrolled.value && messages.value.length > 0) {
        const lastMsg = messages.value[messages.value.length - 1]
        scrollToView.value = `msg-${lastMsg.id}`
      }
    })
  },
  { deep: true }
)
</script>

<style lang="scss" scoped>
.session-page {
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: var(--background-base);
}

.session-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.session-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.new-session {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
}

.new-session-content {
  width: 100%;
  max-width: 600px;
  display: flex;
  flex-direction: column;
  align-items: center;
}

.logo {
  width: 80px;
  height: 80px;
  border-radius: 20px;
  background: linear-gradient(135deg, var(--icon-info-active), #5856d6);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24px;
}

.logo-text {
  font-size: 40px;
}

.welcome-text {
  font-size: 24px;
  font-weight: 600;
  color: var(--text-strong);
  margin-bottom: 32px;
}

.prompt-input-container {
  width: 100%;
  background-color: var(--surface-raised-base);
  border: 1px solid var(--border-base);
  border-radius: 12px;
  padding: 16px;
  margin-bottom: 16px;
}

.prompt-input {
  width: 100%;
  min-height: 120px;
  font-size: 16px;
  color: var(--text-regular);
  line-height: 1.5;
}

.attachments {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 16px;
}

.attachment-item {
  position: relative;
  width: 60px;
  height: 60px;
}

.attachment-image {
  width: 100%;
  height: 100%;
  border-radius: 8px;
}

.remove-btn {
  position: absolute;
  top: -8px;
  right: -8px;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background-color: var(--icon-danger);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
}

.input-actions {
  width: 100%;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.left-actions {
  display: flex;
  gap: 8px;
}

.action-btn {
  width: 40px;
  height: 40px;
  border-radius: 8px;
  background-color: var(--surface-raised-base);
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20px;
}

.send-btn {
  background-color: var(--icon-info-active);
  color: white;
  padding: 12px 32px;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 500;
}

.send-btn:disabled {
  opacity: 0.5;
}

.chat-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.messages-scroll {
  flex: 1;
  padding: 16px;
}

.messages-list {
  display: flex;
  flex-direction: column;
  gap: 16px;
  padding-bottom: 80px;
}

.message-item {
  max-width: 80%;
  padding: 12px 16px;
  background-color: var(--surface-raised-base);
  border-radius: 12px;
  align-self: flex-start;
}

.message-item.user-message {
  align-self: flex-end;
  background-color: var(--icon-info-active);
}

.message-text {
  font-size: 15px;
  color: var(--text-regular);
  line-height: 1.5;
}

.user-message .message-text {
  color: white;
}

.input-container {
  padding: 16px;
  background-color: var(--background-stronger);
  border-top: 1px solid var(--border-base);
}

.input-box {
  display: flex;
  align-items: flex-end;
  background-color: var(--surface-raised-base);
  border: 1px solid var(--border-base);
  border-radius: 12px;
  padding: 12px;
}

.chat-input {
  flex: 1;
  min-height: 44px;
  max-height: 120px;
  font-size: 15px;
  color: var(--text-regular);
  line-height: 1.5;
}

.send-btn-small {
  width: 36px;
  height: 36px;
  border-radius: 8px;
  background-color: var(--icon-info-active);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  margin-left: 8px;
}

.send-btn-small:disabled {
  opacity: 0.5;
}

.terminal-panel {
  height: 300px;
  border-top: 1px solid var(--border-base);
}

.bottom-bar {
  background-color: var(--background-stronger);
  border-top: 1px solid var(--border-base);
}

.tab-bar {
  display: flex;
  height: 50px;
}

.tab-item {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 14px;
  color: var(--text-weak);
  border-bottom: 2px solid transparent;
}

.tab-item.active {
  color: var(--icon-info-active);
  border-bottom-color: var(--icon-info-active);
}
</style>
