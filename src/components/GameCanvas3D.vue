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

    <!-- 升降层控制（仅立方关卡） -->
    <div v-if="isPlaying && isCube" class="vpad" @pointerdown.stop>
      <button class="pad-btn vert" @pointerdown.prevent="onVertDown('ascend')" @pointerup="onVertUp" @pointerleave="onVertUp" @pointercancel="onVertUp" aria-label="升层">▲</button>
      <span class="vpad-label">楼层</span>
      <button class="pad-btn vert" @pointerdown.prevent="onVertDown('descend')" @pointerup="onVertUp" @pointerleave="onVertUp" @pointercancel="onVertUp" aria-label="降层">▼</button>
    </div>

    <!-- 层聚焦选择（仅立方关卡且多层）：解决多层叠加无法读图 -->
    <div v-if="isPlaying && isCube && layerCount > 1" class="layer-picker" @pointerdown.stop>
      <span class="lp-label">层</span>
      <button class="layer-btn" :class="{ active: layerMode === 'all' }" @click="setLayerMode('all')">全</button>
      <button
        v-for="l in layerCount"
        :key="l"
        class="layer-btn"
        :class="{ active: layerMode === l - 1, current: playerLayer === l - 1 }"
        @click="setLayerMode(l - 1)"
      >{{ l }}</button>
    </div>

    <!-- 3D 操作提示（非阻塞，自动消失） -->
    <transition name="fade">
      <div v-if="showHint" class="hint-toast">{{ hintText }}</div>
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
import { ref, computed, onMounted, onUnmounted, watch, nextTick } from 'vue'
import LevelMenu from './LevelMenu.vue'
import StartScreen from './StartScreen.vue'
import LevelTransition from './LevelTransition.vue'
import VictoryScreen from './VictoryScreen.vue'
import { createThreeMaze } from '../composables/useThreeMaze.js'
import { useMaze3D } from '../composables/useMaze3D.js'
import { getLevelConfig } from '../config/levelConfig.js'

