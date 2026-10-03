// 三维归一化立方球体迷宫逻辑与寻路 (useSphereMaze)
// 6 个主面映射法向量投影至三维球体，无极点畸变与奇点，具有 100% 互逆拓扑对称性。
import * as THREE from 'three'

export function useSphereMaze() {
  class SphereCell {
    constructor(f, u, v, N, R = 10) {
      this.f = f // 面索引: 0:+Z, 1:-Z, 2:+X, 3:-X, 4:+Y, 5:-Y
      this.u = u // 0 .. N-1
      this.v = v // 0 .. N-1
      this.walls = { n: true, s: true, w: true, e: true }
      this.visited = false
      this.revealTimer = 0

      const p = cellToSphere(f, u, v, N, R)
      this.x = p.x
      this.y = p.y
      this.z = p.z
      const norm = p.clone().normalize()
      this.nx = norm.x
      this.ny = norm.y
      this.nz = norm.z
    }
  }

  function indexSphere(N, f, u, v) {
    if (f < 0 || f >= 6 || u < 0 || u >= N || v < 0 || v >= N) return -1
    return f * N * N + v * N + u
  }

  function cellToCube(face, u, v, N) {
    const su = (2 * (u + 0.5) / N) - 1
    const sv = 1 - (2 * (v + 0.5) / N) // v=0 is top (+y), v=N-1 is bottom (-y)
    switch (face) {
      case 0: return new THREE.Vector3(su, sv, 1)   // +Z Front
      case 1: return new THREE.Vector3(-su, sv, -1) // -Z Back
      case 2: return new THREE.Vector3(1, sv, -su)  // +X Right
      case 3: return new THREE.Vector3(-1, sv, su)  // -X Left
      case 4: return new THREE.Vector3(su, 1, -sv)  // +Y Top
      case 5: return new THREE.Vector3(su, -1, sv)  // -Y Bottom
    }
  }

  function cellToSphere(face, u, v, N, R = 10) {
    const p = cellToCube(face, u, v, N)
    return p.normalize().multiplyScalar(R)
  }

  function pointOnFaceToSphere(face, su, sv, R = 10) {
    let p
    switch (face) {
      case 0: p = new THREE.Vector3(su, sv, 1); break
      case 1: p = new THREE.Vector3(-su, sv, -1); break
      case 2: p = new THREE.Vector3(1, sv, -su); break
      case 3: p = new THREE.Vector3(-1, sv, su); break
      case 4: p = new THREE.Vector3(su, 1, -sv); break
      case 5: p = new THREE.Vector3(su, -1, sv); break
    }
    return p.normalize().multiplyScalar(R)
  }

  function getNeighbor(f, u, v, dir, N) {
    let nu = u, nv = v
    if (dir === 'n') nv--
    else if (dir === 's') nv++
    else if (dir === 'w') nu--
    else if (dir === 'e') nu++

    if (nu >= 0 && nu < N && nv >= 0 && nv < N) {
      return { f, u: nu, v: nv, oppDir: dir === 'n' ? 's' : dir === 's' ? 'n' : dir === 'w' ? 'e' : 'w' }
    }

    const dsu = (dir === 'e' ? 1 : dir === 'w' ? -1 : 0) * (2 / N)
    const dsv = (dir === 'n' ? 1 : dir === 's' ? -1 : 0) * (2 / N)
    const su = (2 * (u + 0.5) / N) - 1 + dsu
    const sv = 1 - (2 * (v + 0.5) / N) + dsv

    let pBeyond
    switch (f) {
      case 0: pBeyond = new THREE.Vector3(su, sv, 1); break
      case 1: pBeyond = new THREE.Vector3(-su, sv, -1); break
      case 2: pBeyond = new THREE.Vector3(1, sv, -su); break
      case 3: pBeyond = new THREE.Vector3(-1, sv, su); break
      case 4: pBeyond = new THREE.Vector3(su, 1, -sv); break
      case 5: pBeyond = new THREE.Vector3(su, -1, sv); break
    }

    const ax = Math.abs(pBeyond.x), ay = Math.abs(pBeyond.y), az = Math.abs(pBeyond.z)
    let newF = -1
    if (az >= ax && az >= ay) newF = pBeyond.z > 0 ? 0 : 1
    else if (ax >= ay && ax >= az) newF = pBeyond.x > 0 ? 2 : 3
    else newF = pBeyond.y > 0 ? 4 : 5

    const scale = 1 / (newF === 0 || newF === 1 ? Math.abs(pBeyond.z) : newF === 2 || newF === 3 ? Math.abs(pBeyond.x) : Math.abs(pBeyond.y))
    const proj = pBeyond.clone().multiplyScalar(scale)
    let nsu = 0, nsv = 0
    switch (newF) {
      case 0: nsu = proj.x; nsv = proj.y; break
      case 1: nsu = -proj.x; nsv = proj.y; break
      case 2: nsu = -proj.z; nsv = proj.y; break
      case 3: nsu = proj.z; nsv = proj.y; break
      case 4: nsu = proj.x; nsv = -proj.z; break
      case 5: nsu = proj.x; nsv = proj.z; break
    }

    const finalU = Math.max(0, Math.min(N - 1, Math.floor(((nsu + 1) / 2) * N)))
    const finalV = Math.max(0, Math.min(N - 1, Math.floor(((1 - nsv) / 2) * N)))

    const pOldCenter = cellToCube(f, u, v, N).normalize()
    let bestOpp = 'n', bestDot = -999
    for (const d of ['n', 's', 'w', 'e']) {
      const dU = d === 'e' ? 1 : d === 'w' ? -1 : 0
      const dV = d === 's' ? 1 : d === 'n' ? -1 : 0
      const tsu = (2 * (finalU + 0.5 + dU) / N) - 1
      const tsv = 1 - (2 * (finalV + 0.5 + dV) / N)
      let testP
      switch (newF) {
        case 0: testP = new THREE.Vector3(tsu, tsv, 1).normalize(); break
        case 1: testP = new THREE.Vector3(-tsu, tsv, -1).normalize(); break
        case 2: testP = new THREE.Vector3(1, tsv, -tsu).normalize(); break
        case 3: testP = new THREE.Vector3(-1, tsv, tsu).normalize(); break
        case 4: testP = new THREE.Vector3(tsu, 1, -tsv).normalize(); break
        case 5: testP = new THREE.Vector3(tsu, -1, tsv).normalize(); break
      }
      const dot = testP.dot(pOldCenter)
      if (dot > bestDot) {
        bestDot = dot
        bestOpp = d
      }
    }

    return { f: newF, u: finalU, v: finalV, oppDir: bestOpp }
  }

  function createSphereGrid(N, R = 10) {
    const grid = []
    for (let f = 0; f < 6; f++) {
      for (let v = 0; v < N; v++) {
        for (let u = 0; u < N; u++) {
          grid.push(new SphereCell(f, u, v, N, R))
        }
      }
    }
    return grid
  }

  function generateSphereMaze(grid, N) {
    grid.forEach(c => { c.visited = false })
    const startCell = grid[0]
    startCell.visited = true
    const stack = [startCell]

    const DIRS = ['n', 's', 'w', 'e']

    while (stack.length > 0) {
      const current = stack[stack.length - 1]
      const unvisitedNeighbors = []

      for (const d of DIRS) {
        const nbInfo = getNeighbor(current.f, current.u, current.v, d, N)
        const nbIdx = indexSphere(N, nbInfo.f, nbInfo.u, nbInfo.v)
        const nbCell = grid[nbIdx]
        if (nbCell && !nbCell.visited) {
          unvisitedNeighbors.push({ dir: d, nbCell, oppDir: nbInfo.oppDir })
        }
      }

      if (unvisitedNeighbors.length > 0) {
        const pick = unvisitedNeighbors[Math.floor(Math.random() * unvisitedNeighbors.length)]
        current.walls[pick.dir] = false
        pick.nbCell.walls[pick.oppDir] = false
        pick.nbCell.visited = true
        stack.push(pick.nbCell)
      } else {
        stack.pop()
      }
    }
  }

  function addExtraPassagesSphere(grid, N, rate = 0.12) {
    const totalCells = grid.length
    const extraCount = Math.floor(totalCells * rate)
    let added = 0
    let attempts = 0
    const DIRS = ['n', 's', 'w', 'e']

    while (added < extraCount && attempts < totalCells * 4) {
      attempts++
      const cell = grid[Math.floor(Math.random() * totalCells)]
      const d = DIRS[Math.floor(Math.random() * DIRS.length)]
      if (cell.walls[d]) {
        const nbInfo = getNeighbor(cell.f, cell.u, cell.v, d, N)
        const nbCell = grid[indexSphere(N, nbInfo.f, nbInfo.u, nbInfo.v)]
        if (nbCell) {
          cell.walls[d] = false
          nbCell.walls[nbInfo.oppDir] = false
          added++
        }
      }
    }
  }

  function findSpherePath(grid, N, startPos, exitPos) {
    const startIdx = indexSphere(N, startPos.f, startPos.u, startPos.v)
    const exitIdx = indexSphere(N, exitPos.f, exitPos.u, exitPos.v)
    if (startIdx === -1 || exitIdx === -1) return []

    const visited = new Set([startIdx])
    const parent = new Map()
    const queue = [startIdx]

    while (queue.length > 0) {
      const currIdx = queue.shift()
      if (currIdx === exitIdx) break
      const curr = grid[currIdx]

      for (const d of ['n', 's', 'w', 'e']) {
        if (!curr.walls[d]) {
          const nbInfo = getNeighbor(curr.f, curr.u, curr.v, d, N)
          const nbIdx = indexSphere(N, nbInfo.f, nbInfo.u, nbInfo.v)
          if (nbIdx !== -1 && !visited.has(nbIdx)) {
            visited.add(nbIdx)
            parent.set(nbIdx, currIdx)
            queue.push(nbIdx)
          }
        }
      }
    }

    if (!visited.has(exitIdx)) return []

    const path = []
    let curr = exitIdx
    while (curr !== undefined) {
      path.push(grid[curr])
      curr = parent.get(curr)
    }
    path.reverse()
    return path
  }

  return {
    SphereCell,
    indexSphere,
    cellToCube,
    cellToSphere,
    pointOnFaceToSphere,
    getNeighbor,
    createSphereGrid,
    generateSphereMaze,
    addExtraPassagesSphere,
    findSpherePath,
  }
}
