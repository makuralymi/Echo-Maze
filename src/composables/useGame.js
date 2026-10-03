// 游戏核心状态与逻辑
import { ref, reactive } from 'vue'
import { useMaze } from './useMaze.js'
import { usePolarMaze } from './usePolarMaze.js'
import { playWarpSound } from './useSound.js'
import { LEVELS, getLevelConfig, isLevelPolar, isLevelWarp, isLevelSphere, TOTAL_LEVELS, isLocalTest } from '../config/levelConfig.js'

const POLAR_CARDINALS = [
  { dir: 'up',    ux: 0,  uy: -1 },
  { dir: 'right', ux: 1,  uy: 0 },
  { dir: 'down',  ux: 0,  uy: 1 },
  { dir: 'left',  ux: -1, uy: 0 },
]

/**
 * 极坐标网格全射按键映射求解器 (Surjective Key-to-Passage Solver)
 * 解决极坐标扇形由于几何偏斜导致贪心点积发生“键位碰撞”并孤立某些开放通道的物理缺陷：
 * 在保证通道与按键方向夹角不超过钝角的前提下，求全局最优全射映射，使得该格子所有开放通道 100% 被可输入的按键覆盖。
 */
function solvePolarCellKeyMap(candidates) {
  if (candidates.length === 0) return {}
  if (candidates.length === 1) {
    const map = {}
    for (const k of POLAR_CARDINALS) {
      const score = candidates[0].ux * k.ux + candidates[0].uy * k.uy
      if (score > -0.7) {
        map[k.dir] = candidates[0]
      }
    }
    return map
  }

  const m = candidates.length
  let bestMap = null
  let bestTotalScore = -999

  function search(keyIdx, currentAssignment, coveredSet) {
    if (keyIdx === 4) {
      if (coveredSet.size < m) return
      let totalScore = 0
      for (let i = 0; i < 4; i++) {
        const c = currentAssignment[i]
        const score = c.ux * POLAR_CARDINALS[i].ux + c.uy * POLAR_CARDINALS[i].uy
        totalScore += score
      }
      if (totalScore > bestTotalScore) {
        bestTotalScore = totalScore
        bestMap = { ...currentAssignment }
      }
      return
    }

    const key = POLAR_CARDINALS[keyIdx]
    for (let cIdx = 0; cIdx < m; cIdx++) {
      const c = candidates[cIdx]
      const score = c.ux * key.ux + c.uy * key.uy
      if (score > -0.1) {
        currentAssignment[keyIdx] = c
        const wasCovered = coveredSet.has(cIdx)
        coveredSet.add(cIdx)
        search(keyIdx + 1, currentAssignment, coveredSet)
        if (!wasCovered) coveredSet.delete(cIdx)
      }
    }
  }

  search(0, {}, new Set())

  const result = {}
  if (bestMap) {
    for (let i = 0; i < 4; i++) {
      if (bestMap[i]) {
        const score = bestMap[i].ux * POLAR_CARDINALS[i].ux + bestMap[i].uy * POLAR_CARDINALS[i].uy
        if (score > 0.05) {
          result[POLAR_CARDINALS[i].dir] = bestMap[i]
        }
      }
    }
  } else {
    for (const k of POLAR_CARDINALS) {
      let bestC = null
      let bestS = -999
      for (const c of candidates) {
        const score = c.ux * k.ux + c.uy * k.uy
        if (score > bestS) {
          bestS = score
          bestC = c
        }
      }
      if (bestC && bestS > 0.1) {
        result[k.dir] = bestC
      }
    }
  }

  return result
}

