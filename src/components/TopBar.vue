<template>
  <div id="top-ui-bar-wrapper">
    <div id="top-ui-bar">
      <button id="menu-toggle" v-if="showMenuBtn" @click="showMenu = !showMenu">☰</button>
      <button v-else id="menu-toggle" class="placeholder"></button>
      <div id="game-title">回声迷宫</div>
      <button
        id="dog-btn"
        v-if="showLevel"
        :class="{ active: dogActive }"
        @click="emit('helpDog')"
        title="帮帮我布鲁斯"
      >
        <svg viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg" class="dog-icon">
          <path d="M307.4048 936.5504h-78.6432c-22.9376 0-41.7792-20.48-41.7792-45.6704s18.8416-45.6704 41.7792-45.6704h20.0704c0.6144 0 1.2288-0.6144 1.2288-1.2288l2.8672-293.4784-74.5472-155.4432c-68.1984-3.4816-122.4704-60.0064-122.4704-128.8192v-10.24h96.0512L235.52 200.2944l36.864-109.9776L400.5888 362.496l376.6272 183.7056c15.36 5.12 99.1232 7.9872 141.7216-48.7424l18.432-24.576v30.72c0 65.9456-28.2624 98.5088-52.0192 114.0736-14.9504 9.8304-30.1056 14.336-40.1408 16.384 2.048 9.4208 3.2768 19.2512 3.2768 29.2864 0 40.3456-18.0224 78.0288-49.5616 103.2192-4.5056 3.4816-10.8544 2.8672-14.336-1.6384-3.4816-4.5056-2.8672-10.8544 1.6384-14.336 26.624-21.2992 41.7792-53.0432 41.7792-87.2448 0-12.0832-1.8432-23.7568-5.5296-34.6112l-4.3008-12.9024 13.7216-0.4096c3.072-0.2048 70.4512-3.8912 83.1488-84.1728-50.176 41.984-124.5184 41.3696-144.9984 33.9968l-1.024-0.4096L385.024 377.6512 275.6608 145.2032l-22.9376 68.1984L158.1056 276.48H76.8c5.12 55.0912 51.6096 98.304 108.1344 98.304h6.3488l82.1248 171.2128v2.4576l-2.8672 295.7312c0 11.8784-9.8304 21.7088-21.7088 21.7088h-20.0704c-11.4688 0-21.2992 11.4688-21.2992 25.1904 0 13.9264 9.6256 25.1904 21.2992 25.1904h78.6432c5.7344 0 15.9744-14.7456 21.7088-28.2624L376.0128 649.216c1.024-5.5296 6.5536-9.216 12.0832-7.9872 5.5296 1.024 9.216 6.5536 7.9872 12.0832l-47.3088 240.8448-0.4096 0.8192c-2.6624 6.7584-18.0224 41.5744-40.96 41.5744z" fill="currentColor"/>
          <path d="M240.64 279.7568m-19.6608 0a19.6608 19.6608 0 1 0 39.3216 0 19.6608 19.6608 0 1 0-39.3216 0Z" fill="currentColor"/>
          <path d="M559.3088 771.2768c-0.6144 0-1.4336 0-2.048-0.2048-100.352-20.6848-175.7184-109.7728-178.7904-113.664-3.6864-4.3008-3.072-10.8544 1.2288-14.336 4.3008-3.6864 10.8544-3.072 14.336 1.2288 0.8192 0.8192 73.9328 87.4496 167.3216 106.7008 5.5296 1.2288 9.0112 6.5536 7.9872 12.0832-1.024 4.9152-5.3248 8.192-10.0352 8.192zM766.1568 936.5504h-128.4096c-22.9376 0-41.7792-20.48-41.7792-45.6704s18.8416-45.6704 41.7792-45.6704h19.6608c0.4096-0.6144 1.2288-1.8432 2.2528-4.9152 11.8784-32.5632-4.5056-42.3936-6.3488-43.4176l-1.2288-0.6144-0.6144-0.6144c-25.1904-20.0704-39.7312-49.9712-39.7312-82.1248 0-57.7536 46.8992-104.6528 104.6528-104.6528 10.6496 0 21.2992 1.6384 31.744 4.9152 5.3248 1.6384 8.3968 7.3728 6.5536 12.9024-1.6384 5.3248-7.3728 8.3968-12.9024 6.5536-8.3968-2.6624-16.9984-4.096-25.6-4.096-46.4896 0-84.1728 37.6832-84.1728 84.1728 0 25.6 11.4688 49.3568 31.1296 65.536 12.288 6.7584 29.696 28.672 15.1552 68.1984-1.8432 5.12-6.9632 18.2272-21.0944 18.2272h-20.0704c-11.4688 0-21.2992 11.4688-21.2992 25.1904 0 13.9264 9.6256 25.1904 21.2992 25.1904h107.52l-1.8432-111.4112c0-5.7344 4.5056-10.24 10.0352-10.4448h0.2048c5.5296 0 10.24 4.5056 10.24 10.0352l2.8672 132.7104z" fill="currentColor"/>
        </svg>
      </button>
      <div id="level-display" v-if="showLevel">LEVEL {{ level }} / {{ total }}</div>
      <div id="mic-status">
        MIC:
        <span id="mic-indicator" :style="{ color: isMicOn ? '#4CAF50' : '#fff' }">
          {{ isMicOn ? 'ON' : 'OFF' }}
        </span>
      </div>
      <button
        id="help-btn-bar"
        aria-label="操作指南"
        title="操作指南"
        @click="openTutorial"
      >?</button>
    </div>

    <Teleport to="body">
      <!-- 菜单弹窗（仅在游戏中显示） -->
      <div v-if="showMenu && showMenuBtn" class="menu-backdrop" @click="showMenu = false">
        <div class="menu-dialog" @click.stop>
          <div class="menu-title">暂停</div>

          <button class="menu-item" @click="handle('restart')">回到起点</button>
          <div class="menu-divider"></div>

          <div class="menu-row">
            <button class="menu-item flex-item" @click="handle('toggleCamera')">
              探图模式 {{ cameraOn ? 'ON' : 'OFF' }}
            </button>
            <button class="help-btn" aria-label="操作指南" @click="openTutorial()">?</button>
          </div>
          <div class="menu-divider"></div>

          <button class="menu-item" @click="handle('levels')">再探前路</button>
          <div class="menu-divider"></div>

          <button class="menu-item danger" @click="handle('home')">迷失</button>

          <button class="close-btn" @click="showMenu = false">继续</button>
        </div>
      </div>

      <!-- 完整操作教程（预渲染实时演示） -->
      <Tutorial v-if="showTutorial" @close="showTutorial = false" />

      <!-- 首次进入：是否查看教程 -->
      <transition name="tutpop">
        <div v-if="showFirstPrompt" class="fp-backdrop">
          <div class="fp-ambient" aria-hidden="true">
            <span class="fp-ring"></span>
            <span class="fp-ring d2"></span>
          </div>
          <div class="fp-card" @click.stop>
            <span class="fp-kicker">FIRST ECHO</span>
            <h2 class="fp-title">第一次来？</h2>
            <p class="fp-body">在这片黑暗里，<strong>声音是唯一的眼睛</strong>。<br>花半分钟看一遍真实操作演示，能少迷很多路。</p>
            <div class="fp-actions">
              <button class="fp-btn primary" @click="acceptTutorial">看看教程</button>
              <button class="fp-btn ghost" @click="declineTutorial">直接开始</button>
            </div>
          </div>
        </div>
      </transition>

      <!-- 提示：可随时在右上角查看教程 -->
      <transition name="fpfade">
        <div v-if="showTopHint" class="top-hint">随时点右上角 <b>?</b> 查看操作教程</div>
      </transition>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import Tutorial from './Tutorial.vue'

