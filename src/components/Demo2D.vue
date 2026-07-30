<template>
  <div ref="rootRef" class="demo2d" :class="variant">
    <canvas ref="cA" class="demo-canvas"></canvas>
    <canvas v-if="variant === 'camera'" ref="cB" class="demo-canvas"></canvas>
    <span v-if="variant === 'camera'" class="demo-tag tag-a">固定全局视角</span>
    <span v-if="variant === 'camera'" class="demo-tag tag-b">镜头追踪缩放</span>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue'

const props = defineProps({
  // 'play' = 回声+移动+终点  'camera' = 固定/追踪双视角  'dog' = 布鲁斯寻路
  variant: { type: String, default: 'play' },
})

const rootRef = ref(null)
const cA = ref(null)
const cB = ref(null)

const CELL = 13
const COLS = 11
const ROWS = 11

let raf = null
let running = false
let scene = null
let lastT = 0

// —— 迷宫生成（DFS 回溯） ——
function makeMaze() {
  const cells = []
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      cells.push({
        c, r,
        cx: c * CELL + CELL / 2,
        cy: r * CELL + CELL / 2,
        walls: { top: true, right: true, bottom: true, left: true },
        visited: false,
        revealTimer: 0,
      })
    }
  }
  const idx = (c, r) => r * COLS + c
  const stack = [cells[0]]
  cells[0].visited = true
  while (stack.length) {
    const cur = stack[stack.length - 1]
    const dirs = [
      { dc: 0, dr: -1, w: 'top', ow: 'bottom' },
      { dc: 1, dr: 0, w: 'right', ow: 'left' },
      { dc: 0, dr: 1, w: 'bottom', ow: 'top' },
      { dc: -1, dr: 0, w: 'left', ow: 'right' },
    ]
    // 打乱
    for (let i = dirs.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [dirs[i], dirs[j]] = [dirs[j], dirs[i]]
    }
    let moved = false
    for (const d of dirs) {
      const nc = cur.c + d.dc
      const nr = cur.r + d.dr
      if (nc >= 0 && nc < COLS && nr >= 0 && nr < ROWS && !cells[idx(nc, nr)].visited) {
        cur.walls[d.w] = false
        cells[idx(nc, nr)].walls[d.ow] = false
        cells[idx(nc, nr)].visited = true
        stack.push(cells[idx(nc, nr)])
        moved = true
        break
      }
    }
    if (!moved) stack.pop()
  }
  return cells
}

// —— BFS 路径 起点→终点 ——
function bfsPath(cells) {
  const idx = (c, r) => r * COLS + c
  const visited = new Set(['0,0'])
  const parent = new Map()
  const queue = [{ c: 0, r: 0 }]
  while (queue.length) {
    const cur = queue.shift()
    if (cur.c === COLS - 1 && cur.r === ROWS - 1) break
    const cell = cells[idx(cur.c, cur.r)]
    const dirs = [
      { dc: 0, dr: -1, w: 'top' },
      { dc: 1, dr: 0, w: 'right' },
      { dc: 0, dr: 1, w: 'bottom' },
      { dc: -1, dr: 0, w: 'left' },
    ]
    for (const d of dirs) {
      if (cell.walls[d.w]) continue
      const nc = cur.c + d.dc
      const nr = cur.r + d.dr
      const key = `${nc},${nr}`
      if (!visited.has(key)) {
        visited.add(key)
        parent.set(key, cur)
        queue.push({ c: nc, r: nr })
      }
    }
  }
  const raw = []
  let cur = { c: COLS - 1, r: ROWS - 1 }
  while (cur) {
    raw.push(cur)
    cur = parent.get(`${cur.c},${cur.r}`)
  }
  raw.reverse()
  // 平滑插值
  const smooth = []
  for (let i = 0; i < raw.length - 1; i++) {
    const a = raw[i]
    const b = raw[i + 1]
    for (let s = 0; s < 5; s++) {
      const t = s / 5
      smooth.push({
        x: (a.c + 0.5 + (b.c - a.c) * t) * CELL,
        y: (a.r + 0.5 + (b.r - a.r) * t) * CELL,
      })
    }
  }
  smooth.push({ x: (raw[raw.length - 1].c + 0.5) * CELL, y: (raw[raw.length - 1].r + 0.5) * CELL })
  return smooth
}