export function useGame() {
  const { Cell, createGrid, index, generateMaze, verifyPaths, findPath, addExtraPassages, updateCellCenters } = useMaze()
  const {
    PolarCell,
    indexPolar,
    createPolarGrid,
    generatePolarMaze,
    generatePolarWarpMaze,
    addExtraPassagesPolar,
    verifyPolarPaths,
    verifyPolarWarpPaths,
    findPolarPath,
    findPolarWarpPath,
    updatePolarCellGeometry,
  } = usePolarMaze()

  // 游戏状态
  const isPlaying = ref(false)
  const currentLevel = ref(1)
  const gamePhase = ref('start') // 'start' (title+mic) → 'menu' (level select) → 'playing' → 'transition' → 'victory'

  // 迷宫数据
  const grid = ref([])
  const cols = ref(0)
  const rows = ref(0)

  // ===== 极坐标迷宫参数 =====
  const isPolarMode = ref(false)
  const rings = ref(0)
  const sectors = ref(0)
  const polarCenter = reactive({ x: 0, y: 0 })
  const polarInnerR = ref(0)
  const polarRingWidth = ref(0)
  const polarSectorAngle = ref(0)

  // ===== 极坐标两点空间折跃传送阵（第六幕：折跃星环） =====
  const portals = ref([])
  const portalCooldown = ref(0)

  // 玩家位置：极坐标下 r=环索引, s=扇区索引；直角坐标下 c=列, r=行
  const player = reactive({ c: 0, r: 0, s: 0, drawX: 0, drawY: 0 })
  const exitCell = reactive({ c: 0, r: 0, s: 0 })
  const pings = ref([])

  // ===== 帮帮我布鲁斯：狗狗寻路 =====
  const dogActive = ref(false)
  const dogPath = ref([])         // 完整路径
  const dogWorldPath = ref([])    // 世界坐标路径 [{x, y}, ...]
  const dogPos = reactive({ x: 0, y: 0, idx: 0 })  // 当前狗狗位置
  const dogAnimId = ref(0)
  const dogUseCount = ref(0)      // 布鲁斯使用次数（持久化）
  const dogAudioMode = ref(null)  // 'dog' | 'dago' | 'dage' | null
  const dogEasterEgg = ref(false) // 触发彩蛋动画
  const dogFinished = ref(false)  // 狗狗到达终点

  // 绘图参数
  const cellSize = ref(0)
  const offsetX = ref(0)
  const offsetY = ref(0)

  // 进度：已解锁的最高关卡 (1-based, 本地调试环境默认全关卡解锁)
  const unlockedLevel = ref(isLocalTest ? TOTAL_LEVELS : 1)

  function calcMazeTransform(canvasWidth, canvasHeight) {
    if (isPolarMode.value) {
      const padding = canvasWidth > 500 ? 30 : 15
      const maxRadius = Math.min(canvasWidth, canvasHeight) / 2 - padding
      polarCenter.x = canvasWidth / 2
      polarCenter.y = canvasHeight / 2
      polarInnerR.value = Math.max(20, maxRadius * 0.12)
      polarRingWidth.value = (maxRadius - polarInnerR.value) / rings.value
      polarSectorAngle.value = (Math.PI * 2) / sectors.value
      cellSize.value = polarRingWidth.value

      const rMid = polarInnerR.value + (player.r + 0.5) * polarRingWidth.value
      const thetaMid = (player.s + 0.5) * polarSectorAngle.value
      player.drawX = polarCenter.x + rMid * Math.cos(thetaMid)
      player.drawY = polarCenter.y + rMid * Math.sin(thetaMid)

      if (grid.value && grid.value.length > 0) {
        updatePolarCellGeometry(
          grid.value,
          rings.value,
          sectors.value,
          polarCenter.x,
          polarCenter.y,
          polarInnerR.value,
          polarRingWidth.value,
          polarSectorAngle.value
        )

        // 同步所有传送阵格子的几何信息与屏幕位置
        if (portals.value.length > 0) {
          portals.value.forEach(p => {
            const cell = grid.value[indexPolar(rings.value, sectors.value, p.r, p.s)]
            if (cell) {
              p.cx = cell.cx
              p.cy = cell.cy
              p.r1 = cell.r1
              p.r2 = cell.r2
              p.theta1 = cell.theta1
              p.theta2 = cell.theta2
            }
          })
        }
      }
    } else {
      const padding = canvasWidth > 500 ? 30 : 15
      cellSize.value = Math.floor(Math.min(
        (canvasWidth - padding * 2) / cols.value,
        (canvasHeight - padding * 2) / rows.value
      ))
      offsetX.value = (canvasWidth - cols.value * cellSize.value) / 2
      offsetY.value = (canvasHeight - rows.value * cellSize.value) / 2

      player.drawX = offsetX.value + player.c * cellSize.value + cellSize.value / 2
      player.drawY = offsetY.value + player.r * cellSize.value + cellSize.value / 2

      if (grid.value && grid.value.length > 0) {
        updateCellCenters(grid.value, offsetX.value, offsetY.value, cellSize.value)
      }
    }
  }

  function loadLevel(level) {
    currentLevel.value = level
    const config = getLevelConfig(level - 1)

    if (isLevelSphere(level - 1)) {
      isPolarMode.value = false
      portals.value = []
      portalCooldown.value = 0
      grid.value = []
      pings.value = []
      return
    }

    if (isLevelPolar(level - 1)) {
      isPolarMode.value = true
      rings.value = config.rings
      sectors.value = config.sectors
      cols.value = config.sectors
      rows.value = config.rings

      if (isLevelWarp(level - 1)) {
        const splits = config.splitRings || [config.splitRing]
        let attempts = 0
        let result
        let generatedPortals
        do {
          grid.value = createPolarGrid(rings.value, sectors.value)
          generatedPortals = generatePolarWarpMaze(grid.value, rings.value, sectors.value, splits, config.extraRate)
          result = verifyPolarWarpPaths(grid.value, rings.value, sectors.value, splits, generatedPortals.portals)
          attempts++
        } while (!result.reachable && attempts < 50)

        portals.value = generatedPortals.portals
        portalCooldown.value = 0
      } else {
        portals.value = []
        portalCooldown.value = 0
        let attempts = 0
        let result
        do {
          grid.value = createPolarGrid(rings.value, sectors.value)
          generatePolarMaze(grid.value, rings.value, sectors.value)
          result = verifyPolarPaths(grid.value, rings.value, sectors.value)
          attempts++
        } while (!result.reachable && attempts < 50)

        addExtraPassagesPolar(grid.value, rings.value, sectors.value, config.extraRate)
      }

      player.r = 0
      player.s = 0
      player.c = 0
      exitCell.r = rings.value - 1
      exitCell.s = Math.floor(sectors.value / 2)
      exitCell.c = exitCell.s
      pings.value = []
    } else {
      portals.value = []
      portalCooldown.value = 0
      isPolarMode.value = false
      cols.value = config.c
      rows.value = config.r

      const c = cols.value
      const r = rows.value

      let attempts = 0
      let result
      do {
        grid.value = createGrid(c, r)
        generateMaze(grid.value, c, r)
        result = verifyPaths(grid.value, c, r)
        attempts++
      } while (!result.reachable && attempts < 50)

      if (!result.reachable) {
        console.warn(`关卡 ${level} 无法生成可达路径，回退：强制连接`)
        forceConnect(grid.value, c, r)
        result = verifyPaths(grid.value, c, r)
      }

      addExtraPassages(grid.value, c, r, config.extraRate)

      player.c = 0
      player.r = 0
      player.s = 0
      exitCell.c = c - 1
      exitCell.r = r - 1
      exitCell.s = 0
      pings.value = []
    }
  }

  function forceConnect(grid, cols, rows) {
    let pc = 0, pr = 0
    const maxSteps = cols + rows + 10
    for (let s = 0; s < maxSteps; s++) {
      if (pc === cols - 1 && pr === rows - 1) break
      const opts = []
      if (pc < cols - 1) opts.push({ c: pc + 1, r: pr, dir: 'right' })
      if (pr < rows - 1) opts.push({ c: pc, r: pr + 1, dir: 'bottom' })
      if (pc > 0) opts.push({ c: pc - 1, r: pr, dir: 'left' })
      if (pr > 0) opts.push({ c: pc, r: pr - 1, dir: 'top' })
      const pick = opts[Math.floor(Math.random() * opts.length)]
      const cur = grid[index(cols, rows, pc, pr)]
      const nxt = grid[index(cols, rows, pick.c, pick.r)]
      if (pick.dir === 'right') { cur.walls.right = false; nxt.walls.left = false }
      else if (pick.dir === 'left') { cur.walls.left = false; nxt.walls.right = false }
      else if (pick.dir === 'bottom') { cur.walls.bottom = false; nxt.walls.top = false }
      else if (pick.dir === 'top') { cur.walls.top = false; nxt.walls.bottom = false }
      pc = pick.c
      pr = pick.r
    }
  }

  function finalizeLevelSetup(canvasWidth, canvasHeight) {
    calcMazeTransform(canvasWidth, canvasHeight)

    const g = grid.value
    if (isPolarMode.value) {
      for (let i = 0; i < g.length; i++) {
        if (g[i].r === 0) {
          g[i].revealTimer = 1.0
        }
      }
    } else {
      for (let i = 0; i < g.length; i++) {
        if (g[i].c <= 1 && g[i].r <= 1) {
          g[i].revealTimer = 1.0
        }
      }
    }
  }

  function triggerPing(peakVolume, canvasWidth, canvasHeight) {
    const maxScreenDist = Math.max(canvasWidth, canvasHeight)
    const MIN_PEAK_THRESHOLD = 140
    const normalized = Math.max(0, Math.min(1, (peakVolume - MIN_PEAK_THRESHOLD) / (255 - MIN_PEAK_THRESHOLD)))
    const intensity = Math.pow(normalized, 2)
    const maxRadius = (cellSize.value * 1.5) + (maxScreenDist * 0.9 * intensity)

    pings.value.push({
      x: player.drawX,
      y: player.drawY,
      currentR: 5,
      maxR: maxRadius,
      speed: 1.5 + (intensity * 2.5)
    })
  }

  function movePlayer(dir, vector = null) {
    if (!isPlaying.value) return

    if (isPolarMode.value) {
      const currentCell = grid.value[indexPolar(rings.value, sectors.value, player.r, player.s)]
      if (!currentCell) return

      // 1. 原生极坐标指令兼容 (in / out / ccw / cw)
      if (dir === 'in') {
        if (!currentCell.walls.in && player.r > 0) {
          player.r--
          finishPolarMove()
        }
        return
      }
      if (dir === 'out') {
        if (!currentCell.walls.out && player.r < rings.value - 1) {
          player.r++
          finishPolarMove()
        }
        return
      }
      if (dir === 'ccw') {
        if (!currentCell.walls.ccw) {
          player.s = (player.s - 1 + sectors.value) % sectors.value
          finishPolarMove()
        }
        return
      }
      if (dir === 'cw') {
        if (!currentCell.walls.cw) {
          player.s = (player.s + 1) % sectors.value
          finishPolarMove()
        }
        return
      }

      // 2. 屏幕空间方向全射求解器（Surjective Screen-Space Directional Solver）
      // 收集当前格子所有开放的候选通道及屏幕空间指向
      const curCx = currentCell.cx
      const curCy = currentCell.cy
      const candidates = []

      // 向心 (in)
      if (player.r > 0 && !currentCell.walls.in) {
        const target = grid.value[indexPolar(rings.value, sectors.value, player.r - 1, player.s)]
        if (target) {
          const dx = target.cx - curCx, dy = target.cy - curCy, len = Math.hypot(dx, dy)
          if (len > 0.001) candidates.push({ r: player.r - 1, s: player.s, ux: dx / len, uy: dy / len })
        }
      }
      // 离心 (out)
      if (player.r < rings.value - 1 && !currentCell.walls.out) {
        const target = grid.value[indexPolar(rings.value, sectors.value, player.r + 1, player.s)]
        if (target) {
          const dx = target.cx - curCx, dy = target.cy - curCy, len = Math.hypot(dx, dy)
          if (len > 0.001) candidates.push({ r: player.r + 1, s: player.s, ux: dx / len, uy: dy / len })
        }
      }
      // 逆时针 (ccw)
      if (!currentCell.walls.ccw) {
        const ns = (player.s - 1 + sectors.value) % sectors.value
        const target = grid.value[indexPolar(rings.value, sectors.value, player.r, ns)]
        if (target) {
          const dx = target.cx - curCx, dy = target.cy - curCy, len = Math.hypot(dx, dy)
          if (len > 0.001) candidates.push({ r: player.r, s: ns, ux: dx / len, uy: dy / len })
        }
      }
      // 顺时针 (cw)
      if (!currentCell.walls.cw) {
        const ns = (player.s + 1) % sectors.value
        const target = grid.value[indexPolar(rings.value, sectors.value, player.r, ns)]
        if (target) {
          const dx = target.cx - curCx, dy = target.cy - curCy, len = Math.hypot(dx, dy)
          if (len > 0.001) candidates.push({ r: player.r, s: ns, ux: dx / len, uy: dy / len })
        }
      }

      if (candidates.length === 0) return

      // 全射求解：确保每一个开放通道都被最贴合的方向键覆盖，杜绝“孤岛通道”
      const keyMap = solvePolarCellKeyMap(candidates)

      let chosenCand = null

      // 判断输入类型：是否为基准按键（键盘 WASD/方向键、虚拟 D-Pad 十字键）
      const isCardinalKey = (dir === 'up' || dir === 'down' || dir === 'left' || dir === 'right') &&
        (!vector || (Math.abs(vector.dx ?? 0) <= 1 && Math.abs(vector.dy ?? 0) <= 1 && ((vector.dx ?? 0) === 0 || (vector.dy ?? 0) === 0)))

      if (isCardinalKey && keyMap[dir]) {
        chosenCand = keyMap[dir]
      } else {
        // 连续二维向量输入（触控滑屏、鼠标点击/拖曳）
        let vx = 0, vy = 0
        const vec = vector || (typeof dir === 'object' && dir !== null ? dir : null)
        if (vec && (vec.dx !== undefined || vec.x !== undefined)) {
          vx = Number(vec.dx ?? vec.x ?? 0)
          vy = Number(vec.dy ?? vec.y ?? 0)
        }
        const vLen = Math.hypot(vx, vy)
        if (vLen > 0.001) {
          const ux = vx / vLen, uy = vy / vLen
          let bestScore = -999
          for (const cand of candidates) {
            const score = cand.ux * ux + cand.uy * uy
            if (score > bestScore) {
              bestScore = score
              chosenCand = cand
            }
          }
          // 若连续向量投影得分偏低（< 0.2），且存在基准方向映射，回退到 keyMap
          if (bestScore < 0.2 && dir && keyMap[dir]) {
            chosenCand = keyMap[dir]
          } else if (bestScore < 0.1) {
            chosenCand = null
          }
        } else if (dir && keyMap[dir]) {
          chosenCand = keyMap[dir]
        }
      }

      if (chosenCand) {
        player.r = chosenCand.r
        player.s = chosenCand.s
        finishPolarMove()
      }
      return
    }

    // 笛卡尔模式（标准关卡 1~20）
    let targetDir = dir
    if (!targetDir && vector) {
      if (Math.abs(vector.dx) > Math.abs(vector.dy)) {
        targetDir = vector.dx > 0 ? 'right' : 'left'
      } else {
        targetDir = vector.dy > 0 ? 'down' : 'up'
      }
    }

    const currentCell = grid.value[index(cols.value, rows.value, player.c, player.r)]
    if (!currentCell) return

    let moved = false
    if (targetDir === 'up' && !currentCell.walls.top) { player.r--; moved = true }
    else if (targetDir === 'right' && !currentCell.walls.right) { player.c++; moved = true }
    else if (targetDir === 'down' && !currentCell.walls.bottom) { player.r++; moved = true }
    else if (targetDir === 'left' && !currentCell.walls.left) { player.c--; moved = true }

    if (!moved) return
    player.drawX = offsetX.value + player.c * cellSize.value + cellSize.value / 2
    player.drawY = offsetY.value + player.r * cellSize.value + cellSize.value / 2
  }

  function checkPolarPortalWarp() {
    if (portals.value.length === 0) return

    // 查找玩家当前所处的传送阵
    const curPortal = portals.value.find(p => p.r === player.r && p.s === player.s)

    if (curPortal && curPortal.target) {
      if (portalCooldown.value === 0) {
        player.r = curPortal.target.r
        player.s = curPortal.target.s
        player.c = player.s
        const rMid = polarInnerR.value + (player.r + 0.5) * polarRingWidth.value
        const thetaMid = (player.s + 0.5) * polarSectorAngle.value
        player.drawX = polarCenter.x + rMid * Math.cos(thetaMid)
        player.drawY = polarCenter.y + rMid * Math.sin(thetaMid)
        portalCooldown.value = 1
        pings.value.push({
          x: player.drawX,
          y: player.drawY,
          currentR: 8,
          maxR: cellSize.value * 4.5,
          speed: 3.5,
        })
        playWarpSound()
      }
    } else {
      portalCooldown.value = 0
    }
  }

  function finishPolarMove() {
    player.c = player.s
    const rMid = polarInnerR.value + (player.r + 0.5) * polarRingWidth.value
    const thetaMid = (player.s + 0.5) * polarSectorAngle.value
    player.drawX = polarCenter.x + rMid * Math.cos(thetaMid)
    player.drawY = polarCenter.y + rMid * Math.sin(thetaMid)
    checkPolarPortalWarp()
  }

  function checkWin() {
    if (isPolarMode.value) {
      return player.r === exitCell.r && player.s === exitCell.s
    }
    return player.c === exitCell.c && player.r === exitCell.r
  }

  function isLastLevel() {
    return currentLevel.value >= LEVELS.length
  }

  function markLevelCleared(level) {
    if (level >= unlockedLevel.value && level < LEVELS.length) {
      unlockedLevel.value = level + 1
    }
  }

  function startLevel(level) {
    currentLevel.value = level
    gamePhase.value = 'playing'
    isPlaying.value = true
    loadLevel(level)
  }

  function nextLevel() {
    const next = currentLevel.value + 1
    markLevelCleared(currentLevel.value)
    currentLevel.value = next
    gamePhase.value = 'playing'
    isPlaying.value = true
    loadLevel(next)
  }

  function restart() {
    currentLevel.value = 1
    gamePhase.value = 'playing'
    isPlaying.value = true
    loadLevel(1)
  }

  function goToMenu() {
    gamePhase.value = 'menu'
    isPlaying.value = false
  }

  // 麦克风就绪后从 start 跳转到菜单
  function goToLevelMenu() {
    gamePhase.value = 'menu'
  }

  function handleLevelComplete() {
    isPlaying.value = false
    dogActive.value = false
    dogPath.value = []
    dogWorldPath.value = []
    dogAudioMode.value = null
    dogFinished.value = false
    dogEasterEgg.value = false
    markLevelCleared(currentLevel.value)
    if (isLastLevel()) {
      gamePhase.value = 'victory'
    } else {
      gamePhase.value = 'transition'
    }
  }

  // ===== 帮帮我布鲁斯 =====
  function activateDog() {
    if (!isPlaying.value) return

    dogUseCount.value++

    // 每第三次使用触发彩蛋
    if (dogUseCount.value % 3 === 0) {
      dogAudioMode.value = 'dago'
      dogEasterEgg.value = true
      return // 先触发彩蛋动画，动画结束后由 easterEggDone() 继续
    }

    // 正常模式：直接开始寻路
    startDogPathfinding()
  }

  function buildPolarSmoothWorldPath(path, segmentIndex = 0, color = '#4CAF50') {
    if (!path || path.length === 0) return []
    const worldPath = []
    for (let i = 0; i < path.length; i++) {
      const cur = path[i]
      const rMid = polarInnerR.value + (cur.r + 0.5) * polarRingWidth.value
      const thetaMid = (cur.s + 0.5) * polarSectorAngle.value
      const pt = {
        x: polarCenter.x + rMid * Math.cos(thetaMid),
        y: polarCenter.y + rMid * Math.sin(thetaMid),
        isWarp: false,
        segmentIndex,
        color,
      }

      if (i === 0) {
        worldPath.push(pt)
      } else {
        const prev = path[i - 1]
        if (prev.r === cur.r && prev.s !== cur.s) {
          let sDiff = cur.s - prev.s
          if (sDiff === -(sectors.value - 1)) sDiff = 1
          else if (sDiff === sectors.value - 1) sDiff = -1

          const prevTheta = (prev.s + 0.5) * polarSectorAngle.value
          const angleStep = (sDiff * polarSectorAngle.value) / 4
          for (let step = 1; step <= 3; step++) {
            const th = prevTheta + angleStep * step
            worldPath.push({
              x: polarCenter.x + rMid * Math.cos(th),
              y: polarCenter.y + rMid * Math.sin(th),
              isWarp: false,
              segmentIndex,
              color,
            })
          }
        }
        worldPath.push(pt)
      }
    }
    return worldPath
  }

  function startDogPathfinding() {
    let path = []
    let worldPath = []

    if (isPolarMode.value) {
      const config = getLevelConfig(currentLevel.value - 1)
      const isWarp = isLevelWarp(currentLevel.value - 1) && portals.value.length >= 2

      if (isWarp) {
        const splits = config.splitRings || [config.splitRing]
        const { segments } = findPolarWarpPath(
          grid.value, rings.value, sectors.value,
          player.r, player.s,
          exitCell.r, exitCell.s,
          portals.value,
          splits
        )

        path = []
        worldPath = []

        for (let segIdx = 0; segIdx < segments.length; segIdx++) {
          const seg = segments[segIdx]
          const segWorldPath = buildPolarSmoothWorldPath(seg.path, seg.segmentIndex, seg.color)
          // 穿越传送阵后首个坐标标记 isWarp: true 触发无缝跃迁
          if (segIdx > 0 && segWorldPath.length > 0) {
            segWorldPath[0].isWarp = true
          }
          path.push(...seg.path)
          worldPath.push(...segWorldPath)
        }
      } else {
        path = findPolarPath(
          grid.value, rings.value, sectors.value,
          player.r, player.s,
          exitCell.r, exitCell.s
        )
        worldPath = buildPolarSmoothWorldPath(path, 0, '#4CAF50')
      }
    } else {
      path = findPath(
        grid.value, cols.value, rows.value,
        player.c, player.r,
        exitCell.c, exitCell.r
      )
      if (path && path.length > 0) {
        worldPath = path.map(p => ({
          x: offsetX.value + p.c * cellSize.value + cellSize.value / 2,
          y: offsetY.value + p.r * cellSize.value + cellSize.value / 2,
          isWarp: false,
          segmentIndex: 0,
          color: '#4CAF50',
        }))
      }
    }

    if (!path || path.length === 0 || !worldPath || worldPath.length === 0) return

    dogPath.value = path
    dogWorldPath.value = worldPath
    dogPos.x = worldPath[0].x
    dogPos.y = worldPath[0].y
    dogPos.idx = 0
    dogAnimId.value++
    dogFinished.value = false
    dogActive.value = true

    // 设置音频模式
    if (dogAudioMode.value !== 'dage') {
      dogAudioMode.value = 'dog'
    }
  }

  function easterEggDone() {
    dogEasterEgg.value = false
    // 彩蛋动画结束后使用 dage 音频寻路
    dogAudioMode.value = 'dage'
    startDogPathfinding()
  }

  function deactivateDog() {
    dogActive.value = false
    dogPath.value = []
    dogWorldPath.value = []
    dogPos.idx = 0
    dogAudioMode.value = null
    dogFinished.value = false
  }

  function updateDog(speed) {
    if (!dogActive.value || dogWorldPath.value.length === 0) return

    const path = dogWorldPath.value
    let idx = dogPos.idx

    // 到达终点，停止
    if (idx >= path.length) {
      dogFinished.value = true
      return
    }

    const target = path[idx]
    if (target.isWarp) {
      dogPos.x = target.x
      dogPos.y = target.y
      dogPos.idx = idx + 1
      triggerDogPing()
      return
    }
    const dx = target.x - dogPos.x
    const dy = target.y - dogPos.y
    const dist = Math.sqrt(dx * dx + dy * dy)

    if (dist < speed) {
      // 到达当前节点，移到下一个
      dogPos.x = target.x
      dogPos.y = target.y
      dogPos.idx = idx + 1

      // 每到路径节点发出微弱声波（狗狗叫声）
      triggerDogPing()
    } else {
      // 向目标移动
      dogPos.x += (dx / dist) * speed
      dogPos.y += (dy / dist) * speed

      // 更新当前节点索引
      while (dogPos.idx < path.length) {
        const nextTarget = path[dogPos.idx]
        if (nextTarget.isWarp) {
          dogPos.idx++
          break
        }
        const ndx = nextTarget.x - dogPos.x
        const ndy = nextTarget.y - dogPos.y
        const nd = Math.sqrt(ndx * ndx + ndy * ndy)
        if (nd < cellSize.value * 0.8) {
          dogPos.idx++
          triggerDogPing()
        } else {
          break
        }
      }
    }
  }

  // 狗狗微弱声波
  function triggerDogPing() {
    pings.value.push({
      x: dogPos.x,
      y: dogPos.y,
      currentR: 5,
      maxR: cellSize.value * 2.5,
      speed: 0.8
    })
  }

  return {
    isPlaying,
    currentLevel,
    gamePhase,
    unlockedLevel,
    player,
    exitCell,
    grid,
    cols,
    rows,
    pings,
    cellSize,
    offsetX,
    offsetY,
    calcMazeTransform,
    loadLevel,
    finalizeLevelSetup,
    triggerPing,
    movePlayer,
    checkWin,
    isLastLevel,
    markLevelCleared,
    startLevel,
    nextLevel,
    restart,
    goToMenu,
    goToLevelMenu,
    handleLevelComplete,
    // 极坐标参数
    isPolarMode,
    rings,
    sectors,
    polarCenter,
    polarInnerR,
    polarRingWidth,
    polarSectorAngle,
    // 极坐标传送阵
    portals,
    portalCooldown,
    // 狗狗
    dogActive,
    dogPath,
    dogWorldPath,
    dogPos,
    dogAnimId,
    dogEasterEgg,
    dogFinished,
    dogAudioMode,
    activateDog,
    deactivateDog,
    easterEggDone,
    updateDog,
  }
}