const props = defineProps({
  level: { type: Number, required: true },
  total: { type: Number, default: 5 },
  isMicOn: { type: Boolean, default: false },
  gamePhase: { type: String, default: '' },
  dogActive: { type: Boolean, default: false }
})

const emit = defineEmits(['restart', 'levels', 'home', 'toggleCamera', 'helpDog'])

const showMenu = ref(false)
const showTutorial = ref(false)
const showFirstPrompt = ref(false)
const showTopHint = ref(false)
let topHintTimer = null
const cameraOn = ref(false)

// 首次进入是否已询问过教程（本地记忆，避免重复打扰）
const TUT_PROMPT_KEY = 'em_tut_prompt_v1'
function hasSeenPrompt() {
  try { return localStorage.getItem(TUT_PROMPT_KEY) === '1' } catch (e) { return false }
}
function markSeenPrompt() {
  try { localStorage.setItem(TUT_PROMPT_KEY, '1') } catch (e) { /* 隐私模式等忽略 */ }
}

// 仅在 playing / transition / victory 显示菜单按钮
const showMenuBtn = computed(() => {
  return props.gamePhase === 'playing'
    || props.gamePhase === 'transition'
    || props.gamePhase === 'victory'
    || props.gamePhase === 'menu'
})
const showLevel = computed(() => {
  return props.gamePhase !== 'start'
})

