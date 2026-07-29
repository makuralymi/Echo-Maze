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
            <button class="help-btn" @click="showHelp = true">?</button>
          </div>
          <div class="menu-divider"></div>

          <button class="menu-item" @click="handle('levels')">再探前路</button>
          <div class="menu-divider"></div>

          <button class="menu-item danger" @click="handle('home')">迷失</button>

          <button class="close-btn" @click="showMenu = false">继续</button>
        </div>
      </div>

      <!-- 探图模式说明弹窗 -->
      <div v-if="showHelp" class="menu-backdrop" @click="showHelp = false">
        <div class="help-dialog" @click.stop>
          <div class="help-title">探图模式</div>

          <!-- 实时预览 -->
          <div class="preview-row">
            <div class="preview-col">
              <canvas ref="fixedCanvasRef" class="preview-canvas"></canvas>
              <span class="preview-label">固定全局视角</span>
            </div>
            <div class="preview-col">
              <canvas ref="trackingCanvasRef" class="preview-canvas"></canvas>
              <span class="preview-label">镜头追踪缩放</span>
            </div>
          </div>

          <p>
            开启后可使用<span class="highlight">双指缩放</span>与<span class="highlight">平移</span>查看迷宫地图。<br>
            关闭时保持<span class="highlight">固定全局视角</span>，适合小地图。<br>
            你可以在暂停菜单中随时切换。
          </p>
          <button class="close-btn" @click="showHelp = false">知道了</button>
        </div>
      </div>
    </Teleport>
  </div>
</template>

<script setup>
import { ref, computed, watch, onMounted, onUnmounted, nextTick } from 'vue'

const props = defineProps({
  level: { type: Number, required: true },
  total: { type: Number, default: 5 },
  isMicOn: { type: Boolean, default: false },
  gamePhase: { type: String, default: '' },
  dogActive: { type: Boolean, default: false }
})

const emit = defineEmits(['restart', 'levels', 'home', 'toggleCamera', 'helpDog'])

const showMenu = ref(false)
const showHelp = ref(false)
const cameraOn = ref(false)

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

let raf = null
function syncCamera() {
  if (typeof window.__isCameraOn === 'function') {
    cameraOn.value = window.__isCameraOn()
  }
  raf = requestAnimationFrame(syncCamera)
}
onMounted(() => { syncCamera() })
onUnmounted(() => { if (raf) cancelAnimationFrame(raf) })

// ===== 探图模式预览动画 =====
const fixedCanvasRef = ref(null)
const trackingCanvasRef = ref(null)
const MAZE_COLS = 12
const MAZE_ROWS = 12
const CELL = 24
let previewRAF = null
let previewPings = []
let previewLastPing = 0

// 生成一个小型迷宫用于预览
function makePreviewMaze() {
  const cells = []
  // 初始化
  for (let r = 0; r < MAZE_ROWS; r++) {
    for (let c = 0; c < MAZE_COLS; c++) {
      cells.push({
        r, c,
        cx: c * CELL + CELL / 2,
        cy: r * CELL + CELL / 2,
        walls: { top: true, right: true, bottom: true, left: true },
        visited: false,
        revealTimer: 0,
      })
    }
  }
  // DFS 生成迷宫
  function idx(r, c) { return r * MAZE_COLS + c }
  function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]]
    }
    return arr
  }
  const stack = [cells[idx(0, 0)]]
  cells[idx(0, 0)].visited = true
  while (stack.length) {
    const cur = stack[stack.length - 1]
    const dirs = shuffle([
      { dr: -1, dc: 0, w: 'top', ow: 'bottom' },
      { dr: 1, dc: 0, w: 'bottom', ow: 'top' },
      { dr: 0, dc: -1, w: 'left', ow: 'right' },
      { dr: 0, dc: 1, w: 'right', ow: 'left' },
    ])
    let found = false
    for (const d of dirs) {
      const nr = cur.r + d.dr
      const nc = cur.c + d.dc
      if (nr >= 0 && nr < MAZE_ROWS && nc >= 0 && nc < MAZE_COLS) {
        const neighbor = cells[idx(nr, nc)]
        if (!neighbor.visited) {
          cur.walls[d.w] = false
          neighbor.walls[d.ow] = false
          neighbor.visited = true
          stack.push(neighbor)
          found = true
          break
        }
      }
    }
    if (!found) stack.pop()
  }
  return cells
}

function lerpPreview(a, b, t) { return a + (b - a) * t }

let previewState = null

