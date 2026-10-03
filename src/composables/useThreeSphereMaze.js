// 三维球体迷宫渲染器 (Three.js) - useThreeSphereMaze
// 核心特性：
// 1. 默认环境纯黑（无星空/无网格），仅玩家本体与呼吸光晕自发光；
// 2. 平滑符合球面弧度的三维立体曲面墙面（DoubleSide渲染 + 顶部高亮线脊），拒绝长方形拼接；
// 3. 迷宫墙面发光为纯白色/银色回声（无蓝色）；
// 4. 真实渲染声音扩散音波（球面测地线同心光环与半透明涟漪带）；
// 5. 探图模式视角提高至广阔俯瞰视角（CAM_H = 7.5）；
// 6. 音波全方位、零遗漏触发墙面发光（多点测地线波前扫描），点亮后随余晖平滑衰减。

import * as THREE from 'three'
import { useSphereMaze } from './useSphereMaze.js'

const WALL_H = 0.55       // 墙体立体高度
const WALL_T = 0.20       // 墙体截面宽度（清晰立体可见）
const S_SEGMENTS = 6      // 每个墙体弧线细分段数（保证完全贴合球面弧度）
const CAM_H = 7.5         // 探图模式俯瞰高度（广阔视角）
const CAM_BACK = 1.8      // 探图模式后倾偏移

