<template>
  <div id="game-container">
    <canvas ref="canvasRef" id="gameCanvas"></canvas>

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

    <!-- 第一关进入时的镜头提示 -->
    <div v-if="showCameraHint" class="overlay hint-overlay">
      <h2>探图模式</h2>
      <p>
        本关地图较大，是否需要开启<span class="highlight">镜头追踪与缩放</span>？<br>
        开启后可以双指缩放和平移地图，便于探索。<br>
        你也可以在关卡中通过菜单随时切换。
      </p>
      <button @click="acceptCamera">开启镜头</button>
      <button class="secondary-btn" @click="declineCamera">保持固定视角</button>
    </div>

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
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import LevelMenu from './LevelMenu.vue'
import StartScreen from './StartScreen.vue'
import LevelTransition from './LevelTransition.vue'
import VictoryScreen from './VictoryScreen.vue'

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
  updateDog: Function,
})

const emit = defineEmits(['nextLevel', 'menu', 'restart'])

const canvasRef = ref(null)
let ctx = null
let animationId = null
let lastFrameTime = 0
let lastPingTime = 0

const MIN_PEAK_THRESHOLD = 140
const MIN_AVG_THRESHOLD = 15

// ===== 镜头开关 =====
const cameraEnabled = ref(false)
const showCameraHint = ref(false)

// 镜头状态
const camera = {
  x: 0, y: 0,
  zoom: 1.0,
  targetZoom: 1.0,
}
const ZOOM_MIN = 0.5
const ZOOM_MAX = 2.5
let hadCamera = false // 是否曾经给过提示

function applyCameraTransform(cw, ch) {
  if (!cameraEnabled.value) return
  ctx.save()
  ctx.translate(cw / 2, ch / 2)
  ctx.scale(camera.zoom, camera.zoom)
  ctx.translate(-camera.x, -camera.y)
}

function restoreCameraTransform() {
  if (cameraEnabled.value) ctx.restore()
}

function resetCamera(wx, wy) {
  camera.x = wx
  camera.y = wy
  camera.zoom = 1.0
  camera.targetZoom = 1.0
}

// 镜头提示回调
function acceptCamera() {
  cameraEnabled.value = true
  showCameraHint.value = false
  // 使镜头跟随当前玩家位置
  const wx = props.offsetX + props.player.c * props.cellSize + props.cellSize / 2
  const wy = props.offsetY + props.player.r * props.cellSize + props.cellSize / 2
  resetCamera(wx, wy)
}

function declineCamera() {
  cameraEnabled.value = false
  showCameraHint.value = false
}

// 暴露镜头开关给 TopBar 菜单
window.__toggleCamera = () => {
  cameraEnabled.value = !cameraEnabled.value
  if (cameraEnabled.value) {
    const wx = props.offsetX + props.player.c * props.cellSize + props.cellSize / 2
    const wy = props.offsetY + props.player.r * props.cellSize + props.cellSize / 2
    resetCamera(wx, wy)
  }
}
window.__isCameraOn = () => cameraEnabled.value

function resizeCanvas() {
  const canvas = canvasRef.value
  if (!canvas) return
  const container = canvas.parentElement
  canvas.width = container.clientWidth
  canvas.height = container.clientHeight
  if (props.isPlaying && props.calcMazeTransform) {
    props.calcMazeTransform(canvas.width, canvas.height)
  }
}

function lerp(start, end, amt) {
  return (1 - amt) * start + amt * end
}

function update(timestamp) {
  if (!props.isPlaying) return
  // 镜头提示时暂停游戏更新
  if (showCameraHint.value) return

  if (!lastFrameTime) lastFrameTime = timestamp
  const dt = (timestamp - lastFrameTime) / 1000
  lastFrameTime = timestamp

  const w = canvasRef.value.width
  const h = canvasRef.value.height

  const playerWX = props.offsetX + props.player.c * props.cellSize + props.cellSize / 2
  const playerWY = props.offsetY + props.player.r * props.cellSize + props.cellSize / 2
  props.player.drawX = lerp(props.player.drawX, playerWX, 0.3)
  props.player.drawY = lerp(props.player.drawY, playerWY, 0.3)

  if (cameraEnabled.value) {
    camera.x = lerp(camera.x, props.player.drawX, 0.08)
    camera.y = lerp(camera.y, props.player.drawY, 0.08)
    camera.zoom = lerp(camera.zoom, camera.targetZoom, 0.12)
  }

  // 狗狗移动
  if (props.dogActive && props.updateDog) {
    const dogSpeed = (props.cellSize || 30) * 3.5 * dt
    props.updateDog(dogSpeed)
  }

  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, w, h)

  applyCameraTransform(w, h)

  if (props.getAudioLevels) {
    const { peak, average } = props.getAudioLevels()
    const now = Date.now()
    if (peak > MIN_PEAK_THRESHOLD && average > MIN_AVG_THRESHOLD && now - lastPingTime > 500) {
      props.triggerPing(peak, w, h)
      lastPingTime = now
    }
  }

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

  drawPings()
  drawGrid()
  drawPlayer()
  if (props.dogActive) drawDogPath()
  if (props.dogActive) drawDog()
  restoreCameraTransform()

  if (cameraEnabled.value) drawZoomHUD(w, h)

  if (props.checkWin && props.checkWin()) {
    props.handleLevelComplete()
    return
  }

  animationId = requestAnimationFrame(update)
}

