<template>
  <div ref="rootRef" class="demo3d">
    <div ref="mountRef" class="demo3d-mount"></div>
    <div v-if="failed" class="demo3d-fallback">
      <span class="fb-glyph">◇</span>
      <span>三维预览需 WebGL 支持</span>
    </div>
    <span class="demo3d-tag">{{ variant === 'cube' ? '立方迷宫 · 多层 / 自由升降 / 层聚焦' : '立体声纳 · 三维环绕 / 球面回声' }}</span>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { createThreeMaze } from '../composables/useThreeMaze.js'
import { useMaze } from '../composables/useMaze.js'
import { useMaze3D } from '../composables/useMaze3D.js'

const props = defineProps({
  variant: { type: String, default: 'plane' }, // 'plane' | 'cube'
})

const rootRef = ref(null)
const mountRef = ref(null)
const failed = ref(false)

let maze = null
let raf = null
let running = false
let inited = false
let lastT = 0
let lastW = 0
let lastH = 0
let io = null

// 驱动状态
let driver = null

const BASELINE = 0.35

function lerp(a, b, t) { return a + (b - a) * t }

function init() {
  if (inited || failed.value || !mountRef.value) return
  try {
    maze = createThreeMaze(mountRef.value)
    if (props.variant === 'cube') setupCube()
    else setupPlane()
    maze.setAutoRotate(true, props.variant === 'cube' ? 0.9 : 1.3)
    inited = true
  } catch (e) {
    console.warn('[Demo3D] init failed', e)
    failed.value = true
    return
  }
}

function setupPlane() {
  const M = useMaze()
  const cols = 7, rows = 7
  let grid, res, attempts = 0
  do {
    grid = M.createGrid(cols, rows)
    M.generateMaze(grid, cols, rows)
    res = M.verifyPaths(grid, cols, rows)
    attempts++
  } while (!res.reachable && attempts < 30)
  M.addExtraPassages(grid, cols, rows, 0.12)

  // 模拟像素空间
  const SIM = 240, pad = 14
  const cellSize = Math.floor((SIM - pad * 2) / Math.max(cols, rows))
  const offsetX = (SIM - cols * cellSize) / 2
  const offsetY = (SIM - rows * cellSize) / 2
  M.updateCellCenters(grid, offsetX, offsetY, cellSize)
  grid.forEach(c => { c.revealTimer = BASELINE })

  const path = M.findPath(grid, cols, rows, 0, 0, cols - 1, rows - 1)
  maze.buildMaze(grid, cols, rows)

  driver = {
    mode: 'plane', grid, cols, rows, cellSize, offsetX, offsetY, path,
    pings: [], lastPing: 0, moveAcc: 0, pi: 0,
    player: { c: 0, r: 0, drawX: offsetX + cellSize / 2, drawY: offsetY + cellSize / 2 },
    exitCell: { c: cols - 1, r: rows - 1 },
  }
}

function setupCube() {
  const M = useMaze3D()
  const cols = 4, rows = 4, layers = 2
  let grid, res, attempts = 0
  do {
    grid = M.createGrid3D(cols, rows, layers)
    M.generateMaze3D(grid, cols, rows, layers)
    res = M.verify3D(grid, cols, rows, layers)
    attempts++
  } while (!res.reachable && attempts < 30)
  M.addExtraPassages3D(grid, cols, rows, layers, 0.12)
  grid.forEach(c => { c.revealTimer = BASELINE })

  const path = M.findPath3D(grid, cols, rows, layers, 0, 0, 0, cols - 1, rows - 1, layers - 1)
  maze.buildCube(grid, cols, rows, layers)

  const focusCycle = ['all', 'live']
  for (let l = 0; l < layers; l++) focusCycle.push(l)

  driver = {
    mode: 'cube', grid, cols, rows, layers, path,
    pings: [], lastPing: 0, moveAcc: 0, pi: 0,
    player: { c: 0, r: 0, l: 0, drawX: 0.5, drawY: 0.2, drawZ: 0.5 },
    focusCycle, focusIdx: 0, focusT: 0,
  }
}

function step(ts) {
  if (!running || !maze) return
  if (!lastT) lastT = ts
  const dt = Math.min(0.05, (ts - lastT) / 1000)
  lastT = ts

  // 尺寸自适应
  const cw = mountRef.value ? mountRef.value.clientWidth : 0
  const ch = mountRef.value ? mountRef.value.clientHeight : 0
  if (cw && ch && (cw !== lastW || ch !== lastH)) { maze.resize(); lastW = cw; lastH = ch }

  try {
    if (driver.mode === 'plane') stepPlane(dt, ts)
    else stepCube(dt, ts)
  } catch (e) {
    console.warn('[Demo3D] step failed', e)
    failed.value = true
    running = false
    return
  }
  raf = requestAnimationFrame(step)
}

function stepPlane(dt, ts) {
  const d = driver
  // 沿路径移动
  d.moveAcc += dt
  if (d.moveAcc > 0.4 && d.pi < d.path.length - 1) {
    d.moveAcc = 0
    d.pi++
    d.player.c = d.path[d.pi].c
    d.player.r = d.path[d.pi].r
    if (d.pi >= d.path.length - 1) d.pi = 0 // 循环
  }
  const tx = d.offsetX + d.player.c * d.cellSize + d.cellSize / 2
  const ty = d.offsetY + d.player.r * d.cellSize + d.cellSize / 2
  d.player.drawX = lerp(d.player.drawX, tx, 0.25)
  d.player.drawY = lerp(d.player.drawY, ty, 0.25)

  // 发声
  if (ts - d.lastPing > 800) {
    d.pings.push({ x: d.player.drawX, y: d.player.drawY, currentR: 2, maxR: d.cellSize * 6, speed: d.cellSize * 4 })
    d.lastPing = ts
  }
  revealPlane(d, dt)

  maze.syncFrame({
    grid: d.grid, pings: d.pings, player: d.player, exitCell: d.exitCell,
    dogActive: false, dogPos: { x: 0, y: 0 }, dogWorldPath: [],
    offsetX: d.offsetX, offsetY: d.offsetY, cellSize: d.cellSize,
  })
}

