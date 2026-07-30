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

  // “探图模式”：开启后环绕/缩放的中心跟随玩家（以玩家为中心）
  let followPlayer = false
  const _followTarget = new THREE.Vector3()

  function setFollowPlayer(on) { followPlayer = on }

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
  let layers = 0
  let isCube = false

  // —— 立方迷宫专用 ——
  const spherePingPool = []    // 三维球形声波
  let cubeExitPillar = null
  let cubeExitFloor = null
  let layerGrids = []          // 每层的网格“维度面”，用于按层调光
  // 每层独立的墙体网格（各层独立材质 → 可逐层调透明度，聚焦某层时其他层真正透明不遮挡）
  let cubeWallsH = []
  let cubeWallsV = []
  let cubeOwnersH = []
  let cubeOwnersV = []
  let cubeLastH = []
  let cubeLastV = []

  const tmpColor = new THREE.Color()

  function idx(c, r) { return c + r * cols }

  function buildMaze(grid, c, r) {
    cols = c
    rows = r
    layers = 1
    isCube = false

    // 拆掉旧迷宫
    if (mazeGroup) {
      disposeObject(mazeGroup)
      scene.remove(mazeGroup)
    }
    clearPingPool(spherePingPool)
    cubeExitPillar = null
    cubeExitFloor = null
    cubeWallsH = []
    cubeWallsV = []
    cubeOwnersH = []
    cubeOwnersV = []
    cubeLastH = []
    cubeLastV = []
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

  // 由墙段列表生成 InstancedMesh（平面 / 立方共用）
  // seg: { x, y, z, a, b }，y 为该墙所在层底高度（平面为 0）
  function makeWallInstances(segs, horizontal) {
    const unitBox = new THREE.BoxGeometry(1, 1, 1)
    const wallMat = new THREE.MeshBasicMaterial({ color: 0xffffff, toneMapped: false })
    const dummy = new THREE.Object3D()
    const mesh = new THREE.InstancedMesh(unitBox, wallMat, Math.max(1, segs.length))
    mesh.frustumCulled = false
    const owners = []
    for (let i = 0; i < segs.length; i++) {
      const s = segs[i]
      dummy.position.set(s.x, s.y + WALL_H / 2, s.z)
      if (horizontal) dummy.scale.set(1.0 + WALL_T, WALL_H, WALL_T)
      else dummy.scale.set(WALL_T, WALL_H, 1.0 + WALL_T)
      dummy.rotation.set(0, 0, 0)
      dummy.updateMatrix()
      mesh.setMatrixAt(i, dummy.matrix)
      mesh.setColorAt(i, BLACK)
      owners.push({ a: s.a, b: s.b })
    }
    if (segs.length === 0) {
      dummy.position.set(0, -999, 0); dummy.scale.set(1, 1, 1); dummy.updateMatrix()
      mesh.setMatrixAt(0, dummy.matrix); mesh.setColorAt(0, BLACK)
    }
    mesh.instanceMatrix.needsUpdate = true
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    return { mesh, owners }
  }

  function buildWalls(grid) {
    // 平面（单层）墙段收集：y 恒为 0
    const hSegs = []
    const vSegs = []
    for (let r = 0; r <= rows; r++) {
      for (let c = 0; c < cols; c++) {
        let a = -1
        let b = -1
        if (r < rows && grid[idx(c, r)].walls.top) a = idx(c, r)
        if (r > 0 && grid[idx(c, r - 1)].walls.bottom) b = idx(c, r - 1)
        if (a !== -1 || b !== -1) hSegs.push({ x: c + 0.5, y: 0, z: r, a, b })
      }
    }
    for (let c = 0; c <= cols; c++) {
      for (let r = 0; r < rows; r++) {
        let a = -1
        let b = -1
        if (c < cols && grid[idx(c, r)].walls.left) a = idx(c, r)
        if (c > 0 && grid[idx(c - 1, r)].walls.right) b = idx(c - 1, r)
        if (a !== -1 || b !== -1) vSegs.push({ x: c, y: 0, z: r + 0.5, a, b })
      }
    }
    const H = makeWallInstances(hSegs, true)
    const V = makeWallInstances(vSegs, false)
    wallsH = H.mesh; ownersH = H.owners; lastH = new Float32Array(ownersH.length)
    wallsV = V.mesh; ownersV = V.owners; lastV = new Float32Array(ownersV.length)
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

    // 探图模式：环绕中心跟随玩家（以玩家为中心缩放）
    if (followPlayer) controls.target.lerp(playerGroup.position, 0.08)
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

  // 逐层透明度：聚焦层不透明，其余层真正透明（关闭深度写入，避免遮挡聚焦层）
  function setLayerOpacity(mesh, op) {
    if (!mesh) return
    mesh.visible = op > 0.02
    mesh.material.opacity = op
    mesh.material.depthWrite = op >= 0.99
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

  // ===== 立方（多层）迷宫 =====

  function idx3(c, r, l) { return c + r * cols + l * cols * rows }

  function buildCube(grid3D, c, r, lay) {
    cols = c
    rows = r
    layers = lay
    isCube = true

    if (mazeGroup) {
      disposeObject(mazeGroup)
      scene.remove(mazeGroup)
    }
    clearPingPool(pingPool) // 立方用球形声波，清掉平面环
    cubeExitPillar = null
    cubeExitFloor = null
    layerGrids = []
    cubeWallsH = []
    cubeWallsV = []
    cubeOwnersH = []
    cubeOwnersV = []
    cubeLastH = []
    cubeLastV = []
    mazeGroup = new THREE.Group()

    // 底板
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(cols + 10, rows + 10),
      new THREE.MeshBasicMaterial({ color: 0x060608, toneMapped: false })
    )
    floor.rotation.x = -Math.PI / 2
    floor.position.set(cols / 2, -0.02, rows / 2)
    mazeGroup.add(floor)

    // 每一层一张网格“维度面”，层数即难度
    const gmax = Math.max(cols, rows)
    for (let l = 0; l < layers; l++) {
      const gh = new THREE.GridHelper(gmax, gmax, 0x1a2836, 0x0d141c)
      gh.position.set(cols / 2, l, rows / 2)
      gh.scale.set(cols / gmax, 1, rows / gmax)
      gh.material.transparent = true
      gh.material.opacity = 0.5
      gh.material.toneMapped = false
      gh.material.depthWrite = false
      mazeGroup.add(gh)
      layerGrids.push(gh)
    }

    buildWallsCube(grid3D)
    buildCubeExit(grid3D)

    scene.add(mazeGroup)
    fitCubeCamera()
  }

  function buildWallsCube(grid3D) {
    // 每层单独一对 InstancedMesh（独立材质 → 可逐层调透明度）
    for (let l = 0; l < layers; l++) {
      const hSegs = []
      const vSegs = []
      for (let r = 0; r <= rows; r++) {
        for (let c = 0; c < cols; c++) {
          let a = -1
          let b = -1
          if (r < rows && grid3D[idx3(c, r, l)].walls.n) a = idx3(c, r, l)
          if (r > 0 && grid3D[idx3(c, r - 1, l)].walls.s) b = idx3(c, r - 1, l)
          if (a !== -1 || b !== -1) hSegs.push({ x: c + 0.5, y: l, z: r, a, b })
        }
      }
      for (let c = 0; c <= cols; c++) {
        for (let r = 0; r < rows; r++) {
          let a = -1
          let b = -1
          if (c < cols && grid3D[idx3(c, r, l)].walls.w) a = idx3(c, r, l)
          if (c > 0 && grid3D[idx3(c - 1, r, l)].walls.e) b = idx3(c - 1, r, l)
          if (a !== -1 || b !== -1) vSegs.push({ x: c, y: l, z: r + 0.5, a, b })
        }
      }
      const H = makeWallInstances(hSegs, true)
      const V = makeWallInstances(vSegs, false)
      H.mesh.material.transparent = true
      V.mesh.material.transparent = true
      cubeWallsH.push(H.mesh); cubeOwnersH.push(H.owners); cubeLastH.push(new Float32Array(H.owners.length))
      cubeWallsV.push(V.mesh); cubeOwnersV.push(V.owners); cubeLastV.push(new Float32Array(V.owners.length))
      mazeGroup.add(H.mesh, V.mesh)
    }
  }

  function buildCubeExit(grid3D) {
    const ec = cols - 1
    const er = rows - 1
    const el = layers - 1
    cubeExitFloor = new THREE.Mesh(
      new THREE.PlaneGeometry(0.9, 0.9),
      new THREE.MeshBasicMaterial({ color: 0x4caf50, transparent: true, opacity: 0.0, toneMapped: false, depthWrite: false })
    )
    cubeExitFloor.rotation.x = -Math.PI / 2
    cubeExitFloor.position.set(ec + 0.5, el + 0.01, er + 0.5)
    cubeExitPillar = new THREE.Mesh(
      new THREE.BoxGeometry(0.22, 1.4, 0.22),
      new THREE.MeshBasicMaterial({ color: 0x4caf50, transparent: true, opacity: 0.0, toneMapped: false, depthWrite: false })
    )
    cubeExitPillar.position.set(ec + 0.5, el + 0.7, er + 0.5)
    const ci = idx3(ec, er, el)
    cubeExitPillar._cellIdx = ci
    cubeExitFloor._cellIdx = ci
    mazeGroup.add(cubeExitFloor, cubeExitPillar)
  }

  function fitCubeCamera() {
    const target = new THREE.Vector3(cols / 2, (layers - 1) / 2, rows / 2)
    const R = Math.hypot(cols, rows, layers) / 2
    const dist = (R / Math.sin(THREE.MathUtils.degToRad(55) / 2)) * 1.2
    const polar = 0.95
    const azim = 0.7
    const sinP = Math.sin(polar)
    camera.position.set(
      target.x + dist * sinP * Math.sin(azim),
      target.y + dist * Math.cos(polar),
      target.z + dist * sinP * Math.cos(azim)
    )
    controls.target.copy(target)
    controls.minDistance = Math.max(cols, rows, layers) * 0.4
    controls.maxDistance = dist * 2.5
    controls.update()
  }

  function syncCubeFrame(st) {
    const { grid, pings, player, dogActive, dogPos, dogPath3D, layerFactors } = st
    const cpl = cols * rows

    // 每层墙体：reveal → 实例颜色（点亮）；layerFactors → 材质透明度（真透明，不遮挡聚焦层）
    for (let l = 0; l < layers; l++) {
      const op = layerFactors ? layerFactors[l] : 1
      setLayerOpacity(cubeWallsH[l], op)
      setLayerOpacity(cubeWallsV[l], op)
      updateWallColors(cubeWallsH[l], cubeOwnersH[l], cubeLastH[l], grid)
      updateWallColors(cubeWallsV[l], cubeOwnersV[l], cubeLastV[l], grid)
      // 网格面调光
      if (layerGrids[l]) {
        layerGrids[l].material.opacity = 0.5 * op
        layerGrids[l].visible = op > 0.02
      }
    }

    // 终点（按其所在层的聚焦系数调光）
    if (cubeExitPillar) {
      const reveal = Math.min(1, grid[cubeExitPillar._cellIdx].revealTimer)
      const ef = layerFactors ? layerFactors[Math.floor(cubeExitPillar._cellIdx / cpl)] : 1
      cubeExitFloor.material.opacity = 0.6 * reveal * ef
      cubeExitPillar.material.opacity = 0.35 * reveal * ef
    }

    // 玩家（真三维）
    playerGroup.position.set(player.drawX, player.drawY, player.drawZ)

    // 狗狗（三维）
    if (dogActive) {
      dogGroup.visible = true
      dogGroup.position.set(dogPos.x, dogPos.y, dogPos.z)
      updateDogPath3D(dogPath3D, dogPos)
    } else {
      dogGroup.visible = false
      pathDone.visible = false
      pathTodo.visible = false
    }

    // 球形声波
    syncCubePings(pings)

    // 探图模式：环绕中心跟随玩家（含纵向层级），缩放即以玩家为中心
    if (followPlayer) {
      controls.target.lerp(_followTarget.set(player.drawX, player.drawY, player.drawZ), 0.08)
    }
    controls.update()
    renderer.render(scene, camera)
  }

  function syncCubePings(pings) {
    while (spherePingPool.length < pings.length) {
      spherePingPool.push(makePingSphere())
    }
    for (let i = 0; i < spherePingPool.length; i++) {
      const slot = spherePingPool[i]
      if (i >= pings.length) { slot.mesh.visible = false; continue }
      const p = pings[i]
      const baseAlpha = Math.max(0, 1 - p.currentR / p.maxR)
      slot.mesh.visible = p.currentR > 0.01
      slot.mesh.position.set(p.x, p.y, p.z)
      slot.mesh.scale.setScalar(Math.max(0.001, p.currentR))
      slot.mat.opacity = baseAlpha * 0.5
    }
  }

  function makePingSphere() {
    const geo = new THREE.SphereGeometry(1, 20, 14)
    const mat = new THREE.MeshBasicMaterial({
      color: 0xffffff, wireframe: true, transparent: true, opacity: 0,
      depthWrite: false, toneMapped: false,
    })
    const mesh = new THREE.Mesh(geo, mat)
    mesh.visible = false
    scene.add(mesh)
    return { mesh, mat }
  }

  function updateDogPath3D(path, dogPos) {
    if (!path || path.length < 2) {
      pathDone.visible = false
      pathTodo.visible = false
      return
    }
    const n = path.length
    const upto = Math.min(dogPos.idx, n - 1)
    const donePts = []
    for (let i = 0; i <= upto; i++) {
      const p = path[i]
      donePts.push(p.c + 0.5, p.l + 0.2, p.r + 0.5)
    }
    donePts.push(dogPos.x, dogPos.y, dogPos.z)
    setLinePositions(pathDoneGeo, donePts)
    pathDone.visible = true

    const todoPts = [dogPos.x, dogPos.y, dogPos.z]
    for (let i = upto + 1; i < n; i++) {
      const p = path[i]
      todoPts.push(p.c + 0.5, p.l + 0.2, p.r + 0.5)
    }
    setLinePositions(pathTodoGeo, todoPts)
    pathTodo.visible = todoPts.length >= 6
  }

  function clearPingPool(pool) {
    for (const slot of pool) {
      const obj = slot.group || slot.mesh
      scene.remove(obj)
      disposeObject(obj)
    }
    pool.length = 0
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
    clearPingPool(pingPool)
    clearPingPool(spherePingPool)
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
    buildCube,
    syncFrame,
    syncCubeFrame,
    fitCamera,
    fitCubeCamera,
    resolveDirection,
    setFollowPlayer,
    resize,
    dispose,
    get renderer() { return renderer },
  }
}
