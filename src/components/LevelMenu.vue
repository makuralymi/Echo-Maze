<template>
  <div class="overlay">
    <h1>回声迷宫</h1>
    <p class="subtitle">选择关卡</p>

    <!-- 关卡页容器：左右翻页箭头 + 滑动视口 -->
    <div class="page-area">
      <button
        v-if="pages.length > 1"
        class="page-arrow left"
        :disabled="currentPage === 0"
        aria-label="上一页"
        @click="goToPage(currentPage - 1)"
      >
        <svg viewBox="0 0 24 24" class="arrow-icon" aria-hidden="true">
          <polyline points="15 6 9 12 15 18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>

      <div
        class="page-viewport"
        ref="viewportRef"
        @touchstart="onTouchStart"
        @touchmove="onTouchMove"
        @touchend="onTouchEnd"
      >
        <div class="page-track" :style="trackStyle">
          <div
            v-for="(page, pi) in pages"
            :key="pi"
            class="page-panel"
          >
            <button
              v-for="lvl in page"
              :key="lvl.id"
              class="level-btn"
              :class="{ locked: lvl.locked }"
              :disabled="lvl.locked"
              @click="emit('select', lvl.id); playClick()"
              @mouseenter="playHover"
            >
              <span class="level-id">{{ lvl.id }}</span>
              <span class="level-info">
                <span class="level-name">{{ lvl.name }}</span>
                <span class="level-desc">{{ lvl.desc }}</span>
              </span>
              <span v-if="lvl.locked" class="lock-icon">
                <svg viewBox="0 0 24 24" class="lock-svg" aria-hidden="true">
                  <rect x="5" y="11" width="14" height="10" rx="2" ry="2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  <path d="M8 11V7a4 4 0 0 1 8 0v4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                  <circle cx="12" cy="16" r="1.2" fill="currentColor"/>
                </svg>
              </span>
              <span v-else-if="lvl.cleared" class="clear-icon">✓</span>
            </button>
          </div>
        </div>
      </div>

      <button
        v-if="pages.length > 1"
        class="page-arrow right"
        :disabled="currentPage === pages.length - 1"
        aria-label="下一页"
        @click="goToPage(currentPage + 1)"
      >
        <svg viewBox="0 0 24 24" class="arrow-icon" aria-hidden="true">
          <polyline points="9 6 15 12 9 18" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </button>
    </div>

    <!-- 页码指示器 -->
    <div v-if="pages.length > 1" class="page-dots">
      <span
        v-for="(_, pi) in pages"
        :key="pi"
        class="dot"
        :class="{ active: pi === currentPage }"
        @click="goToPage(pi)"
      ></span>
    </div>

    <div v-if="loadError" class="error-msg">{{ loadError }}</div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useSound } from '../composables/useSound.js'

const { playClick, playHover } = useSound()

const PER_PAGE = 10

const props = defineProps({
  levels: Array,     // [{ id, name, desc, locked, cleared }]
  loadError: String,
})
const emit = defineEmits(['select'])

const currentPage = ref(0)
const viewportRef = ref(null)

// 分页
const pages = computed(() => {
  const result = []
  for (let i = 0; i < props.levels.length; i += PER_PAGE) {
    result.push(props.levels.slice(i, i + PER_PAGE))
  }
  return result
})

const trackStyle = computed(() => ({
  transform: `translateX(-${currentPage.value * 100}%)`,
}))

function goToPage(pi) {
  if (pi >= 0 && pi < pages.value.length) {
    currentPage.value = pi
  }
}

// 左右滑动切换
let touchStartX = 0
let touchStartY = 0
let swiping = false

function onTouchStart(e) {
  if (e.touches.length !== 1) return
  touchStartX = e.touches[0].clientX
  touchStartY = e.touches[0].clientY
  swiping = false
}

function onTouchMove(e) {
  if (e.touches.length !== 1) return
  const dx = Math.abs(e.touches[0].clientX - touchStartX)
  const dy = Math.abs(e.touches[0].clientY - touchStartY)
  // 横向滑动为主才拦截
  if (dx > dy && dx > 10) {
    swiping = true
    e.preventDefault()
  }
}

function onTouchEnd(e) {
  if (!swiping) return
  const dx = e.changedTouches[0].clientX - touchStartX
  if (dx > 50) {
    // 右滑 → 上一页
    goToPage(currentPage.value - 1)
  } else if (dx < -50) {
    // 左滑 → 下一页
    goToPage(currentPage.value + 1)
  }
}