function handle(action) {
  if (action === 'toggleCamera') {
    cameraOn.value = !cameraOn.value
    emit('toggleCamera')
    return
  }
  showMenu.value = false
  emit(action)
}

// 打开完整教程（顶栏 ? 与菜单 ? 共用）
function openTutorial() {
  showMenu.value = false
  showTutorial.value = true
}

// 首次弹窗：是 → 看教程；否 → 关闭并提示右上角入口
function acceptTutorial() {
  markSeenPrompt()
  showFirstPrompt.value = false
  showTutorial.value = true
}
function declineTutorial() {
  markSeenPrompt()
  showFirstPrompt.value = false
  showTopHint.value = true
  if (topHintTimer) clearTimeout(topHintTimer)
  topHintTimer = setTimeout(() => { showTopHint.value = false }, 4500)
}

let raf = null
function syncCamera() {
  if (typeof window.__isCameraOn === 'function') {
    cameraOn.value = window.__isCameraOn()
  }
  raf = requestAnimationFrame(syncCamera)
}
onMounted(() => {
  syncCamera()
  // 首次进入：默认弹出“是否查看教程”
  if (!hasSeenPrompt()) {
    setTimeout(() => { showFirstPrompt.value = true }, 500)
  }
})
onUnmounted(() => {
  if (raf) cancelAnimationFrame(raf)
  if (topHintTimer) clearTimeout(topHintTimer)
})
</script>

<style scoped>
#top-ui-bar-wrapper {
  width: 100%;
  max-width: 800px;
  position: relative;
  z-index: 30;
}
#top-ui-bar {
  width: 100%;
  height: 8vh;
  min-height: 50px;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 4%;
  box-sizing: border-box;
  border-bottom: 1px dashed #333;
  background-color: #000;
}
#menu-toggle {
  background: transparent;
  border: 1px solid #555;
  color: #aaa;
  font-size: 18px;
  cursor: pointer;
  padding: 2px 10px;
  border-radius: 4px;
  line-height: 1;
}
#menu-toggle:hover {
  border-color: #fff;
  color: #fff;
}
#menu-toggle.placeholder {
  visibility: hidden;
}
#game-title {
  font-size: clamp(14px, 3.5vw, 16px);
  font-weight: bold;
  letter-spacing: 2px;
  flex: 1;
  text-align: center;
}
#level-display {
  font-size: clamp(14px, 3.5vw, 16px);
  color: #4CAF50;
  font-weight: bold;
  margin-right: 8px;
}
#dog-btn {
  background: transparent;
  border: 1px solid #555;
  color: #aaa;
  cursor: pointer;
  padding: 4px 8px;
  border-radius: 4px;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 6px;
  transition: all 0.2s ease;
}
#dog-btn:hover {
  border-color: #fff;
  color: #fff;
}
#dog-btn.active {
  border-color: #fff;
  color: #fff;
  background: rgba(255, 255, 255, 0.15);
  box-shadow: 0 0 8px rgba(255, 255, 255, 0.3);
}
.dog-icon {
  width: 22px;
  height: 22px;
  display: block;
}
#mic-status {
  font-size: clamp(10px, 3vw, 12px);
  color: #aaa;
}
#mic-indicator {
  font-weight: bold;
}
#help-btn-bar {
  margin-left: 8px;
  width: 26px;
  height: 26px;
  flex-shrink: 0;
  border: 1px solid #555;
  border-radius: 50%;
  background: transparent;
  color: #aaa;
  font-size: 13px;
  font-weight: bold;
  line-height: 1;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  transition: all 0.2s ease;
  text-transform: none;
}
#help-btn-bar:hover {
  border-color: #4CAF50;
  color: #fff;
  background: rgba(76, 175, 80, 0.15);
}