function initPreviewState() {
  const maze = makePreviewMaze()
  const W = MAZE_COLS * CELL
  const H = MAZE_ROWS * CELL
  // BFS 找路径
  function idx(r, c) { return r * MAZE_COLS + c }
  const visited = new Set()
  const parent = new Map()
  const queue = [{ r: 0, c: 0 }]
  visited.add('0,0')
  while (queue.length) {
    const cur = queue.shift()
    if (cur.r === MAZE_ROWS - 1 && cur.c === MAZE_COLS - 1) break
    const cell = maze[idx(cur.r, cur.c)]
    const dirs = [
      { dr: -1, dc: 0, w: 'top' },
      { dr: 1, dc: 0, w: 'bottom' },
      { dr: 0, dc: -1, w: 'left' },
      { dr: 0, dc: 1, w: 'right' },
    ]
    for (const d of dirs) {
      if (!cell.walls[d.w]) {
        const nr = cur.r + d.dr
        const nc = cur.c + d.dc
        const key = `${nr},${nc}`
        if (!visited.has(key)) {
          visited.add(key)
          parent.set(key, cur)
          queue.push({ r: nr, c: nc })
        }
      }
    }
  }
  // 回溯路径：沿 parent 链从终点走到起点，再反转得到从起点到终点的顺序
  const rawPath = []
  let cur = { r: MAZE_ROWS - 1, c: MAZE_COLS - 1 }
  while (cur) {
    rawPath.push(cur)
    const key = `${cur.r},${cur.c}`
    cur = parent.get(key)
  }
  rawPath.reverse() // 现在是起点 → 终点的有序路径

  // 生成平滑路径点（在相邻路径点之间插值）
  const smooth = []
  for (let i = 0; i < rawPath.length - 1; i++) {
    const a = rawPath[i]
    const b = rawPath[i + 1]
    const steps = 5
    for (let s = 0; s < steps; s++) {
      const t = s / steps
      smooth.push({
        x: (a.c + 0.5 + (b.c - a.c) * t) * CELL,
        y: (a.r + 0.5 + (b.r - a.r) * t) * CELL,
      })
    }
  }

  return {
    maze,
    W, H,
    playerX: 0.5 * CELL,
    playerY: 0.5 * CELL,
    path: smooth,
    pathIdx: 0,
    // 追踪视角参数
    trackingView: { x: W / 2, y: H / 2, zoom: 1.0, targetZoom: 1.0 },
  }
}

function startPreviewAnimation() {
  nextTick(() => {
    const fc = fixedCanvasRef.value
    const tc = trackingCanvasRef.value
    if (!fc || !tc) return

    const dpr = window.devicePixelRatio || 1
    const fRect = fc.getBoundingClientRect()
    const tRect = tc.getBoundingClientRect()

    fc.width = fRect.width * dpr
    fc.height = fRect.height * dpr
    tc.width = tRect.width * dpr
    tc.height = tRect.height * dpr

    const fCtx = fc.getContext('2d')
    const tCtx = tc.getContext('2d')
    fCtx.scale(dpr, dpr)
    tCtx.scale(dpr, dpr)

    const FW = fRect.width
    const FH = fRect.height
    const TW = tRect.width
    const TH = tRect.height

    previewState = initPreviewState()
    previewPings = []
    previewLastPing = 0
    let lastT = 0

    function frame(ts) {
      if (!showHelp.value) { previewRAF = null; return }

      const dt = lastT ? (ts - lastT) / 1000 : 0.016
      lastT = ts

      const s = previewState
      // 更新玩家在路径上的位置
      if (s.path.length > 0) {
        s.pathIdx = (s.pathIdx + 0.15) % s.path.length
        const idx = Math.floor(s.pathIdx) % s.path.length
        const next = (idx + 1) % s.path.length
        const frac = s.pathIdx - Math.floor(s.pathIdx)
        s.playerX = lerpPreview(s.path[idx].x, s.path[next].x, frac)
        s.playerY = lerpPreview(s.path[idx].y, s.path[next].y, frac)
      }

      // 模拟声波
      const now = ts
      if (now - previewLastPing > 1400) {
        previewPings.push({
          x: s.playerX, y: s.playerY,
          currentR: 0, maxR: CELL * 5, speed: CELL * 4 / 800,
        })
        previewLastPing = now
      }
      // 更新 ping
      for (let i = previewPings.length - 1; i >= 0; i--) {
        const p = previewPings[i]
        p.currentR += p.speed * (dt * 1000)
        if (p.currentR >= p.maxR) previewPings.splice(i, 1)
      }

      // 更新 revealTimer
      for (const cell of s.maze) {
        let hit = false
        let maxExposure = 0
        for (const p of previewPings) {
          const dx = cell.cx - p.x
          const dy = cell.cy - p.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist <= p.currentR) {
            hit = true
            const exp = Math.min(1, (p.currentR - dist) / (CELL * 0.6) + 0.2)
            if (exp > maxExposure) maxExposure = exp
          }
        }
        if (hit) {
          const target = maxExposure
          cell.revealTimer += (target - cell.revealTimer) * Math.min(1, 6 * dt)
        } else {
          cell.revealTimer -= 1.0 * dt
        }
        if (cell.revealTimer < 0.001) cell.revealTimer = 0
      }

      // 更新追踪视角——跟随玩家，带缩放（模拟镜头追踪）
      s.trackingView.targetZoom = 2.0
      s.trackingView.x = lerpPreview(s.trackingView.x, s.playerX, 0.06)
      s.trackingView.y = lerpPreview(s.trackingView.y, s.playerY, 0.06)
      s.trackingView.zoom = lerpPreview(s.trackingView.zoom, s.trackingView.targetZoom, 0.08)

      // ——— 绘制左侧：固定全局视角 ———
      drawPreviewScene(fCtx, FW, FH, s, 'fixed')
      // ——— 绘制右侧：镜头追踪缩放 ———
      drawPreviewScene(tCtx, TW, TH, s, 'tracking')

      previewRAF = requestAnimationFrame(frame)
    }

    previewRAF = requestAnimationFrame(frame)
  })
}