export function createThreeSphereMaze(mountEl) {
  const { pointOnFaceToSphere, getNeighbor, indexSphere } = useSphereMaze()

  // 1. WebGL 渲染器
  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2))
  renderer.toneMapping = THREE.NoToneMapping
  const w = mountEl.clientWidth || 1
  const h = mountEl.clientHeight || 1
  renderer.setSize(w, h)
  mountEl.appendChild(renderer.domElement)

  // 2. 场景配置：默认纯黑，无星空、无背景雾，深度黑暗
  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x000000)

  // 3. 摄像机与无死角全向球面漫游控制器 (Dead-Zone Free Spherical Trackball Controller)
  const camera = new THREE.PerspectiveCamera(55, w / h, 0.05, 400)
  let camDistance = 22.0
  camera.position.set(0, 0, camDistance)
  camera.lookAt(0, 0, 0)

  let isPointerDragging = false
  let prevPointerX = 0
  let prevPointerY = 0
  let pointerVelocityX = 0
  let pointerVelocityY = 0

  function rotateSphericalCamera(dx, dy) {
    const rotSpeed = 0.0055
    const screenRight = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion)
    const screenUp = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion)

    const qRight = new THREE.Quaternion().setFromAxisAngle(screenRight, dy * rotSpeed)
    const qUp = new THREE.Quaternion().setFromAxisAngle(screenUp, -dx * rotSpeed)
    const qDelta = new THREE.Quaternion().multiplyQuaternions(qRight, qUp)

    camera.position.applyQuaternion(qDelta).normalize().multiplyScalar(camDistance)
    camera.quaternion.premultiply(qDelta).normalize()
  }

  function onPointerDown(e) {
    if (isExplorationMode || isTransitioning) return
    isPointerDragging = true
    prevPointerX = e.clientX
    prevPointerY = e.clientY
    pointerVelocityX = 0
    pointerVelocityY = 0
  }

  function onPointerMove(e) {
    if (!isPointerDragging || isExplorationMode || isTransitioning) return
    const dx = e.clientX - prevPointerX
    const dy = e.clientY - prevPointerY
    prevPointerX = e.clientX
    prevPointerY = e.clientY

    pointerVelocityX = dx * 0.75
    pointerVelocityY = dy * 0.75

    rotateSphericalCamera(dx, dy)
  }

  function onPointerUp() {
    isPointerDragging = false
  }

  function onWheel(e) {
    if (isExplorationMode || isTransitioning) return
    e.preventDefault()
    camDistance = Math.max(9.0, Math.min(35.0, camDistance + Math.sign(e.deltaY) * 1.5))
    camera.position.normalize().multiplyScalar(camDistance)
  }

  const dom = renderer.domElement
  dom.addEventListener('pointerdown', onPointerDown)
  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', onPointerUp)
  window.addEventListener('pointercancel', onPointerUp)
  dom.addEventListener('wheel', onWheel, { passive: false })

  // 4. 球体迷宫基础数据
  let R = 8.0
  let N = 4
  let currentGrid = []
  let cellWalls = []

  // 纯黑球体基底（完全阻隔背面视线，本身不发光）
  const planetMesh = new THREE.Mesh(
    new THREE.SphereGeometry(R * 0.996, 48, 32),
    new THREE.MeshBasicMaterial({ color: 0x000000 })
  )
  scene.add(planetMesh)

  // 5. 平滑曲面墙体网格 + 顶部高亮线脊（双层发光保障）
  let wallMesh = null
  let wallGeometry = null
  let wallColors = null
  let wallColorAttr = null

  let wallLine = null
  let wallLineGeo = null
  let wallLineColors = null
  let wallLineColorAttr = null
  let wallCount = 0

  // 6. 自发光玩家系统（明亮纯白核心 + 柔和脉动光晕）
  const playerGroup = new THREE.Group()
  const playerCore = new THREE.Mesh(
    new THREE.SphereGeometry(0.24, 20, 20),
    new THREE.MeshBasicMaterial({ color: 0xffffff })
  )
  const playerGlow = new THREE.Mesh(
    new THREE.SphereGeometry(0.48, 20, 20),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35 })
  )
  playerGroup.add(playerCore, playerGlow)
  scene.add(playerGroup)

  // 7. 终点光柱与呼吸光球
  const exitGroup = new THREE.Group()
  const exitPillar = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.22, 2.0, 16),
    new THREE.MeshBasicMaterial({ color: 0xffd54f, transparent: true, opacity: 0.85 })
  )
  exitPillar.position.y = 1.0
  const exitOrb = new THREE.Mesh(
    new THREE.SphereGeometry(0.28, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0xffab00 })
  )
  exitOrb.position.y = 2.0
  exitGroup.add(exitPillar, exitOrb)
  exitGroup.visible = false
  let exitRevealTimer = 0.0
  scene.add(exitGroup)

  // 8. 狗狗（布鲁斯）三维寻路指引
  const dogGroup = new THREE.Group()
  const dogCore = new THREE.Mesh(
    new THREE.SphereGeometry(0.2, 16, 12),
    new THREE.MeshBasicMaterial({ color: 0x81c784 })
  )
  dogGroup.add(dogCore)
  dogGroup.visible = false
  scene.add(dogGroup)

  const dogPathLineMat = new THREE.LineBasicMaterial({ color: 0x81c784, transparent: true, opacity: 0.65 })
  const dogPathGeo = new THREE.BufferGeometry()
  const dogPathLine = new THREE.Line(dogPathGeo, dogPathLineMat)
  dogPathLine.visible = false
  scene.add(dogPathLine)

  // 9. 状态机与镜头过渡动画
  let isExplorationMode = false
  let isTransitioning = false
  let transitionProgress = 0.0
  const transitionDuration = 0.8
  const camStartPos = new THREE.Vector3()
  const camStartQuat = new THREE.Quaternion()

  // 玩家球面位置与局部正交切线标架
  const playerPos = new THREE.Vector3(0, 0, R)
  const playerTargetPos = new THREE.Vector3(0, 0, R)
  const playerNormal = new THREE.Vector3(0, 0, 1)
  const tangentNorth = new THREE.Vector3(0, 1, 0)
  const tangentRight = new THREE.Vector3(1, 0, 0)

  let playerCellCoords = { f: 0, u: 0, v: 0 }
  let exitCellCoords = { f: 1, u: 0, v: 0 }

  // 10. 三维可视化声波系统 (Acoustic Wave Renderer)
  const waveGroup = new THREE.Group()
  scene.add(waveGroup)
  const pings = []
  const waveVisuals = []

  const WAVE_SEGMENTS = 48
  function createWaveVisual() {
    const ribbonGeo = new THREE.BufferGeometry()
    const ribbonPos = new Float32Array((WAVE_SEGMENTS + 1) * 2 * 3)
    ribbonGeo.setAttribute('position', new THREE.BufferAttribute(ribbonPos, 3))
    const ribbonIndices = []
    for (let i = 0; i < WAVE_SEGMENTS; i++) {
      const i0 = i * 2
      const i1 = i0 + 1
      const i2 = (i + 1) * 2
      const i3 = i2 + 1
      ribbonIndices.push(i0, i1, i2)
      ribbonIndices.push(i1, i3, i2)
    }
    ribbonGeo.setIndex(ribbonIndices)
    const ribbonMat = new THREE.MeshBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.0,
      side: THREE.DoubleSide,
      depthWrite: false,
    })
    const ribbonMesh = new THREE.Mesh(ribbonGeo, ribbonMat)

    const ringGeo = new THREE.BufferGeometry()
    const ringPos = new Float32Array((WAVE_SEGMENTS + 1) * 3)
    ringGeo.setAttribute('position', new THREE.BufferAttribute(ringPos, 3))
    const ringMat = new THREE.LineBasicMaterial({
      color: 0xffffff,
      transparent: true,
      opacity: 0.0,
      depthWrite: false,
    })
    const ringLine = new THREE.Line(ringGeo, ringMat)

    const group = new THREE.Group()
    group.add(ribbonMesh, ringLine)
    waveGroup.add(group)

    return {
      group,
      ribbonGeo,
      ribbonPos,
      ribbonMat,
      ringGeo,
      ringPos,
      ringMat,
      active: false,
    }
  }

  function getAvailableWaveVisual() {
    let vis = waveVisuals.find(v => !v.active)
    if (!vis) {
      vis = createWaveVisual()
      waveVisuals.push(vis)
    }
    vis.active = true
    vis.group.visible = true
    return vis
  }

  // ===== 平滑弧度曲面墙体构建 =====
  function buildSphereWalls(grid, sphereN, sphereR = 8.0) {
    R = sphereR
    N = sphereN
    currentGrid = grid

    planetMesh.geometry.dispose()
    planetMesh.geometry = new THREE.SphereGeometry(R * 0.996, 48, 32)

    if (wallMesh) {
      scene.remove(wallMesh)
      wallGeometry.dispose()
      wallMesh.material.dispose()
      wallMesh = null
    }
    if (wallLine) {
      scene.remove(wallLine)
      wallLineGeo.dispose()
      wallLine.material.dispose()
      wallLine = null
    }

    cellWalls = []
    const wallsMap = new Map()

    for (const cell of grid) {
      const f = cell.f, u = cell.u, v = cell.v
      const su0 = (2 * u / N) - 1,     su1 = (2 * (u + 1) / N) - 1
      const sv0 = 1 - (2 * v / N),     sv1 = 1 - (2 * (v + 1) / N)

      const wallDefs = [
        { dir: 'n', type: 'u', fix: sv0, t0: su0, t1: su1, f },
        { dir: 's', type: 'u', fix: sv1, t0: su0, t1: su1, f },
        { dir: 'w', type: 'v', fix: su0, t0: sv1, t1: sv0, f },
        { dir: 'e', type: 'v', fix: su1, t0: sv1, t1: sv0, f },
      ]

      for (const wDef of wallDefs) {
        if (cell.walls[wDef.dir]) {
          const pStart = wDef.type === 'u'
            ? pointOnFaceToSphere(f, wDef.t0, wDef.fix, R)
            : pointOnFaceToSphere(f, wDef.fix, wDef.t0, R)
          const pEnd = wDef.type === 'u'
            ? pointOnFaceToSphere(f, wDef.t1, wDef.fix, R)
            : pointOnFaceToSphere(f, wDef.fix, wDef.t1, R)

          const hashP1 = `${pStart.x.toFixed(2)},${pStart.y.toFixed(2)},${pStart.z.toFixed(2)}`
          const hashP2 = `${pEnd.x.toFixed(2)},${pEnd.y.toFixed(2)},${pEnd.z.toFixed(2)}`
          const key = hashP1 < hashP2 ? `${hashP1}_${hashP2}` : `${hashP2}_${hashP1}`

          if (!wallsMap.has(key)) {
            const mid = new THREE.Vector3().addVectors(pStart, pEnd).multiplyScalar(0.5).normalize().multiplyScalar(R)
            wallsMap.set(key, { ...wDef, pStart, pEnd, mid, revealTimer: 0.0 })
          }
        }
      }
    }

    cellWalls = Array.from(wallsMap.values())
    wallCount = cellWalls.length

    // 构建符合球面弧度的平滑顶点几何体（3D实体曲面 + 顶部高亮脊线）
    const positions = []
    const colors = []
    const indices = []
    let vertOffset = 0

    const linePositions = []
    const lineColors = []
    let lineOffset = 0

    for (const w of cellWalls) {
      w.vertStart = vertOffset
      w.lineStart = lineOffset
      const vBaseStart = vertOffset

      for (let k = 0; k <= S_SEGMENTS; k++) {
        const t = k / S_SEGMENTS
        const param = w.t0 + t * (w.t1 - w.t0)
        const p = w.type === 'u'
          ? pointOnFaceToSphere(w.f, param, w.fix, R)
          : pointOnFaceToSphere(w.f, w.fix, param, R)
        const norm = p.clone().normalize()

        const dt = 0.01
        const pNext = w.type === 'u'
          ? pointOnFaceToSphere(w.f, param + dt, w.fix, R)
          : pointOnFaceToSphere(w.f, w.fix, param + dt, R)
        const tang = new THREE.Vector3().subVectors(pNext, p).normalize()
        const binorm = new THREE.Vector3().crossVectors(norm, tang).normalize()
        const pTop = p.clone().addScaledVector(norm, WALL_H)

        // 截面四顶点（底部左/右，顶部右/左）
        const v0 = p.clone().addScaledVector(binorm, -WALL_T * 0.5)
        const v1 = p.clone().addScaledVector(binorm, WALL_T * 0.5)
        const v2 = pTop.clone().addScaledVector(binorm, WALL_T * 0.5)
        const v3 = pTop.clone().addScaledVector(binorm, -WALL_T * 0.5)

        positions.push(v0.x, v0.y, v0.z, v1.x, v1.y, v1.z, v2.x, v2.y, v2.z, v3.x, v3.y, v3.z)
        colors.push(0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0)
        vertOffset += 4

        // 顶部高亮线脊（连接相邻采样点）
        if (k > 0) {
          const pPrevParam = w.t0 + (k - 1) / S_SEGMENTS * (w.t1 - w.t0)
          const pPrev = w.type === 'u'
            ? pointOnFaceToSphere(w.f, pPrevParam, w.fix, R)
            : pointOnFaceToSphere(w.f, w.fix, pPrevParam, R)
          const pPrevTop = pPrev.clone().addScaledVector(pPrev.clone().normalize(), WALL_H + 0.02)
          const pCurTop = pTop.clone().addScaledVector(norm, 0.02)

          linePositions.push(pPrevTop.x, pPrevTop.y, pPrevTop.z)
          linePositions.push(pCurTop.x, pCurTop.y, pCurTop.z)
          lineColors.push(0, 0, 0, 0, 0, 0)
          lineOffset += 2
        }
      }
      w.vertCount = (S_SEGMENTS + 1) * 4
      w.lineCount = S_SEGMENTS * 2

      for (let k = 0; k < S_SEGMENTS; k++) {
        const idx = vBaseStart + k * 4
        const nxt = idx + 4
        // 顶面（严格朝外法线）
        indices.push(idx + 3, nxt + 2, idx + 2)
        indices.push(idx + 3, nxt + 3, nxt + 2)
        // 右外侧面
        indices.push(idx + 1, idx + 2, nxt + 2)
        indices.push(idx + 1, nxt + 2, nxt + 1)
        // 左外侧面
        indices.push(idx + 0, nxt + 3, idx + 3)
        indices.push(idx + 0, nxt + 0, nxt + 3)
      }
      // 两端端面封口
      const s0 = vBaseStart
      indices.push(s0 + 0, s0 + 2, s0 + 1)
      indices.push(s0 + 0, s0 + 3, s0 + 2)
      const sE = vBaseStart + S_SEGMENTS * 4
      indices.push(sE + 0, sE + 1, sE + 2)
      indices.push(sE + 0, sE + 2, sE + 3)
    }

    // 1. 实心曲面网格（DoubleSide 双面发光保障）
    wallGeometry = new THREE.BufferGeometry()
    wallGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
    wallColors = new Float32Array(colors)
    wallColorAttr = new THREE.BufferAttribute(wallColors, 3)
    wallGeometry.setAttribute('color', wallColorAttr)
    wallGeometry.setIndex(indices)
    wallGeometry.computeVertexNormals()

    wallMesh = new THREE.Mesh(wallGeometry, new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.DoubleSide }))
    scene.add(wallMesh)

    // 2. 顶部高亮线脊
    wallLineGeo = new THREE.BufferGeometry()
    wallLineGeo.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3))
    wallLineColors = new Float32Array(lineColors)
    wallLineColorAttr = new THREE.BufferAttribute(wallLineColors, 3)
    wallLineGeo.setAttribute('color', wallLineColorAttr)

    wallLine = new THREE.LineSegments(wallLineGeo, new THREE.LineBasicMaterial({ vertexColors: true }))
    scene.add(wallLine)
  }

  // ===== 玩家位置更新（带球面连续平行移动） =====
  function setPlayerCell(f, u, v, smooth = false) {
    playerCellCoords = { f, u, v }
    const cellIdx = indexSphere(N, f, u, v)
    const cell = currentGrid[cellIdx]
    if (!cell) return

    playerTargetPos.set(cell.x, cell.y, cell.z)
    const nextNormal = new THREE.Vector3(cell.nx, cell.ny, cell.nz).normalize()

    if (!smooth) {
      // 关卡初始化或重置：建立初始连续正交标架
      playerNormal.copy(nextNormal)
      const refUp = Math.abs(nextNormal.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(0, 0, 1)
      tangentNorth.copy(refUp).projectOnPlane(playerNormal).normalize()
      tangentRight.crossVectors(tangentNorth, playerNormal).normalize()

      playerPos.copy(playerTargetPos)
      playerGroup.position.copy(playerPos)
    } else {
      // 步进移动：采用测地线平行移动 (Parallel Transport)，彻底消除跨面边界与极区时的强制视角畸变与抽搐
      const qTransport = new THREE.Quaternion().setFromUnitVectors(playerNormal, nextNormal)
      tangentNorth.applyQuaternion(qTransport).projectOnPlane(nextNormal).normalize()
      tangentRight.crossVectors(tangentNorth, nextNormal).normalize()
      playerNormal.copy(nextNormal)
    }

    const pQuat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), playerNormal)
    playerGroup.quaternion.copy(pQuat)
  }

  // ===== 终点位置更新 =====
  function setExitCell(f, u, v) {
    exitCellCoords = { f, u, v }
    const cellIdx = indexSphere(N, f, u, v)
    const cell = currentGrid[cellIdx]
    if (!cell) return

    const exitPos = new THREE.Vector3(cell.x, cell.y, cell.z)
    const exitNorm = new THREE.Vector3(cell.nx, cell.ny, cell.nz)
    exitGroup.position.copy(exitPos)
    exitGroup.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), exitNorm)
  }

  // ===== 触发真实渲染的球面测地线音波 =====
  function triggerSpherePing(peakVolume = 180) {
    // 动态音量映射：避免低音量过度敏感，同时保证强音波可达对跖点
    const intensity = Math.min(1.0, Math.max(0.40, (peakVolume - 150) / 90))
    const maxArcDist = Math.PI * R * (0.35 + intensity * 0.65)

    const pNorm = playerPos.clone().normalize()
    const upVec = Math.abs(pNorm.y) < 0.9 ? new THREE.Vector3(0, 1, 0) : new THREE.Vector3(1, 0, 0)
    const basisA = new THREE.Vector3().crossVectors(pNorm, upVec).normalize()
    const basisB = new THREE.Vector3().crossVectors(pNorm, basisA).normalize()

    const visual = getAvailableWaveVisual()

    pings.push({
      origin: playerPos.clone(),
      normal: pNorm,
      basisA,
      basisB,
      currentDist: 0.1,
      maxDist: maxArcDist,
      speed: 7.0 + intensity * 5.0,
      intensity,
      age: 0,
      visual,
    })

    // 点亮玩家所处当前格子及相邻墙体
    const localRadius = (R * Math.PI / N) * 1.35
    for (let wIdx = 0; wIdx < wallCount; wIdx++) {
      const wData = cellWalls[wIdx]
      if (wData.mid.distanceTo(playerPos) <= localRadius) {
        wData.revealTimer = Math.max(wData.revealTimer, intensity)
      }
    }
  }

  // ===== 动态视角屏幕移动指令解析 =====
  // 移动指令完全根据摄像机当前在屏幕上的实际视觉朝向进行映射：
  function handleScreenDirectionCommand(cmd) {
    const currIdx = indexSphere(N, playerCellCoords.f, playerCellCoords.u, playerCellCoords.v)
    const currCell = currentGrid[currIdx]
    if (!currCell) return { moved: false }

    const pCenter = new THREE.Vector3(currCell.x, currCell.y, currCell.z)

    // 动态提取摄像机当前在屏幕空间中的视觉上方向与右方向：
    const screenUp = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion)
    const screenRight = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion)

    const DIRS = ['n', 's', 'w', 'e']
    const candidates = []

    for (const d of DIRS) {
      const nb = getNeighbor(playerCellCoords.f, playerCellCoords.u, playerCellCoords.v, d, N)
      const cellNb = currentGrid[indexSphere(N, nb.f, nb.u, nb.v)]
      if (cellNb) {
        const pNb = new THREE.Vector3(cellNb.x, cellNb.y, cellNb.z)
        const stepVec = new THREE.Vector3().subVectors(pNb, pCenter).projectOnPlane(playerNormal).normalize()
        const sy = stepVec.dot(screenUp)
        const sx = stepVec.dot(screenRight)
        candidates.push({ dir: d, sx, sy, nb })
      }
    }

    if (candidates.length === 0) return { moved: false }

    let chosenCandidate = null
    if (cmd === 'up') {
      chosenCandidate = candidates.reduce((best, c) => c.sy > best.sy ? c : best, candidates[0])
    } else if (cmd === 'down') {
      chosenCandidate = candidates.reduce((best, c) => c.sy < best.sy ? c : best, candidates[0])
    } else if (cmd === 'right') {
      chosenCandidate = candidates.reduce((best, c) => c.sx > best.sx ? c : best, candidates[0])
    } else if (cmd === 'left') {
      chosenCandidate = candidates.reduce((best, c) => c.sx < best.sx ? c : best, candidates[0])
    }

    if (!chosenCandidate) return { moved: false }

    // 撞墙检测与即时反馈
    if (currCell.walls[chosenCandidate.dir]) {
      triggerSpherePing(175)
      return { moved: false, hitWall: true }
    }

    // 畅通移动并激发迈步回声
    setPlayerCell(chosenCandidate.nb.f, chosenCandidate.nb.u, chosenCandidate.nb.v, true)
    triggerSpherePing(190)
    return { moved: true, nextCell: chosenCandidate.nb }
  }

  // ===== 视角模式切换与镜头过渡动画驱动 =====
  function setExplorationMode(enable) {
    if (isExplorationMode === enable && !isTransitioning) return
    isExplorationMode = enable

    isTransitioning = true
    transitionProgress = 0.0
    camStartPos.copy(camera.position)
    camStartQuat.copy(camera.quaternion)
    isPointerDragging = false
    pointerVelocityX = 0
    pointerVelocityY = 0

    if (enable) {
      // 切换进入探图模式：从当前全景观察视角平滑对齐切线朝向
      const screenUp = new THREE.Vector3(0, 1, 0).applyQuaternion(camera.quaternion)
      const projNorth = screenUp.projectOnPlane(playerNormal).normalize()
      if (projNorth.lengthSq() > 0.1) {
        tangentNorth.copy(projNorth)
        tangentRight.crossVectors(tangentNorth, playerNormal).normalize()
      }
    }
  }

  function toggleExplorationMode() {
    setExplorationMode(!isExplorationMode)
    return isExplorationMode
  }

  function getExplorationMode() {
    return isExplorationMode
  }

  // ===== 狗狗寻路路线更新 =====
  function updateDogSphere(pathCells, active) {
    dogGroup.visible = !!active
    dogPathLine.visible = !!active
    if (!active || !pathCells || pathCells.length === 0) return

    const pts = pathCells.map(c => new THREE.Vector3(c.x, c.y, c.z).addScaledVector(new THREE.Vector3(c.nx, c.ny, c.nz), 0.12))
    dogPathGeo.setFromPoints(pts)

    const cur = pathCells[0]
    dogGroup.position.set(cur.x, cur.y, cur.z).addScaledVector(new THREE.Vector3(cur.nx, cur.ny, cur.nz), 0.2)
  }

  // ===== 渲染主循环 =====
  let lastTime = 0
  function update(timestamp) {
    if (!lastTime) lastTime = timestamp
    const dt = Math.min(0.05, (timestamp - lastTime) / 1000)
    lastTime = timestamp

    // 1. 玩家地表平滑缓动与呼吸光晕
    playerPos.lerp(playerTargetPos, 0.28)
    playerGroup.position.copy(playerPos)
    const haloScale = 1.0 + 0.14 * Math.sin(timestamp * 0.006)
    playerGlow.scale.set(haloScale, haloScale, haloScale)

    // 2. 声波在球面扩散并渲染可视化光环
    const R_WAVE = R * 1.015
    for (let i = pings.length - 1; i >= 0; i--) {
      const ping = pings[i]
      const prevWaveFront = Math.max(0, ping.currentDist - 0.2)
      ping.currentDist += ping.speed * dt
      ping.age += dt

      if (ping.currentDist >= ping.maxDist || ping.age > 3.2) {
        if (ping.visual) {
          ping.visual.active = false
          ping.visual.group.visible = false
        }
        pings.splice(i, 1)
        continue
      }

      const waveFront = ping.currentDist

      // (A) 触发墙体点亮：多点测地线波前扫描，绝对不漏掉任何墙段
      for (let wIdx = 0; wIdx < wallCount; wIdx++) {
        const wData = cellWalls[wIdx]
        const cosS = ping.origin.dot(wData.pStart) / (R * R)
        const cosM = ping.origin.dot(wData.mid) / (R * R)
        const cosE = ping.origin.dot(wData.pEnd) / (R * R)
        const maxCos = Math.max(-1, Math.min(1, Math.max(cosS, cosM, cosE)))
        const minArc = R * Math.acos(maxCos)

        // 当波前触及该墙体范围（覆盖平滑区间）
        if (waveFront >= minArc - 0.6 && prevWaveFront <= minArc + 2.0) {
          wData.revealTimer = Math.max(wData.revealTimer, ping.intensity)
        }
      }

      // 终点光柱探测点亮
      const exitPos = exitGroup.position
      const cosExit = Math.max(-1, Math.min(1, ping.origin.dot(exitPos) / (R * R)))
      const exitArc = R * Math.acos(cosExit)
      if (Math.abs(exitArc - waveFront) <= 2.2) {
        exitRevealTimer = 1.0
      }

      // (B) 渲染该声波的可视化测地线波前光环
      if (ping.visual) {
        const vis = ping.visual
        const alpha = Math.max(0, (1 - waveFront / ping.maxDist) * ping.intensity)
        vis.ringMat.opacity = alpha * 0.95
        vis.ribbonMat.opacity = alpha * 0.32

        const thetaFront = Math.min(Math.PI - 0.001, waveFront / R)
        const thetaBack = Math.max(0.001, (waveFront - 0.5) / R)
        const cosF = Math.cos(thetaFront), sinF = Math.sin(thetaFront)
        const cosB = Math.cos(thetaBack), sinB = Math.sin(thetaBack)

        const ringArr = vis.ringPos
        const ribbonArr = vis.ribbonPos

        for (let k = 0; k <= WAVE_SEGMENTS; k++) {
          const phi = (k / WAVE_SEGMENTS) * Math.PI * 2
          const cosP = Math.cos(phi), sinP = Math.sin(phi)
          const dirX = ping.basisA.x * cosP + ping.basisB.x * sinP
          const dirY = ping.basisA.y * cosP + ping.basisB.y * sinP
          const dirZ = ping.basisA.z * cosP + ping.basisB.z * sinP

          const pFx = (ping.normal.x * cosF + dirX * sinF) * R_WAVE
          const pFy = (ping.normal.y * cosF + dirY * sinF) * R_WAVE
          const pFz = (ping.normal.z * cosF + dirZ * sinF) * R_WAVE

          const pBx = (ping.normal.x * cosB + dirX * sinB) * R_WAVE
          const pBy = (ping.normal.y * cosB + dirY * sinB) * R_WAVE
          const pBz = (ping.normal.z * cosB + dirZ * sinB) * R_WAVE

          ringArr[k * 3] = pFx
          ringArr[k * 3 + 1] = pFy
          ringArr[k * 3 + 2] = pFz

          const rIdx = k * 6
          ribbonArr[rIdx] = pFx
          ribbonArr[rIdx + 1] = pFy
          ribbonArr[rIdx + 2] = pFz
          ribbonArr[rIdx + 3] = pBx
          ribbonArr[rIdx + 4] = pBy
          ribbonArr[rIdx + 5] = pBz
        }

        vis.ringGeo.attributes.position.needsUpdate = true
        vis.ribbonGeo.attributes.position.needsUpdate = true
      }
    }

    // 3. 墙面纯白色光亮随时间衰减隐入绝对黑暗（网格实体 + 顶部脊线）
    let needsColorUpdate = false
    const wallArr = wallColorAttr?.array
    const lineArr = wallLineColorAttr?.array

    if (wallArr && lineArr) {
      for (let wIdx = 0; wIdx < wallCount; wIdx++) {
        const wData = cellWalls[wIdx]
        if (wData.revealTimer > 0) {
          wData.revealTimer = Math.max(0, wData.revealTimer - dt * 0.40)
          const intensity = Math.min(1.0, wData.revealTimer)

          // (a) 更新实心曲面颜色
          const vStart = wData.vertStart * 3
          const vEnd = (wData.vertStart + wData.vertCount) * 3
          for (let idx = vStart; idx < vEnd; idx += 3) {
            wallArr[idx] = intensity
            wallArr[idx + 1] = intensity
            wallArr[idx + 2] = intensity
          }

          // (b) 更新线脊颜色
          const lStart = wData.lineStart * 3
          const lEnd = (wData.lineStart + wData.lineCount) * 3
          for (let idx = lStart; idx < lEnd; idx += 3) {
            lineArr[idx] = intensity
            lineArr[idx + 1] = intensity
            lineArr[idx + 2] = intensity
          }

          needsColorUpdate = true
        }
      }
      if (needsColorUpdate) {
        wallColorAttr.needsUpdate = true
        wallLineColorAttr.needsUpdate = true
      }
    }

    // 4. 终点光柱与脉冲展示
    if (exitRevealTimer > 0) {
      exitRevealTimer = Math.max(0, exitRevealTimer - dt * 0.35)
      exitGroup.visible = true
      const pulse = 1.0 + 0.3 * Math.sin(timestamp * 0.006)
      exitOrb.scale.set(pulse, pulse, pulse)
    } else if (dogGroup.visible) {
      exitGroup.visible = true
    } else {
      exitGroup.visible = false
    }

    // 5. 视角切换过渡动画与镜头驱动
    const camTargetPos = playerPos.clone()
      .addScaledVector(playerNormal, CAM_H)
      .addScaledVector(tangentNorth, -CAM_BACK)
    const lookTarget = playerPos.clone().addScaledVector(tangentNorth, 0.4)

    if (isTransitioning) {
      transitionProgress += dt / transitionDuration
      const p = Math.min(1.0, transitionProgress)
      const t = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2

      if (isExplorationMode) {
        const m = new THREE.Matrix4().lookAt(camTargetPos, lookTarget, tangentNorth)
        const targetQuat = new THREE.Quaternion().setFromRotationMatrix(m)

        camera.position.lerpVectors(camStartPos, camTargetPos, t)
        camera.quaternion.slerpQuaternions(camStartQuat, targetQuat, t)

        if (p >= 1.0) {
          isTransitioning = false
          camera.position.copy(camTargetPos)
          camera.up.copy(tangentNorth)
          camera.lookAt(lookTarget)
        }
      } else {
        const targetPos = playerNormal.clone().multiplyScalar(22.0)
        const targetUp = Math.abs(playerNormal.y) > 0.92 ? new THREE.Vector3(0, 0, 1) : new THREE.Vector3(0, 1, 0)
        const m = new THREE.Matrix4().lookAt(targetPos, new THREE.Vector3(0, 0, 0), targetUp)
        const targetQuat = new THREE.Quaternion().setFromRotationMatrix(m)

        camera.position.lerpVectors(camStartPos, targetPos, t)
        camera.quaternion.slerpQuaternions(camStartQuat, targetQuat, t)

        if (p >= 1.0) {
          isTransitioning = false
          camDistance = 22.0
          camera.position.copy(targetPos)
          camera.quaternion.copy(targetQuat)
        }
      }
    } else {
      if (isExplorationMode) {
        camera.position.lerp(camTargetPos, 0.25)
        camera.up.copy(tangentNorth)
        camera.lookAt(lookTarget)
      } else {
        // 全景模式惯性旋转阻尼衰减
        if (!isPointerDragging && (Math.abs(pointerVelocityX) > 0.02 || Math.abs(pointerVelocityY) > 0.02)) {
          rotateSphericalCamera(pointerVelocityX, pointerVelocityY)
          pointerVelocityX *= 0.92
          pointerVelocityY *= 0.92
        }
      }
    }

    renderer.render(scene, camera)
  }

  function resize() {
    const nw = mountEl.clientWidth || 1
    const nh = mountEl.clientHeight || 1
    camera.aspect = nw / nh
    camera.updateProjectionMatrix()
    renderer.setSize(nw, nh)
  }

  function dispose() {
    dom.removeEventListener('pointerdown', onPointerDown)
    window.removeEventListener('pointermove', onPointerMove)
    window.removeEventListener('pointerup', onPointerUp)
    window.removeEventListener('pointercancel', onPointerUp)
    dom.removeEventListener('wheel', onWheel)
    renderer.dispose()
    if (wallGeometry) wallGeometry.dispose()
    if (wallLineGeo) wallLineGeo.dispose()
    planetMesh.geometry.dispose()
    planetMesh.material.dispose()
    dogPathGeo.dispose()
    dogPathLineMat.dispose()
    for (const v of waveVisuals) {
      v.ribbonGeo.dispose()
      v.ribbonMat.dispose()
      v.ringGeo.dispose()
      v.ringMat.dispose()
    }
    if (renderer.domElement.parentNode) {
      renderer.domElement.parentNode.removeChild(renderer.domElement.parentNode)
    }
  }

  return {
    buildSphereWalls,
    setPlayerCell,
    setExitCell,
    triggerSpherePing,
    handleScreenDirectionCommand,
    setExplorationMode,
    toggleExplorationMode,
    getExplorationMode,
    updateDogSphere,
    update,
    resize,
    dispose,
  }
}