/* ===== 首次进入：教程询问弹窗 ===== */
.fp-backdrop {
  position: fixed;
  inset: 0;
  z-index: 250;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 22px;
  background: rgba(2, 5, 8, 0.82);
  backdrop-filter: blur(5px);
  -webkit-backdrop-filter: blur(5px);
}
.fp-ambient {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: none;
}
.fp-ring {
  position: absolute;
  left: 50%;
  top: 40%;
  width: 80px;
  height: 80px;
  margin: -40px 0 0 -40px;
  border: 1px solid rgba(76, 175, 80, 0.22);
  border-radius: 50%;
  animation: fp-sonar 5s ease-out infinite;
}
.fp-ring.d2 { animation-delay: 2.5s; }
@keyframes fp-sonar {
  0% { transform: scale(0.3); opacity: 0.5; }
  100% { transform: scale(7); opacity: 0; }
}
.fp-card {
  position: relative;
  width: 100%;
  max-width: 380px;
  padding: 28px 26px 24px;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 18px;
  background: linear-gradient(160deg, rgba(17, 25, 23, 0.97), rgba(8, 12, 12, 0.97));
  box-shadow: 0 24px 70px rgba(0, 0, 0, 0.6);
  overflow: hidden;
  text-align: left;
  font-family: ui-sans-serif, system-ui, 'PingFang SC', 'Microsoft YaHei', sans-serif;
}
.fp-card::before {
  content: '';
  position: absolute;
  left: 0; top: 0; bottom: 0;
  width: 3px;
  background: linear-gradient(to bottom, #4CAF50, transparent);
}
.fp-kicker {
  font-family: 'Courier New', monospace;
  font-size: 10px;
  letter-spacing: 4px;
  color: rgba(76, 175, 80, 0.85);
}
.fp-title {
  font-family: 'Courier New', monospace;
  font-size: clamp(24px, 7vw, 32px);
  font-weight: 700;
  letter-spacing: 1px;
  color: #f2f7f4;
  margin: 6px 0 12px;
  text-shadow: 0 0 18px rgba(76, 175, 80, 0.25);
}
.fp-body {
  font-size: 13.5px;
  line-height: 1.85;
  color: #9fada7;
  margin: 0 0 22px;
}
.fp-body strong { color: #7df0a6; font-weight: 600; }
.fp-actions { display: flex; gap: 10px; flex-wrap: wrap; }
.fp-btn {
  font-family: 'Courier New', monospace;
  font-size: 13px;
  letter-spacing: 1px;
  padding: 12px 20px;
  border-radius: 999px;
  cursor: pointer;
  transition: all 0.22s ease;
  text-transform: none;
}
.fp-btn.primary {
  border: 1px solid #4CAF50;
  background: rgba(76, 175, 80, 0.14);
  color: #d8ffe6;
}
.fp-btn.primary:hover {
  background: #4CAF50;
  color: #04130b;
  box-shadow: 0 0 22px rgba(76, 175, 80, 0.5);
  transform: translateY(-1px);
}
.fp-btn.primary:active {
  background: #3d9142;
  color: #04130b;
  transform: translateY(0);
}
.fp-btn.ghost {
  border: 1px solid rgba(255, 255, 255, 0.18);
  background: transparent;
  color: #9fada7;
}
.fp-btn.ghost:hover {
  border-color: rgba(255, 255, 255, 0.6);
  color: #fff;
}
.fp-btn.ghost:active {
  background: rgba(255, 255, 255, 0.12);
  color: #fff;
}

/* 右上角入口提示 toast */
.top-hint {
  position: fixed;
  left: 50%;
  bottom: 24px;
  transform: translateX(-50%);
  z-index: 260;
  padding: 9px 18px;
  border: 1px solid rgba(76, 175, 80, 0.32);
  border-radius: 999px;
  background: rgba(8, 12, 12, 0.92);
  box-shadow: 0 8px 26px rgba(0, 0, 0, 0.5);
  color: #cdd6d2;
  font-size: 12px;
  letter-spacing: 0.5px;
  pointer-events: none;
  font-family: ui-sans-serif, system-ui, 'PingFang SC', 'Microsoft YaHei', sans-serif;
}
.top-hint b { color: #7df0a6; }

/* 弹窗 / toast 过渡 */
.tutpop-enter-active { transition: opacity 0.35s ease; }
.tutpop-enter-active .fp-card { transition: transform 0.45s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.35s ease; }
.tutpop-enter-from { opacity: 0; }
.tutpop-enter-from .fp-card { transform: translateY(18px) scale(0.94); opacity: 0; }
.tutpop-leave-active { transition: opacity 0.25s ease; }
.tutpop-leave-to { opacity: 0; }
.fp-fade-enter-active, .fp-fade-leave-active { transition: opacity 0.4s ease, transform 0.4s ease; }
.fp-fade-enter-from, .fp-fade-leave-to { opacity: 0; transform: translate(-50%, 10px); }

.menu-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.85);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 100;
}
.menu-dialog {
  background: #0a0a0a;
  border: 1px solid #333;
  padding: 28px 24px 20px;
  min-width: 260px;
  max-width: 90vw;
  text-align: center;
}
.menu-title {
  font-size: 18px;
  letter-spacing: 3px;
  margin-bottom: 20px;
  color: #fff;
}
.menu-item {
  display: block;
  width: 100%;
  padding: 14px 16px;
  border: none;
  background: transparent;
  color: #ccc;
  font-family: inherit;
  font-size: 14px;
  letter-spacing: 1px;
  cursor: pointer;
  text-transform: none;
  text-align: center;
}
.menu-item:hover { color: #fff; }
.menu-item.danger { color: #888; }
.menu-item.danger:hover { color: #ff5252; }
.menu-divider {
  height: 1px;
  background: #1a1a1a;
  margin: 0 16px;
}
.close-btn {
  display: block;
  width: 100%;
  margin-top: 20px;
  padding: 12px 16px;
  border: 1px solid #444;
  background: transparent;
  color: #888;
  font-family: inherit;
  font-size: 13px;
  letter-spacing: 2px;
  cursor: pointer;
  text-transform: uppercase;
}
.close-btn:hover { border-color: #fff; color: #fff; }

.menu-row { display: flex; align-items: center; gap: 0; }
.flex-item { flex: 1; padding: 14px 16px; }
.flex-item:hover { color: #4CAF50; }
.help-btn {
  width: 32px; height: 32px;
  border: 1px solid #444;
  border-radius: 50%;
  background: transparent;
  color: #888;
  font-family: inherit;
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 10px;
  flex-shrink: 0;
}
.help-btn:hover { border-color: #fff; color: #fff; }

.help-dialog {
  background: #0a0a0a;
  border: 1px solid #333;
  padding: 24px 20px 20px;
  min-width: 260px;
  max-width: 380px;
  text-align: center;
}
.help-title {
  font-size: 18px;
  letter-spacing: 3px;
  margin-bottom: 14px;
  color: #fff;
}
.preview-row {
  display: flex;
  gap: 8px;
  margin-bottom: 14px;
  justify-content: center;
}
.preview-col {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 4px;
}
.preview-canvas {
  width: 140px;
  height: 140px;
  border: 1px solid #333;
  border-radius: 4px;
  display: block;
}
.preview-label {
  font-size: 10px;
  color: #666;
  letter-spacing: 1px;
}
.help-dialog p {
  font-size: 13px;
  line-height: 1.8;
  color: #aaa;
  margin-bottom: 20px;
}
.highlight { color: #fff; font-weight: bold; }
</style>
