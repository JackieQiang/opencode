import { ref, onMounted, onUnmounted } from 'vue'

interface AutoScrollOptions {
  working: () => boolean
  overflowAnchor?: 'auto' | 'start' | 'end'
}

export function useAutoScroll(options: AutoScrollOptions) {
  const container = ref<HTMLElement | null>(null)
  const userScrolled = ref(false)
  let scrollFrame: number | null = null
  let lastScrollTop = 0

  const scrollToBottom = (behavior: ScrollBehavior = 'auto') => {
    if (!container.value) return
    container.value.scrollTo({
      top: container.value.scrollHeight,
      behavior,
    })
  }

  const forceScrollToBottom = () => {
    userScrolled.value = false
    scrollToBottom('auto')
  }

  const pause = () => {
    userScrolled.value = true
  }

  const handleScroll = () => {
    if (!container.value) return

    const { scrollTop, scrollHeight, clientHeight } = container.value
    const atBottom = scrollHeight - scrollTop - clientHeight < 50

    if (userScrolled.value && atBottom) {
      userScrolled.value = false
    }

    lastScrollTop = scrollTop
  }

  const scrollRef = (el: HTMLElement | null) => {
    if (scrollFrame) {
      cancelAnimationFrame(scrollFrame)
    }

    container.value = el

    if (el) {
      el.addEventListener('scroll', handleScroll, { passive: true })
    }
  }

  watch(
    () => options.working(),
    working => {
      if (!working || userScrolled.value) return
      forceScrollToBottom()
    }
  )

  onUnmounted(() => {
    if (container.value) {
      container.value.removeEventListener('scroll', handleScroll)
    }
    if (scrollFrame) {
      cancelAnimationFrame(scrollFrame)
    }
  })

  return {
    userScrolled,
    scrollRef,
    scrollToBottom,
    forceScrollToBottom,
    pause,
  }
}

export type AutoScroll = ReturnType<typeof useAutoScroll>
