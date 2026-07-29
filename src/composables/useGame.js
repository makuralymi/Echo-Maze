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
  const { Cell, createGrid, index, generateMaze, updateCellCenters } = useMaze()

  // 游戏状态
  const isPlaying = ref(false)
  const currentLevel = ref(1)
  const gamePhase = ref('start') // 'start' | 'playing' | 'transition' | 'victory'

  // 迷宫数据
  let grid = []
  let cols = 0
  let rows = 0

  const player = reactive({ c: 0, r: 0, drawX: 0, drawY: 0 })
  const exitCell = reactive({ c: 0, r: 0 })
  const pings = []

  // 绘图参数
  let cellSize = 0
  let offsetX = 0
  let offsetY = 0

  function getLevelConfig() {
    return LEVEL_CONFIGS[currentLevel.value - 1]
  }

  function calcMazeTransform(canvasWidth, canvasHeight) {
    const padding = canvasWidth > 500 ? 30 : 15
    cellSize = Math.floor(Math.min(
      (canvasWidth - padding * 2) / cols,
      (canvasHeight - padding * 2) / rows
    ))
    offsetX = (canvasWidth - cols * cellSize) / 2
    offsetY = (canvasHeight - rows * cellSize) / 2

    player.drawX = offsetX + player.c * cellSize + cellSize / 2
    player.drawY = offsetY + player.r * cellSize + cellSize / 2
  }

  function loadLevel(level) {
    currentLevel.value = level
    const config = getLevelConfig()
    cols = config.c
    rows = config.r

    grid = createGrid(cols, rows)
    generateMaze(grid, cols, rows)

    player.c = 0
    player.r = 0

    exitCell.c = cols - 1
    exitCell.r = rows - 1

    pings.length = 0
  }

  function finalizeLevelSetup(canvasWidth, canvasHeight) {
    calcMazeTransform(canvasWidth, canvasHeight)
    updateCellCenters(grid, offsetX, offsetY, cellSize)

    player.drawX = offsetX + cellSize / 2
    player.drawY = offsetY + cellSize / 2

    // 起始区域预亮
    for (let i = 0; i < grid.length; i++) {
      if (grid[i].c <= 1 && grid[i].r <= 1) {
        grid[i].revealTimer = 3.0
      }
    }
  }

  function triggerPing(peakVolume, canvasWidth, canvasHeight) {
    const maxScreenDist = Math.max(canvasWidth, canvasHeight)
    const MIN_PEAK_THRESHOLD = 140
    const normalized = Math.max(0, Math.min(1, (peakVolume - MIN_PEAK_THRESHOLD) / (255 - MIN_PEAK_THRESHOLD)))
    const intensity = Math.pow(normalized, 2)
    const maxRadius = (cellSize * 1.5) + (maxScreenDist * 0.9 * intensity)

    pings.push({
      x: player.drawX,
      y: player.drawY,
      currentR: 5,
      maxR: maxRadius,
      speed: 4 + (intensity * 4)
    })
  }

  function movePlayer(dir) {
    if (!isPlaying.value) return
    let currentCell = grid[index(cols, rows, player.c, player.r)]
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
    // state
    isPlaying,
    currentLevel,
    gamePhase,
    player,
    exitCell,
    // grid
    grid,
    cols,
    rows,
    pings,
    // transform
    cellSize,
    offsetX,
    offsetY,
    // methods
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