function drawPings() {
  const pings = props.pings
  for (let i = pings.length - 1; i >= 0; i--) {
    const p = pings[i]
    p.currentR += p.speed
    const baseAlpha = Math.max(0, 1 - (p.currentR / p.maxR))
    const outerR = p.currentR
    const innerR = Math.max(0, p.currentR - 20)

    ctx.beginPath()
    ctx.arc(p.x, p.y, outerR, 0, Math.PI * 2)
    ctx.strokeStyle = `rgba(255, 255, 255, ${baseAlpha})`
    ctx.lineWidth = 2
    ctx.stroke()

    if (innerR > 5) {
      ctx.beginPath()
      ctx.arc(p.x, p.y, innerR, 0, Math.PI * 2)
      ctx.strokeStyle = `rgba(255, 255, 255, ${baseAlpha * 0.35})`
      ctx.lineWidth = 1.5
      ctx.stroke()
    }
    if (p.currentR >= p.maxR) pings.splice(i, 1)
  }
}

function drawGrid() {
  const grid = props.grid
  if (!grid) return
  const cellSize = props.cellSize
  const offsetX = props.offsetX
  const offsetY = props.offsetY
  const exitCell = props.exitCell

  ctx.lineWidth = 2
  ctx.lineCap = 'round'

  grid.forEach(cell => {
    if (cell.revealTimer <= 0) return
    const alpha = Math.min(1, cell.revealTimer)
    const x = offsetX + cell.c * cellSize
    const y = offsetY + cell.r * cellSize

    ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`
    ctx.beginPath()
    if (cell.walls.top) { ctx.moveTo(x, y); ctx.lineTo(x + cellSize, y) }
    if (cell.walls.right) { ctx.moveTo(x + cellSize, y); ctx.lineTo(x + cellSize, y + cellSize) }
    if (cell.walls.bottom) { ctx.moveTo(x + cellSize, y + cellSize); ctx.lineTo(x, y + cellSize) }
    if (cell.walls.left) { ctx.moveTo(x, y + cellSize); ctx.lineTo(x, y) }
    ctx.stroke()

    if (cell.c === exitCell.c && cell.r === exitCell.r) {
      ctx.fillStyle = `rgba(76, 175, 80, ${alpha * 0.7})`
      ctx.fillRect(x + 4, y + 4, cellSize - 8, cellSize - 8)
    }
  })
}

function drawPlayer() {
  const player = props.player
  const cellSize = props.cellSize
  ctx.beginPath()
  ctx.arc(player.drawX, player.drawY, cellSize * 0.18, 0, Math.PI * 2)
  ctx.fillStyle = '#ffffff'
  ctx.shadowBlur = 12
  ctx.shadowColor = '#ffffff'
  ctx.fill()
  ctx.shadowBlur = 0
}

function drawDogPath() {
  const path = props.dogWorldPath
  if (!path || path.length < 2) return

  const dogPos = props.dogPos
  const idx = dogPos?.idx || 0

  // 画已走过的路径（发光轨迹）
  ctx.save()
  ctx.strokeStyle = 'rgba(76, 175, 80, 0.4)'
  ctx.lineWidth = 3
  ctx.lineCap = 'round'
  ctx.shadowBlur = 8
  ctx.shadowColor = 'rgba(76, 175, 80, 0.6)'
  ctx.beginPath()
  ctx.moveTo(path[0].x, path[0].y)
  for (let i = 1; i <= idx && i < path.length; i++) {
    ctx.lineTo(path[i].x, path[i].y)
  }
  // 连线到当前狗狗位置
  if (idx < path.length) {
    ctx.lineTo(dogPos.x, dogPos.y)
  }
  ctx.stroke()
  ctx.shadowBlur = 0
  ctx.restore()

  // 画未来路径（虚线效果）
  ctx.save()
  ctx.strokeStyle = 'rgba(76, 175, 80, 0.15)'
  ctx.lineWidth = 2
  ctx.lineCap = 'round'
  ctx.setLineDash([6, 8])
  ctx.beginPath()
  ctx.moveTo(dogPos.x, dogPos.y)
  for (let i = idx + 1; i < path.length; i++) {
    ctx.lineTo(path[i].x, path[i].y)
  }
  ctx.stroke()
  ctx.setLineDash([])
  ctx.restore()

  // 终点高亮标记
  const last = path[path.length - 1]
  ctx.save()
  ctx.fillStyle = 'rgba(76, 175, 80, 0.3)'
  ctx.beginPath()
  ctx.arc(last.x, last.y, (props.cellSize || 30) * 0.25, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

function drawDog() {
  const dogPos = props.dogPos
  // 狗狗用绿色发光点表示
  ctx.save()
  ctx.beginPath()
  ctx.arc(dogPos.x, dogPos.y, (props.cellSize || 30) * 0.14, 0, Math.PI * 2)
  ctx.fillStyle = '#4CAF50'
  ctx.shadowBlur = 14
  ctx.shadowColor = '#4CAF50'
  ctx.fill()
  ctx.shadowBlur = 0
  ctx.restore()
}

function drawZoomHUD(w, h) {
  if (Math.abs(camera.zoom - 1.0) < 0.005) return
  const text = `${Math.round(camera.zoom * 100)}%`
  ctx.fillStyle = 'rgba(255,255,255,0.5)'
  ctx.font = '12px monospace'
  ctx.textAlign = 'right'
  ctx.fillText(text, w - 12, h - 12)
}

// ===== 菜单 / 入口 =====

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

// ===== 触摸 & 键盘 =====

let touchStartX = 0
let touchStartY = 0
let fingerCount = 0

let pinchStartDist = 0
let pinchStartZoom = 1.0
let pinchMidWX = 0
let pinchMidWY = 0
let panStartCamX = 0
let panStartCamY = 0
let panStartMidWX = 0
let panStartMidWY = 0
let isPanning = false

function screenToWorld(sx, sy) {
  const w = canvasRef.value.width
  const h = canvasRef.value.height
  return {
    wx: (sx - w / 2) / camera.zoom + camera.x,
    wy: (sy - h / 2) / camera.zoom + camera.y,
  }
}

function handleTouchStart(e) {
  fingerCount = e.touches.length

  if (fingerCount === 1) {
    touchStartX = e.touches[0].clientX
    touchStartY = e.touches[0].clientY
    isPanning = false
  } else if (fingerCount === 2 && cameraEnabled.value) {
    const t0 = e.touches[0]
    const t1 = e.touches[1]
    pinchStartDist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY)
    pinchStartZoom = camera.zoom

    const midSX = (t0.clientX + t1.clientX) / 2
    const midSY = (t0.clientY + t1.clientY) / 2
    const world = screenToWorld(midSX, midSY)
    pinchMidWX = world.wx
    pinchMidWY = world.wy

    panStartCamX = camera.x
    panStartCamY = camera.y
    panStartMidWX = world.wx
    panStartMidWY = world.wy
    isPanning = true
  }
}

function handleTouchMove(e) {
  const fc = e.touches.length
  if (fc !== fingerCount) return

  if (fc === 1) {
    if (props.isPlaying) e.preventDefault()
  } else if (fc === 2 && cameraEnabled.value) {
    e.preventDefault()
    const t0 = e.touches[0]
    const t1 = e.touches[1]
    const newDist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY)

    if (pinchStartDist > 0) {
      const scale = newDist / pinchStartDist
      const newZoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, pinchStartZoom * scale))
      camera.targetZoom = newZoom
      camera.zoom = camera.zoom + (newZoom - camera.zoom) * 0.6
    }

    const midSX = (t0.clientX + t1.clientX) / 2
    const midSY = (t0.clientY + t1.clientY) / 2
    const world = screenToWorld(midSX, midSY)
    const dx = world.wx - panStartMidWX
    const dy = world.wy - panStartMidWY
    camera.x = panStartCamX - dx
    camera.y = panStartCamY - dy
  }
}

function handleTouchEnd(e) {
  const prevCount = fingerCount
  fingerCount = e.touches.length

  if (prevCount === 1 && props.isPlaying && !isPanning) {
    const touchEndX = e.changedTouches[0].clientX
    const touchEndY = e.changedTouches[0].clientY
    const dx = touchEndX - touchStartX
    const dy = touchEndY - touchStartY

    if (Math.abs(dx) > Math.abs(dy)) {
      if (dx > 30) props.movePlayer('right')
      else if (dx < -30) props.movePlayer('left')
    } else {
      if (dy > 30) props.movePlayer('down')
      else if (dy < -30) props.movePlayer('up')
    }
  }

  if (e.touches.length === 0) {
    pinchStartDist = 0
    isPanning = false
  }
}

function handleKeydown(e) {
  if (e.key === 'ArrowUp' || e.key === 'w') props.movePlayer('up')
  if (e.key === 'ArrowRight' || e.key === 'd') props.movePlayer('right')
  if (e.key === 'ArrowDown' || e.key === 's') props.movePlayer('down')
  if (e.key === 'ArrowLeft' || e.key === 'a') props.movePlayer('left')
}

function handleWheel(e) {
  if (!props.isPlaying || !cameraEnabled.value) return
  e.preventDefault()

  const rect = canvasRef.value.getBoundingClientRect()
  const sx = e.clientX - rect.left
  const sy = e.clientY - rect.top
  const world = screenToWorld(sx, sy)

  const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1
  const newZoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, camera.zoom * factor))
  camera.targetZoom = newZoom
  camera.zoom = newZoom

  const w = canvasRef.value.width
  const h = canvasRef.value.height
  camera.x = world.wx - (sx - w / 2) / newZoom
  camera.y = world.wy - (sy - h / 2) / newZoom
}

watch(
  () => props.isPlaying,
  (val) => {
    if (val) {
      lastFrameTime = 0
      lastPingTime = 0
      nextTick(() => {
        resizeCanvas()
        if (props.finalizeLevelSetup) {
          props.finalizeLevelSetup(canvasRef.value.width, canvasRef.value.height)
        }
        // 第一关且未提示过 → 显示镜头提示
        if (props.currentLevel === 1 && !hadCamera && props.grid.length >= 100) {
          showCameraHint.value = true
          hadCamera = true
        } else {
          // 保持固定视角
          cameraEnabled.value = false
        }
        animationId = requestAnimationFrame(update)
      })
    } else {
      if (animationId) {
        cancelAnimationFrame(animationId)
        animationId = null
      }
    }
  }
)

onMounted(() => {
  window.addEventListener('resize', resizeCanvas)
  window.addEventListener('touchstart', handleTouchStart, { passive: false })
  window.addEventListener('touchmove', handleTouchMove, { passive: false })
  window.addEventListener('touchend', handleTouchEnd)
  window.addEventListener('touchcancel', handleTouchEnd)
  window.addEventListener('keydown', handleKeydown)

  const canvas = canvasRef.value
  if (canvas) canvas.addEventListener('wheel', handleWheel, { passive: false })

  nextTick(() => {
    const canvas = canvasRef.value
    if (canvas) {
      ctx = canvas.getContext('2d')
      resizeCanvas()
      if (props.isPlaying && props.finalizeLevelSetup) {
        props.finalizeLevelSetup(canvas.width, canvas.height)
        animationId = requestAnimationFrame(update)
      }
    }
  })
})

onUnmounted(() => {
  window.removeEventListener('resize', resizeCanvas)
  window.removeEventListener('touchstart', handleTouchStart)
  window.removeEventListener('touchmove', handleTouchMove)
  window.removeEventListener('touchend', handleTouchEnd)
  window.removeEventListener('touchcancel', handleTouchEnd)
  window.removeEventListener('keydown', handleKeydown)
  const canvas = canvasRef.value
  if (canvas) canvas.removeEventListener('wheel', handleWheel)
  if (animationId) cancelAnimationFrame(animationId)
  delete window.__toggleCamera
  delete window.__isCameraOn
})
</script>

<style scoped>
#game-container {
  position: relative;
  width: 100%;
  max-width: 800px;
  flex: 1;
  background-color: #000;
  overflow: hidden;
}
canvas {
  display: block;
  width: 100%;
  height: 100%;
}

/* 镜头提示 */
.hint-overlay {
  position: absolute;
  top: 0; left: 0; width: 100%; height: 100%;
  background-color: rgba(0, 0, 0, 0.92);
  display: flex; flex-direction: column;
  justify-content: center; align-items: center;
  pointer-events: auto; z-index: 25;
  padding: 20px; box-sizing: border-box; text-align: center;
}
.hint-overlay h2 {
  font-size: clamp(20px, 6vw, 26px);
  margin-bottom: 12px;
  letter-spacing: 3px;
}
.hint-overlay p {
  font-size: clamp(12px, 3vw, 14px);
  margin-bottom: 24px;
  line-height: 1.8;
  color: #aaa;
  max-width: 340px;
}
.highlight {
  color: #fff;
  font-weight: bold;
}
.hint-overlay button {
  background-color: transparent;
  color: #fff;
  border: 2px solid #fff;
  padding: 12px 24px;
  font-size: clamp(13px, 3.5vw, 15px);
  font-family: inherit;
  cursor: pointer;
  text-transform: uppercase;
  border-radius: 8px;
  margin-bottom: 10px;
}
.hint-overlay button:active {
  background-color: #fff;
  color: #000;
}
.secondary-btn {
  border-color: #555 !important;
  color: #888 !important;
  font-size: clamp(11px, 3vw, 13px) !important;
  padding: 8px 20px !important;
}
</style>
