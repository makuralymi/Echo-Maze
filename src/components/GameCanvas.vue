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
})

const emit = defineEmits(['nextLevel', 'menu', 'restart'])

const canvasRef = ref(null)
let ctx = null
let animationId = null
let lastFrameTime = 0
let lastPingTime = 0

const MIN_PEAK_THRESHOLD = 140
const MIN_AVG_THRESHOLD = 15

// ===== 摄像机状态 =====
const camera = {
  x: 0,       // 世界坐标中摄像机焦点 X
  y: 0,       // 世界坐标中摄像机焦点 Y
  zoom: 1.0,  // 缩放 0.5 ~ 2.5
  targetZoom: 1.0,
}
const ZOOM_MIN = 0.5
const ZOOM_MAX = 2.5

function applyCameraTransform(cw, ch) {
  ctx.save()
  ctx.translate(cw / 2, ch / 2)
  ctx.scale(camera.zoom, camera.zoom)
  ctx.translate(-camera.x, -camera.y)
}

function restoreCameraTransform() {
  ctx.restore()
}

function resetCamera(playerWX, playerWY) {
  camera.x = playerWX
  camera.y = playerWY
  camera.zoom = 1.0
  camera.targetZoom = 1.0
}

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

  if (!lastFrameTime) lastFrameTime = timestamp
  const dt = (timestamp - lastFrameTime) / 1000
  lastFrameTime = timestamp

  const w = canvasRef.value.width
  const h = canvasRef.value.height

  // 玩家世界坐标
  const playerWX = props.offsetX + props.player.c * props.cellSize + props.cellSize / 2
  const playerWY = props.offsetY + props.player.r * props.cellSize + props.cellSize / 2
  props.player.drawX = lerp(props.player.drawX, playerWX, 0.3)
  props.player.drawY = lerp(props.player.drawY, playerWY, 0.3)

  // 摄像机平滑跟随
  camera.x = lerp(camera.x, props.player.drawX, 0.08)
  camera.y = lerp(camera.y, props.player.drawY, 0.08)
  camera.zoom = lerp(camera.zoom, camera.targetZoom, 0.12)

  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, w, h)

  applyCameraTransform(w, h)

  // 音频检测
  if (props.getAudioLevels) {
    const { peak, average } = props.getAudioLevels()
    const now = Date.now()
    if (peak > MIN_PEAK_THRESHOLD && average > MIN_AVG_THRESHOLD && now - lastPingTime > 500) {
      props.triggerPing(peak, w, h)
      lastPingTime = now
    }
  }

  // 更新 cell reveal 计时器
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

  restoreCameraTransform()

  // 缩放指示器
  drawZoomHUD(w, h)

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

    if (p.currentR >= p.maxR) {
      pings.splice(i, 1)
    }
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

// 缩放比例提示（HUD）
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
  window.__startLevel?.(1)
}

// ===== 触摸 & 键盘 =====

// 单指：滑动移动玩家
let touchStartX = 0
let touchStartY = 0
let fingerCount = 0

// 双指：捏合缩放
let pinchStartDist = 0
let pinchStartZoom = 1.0
let pinchMidWX = 0  // 捏合中点在世界坐标中的位置
let pinchMidWY = 0

// 双指平移
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
  } else if (fingerCount === 2) {
    // 双指开始：记录初始距离和中点
    const t0 = e.touches[0]
    const t1 = e.touches[1]
    pinchStartDist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY)
    pinchStartZoom = camera.zoom

    const midSX = (t0.clientX + t1.clientX) / 2
    const midSY = (t0.clientY + t1.clientY) / 2
    const world = screenToWorld(midSX, midSY)
    pinchMidWX = world.wx
    pinchMidWY = world.wy

    // 平移初始状态
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
    // 单指：仅 preventDefault（滑动在 touchend 处理）
    if (props.isPlaying) e.preventDefault()
  } else if (fc === 2) {
    e.preventDefault()
    const t0 = e.touches[0]
    const t1 = e.touches[1]
    const newDist = Math.hypot(t1.clientX - t0.clientX, t1.clientY - t0.clientY)

    // 缩放：以捏合中点为锚点
    if (pinchStartDist > 0) {
      const scale = newDist / pinchStartDist
      const newZoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, pinchStartZoom * scale))
      camera.targetZoom = newZoom

      // 即时缩放（不等待 lerp）
      camera.zoom = camera.zoom + (newZoom - camera.zoom) * 0.6
    }

    // 平移：跟随双指中点移动
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
    // 单指滑动结束：移动玩家
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

// 鼠标滚轮缩放（桌面调试）
function handleWheel(e) {
  if (!props.isPlaying) return
  e.preventDefault()

  const rect = canvasRef.value.getBoundingClientRect()
  const sx = e.clientX - rect.left
  const sy = e.clientY - rect.top
  const world = screenToWorld(sx, sy)

  const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1
  const newZoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, camera.zoom * factor))
  camera.targetZoom = newZoom
  camera.zoom = newZoom

  // 以鼠标位置为锚点缩放
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
        // 初始摄像机聚焦玩家起点
        const pw = props.offsetX + props.player.c * props.cellSize + props.cellSize / 2
        const ph = props.offsetY + props.player.r * props.cellSize + props.cellSize / 2
        resetCamera(pw, ph)
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
  if (canvas) {
    canvas.addEventListener('wheel', handleWheel, { passive: false })
  }

  nextTick(() => {
    const canvas = canvasRef.value
    if (canvas) {
      ctx = canvas.getContext('2d')
      resizeCanvas()
      if (props.isPlaying && props.finalizeLevelSetup) {
        props.finalizeLevelSetup(canvas.width, canvas.height)
        const pw = props.offsetX + props.cellSize / 2
        const ph = props.offsetY + props.cellSize / 2
        resetCamera(pw, ph)
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
</style>