onMounted(() => {
  // 自动跳转到最高已解锁关卡所在页
  if (props.levels && props.levels.length > 0) {
    const unlocked = props.levels.filter(l => !l.locked)
    const target = unlocked.length > 0 ? unlocked[unlocked.length - 1] : props.levels[0]
    if (target) {
      const p = Math.floor((target.id - 1) / PER_PAGE)
      goToPage(p)
    }
  }
})
</script>

<style scoped>
.overlay {
  position: absolute;
  top: 0; left: 0; width: 100%; height: 100%;
  background-color: rgba(0, 0, 0, 0.95);
  display: flex; flex-direction: column;
  justify-content: center; align-items: center;
  pointer-events: auto; z-index: 20;
  padding: 20px 20px 16px; box-sizing: border-box; text-align: center;
  overflow: hidden;
}
h1 {
  font-size: clamp(24px, 7vw, 32px);
  margin-bottom: 4px;
  letter-spacing: 5px;
  flex-shrink: 0;
}
.subtitle {
  font-size: clamp(12px, 3vw, 14px);
  margin-bottom: 16px;
  color: #aaa;
  flex-shrink: 0;
}

/* 翻页区域：左箭头 + 滑动视口 + 右箭头 */
.page-area {
  display: flex;
  align-items: center;
  gap: 4px;
  width: 100%;
  max-width: 480px;
  flex: 1;
  min-height: 0;
}

/* 滑动视口 */
.page-viewport {
  flex: 1;
  min-width: 0;
  height: 100%;
  overflow: hidden;
  touch-action: pan-y; /* 允许纵向滚动，横向由我们处理 */
}

/* 翻页箭头 */
.page-arrow {
  flex-shrink: 0;
  width: clamp(38px, 10vw, 46px);
  height: clamp(38px, 10vw, 46px);
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid #3a3a3a;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.03);
  color: #bbb;
  cursor: pointer;
  transition: all 0.25s ease;
  -webkit-tap-highlight-color: transparent;
  padding: 0;
}
.arrow-icon {
  width: 22px;
  height: 22px;
  display: block;
}
.page-arrow:not(:disabled):hover {
  border-color: #4CAF50;
  color: #fff;
  background: rgba(76, 175, 80, 0.12);
  box-shadow: 0 0 12px rgba(76, 175, 80, 0.35);
}
.page-arrow:not(:disabled):active {
  transform: scale(0.88);
}
.page-arrow:disabled {
  opacity: 0.22;
  cursor: not-allowed;
}
/* 还有下一页时，右箭头轻微摆动提示 */
.page-arrow.right:not(:disabled) {
  animation: arrow-nudge 2.2s ease-in-out infinite;
}
.page-arrow.right:not(:disabled):hover {
  animation-play-state: paused;
}
@keyframes arrow-nudge {
  0%, 100% { transform: translateX(0); }
  50% { transform: translateX(3px); }
}
.page-track {
  display: flex;
  height: 100%;
  transition: transform 0.3s ease;
}
.page-panel {
  min-width: 100%;
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 4px 2px;
  overflow-y: auto;
}

/* 关卡按钮 */
.level-btn {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 13px 14px;
  border: 1px solid #444;
  border-radius: 8px;
  background: transparent;
  color: #fff;
  font-family: inherit;
  cursor: pointer;
  transition: all 0.25s ease;
  text-transform: none;
  text-align: left;
  flex-shrink: 0;
}
.level-btn:not(:disabled):hover {
  border-color: #fff;
  background: rgba(255,255,255,0.05);
}
.level-btn.locked {
  opacity: 0.35;
  cursor: not-allowed;
}
.level-id {
  font-size: 20px;
  font-weight: bold;
  color: #4CAF50;
  min-width: 28px;
}
.locked .level-id { color: #666; }
.level-info {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  flex: 1;
}
.level-name {
  font-size: 14px;
  font-weight: bold;
}
.level-desc {
  font-size: 11px;
  color: #888;
  margin-top: 2px;
}
.lock-icon, .clear-icon {
  font-size: 16px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 20px;
  height: 20px;
}
.lock-svg {
  width: 17px;
  height: 17px;
  display: block;
  color: #777;
  opacity: 0.85;
}
.clear-icon {
  color: #4CAF50;
  font-weight: bold;
}

/* 页码点 */
.page-dots {
  display: flex;
  gap: 8px;
  margin-top: 12px;
  flex-shrink: 0;
}
.dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: #444;
  cursor: pointer;
  transition: background 0.2s;
}
.dot.active {
  background: #fff;
}

.error-msg {
  color: #ff5252;
  margin-top: 12px;
  font-size: 13px;
  max-width: 80%;
  flex-shrink: 0;
}
</style>
