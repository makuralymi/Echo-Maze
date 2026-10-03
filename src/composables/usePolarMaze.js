// 极坐标同心环迷宫（Polar Sonar Maze）生成与寻路逻辑
// 数据模型：rings × sectors 的圆环格子。每个 PolarCell 有 4 面墙：
//   in(向心内弧) out(离心外弧) ccw(逆时针径向) cw(顺时针径向)
// 扇区在角度维度自然闭环 (Wrap-around Torus)

export function usePolarMaze() {
  class PolarCell {
    constructor(r, s) {
      this.r = r  // 环索引 (0 到 rings - 1)
      this.s = s  // 扇区索引 (0 到 sectors - 1)
      this.walls = { in: true, out: true, ccw: true, cw: true }
      this.visited = false
      this.revealTimer = 0
      this.cx = 0
      this.cy = 0
      this.r1 = 0
      this.r2 = 0
      this.theta1 = 0
      this.theta2 = 0
    }
  }

  function indexPolar(rings, sectors, r, s) {
    if (r < 0 || r >= rings) return -1
    const wrappedS = ((s % sectors) + sectors) % sectors
    return wrappedS + r * sectors
  }

  function createPolarGrid(rings, sectors) {
    const grid = []
    for (let r = 0; r < rings; r++) {
      for (let s = 0; s < sectors; s++) {
        grid.push(new PolarCell(r, s))
      }
    }
    return grid
  }

  // 四向移动定义：方向名、对侧名、(dr, ds)
  const DIRS = [
    { dir: 'in',  opp: 'out', dr: -1, ds: 0 },
    { dir: 'out', opp: 'in',  dr: 1,  ds: 0 },
    { dir: 'ccw', opp: 'cw',  dr: 0,  ds: -1 },
    { dir: 'cw',  opp: 'ccw', dr: 0,  ds: 1 },
  ]

  /**
   * 极坐标环形递归回溯迷宫生成算法
   */
  function generatePolarMaze(grid, rings, sectors) {
    grid.forEach(cell => { cell.visited = false })

    let current = grid[0]
    current.visited = true
    const stack = [current]

    while (stack.length > 0) {
      const { r, s } = current
      const options = []

      for (const d of DIRS) {
        const nr = r + d.dr
        const ns = s + d.ds
        const ni = indexPolar(rings, sectors, nr, ns)
        if (ni !== -1 && !grid[ni].visited) {
          options.push({ cell: grid[ni], dir: d })
        }
      }

      if (options.length > 0) {
        const pick = options[Math.floor(Math.random() * options.length)]
        current.walls[pick.dir.dir] = false
        pick.cell.walls[pick.dir.opp] = false
        pick.cell.visited = true
        stack.push(current)
        current = pick.cell
      } else {
        current = stack.pop()
      }
    }
  }

  /**
   * 随机打通一些圆弧或射线墙，增加环向回流通道
   */
  function addExtraPassagesPolar(grid, rings, sectors, rate = 0.12) {
    const total = Math.floor(rings * sectors * rate)
    for (let i = 0; i < total; i++) {
      const r = Math.floor(Math.random() * rings)
      const s = Math.floor(Math.random() * sectors)
      const cell = grid[indexPolar(rings, sectors, r, s)]

      // 50% 概率打通外环弧墙（跨环通路）
      if (Math.random() < 0.5 && r < rings - 1 && cell.walls.out) {
        const outerCell = grid[indexPolar(rings, sectors, r + 1, s)]
        cell.walls.out = false
        outerCell.walls.in = false
      }
      // 50% 概率打通顺时针射线墙（同环迂回）
      else if (cell.walls.cw) {
        const cwCell = grid[indexPolar(rings, sectors, r, s + 1)]
        cell.walls.cw = false
        cwCell.walls.ccw = false
      }
    }
  }

  /**
   * BFS 连通性校验
   */
  function verifyPolarPaths(grid, rings, sectors, startR = 0, startS = 0, exitR = rings - 1, exitS = Math.floor(sectors / 2)) {
    const startIdx = indexPolar(rings, sectors, startR, startS)
    const targetIdx = indexPolar(rings, sectors, exitR, exitS)

    const visited = new Set([startIdx])
    const queue = [startIdx]

    while (queue.length > 0) {
      const ci = queue.shift()
      if (ci === targetIdx) break
      const cell = grid[ci]
      const { r, s } = cell

      const neighbors = [
        { cond: !cell.walls.in,  idx: indexPolar(rings, sectors, r - 1, s) },
        { cond: !cell.walls.out, idx: indexPolar(rings, sectors, r + 1, s) },
        { cond: !cell.walls.ccw, idx: indexPolar(rings, sectors, r, s - 1) },
        { cond: !cell.walls.cw,  idx: indexPolar(rings, sectors, r, s + 1) },
      ]

      for (const n of neighbors) {
        if (n.cond && n.idx !== -1 && !visited.has(n.idx)) {
          visited.add(n.idx)
          queue.push(n.idx)
        }
      }
    }

    return {
      reachable: visited.has(targetIdx),
      count: visited.size,
    }
  }

  /**
   * 极坐标单路径 BFS 寻路（布鲁斯小狗专用）
   * 从起点单向直达终点，沿圆弧与径向平滑流动，绝无回头路、绝无重叠！
   */
  function findPolarPath(grid, rings, sectors, startR = 0, startS = 0, exitR = rings - 1, exitS = Math.floor(sectors / 2)) {
    const startIdx = indexPolar(rings, sectors, startR, startS)
    const endIdx = indexPolar(rings, sectors, exitR, exitS)

    const visited = new Set([startIdx])
    const parent = new Map()
    const queue = [startIdx]

    while (queue.length > 0) {
      const ci = queue.shift()
      if (ci === endIdx) break
      const cell = grid[ci]
      const { r, s } = cell

      const neighbors = [
        { cond: !cell.walls.in,  idx: indexPolar(rings, sectors, r - 1, s) },
        { cond: !cell.walls.out, idx: indexPolar(rings, sectors, r + 1, s) },
        { cond: !cell.walls.ccw, idx: indexPolar(rings, sectors, r, s - 1) },
        { cond: !cell.walls.cw,  idx: indexPolar(rings, sectors, r, s + 1) },
      ]

      for (const n of neighbors) {
        if (n.cond && n.idx !== -1 && !visited.has(n.idx)) {
          visited.add(n.idx)
          parent.set(n.idx, ci)
          queue.push(n.idx)
        }
      }
    }

    const path = []
    let cur = endIdx
    if (!visited.has(endIdx)) return []
    while (cur !== undefined) {
      const cell = grid[cur]
      path.unshift({ r: cell.r, s: cell.s })
      cur = parent.get(cur)
    }

    return path
  }

  /**
   * 传送阵配对配置标准色盘
   * 每个传送门对具有统一的代表色与希腊字母代号
   */
  const PORTAL_PAIRS_CONFIG = [
    { pairId: 0, name: 'α', color: '#00e5ff', lightColor: '#b2ebf2', pathColor: '#00e5ff' }, // 量子青蓝
    { pairId: 1, name: 'β', color: '#ffab00', lightColor: '#ffe082', pathColor: '#ffab00' }, // 日珥金橙
    { pairId: 2, name: 'γ', color: '#d500f9', lightColor: '#f8bbd0', pathColor: '#d500f9' }, // 星芒幻紫
  ]

  // 寻路色段颜色：第 0 段为经典翡翠绿，后续各段沿用各传送阵专属色
  const DOG_SEGMENT_COLORS = [
    '#4CAF50', // 第 0 段：翡翠绿（起点出发）
    '#00e5ff', // 第 1 段：量子青蓝（经过 α 门）
    '#ffab00', // 第 2 段：日珥金橙（经过 β 门）
    '#d500f9', // 第 3 段：星芒幻紫（经过 γ 门）
  ]

  /**
   * 极坐标多断层隔离折跃迷宫生成算法（第六幕专享）
   * 支持 1 个或多个断层环 (splitRings)，将迷宫划分为多个绝对物理隔离区：
   * 例如 [3, 6] 将迷宫划分为 Zone 0 (0..2), Zone 1 (3..5), Zone 2 (6..rings-1)
   * 每两个相邻区域之间生成一对专属颜色与代号的传送阵（α门、β门...）
   * 边界环上的所有向心/离心通道全部焊死，常规路径绝对不可跨区，必须且只能按序通过传送阵
   */
  function generatePolarWarpMaze(grid, rings, sectors, splitRingsInput, extraRate = 0.12) {
    const splits = (Array.isArray(splitRingsInput) ? splitRingsInput : [splitRingsInput])
      .map(Number)
      .slice()
      .sort((a, b) => a - b)

    grid.forEach(cell => {
      cell.visited = false
      cell.walls = { in: true, out: true, ccw: true, cw: true }
    })

    // 构造各个隔离区域的起止环：[0, s1-1], [s1, s2-1], [s2, rings-1]...
    const zones = []
    let prevR = 0
    for (let i = 0; i < splits.length; i++) {
      zones.push({ minR: prevR, maxR: splits[i] - 1 })
      prevR = splits[i]
    }
    zones.push({ minR: prevR, maxR: rings - 1 })

    // 独立生成各个区域
    for (let z = 0; z < zones.length; z++) {
      const { minR, maxR } = zones[z]
      // 区域起始搜索点
      const startS = z === zones.length - 1 ? Math.floor(sectors / 2) : 0
      const zStart = grid[indexPolar(rings, sectors, minR, startS)]
      zStart.visited = true
      const stack = [zStart]

      while (stack.length > 0) {
        const current = stack[stack.length - 1]
        const { r, s } = current
        const options = []

        for (const d of DIRS) {
          const nr = r + d.dr
          const ns = s + d.ds
          if (nr >= minR && nr <= maxR) {
            const ni = indexPolar(rings, sectors, nr, ns)
            if (ni !== -1 && !grid[ni].visited) {
              options.push({ cell: grid[ni], dir: d })
            }
          }
        }

        if (options.length > 0) {
          const pick = options[Math.floor(Math.random() * options.length)]
          current.walls[pick.dir.dir] = false
          pick.cell.walls[pick.dir.opp] = false
          pick.cell.visited = true
          stack.push(pick.cell)
        } else {
          stack.pop()
        }
      }

      // 区域内补充回路（严格限制在当前区域内部，绝不越过任何断层边界）
      const zoneRings = maxR - minR + 1
      const extraCount = Math.floor(zoneRings * sectors * extraRate)
      for (let i = 0; i < extraCount; i++) {
        const r = minR + Math.floor(Math.random() * zoneRings)
        const s = Math.floor(Math.random() * sectors)
        const cell = grid[indexPolar(rings, sectors, r, s)]
        if (Math.random() < 0.5 && r < maxR && cell.walls.out) {
          const outerCell = grid[indexPolar(rings, sectors, r + 1, s)]
          cell.walls.out = false
          outerCell.walls.in = false
        } else if (cell.walls.cw) {
          const cwCell = grid[indexPolar(rings, sectors, r, s + 1)]
          cell.walls.cw = false
          cwCell.walls.ccw = false
        }
      }
    }

    // 绝对物理封死所有断层环边界上的向心与离心通道
    for (const split of splits) {
      for (let s = 0; s < sectors; s++) {
        const c1 = grid[indexPolar(rings, sectors, split - 1, s)]
        const c2 = grid[indexPolar(rings, sectors, split, s)]
        if (c1) c1.walls.out = true
        if (c2) c2.walls.in = true
      }
    }

    // 生成传送门对（splits.length 对，每对具备独立颜色与符文）
    const portals = []
    const portalPairs = []

    for (let i = 0; i < splits.length; i++) {
      const split = splits[i]
      const cfg = PORTAL_PAIRS_CONFIG[i % PORTAL_PAIRS_CONFIG.length]

      // 门 A 位于断层内侧 ring = split - 1
      const sA = (Math.floor(sectors / (splits.length + 1)) * (i + 1) + Math.floor(Math.random() * 3)) % sectors
      // 门 B 位于断层外侧 ring = split，角度相对 A 偏移半圈（对跖）
      const sB = (sA + Math.floor(sectors / 2)) % sectors

      const portalA = {
        id: `A${i}`,
        pairId: i,
        r: split - 1,
        s: sA,
        color: cfg.color,
        lightColor: cfg.lightColor,
        pathColor: cfg.pathColor,
        name: cfg.name,
        target: { r: split, s: sB },
      }

      const portalB = {
        id: `B${i}`,
        pairId: i,
        r: split,
        s: sB,
        color: cfg.color,
        lightColor: cfg.lightColor,
        pathColor: cfg.pathColor,
        name: cfg.name,
        target: { r: split - 1, s: sA },
      }

      portals.push(portalA, portalB)
      portalPairs.push({ portalA, portalB })
    }

    // 兼容原单门结构
    const portalA = portals[0]
    const portalB = portals[1]

    return { portals, portalPairs, portalA, portalB, splits }
  }

  /**
   * 极坐标多断层折跃连通性验证：
   * 1. 验证常规物理路径起点至终点 100% 不可达（必须通过传送阵）
   * 2. 验证 起点 -> 门A0 -> 门B0 -> 门A1 -> 门B1 ... -> 终点 100% 链条畅通
   */
  function verifyPolarWarpPaths(grid, rings, sectors, splitRingsInput, portalsInput, startR = 0, startS = 0, exitR = rings - 1, exitS = Math.floor(sectors / 2)) {
    // 兼容入参：若传入的是 portalA, portalB
    let portals = portalsInput
    if (!Array.isArray(portals) && arguments[4] && arguments[5]) {
      portals = [arguments[4], arguments[5]]
    }

    // 1. 无传送阵直达测试（必须不可达）
    const directCheck = verifyPolarPaths(grid, rings, sectors, startR, startS, exitR, exitS)
    const directReachable = directCheck.reachable

    // 2. 传送门链条连通性测试（必须均可达）
    const pairCount = Math.floor(portals.length / 2)
    let warpReachable = true

    let curR = startR
    let curS = startS

    for (let i = 0; i < pairCount; i++) {
      const pA = portals.find(p => p.id === `A${i}`) || portals[i * 2]
      const pB = portals.find(p => p.id === `B${i}`) || portals[i * 2 + 1]
      if (!pA || !pB) {
        warpReachable = false
        break
      }

      // 当前位置到 pA 是否可达
      const stepCheck = verifyPolarPaths(grid, rings, sectors, curR, curS, pA.r, pA.s)
      if (!stepCheck.reachable) {
        warpReachable = false
        break
      }

      // 折跃至 pB
      curR = pB.r
      curS = pB.s
    }

    // 最后一截：最后的 pB 到终点 exit
    if (warpReachable) {
      const exitCheck = verifyPolarPaths(grid, rings, sectors, curR, curS, exitR, exitS)
      if (!exitCheck.reachable) {
        warpReachable = false
      }
    }

    return {
      reachable: !directReachable && warpReachable,
      directReachable,
      warpReachable,
    }
  }

  /**
   * 极坐标多断层折跃寻路（布鲁斯小狗专用）
   * 分段求精：输出带有 segmentIndex 与颜色专属标识的分段路径
   * 第 0 段：起点 -> 门A0 (绿 #4CAF50)
   * 第 1 段：门B0 -> 门A1 (青 #00e5ff)
   * 第 2 段：门B1 -> 终点 (橙 #ffab00)
   * 属于不同区域的环域绝对不相交，节点 100% 唯一，零重叠！
   */
  function findPolarWarpPath(grid, rings, sectors, startR, startS, exitR, exitS, portalsInput, splitRingsInput) {
    let portals = Array.isArray(portalsInput) ? portalsInput : [arguments[7], arguments[8]]
    const splits = (Array.isArray(splitRingsInput) ? splitRingsInput : [splitRingsInput])
      .map(Number)
      .slice()
      .sort((a, b) => a - b)

    // 确认玩家当前处于哪个 Zone
    let playerZone = 0
    for (let i = 0; i < splits.length; i++) {
      if (startR >= splits[i]) playerZone = i + 1
    }

    const segments = []
    let curR = startR
    let curS = startS
    const pairCount = Math.floor(portals.length / 2)

    // 从玩家当前所在的 Zone 开始，按序规划到终点
    for (let i = playerZone; i < pairCount; i++) {
      const pA = portals.find(p => p.id === `A${i}`) || portals[i * 2]
      const pB = portals.find(p => p.id === `B${i}`) || portals[i * 2 + 1]
      if (!pA || !pB) break

      const path = findPolarPath(grid, rings, sectors, curR, curS, pA.r, pA.s)
      segments.push({
        segmentIndex: i,
        color: DOG_SEGMENT_COLORS[i % DOG_SEGMENT_COLORS.length],
        path,
        targetWarp: { r: pB.r, s: pB.s },
      })

      curR = pB.r
      curS = pB.s
    }

    // 最后一截到终点出口
    const finalPath = findPolarPath(grid, rings, sectors, curR, curS, exitR, exitS)
    const finalSegIdx = pairCount
    segments.push({
      segmentIndex: finalSegIdx,
      color: DOG_SEGMENT_COLORS[finalSegIdx % DOG_SEGMENT_COLORS.length],
      path: finalPath,
      targetWarp: null,
    })

    // 兼容原单门结构返回
    const path1 = segments[0]?.path || []
    const path2 = segments[1]?.path || []

    return { segments, path1, path2 }
  }

  /**
   * 更新极坐标格子几何信息与笛卡尔屏幕中心
   */
  function updatePolarCellGeometry(grid, rings, sectors, centerOriginX, centerOriginY, innerRadius, ringWidth, sectorAngle) {
    grid.forEach(cell => {
      const r1 = innerRadius + cell.r * ringWidth
      const r2 = r1 + ringWidth
      const theta1 = cell.s * sectorAngle
      const theta2 = (cell.s + 1) * sectorAngle

      const rMid = (r1 + r2) / 2
      const thetaMid = (theta1 + theta2) / 2

      cell.r1 = r1
      cell.r2 = r2
      cell.theta1 = theta1
      cell.theta2 = theta2
      cell.cx = centerOriginX + rMid * Math.cos(thetaMid)
      cell.cy = centerOriginY + rMid * Math.sin(thetaMid)
    })
  }

  return {
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
    PORTAL_PAIRS_CONFIG,
    DOG_SEGMENT_COLORS,
  }
}
