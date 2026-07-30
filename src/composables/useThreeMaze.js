// 三维声纳迷宫渲染器（Three.js）
// —— 纯渲染工厂，不含 Vue 响应式与游戏逻辑。
//
// 坐标约定（最重要）：1 个格子 = 1 个世界单位。
//   格子 (c, r) 的中心 → 世界坐标 (c + 0.5, 0, r + 0.5)，X=列，Z=行，Y=向上。
//   模拟层（useGame）运行在 2D 像素空间；像素 → 网格：
//     gx = (px - offsetX) / cellSize，gy = (py - offsetY) / cellSize
//   之后把网格坐标直接当世界坐标用即可。玩家 drawX/drawY 已由复用的模拟层做了平滑插值。
//
// 墙体：InstancedMesh + MeshBasicMaterial + instanceColor。
//   场景纯黑、材质不受光，因此“颜色缩向黑色”本身就是淡出，黑 ≡ 不可见，
//   天然复现了 2D 的“回声点亮、随时间熄灭”机制；无需逐实例透明度、无需灯光。

import * as THREE from 'three'
import { OrbitControls } from 'three/addons/controls/OrbitControls.js'

const WALL_H = 0.5    // 墙高（世界单位）
const WALL_T = 0.08   // 墙厚
const BLACK = new THREE.Color(0x000000)
const WHITE = new THREE.Color(0xffffff)

