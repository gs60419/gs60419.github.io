/**
 * palette.js — 調色盤模組
 */

var Palette = (() => {

  /* ===== MC 官方配色集 ===== */
  const PRESETS = {
    '羊毛 & 混凝土': [
      { name:'白色',    hex:'#e4e4e4' }, { name:'淺灰',    hex:'#8e8e8e' },
      { name:'灰色',    hex:'#4a4a4a' }, { name:'黑色',    hex:'#1e1b1b' },
      { name:'棕色',    hex:'#724728' }, { name:'紅色',    hex:'#9e2020' },
      { name:'橘色',    hex:'#d87b25' }, { name:'黃色',    hex:'#e0c71c' },
      { name:'石灰',    hex:'#5ea818' }, { name:'綠色',    hex:'#374d18' },
      { name:'青色',    hex:'#157788' }, { name:'淡藍',    hex:'#3ea7c9' },
      { name:'藍色',    hex:'#2d3391' }, { name:'紫色',    hex:'#6b2fac' },
      { name:'品紅',    hex:'#b3309f' }, { name:'粉紅',    hex:'#d98199' },
    ],
    '木材 & 原木': [
      { name:'橡木',    hex:'#b8935a' }, { name:'樺木',    hex:'#d7c185' },
      { name:'雲杉',    hex:'#7c5c2e' }, { name:'叢林木',  hex:'#9c6a28' },
      { name:'金合歡',  hex:'#ba6816' }, { name:'深色橡木',hex:'#4a3117' },
      { name:'紅樹木',  hex:'#7a1921' }, { name:'櫻花木',  hex:'#d4a0b0' },
      { name:'竹木',    hex:'#d0bf6a' },
    ],
    '石材 & 礦石': [
      { name:'石頭',    hex:'#7a7a7a' }, { name:'圓石',    hex:'#6e6e6e' },
      { name:'花崗岩',  hex:'#9b6b5a' }, { name:'閃長岩',  hex:'#6b6b6b' },
      { name:'安山岩',  hex:'#848484' }, { name:'黑曜石',  hex:'#100820' },
      { name:'深板岩',  hex:'#2d2d3f' }, { name:'鐵礦石',  hex:'#a49090' },
      { name:'金礦石',  hex:'#a89048' }, { name:'鑽石礦',  hex:'#4ab8c8' },
      { name:'青金石',  hex:'#1a3d8c' }, { name:'紅石礦',  hex:'#983030' },
      { name:'綠寶石',  hex:'#18a048' }, { name:'煤礦石',  hex:'#1c1c1c' },
    ],
    '特殊方塊': [
      { name:'泥土',    hex:'#9a7050' }, { name:'草地',    hex:'#5c8a2c' },
      { name:'砂礫',    hex:'#8c8070' }, { name:'沙子',    hex:'#d8c878' },
      { name:'雪',      hex:'#f0f0f0' }, { name:'冰',      hex:'#80a8e0' },
      { name:'末地石',  hex:'#d0c890' }, { name:'下界岩',  hex:'#2c1414' },
      { name:'靈魂沙',  hex:'#6c5040' }, { name:'螢石',    hex:'#c8b858' },
      { name:'葉子',    hex:'#386020' }, { name:'苔蘚',    hex:'#3d6030' },
    ],
    '染料顏色': [
      { name:'墨囊',    hex:'#1d1d1d' }, { name:'玫瑰紅',  hex:'#993333' },
      { name:'仙人掌綠',hex:'#667722' }, { name:'可可豆',  hex:'#7c4a18' },
      { name:'青金石藍',hex:'#334499' }, { name:'紫色染料',hex:'#7733cc' },
      { name:'青色染料',hex:'#336688' }, { name:'淺灰染料',hex:'#999999' },
      { name:'灰色染料',hex:'#444444' }, { name:'粉紅染料',hex:'#cc6688' },
      { name:'石灰染料',hex:'#66aa22' }, { name:'黃色染料',hex:'#ddaa00' },
      { name:'淡藍染料',hex:'#3399cc' }, { name:'品紅染料',hex:'#cc33aa' },
      { name:'橘色染料',hex:'#cc6622' }, { name:'骨粉白',  hex:'#eeeeee' },
    ],
  };

  /* ===== 狀態 ===== */
  const MAX_RECENT = 20;
  const MAX_CUSTOM = 64;
  let recent  = JSON.parse(localStorage.getItem('mc-palette-recent') || '[]');
  let custom  = JSON.parse(localStorage.getItem('mc-palette-custom') || '[]');
  let activePreset = '羊毛 & 混凝土';
  let container = null;
  let currentHex = '#4ecca3';   // 追蹤目前顏色（給 5×5 格用）

  /* ===== 初始化 ===== */
  function init(el) {
    container = el;
    try { render(); } catch(e) { console.error('Palette render error:', e); }
  }

  /* ===== 主渲染 ===== */
  function render() {
    if (!container) return;
    container.innerHTML = `
      <!-- 色相環 + 5×5 格 -->
      <div id="pal-top-tools">
        <div id="pal-wheel-wrap">
          <canvas id="pal-wheel" width="130" height="130"></canvas>
          <canvas id="pal-sl"    width="70"  height="70"></canvas>
        </div>
        <div id="pal-right-tools">
          <div id="pal-5x5-label" class="pal-section-title">漸層變化</div>
          <div id="pal-5x5"></div>
          <div id="pal-cur-hex" class="pal-cur-hex">${currentHex}</div>
        </div>
      </div>

      <!-- MC 色票 -->
      <div class="pal-tabs" id="pal-tabs"></div>
      <div class="pal-grid" id="pal-grid"></div>
      <div class="pal-section-title">最近使用</div>
      <div class="pal-grid" id="pal-recent"></div>
      <div class="pal-section-title" style="display:flex;align-items:center;justify-content:space-between">
        <span>自訂色</span>
        <button class="btn btn-small btn-secondary" id="btn-add-custom">＋ 新增</button>
      </div>
      <div class="pal-grid" id="pal-custom"></div>
    `;

    drawWheel();
    drawSL(currentHex);
    draw5x5(currentHex);

    // MC 標籤
    const tabs = document.getElementById('pal-tabs');
    Object.keys(PRESETS).forEach(name => {
      const t = document.createElement('button');
      t.className = 'pal-tab' + (name === activePreset ? ' active' : '');
      t.textContent = name;
      t.addEventListener('click', () => { activePreset = name; render(); });
      tabs.appendChild(t);
    });

    renderGrid('pal-grid',   PRESETS[activePreset]);
    renderGrid('pal-recent', recent.map(h => ({ hex:h, name:h })));
    renderGrid('pal-custom', custom.map(h => ({ hex:h, name:h })), true);

    document.getElementById('btn-add-custom').addEventListener('click', () => {
      const inp = document.createElement('input');
      inp.type='color'; inp.value=currentHex;
      inp.style.cssText='position:fixed;opacity:0;pointer-events:none';
      document.body.appendChild(inp);
      inp.click();
      inp.addEventListener('change', e => { addCustom(e.target.value); inp.remove(); });
    });

    bindWheelEvents();
  }

  /* ===== 色相環 ===== */
  function drawWheel() {
    const c = document.getElementById('pal-wheel');
    if (!c) return;
    const ctx = c.getContext('2d');
    const cx = c.width/2, cy = c.height/2;
    const outerR = cx - 2, innerR = cx - 18;

    // 畫色相環
    for (let deg = 0; deg < 360; deg++) {
      const a1 = (deg - 1) * Math.PI / 180;
      const a2 = (deg + 1) * Math.PI / 180;
      const grad = ctx.createConicalGradient
        ? null   // 備用
        : null;
      ctx.beginPath();
      ctx.moveTo(cx + innerR * Math.cos(a1), cy + innerR * Math.sin(a1));
      ctx.arc(cx, cy, outerR, a1, a2);
      ctx.arc(cx, cy, innerR, a2, a1, true);
      ctx.closePath();
      ctx.fillStyle = `hsl(${deg},100%,50%)`;
      ctx.fill();
    }

    // 中間挖空（已由 innerR 控制，再補一個白圓讓中心乾淨）
    ctx.beginPath();
    ctx.arc(cx, cy, innerR - 1, 0, Math.PI * 2);
    ctx.fillStyle = '#1a1a2e';
    ctx.fill();

    // 畫指針
    drawWheelPointer(hexToHsl(currentHex)[0]);
  }

  function drawWheelPointer(hue) {
    const c = document.getElementById('pal-wheel');
    if (!c) return;
    // 重繪環（不重做整個 render）
    drawWheel_ring(c);
    const ctx = c.getContext('2d');
    const cx = c.width/2, cy = c.height/2;
    const r = cx - 10;  // 指針在環中間
    const ang = (hue - 90) * Math.PI / 180;
    const px = cx + r * Math.cos(ang);
    const py = cy + r * Math.sin(ang);
    ctx.beginPath();
    ctx.arc(px, py, 5, 0, Math.PI * 2);
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = `hsl(${hue},100%,50%)`;
    ctx.fill();
  }

  // 只畫環，不畫指針
  function drawWheel_ring(c) {
    const ctx = c.getContext('2d');
    ctx.clearRect(0, 0, c.width, c.height);
    const cx=c.width/2, cy=c.height/2;
    const outerR=cx-2, innerR=cx-18;
    for (let deg=0;deg<360;deg++) {
      const a1=(deg-1)*Math.PI/180, a2=(deg+1)*Math.PI/180;
      ctx.beginPath();
      ctx.moveTo(cx+innerR*Math.cos(a1), cy+innerR*Math.sin(a1));
      ctx.arc(cx,cy,outerR,a1,a2);
      ctx.arc(cx,cy,innerR,a2,a1,true);
      ctx.closePath();
      ctx.fillStyle=`hsl(${deg},100%,50%)`;
      ctx.fill();
    }
    ctx.beginPath();
    ctx.arc(cx,cy,innerR-1,0,Math.PI*2);
    ctx.fillStyle='#1a1a2e';
    ctx.fill();
  }

  /* ===== SL 方塊（在色環內部中央顯示） ===== */
  function drawSL(hex) {
    const c = document.getElementById('pal-sl');
    if (!c) return;
    const [h] = hexToHsl(hex);
    const ctx = c.getContext('2d');
    const W = c.width, H = c.height;

    // 水平：白→純色
    const gH = ctx.createLinearGradient(0,0,W,0);
    gH.addColorStop(0,'#fff');
    gH.addColorStop(1,`hsl(${h},100%,50%)`);
    ctx.fillStyle=gH; ctx.fillRect(0,0,W,H);

    // 垂直：透明→黑
    const gV = ctx.createLinearGradient(0,0,0,H);
    gV.addColorStop(0,'rgba(0,0,0,0)');
    gV.addColorStop(1,'#000');
    ctx.fillStyle=gV; ctx.fillRect(0,0,W,H);

    // 指針
    const [,s,l] = hexToHsl(hex);
    const px = s * W;
    const py = (1 - l / (s < 0.01 ? 1 : (0.5 + s*0.5))) * H;
    // 簡化：用 HSL s → x, l → y
    const sx = s * W;
    const sy = (1 - (l*2 - (l>0.5?2*l-1:0)) ) * H;  // 近似
    ctx.beginPath();
    ctx.arc(clamp(sx,4,W-4), clamp(H-l*H,4,H-4), 4, 0, Math.PI*2);
    ctx.strokeStyle='#fff'; ctx.lineWidth=2; ctx.stroke();
    ctx.fillStyle=hex; ctx.fill();
  }

  /* ===== 5×5 漸層格 ===== */
  function draw5x5(hex) {
    const wrap = document.getElementById('pal-5x5');
    if (!wrap) return;
    wrap.innerHTML = '';

    let [h, s, l] = hexToHsl(hex);
    // X 軸：色相偏移 -2,-1,0,+1,+2 步（每步 15°）
    // Y 軸：亮度偏移 +2,+1,0,-1,-2 步（每步 10%）
    const HUE_STEP = 15;
    const LIT_STEP = 0.10;

    for (let row = -2; row <= 2; row++) {
      for (let col = -2; col <= 2; col++) {
        const nh = ((h + col * HUE_STEP) % 360 + 360) % 360;
        const nl = clamp01(l - row * LIT_STEP);
        const ns = clamp01(s);
        const cellHex = hslToHex(nh, ns, nl);
        const isCenter = row === 0 && col === 0;

        const cell = document.createElement('div');
        cell.className = 'pal-5x5-cell' + (isCenter ? ' center' : '');
        cell.style.background = cellHex;
        cell.title = `${cellHex}\n色相${col>=0?'+':''}${col*HUE_STEP}°  亮度${-row>=0?'+':''}${(-row*10).toFixed(0)}%\n左鍵=前景 右鍵=背景`;
        cell.addEventListener('click', () => pickColor(cellHex, 'fg'));
        cell.addEventListener('contextmenu', e => { e.preventDefault(); pickColor(cellHex, 'bg'); });
        wrap.appendChild(cell);
      }
    }
  }

  /* ===== 色環事件 ===== */
  function bindWheelEvents() {
    const wheel = document.getElementById('pal-wheel');
    const sl    = document.getElementById('pal-sl');
    if (!wheel || !sl) return;

    let draggingWheel = false;
    let draggingSL    = false;

    // 色環拖曳
    wheel.addEventListener('mousedown', e => { draggingWheel = true; pickFromWheel(e); });
    wheel.addEventListener('mousemove', e => { if (draggingWheel) pickFromWheel(e); });
    window.addEventListener('mouseup',  () => { draggingWheel = false; draggingSL = false; });

    // SL 方塊拖曳
    sl.addEventListener('mousedown', e => { draggingSL = true; pickFromSL(e); });
    sl.addEventListener('mousemove', e => { if (draggingSL) pickFromSL(e); });

    function pickFromWheel(e) {
      const rect = wheel.getBoundingClientRect();
      const cx = rect.left + rect.width/2;
      const cy = rect.top  + rect.height/2;
      const dx = e.clientX - cx, dy = e.clientY - cy;
      const dist = Math.sqrt(dx*dx+dy*dy);
      const outerR = rect.width/2 - 2;
      const innerR = rect.width/2 - 18;
      if (dist < innerR || dist > outerR) return;  // 不在環上
      let deg = Math.atan2(dy, dx) * 180 / Math.PI + 90;
      if (deg < 0) deg += 360;
      const [,s,l] = hexToHsl(currentHex);
      const newHex = hslToHex(deg, s, l);
      applyColor(newHex);
    }

    function pickFromSL(e) {
      const rect = sl.getBoundingClientRect();
      const x = clamp01((e.clientX - rect.left) / rect.width);
      const y = clamp01((e.clientY - rect.top)  / rect.height);
      const [h] = hexToHsl(currentHex);
      // x=飽和度, y=暗度
      const ns = x;
      const nl = (1 - y) * (1 - x/2);  // 近似 HSL lightness
      const newHex = hslToHex(h, ns, Math.max(0.02, nl));
      applyColor(newHex);
    }
  }

  function applyColor(hex) {
    currentHex = hex;
    drawWheel_ring(document.getElementById('pal-wheel'));
    drawWheelPointer(hexToHsl(hex)[0]);
    drawSL(hex);
    draw5x5(hex);
    const curEl = document.getElementById('pal-cur-hex');
    if (curEl) { curEl.textContent = hex; curEl.style.background = hex; curEl.style.color = luminance(hex)>0.4?'#000':'#fff'; }
    addRecent(hex);
    if (window.Editor) Editor.setFgColor(hex);
  }

  /* ===== 色票格 ===== */
  function renderGrid(id, colors, removable = false) {
    const grid = document.getElementById(id);
    if (!grid) return;
    grid.innerHTML = '';
    if (!colors.length) { grid.innerHTML='<span class="pal-empty">—</span>'; return; }
    colors.forEach(({ hex, name }) => {
      const sw = document.createElement('div');
      sw.className = 'pal-swatch';
      sw.style.background = hex;
      sw.title = `${name}\n${hex}\n左鍵=前景 右鍵=背景`;
      if (removable) sw.classList.add('removable');
      sw.addEventListener('click', () => pickColor(hex, 'fg'));
      sw.addEventListener('contextmenu', e => { e.preventDefault(); pickColor(hex, 'bg'); });
      if (removable) {
        const x = document.createElement('span');
        x.className='pal-remove'; x.textContent='×';
        x.addEventListener('click', e => { e.stopPropagation(); removeCustom(hex); });
        sw.appendChild(x);
      }
      grid.appendChild(sw);
    });
  }

  let _syncing = false;  // 防止 pickColor ↔ setFgColor 無窮迴圈

  function pickColor(hex, target) {
    _syncing = true;
    currentHex = hex;
    addRecent(hex);
    _updatePaletteUI(hex);
    if (window.Editor) {
      if (target === 'fg') Editor.setFgColor(hex);
      else Editor.setBgColor(hex);
    }
    _syncing = false;
  }

  /* 只更新調色盤 UI，不回呼 Editor（供 Editor 主動同步時使用，避免無窮迴圈） */
  function syncColor(hex) {
    if (_syncing) return;  // 由 pickColor 觸發的 setFgColor 回呼，忽略
    currentHex = hex;
    addRecent(hex);
    _updatePaletteUI(hex);
  }

  function _updatePaletteUI(hex) {
    draw5x5(hex);
    drawSL(hex);
    drawWheelPointer(hexToHsl(hex)[0]);
    const curEl = document.getElementById('pal-cur-hex');
    if (curEl) { curEl.textContent = hex; curEl.style.background = hex; curEl.style.color = luminance(hex)>0.4?'#000':'#fff'; }
  }

  function addRecent(hex) {
    recent = [hex, ...recent.filter(h=>h!==hex)].slice(0, MAX_RECENT);
    localStorage.setItem('mc-palette-recent', JSON.stringify(recent));
    const g = document.getElementById('pal-recent');
    if (g) renderGrid('pal-recent', recent.map(h=>({hex:h,name:h})));
  }
  function addCustom(hex) {
    if (custom.includes(hex)) return;
    custom = [...custom, hex].slice(-MAX_CUSTOM);
    localStorage.setItem('mc-palette-custom', JSON.stringify(custom));
    renderGrid('pal-custom', custom.map(h=>({hex:h,name:h})), true);
  }
  function removeCustom(hex) {
    custom = custom.filter(h=>h!==hex);
    localStorage.setItem('mc-palette-custom', JSON.stringify(custom));
    renderGrid('pal-custom', custom.map(h=>({hex:h,name:h})), true);
  }

  /* ===== 色彩工具函式 ===== */
  function hexToHsl(hex) {
    let r=parseInt(hex.slice(1,3),16)/255;
    let g=parseInt(hex.slice(3,5),16)/255;
    let b=parseInt(hex.slice(5,7),16)/255;
    const max=Math.max(r,g,b), min=Math.min(r,g,b);
    let h,s,l=(max+min)/2;
    if (max===min){h=s=0;}
    else {
      const d=max-min;
      s=l>0.5?d/(2-max-min):d/(max+min);
      switch(max){case r:h=(g-b)/d+(g<b?6:0);break;case g:h=(b-r)/d+2;break;default:h=(r-g)/d+4;}
      h/=6;
    }
    return [h*360, s, l];
  }

  function hslToHex(h,s,l) {
    h=((h%360)+360)%360; s=clamp01(s); l=clamp01(l);
    const a=s*Math.min(l,1-l);
    const f=n=>{const k=(n+h/30)%12;const c=l-a*Math.max(Math.min(k-3,9-k,1),-1);return Math.round(255*c).toString(16).padStart(2,'0');};
    return `#${f(0)}${f(8)}${f(4)}`;
  }

  function luminance(hex) {
    const r=parseInt(hex.slice(1,3),16)/255;
    const g=parseInt(hex.slice(3,5),16)/255;
    const b=parseInt(hex.slice(5,7),16)/255;
    return 0.299*r+0.587*g+0.114*b;
  }

  function clamp(v,mn,mx){return Math.max(mn,Math.min(mx,v));}
  function clamp01(v){return Math.max(0,Math.min(1,v));}

  /* ===== 給 Editor 用：取得目前 5×5 的所有色碼 ===== */
  function getVariationColors() {
    const [h, s, l] = hexToHsl(currentHex);
    const HUE_STEP = 15, LIT_STEP = 0.10;
    const colors = [];
    for (let row = -2; row <= 2; row++)
      for (let col = -2; col <= 2; col++)
        colors.push(hslToHex(
          ((h + col * HUE_STEP) % 360 + 360) % 360,
          clamp01(s),
          clamp01(l - row * LIT_STEP)
        ));
    return colors;  // 25 個 hex
  }

  return { init, getVariationColors, syncColor };
})();
