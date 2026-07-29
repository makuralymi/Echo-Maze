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

  function updateCellCenters(grid, offsetX, offsetY, cellSize) {
    grid.forEach(cell => {
      cell.cx = offsetX + cell.c * cellSize + cellSize / 2
      cell.cy = offsetY + cell.r * cellSize + cellSize / 2
    })
  }

  return { Cell, createGrid, index, generateMaze, updateCellCenters }
}