export function createThreeMaze(mountEl) {
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
  renderer.toneMapping = THREE.NoToneMapping
  const w = mountEl.clientWidth || 1
  const h = mountEl.clientHeight || 1
  renderer.setSize(w, h)
  mountEl.appendChild(renderer.domElement)

  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x000000)
  scene.fog = new THREE.FogExp2(0x000000, 0.014)

  const camera = new THREE.PerspectiveCamera(55, w / h, 0.1, 500)

  const controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = true
  controls.dampingFactor = 0.08
  controls.enablePan = false
  controls.minPolarAngle = 0.05
  controls.maxPolarAngle = Math.PI * 0.49 // 永远不低于地面
  controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_ROTATE }

  // 发光贴图（玩家 / 狗狗 / 出口的假辉光）
  const glowTex = makeGlowTexture()

  // —— 玩家 ——
  const playerGroup = new THREE.Group()
  const playerCore = new THREE.Mesh(
    new THREE.SphereGeometry(0.18, 24, 16),
    new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false })
  )
  const playerGlow = makeGlowSprite(glowTex, 0xffffff, 1.4)
  playerGlow.material.depthTest = false // 始终可见（不被墙遮住）
  playerGlow.renderOrder = 10
  playerGroup.add(playerCore, playerGlow)
  scene.add(playerGroup)

  // —— 狗狗（布鲁斯）——
  const dogGroup = new THREE.Group()
  const dogCore = new THREE.Mesh(
    new THREE.SphereGeometry(0.14, 16, 12),
    new THREE.MeshBasicMaterial({ color: 0x4caf50, toneMapped: false })
  )
  const dogGlow = makeGlowSprite(glowTex, 0x4caf50, 1.1)
  dogGroup.add(dogCore, dogGlow)
  dogGroup.visible = false
  scene.add(dogGroup)

  // 狗狗路径（走过的亮段 + 未走的淡段）
  const pathDoneMat = new THREE.LineBasicMaterial({ color: 0x4caf50, transparent: true, opacity: 0.5, toneMapped: false })
  const pathTodoMat = new THREE.LineBasicMaterial({ color: 0x4caf50, transparent: true, opacity: 0.15, toneMapped: false })
  const pathDoneGeo = new THREE.BufferGeometry()
  const pathTodoGeo = new THREE.BufferGeometry()
  const pathDone = new THREE.Line(pathDoneGeo, pathDoneMat)
  const pathTodo = new THREE.Line(pathTodoGeo, pathTodoMat)
  pathDone.frustumCulled = false
  pathTodo.frustumCulled = false
  scene.add(pathDone, pathTodo)

  // —— 声波池 ——（动态增长、不回收，dispose 时统一释放）
  const pingPool = []

  // —— 迷宫组（每关重建）——
  let mazeGroup = null
  let wallsH = null
  let wallsV = null
  let ownersH = []   // [{ a, b }] 相邻格索引，-1 表示无
  let ownersV = []
  let lastH = null    // 上一帧亮度缓存，避免空闲时写 420 次颜色
  let lastV = null
  let exitPillar = null
  let exitFloor = null

  let cols = 0
  let rows = 0

  const tmpColor = new THREE.Color()

  function idx(c, r) { return c + r * cols }

  function buildMaze(grid, c, r) {
    cols = c
    rows = r

    // 拆掉旧迷宫
    if (mazeGroup) {
      disposeObject(mazeGroup)
      scene.remove(mazeGroup)
    }
    mazeGroup = new THREE.Group()

    // 地板（比迷宫略大，给环绕视角一个“地面”参照）
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(cols + 10, rows + 10),
      new THREE.MeshBasicMaterial({ color: 0x060608, toneMapped: false })
    )
    floor.rotation.x = -Math.PI / 2
    floor.position.set(cols / 2, -0.02, rows / 2)
    mazeGroup.add(floor)

    // 细网格
    const gridHelper = new THREE.GridHelper(Math.max(cols, rows), Math.max(cols, rows), 0x141420, 0x0c0c14)
    gridHelper.position.set(cols / 2, 0, rows / 2)
    // GridHelper 默认居中于原点、边长 = size；把它对齐到迷宫范围
    gridHelper.scale.set(cols / Math.max(cols, rows), 1, rows / Math.max(cols, rows))
    mazeGroup.add(gridHelper)

    buildWalls(grid)
    buildExit(grid)

    scene.add(mazeGroup)
    fitCamera()
  }

  function buildWalls(grid) {
    // 收集去重后的墙段：
    //   水平墙 H：格子 (c,r) 的 top 边（z = r，跨 x: c..c+1），同时覆盖第 0 行上边界。
    //   竖直墙 V：格子 (c,r) 的 left 边（x = c，跨 z: r..r+1），同时覆盖第 0 列左边界。
    //   底边界 / 右边界：由最后一行 / 最后一列格子的 bottom / right 提供。
    const hSegs = [] // { x, z, a, b }
    const vSegs = []

    // 水平墙：遍历 z = 0..rows
    for (let r = 0; r <= rows; r++) {
      for (let c = 0; c < cols; c++) {
        let a = -1
        let b = -1
        if (r < rows && grid[idx(c, r)].walls.top) a = idx(c, r)          // 下方格的 top
        if (r > 0 && grid[idx(c, r - 1)].walls.bottom) b = idx(c, r - 1) // 上方格的 bottom
        if (a === -1 && b === -1) continue
        hSegs.push({ x: c + 0.5, z: r, a, b })
      }
    }
    // 竖直墙：遍历 x = 0..cols
    for (let c = 0; c <= cols; c++) {
      for (let r = 0; r < rows; r++) {
        let a = -1
        let b = -1
        if (c < cols && grid[idx(c, r)].walls.left) a = idx(c, r)         // 右方格的 left
        if (c > 0 && grid[idx(c - 1, r)].walls.right) b = idx(c - 1, r)   // 左方格的 right
        if (a === -1 && b === -1) continue
        vSegs.push({ x: c, z: r + 0.5, a, b })
      }
    }

    const unitBox = new THREE.BoxGeometry(1, 1, 1)
    const wallMat = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false })
    const dummy = new THREE.Object3D()

    // H 墙
    wallsH = new THREE.InstancedMesh(unitBox, wallMat, Math.max(1, hSegs.length))
    wallsH.frustumCulled = false
    ownersH = []
    lastH = new Float32Array(hSegs.length)
    for (let i = 0; i < hSegs.length; i++) {
      const s = hSegs[i]
      dummy.position.set(s.x, WALL_H / 2, s.z)
      dummy.scale.set(1.0 + WALL_T, WALL_H, WALL_T)
      dummy.rotation.set(0, 0, 0)
      dummy.updateMatrix()
      wallsH.setMatrixAt(i, dummy.matrix)
      wallsH.setColorAt(i, BLACK)
      ownersH.push({ a: s.a, b: s.b })
    }
    if (hSegs.length === 0) {
      dummy.position.set(0, -999, 0); dummy.updateMatrix(); wallsH.setMatrixAt(0, dummy.matrix); wallsH.setColorAt(0, BLACK)
    }
    wallsH.instanceMatrix.needsUpdate = true
    if (wallsH.instanceColor) wallsH.instanceColor.needsUpdate = true

    // V 墙
    wallsV = new THREE.InstancedMesh(unitBox, wallMat, Math.max(1, vSegs.length))
    wallsV.frustumCulled = false
    ownersV = []
    lastV = new Float32Array(vSegs.length)
    for (let i = 0; i < vSegs.length; i++) {
      const s = vSegs[i]
      dummy.position.set(s.x, WALL_H / 2, s.z)
      dummy.scale.set(WALL_T, WALL_H, 1.0 + WALL_T)
      dummy.rotation.set(0, 0, 0)
      dummy.updateMatrix()
      wallsV.setMatrixAt(i, dummy.matrix)
      wallsV.setColorAt(i, BLACK)
      ownersV.push({ a: s.a, b: s.b })
    }
    if (vSegs.length === 0) {
      dummy.position.set(0, -999, 0); dummy.updateMatrix(); wallsV.setMatrixAt(0, dummy.matrix); wallsV.setColorAt(0, BLACK)
    }
    wallsV.instanceMatrix.needsUpdate = true
    if (wallsV.instanceColor) wallsV.instanceColor.needsUpdate = true

    mazeGroup.add(wallsH, wallsV)
  }

  function buildExit(grid) {
    const ec = cols - 1
    const er = rows - 1
    // 终点地砖
    exitFloor = new THREE.Mesh(
      new THREE.PlaneGeometry(0.9, 0.9),
      new THREE.MeshBasicMaterial({ color: 0x4caf50, transparent: true, opacity: 0.0, toneMapped: false, depthWrite: false })
    )
    exitFloor.rotation.x = -Math.PI / 2
    exitFloor.position.set(ec + 0.5, 0.01, er + 0.5)
    // 终点光柱（环绕视角下也能看到出口位置）
    exitPillar = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, 1.6, 0.22),
      new THREE.MeshBasicMaterial({ color: 0x4caf50, transparent: true, opacity: 0.0, toneMapped: false, depthWrite: false })
    )
    exitPillar.position.set(ec + 0.5, 0.8, er + 0.5)
    exitPillar._cellIdx = idx(ec, er)
    exitFloor._cellIdx = idx(ec, er)
    mazeGroup.add(exitFloor, exitPillar)
  }

  // 像素空间 → 世界坐标
  function toWorld(px, py, offsetX, offsetY, cellSize, out) {
    const gx = (px - offsetX) / cellSize
    const gy = (py - offsetY) / cellSize
    out.set(gx, 0, gy)
    return out
  }

  const _v = new THREE.Vector3()

  function syncFrame(st) {
    const { grid, pings, player, exitCell, dogActive, dogPos, dogWorldPath, offsetX, offsetY, cellSize } = st

    // —— 墙体亮度 ——
    updateWallColors(wallsH, ownersH, lastH, grid)
    updateWallColors(wallsV, ownersV, lastV, grid)

    // —— 终点 ——
    if (exitPillar) {
      const reveal = Math.min(1, grid[exitPillar._cellIdx].revealTimer)
      exitFloor.material.opacity = 0.6 * reveal
      exitPillar.material.opacity = 0.3 * reveal
    }

    // —— 玩家 ——
    toWorld(player.drawX, player.drawY, offsetX, offsetY, cellSize, _v)
    playerGroup.position.set(_v.x, 0.18, _v.z)

    // —— 狗狗 ——
    if (dogActive) {
      dogGroup.visible = true
      toWorld(dogPos.x, dogPos.y, offsetX, offsetY, cellSize, _v)
      dogGroup.position.set(_v.x, 0.14, _v.z)
      updateDogPath(dogWorldPath, dogPos, offsetX, offsetY, cellSize)
    } else {
      dogGroup.visible = false
      pathDone.visible = false
      pathTodo.visible = false
    }

    // —— 声波环 ——
    syncPings(pings, offsetX, offsetY, cellSize)

    controls.update()
    renderer.render(scene, camera)
  }

  function updateWallColors(mesh, owners, lastArr, grid) {
    if (!mesh || owners.length === 0) return
    let dirty = false
    for (let i = 0; i < owners.length; i++) {
      const o = owners[i]
      let v = 0
      if (o.a >= 0) v = grid[o.a].revealTimer
      if (o.b >= 0 && grid[o.b].revealTimer > v) v = grid[o.b].revealTimer
      if (v > 1) v = 1
      if (Math.abs(v - lastArr[i]) > 0.01) {
        lastArr[i] = v
        mesh.setColorAt(i, tmpColor.copy(WHITE).multiplyScalar(v))
        dirty = true
      }
    }
    if (dirty && mesh.instanceColor) mesh.instanceColor.needsUpdate = true
  }

  function syncPings(pings, offsetX, offsetY, cellSize) {
    // 增长池
    while (pingPool.length < pings.length) {
      pingPool.push(makePingRing())
    }
    for (let i = 0; i < pingPool.length; i++) {
      const slot = pingPool[i]
      if (i >= pings.length) {
        slot.group.visible = false
        continue
      }
      const p = pings[i]
      toWorld(p.x, p.y, offsetX, offsetY, cellSize, _v)
      const rWorld = p.currentR / cellSize
      const baseAlpha = Math.max(0, 1 - p.currentR / p.maxR)
      slot.group.visible = rWorld > 0.01
      slot.group.position.set(_v.x, 0.02, _v.z)
      slot.outer.scale.setScalar(rWorld)
      slot.outerMat.opacity = baseAlpha
      const innerR = Math.max(0.001, rWorld - 20 / cellSize)
      slot.inner.scale.setScalar(innerR)
      slot.innerMat.opacity = baseAlpha * 0.35
    }
  }

  function makePingRing() {
    const group = new THREE.Group()
    const outerGeo = new THREE.RingGeometry(0.94, 1.0, 64)
    const innerGeo = new THREE.RingGeometry(0.8, 0.86, 64)
    outerGeo.rotateX(-Math.PI / 2)
    innerGeo.rotateX(-Math.PI / 2)
    const outerMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, toneMapped: false })
    const innerMat = new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0, side: THREE.DoubleSide, depthWrite: false, toneMapped: false })
    const outer = new THREE.Mesh(outerGeo, outerMat)
    const inner = new THREE.Mesh(innerGeo, innerMat)
    group.add(outer, inner)
    group.visible = false
    scene.add(group)
    return { group, outer, inner, outerMat, innerMat }
  }

  function updateDogPath(worldPath, dogPos, offsetX, offsetY, cellSize) {
    if (!worldPath || worldPath.length < 2) {
      pathDone.visible = false
      pathTodo.visible = false
      return
    }
    const n = worldPath.length
    // 走过的：path[0..idx] + 当前狗狗位置
    const donePts = []
    const upto = Math.min(dogPos.idx, n - 1)
    for (let i = 0; i <= upto; i++) {
      toWorld(worldPath[i].x, worldPath[i].y, offsetX, offsetY, cellSize, _v)
      donePts.push(_v.x, 0.03, _v.z)
    }
    donePts.push((dogPos.x - offsetX) / cellSize, 0.03, (dogPos.y - offsetY) / cellSize)
    setLinePositions(pathDoneGeo, donePts)
    pathDone.visible = true

    // 未走的：狗狗位置 + path[idx+1..]
    const todoPts = [(dogPos.x - offsetX) / cellSize, 0.03, (dogPos.y - offsetY) / cellSize]
    for (let i = upto + 1; i < n; i++) {
      toWorld(worldPath[i].x, worldPath[i].y, offsetX, offsetY, cellSize, _v)
      todoPts.push(_v.x, 0.03, _v.z)
    }
    setLinePositions(pathTodoGeo, todoPts)
    pathTodo.visible = todoPts.length >= 6
  }

  function setLinePositions(geo, arr) {
    geo.setAttribute('position', new THREE.Float32BufferAttribute(arr, 3))
    geo.attributes.position.needsUpdate = true
  }

  // 相机相对方向：把“屏幕方向意图”换算成当前视角下最贴合的网格移动方向。
  // 这样旋转镜头后，按“上”始终是“远离镜头”，符合第三人称操作直觉。
  const _fwd = new THREE.Vector3()
  const _right = new THREE.Vector3()
  const _intent = new THREE.Vector3()
  const UP = new THREE.Vector3(0, 1, 0)
  // 四个网格方向对应的世界向量（X=列 c，Z=行 r）
  const GRID_DIRS = [
    { name: 'up', v: new THREE.Vector3(0, 0, -1) },    // r--
    { name: 'down', v: new THREE.Vector3(0, 0, 1) },   // r++
    { name: 'left', v: new THREE.Vector3(-1, 0, 0) },  // c--
    { name: 'right', v: new THREE.Vector3(1, 0, 0) },  // c++
  ]

  function resolveDirection(screenDir) {
    if (!controls) return screenDir
    // 相机水平朝向（镜头 → 目标，去掉 Y 分量）
    _fwd.set(controls.target.x - camera.position.x, 0, controls.target.z - camera.position.z)
    if (_fwd.lengthSq() < 1e-6) return screenDir
    _fwd.normalize()
    _right.crossVectors(_fwd, UP).normalize() // 相机右方向

    if (screenDir === 'up') _intent.copy(_fwd)
    else if (screenDir === 'down') _intent.copy(_fwd).negate()
    else if (screenDir === 'right') _intent.copy(_right)
    else if (screenDir === 'left') _intent.copy(_right).negate()
    else return screenDir

    // 取与意图点积最大（夹角最小）的网格方向
    let best = screenDir
    let bestDot = -Infinity
    for (const g of GRID_DIRS) {
      const d = _intent.dot(g.v)
      if (d > bestDot) { bestDot = d; best = g.name }
    }
    return best
  }

  function fitCamera() {
    const target = new THREE.Vector3(cols / 2, 0, rows / 2)
    const R = Math.hypot(cols, rows) / 2
    const dist = (R / Math.sin(THREE.MathUtils.degToRad(55) / 2)) * 1.15
    // 球坐标：polar 0.9rad（约俯视 38°），azimuth 0.6rad
    const polar = 0.9
    const azim = 0.6
    const sinP = Math.sin(polar)
    camera.position.set(
      target.x + dist * sinP * Math.sin(azim),
      target.y + dist * Math.cos(polar),
      target.z + dist * sinP * Math.cos(azim)
    )
    controls.target.copy(target)
    controls.minDistance = Math.max(cols, rows) * 0.35
    controls.maxDistance = dist * 2.5
    controls.update()
  }

  function resize() {
    const cw = mountEl.clientWidth
    const ch = mountEl.clientHeight
    if (!cw || !ch) return
    renderer.setSize(cw, ch)
    camera.aspect = cw / ch
    camera.updateProjectionMatrix()
  }

  function dispose() {
    for (const slot of pingPool) disposeObject(slot.group)
    pingPool.length = 0
    if (mazeGroup) { disposeObject(mazeGroup); scene.remove(mazeGroup); mazeGroup = null }
    disposeObject(playerGroup)
    disposeObject(dogGroup)
    pathDoneGeo.dispose(); pathTodoGeo.dispose()
    pathDoneMat.dispose(); pathTodoMat.dispose()
    glowTex.dispose()
    controls.dispose()
    renderer.dispose()
    if (renderer.domElement && renderer.domElement.parentNode) {
      renderer.domElement.parentNode.removeChild(renderer.domElement)
    }
  }

  // —— 工具 ——
  function makeGlowSprite(tex, color, scale) {
    const mat = new THREE.SpriteMaterial({
      map: tex,
      color,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      toneMapped: false,
    })
    const sprite = new THREE.Sprite(mat)
    sprite.scale.setScalar(scale)
    return sprite
  }

  function disposeObject(root) {
    root.traverse((o) => {
      if (o.geometry) o.geometry.dispose()
      if (o.material) {
        const mats = Array.isArray(o.material) ? o.material : [o.material]
        for (const m of mats) {
          if (m.map) m.map.dispose()
          m.dispose()
        }
      }
    })
  }

  function makeGlowTexture() {
    const size = 128
    const cv = document.createElement('canvas')
    cv.width = cv.height = size
    const g = cv.getContext('2d')
    const grad = g.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2)
    grad.addColorStop(0, 'rgba(255,255,255,1)')
    grad.addColorStop(0.35, 'rgba(255,255,255,0.45)')
    grad.addColorStop(1, 'rgba(255,255,255,0)')
    g.fillStyle = grad
    g.fillRect(0, 0, size, size)
    return new THREE.CanvasTexture(cv)
  }

  return {
    buildMaze,
    syncFrame,
    fitCamera,
    resolveDirection,
    resize,
    dispose,
    get renderer() { return renderer },
  }
}
