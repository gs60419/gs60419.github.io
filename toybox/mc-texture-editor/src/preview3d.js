/**
 * preview3d.js — Three.js 3D 方塊預覽
 * 功能：方塊旋轉預覽、自動旋轉、手動拖轉、切換模型（方塊/物品/平面）
 */

var Preview3D = (() => {

  let renderer, scene, camera, mesh;
  let autoRotate = true;
  let isDragging = false;
  let prevMouse = { x: 0, y: 0 };
  let frameId = null;
  let currentCanvas = null;
  let texture = null;
  let modelType = 'cube';   // 'cube' | 'flat' | 'slab'
  let mounted = false;

  /* ===== 初始化 ===== */
  function init(container) {
    if (mounted) destroy();
    mounted = true;

    const W = container.clientWidth  || 200;
    const H = container.clientHeight || 200;

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: false, alpha: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(W, H);
    renderer.setClearColor(0x000000, 0);
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Scene
    scene = new THREE.Scene();

    // Camera
    camera = new THREE.PerspectiveCamera(45, W / H, 0.1, 100);
    camera.position.set(1.8, 1.4, 1.8);
    camera.lookAt(0, 0, 0);

    // Lights
    const ambient = new THREE.AmbientLight(0xffffff, 0.6);
    scene.add(ambient);
    const dir = new THREE.DirectionalLight(0xffffff, 0.8);
    dir.position.set(2, 3, 2);
    scene.add(dir);
    const dir2 = new THREE.DirectionalLight(0x8888ff, 0.3);
    dir2.position.set(-2, -1, -1);
    scene.add(dir2);

    // 建立預設材質（灰色）
    texture = new THREE.CanvasTexture(createDefaultCanvas());
    texture.magFilter = THREE.NearestFilter;
    texture.minFilter = THREE.NearestFilter;

    buildMesh();
    buildControls(container);
    animate();
    buildUI(container);

    // RWD
    const ro = new ResizeObserver(() => {
      const ui = container.querySelector('#preview-ui');
      const uiH = ui ? ui.offsetHeight : 28;
      const w = container.clientWidth;
      const h = container.clientHeight - uiH;
      if (w > 0 && h > 0) {
        renderer.setSize(w, h);
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
      }
    });
    ro.observe(container);
  }

  /* ===== 建立方塊 ===== */
  function buildMesh() {
    if (mesh) scene.remove(mesh);

    let geo;
    if (modelType === 'cube') {
      geo = new THREE.BoxGeometry(1, 1, 1);
    } else if (modelType === 'slab') {
      geo = new THREE.BoxGeometry(1, 0.5, 1);
    } else if (modelType === 'flat') {
      geo = new THREE.PlaneGeometry(1, 1);
    }

    // 每個面用同一張貼圖（可以之後擴充 6 面分離）
    const mat = modelType === 'flat'
      ? new THREE.MeshLambertMaterial({ map: texture, side: THREE.DoubleSide, transparent: true })
      : Array(6).fill(null).map(() =>
          new THREE.MeshLambertMaterial({ map: texture, transparent: true })
        );

    mesh = new THREE.Mesh(geo, mat);
    scene.add(mesh);
  }

  /* ===== 更新貼圖 ===== */
  function updateTexture(srcCanvas) {
    currentCanvas = srcCanvas;
    if (!texture) return;
    texture.image = srcCanvas;
    texture.needsUpdate = true;
  }

  /* ===== 預設貼圖（格子磚） ===== */
  function createDefaultCanvas() {
    const c = document.createElement('canvas');
    c.width = 16; c.height = 16;
    const ctx = c.getContext('2d');
    for (let y = 0; y < 16; y++) for (let x = 0; x < 16; x++) {
      ctx.fillStyle = (x + y) % 2 === 0 ? '#555' : '#444';
      ctx.fillRect(x, y, 1, 1);
    }
    return c;
  }

  /* ===== 動畫迴圈 ===== */
  function animate() {
    frameId = requestAnimationFrame(animate);
    if (autoRotate && mesh) mesh.rotation.y += 0.008;
    renderer.render(scene, camera);
  }

  /* ===== 滑鼠拖轉 ===== */
  function buildControls(container) {
    const el = renderer.domElement;
    el.addEventListener('mousedown', e => {
      isDragging = true;
      autoRotate = false;
      prevMouse = { x: e.clientX, y: e.clientY };
    });
    el.addEventListener('mousemove', e => {
      if (!isDragging || !mesh) return;
      const dx = e.clientX - prevMouse.x;
      const dy = e.clientY - prevMouse.y;
      mesh.rotation.y += dx * 0.01;
      mesh.rotation.x += dy * 0.01;
      prevMouse = { x: e.clientX, y: e.clientY };
    });
    el.addEventListener('mouseup',    () => isDragging = false);
    el.addEventListener('mouseleave', () => isDragging = false);

    // 滾輪縮放
    el.addEventListener('wheel', e => {
      e.preventDefault();
      camera.position.multiplyScalar(e.deltaY > 0 ? 1.1 : 0.9);
    }, { passive: false });
  }

  /* ===== UI 按鈕列 ===== */
  function buildUI(container) {
    const ui = document.createElement('div');
    ui.id = 'preview-ui';
    ui.innerHTML = `
      <button class="tb-btn ${modelType==='cube'?'active':''}"  data-model="cube"  title="方塊">🧱</button>
      <button class="tb-btn ${modelType==='slab'?'active':''}"  data-model="slab"  title="半磚">▬</button>
      <button class="tb-btn ${modelType==='flat'?'active':''}"  data-model="flat"  title="平面">▭</button>
      <div style="flex:1"></div>
      <button class="tb-btn" id="btn-auto-rot" title="${autoRotate?'停止旋轉':'自動旋轉'}">
        ${autoRotate ? '⏸' : '▶'}
      </button>
      <button class="tb-btn" id="btn-reset-cam" title="重置視角">⊙</button>
    `;
    container.appendChild(ui);

    ui.querySelectorAll('[data-model]').forEach(btn => {
      btn.addEventListener('click', () => {
        modelType = btn.dataset.model;
        buildMesh();
        if (currentCanvas) updateTexture(currentCanvas);
        ui.querySelectorAll('[data-model]').forEach(b => b.classList.toggle('active', b.dataset.model === modelType));
      });
    });

    document.getElementById('btn-auto-rot').addEventListener('click', () => {
      autoRotate = !autoRotate;
      document.getElementById('btn-auto-rot').textContent = autoRotate ? '⏸' : '▶';
    });

    document.getElementById('btn-reset-cam').addEventListener('click', () => {
      camera.position.set(1.8, 1.4, 1.8);
      camera.lookAt(0, 0, 0);
      if (mesh) { mesh.rotation.x = 0; mesh.rotation.y = 0; }
      autoRotate = true;
      document.getElementById('btn-auto-rot').textContent = '⏸';
    });
  }

  function destroy() {
    if (frameId) cancelAnimationFrame(frameId);
    if (renderer) renderer.dispose();
    mounted = false;
  }

  return { init, updateTexture };
})();