function drawPreviewScene(ctx, W, H, s, mode) {
  ctx.fillStyle = '#0a0a0a'
  ctx.fillRect(0, 0, W, H)

  ctx.save()

  if (mode === 'tracking') {
    // 应用相机变换——模拟"探图模式"
    ctx.translate(W / 2, H / 2)
    ctx.scale(s.trackingView.zoom, s.trackingView.zoom)
    ctx.translate(-s.trackingView.x, -s.trackingView.y)
  } else {
    // 固定视角——缩放使整个迷宫适配画布
    const pad = 8
    const scaleX = (W - pad * 2) / s.W
    const scaleY = (H - pad * 2) / s.H
    const scale = Math.min(scaleX, scaleY)
    const ox = (W - s.W * scale) / 2
    const oy = (H - s.H * scale) / 2
    ctx.translate(ox, oy)
    ctx.scale(scale, scale)
  }

  // 绘制 ping 声波
  for (const p of previewPings) {
    const baseAlpha = Math.max(0, 1 - p.currentR / p.maxR)
    ctx.beginPath()
    ctx.arc(p.x, p.y, p.currentR, 0, Math.PI * 2)
    ctx.strokeStyle = `rgba(255,255,255,${baseAlpha})`
    ctx.lineWidth = 1.5
    ctx.stroke()
  }

  // 绘制迷宫墙壁
  ctx.lineWidth = 1.5
  ctx.lineCap = 'round'
  for (const cell of s.maze) {
    if (cell.revealTimer <= 0) continue
    const alpha = Math.min(1, cell.revealTimer)
    const x = cell.c * CELL
    const y = cell.r * CELL

    ctx.strokeStyle = `rgba(255,255,255,${alpha})`
    ctx.beginPath()
    if (cell.walls.top) { ctx.moveTo(x, y); ctx.lineTo(x + CELL, y) }
    if (cell.walls.right) { ctx.moveTo(x + CELL, y); ctx.lineTo(x + CELL, y + CELL) }
    if (cell.walls.bottom) { ctx.moveTo(x + CELL, y + CELL); ctx.lineTo(x, y + CELL) }
    if (cell.walls.left) { ctx.moveTo(x, y + CELL); ctx.lineTo(x, y) }
    ctx.stroke()

    // 终点
    if (cell.r === MAZE_ROWS - 1 && cell.c === MAZE_COLS - 1) {
      ctx.fillStyle = `rgba(76,175,80,${alpha * 0.7})`
      ctx.fillRect(x + 3, y + 3, CELL - 6, CELL - 6)
    }
  }

  // 绘制玩家（白色发光圆点）
  ctx.beginPath()
  ctx.arc(s.playerX, s.playerY, CELL * 0.18, 0, Math.PI * 2)
  ctx.fillStyle = '#fff'
  ctx.shadowBlur = 8
  ctx.shadowColor = '#fff'
  ctx.fill()
  ctx.shadowBlur = 0

  // 起点标记
  ctx.fillStyle = `rgba(255,255,255,0.3)`
  ctx.fillRect(1, 1, CELL - 2, CELL - 2)

  ctx.restore()

  // 追踪模式下画右下角缩放指示器
  if (mode === 'tracking' && Math.abs(s.trackingView.zoom - 1.0) > 0.01) {
    const text = `${Math.round(s.trackingView.zoom * 100)}%`
    ctx.fillStyle = 'rgba(255,255,255,0.4)'
    ctx.font = '10px monospace'
    ctx.textAlign = 'right'
    ctx.fillText(text, W - 6, H - 4)
  }
}

// 监听 showHelp 的变化来启动/停止预览
watch(showHelp, (val) => {
  if (val) {
    startPreviewAnimation()
  } else {
    if (previewRAF) {
      cancelAnimationFrame(previewRAF)
      previewRAF = null
    }
    previewState = null
    previewPings = []
  }
})

onUnmounted(() => {
  if (previewRAF) cancelAnimationFrame(previewRAF)
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
