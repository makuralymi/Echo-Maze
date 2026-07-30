<template>
  <div id="game-container-3d">
    <!-- Three.js 渲染挂载点（canvas 由渲染器注入） -->
    <div ref="mountRef" class="three-mount"></div>

    <!-- 触摸方向盘（移动），与 OrbitControls（相机）互不干扰 -->
    <div v-if="isPlaying" class="dpad" @pointerdown.stop>
      <button class="pad-btn up"    @pointerdown.prevent="onPadDown('up')"    @pointerup="onPadUp" @pointerleave="onPadUp" @pointercancel="onPadUp" aria-label="上">▲</button>
      <button class="pad-btn left"  @pointerdown.prevent="onPadDown('left')"  @pointerup="onPadUp" @pointerleave="onPadUp" @pointercancel="onPadUp" aria-label="左">◀</button>
      <button class="pad-btn right" @pointerdown.prevent="onPadDown('right')" @pointerup="onPadUp" @pointerleave="onPadUp" @pointercancel="onPadUp" aria-label="右">▶</button>
      <button class="pad-btn down"  @pointerdown.prevent="onPadDown('down')"  @pointerup="onPadUp" @pointerleave="onPadUp" @pointercancel="onPadUp" aria-label="下">▼</button>
    </div>

    <!-- 3D 操作提示（非阻塞，自动消失） -->
    <transition name="fade">
      <div v-if="showHint" class="hint-toast">
        拖拽旋转视角 · 双指缩放 · 方向盘 / 方向键移动
      </div>
    </transition>

    <LevelMenu
      v-if="gamePhase === 'menu'"
      :levels="levelList"
      @select="onSelectLevel"
    />

    <StartScreen
      v-if="gamePhase === 'start'"
      :error="errorMsg"
      :start-microphone="startMicrophone"
      @started="onMicReady"
    />

    <LevelTransition
      v-if="gamePhase === 'transition'"
      @next="emit('nextLevel')"
      @menu="emit('menu')"
    />

    <VictoryScreen
      v-if="gamePhase === 'victory'"
      @restart="emit('restart')"
      @menu="emit('menu')"
    />

    <!-- 帮帮我布鲁斯彩蛋：全屏狗狗图标动画（与 2D 版一致） -->
    <div v-if="dogEasterEgg" class="easter-egg-overlay" @click="endEasterEgg">
      <svg
        :class="['easter-egg-icon', easterAnimPhase]"
        viewBox="0 0 1024 1024"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d="M307.4048 936.5504h-78.6432c-22.9376 0-41.7792-20.48-41.7792-45.6704s18.8416-45.6704 41.7792-45.6704h20.0704c0.6144 0 1.2288-0.6144 1.2288-1.2288l2.8672-293.4784-74.5472-155.4432c-68.1984-3.4816-122.4704-60.0064-122.4704-128.8192v-10.24h96.0512L235.52 200.2944l36.864-109.9776L400.5888 362.496l376.6272 183.7056c15.36 5.12 99.1232 7.9872 141.7216-48.7424l18.432-24.576v30.72c0 65.9456-28.2624 98.5088-52.0192 114.0736-14.9504 9.8304-30.1056 14.336-40.1408 16.384 2.048 9.4208 3.2768 19.2512 3.2768 29.2864 0 40.3456-18.0224 78.0288-49.5616 103.2192-4.5056 3.4816-10.8544 2.8672-14.336-1.6384-3.4816-4.5056-2.8672-10.8544 1.6384-14.336 26.624-21.2992 41.7792-53.0432 41.7792-87.2448 0-12.0832-1.8432-23.7568-5.5296-34.6112l-4.3008-12.9024 13.7216-0.4096c3.072-0.2048 70.4512-3.8912 83.1488-84.1728-50.176 41.984-124.5184 41.3696-144.9984 33.9968l-1.024-0.4096L385.024 377.6512 275.6608 145.2032l-22.9376 68.1984L158.1056 276.48H76.8c5.12 55.0912 51.6096 98.304 108.1344 98.304h6.3488l82.1248 171.2128v2.4576l-2.8672 295.7312c0 11.8784-9.8304 21.7088-21.7088 21.7088h-20.0704c-11.4688 0-21.2992 11.4688-21.2992 25.1904 0 13.9264 9.6256 25.1904 21.2992 25.1904h78.6432c5.7344 0 15.9744-14.7456 21.7088-28.2624L376.0128 649.216c1.024-5.5296 6.5536-9.216 12.0832-7.9872 5.5296 1.024 9.216 6.5536 7.9872 12.0832l-47.3088 240.8448-0.4096 0.8192c-2.6624 6.7584-18.0224 41.5744-40.96 41.5744z" fill="#4CAF50"/>
        <path d="M240.64 279.7568m-19.6608 0a19.6608 19.6608 0 1 0 39.3216 0 19.6608 19.6608 0 1 0-39.3216 0Z" fill="#4CAF50"/>
        <path d="M559.3088 771.2768c-0.6144 0-1.4336 0-2.048-0.2048-100.352-20.6848-175.7184-109.7728-178.7904-113.664-3.6864-4.3008-3.072-10.8544 1.2288-14.336 4.3008-3.6864 10.8544-3.072 14.336 1.2288 0.8192 0.8192 73.9328 87.4496 167.3216 106.7008 5.5296 1.2288 9.0112 6.5536 7.9872 12.0832-1.024 4.9152-5.3248 8.192-10.0352 8.192zM766.1568 936.5504h-128.4096c-22.9376 0-41.7792-20.48-41.7792-45.6704s18.8416-45.6704 41.7792-45.6704h19.6608c0.4096-0.6144 1.2288-1.8432 2.2528-4.9152 11.8784-32.5632-4.5056-42.3936-6.3488-43.4176l-1.2288-0.6144-0.6144-0.6144c-25.1904-20.0704-39.7312-49.9712-39.7312-82.1248 0-57.7536 46.8992-104.6528 104.6528-104.6528 10.6496 0 21.2992 1.6384 31.744 4.9152 5.3248 1.6384 8.3968 7.3728 6.5536 12.9024-1.6384 5.3248-7.3728 8.3968-12.9024 6.5536-8.3968-2.6624-16.9984-4.096-25.6-4.096-46.4896 0-84.1728 37.6832-84.1728 84.1728 0 25.6 11.4688 49.3568 31.1296 65.536 12.288 6.7584 29.696 28.672 15.1552 68.1984-1.8432 5.12-6.9632 18.2272-21.0944 18.2272h-20.0704c-11.4688 0-21.2992 11.4688-21.2992 25.1904 0 13.9264 9.6256 25.1904 21.2992 25.1904h107.52l-1.8432-111.4112c0-5.7344 4.5056-10.24 10.0352-10.4448h0.2048c5.5296 0 10.24 4.5056 10.24 10.0352l2.8672 132.7104z" fill="#4CAF50"/>
      </svg>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import LevelMenu from './LevelMenu.vue'
