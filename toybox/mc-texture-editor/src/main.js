/**
 * main.js — 主程式，連接各模組
 */

(() => {
  const treeContainer = document.getElementById('tree-container');
  const packName      = document.getElementById('pack-name');
  const editorArea    = document.getElementById('editor-area');

  let currentNode = null;
  let packRoot = null;   // 材質包根節點（給批次處理用）

  /* ===== 初始化 3D 預覽 ===== */
  window.addEventListener('DOMContentLoaded', () => {}, false);
  // 調色盤：立即初始化（不需要等尺寸）
  const palEl = document.getElementById('palette-area');
  if (palEl && window.Palette) Palette.init(palEl);

  // 3D 預覽：等字體/佈局穩定後再初始化
  requestAnimationFrame(() => requestAnimationFrame(() => {
    const p3d = document.getElementById('preview-3d');
    if (p3d && window.Preview3D && window.THREE) Preview3D.init(p3d);
  }));

  /* ===== 載入材質包 ===== */
  function onPackLoaded({ root, dirHandle, zip, type, name }) {
    packRoot = root;
    packName.textContent = `📦 ${name}`;
    Tree.render(root, treeContainer, onFileSelected);
    const firstFolder = treeContainer.querySelector('.tree-folder');
    if (firstFolder) firstFolder.click();
    // 啟用批次按鈕
    document.getElementById('btn-batch').disabled = false;
  }

  /* ===== 批次處理 ===== */
  document.getElementById('btn-batch').addEventListener('click', async () => {
    if (!packRoot) return;
    // 收集所有素材並轉為 { name, blob, node }
    const nodes = Batch.collectAllFiles(packRoot);
    const files = await Promise.all(nodes.map(async node => {
      let blob;
      if (node.handle) {
        blob = await node.handle.getFile();
      } else if (node.zipEntry) {
        const ab = await node.zipEntry.async('arraybuffer');
        blob = new Blob([ab], { type: 'image/png' });
      }
      return { name: node.name, blob, node };
    }));
    Batch.open(files.filter(f => f.blob));
  });

  document.getElementById('btn-open-folder').addEventListener('click', () => {
    Loader.openFolder(onPackLoaded);
  });

  document.getElementById('btn-open-zip').addEventListener('click', () => {
    document.getElementById('zip-input').click();
  });

  document.getElementById('zip-input').addEventListener('change', e => {
    const file = e.target.files[0];
    if (file) Loader.openZip(file, onPackLoaded);
    e.target.value = '';
  });

  document.getElementById('btn-open-jar').addEventListener('click', () => {
    Loader.openJar(onPackLoaded);
  });

  /* ===== 拖曳資料夾 / ZIP ===== */
  document.body.addEventListener('dragover', e => {
    e.preventDefault();
    document.body.classList.add('drag-over');
  });
  document.body.addEventListener('dragleave', () => document.body.classList.remove('drag-over'));
  document.body.addEventListener('drop', async e => {
    e.preventDefault();
    document.body.classList.remove('drag-over');
    const items = [...e.dataTransfer.items];
    for (const item of items) {
      if (item.kind !== 'file') continue;
      const handle = await item.getAsFileSystemHandle?.();
      if (handle?.kind === 'directory') {
        const root = await Tree.buildFromHandles(handle);
        onPackLoaded({ root, dirHandle: handle, type: 'folder', name: handle.name });
        return;
      }
      const file = item.getAsFile();
      if (file?.name.endsWith('.zip') || file?.name.endsWith('.jar')) {
        Loader.openZip(file, onPackLoaded);
        return;
      }
    }
  });

  /* ===== 素材選中 → 開啟編輯器 ===== */
  function onFileSelected({ name, blob, node }) {
    currentNode = node;
    openEditor(name, blob, node);
  }

  function openEditor(name, blob, node) {
    // 建立 img 再初始化 Editor
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const w = img.naturalWidth;
      const h = img.naturalHeight;
      URL.revokeObjectURL(url);

      // 判斷是否可寫回
      const canWriteBack = node.handle || (node.zipPath && Loader.isJarMode());
      const writeBackLabel = Loader.isJarMode() ? '💾 寫回 JAR' : '💾 存回原檔';

      // 替換 editor-area 內容（無頂部欄，存檔按鈕浮動在左下角）
      // 偵測是否有跨素材傳輸緩衝
      const hasTransfer = !!window._layerTransfer;

      editorArea.innerHTML = `
        <div id="editor-mount" style="flex:1;overflow:hidden;display:flex;flex-direction:column;"></div>
        <div id="editor-floating-bar">
          <span class="iv-name" title="${esc(name)}">${esc(name)}</span>
          <span class="iv-size">${w}×${h}</span>
          <button class="btn btn-small btn-secondary${hasTransfer ? ' highlight' : ''}" id="btn-paste-layer"
            ${hasTransfer ? '' : 'disabled'}
            title="${hasTransfer ? '貼入：' + esc(window._layerTransfer.name) : '請先右鍵素材→複製材質為圖層'}">
            📎 貼入圖層${hasTransfer ? '（' + esc(window._layerTransfer.name) + '）' : ''}
          </button>
          <button class="btn btn-small btn-secondary" id="btn-save-back"
            ${canWriteBack ? '' : 'disabled title="請使用「開啟 JAR（可寫回）」"'}>
            ${writeBackLabel}
          </button>
          <button class="btn btn-small btn-primary" id="btn-save-as">📥 另存</button>
        </div>
      `;

      // 初始化像素編輯器
      Editor.init(document.getElementById('editor-mount'), w, h, img);

      // 貼入圖層（跨素材）
      document.getElementById('btn-paste-layer')?.addEventListener('click', () => {
        const t = window._layerTransfer;
        if (!t) return;
        Editor.addLayerFromCanvas(t.name, t.canvas);
      });

      // 當編輯器內容改變 → 通知 3D 預覽
      Editor.onChange(flatCanvas => {
        if (window.Preview3D) Preview3D.updateTexture(flatCanvas);
      });

      // 存回原檔
      document.getElementById('btn-save-back')?.addEventListener('click', async () => {
        try {
          const blob = await Editor.getBlob();
          if (node.zipPath && Loader.isJarMode()) {
            // JAR 模式：更新 zip entry 並寫回 jar
            await Loader.saveBackJar(node.zipPath, blob);
            showToast('已寫回 JAR ✓');
          } else if (node.handle) {
            await Loader.saveBack(node, blob);
            showToast('已存回原檔 ✓');
          } else {
            throw new Error('請使用「開啟 JAR（可寫回）」按鈕開啟檔案');
          }
        } catch(e) { alert(e.message); }
      });

      // 另存新檔
      document.getElementById('btn-save-as').addEventListener('click', async () => {
        const blob = await Editor.getBlob();
        await Loader.saveAs(name, blob);
      });
    };
    img.src = url;
  }

  /* ===== 工具函式 ===== */
  function esc(s) { return s.replace(/&/g,'&amp;').replace(/</g,'&lt;'); }

  function showToast(msg) {
    const t = document.createElement('div');
    t.className = 'toast';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(() => t.classList.add('show'), 10);
    setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 300); }, 2000);
  }

  // 把 showToast 掛到 window 讓其他模組也能用
  window.showToast = showToast;

  /* ===== 說明視窗 ===== */
  const helpOverlay = document.getElementById('help-modal-overlay');
  document.getElementById('btn-help').addEventListener('click', () => {
    helpOverlay.style.display = 'flex';
  });
  document.getElementById('help-close').addEventListener('click', () => {
    helpOverlay.style.display = 'none';
  });
  helpOverlay.addEventListener('click', e => {
    if (e.target === helpOverlay) helpOverlay.style.display = 'none';
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && helpOverlay.style.display !== 'none') {
      helpOverlay.style.display = 'none';
    }
  });
  // Tab 切換
  document.querySelectorAll('.help-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      document.querySelectorAll('.help-tab').forEach(t => t.classList.remove('active'));
      document.querySelectorAll('.help-page').forEach(p => p.classList.remove('active'));
      tab.classList.add('active');
      document.querySelector(`.help-page[data-tab="${tab.dataset.tab}"]`).classList.add('active');
    });
  });

})();
