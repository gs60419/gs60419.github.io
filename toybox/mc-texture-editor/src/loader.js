/**
 * loader.js — 材質包載入（資料夾 & ZIP/JAR）
 */

var Loader = (() => {

  // 目前載入的 JAR/ZIP 狀態（用於寫回）
  let _jarHandle = null;   // FileSystemFileHandle（可寫）
  let _jarZip    = null;   // JSZip 實例
  let _isJar     = false;

  /* ===== 開啟資料夾 ===== */
  async function openFolder(onLoaded) {
    try {
      const dirHandle = await window.showDirectoryPicker({ mode: 'readwrite' });
      _isJar = false; _jarHandle = null; _jarZip = null;
      const root = await Tree.buildFromHandles(dirHandle);
      onLoaded({ root, dirHandle, type: 'folder', name: dirHandle.name });
    } catch (e) {
      if (e.name !== 'AbortError') alert('無法開啟資料夾：' + e.message);
    }
  }

  /* ===== 開啟 ZIP（從 <input> File 物件，不可寫回） ===== */
  async function openZip(file, onLoaded) {
    try {
      _isJar = false; _jarHandle = null;
      const zip = await JSZip.loadAsync(file);
      _jarZip = zip;
      const root = Tree.buildFromZip(zip);
      onLoaded({ root, zip, type: 'zip', name: file.name });
    } catch (e) {
      alert('無法解析：' + e.message);
    }
  }

  /* ===== 開啟 JAR（File System Access API，可寫回） ===== */
  async function openJar(onLoaded) {
    try {
      const [fileHandle] = await window.showOpenFilePicker({
        types: [{
          description: 'Mod JAR / ZIP',
          accept: { 'application/java-archive': ['.jar'], 'application/zip': ['.zip'] }
        }],
        multiple: false
      });
      const file = await fileHandle.getFile();
      const zip  = await JSZip.loadAsync(file);

      _jarHandle = fileHandle;
      _jarZip    = zip;
      _isJar     = true;

      const root = Tree.buildFromZip(zip);
      onLoaded({ root, zip, type: 'jar', name: file.name, jarHandle: fileHandle });
    } catch (e) {
      if (e.name !== 'AbortError') alert('無法開啟 JAR：' + e.message);
    }
  }

  /* ===== 存回 JAR（更新 zip entry → 寫回原檔） ===== */
  async function saveBackJar(zipPath, imageBlob) {
    if (!_jarHandle || !_jarZip) throw new Error('未開啟可寫入的 JAR 檔案');

    // 1. 更新 JSZip 裡的 entry
    const ab = await imageBlob.arrayBuffer();
    _jarZip.file(zipPath, ab);

    // 2. 重新產生 ZIP 二進位
    showProgress('正在打包 JAR…');
    const content = await _jarZip.generateAsync(
      { type: 'arraybuffer', compression: 'DEFLATE', compressionOptions: { level: 6 } },
      meta => showProgress(`打包中… ${meta.percent.toFixed(0)}%`)
    );
    hideProgress();

    // 3. 寫回原檔
    const writable = await _jarHandle.createWritable();
    await writable.write(content);
    await writable.close();
  }

  /* ===== 存回資料夾內的 PNG ===== */
  async function saveBack(node, imageBlob) {
    if (!node.handle) throw new Error('此素材無法直接存回');
    const writable = await node.handle.createWritable();
    await writable.write(imageBlob);
    await writable.close();
  }

  /* ===== 另存新檔 ===== */
  async function saveAs(suggestedName, imageBlob) {
    const ext = suggestedName.split('.').pop() || 'png';
    const mimeMap = { png:'image/png', jpg:'image/jpeg', jpeg:'image/jpeg', webp:'image/webp' };
    const mime = mimeMap[ext] || 'image/png';
    const handle = await window.showSaveFilePicker({
      suggestedName,
      types: [{ description: 'Image', accept: { [mime]: ['.' + ext] } }]
    });
    const writable = await handle.createWritable();
    await writable.write(imageBlob);
    await writable.close();
  }

  /* ===== 進度提示 ===== */
  function showProgress(msg) {
    let el = document.getElementById('jar-progress-toast');
    if (!el) {
      el = document.createElement('div');
      el.id = 'jar-progress-toast';
      el.className = 'toast show';
      document.body.appendChild(el);
    }
    el.textContent = msg;
  }
  function hideProgress() {
    const el = document.getElementById('jar-progress-toast');
    if (el) el.remove();
  }

  /* ===== Getters ===== */
  function isJarMode() { return _isJar; }
  function getJarZip()  { return _jarZip; }

  return { openFolder, openZip, openJar, saveBack, saveBackJar, saveAs, isJarMode, getJarZip };
})();