function revealPlane(d, dt) {
  for (const cell of d.grid) {
    let hit = false, maxExp = 0
    for (const p of d.pings) {
      const dx = cell.cx - p.x, dy = cell.cy - p.y
      const dist = Math.sqrt(dx * dx + dy * dy)
      if (dist <= p.currentR) {
        hit = true
        const exp = Math.min(1, (p.currentR - dist) / (d.cellSize * 0.6) + 0.2)
        if (exp > maxExp) maxExp = exp
      }
    }
    const target = hit ? Math.max(BASELINE, maxExp) : BASELINE
    cell.revealTimer += (target - cell.revealTimer) * Math.min(1, 4 * dt)
  }
  for (let i = d.pings.length - 1; i >= 0; i--) {
    d.pings[i].currentR += d.pings[i].speed * dt
    if (d.pings[i].currentR >= d.pings[i].maxR) d.pings.splice(i, 1)
  }
}

function stepCube(dt, ts) {
  const d = driver
  d.moveAcc += dt
  if (d.moveAcc > 0.55 && d.pi < d.path.length - 1) {
    d.moveAcc = 0
    d.pi++
    d.player.c = d.path[d.pi].c
    d.player.r = d.path[d.pi].r
    d.player.l = d.path[d.pi].l
    if (d.pi >= d.path.length - 1) d.pi = 0
  }
  d.player.drawX = lerp(d.player.drawX, d.player.c + 0.5, 0.25)
  d.player.drawY = lerp(d.player.drawY, d.player.l + 0.2, 0.25)
  d.player.drawZ = lerp(d.player.drawZ, d.player.r + 0.5, 0.25)

  if (ts - d.lastPing > 700) {
    d.pings.push({ x: d.player.drawX, y: d.player.drawY, z: d.player.drawZ, currentR: 0.2, maxR: 5, speed: 3 })
    d.lastPing = ts
  }
  revealCube(d, dt)

  // 循环切换层聚焦，直观展示「全 / 本 / 单层」
  d.focusT += dt
  if (d.focusT > 3) {
    d.focusT = 0
    d.focusIdx = (d.focusIdx + 1) % d.focusCycle.length
  }

  maze.syncCubeFrame({
    grid: d.grid, pings: d.pings, player: d.player,
    dogActive: false, dogPos: { x: 0, y: 0, z: 0 }, dogPath3D: [],
    solo: d.focusCycle[d.focusIdx],
  })
}

function revealCube(d, dt) {
  for (const cell of d.grid) {
    let hit = false, maxExp = 0
    for (const p of d.pings) {
      const dx = cell.cx - p.x, dy = cell.cy - p.y, dz = cell.cz - p.z
      const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)
      if (dist <= p.currentR) {
        hit = true
        const exp = Math.min(1, (p.currentR - dist) / 0.6 + 0.2)
        if (exp > maxExp) maxExp = exp
      }
    }
    const target = hit ? Math.max(BASELINE, maxExp) : BASELINE
    cell.revealTimer += (target - cell.revealTimer) * Math.min(1, 4 * dt)
  }
  for (let i = d.pings.length - 1; i >= 0; i--) {
    d.pings[i].currentR += d.pings[i].speed * dt
    if (d.pings[i].currentR >= d.pings[i].maxR) d.pings.splice(i, 1)
  }
}

function start() {
  if (failed.value) return
  if (!inited) init()
  if (failed.value || !inited) return
  if (running) return
  lastT = 0
  running = true
  raf = requestAnimationFrame(step)
}
function stop() {
  running = false
  if (raf) cancelAnimationFrame(raf)
  raf = null
}

onMounted(() => {
  nextTick(() => {
    io = new IntersectionObserver((entries) => {
      for (const e of entries) {
        if (e.isIntersecting) start()
        else stop()
      }
    }, { threshold: 0.15 })
    if (rootRef.value) io.observe(rootRef.value)
  })
})
onUnmounted(() => {
  stop()
  if (io) io.disconnect()
  if (maze) { maze.dispose(); maze = null }
})
</script>

<style scoped>
.demo3d {
  position: relative;
  width: 100%;
  height: 220px;
  border-radius: 10px;
  overflow: hidden;
  background: radial-gradient(circle at 50% 40%, #0a0f14 0%, #040608 70%);
  border: 1px solid rgba(255, 255, 255, 0.08);
}
.demo3d-mount {
  position: absolute;
  inset: 0;
}
.demo3d-mount :deep(canvas) {
  display: block;
  width: 100% !important;
  height: 100% !important;
}
.demo3d-tag {
  position: absolute;
  left: 8px;
  bottom: 6px;
  font-size: 9px;
  letter-spacing: 1px;
  color: rgba(120, 220, 170, 0.6);
  pointer-events: none;
  text-shadow: 0 0 6px rgba(0, 0, 0, 0.8);
}
.demo3d-fallback {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 6px;
  color: rgba(255, 255, 255, 0.4);
  font-size: 11px;
  letter-spacing: 1px;
}
.fb-glyph {
  font-size: 26px;
  color: rgba(76, 175, 80, 0.5);
  animation: fb-spin 6s linear infinite;
}
@keyframes fb-spin {
  to { transform: rotate(360deg); }
}
</style>