const props = defineProps({
  gamePhase: String,
  currentLevel: Number,
  isPlaying: Boolean,
  isMicOn: Boolean,
  viewMode: String, // 'plane' | 'cube'
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
// 探图模式开关：开启后 3D 环绕/缩放以玩家为中心
const followOn = ref(false)

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
let vertRepeatTimer = null

// ===== 立方（多层）关卡状态 =====
const isCube = computed(() => props.viewMode === 'cube')
const maze3D = useMaze3D()
let cubeGrid = []
let cubeCols = 0
let cubeRows = 0
let cubeLayers = 0
const cubePlayer = { c: 0, r: 0, l: 0, drawX: 0.5, drawY: 0.2, drawZ: 0.5 }
const cubeExit = { c: 0, r: 0, l: 0 }
let cubePings = []
let dog3DPath = []
const dog3DPos = { x: 0, y: 0, z: 0, idx: 0 }
const dog3DActive = ref(false)

// 层聚焦：'all' = 按玩家所在层智能调光；数字 = 单独点亮指定层
const layerMode = ref('all')
const layerCount = ref(0)   // 当前关卡层数（供模板渲染按钮）
const playerLayer = ref(0)  // 玩家所在层（供模板高亮）

// 操作提示文案（立方关含升降层说明）
const hintText = computed(() =>
  isCube.value
    ? '拖拽转视角 · 方向盘/WASD 平移 · Q/E 升降层'
    : '拖拽旋转视角 · 双指缩放 · 方向盘 / 方向键移动'
)

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
  maze.setFollowPlayer(followOn.value)
  lastFrameTime = 0
  lastPingTime = 0
  if (animationId) cancelAnimationFrame(animationId)
  animationId = requestAnimationFrame(update)
  flashHint()
}

function flashHint() {
  showHint.value = true
  if (hintTimeout) clearTimeout(hintTimeout)
  hintTimeout = setTimeout(() => { showHint.value = false }, 4000)
}

// ===== 立方关卡：生成 / 主循环 / 回声 / 移动 / 布鲁斯 =====

function loadCube() {
  const config = getLevelConfig(props.currentLevel - 1)
  cubeCols = config.c
  cubeRows = config.r
  cubeLayers = config.layers || 2
  layerCount.value = cubeLayers
  layerMode.value = 'all'

  let attempts = 0
  let result
  do {
    cubeGrid = maze3D.createGrid3D(cubeCols, cubeRows, cubeLayers)
    maze3D.generateMaze3D(cubeGrid, cubeCols, cubeRows, cubeLayers)
    result = maze3D.verify3D(cubeGrid, cubeCols, cubeRows, cubeLayers)
    attempts++
  } while (!result.reachable && attempts < 50)
  if (!result.reachable) maze3D.forceConnect3D(cubeGrid, cubeCols, cubeRows, cubeLayers)
  maze3D.addExtraPassages3D(cubeGrid, cubeCols, cubeRows, cubeLayers, config.extraRate)

  cubePlayer.c = 0; cubePlayer.r = 0; cubePlayer.l = 0
  cubePlayer.drawX = 0.5; cubePlayer.drawY = 0.2; cubePlayer.drawZ = 0.5
  cubeExit.c = cubeCols - 1; cubeExit.r = cubeRows - 1; cubeExit.l = cubeLayers - 1
  cubePings = []
  dog3DActive.value = false
  dog3DPath = []

  // 预点亮起点区域（底层 2×2）
  for (const cell of cubeGrid) {
    if (cell.l === 0 && cell.c <= 1 && cell.r <= 1) cell.revealTimer = 1.0
  }
}

function startCubeSession() {
  if (!maze) return
  loadCube()
  maze.buildCube(cubeGrid, cubeCols, cubeRows, cubeLayers)
  maze.setFollowPlayer(followOn.value)
  lastFrameTime = 0
  lastPingTime = 0
  if (animationId) cancelAnimationFrame(animationId)
  animationId = requestAnimationFrame(cubeUpdate)
  flashHint()
}

function cubeTriggerPing(peak) {
  const normalized = Math.max(0, Math.min(1, (peak - MIN_PEAK_THRESHOLD) / (255 - MIN_PEAK_THRESHOLD)))
  const intensity = Math.pow(normalized, 2)
  const diag = Math.hypot(cubeCols, cubeRows, cubeLayers)
  const maxR = 1.5 + diag * 0.85 * intensity
  cubePings.push({
    x: cubePlayer.drawX, y: cubePlayer.drawY, z: cubePlayer.drawZ,
    currentR: 0.2, maxR, speed: 0.06 + intensity * 0.14,
  })
}

function cubeUpdate(timestamp) {
  if (!props.isPlaying) return
  if (!maze) return

  if (!lastFrameTime) lastFrameTime = timestamp
  const dt = (timestamp - lastFrameTime) / 1000
  lastFrameTime = timestamp

  // 玩家平滑（真三维）
  cubePlayer.drawX = lerp(cubePlayer.drawX, cubePlayer.c + 0.5, 0.3)
  cubePlayer.drawY = lerp(cubePlayer.drawY, cubePlayer.l + 0.2, 0.3)
  cubePlayer.drawZ = lerp(cubePlayer.drawZ, cubePlayer.r + 0.5, 0.3)
  playerLayer.value = cubePlayer.l

  // 麦克风 → 球形声波
  if (props.getAudioLevels) {
    const { peak, average } = props.getAudioLevels()
    const now = Date.now()
    if (peak > MIN_PEAK_THRESHOLD && average > MIN_AVG_THRESHOLD && now - lastPingTime > 500) {
      cubeTriggerPing(peak)
      lastPingTime = now
    }
  }

  // 布鲁斯（三维）
  if (dog3DActive.value) updateDog3D(3.5 * dt)

  // 三维回声点亮（欧氏距离，声波可跨层传播）
  const g = cubeGrid
  const pings = cubePings
  for (let i = 0; i < g.length; i++) {
    const cell = g[i]
    let hit = false
    let maxExp = 0
    for (let pi = 0; pi < pings.length; pi++) {
      const p = pings[pi]
      const dx = cell.cx - p.x
      const dy = cell.cy - p.y
      const dz = cell.cz - p.z
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)
      if (dist <= p.currentR) {
        hit = true
        const exp = Math.min(1, (p.currentR - dist) / 0.6 + 0.2)
        if (exp > maxExp) maxExp = exp
      }
    }
    if (hit) cell.revealTimer += (maxExp - cell.revealTimer) * Math.min(1, 6.0 * dt)
    else cell.revealTimer -= 1.0 * dt
    if (cell.revealTimer < 0.001) cell.revealTimer = 0
  }

  // 推进并回收声波
  for (let i = pings.length - 1; i >= 0; i--) {
    pings[i].currentR += pings[i].speed
    if (pings[i].currentR >= pings[i].maxR) pings.splice(i, 1)
  }

  maze.syncCubeFrame({
    grid: cubeGrid,
    pings: cubePings,
    player: cubePlayer,
    dogActive: dog3DActive.value,
    dogPos: dog3DPos,
    dogPath3D: dog3DPath,
    layerFactors: computeLayerFactors(),
  })

  // 到达顶层对角终点 → 通关
  if (cubePlayer.c === cubeExit.c && cubePlayer.r === cubeExit.r && cubePlayer.l === cubeExit.l) {
    props.handleLevelComplete()
    return
  }

  animationId = requestAnimationFrame(cubeUpdate)
}

