// 迷宫生成与单元格逻辑
export function useMaze() {
  class Cell {
    constructor(c, r) {
      this.c = c
      this.r = r
      this.walls = { top: true, right: true, bottom: true, left: true }
      this.visited = false
      this.revealTimer = 0
      this.cx = 0
      this.cy = 0
    }
  }

  function createGrid(cols, rows) {
    const grid = []
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        grid.push(new Cell(c, r))
      }
    }
    return grid
  }

  function index(cols, rows, c, r) {
    if (c < 0 || r < 0 || c > cols - 1 || r > rows - 1) return -1
    return c + r * cols
  }

  function generateMaze(grid, cols, rows) {
    // Reset visited
    grid.forEach(cell => { cell.visited = false })

    let current = grid[0]
    current.visited = true
    let stack = [current]

    while (stack.length > 0) {
      let nextOptions = []
      let { c, r } = current
      let top = grid[index(cols, rows, c, r - 1)]
      let right = grid[index(cols, rows, c + 1, r)]
      let bottom = grid[index(cols, rows, c, r + 1)]
      let left = grid[index(cols, rows, c - 1, r)]

      if (top && !top.visited) nextOptions.push({ cell: top, dir: 'top' })
      if (right && !right.visited) nextOptions.push({ cell: right, dir: 'right' })
      if (bottom && !bottom.visited) nextOptions.push({ cell: bottom, dir: 'bottom' })
      if (left && !left.visited) nextOptions.push({ cell: left, dir: 'left' })

      if (nextOptions.length > 0) {
        let nextObj = nextOptions[Math.floor(Math.random() * nextOptions.length)]
        let next = nextObj.cell

        if (nextObj.dir === 'top') { current.walls.top = false; next.walls.bottom = false }
        else if (nextObj.dir === 'right') { current.walls.right = false; next.walls.left = false }
        else if (nextObj.dir === 'bottom') { current.walls.bottom = false; next.walls.top = false }
        else if (nextObj.dir === 'left') { current.walls.left = false; next.walls.right = false }

        next.visited = true
        stack.push(current)
        current = next
      } else {
        current = stack.pop()
      }
    }
  }

  /**
   * 验证从 (0,0) 到 (cols-1, rows-1) 是否可达（BFS）
   * @returns {{ reachable: boolean, count: number }}
   */
  function verifyPaths(grid, cols, rows) {
    const visited = new Set()
    const queue = [0] // 起点 index
    visited.add(0)

    const targetIdx = index(cols, rows, cols - 1, rows - 1)
    let reachableCount = 0

    while (queue.length > 0) {
      const ci = queue.shift()
      reachableCount++
      const cell = grid[ci]
      const c = cell.c
      const r = cell.r

      if (ci === targetIdx) break

      // 四个方向：检查无墙且未访问
      const dirs = [
        { cond: !cell.walls.top,    idx: index(cols, rows, c, r - 1) },
        { cond: !cell.walls.right,  idx: index(cols, rows, c + 1, r) },
        { cond: !cell.walls.bottom, idx: index(cols, rows, c, r + 1) },
        { cond: !cell.walls.left,   idx: index(cols, rows, c - 1, r) },
      ]
      for (const d of dirs) {
        if (d.cond && d.idx !== -1 && !visited.has(d.idx)) {
          visited.add(d.idx)
          queue.push(d.idx)
        }
      }
    }

    return {
      reachable: visited.has(targetIdx),
      count: visited.size
    }
  }

  /**
   * 随机打通一些墙壁，增加多路径，让迷宫不那么"完美"
   * 比例约 totalCells * rate 次尝试
   */
  function addExtraPassages(grid, cols, rows, rate = 0.15) {
    const total = Math.floor(cols * rows * rate)
    for (let i = 0; i < total; i++) {
      const c = Math.floor(Math.random() * (cols - 1))
      const r = Math.floor(Math.random() * (rows - 1))
      const cell = grid[index(cols, rows, c, r)]
      const right = grid[index(cols, rows, c + 1, r)]
      const bottom = grid[index(cols, rows, c, r + 1)]

      // 随机打通右边或下边的墙（非强制，增强探索感）
      if (Math.random() < 0.5 && right && cell.walls.right) {
        cell.walls.right = false
        right.walls.left = false
      }
      if (Math.random() < 0.5 && bottom && cell.walls.bottom) {
        cell.walls.bottom = false
        bottom.walls.top = false
      }
    }
  }

  function updateCellCenters(grid, offsetX, offsetY, cellSize) {
    grid.forEach(cell => {
      cell.cx = offsetX + cell.c * cellSize + cellSize / 2
      cell.cy = offsetY + cell.r * cellSize + cellSize / 2
    })
  }

  return { Cell, createGrid, index, generateMaze, verifyPaths, addExtraPassages, updateCellCenters }
}
