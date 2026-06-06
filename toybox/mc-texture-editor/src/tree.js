/**
 * tree.js — 素材瀏覽器樹狀結構渲染
 * 資料格式:
 *   node = { name, type:'folder'|'file', children:[], handle?, blob? }
 */

var Tree = (() => {

  let _root = null;
  let _onSelect = null;
  let _activeEl = null;

  /** 建立樹狀資料 from FileSystem entries */
  async function buildFromHandles(dirHandle, node = null) {
    if (!node) node = { name: dirHandle.name, type: 'folder', children: [] };
    for await (const entry of dirHandle.values()) {
      if (entry.kind === 'file') {
        if (!isImage(entry.name)) continue;
        node.children.push({ name: entry.name, type: 'file', handle: entry });
      } else if (entry.kind === 'directory') {
        const child = { name: entry.name, type: 'folder', children: [] };
        await buildFromHandles(entry, child);
        if (child.children.length > 0) node.children.push(child);
      }
    }
    node.children.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    return node;
  }

  /** 建立樹狀資料 from JSZip */
  function buildFromZip(zip) {
    const root = { name: 'textures', type: 'folder', children: [] };
    zip.forEach((relativePath, zipEntry) => {
      if (zipEntry.dir) return;
      if (!isImage(zipEntry.name)) return;
      const parts = relativePath.split('/');
      let cur = root;
      for (let i = 0; i < parts.length - 1; i++) {
        let found = cur.children.find(c => c.type === 'folder' && c.name === parts[i]);
        if (!found) {
          found = { name: parts[i], type: 'folder', children: [] };
          cur.children.push(found);
        }
        cur = found;
      }
      // zipPath = 完整路徑，寫回 JAR 時需要
      cur.children.push({ name: parts[parts.length - 1], type: 'file', zipEntry, zipPath: relativePath });
    });
    sortNode(root);
    return root;
  }

  function sortNode(node) {
    node.children.sort((a, b) => {
      if (a.type !== b.type) return a.type === 'folder' ? -1 : 1;
      return a.name.localeCompare(b.name);
    });
    node.children.forEach(c => { if (c.type === 'folder') sortNode(c); });
  }

  function isImage(name) {
    return /\.(png|jpg|jpeg|gif|tga)$/i.test(name);
  }

  /** 渲染樹狀到 DOM */
  function render(node, container, onSelect) {
    _root = node;
    _onSelect = onSelect;
    container.innerHTML = '';
    renderNode(node.children, container, 0);
    // 搜尋
    document.getElementById('search-box').addEventListener('input', e => {
      const q = e.target.value.trim().toLowerCase();
      container.innerHTML = '';
      if (q) renderSearch(node, q, container);
      else renderNode(node.children, container, 0);
    });
  }

  function renderNode(children, parent, depth) {
    children.forEach(node => {
      if (node.type === 'folder') {
        const el = document.createElement('div');
        el.className = 'tree-folder';
        el.style.paddingLeft = `${10 + depth * 14}px`;
        el.innerHTML = `<span class="arrow">▶</span><span class="tree-icon">📁</span><span class="tree-label">${esc(node.name)}</span>`;
        parent.appendChild(el);

        const childContainer = document.createElement('div');
        childContainer.className = 'tree-children';
        parent.appendChild(childContainer);

        el.addEventListener('click', () => {
          el.classList.toggle('open');
          childContainer.style.display = el.classList.contains('open') ? 'block' : 'none';
        });

        renderNode(node.children, childContainer, depth + 1);
      } else {
        const el = document.createElement('div');
        el.className = 'tree-file';
        el.style.paddingLeft = `${10 + depth * 14}px`;

        // 縮圖 canvas（懶加載）
        const thumb = document.createElement('canvas');
        thumb.className = 'tree-thumb';
        thumb.width = 16; thumb.height = 16;

        const label = document.createElement('span');
        label.className = 'tree-label';
        label.textContent = node.name;

        el.appendChild(thumb);
        el.appendChild(label);
        el.addEventListener('click', () => selectFile(el, node));
        el.addEventListener('contextmenu', e => { e.preventDefault(); showTreeContextMenu(e, node); });
        parent.appendChild(el);

        // IntersectionObserver 懶加載縮圖
        const obs = new IntersectionObserver(entries => {
          if (!entries[0].isIntersecting) return;
          obs.disconnect();
          loadThumb(thumb, node);
        }, { rootMargin: '80px' });
        obs.observe(el);
      }
    });
  }

  /* ===== 右鍵選單 ===== */
  function showTreeContextMenu(e, node) {
    // 移除舊選單
    const old = document.getElementById('tree-ctx-menu');
    if (old) old.remove();

    const menu = document.createElement('div');
    menu.id = 'tree-ctx-menu';
    menu.className = 'tree-ctx-menu';
    menu.innerHTML = `
      <div class="ctx-item" id="ctx-copy-layer">${_t('📎 複製材質為圖層')}</div>
      <div class="ctx-item" id="ctx-open-new">${_t('🗂 在編輯器開啟')}</div>
    `;
    menu.style.left = e.clientX + 'px';
    menu.style.top  = e.clientY + 'px';
    document.body.appendChild(menu);

    // 點外面關閉
    const close = ev => { if (!menu.contains(ev.target)) { menu.remove(); document.removeEventListener('mousedown', close); } };
    setTimeout(() => document.addEventListener('mousedown', close), 0);

    menu.querySelector('#ctx-copy-layer').addEventListener('click', async () => {
      menu.remove();
      await copyNodeAsLayerTransfer(node);
    });

    menu.querySelector('#ctx-open-new').addEventListener('click', async () => {
      menu.remove();
      // 直接觸發選取（和左鍵一樣）
      const el = document.querySelector('.tree-file.active') || null;
      await selectFile(el, node);
    });
  }

  async function copyNodeAsLayerTransfer(node) {
    try {
      let blob;
      if (node.handle) {
        blob = await node.handle.getFile();
      } else if (node.zipEntry) {
        const ab = await node.zipEntry.async('arraybuffer');
        blob = new Blob([ab], { type: 'image/png' });
      } else return;

      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => {
        URL.revokeObjectURL(url);
        const c = document.createElement('canvas');
        c.width = img.naturalWidth; c.height = img.naturalHeight;
        c.getContext('2d').drawImage(img, 0, 0);
        window._layerTransfer = { name: node.name, canvas: c };
        if (window.showToast) showToast(GT_LANG==='en'
          ? `📎 Copied "${node.name}" — switch to target asset and click "Paste as Layer"`
          : `📎 已複製「${node.name}」，切換到目標素材後點「貼入圖層」`);
        // 更新浮動列按鈕狀態
        const btn = document.getElementById('btn-paste-layer');
        if (btn) { btn.disabled = false; btn.classList.add('highlight'); }
      };
      img.src = url;
    } catch(e) {
      if (window.showToast) showToast(_t('複製失敗：') + e.message);
    }
  }

  function renderSearch(root, query, container) {
    const results = [];
    collectFiles(root, results);
    const matched = results.filter(n => n.name.toLowerCase().includes(query));
    if (matched.length === 0) {
      container.innerHTML = `<div class="empty-hint">${_t('沒有符合的素材')}</div>`;
      return;
    }
    matched.forEach(node => {
      const el = document.createElement('div');
      el.className = 'tree-file';
      el.style.paddingLeft = '10px';

      const thumb = document.createElement('canvas');
      thumb.className = 'tree-thumb';
      thumb.width = 16; thumb.height = 16;
      const label = document.createElement('span');
      label.className = 'tree-label';
      label.textContent = node.name;
      el.appendChild(thumb);
      el.appendChild(label);
      el.addEventListener('click', () => selectFile(el, node));
      el.addEventListener('contextmenu', e => { e.preventDefault(); showTreeContextMenu(e, node); });
      container.appendChild(el);

      const obs = new IntersectionObserver(entries => {
        if (!entries[0].isIntersecting) return;
        obs.disconnect();
        loadThumb(thumb, node);
      }, { rootMargin: '80px' });
      obs.observe(el);
    });
  }

  function collectFiles(node, arr) {
    if (node.type === 'file') { arr.push(node); return; }
    (node.children || []).forEach(c => collectFiles(c, arr));
  }

  async function loadThumb(canvas, node) {
    try {
      let blob;
      if (node.handle) {
        blob = await node.handle.getFile();
      } else if (node.zipEntry) {
        const ab = await node.zipEntry.async('arraybuffer');
        blob = new Blob([ab], { type: 'image/png' });
      } else return;
      const url = URL.createObjectURL(blob);
      const img = new Image();
      img.onload = () => {
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = false;
        // 置中裁切放入 16x16
        const s = Math.min(16 / img.width, 16 / img.height);
        const w = img.width * s, h = img.height * s;
        ctx.clearRect(0, 0, 16, 16);
        ctx.drawImage(img, (16 - w) / 2, (16 - h) / 2, w, h);
        URL.revokeObjectURL(url);
      };
      img.src = url;
    } catch(e) { /* 靜默失敗 */ }
  }

  async function selectFile(el, node) {
    if (_activeEl) _activeEl.classList.remove('active');
    _activeEl = el;
    el.classList.add('active');
    if (_onSelect) {
      let blob;
      if (node.handle) {
        const file = await node.handle.getFile();
        blob = file;
      } else if (node.zipEntry) {
        const ab = await node.zipEntry.async('arraybuffer');
        blob = new Blob([ab], { type: 'image/png' });
      }
      _onSelect({ name: node.name, blob, node });
    }
  }

  function esc(str) {
    return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
  }

  return { buildFromHandles, buildFromZip, render };
})();
