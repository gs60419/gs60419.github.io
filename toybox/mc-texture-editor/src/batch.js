/**
 * batch.js — 批次處理模組
 * 功能：批次色調/飽和/亮度調整、色彩替換、重新命名、格式轉換、ZIP 打包輸出
 */

var Batch = (() => {

  let _files = [];     // { name, blob, node }
  let _modal = null;

  /* ===== 開啟批次視窗 ===== */
  function open(files) {
    _files = files || [];
    if (_modal) _modal.remove();

    _modal = document.createElement('div');
    _modal.id = 'batch-modal';
    _modal.innerHTML = `
      <div id="batch-dialog">
        <div id="batch-header">
          <span>⚙️ 批次處理</span>
          <button class="tb-btn" id="batch-close" title="關閉">✕</button>
        </div>

        <div id="batch-body">
          <!-- 左：素材清單 -->
          <div id="batch-filelist">
            <div class="batch-section-title">
              素材清單
              <span id="batch-count" class="badge">${_files.length}</span>
            </div>
            <div id="batch-files-scroll">
              ${_files.length
                ? _files.map((f,i) => `
                    <label class="batch-file-item">
                      <input type="checkbox" class="bf-check" data-i="${i}" checked />
                      <span class="bf-name">${esc(f.name)}</span>
                    </label>`).join('')
                : '<div class="empty-hint">未載入材質包，<br>請先開啟材質包</div>'
              }
            </div>
            <div class="batch-file-actions">
              <button class="btn btn-small btn-secondary" id="bf-all">全選</button>
              <button class="btn btn-small btn-secondary" id="bf-none">取消</button>
              <button class="btn btn-small btn-secondary" id="bf-invert">反選</button>
            </div>
          </div>

          <!-- 右：操作面板 -->
          <div id="batch-ops">

            <!-- Tab 切換 -->
            <div class="batch-tabs">
              <button class="batch-tab active" data-tab="adjust">色彩調整</button>
              <button class="batch-tab" data-tab="replace">色彩替換</button>
              <button class="batch-tab" data-tab="rename">重新命名</button>
              <button class="batch-tab" data-tab="export">匯出設定</button>
            </div>

            <!-- 色彩調整 -->
            <div class="batch-panel active" id="tab-adjust">
              ${slider('hue',        '色調偏移',   -180, 180, 0,   '°')}
              ${slider('saturation', '飽和度',     -100, 100, 0,   '%')}
              ${slider('brightness', '亮度',       -100, 100, 0,   '%')}
              ${slider('contrast',   '對比度',     -100, 100, 0,   '%')}
              ${slider('opacity',    '不透明度',     0,  100, 100, '%')}
              <label class="batch-check-row">
                <input type="checkbox" id="adj-grayscale" />
                <span>轉為灰階</span>
              </label>
              <div class="batch-preview-row">
                <div>
                  <div class="batch-preview-label">原始</div>
                  <canvas id="prev-before" width="64" height="64"></canvas>
                </div>
                <div>
                  <div class="batch-preview-label">預覽</div>
                  <canvas id="prev-after"  width="64" height="64"></canvas>
                </div>
              </div>
              <button class="btn btn-secondary btn-small" id="btn-preview-adj">👁 預覽第一張</button>
            </div>

            <!-- 色彩替換 -->
            <div class="batch-panel" id="tab-replace">
              <div class="batch-row">
                <label>替換顏色</label>
                <div style="display:flex;gap:8px;align-items:center">
                  <div class="color-swatch" id="rep-from-swatch" style="background:#ff0000;cursor:pointer" title="點擊選色"></div>
                  <input type="color" id="rep-from" value="#ff0000" />
                  <span style="color:var(--text-dim)">→</span>
                  <div class="color-swatch" id="rep-to-swatch" style="background:#00ff00;cursor:pointer" title="點擊選色"></div>
                  <input type="color" id="rep-to"   value="#00ff00" />
                </div>
              </div>
              ${slider('rep-tol', '容差', 0, 100, 10, '')}
              <p class="batch-hint">將接近「替換顏色」的像素全部換成目標色</p>
            </div>

            <!-- 重新命名 -->
            <div class="batch-panel" id="tab-rename">
              <div class="batch-row">
                <label>前綴</label>
                <input type="text" id="ren-prefix" placeholder="例：custom_" class="batch-input" />
              </div>
              <div class="batch-row">
                <label>後綴</label>
                <input type="text" id="ren-suffix" placeholder="例：_v2" class="batch-input" />
              </div>
              <div class="batch-row">
                <label>搜尋</label>
                <input type="text" id="ren-find"    placeholder="搜尋字串" class="batch-input" />
              </div>
              <div class="batch-row">
                <label>取代</label>
                <input type="text" id="ren-replace" placeholder="取代為" class="batch-input" />
              </div>
              <div class="batch-row">
                <label>加序號</label>
                <input type="checkbox" id="ren-seq" />
                <span style="font-size:0.8rem;color:var(--text-dim);margin-left:4px">從 001 開始</span>
              </div>
              <div id="ren-preview-list" class="ren-preview"></div>
              <button class="btn btn-small btn-secondary" id="btn-preview-rename">👁 預覽命名</button>
            </div>

            <!-- 匯出設定 -->
            <div class="batch-panel" id="tab-export">
              <div class="batch-row">
                <label>輸出格式</label>
                <select id="exp-format" class="batch-input">
                  <option value="png">PNG（推薦）</option>
                  <option value="jpeg">JPEG</option>
                  <option value="webp">WebP</option>
                </select>
              </div>
              <div class="batch-row" id="exp-quality-row" style="display:none">
                <label>品質</label>
                <input type="range" id="exp-quality" min="10" max="100" value="90" style="flex:1" />
                <span id="exp-quality-val">90%</span>
              </div>
              <div class="batch-row">
                <label>縮放</label>
                <select id="exp-scale" class="batch-input">
                  <option value="1">原始大小 (1×)</option>
                  <option value="2">2×</option>
                  <option value="4">4×</option>
                  <option value="8">8×</option>
                  <option value="0.5">0.5×</option>
                </select>
              </div>
              <div class="batch-row">
                <label>打包方式</label>
                <select id="exp-pack" class="batch-input">
                  <option value="zip">全部打包為 ZIP</option>
                  <option value="each">逐一另存新檔</option>
                </select>
              </div>
            </div>

          </div><!-- /batch-ops -->
        </div><!-- /batch-body -->

        <div id="batch-footer">
          <div id="batch-progress" style="display:none">
            <div id="batch-prog-bar"><div id="batch-prog-fill"></div></div>
            <span id="batch-prog-text">0 / 0</span>
          </div>
          <button class="btn btn-secondary" id="btn-batch-cancel">取消</button>
          <button class="btn btn-primary"   id="btn-batch-run">▶ 執行批次處理</button>
        </div>
      </div>
    `;
    document.body.appendChild(_modal);
    bindModalEvents();
  }

  /* ===== Slider helper ===== */
  function slider(id, label, min, max, val, unit) {
    return `
      <div class="batch-row">
        <label>${label}</label>
        <input type="range" id="sl-${id}" min="${min}" max="${max}" value="${val}" style="flex:1" />
        <span id="sl-${id}-val" class="sl-val">${val}${unit}</span>
      </div>`;
  }

  /* ===== 事件綁定 ===== */
  function bindModalEvents() {
    // 關閉
    document.getElementById('batch-close').addEventListener('click', () => _modal.remove());
    document.getElementById('btn-batch-cancel').addEventListener('click', () => _modal.remove());
    _modal.addEventListener('click', e => { if (e.target === _modal) _modal.remove(); });

    // Tab 切換
    _modal.querySelectorAll('.batch-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        _modal.querySelectorAll('.batch-tab').forEach(t => t.classList.remove('active'));
        _modal.querySelectorAll('.batch-panel').forEach(p => p.classList.remove('active'));
        tab.classList.add('active');
        document.getElementById('tab-' + tab.dataset.tab).classList.add('active');
      });
    });

    // Slider 數值顯示
    const sliders = [
      ['hue','°'],['saturation','%'],['brightness','%'],['contrast','%'],['opacity','%'],['rep-tol','']
    ];
    sliders.forEach(([id, unit]) => {
      const el = document.getElementById('sl-' + id);
      if (!el) return;
      el.addEventListener('input', () => {
        document.getElementById('sl-' + id + '-val').textContent = el.value + unit;
      });
    });

    // 全選/取消/反選
    document.getElementById('bf-all').addEventListener('click',    () => setAllChecks(true));
    document.getElementById('bf-none').addEventListener('click',   () => setAllChecks(false));
    document.getElementById('bf-invert').addEventListener('click', () => {
      _modal.querySelectorAll('.bf-check').forEach(c => c.checked = !c.checked);
    });

    // 色彩替換 swatch
    ['from','to'].forEach(side => {
      const sw  = document.getElementById(`rep-${side}-swatch`);
      const inp = document.getElementById(`rep-${side}`);
      sw.addEventListener('click', () => inp.click());
      inp.addEventListener('input', e => sw.style.background = e.target.value);
    });

    // 匯出品質顯示
    const fmt = document.getElementById('exp-format');
    const qRow = document.getElementById('exp-quality-row');
    fmt.addEventListener('change', () => {
      qRow.style.display = fmt.value !== 'png' ? 'flex' : 'none';
    });
    document.getElementById('exp-quality').addEventListener('input', e => {
      document.getElementById('exp-quality-val').textContent = e.target.value + '%';
    });

    // 預覽按鈕
    document.getElementById('btn-preview-adj').addEventListener('click', previewAdjust);
    document.getElementById('btn-preview-rename').addEventListener('click', previewRename);

    // 執行
    document.getElementById('btn-batch-run').addEventListener('click', runBatch);
  }

  function setAllChecks(v) {
    _modal.querySelectorAll('.bf-check').forEach(c => c.checked = v);
  }

  /* ===== 取得勾選的檔案 ===== */
  function getSelected() {
    return [..._modal.querySelectorAll('.bf-check:checked')]
      .map(c => _files[+c.dataset.i])
      .filter(Boolean);
  }

  /* ===== 預覽調整 ===== */
  async function previewAdjust() {
    const sel = getSelected();
    if (!sel.length) return;
    const f = sel[0];
    const img = await blobToImage(f.blob);

    const bCanvas = document.getElementById('prev-before');
    const aCanvas = document.getElementById('prev-after');
    drawScaled(img, bCanvas);
    const params = getAdjParams();
    const out = applyAdjust(img, params);
    drawScaled(out, aCanvas);
  }

  function drawScaled(src, dst) {
    const ctx = dst.getContext('2d');
    ctx.clearRect(0, 0, dst.width, dst.height);
    ctx.imageSmoothingEnabled = false;
    const s = Math.min(dst.width / src.width, dst.height / src.height);
    const w = src.width * s, h = src.height * s;
    ctx.drawImage(src, (dst.width - w) / 2, (dst.height - h) / 2, w, h);
  }

  /* ===== 預覽命名 ===== */
  function previewRename() {
    const sel = getSelected();
    const list = document.getElementById('ren-preview-list');
    list.innerHTML = sel.slice(0, 10).map((f, i) => {
      const newName = buildNewName(f.name, i);
      return `<div class="ren-row"><span class="ren-old">${esc(f.name)}</span><span>→</span><span class="ren-new">${esc(newName)}</span></div>`;
    }).join('') + (sel.length > 10 ? `<div class="ren-more">...還有 ${sel.length - 10} 個</div>` : '');
  }

  function buildNewName(name, idx) {
    const prefix  = document.getElementById('ren-prefix').value;
    const suffix  = document.getElementById('ren-suffix').value;
    const find    = document.getElementById('ren-find').value;
    const rep     = document.getElementById('ren-replace').value;
    const seq     = document.getElementById('ren-seq').checked;
    const dot     = name.lastIndexOf('.');
    let base = dot >= 0 ? name.slice(0, dot) : name;
    const ext  = dot >= 0 ? name.slice(dot)  : '';
    if (find)  base = base.replaceAll(find, rep);
    const seqStr = seq ? String(idx + 1).padStart(3, '0') + '_' : '';
    return prefix + seqStr + base + suffix + ext;
  }

  /* ===== 取得調整參數 ===== */
  function getAdjParams() {
    return {
      hue:        +document.getElementById('sl-hue').value,
      saturation: +document.getElementById('sl-saturation').value / 100,
      brightness: +document.getElementById('sl-brightness').value / 100,
      contrast:   +document.getElementById('sl-contrast').value   / 100,
      opacity:    +document.getElementById('sl-opacity').value    / 100,
      grayscale:   document.getElementById('adj-grayscale').checked,
    };
  }

  /* ===== 色彩調整演算法 ===== */
  function applyAdjust(img, p) {
    const c = document.createElement('canvas');
    c.width = img.width; c.height = img.height;
    const ctx = c.getContext('2d');
    ctx.drawImage(img, 0, 0);
    const d = ctx.getImageData(0, 0, c.width, c.height);
    const data = d.data;

    for (let i = 0; i < data.length; i += 4) {
      let [r, g, b, a] = [data[i], data[i+1], data[i+2], data[i+3]];
      if (a === 0) continue;

      // 灰階
      if (p.grayscale) {
        const gray = 0.299*r + 0.587*g + 0.114*b;
        r = g = b = gray;
      }

      // 亮度
      if (p.brightness !== 0) {
        const delta = p.brightness * 255;
        r = clamp(r + delta); g = clamp(g + delta); b = clamp(b + delta);
      }

      // 對比
      if (p.contrast !== 0) {
        const f = (259 * (p.contrast * 255 + 255)) / (255 * (259 - p.contrast * 255));
        r = clamp(f * (r - 128) + 128);
        g = clamp(f * (g - 128) + 128);
        b = clamp(f * (b - 128) + 128);
      }

      // HSL 操作
      let [h, s, l] = rgbToHsl(r, g, b);
      h = ((h + p.hue / 360) % 1 + 1) % 1;
      s = clamp01(s + p.saturation);
      [r, g, b] = hslToRgb(h, s, l);

      // 不透明度
      a = clamp(a * p.opacity);

      data[i]=r; data[i+1]=g; data[i+2]=b; data[i+3]=a;
    }
    ctx.putImageData(d, 0, 0);
    return c;
  }

  /* ===== 色彩替換演算法 ===== */
  function applyReplace(img, fromHex, toHex, tolerance) {
    const c = document.createElement('canvas');
    c.width = img.width; c.height = img.height;
    const ctx = c.getContext('2d');
    ctx.drawImage(img, 0, 0);
    const d = ctx.getImageData(0, 0, c.width, c.height);
    const data = d.data;
    const fr = parseInt(fromHex.slice(1,3),16);
    const fg = parseInt(fromHex.slice(3,5),16);
    const fb = parseInt(fromHex.slice(5,7),16);
    const tr = parseInt(toHex.slice(1,3),16);
    const tg = parseInt(toHex.slice(3,5),16);
    const tb = parseInt(toHex.slice(5,7),16);
    const tol = tolerance * 2.55;

    for (let i = 0; i < data.length; i += 4) {
      const dr = Math.abs(data[i]   - fr);
      const dg = Math.abs(data[i+1] - fg);
      const db = Math.abs(data[i+2] - fb);
      if (dr <= tol && dg <= tol && db <= tol) {
        data[i]=tr; data[i+1]=tg; data[i+2]=tb;
      }
    }
    ctx.putImageData(d, 0, 0);
    return c;
  }

  /* ===== 縮放 ===== */
  function applyScale(img, scale) {
    if (scale === 1) return img;
    const c = document.createElement('canvas');
    c.width  = Math.round(img.width  * scale);
    c.height = Math.round(img.height * scale);
    const ctx = c.getContext('2d');
    ctx.imageSmoothingEnabled = false;
    ctx.drawImage(img, 0, 0, c.width, c.height);
    return c;
  }

  /* ===== 執行批次 ===== */
  async function runBatch() {
    const sel = getSelected();
    if (!sel.length) { alert('請先勾選要處理的素材！'); return; }

    const activeTab = _modal.querySelector('.batch-tab.active').dataset.tab;
    const fmt   = document.getElementById('exp-format').value;
    const scale = +document.getElementById('exp-scale').value;
    const pack  = document.getElementById('exp-pack').value;
    const quality = +document.getElementById('exp-quality').value / 100;

    // 顯示進度條
    const progBar  = document.getElementById('batch-progress');
    const progFill = document.getElementById('batch-prog-fill');
    const progText = document.getElementById('batch-prog-text');
    progBar.style.display = 'flex';

    const results = []; // { name, blob }

    for (let i = 0; i < sel.length; i++) {
      const f = sel[i];
      progText.textContent = `${i + 1} / ${sel.length}  ${f.name}`;
      progFill.style.width = `${((i + 1) / sel.length) * 100}%`;

      try {
        let img = await blobToImage(f.blob);

        // 套用操作
        if (activeTab === 'adjust') {
          const params = getAdjParams();
          img = applyAdjust(img, params);
        } else if (activeTab === 'replace') {
          const fromHex = document.getElementById('rep-from').value;
          const toHex   = document.getElementById('rep-to').value;
          const tol     = +document.getElementById('sl-rep-tol').value;
          img = applyReplace(img, fromHex, toHex, tol);
        }

        // 縮放
        img = applyScale(img, scale);

        // 命名
        const newName = (activeTab === 'rename')
          ? buildNewName(f.name, i).replace(/\.[^.]+$/, '') + '.' + fmt
          : f.name.replace(/\.[^.]+$/, '') + '.' + fmt;

        // 轉 blob
        const mime = fmt === 'jpeg' ? 'image/jpeg' : fmt === 'webp' ? 'image/webp' : 'image/png';
        const blob = await canvasToBlob(img, mime, quality);
        results.push({ name: newName, blob });
      } catch(e) {
        console.warn('批次處理失敗:', f.name, e);
      }

      // 讓 UI 有機會更新
      await new Promise(r => setTimeout(r, 0));
    }

    progBar.style.display = 'none';

    // 輸出
    if (pack === 'zip') {
      await exportZip(results);
    } else {
      for (const r of results) {
        await Loader.saveAs(r.name, r.blob);
      }
    }

    showToast(`批次處理完成！共 ${results.length} 個檔案 ✓`);
    _modal.remove();
  }

  /* ===== ZIP 打包輸出 ===== */
  async function exportZip(results) {
    const zip = new JSZip();
    results.forEach(r => zip.file(r.name, r.blob));
    const content = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(content);
    const a = document.createElement('a');
    a.href = url; a.download = 'batch_output.zip';
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  /* ===== 工具函式 ===== */
  function blobToImage(blob) {
    return new Promise((res, rej) => {
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => { URL.revokeObjectURL(url); res(img); };
      img.onerror = rej;
      img.src = url;
    });
  }

  function canvasToBlob(canvas, mime, quality) {
    return new Promise(res => canvas.toBlob(res, mime, quality));
  }

  function clamp(v)   { return Math.max(0, Math.min(255, Math.round(v))); }
  function clamp01(v) { return Math.max(0, Math.min(1, v)); }

  function rgbToHsl(r, g, b) {
    r/=255; g/=255; b/=255;
    const max=Math.max(r,g,b), min=Math.min(r,g,b);
    let h, s, l=(max+min)/2;
    if (max===min) return [0,0,l];
    const d=max-min;
    s = l>0.5 ? d/(2-max-min) : d/(max+min);
    switch(max){
      case r: h=(g-b)/d+(g<b?6:0); break;
      case g: h=(b-r)/d+2; break;
      default:h=(r-g)/d+4;
    }
    return [h/6, s, l];
  }

  function hslToRgb(h, s, l) {
    if (s===0) { const v=Math.round(l*255); return [v,v,v]; }
    const q = l<0.5 ? l*(1+s) : l+s-l*s;
    const p = 2*l-q;
    return [hue2rgb(p,q,h+1/3), hue2rgb(p,q,h), hue2rgb(p,q,h-1/3)].map(v=>Math.round(v*255));
  }
  function hue2rgb(p,q,t){
    if(t<0)t+=1; if(t>1)t-=1;
    if(t<1/6)return p+(q-p)*6*t;
    if(t<1/2)return q;
    if(t<2/3)return p+(q-p)*(2/3-t)*6;
    return p;
  }

  function esc(s){ return s.replace(/&/g,'&amp;').replace(/</g,'&lt;'); }

  /* ===== 收集所有素材（給 main.js 調用）===== */
  function collectAllFiles(root) {
    const arr = [];
    function walk(node) {
      if (!node) return;
      if (node.type === 'file') { arr.push(node); return; }
      (node.children || []).forEach(walk);
    }
    walk(root);
    return arr;
  }

  return { open, collectAllFiles };
})();
