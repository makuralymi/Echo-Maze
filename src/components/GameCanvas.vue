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

  // 更新 cell reveal 计时器（反向累积模式：声波照射时推高，无波时缓慢衰减）
  if (props.grid) {
    const g = props.grid
    const pings = props.pings
    for (let i = 0; i < g.length; i++) {
      const cell = g[i]

      // 检查是否有声波覆盖该格子
      let hit = false
      let maxExposure = 0
      for (let pi = 0; pi < pings.length; pi++) {
        const p = pings[pi]
        const dx = cell.cx - p.x
        const dy = cell.cy - p.y
        const dist = Math.sqrt(dx * dx + dy * dy)
        if (dist <= p.currentR) {
          hit = true
          // 波圈内：根据离波前沿的距离计算曝光度（平滑淡入）
          const exp = Math.min(1, (p.currentR - dist) / (props.cellSize * 0.6) + 0.2)
          if (exp > maxExposure) maxExposure = exp
        }
      }

      if (hit) {
        // 有声波照射：向上推到曝光值（快入）
        const target = maxExposure * 1.0 // 峰值 1 秒
        cell.revealTimer += (target - cell.revealTimer) * Math.min(1, 6.0 * dt)
      } else {
        // 没有声波：缓慢衰减（慢出，1-2秒消失）
        cell.revealTimer -= 1.0 * dt // 约 1 秒从 max 跌到 0
      }

      if (cell.revealTimer < 0.001) cell.revealTimer = 0
    }
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

    // 双层渐变环：外层亮、内层暗，模拟能量向前沿集中
    const outerR = p.currentR
    const innerR = Math.max(0, p.currentR - 20)

    // 外层亮环
    ctx.beginPath()
    ctx.arc(p.x, p.y, outerR, 0, Math.PI * 2)
    ctx.strokeStyle = `rgba(255, 255, 255, ${baseAlpha})`
    ctx.lineWidth = 2
    ctx.stroke()

    // 内层淡环
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

    // revealTimer 直接驱动 alpha，峰值 2 秒对应 alpha 1.0，平滑衰减到 0
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