import StartScreen from './StartScreen.vue'
import LevelTransition from './LevelTransition.vue'
import VictoryScreen from './VictoryScreen.vue'
import { createThreeMaze } from '../composables/useThreeMaze.js'

const props = defineProps({
  gamePhase: String,
  currentLevel: Number,
  isPlaying: Boolean,
  isMicOn: Boolean,
  player: Object,
  exitCell: Object,
  grid: Array,
  pings: Array,
  cellSize: Number,
  offsetX: Number,
  offsetY: Number,
  cols: Number,
  rows: Number,
  errorMsg: String,
  getAudioLevels: Function,
  movePlayer: Function,
  checkWin: Function,
  triggerPing: Function,
  finalizeLevelSetup: Function,
  calcMazeTransform: Function,
  handleLevelComplete: Function,
  startMicrophone: Function,
  levelList: Array,
  dogActive: Boolean,
  dogPath: Array,
  dogWorldPath: Array,
  dogPos: Object,
  dogAnimId: Number,
  dogEasterEgg: Boolean,
  dogFinished: Boolean,
  dogAudioMode: String,
  updateDog: Function,
})

const emit = defineEmits(['nextLevel', 'menu', 'restart', 'easterEggDone'])

const mountRef = ref(null)
const showHint = ref(false)