// 每层聚焦系数：供渲染按层调光（解决多层叠加无法读图的问题）
function computeLayerFactors() {
  const factors = new Float32Array(cubeLayers)
  const pl = cubePlayer.l
  for (let l = 0; l < cubeLayers; l++) {
    if (layerMode.value === 'all') {
      // 智能调光：玩家所在层最亮，随层距衰减
      const d = Math.abs(l - pl)
      factors[l] = d === 0 ? 1.0 : d === 1 ? 0.42 : 0.2
    } else {
      // 单看指定层：该层全亮，玩家所在层半亮便于定位，其余作幽灵参考
      if (l === layerMode.value) factors[l] = 1.0
      else if (l === pl) factors[l] = 0.5
      else factors[l] = 0.06
    }
  }
  return factors
}

function setLayerMode(m) {
  layerMode.value = m
}

// 立方移动：水平四向（相机相对，受墙阻挡） + 垂直升降层（任意位置可切换，仅受层范围限制）
function moveCube(screenDir) {
  if (!props.isPlaying) return
  if (screenDir === 'ascend') {
    if (cubePlayer.l < cubeLayers - 1) cubePlayer.l++
    return
  }
  if (screenDir === 'descend') {
    if (cubePlayer.l > 0) cubePlayer.l--
    return
  }
  const cell = cubeGrid[cubePlayer.c + cubePlayer.r * cubeCols + cubePlayer.l * cubeCols * cubeRows]
  if (!cell) return
  const dir = maze ? maze.resolveDirection(screenDir) : screenDir
  if (dir === 'up' && !cell.walls.n) cubePlayer.r--
  else if (dir === 'down' && !cell.walls.s) cubePlayer.r++
  else if (dir === 'left' && !cell.walls.w) cubePlayer.c--
  else if (dir === 'right' && !cell.walls.e) cubePlayer.c++
}

// ===== 布鲁斯三维寻路 =====
function activateDog3D() {
  const path = maze3D.findPath3D(
    cubeGrid, cubeCols, cubeRows, cubeLayers,
    cubePlayer.c, cubePlayer.r, cubePlayer.l,
    cubeExit.c, cubeExit.r, cubeExit.l
  )
  if (!path.length) return
  dog3DPath = path
  dog3DPos.x = path[0].c + 0.5
  dog3DPos.y = path[0].l + 0.2
  dog3DPos.z = path[0].r + 0.5
  dog3DPos.idx = 0
  dog3DActive.value = true
}

function updateDog3D(speed) {
  const path = dog3DPath
  if (path.length === 0 || dog3DPos.idx >= path.length) return
  const t = path[dog3DPos.idx]
  const tx = t.c + 0.5
  const ty = t.l + 0.2
  const tz = t.r + 0.5
  const dx = tx - dog3DPos.x
  const dy = ty - dog3DPos.y
  const dz = tz - dog3DPos.z
  const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)
  if (dist < speed) {
    dog3DPos.x = tx; dog3DPos.y = ty; dog3DPos.z = tz
    dog3DPos.idx++
    emitDogPing3D()
  } else {
    dog3DPos.x += (dx / dist) * speed
    dog3DPos.y += (dy / dist) * speed
    dog3DPos.z += (dz / dist) * speed
  }
}

function emitDogPing3D() {
  cubePings.push({
    x: dog3DPos.x, y: dog3DPos.y, z: dog3DPos.z,
    currentR: 0.2, maxR: 2.5, speed: 0.05,
  })
}

// ===== 输入：键盘 + 方向盘 =====
// 把“屏幕方向”换算为当前镜头视角下最贴合的网格移动方向（相机相对操控）：
// 旋转镜头后，按“上”始终是“远离镜头”，而不是固定在世界初始方向。
function moveRelative(screenDir) {
  const dir = maze ? maze.resolveDirection(screenDir) : screenDir
  props.movePlayer(dir)
}

