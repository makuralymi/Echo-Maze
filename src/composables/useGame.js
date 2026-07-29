// 游戏核心状态与逻辑
import { ref, reactive } from 'vue'
import { useMaze } from './useMaze.js'

const LEVEL_CONFIGS = [
  { c: 8, r: 8 },
  { c: 12, r: 12 },
  { c: 16, r: 16 },
  { c: 20, r: 20 },
  { c: 24, r: 24 }
]

const TOTAL_LEVELS = LEVEL_CONFIGS.length

export function useGame() {
  const { Cell, createGrid, index, generateMaze, verifyPaths, addExtraPassages, updateCellCenters } = useMaze()

  // 游戏状态
  const isPlaying = ref(false)
  const currentLevel = ref(1)
  const gamePhase = ref('start') // 'start' | 'playing' | 'transition' | 'victory'

  // 迷宫数据 — 用 ref 包装以保证响应式
  const grid = ref([])
  const cols = ref(0)
  const rows = ref(0)

  const player = reactive({ c: 0, r: 0, drawX: 0, drawY: 0 })
  const exitCell = reactive({ c: 0, r: 0 })
  const pings = ref([])

  // 绘图参数
  const cellSize = ref(0)
  const offsetX = ref(0)
  const offsetY = ref(0)

  function getLevelConfig() {
    return LEVEL_CONFIGS[currentLevel.value - 1]
  }

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
    const config = getLevelConfig()
    cols.value = config.c
    rows.value = config.r

    const c = cols.value
    const r = rows.value

    // 重复生成直到 (0,0) → (c-1,r-1) 可达
    let attempts = 0
    let result
    do {
      grid.value = createGrid(c, r)
      generateMaze(grid.value, c, r)
      result = verifyPaths(grid.value, c, r)
      attempts++
    } while (!result.reachable && attempts < 50)

    if (!result.reachable) {
      console.warn(`关卡 ${level} 无法生成可达路径，回退：连接起点到出口`)
      forceConnect(grid.value, c, r)
      result = verifyPaths(grid.value, c, r)
    }

    // 随机打通额外通道，增加多路径探索感
    const extraRate = 0.08 + level * 0.02  // 越后面越开放
    addExtraPassages(grid.value, c, r, extraRate)

    // 额外通道后再次验证
    const afterExtra = verifyPaths(grid.value, c, r)
    console.log(
      `关卡 ${level} (${c}x${r}) 验证通过: ` +
      `可达 ${afterExtra.count}/${c * r} 格 (${afterExtra.reachable ? '√' : '✗'} 出口)`
    )

    player.c = 0
    player.r = 0

    exitCell.c = c - 1
    exitCell.r = r - 1

    pings.value = []
  }

  /** 兜底：从起点向右下暴力挖通一条路径到出口 */
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

    // 起始区域预亮
    const g = grid.value
    for (let i = 0; i < g.length; i++) {
      if (g[i].c <= 1 && g[i].r <= 1) {
        g[i].revealTimer = 3.0
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
    return currentLevel.value >= TOTAL_LEVELS
  }

  function startGame() {
    gamePhase.value = 'playing'
    isPlaying.value = true
    loadLevel(currentLevel.value)
  }

  function nextLevel() {
    currentLevel.value++
    gamePhase.value = 'playing'
    isPlaying.value = true
    loadLevel(currentLevel.value)
  }

  function restart() {
    currentLevel.value = 1
    gamePhase.value = 'playing'
    isPlaying.value = true
    loadLevel(1)
  }

  function handleLevelComplete() {
    isPlaying.value = false
    if (isLastLevel()) {
      gamePhase.value = 'victory'
    } else {
      gamePhase.value = 'transition'
    }
  }

  return {
    isPlaying,
    currentLevel,
    gamePhase,
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
    startGame,
    nextLevel,
    restart,
    handleLevelComplete
  }
}
