<template>
  <div id="game-container">
    <canvas ref="canvasRef" id="gameCanvas"></canvas>

    <StartScreen
      v-if="gamePhase === 'start'"
      :error="errorMsg"
      :start-microphone="startMicrophone"
      @started="emit('started')"
    />

    <LevelTransition
      v-if="gamePhase === 'transition'"
      :level="currentLevel"
      @next="emit('nextLevel')"
    />

    <VictoryScreen
      v-if="gamePhase === 'victory'"
      @restart="emit('restart')"
    />
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
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
  startMicrophone: Function
})

const emit = defineEmits(['started', 'nextLevel', 'restart'])

const canvasRef = ref(null)
let ctx = null
let animationId = null
let lastFrameTime = 0
let lastPingTime = 0

const MIN_PEAK_THRESHOLD = 140
const MIN_AVG_THRESHOLD = 15

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

  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, canvasRef.value.width, canvasRef.value.height)

  // 音频检测
  if (props.getAudioLevels) {
    const { peak, average } = props.getAudioLevels()
    const now = Date.now()
    if (peak > MIN_PEAK_THRESHOLD && average > MIN_AVG_THRESHOLD && now - lastPingTime > 500) {
      props.triggerPing(peak, canvasRef.value.width, canvasRef.value.height)
      lastPingTime = now
    }
  }

  // 玩家平滑移动
  const targetX = props.offsetX + props.player.c * props.cellSize + props.cellSize / 2
  const targetY = props.offsetY + props.player.r * props.cellSize + props.cellSize / 2
  props.player.drawX = lerp(props.player.drawX, targetX, 0.3)
  props.player.drawY = lerp(props.player.drawY, targetY, 0.3)

  // 更新 cell reveal 计时器
  if (props.grid) {
    props.grid.forEach(cell => {
      if (cell.revealTimer > 0) {
        cell.revealTimer -= dt
      }
    })
  }

  // 渲染声波
  drawPings()

  // 渲染格子
  drawGrid()

  // 渲染玩家
  drawPlayer()

  // 检测胜利
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
    const ringCount = 5
    const ringGap = 8 + p.speed * 0.8

    for (let j = 0; j < ringCount; j++) {
      const r = p.currentR - j * ringGap
      if (r > 0) {
        const ringAlpha = baseAlpha * (1 - (j / ringCount))
        ctx.beginPath()
        ctx.arc(p.x, p.y, r, 0, Math.PI * 2)
        ctx.strokeStyle = `rgba(255, 255, 255, ${ringAlpha})`
        ctx.lineWidth = 1
        ctx.stroke()
      }
    }

    // 碰撞检测：波阵面经过格子时点亮
    const grid = props.grid
    if (grid) {
      grid.forEach(cell => {
        const dx = cell.cx - p.x
        const dy = cell.cy - p.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist <= p.currentR && dist > p.currentR - p.speed * 2) {
          cell.revealTimer = 3.0
        }
      })
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

  grid.forEach(cell => {
    if (cell.revealTimer <= 0) return

    const alpha = Math.min(1, cell.revealTimer / 3.0)
    const x = offsetX + cell.c * cellSize
    const y = offsetY + cell.r * cellSize

    ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`
    ctx.lineWidth = 2
    ctx.lineCap = 'round'

    ctx.beginPath()
    if (cell.walls.top) { ctx.moveTo(x, y); ctx.lineTo(x + cellSize, y) }
    if (cell.walls.right) { ctx.moveTo(x + cellSize, y); ctx.lineTo(x + cellSize, y + cellSize) }
    if (cell.walls.bottom) { ctx.moveTo(x + cellSize, y + cellSize); ctx.lineTo(x, y + cellSize) }
    if (cell.walls.left) { ctx.moveTo(x, y + cellSize); ctx.lineTo(x, y) }
    ctx.stroke()

    // 出口高亮
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
  ctx.arc(player.drawX, player.drawY, cellSize * 0.15, 0, Math.PI * 2)
  ctx.fillStyle = '#ffffff'
  ctx.shadowBlur = 12
  ctx.shadowColor = '#ffffff'
  ctx.fill()
  ctx.shadowBlur = 0
}

// 触摸/键盘事件
let touchStartX = 0
let touchStartY = 0

function handleTouchStart(e) {
  touchStartX = e.changedTouches[0].screenX
  touchStartY = e.changedTouches[0].screenY
}

function handleTouchEnd(e) {
  if (!props.isPlaying) return
  const touchEndX = e.changedTouches[0].screenX
  const touchEndY = e.changedTouches[0].screenY
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

function handleTouchMove(e) {
  if (props.isPlaying) e.preventDefault()
}

function handleKeydown(e) {
  if (e.key === 'ArrowUp' || e.key === 'w') props.movePlayer('up')
  if (e.key === 'ArrowRight' || e.key === 'd') props.movePlayer('right')
  if (e.key === 'ArrowDown' || e.key === 's') props.movePlayer('down')
  if (e.key === 'ArrowLeft' || e.key === 'a') props.movePlayer('left')
}

// 监听 playing 状态变化，启动/停止动画循环
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
  window.addEventListener('touchstart', handleTouchStart)
  window.addEventListener('touchend', handleTouchEnd)
  window.addEventListener('touchmove', handleTouchMove, { passive: false })
  window.addEventListener('keydown', handleKeydown)

  nextTick(() => {
    const canvas = canvasRef.value
    if (canvas) {
      ctx = canvas.getContext('2d')
      resizeCanvas()

      // 如果初始状态就是 playing，直接启动动画
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
  window.removeEventListener('touchend', handleTouchEnd)
  window.removeEventListener('touchmove', handleTouchMove)
  window.removeEventListener('keydown', handleKeydown)
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
}
canvas {
  display: block;
  width: 100%;
  height: 100%;
}
</style>
