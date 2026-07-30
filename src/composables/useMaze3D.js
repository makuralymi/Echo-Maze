// 三维立方迷宫生成与寻路（纯逻辑，无渲染 / 无 Vue）
//
// 数据模型：cols × rows × layers 的立方格子。每个 Cell3D 有 6 面墙：
//   n(r-1) s(r+1) w(c-1) e(c+1) d(l-1) u(l+1)
// 玩家在真正的三维格子里移动：水平四向 + 上下“升降层”。
// 关卡的解必须穿越不同层，第三维度成为玩法本身，而非视觉装饰。
//
// 坐标约定：格子 (c, r, l) 的中心 → (c+0.5, l, r+0.5)，X=列、Y=层(向上)、Z=行。

export function useMaze3D() {
  class Cell3D {
    constructor(c, r, l) {
      this.c = c
      this.r = r
      this.l = l
      this.walls = { n: true, s: true, w: true, e: true, u: true, d: true }
      this.visited = false
      this.revealTimer = 0
      this.cx = c + 0.5
      this.cy = l
      this.cz = r + 0.5
    }
  }

  function index(cols, rows, c, r, l) {
    if (c < 0 || r < 0 || l < 0) return -1
    return c + r * cols + l * cols * rows
  }

  function createGrid3D(cols, rows, layers) {
    const grid = []
    for (let l = 0; l < layers; l++) {
      for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
          grid.push(new Cell3D(c, r, l))
        }
      }
    }
    return grid
  }

  // 六方向邻居定义（方向名 ↔ 对侧名 ↔ 坐标增量）
  const DIRS = [
    { name: 'n', opp: 's', dc: 0, dr: -1, dl: 0 },
    { name: 's', opp: 'n', dc: 0, dr: 1, dl: 0 },
    { name: 'w', opp: 'e', dc: -1, dr: 0, dl: 0 },
    { name: 'e', opp: 'w', dc: 1, dr: 0, dl: 0 },
    { name: 'd', opp: 'u', dc: 0, dr: 0, dl: -1 },
    { name: 'u', opp: 'd', dc: 0, dr: 0, dl: 1 },
  ]

  // 三维递归回溯生成
  function generateMaze3D(grid, cols, rows, layers) {
    grid.forEach(cell => { cell.visited = false })
    let current = grid[0]
    current.visited = true
    const stack = [current]

    while (stack.length > 0) {
      const { c, r, l } = current
      const options = []
      for (const d of DIRS) {
        const ni = index(cols, rows, c + d.dc, r + d.dr, l + d.dl)
        if (ni !== -1 && !grid[ni].visited) options.push({ cell: grid[ni], dir: d })
      }
      if (options.length > 0) {
        const pick = options[Math.floor(Math.random() * options.length)]
        current.walls[pick.dir.name] = false
        pick.cell.walls[pick.dir.opp] = false
        pick.cell.visited = true
        stack.push(current)
        current = pick.cell
      } else {
        current = stack.pop()
      }
    }
  }

  // BFS 验证 (0,0,0) → (cols-1, rows-1, layers-1) 可达
  function verify3D(grid, cols, rows, layers) {
    const visited = new Set()
    const queue = [0]
    visited.add(0)
    const target = index(cols, rows, cols - 1, rows - 1, layers - 1)
    while (queue.length > 0) {
      const ci = queue.shift()
      if (ci === target) break
      const cell = grid[ci]
      for (const d of DIRS) {
        if (cell.walls[d.name]) continue
        const ni = index(cols, rows, cell.c + d.dc, cell.r + d.dr, cell.l + d.dl)
        if (ni !== -1 && !visited.has(ni)) {
          visited.add(ni)
          queue.push(ni)
        }
      }
    }
    return { reachable: visited.has(target), count: visited.size }
  }

  // 随机多打通一些墙（仅正向三方向，避免重复）
  function addExtraPassages3D(grid, cols, rows, layers, rate = 0.12) {
    const total = Math.floor(cols * rows * layers * rate)
    const fwd = [DIRS[1], DIRS[3], DIRS[5]] // s, e, u
    for (let i = 0; i < total; i++) {
      const c = Math.floor(Math.random() * cols)
      const r = Math.floor(Math.random() * rows)
      const l = Math.floor(Math.random() * layers)
      const d = fwd[Math.floor(Math.random() * fwd.length)]
      const cell = grid[index(cols, rows, c, r, l)]
      const ni = index(cols, rows, c + d.dc, r + d.dr, l + d.dl)
      if (ni !== -1 && cell.walls[d.name]) {
        cell.walls[d.name] = false
        grid[ni].walls[d.opp] = false
      }
    }
  }

  // 强制连通（回退用）：从起点随机游走打通到终点
  function forceConnect3D(grid, cols, rows, layers) {
    let c = 0, r = 0, l = 0
    const maxSteps = cols + rows + layers + 20
    for (let s = 0; s < maxSteps; s++) {
      if (c === cols - 1 && r === rows - 1 && l === layers - 1) break
      const opts = []
      if (c < cols - 1) opts.push({ dc: 1, dr: 0, dl: 0, name: 'e', opp: 'w' })
      if (r < rows - 1) opts.push({ dc: 0, dr: 1, dl: 0, name: 's', opp: 'n' })
      if (l < layers - 1) opts.push({ dc: 0, dr: 0, dl: 1, name: 'u', opp: 'd' })
      if (c > 0) opts.push({ dc: -1, dr: 0, dl: 0, name: 'w', opp: 'e' })
      if (r > 0) opts.push({ dc: 0, dr: -1, dl: 0, name: 'n', opp: 's' })
      if (l > 0) opts.push({ dc: 0, dr: 0, dl: -1, name: 'd', opp: 'u' })
      const p = opts[Math.floor(Math.random() * opts.length)]
      const cur = grid[index(cols, rows, c, r, l)]
      const nxt = grid[index(cols, rows, c + p.dc, r + p.dr, l + p.dl)]
      cur.walls[p.name] = false
      nxt.walls[p.opp] = false
      c += p.dc; r += p.dr; l += p.dl
    }
  }

  // 三维 BFS 寻路
  function findPath3D(grid, cols, rows, layers, sc, sr, sl, ec, er, el) {
    const start = index(cols, rows, sc, sr, sl)
    const end = index(cols, rows, ec, er, el)
    const visited = new Set([start])
    const parent = new Map()
    const queue = [start]
    while (queue.length > 0) {
      const ci = queue.shift()
      if (ci === end) break
      const cell = grid[ci]
      for (const d of DIRS) {
        if (cell.walls[d.name]) continue
        const ni = index(cols, rows, cell.c + d.dc, cell.r + d.dr, cell.l + d.dl)
        if (ni !== -1 && !visited.has(ni)) {
          visited.add(ni)
          parent.set(ni, ci)
          queue.push(ni)
        }
      }
    }
    const path = []
    let cur = end
    while (cur !== undefined) {
      const cell = grid[cur]
      path.unshift({ c: cell.c, r: cell.r, l: cell.l })
      cur = parent.get(cur)
    }
    return path
  }

  return {
    Cell3D,
    createGrid3D,
    index3D: index,
    generateMaze3D,
    verify3D,
    addExtraPassages3D,
    forceConnect3D,
    findPath3D,
  }
}
