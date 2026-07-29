// 游戏核心状态与逻辑
import { ref, reactive } from 'vue'
import { useMaze } from './useMaze.js'
import { LEVELS, getLevelConfig } from '../config/levelConfig.js'

export function useGame() {
  const { Cell, createGrid, index, generateMaze, verifyPaths, findPath, addExtraPassages, updateCellCenters } = useMaze()

  // 游戏状态
  const isPlaying = ref(false)
  const currentLevel = ref(1)
  const gamePhase = ref('start') // 'start' (title+mic) → 'menu' (level select) → 'playing' → 'transition' → 'victory'

  // 迷宫数据
  const grid = ref([])
  const cols = ref(0)
  const rows = ref(0)

  const player = reactive({ c: 0, r: 0, drawX: 0, drawY: 0 })
  const exitCell = reactive({ c: 0, r: 0 })
  const pings = ref([])

  // ===== 帮帮我布鲁斯：狗狗寻路 =====
  const dogActive = ref(false)
  const dogPath = ref([])         // 完整路径 [{c, r}, ...]
  const dogWorldPath = ref([])    // 世界坐标路径 [{x, y}, ...]
  const dogPos = reactive({ x: 0, y: 0, idx: 0 })  // 当前狗狗位置
  const dogAnimId = ref(0)

  // 绘图参数
  const cellSize = ref(0)
  const offsetX = ref(0)
  const offsetY = ref(0)

  // 进度：已解锁的最高关卡 (1-based, 默认第1关解锁)
  const unlockedLevel = ref(1)

  function calcMazeTransform(canvasWidth, canvasHeight) {
    const padding = canvasWidth > 500 ? 30 : 15
    cellSize.value = Math.floor(Math.min(
      (canvasWidth - padding * 2) / cols.value,
      (canvasHeight - padding * 2) / rows.value
    ))
    offsetX.value = (canvasWidth - cols.value * cellSize.value) / 2
    offsetY.value = (canvasHeight - rows.value * cellSize.value) / 2

    player.drawX = offsetX.value + player.c * cellSize.value + cellSize.value / 2
    player.drawY = offsetY.value + player.r * cellSize.value + cellSize.value / 2
  }

  function loadLevel(level) {
    currentLevel.value = level
    const config = getLevelConfig(level - 1)
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

    const afterExtra = verifyPaths(grid.value, c, r)
    console.log(
      `关卡 ${level} (${c}x${r}) "${config.name}" 验证: ` +
      `可达 ${afterExtra.count}/${c * r} 格 (${afterExtra.reachable ? '√' : '✗'} 出口)`
    )

    player.c = 0
    player.r = 0
    exitCell.c = c - 1
    exitCell.r = r - 1
    pings.value = []
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
    updateCellCenters(grid.value, offsetX.value, offsetY.value, cellSize.value)

    player.drawX = offsetX.value + cellSize.value / 2
    player.drawY = offsetY.value + cellSize.value / 2

    const g = grid.value
    for (let i = 0; i < g.length; i++) {
      if (g[i].c <= 1 && g[i].r <= 1) {
        g[i].revealTimer = 1.0
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

  function movePlayer(dir) {
    if (!isPlaying.value) return
    const currentCell = grid.value[index(cols.value, rows.value, player.c, player.r)]
    if (!currentCell) return

    if (dir === 'up' && !currentCell.walls.top) player.r--
    else if (dir === 'right' && !currentCell.walls.right) player.c++
    else if (dir === 'down' && !currentCell.walls.bottom) player.r++
    else if (dir === 'left' && !currentCell.walls.left) player.c--
  }

  function checkWin() {
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

    // 计算寻路路径
    const path = findPath(
      grid.value, cols.value, rows.value,
      player.c, player.r,
      exitCell.c, exitCell.r
    )

    if (path.length === 0) return

    // 转换为世界坐标路径
    const worldPath = path.map(p => ({
      x: offsetX.value + p.c * cellSize.value + cellSize.value / 2,
      y: offsetY.value + p.r * cellSize.value + cellSize.value / 2,
    }))

    dogPath.value = path
    dogWorldPath.value = worldPath
    dogPos.x = worldPath[0].x
    dogPos.y = worldPath[0].y
    dogPos.idx = 0
    dogAnimId.value++
    dogActive.value = true
  }

  function deactivateDog() {
    dogActive.value = false
    dogPath.value = []
    dogWorldPath.value = []
    dogPos.idx = 0
  }

  function updateDog(speed) {
    if (!dogActive.value || dogWorldPath.value.length === 0) return

    const path = dogWorldPath.value
    let idx = dogPos.idx

    // 向目标点移动
    if (idx >= path.length) {
      // 到达终点，重新开始
      dogPos.idx = 0
      dogPos.x = path[0].x
      dogPos.y = path[0].y
      return
    }

    const target = path[idx]
    const dx = target.x - dogPos.x
    const dy = target.y - dogPos.y
    const dist = Math.sqrt(dx * dx + dy * dy)

    if (dist < speed) {
      // 到达当前节点，移到下一个
      dogPos.x = target.x
      dogPos.y = target.y
      dogPos.idx = idx + 1
    } else {
      // 向目标移动
      dogPos.x += (dx / dist) * speed
      dogPos.y += (dy / dist) * speed

      // 更新当前节点索引
      while (dogPos.idx < path.length) {
        const nextTarget = path[dogPos.idx]
        const ndx = nextTarget.x - dogPos.x
        const ndy = nextTarget.y - dogPos.y
        const nd = Math.sqrt(ndx * ndx + ndy * ndy)
        if (nd < cellSize.value * 0.8) {
          dogPos.idx++
        } else {
          break
        }
      }
    }
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
    // 狗狗
    dogActive,
    dogPath,
    dogWorldPath,
    dogPos,
    dogAnimId,
    activateDog,
    deactivateDog,
    updateDog,
  }
}