const MIN_PEAK_THRESHOLD = 140
const MIN_AVG_THRESHOLD = 15
// 名义模拟空间：与 2D 版一致地使用 finalizeLevelSetup 生成的像素空间，
// 固定为 800×800，避免窗口尺寸变化影响回声半径与 reveal 计算。
const SIM_W = 800
const SIM_H = 800

let maze = null
let animationId = null
let lastFrameTime = 0
let lastPingTime = 0
let hintTimeout = null
let padRepeatTimer = null

function lerp(start, end, amt) {
  return (1 - amt) * start + amt * end
}

// ===== 主循环：复用 2D 版模拟逻辑，仅把“画”换成 Three.js 同步 =====
function update(timestamp) {
  if (!props.isPlaying) return
  if (!maze) return

  if (!lastFrameTime) lastFrameTime = timestamp
  const dt = (timestamp - lastFrameTime) / 1000
  lastFrameTime = timestamp

  // (1) 玩家绘制位置平滑（与 2D 一致）
  const playerWX = props.offsetX + props.player.c * props.cellSize + props.cellSize / 2
  const playerWY = props.offsetY + props.player.r * props.cellSize + props.cellSize / 2
  props.player.drawX = lerp(props.player.drawX, playerWX, 0.3)
  props.player.drawY = lerp(props.player.drawY, playerWY, 0.3)

  // (2) 麦克风 → 声波
  if (props.getAudioLevels) {
    const { peak, average } = props.getAudioLevels()
    const now = Date.now()
    if (peak > MIN_PEAK_THRESHOLD && average > MIN_AVG_THRESHOLD && now - lastPingTime > 500) {
      props.triggerPing(peak, SIM_W, SIM_H)
      lastPingTime = now
    }
  }

  // (3) 狗狗移动
  if (props.dogActive && props.updateDog) {
    const dogSpeed = (props.cellSize || 30) * 3.5 * dt
    props.updateDog(dogSpeed)
  }

  // (4) reveal 模拟（与 2D 版逐行一致：使用 cell.cx/cy 与 ping.x/y 的像素空间）
  if (props.grid) {
    const g = props.grid
    const pings = props.pings
    for (let i = 0; i < g.length; i++) {
      const cell = g[i]
      let hit = false
      let maxExposure = 0
      for (let pi = 0; pi < pings.length; pi++) {
        const p = pings[pi]
        const dx = cell.cx - p.x
        const dy = cell.cy - p.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist <= p.currentR) {
          hit = true
          const exp = Math.min(1, (p.currentR - dist) / (props.cellSize * 0.6) + 0.2)
          if (exp > maxExposure) maxExposure = exp
        }
      }
      if (hit) {
        const target = maxExposure * 1.0
        cell.revealTimer += (target - cell.revealTimer) * Math.min(1, 6.0 * dt)
      } else {
        cell.revealTimer -= 1.0 * dt
      }
      if (cell.revealTimer < 0.001) cell.revealTimer = 0
    }
  }

  // (5) 推进声波半径并回收（2D 版在 drawPings 内完成，这里显式做）
  const pings = props.pings
  for (let i = pings.length - 1; i >= 0; i--) {
    const p = pings[i]
    p.currentR += p.speed
    if (p.currentR >= p.maxR) pings.splice(i, 1)
  }

  // (6) 三维渲染同步
  maze.syncFrame({
    grid: props.grid,
    pings: props.pings,
    player: props.player,
    exitCell: props.exitCell,
    dogActive: props.dogActive,
    dogPos: props.dogPos,
    dogWorldPath: props.dogWorldPath,
    offsetX: props.offsetX,
    offsetY: props.offsetY,
    cellSize: props.cellSize,
  })

  if (props.checkWin && props.checkWin()) {
    props.handleLevelComplete()
    return
  }

  animationId = requestAnimationFrame(update)
}

function startSession() {
  if (!maze) return
  // 与 2D 版一致：先确定模拟空间（cellSize/offset/cx·cy/起点 reveal）
  if (props.finalizeLevelSetup) {
    props.finalizeLevelSetup(SIM_W, SIM_H)
  }
  maze.buildMaze(props.grid, props.cols, props.rows)
  lastFrameTime = 0
  lastPingTime = 0
  if (animationId) cancelAnimationFrame(animationId)
  animationId = requestAnimationFrame(update)

  // 首次进入的 3D 操作提示
  showHint.value = true
  if (hintTimeout) clearTimeout(hintTimeout)
  hintTimeout = setTimeout(() => { showHint.value = false }, 4000)
}

