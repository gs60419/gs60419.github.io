/**
 * editor.js — 像素編輯器核心
 */

var Editor = (() => {

  /* ===== 狀態 ===== */
  let displayCanvas, dCtx;
  let W = 16, H = 16;
  let zoom = 1;
  let tool = 'brush';
  let brushSize = 1;
  let fgColor = '#4ecca3';
  let bgColor = '#000000';
  let isDrawing = false;
  let lastX = -1, lastY = -1;
  let showGrid = true;
  let layers = [];
  let activeLayer = 0;
  let undoStack = [], redoStack = [];
  let onChangeCallbacks = [];

  /*
   * 選取狀態機
   * selState: 'none' | 'selecting' | 'selected' | 'floating'
   *   none      — 沒有選取
   *   selecting — 正在拖曳框選
   *   selected  — 框選完成，內容仍在圖層
   *   floating  — 內容已「抬起」變成浮動層（移動/貼上時）
   */
  let selState  = 'none';
  let sel       = null;   // { x, y, w, h }
  let selStart  = null;   // 框選起點
  let float     = null;   // { canvas, x, y, dragOffX, dragOffY }  浮動層
  let clipboard = null;   // { canvas } 複製緩衝區
  let marchOffset = 0;
  let marchTimer  = null;

  /* ===== 圖層 ===== */
  function createLayer(name) {
    const c = document.createElement('canvas');
    c.width = W; c.height = H;
    return { name, canvas: c, ctx: c.getContext('2d'), visible: true, opacity: 1 };
  }

  /* ===== 初始化 ===== */
  function init(container, w, h, initialImage = null) {
    W = w; H = h;
    selState = 'none'; sel = null; float = null; selStart = null;
    if (marchTimer) { clearInterval(marchTimer); marchTimer = null; }
    container.innerHTML = '';

    container.insertAdjacentHTML('beforeend', `
      <div id="editor-root">
        <div id="toolbar"></div>
        <div id="sel-toolbar" style="display:none"></div>
        <div id="editor-workspace">
          <div id="canvas-container">
            <canvas id="display-canvas"></canvas>
          </div>
          <div id="layer-panel">
            <div class="panel-title">${_t('圖層')}</div>
            <div id="layer-list"></div>
            <div style="display:flex;gap:4px;margin-top:6px">
              <button class="btn btn-small btn-secondary" id="btn-add-layer" title="${_t('新增空白圖層')}">＋</button>
              <button class="btn btn-small btn-secondary" id="btn-del-layer" title="${_t('刪除圖層')}">－</button>
              <button class="btn btn-small btn-secondary" id="btn-import-layer" title="${_t('匯入圖片為圖層')}">📂</button>
              <button class="btn btn-small btn-secondary" id="btn-merge-down">${_t('⬇ 合併')}</button>
            </div>
            <input type="file" id="import-layer-input" accept="image/*" style="display:none" />
          </div>
        </div>
        <div id="editor-statusbar">
          <span id="cursor-pos">—</span>
          <span id="sel-info"></span>
          <span style="flex:1"></span>
          <span id="zoom-info">${_t('縮放: ')}100%</span>
        </div>
      </div>
    `);

    displayCanvas = document.getElementById('display-canvas');
    dCtx = displayCanvas.getContext('2d');
    layers = [];
    addLayer(_t('背景'));
    activeLayer = 0;
    if (initialImage) layers[0].ctx.drawImage(initialImage, 0, 0);

    buildToolbar();
    buildLayerPanel();
    setZoom(calcDefaultZoom());
    bindEvents();
    render();
  }

  function calcDefaultZoom() {
    const wrap = document.getElementById('canvas-container');
    const avail = Math.min(wrap.clientWidth - 40, wrap.clientHeight - 40);
    return Math.max(1, Math.floor(avail / Math.max(W, H)));
  }

  /* ===== 工具列 ===== */
  const TOOLS = [
    { id:'brush',    icon:'✏️', label:_t('筆刷 (B)') },
    { id:'varbrush', icon:'🌈', label:_t('變化筆刷 (V)') },
    { id:'dodge',    icon:'🔆', label:_t('提亮筆刷 (D)  左鍵+10%  右鍵-10%') },
    { id:'blend',    icon:'🫧', label:_t('混色筆刷 (G)  與背景色混合') },
    { id:'eraser',   icon:'⬜', label:_t('橡皮擦 (E)') },
    { id:'fill',     icon:'🪣', label:_t('填色桶 (F)') },
    { id:'eyedrop',  icon:'💉', label:_t('滴管 (I)') },
    { id:'rect',     icon:'⬚',  label:_t('矩形選取 (R)') },
  ];

  function buildToolbar() {
    const tb = document.getElementById('toolbar');
    tb.innerHTML = `
      <div class="tb-group">
        ${TOOLS.map(t=>`<button class="tb-btn ${t.id===tool?'active':''}" data-tool="${t.id}" title="${t.label}">${t.icon}</button>`).join('')}
      </div>
      <div class="tb-sep"></div>
      <div class="tb-group">
        <div class="color-swatch-wrap" title="${_t('前景色（左鍵）')}">
          <div class="color-swatch fg" id="swatch-fg" style="background:${fgColor}"></div>
          <input type="color" id="picker-fg" value="${fgColor}" />
        </div>
        <div class="color-swatch-wrap" title="${_t('背景色（右鍵）')}">
          <div class="color-swatch bg" id="swatch-bg" style="background:${bgColor}"></div>
          <input type="color" id="picker-bg" value="${bgColor}" />
        </div>
        <button class="tb-btn" id="btn-swap-color" title="${_t('交換顏色')}">⇄</button>
      </div>
      <div class="tb-sep"></div>
      <div class="tb-group">
        <label class="tb-label">${_t('筆刷')}</label>
        <select id="brush-size">
          ${[1,2,3,4].map(n=>`<option value="${n}" ${n===brushSize?'selected':''}>${n}px</option>`).join('')}
        </select>
      </div>
      <div class="tb-sep"></div>
      <div class="tb-group">
        <button class="tb-btn" id="btn-undo" title="${_t('復原 Ctrl+Z')}">↩</button>
        <button class="tb-btn" id="btn-redo" title="${_t('重做 Ctrl+Y')}">↪</button>
      </div>
      <div class="tb-sep"></div>
      <div class="tb-group">
        <button class="tb-btn" id="btn-zoom-in"  title="${_t('放大 滾輪↑')}">＋</button>
        <button class="tb-btn" id="btn-zoom-out" title="${_t('縮小 滾輪↓')}">－</button>
        <button class="tb-btn" id="btn-zoom-fit" title="${_t('適合視窗')}">⊡</button>
        <label class="tb-label tb-toggle">
          <input type="checkbox" id="toggle-grid" ${showGrid?'checked':''} /> ${_t('格線')}
        </label>
      </div>
      <div class="tb-sep"></div>
      <div class="tb-group">
        <button class="tb-btn" id="btn-resize-canvas" title="${_t('調整畫布尺寸')}">⤢</button>
      </div>
    `;

    tb.querySelectorAll('.tb-btn[data-tool]').forEach(btn =>
      btn.addEventListener('click', () => setTool(btn.dataset.tool)));
    document.getElementById('swatch-fg').addEventListener('click', () => document.getElementById('picker-fg').click());
    document.getElementById('swatch-bg').addEventListener('click', () => document.getElementById('picker-bg').click());
    document.getElementById('picker-fg').addEventListener('input', e => setFgColor(e.target.value));
    document.getElementById('picker-bg').addEventListener('input', e => setBgColor(e.target.value));
    document.getElementById('btn-swap-color').addEventListener('click', () => {
      [fgColor, bgColor] = [bgColor, fgColor];
      document.getElementById('picker-fg').value = fgColor;
      document.getElementById('picker-bg').value = bgColor;
      document.getElementById('swatch-fg').style.background = fgColor;
      document.getElementById('swatch-bg').style.background = bgColor;
    });
    document.getElementById('brush-size').addEventListener('change', e => brushSize = +e.target.value);
    document.getElementById('btn-undo').addEventListener('click', undo);
    document.getElementById('btn-redo').addEventListener('click', redo);
    document.getElementById('btn-zoom-in').addEventListener('click',  () => setZoom(zoom * 2));
    document.getElementById('btn-zoom-out').addEventListener('click', () => setZoom(zoom / 2));
    document.getElementById('btn-zoom-fit').addEventListener('click', () => setZoom(calcDefaultZoom()));
    document.getElementById('toggle-grid').addEventListener('change', e => { showGrid = e.target.checked; render(); });
    document.getElementById('btn-resize-canvas').addEventListener('click', openResizeDialog);
  }

  /* ===== 選取工具列（選取後才顯示）===== */
  function buildSelToolbar(show) {
    const tb = document.getElementById('sel-toolbar');
    if (!tb) return;
    if (!show) { tb.style.display = 'none'; return; }
    tb.style.display = 'flex';
    tb.innerHTML = `
      <div class="sel-tb-label">${_t('選取：')}</div>
      <button class="btn btn-small btn-secondary" id="sel-cut"   title="Cut Ctrl+X">${_t('✂️ 剪下')}</button>
      <button class="btn btn-small btn-secondary" id="sel-copy"  title="Copy Ctrl+C">${_t('📋 複製')}</button>
      <button class="btn btn-small btn-secondary" id="sel-paste" title="Paste Ctrl+V" ${clipboard?'':'disabled'}>${_t('📌 貼上')}</button>
      <button class="btn btn-small btn-secondary" id="sel-del"   title="Delete">${_t('🗑 刪除')}</button>
      <div class="tb-sep"></div>
      <button class="btn btn-small btn-secondary" id="sel-fliph">${_t('↔ 水平')}</button>
      <button class="btn btn-small btn-secondary" id="sel-flipv">${_t('↕ 垂直')}</button>
      <button class="btn btn-small btn-secondary" id="sel-rot90">${_t('↻ 旋轉')}</button>
      <div class="tb-sep"></div>
      <button class="btn btn-small btn-secondary" id="sel-commit" title="Enter" ${selState==='floating'?'':'style="display:none"'}>${_t('✓ 確認')}</button>
      <button class="btn btn-small btn-secondary" id="sel-desel" title="Esc">${_t('✕ 取消')}</button>
    `;
    document.getElementById('sel-cut').onclick   = () => cutSel();
    document.getElementById('sel-copy').onclick  = () => copySel();
    document.getElementById('sel-paste').onclick = () => pasteSel();
    document.getElementById('sel-del').onclick   = () => deleteSel();
    document.getElementById('sel-fliph').onclick = () => flipSel('h');
    document.getElementById('sel-flipv').onclick = () => flipSel('v');
    document.getElementById('sel-rot90').onclick = () => rotateSel();
    document.getElementById('sel-commit').onclick= () => commitFloat();
    document.getElementById('sel-desel').onclick = () => deselect();
  }

  /* ===== 圖層面板 ===== */
  function buildLayerPanel() {
    const list = document.getElementById('layer-list');
    list.innerHTML = '';
    [...layers].reverse().forEach((l, ri) => {
      const i = layers.length - 1 - ri;
      const el = document.createElement('div');
      el.className = 'layer-item' + (i === activeLayer ? ' active' : '');
      el.innerHTML = `
        <input type="checkbox" class="layer-vis" ${l.visible?'checked':''} />
        <canvas class="layer-thumb" width="${W}" height="${H}"></canvas>
        <span class="layer-name">${esc(l.name)}</span>
        <input type="range" class="layer-opacity" min="0" max="100" value="${Math.round(l.opacity*100)}" />
      `;
      el.querySelector('.layer-thumb').getContext('2d').drawImage(l.canvas, 0, 0);
      el.addEventListener('click', ev => {
        if (ev.target.classList.contains('layer-vis') || ev.target.classList.contains('layer-opacity')) return;
        activeLayer = i; buildLayerPanel();
      });
      el.querySelector('.layer-vis').addEventListener('change', ev => { l.visible = ev.target.checked; render(); });
      el.querySelector('.layer-opacity').addEventListener('input', ev => { l.opacity = ev.target.value/100; render(); });
      list.appendChild(el);
    });
    document.getElementById('btn-add-layer').onclick = () => { addLayer(_t('圖層 ')+(layers.length+1)); buildLayerPanel(); render(); };
    document.getElementById('btn-import-layer').onclick = () => document.getElementById('import-layer-input').click();
    document.getElementById('import-layer-input').onchange = e => {
      const file = e.target.files[0];
      if (!file) return;
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        const name = file.name.replace(/\.[^.]+$/, '');
        addLayerFromCanvas(name, img);
        buildLayerPanel();
      };
      img.onerror = () => { URL.revokeObjectURL(url); if (window.showToast) showToast('❌ ' + (GT_LANG==='en' ? 'Failed to load image' : '圖片載入失敗')); };
      img.src = url;
      e.target.value = ''; // 允許重複選同一檔案
    };
    document.getElementById('btn-del-layer').onclick = () => {
      if (layers.length<=1) return;
      saveUndo(); layers.splice(activeLayer,1);
      activeLayer = Math.min(activeLayer, layers.length-1);
      buildLayerPanel(); render();
    };
    document.getElementById('btn-merge-down').onclick = () => {
      if (activeLayer===0) return;
      saveUndo();
      const above=layers[activeLayer], below=layers[activeLayer-1];
      below.ctx.globalAlpha=above.opacity; below.ctx.drawImage(above.canvas,0,0); below.ctx.globalAlpha=1;
      layers.splice(activeLayer,1); activeLayer--;
      buildLayerPanel(); render();
    };
  }

  function addLayer(name) { layers.push(createLayer(name)); activeLayer = layers.length-1; }

  /* ===== 跨素材：從外部 canvas 加入新圖層 ===== */
  function addLayerFromCanvas(name, srcCanvas) {
    saveUndo();
    const l = createLayer(name);
    // 縮放貼入（等比，若尺寸不同）
    l.ctx.imageSmoothingEnabled = false;
    l.ctx.drawImage(srcCanvas, 0, 0, W, H);
    layers.push(l);
    activeLayer = layers.length - 1;
    buildLayerPanel();
    render();
    onChangeCallbacks.forEach(cb => { try { cb(getFlatCanvas()); } catch(e){} });
    if (window.showToast) showToast(GT_LANG==='en' ? `✅ Layer "${name}" added` : `✅ 已加入圖層「${name}」`);
  }

  /* ===== 縮放 ===== */
  function setZoom(z) {
    zoom = Math.min(32, Math.max(1, Math.round(z)));
    displayCanvas.width  = W * zoom;
    displayCanvas.height = H * zoom;
    dCtx.imageSmoothingEnabled = false;
    render();
    const el = document.getElementById('zoom-info');
    if (el) el.textContent = `${_t('縮放: ')}${zoom*100}%`;
  }

  /* ===== 渲染 ===== */
  function render() {
    dCtx.clearRect(0, 0, displayCanvas.width, displayCanvas.height);

    // 棋盤
    for (let y=0;y<H;y++) for (let x=0;x<W;x++) {
      dCtx.fillStyle = (x+y)%2===0 ? '#444' : '#555';
      dCtx.fillRect(x*zoom, y*zoom, zoom, zoom);
    }

    // 圖層
    layers.forEach(l => {
      if (!l.visible) return;
      dCtx.globalAlpha = l.opacity;
      dCtx.imageSmoothingEnabled = false;
      dCtx.drawImage(l.canvas, 0, 0, W*zoom, H*zoom);
    });
    dCtx.globalAlpha = 1;

    // 浮動層
    if (float) {
      dCtx.globalAlpha = 0.85;
      dCtx.imageSmoothingEnabled = false;
      dCtx.drawImage(float.canvas,
        float.x * zoom, float.y * zoom,
        float.canvas.width * zoom, float.canvas.height * zoom);
      dCtx.globalAlpha = 1;
    }

    // 格線
    if (showGrid && zoom >= 4) {
      dCtx.strokeStyle = 'rgba(0,0,0,0.3)';
      dCtx.lineWidth = 0.5;
      for (let x=0;x<=W;x++) { dCtx.beginPath();dCtx.moveTo(x*zoom,0);dCtx.lineTo(x*zoom,H*zoom);dCtx.stroke(); }
      for (let y=0;y<=H;y++) { dCtx.beginPath();dCtx.moveTo(0,y*zoom);dCtx.lineTo(W*zoom,y*zoom);dCtx.stroke(); }
    }

    // 螞蟻線
    if (sel && selState !== 'none') {
      const rx = sel.x * zoom, ry = sel.y * zoom;
      const rw = sel.w * zoom, rh = sel.h * zoom;
      dCtx.save();
      dCtx.strokeStyle = '#fff'; dCtx.lineWidth = 1;
      dCtx.setLineDash([4,4]); dCtx.lineDashOffset = -marchOffset;
      dCtx.strokeRect(rx+.5, ry+.5, rw, rh);
      dCtx.strokeStyle = '#000'; dCtx.lineDashOffset = -marchOffset+4;
      dCtx.strokeRect(rx+.5, ry+.5, rw, rh);
      dCtx.restore();
    }

    onChangeCallbacks.forEach(cb => cb(getFlatCanvas()));
  }

  function startMarch() {
    if (marchTimer) return;
    marchTimer = setInterval(() => { marchOffset=(marchOffset+1)%8; render(); }, 80);
  }
  function stopMarch() {
    if (marchTimer) { clearInterval(marchTimer); marchTimer=null; }
    marchOffset = 0;
  }

  /* ===== 合成輸出 ===== */
  function getFlatCanvas() {
    const out = document.createElement('canvas');
    out.width=W; out.height=H;
    const c = out.getContext('2d');
    layers.forEach(l => { if(!l.visible)return; c.globalAlpha=l.opacity; c.drawImage(l.canvas,0,0); });
    c.globalAlpha=1;
    return out;
  }

  /* ===== 事件綁定 ===== */
  function bindEvents() {
    displayCanvas.addEventListener('mousedown', onMouseDown);
    displayCanvas.addEventListener('mousemove', onMouseMove);
    displayCanvas.addEventListener('mouseup',   onMouseUp);
    displayCanvas.addEventListener('mouseleave', onMouseLeave);
    displayCanvas.addEventListener('contextmenu', e => e.preventDefault());
    displayCanvas.addEventListener('wheel', e => {
      e.preventDefault();
      setZoom(e.deltaY < 0 ? zoom*2 : zoom/2);
    }, { passive: false });

    document.addEventListener('keydown', onKeyDown);
  }

  function getPixelPos(e) {
    const rect = displayCanvas.getBoundingClientRect();
    return {
      x: Math.floor((e.clientX - rect.left) * (displayCanvas.width  / rect.width)  / zoom),
      y: Math.floor((e.clientY - rect.top)  * (displayCanvas.height / rect.height) / zoom)
    };
  }

  /* ===== 滑鼠事件 ===== */
  function onMouseDown(e) {
    const {x, y} = getPixelPos(e);
    isDrawing = true;
    lastX = x; lastY = y;

    /* --- 選取工具 --- */
    if (tool === 'rect') {
      if (selState === 'floating') {
        // 點在浮動層內 → 繼續拖移；點在外 → 確認貼上
        if (float && inFloat(x, y)) {
          float.dragOffX = x - float.x;
          float.dragOffY = y - float.y;
        } else {
          commitFloat();
        }
        return;
      }
      if (selState === 'selected' && sel && inSel(x, y)) {
        // 點在選取框內 → 抬起成浮動層
        liftToFloat();
        float.dragOffX = x - float.x;
        float.dragOffY = y - float.y;
        return;
      }
      // 新框選
      if (selState === 'selected') commitFloat_noop();  // 取消舊選取
      selState = 'selecting';
      selStart = {x, y};
      sel = {x, y, w:0, h:0};
      startMarch();
      return;
    }

    /* --- 其他工具：先確認浮動層 --- */
    if (selState === 'floating') commitFloat();

    saveUndo();
    if (tool === 'fill') { fillBucket(x, y, e.button===2?bgColor:fgColor); render(); buildLayerPanel(); return; }
    if (tool === 'eyedrop') { pickColor(x, y, e.button); return; }
    drawAt(x, y, e.button);
    render();
  }

  function onMouseMove(e) {
    const {x, y} = getPixelPos(e);
    const pos = document.getElementById('cursor-pos');
    if (pos) pos.textContent = `X:${x} Y:${y}`;

    // 浮動層拖移
    if (tool==='rect' && isDrawing && selState==='floating' && float && float.dragOffX !== undefined) {
      float.x = x - float.dragOffX;
      float.y = y - float.dragOffY;
      updateSel(float.x, float.y, float.canvas.width, float.canvas.height);
      render(); return;
    }

    // 框選中
    if (tool==='rect' && isDrawing && selState==='selecting' && selStart) {
      const nx = Math.max(0, Math.min(W, x));
      const ny = Math.max(0, Math.min(H, y));
      const x0 = Math.min(selStart.x, nx), y0 = Math.min(selStart.y, ny);
      const x1 = Math.max(selStart.x, nx), y1 = Math.max(selStart.y, ny);
      sel = {x:x0, y:y0, w:x1-x0, h:y1-y0};
      updateSelInfo();
      render(); return;
    }

    if (!isDrawing || tool==='eyedrop'||tool==='fill'||tool==='rect') return;
    if (x===lastX && y===lastY) return;
    // e.button 在 mousemove 永遠是 0，改用 e.buttons bit-flag
    // buttons: 1=左鍵, 2=右鍵
    const btn = (e.buttons & 2) ? 2 : 0;
    bresenham(lastX, lastY, x, y, (px,py)=>drawAt(px,py,btn));
    lastX=x; lastY=y;
    render();
  }

  function onMouseUp(e) {
    if (tool==='rect') {
      if (selState==='selecting') {
        if (sel && sel.w>0 && sel.h>0) {
          selState = 'selected';
          buildSelToolbar(true);
        } else {
          deselect();
        }
        updateSelInfo();
        render();
      } else if (selState==='floating' && float) {
        // 放開滑鼠，停止拖移（但不確認）
        delete float.dragOffX; delete float.dragOffY;
      }
    }
    isDrawing = false;
    selStart  = null;
    buildLayerPanel();
  }

  function onMouseLeave(e) {
    if (tool!=='rect') { isDrawing=false; buildLayerPanel(); }
  }

  /* ===== 鍵盤 ===== */
  function onKeyDown(e) {
    if (e.target.tagName==='INPUT'||e.target.tagName==='SELECT') return;
    if (e.key==='b'||e.key==='B') setTool('brush');
    if (e.key==='v'||e.key==='V') setTool('varbrush');
    if (e.key==='d'||e.key==='D') setTool('dodge');
    if (e.key==='g'||e.key==='G') setTool('blend');
    if (e.key==='e'||e.key==='E') setTool('eraser');
    if (e.key==='f'||e.key==='F') setTool('fill');
    if (e.key==='i'||e.key==='I') setTool('eyedrop');
    if (e.key==='r'||e.key==='R') setTool('rect');
    if (e.key==='Escape') deselect();
    if (e.key==='Enter' && selState==='floating') { e.preventDefault(); commitFloat(); }

    if ((e.ctrlKey||e.metaKey) && e.key==='z') { e.preventDefault(); undo(); }
    if ((e.ctrlKey||e.metaKey) && (e.key==='y'||(e.shiftKey&&e.key==='z'))) { e.preventDefault(); redo(); }

    if ((e.ctrlKey||e.metaKey) && e.key==='c') { e.preventDefault(); copySel(); }
    if ((e.ctrlKey||e.metaKey) && e.key==='x') { e.preventDefault(); cutSel(); }
    if ((e.ctrlKey||e.metaKey) && e.key==='v') { e.preventDefault(); pasteSel(); }
    if ((e.key==='Delete'||e.key==='Backspace') && (selState==='selected'||selState==='floating')) {
      e.preventDefault(); deleteSel();
    }
  }

  /* ===== 選取輔助 ===== */
  function inSel(x, y) {
    return sel && x>=sel.x && x<sel.x+sel.w && y>=sel.y && y<sel.y+sel.h;
  }
  function inFloat(x, y) {
    return float && x>=float.x && x<float.x+float.canvas.width && y>=float.y && y<float.y+float.canvas.height;
  }
  function updateSel(x,y,w,h) { sel={x,y,w,h}; updateSelInfo(); }
  function updateSelInfo() {
    const el = document.getElementById('sel-info');
    if (!el) return;
    el.textContent = sel && sel.w>0 && sel.h>0 ? `選取: ${sel.w}×${sel.h}` : '';
  }

  /* 把選取區域「抬起」成浮動層 */
  function liftToFloat() {
    saveUndo();
    const lc = layers[activeLayer];
    const c = document.createElement('canvas');
    c.width=sel.w; c.height=sel.h;
    c.getContext('2d').drawImage(lc.canvas, sel.x,sel.y,sel.w,sel.h, 0,0,sel.w,sel.h);
    lc.ctx.clearRect(sel.x, sel.y, sel.w, sel.h);
    float = { canvas:c, x:sel.x, y:sel.y };
    selState = 'floating';
    buildSelToolbar(true);
    render();
  }

  /* 確認浮動層 → 貼回圖層 */
  function commitFloat() {
    if (!float) { deselect(); return; }
    saveUndo();
    const lc = layers[activeLayer];
    lc.ctx.drawImage(float.canvas, float.x, float.y);
    float = null;
    deselect();
    buildLayerPanel();
    render();
    window.showToast && showToast('已確認貼上 ✓');
  }

  /* 取消選取（不貼回，浮動層丟棄 or 不動） */
  function commitFloat_noop() {
    // 舊選取：若有浮動層就先貼回（避免資料遺失）
    if (float) commitFloat(); else deselect();
  }

  function deselect() {
    // 如果有浮動層，先貼回
    if (float) {
      const lc = layers[activeLayer];
      lc.ctx.drawImage(float.canvas, float.x, float.y);
      float = null;
      buildLayerPanel();
    }
    selState='none'; sel=null; selStart=null;
    stopMarch();
    updateSelInfo();
    buildSelToolbar(false);
    render();
  }

  /* ===== 選取操作 ===== */
  function copySel() {
    const src = selState==='floating' ? float : (sel && selState==='selected' ? { canvas: layers[activeLayer].canvas, x:sel.x, y:sel.y, w:sel.w, h:sel.h } : null);
    if (!src) return;
    const c = document.createElement('canvas');
    const sw = float ? float.canvas.width  : sel.w;
    const sh = float ? float.canvas.height : sel.h;
    c.width=sw; c.height=sh;
    if (float) {
      c.getContext('2d').drawImage(float.canvas, 0, 0);
    } else {
      c.getContext('2d').drawImage(layers[activeLayer].canvas, sel.x,sel.y,sel.w,sel.h, 0,0,sel.w,sel.h);
    }
    clipboard = { canvas: c };
    buildSelToolbar(true);
    window.showToast && showToast('已複製 📋');
  }

  function cutSel() {
    if (selState === 'floating') {
      // 已是浮動層，直接存進剪貼簿，丟棄浮動
      const c = document.createElement('canvas');
      c.width=float.canvas.width; c.height=float.canvas.height;
      c.getContext('2d').drawImage(float.canvas,0,0);
      clipboard = { canvas:c };
      float = null;
      deselect();
    } else if (selState === 'selected' && sel) {
      copySel();
      saveUndo();
      layers[activeLayer].ctx.clearRect(sel.x, sel.y, sel.w, sel.h);
      deselect();
      buildLayerPanel();
      render();
    }
    window.showToast && showToast('已剪下 ✂️');
  }

  function pasteSel() {
    if (!clipboard) return;
    // 貼上到畫面中央
    const c = document.createElement('canvas');
    c.width=clipboard.canvas.width; c.height=clipboard.canvas.height;
    c.getContext('2d').drawImage(clipboard.canvas,0,0);
    const px = Math.max(0, Math.floor((W - c.width ) / 2));
    const py = Math.max(0, Math.floor((H - c.height) / 2));
    float = { canvas:c, x:px, y:py };
    sel = { x:px, y:py, w:c.width, h:c.height };
    selState = 'floating';
    buildSelToolbar(true);
    startMarch();
    render();
    window.showToast && showToast('貼上後可拖曳，Enter 確認 📌');
  }

  function deleteSel() {
    if (selState==='floating') {
      float=null; deselect();
    } else if (selState==='selected' && sel) {
      saveUndo();
      layers[activeLayer].ctx.clearRect(sel.x, sel.y, sel.w, sel.h);
      deselect(); buildLayerPanel(); render();
    }
    window.showToast && showToast('已刪除 🗑');
  }

  function flipSel(dir) {
    if (selState==='selected') liftToFloat();
    if (!float) return;
    const c = document.createElement('canvas');
    c.width=float.canvas.width; c.height=float.canvas.height;
    const ctx = c.getContext('2d');
    if (dir==='h') {
      ctx.translate(c.width,0); ctx.scale(-1,1);
    } else {
      ctx.translate(0,c.height); ctx.scale(1,-1);
    }
    ctx.drawImage(float.canvas,0,0);
    float.canvas = c;
    buildSelToolbar(true);
    render();
  }

  function rotateSel() {
    if (selState==='selected') liftToFloat();
    if (!float) return;
    const sw=float.canvas.width, sh=float.canvas.height;
    const c = document.createElement('canvas');
    c.width=sh; c.height=sw;  // 寬高互換
    const ctx = c.getContext('2d');
    ctx.translate(sh/2, sw/2);
    ctx.rotate(Math.PI/2);
    ctx.drawImage(float.canvas, -sw/2, -sh/2);
    float.canvas = c;
    // 調整位置讓中心不變
    float.x = float.x + Math.floor((sw-sh)/2);
    float.y = float.y + Math.floor((sh-sw)/2);
    sel = {x:float.x, y:float.y, w:c.width, h:c.height};
    updateSelInfo(); buildSelToolbar(true); render();
  }

  /* ===== 繪圖 ===== */
  function drawAt(x, y, btn) {
    const lc = layers[activeLayer];
    const half = Math.floor(brushSize / 2);
    const x0 = x - half, y0 = y - half;
    const sz = brushSize;

    /* --- 橡皮擦 --- */
    if (tool === 'eraser') {
      lc.ctx.clearRect(x0, y0, sz, sz);
      return;
    }

    /* --- 提亮 / 調暗 (Dodge / Burn) --- */
    if (tool === 'dodge') {
      adjustPixels(lc.ctx, x0, y0, sz, btn === 2 ? -0.10 : 0.10);
      return;
    }

    /* --- 混色（與背景色 Overlay） --- */
    if (tool === 'blend') {
      blendPixels(lc.ctx, x0, y0, sz, bgColor, 0.3);
      return;
    }

    /* --- 變化筆刷 --- */
    let color;
    if (tool === 'varbrush') {
      const colors = window.Palette ? Palette.getVariationColors() : [fgColor];
      color = colors[Math.floor(Math.random() * colors.length)];
    } else {
      color = btn === 2 ? bgColor : fgColor;
    }
    lc.ctx.fillStyle = color;
    lc.ctx.fillRect(x0, y0, sz, sz);
  }

  /* ===== 提亮 / 調暗：對每個像素調整亮度 ===== */
  function adjustPixels(ctx, x, y, size, delta) {
    // 夾在畫布範圍內
    const cx = Math.max(0, x), cy = Math.max(0, y);
    const cw = Math.min(size, W - cx), ch = Math.min(size, H - cy);
    if (cw <= 0 || ch <= 0) return;

    const imgData = ctx.getImageData(cx, cy, cw, ch);
    const d = imgData.data;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i+3] === 0) continue;   // 跳過透明像素
      d[i]   = clampByte(d[i]   + delta * 255);
      d[i+1] = clampByte(d[i+1] + delta * 255);
      d[i+2] = clampByte(d[i+2] + delta * 255);
    }
    ctx.putImageData(imgData, cx, cy);
  }

  /* ===== 混色：把背景色以 strength 比例疊入像素 ===== */
  function blendPixels(ctx, x, y, size, blendHex, strength) {
    const cx = Math.max(0, x), cy = Math.max(0, y);
    const cw = Math.min(size, W - cx), ch = Math.min(size, H - cy);
    if (cw <= 0 || ch <= 0) return;

    const br = parseInt(blendHex.slice(1,3), 16);
    const bg = parseInt(blendHex.slice(3,5), 16);
    const bb = parseInt(blendHex.slice(5,7), 16);

    const imgData = ctx.getImageData(cx, cy, cw, ch);
    const d = imgData.data;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i+3] === 0) continue;
      d[i]   = clampByte(d[i]   * (1 - strength) + br * strength);
      d[i+1] = clampByte(d[i+1] * (1 - strength) + bg * strength);
      d[i+2] = clampByte(d[i+2] * (1 - strength) + bb * strength);
    }
    ctx.putImageData(imgData, cx, cy);
  }

  function clampByte(v) { return Math.max(0, Math.min(255, Math.round(v))); }

  /* ===== 填色桶 ===== */
  function fillBucket(sx, sy, fillColor) {
    const lc = layers[activeLayer];
    const imgData = lc.ctx.getImageData(0,0,W,H);
    const data = imgData.data;
    const idx = (x,y)=>(y*W+x)*4;
    const tc = data.slice(idx(sx,sy), idx(sx,sy)+4);
    const fc = hexToRgba(fillColor);
    if (colorMatch(tc,fc)) return;
    const queue=[[sx,sy]], vis=new Uint8Array(W*H);
    vis[sy*W+sx]=1;
    while(queue.length){
      const [x,y]=queue.shift(), i=idx(x,y);
      data[i]=fc[0];data[i+1]=fc[1];data[i+2]=fc[2];data[i+3]=fc[3];
      for(const[nx,ny]of[[x-1,y],[x+1,y],[x,y-1],[x,y+1]]){
        if(nx<0||ny<0||nx>=W||ny>=H||vis[ny*W+nx]) continue;
        if(!colorMatch(data.slice(idx(nx,ny),idx(nx,ny)+4),tc)) continue;
        vis[ny*W+nx]=1; queue.push([nx,ny]);
      }
    }
    lc.ctx.putImageData(imgData,0,0);
  }

  /* ===== 滴管 ===== */
  function pickColor(x, y, btn) {
    const p = getFlatCanvas().getContext('2d').getImageData(x,y,1,1).data;
    const hex = rgbToHex(p[0],p[1],p[2]);
    if (btn===2) setBgColor(hex); else setFgColor(hex);
  }

  /* ===== 畫布調整大小 ===== */
  function openResizeDialog() {
    const modal = document.createElement('div');
    modal.className = 'simple-modal-overlay';
    modal.innerHTML = `
      <div class="simple-modal">
        <div class="simple-modal-title">${_t('⤢ 調整畫布尺寸')}</div>
        <div class="simple-modal-body">
          <div class="modal-row">
            <label>${_t('快速倍增')}</label>
            <div style="display:flex;gap:6px">
              ${[2,3,4,8].map(n=>`<button class="btn btn-small btn-secondary rs-mult-btn" data-n="${n}">×${n}</button>`).join('')}
            </div>
          </div>
          <div class="modal-row"><label>${_t('寬度')}</label><input type="number" id="rs-w" value="${W}" min="1" max="2048" /><span>px</span></div>
          <div class="modal-row"><label>${_t('高度')}</label><input type="number" id="rs-h" value="${H}" min="1" max="2048" /><span>px</span></div>
          <div class="modal-row" id="rs-hint-row" style="display:none">
            <label></label>
            <span id="rs-hint" class="rs-hint-text"></span>
          </div>
          <div class="modal-row">
            <label>模式</label>
            <select id="rs-mode">
              <option value="pixel">${_t('🎮 像素倍增（整數倍放大，每格→N×N）')}</option>
              <option value="extend">${_t('延伸（保留內容，多餘透明）')}</option>
              <option value="scale">${_t('縮放（雙線性拉伸）')}</option>
              <option value="crop">${_t('裁切（從錨點裁切）')}</option>
            </select>
          </div>
          <div class="modal-row" id="rs-anchor-row">
            <label>${_t('錨點')}</label>
            <div id="rs-anchor-grid" class="anchor-grid">
              ${['tl','tc','tr','ml','c','mr','bl','bc','br'].map(a=>`<button class="anchor-btn ${a==='c'?'active':''}" data-a="${a}"></button>`).join('')}
            </div>
          </div>
        </div>
        <div class="simple-modal-footer">
          <button class="btn btn-secondary" id="rs-cancel">${_t('取消')}</button>
          <button class="btn btn-primary"   id="rs-ok">${_t('✓ 套用')}</button>
        </div>
      </div>
    `;
    document.body.appendChild(modal);
    let anchor = 'c';

    // 快速倍增按鈕
    modal.querySelectorAll('.rs-mult-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const n = +btn.dataset.n;
        modal.querySelector('#rs-w').value = W * n;
        modal.querySelector('#rs-h').value = H * n;
        updateHint();
        // 自動切換到像素倍增模式
        modal.querySelector('#rs-mode').value = 'pixel';
        updateAnchorVisibility();
      });
    });

    // 尺寸變化時更新提示
    function updateHint() {
      const nw = +modal.querySelector('#rs-w').value;
      const nh = +modal.querySelector('#rs-h').value;
      const hintRow = modal.querySelector('#rs-hint-row');
      const hint    = modal.querySelector('#rs-hint');
      const modeEl  = modal.querySelector('#rs-mode');
      if (nw > 0 && nh > 0 && nw % W === 0 && nh % H === 0 && nw/W === nh/H) {
        const n = nw / W;
        hintRow.style.display = '';
        hint.textContent = `✅ ${_t('整數倍')} ×${n} ${_t('可使用「像素倍增」模式')}`;
        if (modeEl.value !== 'extend' && modeEl.value !== 'crop') modeEl.value = 'pixel';
      } else {
        hintRow.style.display = 'none';
        if (modeEl.value === 'pixel') modeEl.value = 'scale';
      }
    }
    modal.querySelector('#rs-w').addEventListener('input', updateHint);
    modal.querySelector('#rs-h').addEventListener('input', updateHint);

    // 模式切換時顯示/隱藏錨點
    function updateAnchorVisibility() {
      const m = modal.querySelector('#rs-mode').value;
      modal.querySelector('#rs-anchor-row').style.display =
        (m === 'extend' || m === 'crop') ? '' : 'none';
    }
    modal.querySelector('#rs-mode').addEventListener('change', updateAnchorVisibility);
    updateAnchorVisibility(); // 初始化

    modal.querySelectorAll('.anchor-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        modal.querySelectorAll('.anchor-btn').forEach(b=>b.classList.remove('active'));
        btn.classList.add('active');
        anchor = btn.dataset.a;
      });
    });

    modal.querySelector('#rs-cancel').onclick = () => modal.remove();
    modal.addEventListener('click', e => { if(e.target===modal) modal.remove(); });
    modal.querySelector('#rs-ok').onclick = () => {
      const nw   = Math.max(1, Math.min(2048, +modal.querySelector('#rs-w').value));
      const nh   = Math.max(1, Math.min(2048, +modal.querySelector('#rs-h').value));
      const mode = modal.querySelector('#rs-mode').value;
      modal.remove();
      resizeCanvas(nw, nh, mode, anchor);
    };
  }

  function resizeCanvas(nw, nh, mode, anchor) {
    saveUndo();
    const anchorX = anchor.includes('r')?nw-W : anchor.includes('c')||anchor==='tc'||anchor==='bc' ? Math.round((nw-W)/2) : 0;
    const anchorY = anchor.includes('b')?nh-H : anchor==='c'||anchor==='ml'||anchor==='mr' ? Math.round((nh-H)/2) : 0;
    layers = layers.map(l => {
      const nc=document.createElement('canvas'); nc.width=nw; nc.height=nh;
      const nctx=nc.getContext('2d'); nctx.imageSmoothingEnabled=false;
      if (mode==='pixel') {
        pixelPerfectScale(l.canvas, nc, nw/W, nh/H);
      } else if (mode==='scale') {
        nctx.drawImage(l.canvas,0,0,nw,nh);
      } else {
        nctx.drawImage(l.canvas, anchorX, anchorY);
      }
      return {name:l.name, canvas:nc, ctx:nctx, visible:l.visible, opacity:l.opacity};
    });
    W=nw; H=nh;
    deselect(); buildLayerPanel();
    setZoom(calcDefaultZoom());
    render();
    window.showToast && showToast(`${_t('畫布已調整為')} ${nw}×${nh} ✓`);
  }

  /**
   * 像素完美放大：每個原始像素 → scaleX×scaleY 個目標像素（RGBA 完全複製）
   * 支援非整數縮放（向下取整），但整數倍最漂亮
   */
  function pixelPerfectScale(srcCanvas, dstCanvas, scaleX, scaleY) {
    const sw   = srcCanvas.width, sh = srcCanvas.height;
    const dw   = dstCanvas.width, dh = dstCanvas.height;
    const src  = srcCanvas.getContext('2d').getImageData(0, 0, sw, sh);
    const dst  = dstCanvas.getContext('2d').createImageData(dw, dh);
    const sd   = src.data, dd = dst.data;

    const bx = Math.max(1, Math.round(scaleX));  // 每格橫向佔幾格
    const by = Math.max(1, Math.round(scaleY));  // 每格縱向佔幾格

    for (let sy = 0; sy < sh; sy++) {
      for (let sx = 0; sx < sw; sx++) {
        const si = (sy * sw + sx) * 4;
        const r = sd[si], g = sd[si+1], b = sd[si+2], a = sd[si+3];
        // 寫入目標的 bx×by 個格子
        const dy0 = sy * by, dx0 = sx * bx;
        for (let dy = 0; dy < by && dy0+dy < dh; dy++) {
          for (let dx = 0; dx < bx && dx0+dx < dw; dx++) {
            const di = ((dy0+dy) * dw + (dx0+dx)) * 4;
            dd[di]=r; dd[di+1]=g; dd[di+2]=b; dd[di+3]=a;
          }
        }
      }
    }
    dstCanvas.getContext('2d').putImageData(dst, 0, 0);
  }

  /* ===== Undo / Redo ===== */
  function saveUndo() {
    const snap = layers.map(l=>{const c=document.createElement('canvas');c.width=W;c.height=H;c.getContext('2d').drawImage(l.canvas,0,0);return{name:l.name,canvas:c,visible:l.visible,opacity:l.opacity};});
    undoStack.push({layers:snap, activeLayer, W, H});
    if (undoStack.length>50) undoStack.shift();
    redoStack=[];
  }
  function restoreSnap(snap) {
    W=snap.W||W; H=snap.H||H;
    layers=snap.layers.map(s=>{const c=document.createElement('canvas');c.width=W;c.height=H;c.getContext('2d').drawImage(s.canvas,0,0);return{name:s.name,canvas:c,ctx:c.getContext('2d'),visible:s.visible,opacity:s.opacity};});
    activeLayer=snap.activeLayer;
    deselect(); buildLayerPanel(); setZoom(calcDefaultZoom()); render();
  }
  function undo() { if(!undoStack.length)return; const cur=snap_cur();redoStack.push(cur);restoreSnap(undoStack.pop()); }
  function redo() { if(!redoStack.length)return; const cur=snap_cur();undoStack.push(cur);restoreSnap(redoStack.pop()); }
  function snap_cur() {
    const s=layers.map(l=>{const c=document.createElement('canvas');c.width=W;c.height=H;c.getContext('2d').drawImage(l.canvas,0,0);return{name:l.name,canvas:c,visible:l.visible,opacity:l.opacity};});
    return{layers:s,activeLayer,W,H};
  }

  /* ===== Setters ===== */
  function setTool(t) {
    if (tool==='rect' && t!=='rect') deselect();
    tool=t;
    document.querySelectorAll('.tb-btn[data-tool]').forEach(b=>b.classList.toggle('active',b.dataset.tool===t));
    displayCanvas.style.cursor = t==='eyedrop'?'crosshair':t==='fill'?'cell':t==='rect'?'crosshair':'default';
  }

  function setFgColor(c) {
    fgColor=c;
    const sw=document.getElementById('swatch-fg');
    if(sw){sw.style.background=c;sw.classList.add('flash');setTimeout(()=>sw.classList.remove('flash'),300);}
    const pk=document.getElementById('picker-fg');
    if(pk) pk.value=c;
    // 同步調色盤 UI（滴管取色時色相環跟著轉）
    if (window.Palette && Palette.syncColor) Palette.syncColor(c);
  }
  function setBgColor(c) {
    bgColor=c;
    const sw=document.getElementById('swatch-bg');
    if(sw){sw.style.background=c;sw.classList.add('flash');setTimeout(()=>sw.classList.remove('flash'),300);}
    const pk=document.getElementById('picker-bg');
    if(pk) pk.value=c;
    // 背景色不同步色相環（只影響前景顯示），但可依需求開啟
  }

  /* ===== 工具函式 ===== */
  function hexToRgba(h){return[parseInt(h.slice(1,3),16),parseInt(h.slice(3,5),16),parseInt(h.slice(5,7),16),255];}
  function rgbToHex(r,g,b){return'#'+[r,g,b].map(v=>v.toString(16).padStart(2,'0')).join('');}
  function colorMatch(a,b,t=0){return Math.abs(a[0]-b[0])<=t&&Math.abs(a[1]-b[1])<=t&&Math.abs(a[2]-b[2])<=t&&Math.abs(a[3]-b[3])<=t;}
  function bresenham(x0,y0,x1,y1,cb){let dx=Math.abs(x1-x0),dy=Math.abs(y1-y0),sx=x0<x1?1:-1,sy=y0<y1?1:-1,err=dx-dy;while(true){cb(x0,y0);if(x0===x1&&y0===y1)break;const e2=2*err;if(e2>-dy){err-=dy;x0+=sx;}if(e2<dx){err+=dx;y0+=sy;}}}
  function esc(s){return s.replace(/&/g,'&amp;').replace(/</g,'&lt;');}

  /* ===== Public API ===== */
  function onChange(cb) { onChangeCallbacks.push(cb); }
  function getBlob() { return new Promise(r=>getFlatCanvas().toBlob(r,'image/png')); }

  return { init, setTool, setFgColor, setBgColor, onChange, getBlob, getFlatCanvas, addLayerFromCanvas };
})();