function buildScene() {
  const cells = makeMaze()
  const path = bfsPath(cells)
  return {
    cells,
    path,
    pings: [],
    lastPing: 0,
    // 玩家（白）/ 狗（绿）沿平滑路径的浮点进度
    playerI: 0,
    playerX: path[0].x,
    playerY: path[0].y,
    dogI: 0,
    dogX: path[0].x,
    dogY: path[0].y,
    track: { x: COLS * CELL / 2, y: ROWS * CELL / 2, zoom: 1, targetZoom: 2 },
  }
}

function lerp(a, b, t) { return a + (b - a) * t }

function advanceAlongPath(scene, keyI, keyX, keyY, speed, dt) {
  const path = scene.path
  scene[keyI] = (scene[keyI] + speed * dt) % path.length
  const i = Math.floor(scene[keyI]) % path.length
  const j = (i + 1) % path.length
  const f = scene[keyI] - Math.floor(scene[keyI])
  scene[keyX] = lerp(path[i].x, path[j].x, f)
  scene[keyY] = lerp(path[i].y, path[j].y, f)
}

function frame(ts) {
  if (!running) return
  if (!lastT) lastT = ts
  const dt = Math.min(0.05, (ts - lastT) / 1000)
  lastT = ts
  const s = scene
  const v = props.variant

  // 谁在动 / 谁发声
  if (v === 'dog') {
    advanceAlongPath(s, 'dogI', 'dogX', 'dogY', 6, dt)
  } else {
    advanceAlongPath(s, 'playerI', 'playerX', 'playerY', 5, dt)
  }
  const emitX = v === 'dog' ? s.dogX : s.playerX
  const emitY = v === 'dog' ? s.dogY : s.playerY

  // 自动声波
  if (ts - s.lastPing > 900) {
    s.pings.push({ x: emitX, y: emitY, currentR: 0, maxR: CELL * 6, speed: CELL * 5 })
    s.lastPing = ts
  }
  for (let i = s.pings.length - 1; i >= 0; i--) {
    const p = s.pings[i]
    p.currentR += p.speed * dt
    if (p.currentR >= p.maxR) s.pings.splice(i, 1)
  }
  // reveal
  for (const cell of s.cells) {
    let hit = false
    let maxExp = 0
    for (const p of s.pings) {
      const dx = cell.cx - p.x
      const dy = cell.cy - p.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist <= p.currentR) {
        hit = true
        const exp = Math.min(1, (p.currentR - dist) / (CELL * 0.6) + 0.2)
        if (exp > maxExp) maxExp = exp
      }
    }
    if (hit) cell.revealTimer += (maxExp - cell.revealTimer) * Math.min(1, 6 * dt)
    else cell.revealTimer -= 1.0 * dt
    if (cell.revealTimer < 0.001) cell.revealTimer = 0
  }
  // 追踪相机
  s.track.targetZoom = 2.0
  s.track.x = lerp(s.track.x, s.playerX, 0.06)
  s.track.y = lerp(s.track.y, s.playerY, 0.06)
  s.track.zoom = lerp(s.track.zoom, s.track.targetZoom, 0.08)

  if (v === 'camera') {
    draw(cA.value, s, 'fit')
    draw(cB.value, s, 'track')
  } else {
    draw(cA.value, s, 'fit')
  }

  raf = requestAnimationFrame(frame)
}