// 按当前关卡类型分发移动
function dispatchMove(screenDir) {
  if (isCube.value) moveCube(screenDir)
  else moveRelative(screenDir)
}

function handleKeydown(e) {
  const k = e.key
  if (k === 'ArrowUp' || k === 'w') dispatchMove('up')
  else if (k === 'ArrowRight' || k === 'd') dispatchMove('right')
  else if (k === 'ArrowDown' || k === 's') dispatchMove('down')
  else if (k === 'ArrowLeft' || k === 'a') dispatchMove('left')
  else if (isCube.value && (k === 'e' || k === 'E' || k === 'PageUp')) moveCube('ascend')
  else if (isCube.value && (k === 'q' || k === 'Q' || k === 'PageDown')) moveCube('descend')
}

function onPadDown(dir) {
  dispatchMove(dir)
  onPadUp()
  // 长按连续移动：每次重复都重新按当前视角换算方向
  padRepeatTimer = setInterval(() => dispatchMove(dir), 180)
}
function onPadUp() {
  if (padRepeatTimer) { clearInterval(padRepeatTimer); padRepeatTimer = null }
}

// 升降层（仅立方关）
function onVertDown(dir) {
  moveCube(dir)
  onVertUp()
  vertRepeatTimer = setInterval(() => moveCube(dir), 220)
}
function onVertUp() {
  if (vertRepeatTimer) { clearInterval(vertRepeatTimer); vertRepeatTimer = null }
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
      if (isCube.value) activateDog3D()
    } else {
      stopDogAudio()
      dog3DActive.value = false
      dog3DPath = []
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
      nextTick(() => isCube.value ? startCubeSession() : startSession())
    } else {
      if (animationId) { cancelAnimationFrame(animationId); animationId = null }
    }
  }
)

onMounted(() => {
  maze = createThreeMaze(mountRef.value)

  // 顶栏“探图模式”轮询的全局函数：
  // 开启后环绕/缩放中心跟随玩家（以玩家为中心），关闭则恢复迷宫全局取景
  window.__isCameraOn = () => followOn.value
  window.__toggleCamera = () => {
    if (!maze) return
    followOn.value = !followOn.value
    maze.setFollowPlayer(followOn.value)
    if (!followOn.value) {
      if (isCube.value) maze.fitCubeCamera()
      else maze.fitCamera()
    }
  }

  window.addEventListener('resize', onResize)
  window.addEventListener('keydown', handleKeydown)

  // 与 2D 版一致：处理“挂载时已在游戏中”（菜单/过渡 → 三维关卡）
  if (props.isPlaying) {
    nextTick(() => isCube.value ? startCubeSession() : startSession())
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
  onVertUp()
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
  --pad: clamp(56px, 16vw, 72px);
  --vpad: clamp(48px, 13vw, 60px);
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

/* 升降层控制（立方关） */
.vpad {
  position: absolute;
  left: 16px;
  bottom: 18px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 3px;
  z-index: 40;
  pointer-events: auto;
}
.vpad .pad-btn {
  position: static;
  width: var(--vpad);
  height: var(--vpad);
  border-color: rgba(76, 175, 80, 0.5);
  color: #4CAF50;
  font-size: clamp(16px, 5vw, 22px);
}
.vpad .pad-btn:active {
  background: rgba(76, 175, 80, 0.3);
  color: #fff;
}
.vpad-label {
  font-size: 10px;
  letter-spacing: 3px;
  color: rgba(76, 175, 80, 0.8);
}

/* 层聚焦选择（立方关） */
.layer-picker {
  position: absolute;
  left: 16px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 5px;
  z-index: 40;
  pointer-events: auto;
}
.lp-label {
  font-size: 10px;
  letter-spacing: 3px;
  color: rgba(255, 255, 255, 0.5);
  margin-bottom: 2px;
}
.layer-btn {
  width: 34px;
  height: 34px;
  border: 1px solid #3a3a3a;
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.05);
  color: #bbb;
  font-size: 14px;
  font-family: inherit;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.2s ease;
  -webkit-tap-highlight-color: transparent;
  padding: 0;
  position: relative;
}
.layer-btn.active {
  border-color: #4CAF50;
  color: #fff;
  background: rgba(76, 175, 80, 0.25);
  box-shadow: 0 0 8px rgba(76, 175, 80, 0.4);
}
/* 玩家当前所在层：右上角小圆点 */
.layer-btn.current::after {
  content: '';
  position: absolute;
  top: 3px;
  right: 3px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #4CAF50;
}

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