// ===== 输入：键盘 + 方向盘 =====
// 把“屏幕方向”换算为当前镜头视角下最贴合的网格移动方向（相机相对操控）：
// 旋转镜头后，按“上”始终是“远离镜头”，而不是固定在世界初始方向。
function moveRelative(screenDir) {
  const dir = maze ? maze.resolveDirection(screenDir) : screenDir
  props.movePlayer(dir)
}

function handleKeydown(e) {
  if (e.key === 'ArrowUp' || e.key === 'w') moveRelative('up')
  if (e.key === 'ArrowRight' || e.key === 'd') moveRelative('right')
  if (e.key === 'ArrowDown' || e.key === 's') moveRelative('down')
  if (e.key === 'ArrowLeft' || e.key === 'a') moveRelative('left')
}

function onPadDown(dir) {
  moveRelative(dir)
  onPadUp()
  // 长按连续移动：每次重复都重新按当前视角换算方向
  padRepeatTimer = setInterval(() => moveRelative(dir), 180)
}
function onPadUp() {
  if (padRepeatTimer) { clearInterval(padRepeatTimer); padRepeatTimer = null }
}

// ===== 菜单 / 入口（与 2D 版一致，调用 App.vue 挂载的全局函数） =====
function onSelectLevel(id) {
  props.startMicrophone().then(() => {
    window.__startLevel?.(id)
  }).catch(err => {
    console.error('麦克风权限失败:', err.message)
  })
}
function onMicReady() {
  window.__onMicReady?.()
}

// ===== 帮帮我布鲁斯：音效 & 彩蛋（与 2D 版一致） =====
const easterAnimPhase = ref('enter')
let dogAudio = null
let easterAudio = null
let easterTimeout = null

function stopDogAudio() {
  if (dogAudio) { dogAudio.pause(); dogAudio.currentTime = 0; dogAudio = null }
}
function stopEasterAudio() {
  if (easterAudio) { easterAudio.pause(); easterAudio.currentTime = 0; easterAudio = null }
}
function playDogLoop(audioFile) {
  stopDogAudio()
  dogAudio = new Audio(audioFile)
  dogAudio.loop = true
  dogAudio.volume = 0.5
  dogAudio.play().catch(() => {})
}
function playEasterOnce() {
  stopEasterAudio()
  easterAudio = new Audio('./dago.mp3')
  easterAudio.loop = false
  easterAudio.volume = 0.8
  easterAudio.play().catch(() => {})
}
function endEasterEgg() {
  if (easterTimeout) clearTimeout(easterTimeout)
  easterTimeout = null
  stopEasterAudio()
  easterAnimPhase.value = 'exit'
  setTimeout(() => { emit('easterEggDone') }, 400)
}

watch(
  () => props.dogEasterEgg,
  (val) => {
    if (val) {
      easterAnimPhase.value = 'enter'
      playEasterOnce()
      easterTimeout = setTimeout(() => {
        easterAnimPhase.value = 'peak'
        easterTimeout = setTimeout(() => {
          easterAnimPhase.value = 'exit'
          stopEasterAudio()
          easterTimeout = setTimeout(() => { emit('easterEggDone') }, 400)
        }, 600)
      }, 400)
    } else {
      easterAnimPhase.value = 'exit'
    }
  }
)

watch(
  () => props.dogActive,
  (val) => {
    if (val) {
      if (props.dogAudioMode === 'dage') playDogLoop('./dage.mp3')
      else playDogLoop('./dog.mp3')
    } else {
      stopDogAudio()
    }
  }
)

watch(
  () => props.dogAudioMode,
  (mode) => {
    if (props.dogActive && mode === 'dage') playDogLoop('./dage.mp3')
    else if (props.dogActive && mode === 'dog') playDogLoop('./dog.mp3')
  }
)