function draw(canvas, s, viewMode) {
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  const dpr = window.devicePixelRatio || 1
  const W = canvas.clientWidth
  const H = canvas.clientHeight
  if (canvas.width !== Math.round(W * dpr) || canvas.height !== Math.round(H * dpr)) {
    canvas.width = Math.round(W * dpr)
    canvas.height = Math.round(H * dpr)
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  ctx.fillStyle = '#050608'
  ctx.fillRect(0, 0, W, H)
  ctx.save()

  const mw = COLS * CELL
  const mh = ROWS * CELL
  if (viewMode === 'track') {
    ctx.translate(W / 2, H / 2)
    ctx.scale(s.track.zoom, s.track.zoom)
    ctx.translate(-s.track.x, -s.track.y)
  } else {
    const pad = 10
    const sc = Math.min((W - pad * 2) / mw, (H - pad * 2) / mh)
    ctx.translate((W - mw * sc) / 2, (H - mh * sc) / 2)
    ctx.scale(sc, sc)
  }

  // 声波
  for (const p of s.pings) {
    const a = Math.max(0, 1 - p.currentR / p.maxR)
    ctx.beginPath()
    ctx.arc(p.x, p.y, p.currentR, 0, Math.PI * 2)
    ctx.strokeStyle = `rgba(255,255,255,${a * 0.8})`
    ctx.lineWidth = 1.4
    ctx.stroke()
  }

  // 墙
  ctx.lineWidth = 1.4
  ctx.lineCap = 'round'
  for (const cell of s.cells) {
    if (cell.revealTimer <= 0) continue
    const a = Math.min(1, cell.revealTimer)
    const x = cell.c * CELL
    const y = cell.r * CELL
    ctx.strokeStyle = `rgba(255,255,255,${a})`
    ctx.beginPath()
    if (cell.walls.top) { ctx.moveTo(x, y); ctx.lineTo(x + CELL, y) }
    if (cell.walls.right) { ctx.moveTo(x + CELL, y); ctx.lineTo(x + CELL, y + CELL) }
    if (cell.walls.bottom) { ctx.moveTo(x + CELL, y + CELL); ctx.lineTo(x, y + CELL) }
    if (cell.walls.left) { ctx.moveTo(x, y + CELL); ctx.lineTo(x, y) }
    ctx.stroke()
  }

  // 终点
  const ex = (COLS - 1) * CELL
  const ey = (ROWS - 1) * CELL
  const ec = s.cells[ROWS * COLS - 1]
  ctx.fillStyle = `rgba(76,175,80,${0.35 + 0.45 * Math.min(1, ec.revealTimer)})`
  ctx.fillRect(ex + 2, ey + 2, CELL - 4, CELL - 4)

  // 狗路径线（仅 dog 变体）
  if (props.variant === 'dog') {
    const upto = Math.floor(s.dogI)
    ctx.lineWidth = 2
    ctx.lineCap = 'round'
    ctx.strokeStyle = 'rgba(76,175,80,0.5)'
    ctx.beginPath()
    ctx.moveTo(s.path[0].x, s.path[0].y)
    for (let i = 1; i <= upto && i < s.path.length; i++) ctx.lineTo(s.path[i].x, s.path[i].y)
    ctx.lineTo(s.dogX, s.dogY)
    ctx.stroke()
    ctx.setLineDash([4, 5])
    ctx.strokeStyle = 'rgba(76,175,80,0.18)'
    ctx.beginPath()
    ctx.moveTo(s.dogX, s.dogY)
    for (let i = upto + 1; i < s.path.length; i++) ctx.lineTo(s.path[i].x, s.path[i].y)
    ctx.stroke()
    ctx.setLineDash([])
  }

  // 玩家（白）
  if (props.variant !== 'dog') {
    glowDot(ctx, s.playerX, s.playerY, '#ffffff')
  } else {
    // dog 变体里玩家静止在起点
    glowDot(ctx, s.path[0].x, s.path[0].y, 'rgba(255,255,255,0.6)')
  }
  // 狗（绿）
  if (props.variant === 'dog') glowDot(ctx, s.dogX, s.dogY, '#4CAF50')

  ctx.restore()

  if (viewMode === 'track') {
    ctx.fillStyle = 'rgba(255,255,255,0.4)'
    ctx.font = '9px monospace'
    ctx.textAlign = 'right'
    ctx.fillText(`${Math.round(s.track.zoom * 100)}%`, W - 5, H - 4)
  }
}

function glowDot(ctx, x, y, color) {
  ctx.save()
  ctx.shadowBlur = 8
  ctx.shadowColor = color
  ctx.fillStyle = color
  ctx.beginPath()
  ctx.arc(x, y, CELL * 0.2, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}

function start() {
  if (running) return
  scene = buildScene()
  lastT = 0
  running = true
  raf = requestAnimationFrame(frame)
}
function stop() {
  running = false
  if (raf) cancelAnimationFrame(raf)
  raf = null
}

let io = null
onMounted(() => {
  nextTick(() => {
    io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) start()
        else stop()
      }
    }, { threshold: 0.1 })
    if (rootRef.value) io.observe(rootRef.value)
  })
})
onUnmounted(() => {
  stop()
  if (io) io.disconnect()
})
</script>

<style scoped>
.demo2d {
  position: relative;
  display: flex;
  gap: 6px;
  width: 100%;
  border-radius: 10px;
  overflow: hidden;
  background: #050608;
  border: 1px solid rgba(255, 255, 255, 0.08);
}
.demo-canvas {
  flex: 1;
  height: 168px;
  display: block;
  width: 100%;
}
.demo2d.camera .demo-canvas { height: 150px; }
.demo-tag {
  position: absolute;
  bottom: 5px;
  font-size: 9px;
  letter-spacing: 1px;
  color: rgba(255, 255, 255, 0.45);
  pointer-events: none;
}
.tag-a { left: 8px; }
.tag-b { right: 8px; }
</style>