watch(
  () => props.dogFinished,
  (finished) => { if (finished) stopDogAudio() }
)

// ===== 生命周期 =====
watch(
  () => props.isPlaying,
  (val) => {
    if (val) {
      nextTick(() => startSession())
    } else {
      if (animationId) { cancelAnimationFrame(animationId); animationId = null }
    }
  }
)

onMounted(() => {
  maze = createThreeMaze(mountRef.value)

  // 顶栏“探图模式”轮询的全局函数（3D 下轨道相机常开，toggle = 重新取景）
  window.__isCameraOn = () => true
  window.__toggleCamera = () => { maze?.fitCamera() }

  window.addEventListener('resize', onResize)
  window.addEventListener('keydown', handleKeydown)

  // 与 2D 版一致：处理“挂载时已在游戏中”（菜单 → 第 11 关 / 第 10 关过渡 → 第 11 关）
  if (props.isPlaying) {
    nextTick(() => startSession())
  }
})

function onResize() {
  maze?.resize()
}

onUnmounted(() => {
  if (animationId) cancelAnimationFrame(animationId)
  window.removeEventListener('resize', onResize)
  window.removeEventListener('keydown', handleKeydown)
  onPadUp()
  if (hintTimeout) clearTimeout(hintTimeout)
  stopDogAudio()
  stopEasterAudio()
  if (easterTimeout) clearTimeout(easterTimeout)
  maze?.dispose()
  maze = null
  delete window.__toggleCamera
  delete window.__isCameraOn
})
</script>

<style scoped>
#game-container-3d {
  position: relative;
  width: 100%;
  max-width: 800px;
  flex: 1;
  background-color: #000;
  overflow: hidden;
}
.three-mount {
  position: absolute;
  inset: 0;
}
.three-mount :deep(canvas) {
  display: block;
  width: 100% !important;
  height: 100% !important;
  touch-action: none;
}

/* 方向盘（相机相对操控） */
.dpad {
  --pad: clamp(56px, 16vw, 72px);
  position: absolute;
  right: 16px;
  bottom: 18px;
  width: calc(var(--pad) * 3);
  height: calc(var(--pad) * 3);
  z-index: 40;
  pointer-events: auto;
}
.pad-btn {
  position: absolute;
  width: var(--pad);
  height: var(--pad);
  border: 1px solid rgba(255, 255, 255, 0.35);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.07);
  color: rgba(255, 255, 255, 0.9);
  font-size: clamp(20px, 6vw, 28px);
  line-height: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  user-select: none;
  -webkit-user-select: none;
  touch-action: none;
  -webkit-tap-highlight-color: transparent;
  padding: 0;
  text-transform: none;
}
.pad-btn:active {
  background: rgba(255, 255, 255, 0.24);
  color: #000;
}
.pad-btn.up    { top: 0; left: var(--pad); }
.pad-btn.left  { top: var(--pad); left: 0; }
.pad-btn.right { top: var(--pad); left: calc(var(--pad) * 2); }
.pad-btn.down  { top: calc(var(--pad) * 2); left: var(--pad); }

/* 操作提示 toast */
.hint-toast {
  position: absolute;
  top: 16px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 45;
  background: rgba(0, 0, 0, 0.72);
  border: 1px solid rgba(255, 255, 255, 0.25);
  border-radius: 999px;
  padding: 8px 18px;
  font-size: clamp(11px, 3vw, 13px);
  letter-spacing: 1px;
  color: #ddd;
  white-space: nowrap;
  pointer-events: none;
}
.fade-enter-active, .fade-leave-active { transition: opacity 0.5s ease; }
.fade-enter-from, .fade-leave-to { opacity: 0; }

/* ===== 布鲁斯彩蛋动画（与 2D 版一致） ===== */
.easter-egg-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.75);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 200;
  pointer-events: auto;
}
.easter-egg-icon {
  width: 180px;
  height: 180px;
  transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1), opacity 0.4s ease;
}
.easter-egg-icon.enter { transform: scale(0.15); opacity: 0.6; }
.easter-egg-icon.peak  { transform: scale(1.0);  opacity: 1; }
.easter-egg-icon.exit  { transform: scale(2.5);  opacity: 0; }
</style>
