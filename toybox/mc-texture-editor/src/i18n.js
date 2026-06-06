/**
 * i18n.js — 多語言支援
 * 使用方式：在 index.html 裡設定 window.GT_LANG = 'en' 或 'zh'（預設 zh）
 * JS 裡用 _t('中文字串') 包住文字，zh 直接回傳 key，en 查表翻譯
 */
(function () {
  var EN = {
    /* ===== index.html 靜態按鈕 ===== */
    '📁 開啟材質包資料夾':    '📁 Open Texture Pack Folder',
    '🧩 開啟 JAR（可寫回）':  '🧩 Open JAR (Writable)',
    '🗜️ 開啟 .zip / .jar（唯讀）': '🗜️ Open .zip / .jar (Read-only)',
    '⚙️ 批次處理':            '⚙️ Batch Process',
    '素材瀏覽器':              'Assets',
    '🔍 搜尋素材...':          '🔍 Search assets…',
    '3D 預覽':                 '3D Preview',
    '調色盤':                  'Palette',
    '選擇素材後開始編輯':      'Select an asset to start editing',
    '← 請先載入材質包':        '← Load a texture pack first',
    '沒有符合的素材':           'No matching assets',

    /* ===== editor.js — 工具列 ===== */
    '筆刷 (B)':               'Brush (B)',
    '變化筆刷 (V)':           'Variation Brush (V)',
    '提亮筆刷 (D)  左鍵+10%  右鍵-10%': 'Dodge/Burn (D)  L+10%  R−10%',
    '混色筆刷 (G)  與背景色混合':       'Blend (G)  Mixes toward BG color',
    '橡皮擦 (E)':             'Eraser (E)',
    '填色桶 (F)':             'Paint Bucket (F)',
    '滴管 (I)':               'Eyedropper (I)',
    '矩形選取 (R)':           'Rect Select (R)',
    '前景色（左鍵）':         'Foreground (L-click)',
    '背景色（右鍵）':         'Background (R-click)',
    '交換顏色':               'Swap colors',
    '筆刷':                   'Brush size',
    '復原 Ctrl+Z':            'Undo Ctrl+Z',
    '重做 Ctrl+Y':            'Redo Ctrl+Y',
    '放大 滾輪↑':             'Zoom In (scroll↑)',
    '縮小 滾輪↓':             'Zoom Out (scroll↓)',
    '適合視窗':               'Fit window',
    '格線':                   'Grid',
    '調整畫布尺寸':           'Resize Canvas',
    '縮放: ':                 'Zoom: ',

    /* ===== editor.js — 圖層面板 ===== */
    '圖層':     'Layers',
    '背景':     'Background',
    '⬇ 合併':     '⬇ Merge Down',
    '圖層 ':       'Layer ',
    '新增空白圖層': 'Add blank layer',
    '刪除圖層':     'Delete layer',
    '匯入圖片為圖層': 'Import image as layer',

    /* ===== editor.js — 選取工具列 ===== */
    '選取：':   'Selection:',
    '✂️ 剪下':  '✂️ Cut',
    '📋 複製':  '📋 Copy',
    '📌 貼上':  '📌 Paste',
    '🗑 刪除':  '🗑 Delete',
    '↔ 水平':  '↔ H-Flip',
    '↕ 垂直':  '↕ V-Flip',
    '↻ 旋轉':  '↻ Rotate 90°',
    '✓ 確認':  '✓ Confirm',
    '✕ 取消':  '✕ Cancel',

    /* ===== editor.js — 調整畫布對話框 ===== */
    '⤢ 調整畫布尺寸':          '⤢ Resize Canvas',
    '快速倍增':                 'Quick Scale',
    '寬度':                     'Width',
    '高度':                     'Height',
    '模式':                     'Mode',
    '🎮 像素倍增（整數倍放大，每格→N×N）': '🎮 Pixel Perfect (integer scale, each px→N×N)',
    '延伸（保留內容，多餘透明）':           'Extend (keep content, fill transparent)',
    '縮放（雙線性拉伸）':                   'Scale (bilinear)',
    '裁切（從錨點裁切）':                   'Crop (from anchor)',
    '錨點':    'Anchor',
    '取消':    'Cancel',
    '✓ 套用':  '✓ Apply',
    '整數倍':  'Integer multiple',
    '可使用「像素倍增」模式': '— Pixel Perfect mode available',

    /* ===== main.js — 浮動列 ===== */
    '💾 寫回 JAR':   '💾 Write to JAR',
    '💾 存回原檔':   '💾 Save to file',
    '請使用「開啟 JAR（可寫回）」': 'Open with "Open JAR (Writable)" to enable saving',
    '📥 另存':       '📥 Save As',
    '📎 貼入圖層':   '📎 Paste as Layer',
    '請先右鍵素材→複製材質為圖層': 'Right-click an asset → Copy as Layer first',
    '貼入：':        'Paste: ',
    '已寫回 JAR ✓':  'Written to JAR ✓',
    '已存回原檔 ✓':  'Saved ✓',
    '請使用「開啟 JAR（可寫回）」按鈕開啟檔案': 'Please use "Open JAR (Writable)" to enable save-back',

    /* ===== tree.js ===== */
    '📎 複製材質為圖層': '📎 Copy as Layer',
    '🗂 在編輯器開啟':   '🗂 Open in Editor',
    '複製失敗：':        'Copy failed: ',
    '，切換到目標素材後點「貼入圖層」': ' — switch to target asset and click "Paste as Layer"',

    /* ===== preview3d.js ===== */
    '方塊':     'Cube',
    '半磚':     'Slab',
    '平面':     'Flat',
    '自動旋轉': 'Auto-rotate',
    '重置視角': 'Reset view',
    '尚未載入': 'Not loaded',

    /* ===== palette.js — 色彩群組 ===== */
    '羊毛 & 混凝土': 'Wool & Concrete',
    '木材 & 原木':   'Wood & Logs',
    '石材 & 礦石':   'Stone & Ores',
    '特殊方塊':      'Special Blocks',
    '染料顏色':      'Dye Colors',
    '最近使用':      'Recent',
    '自訂':          'Custom',
    '+ 加入自訂':    '+ Add custom',
    '前景色':        'Foreground',
    '背景色':        'Background',

    /* ===== batch.js ===== */
    '⚙️ 批次處理': '⚙️ Batch Process',
    '關閉':         'Close',
    '素材清單':     'Asset List',
    '全選':         'All',
    '取消':         'None',
    '反選':         'Invert',
    '色彩調整':     'Color Adjust',
    '色彩替換':     'Color Replace',
    '重新命名':     'Rename',
    '匯出設定':     'Export',
    '色調偏移':     'Hue Shift',
    '飽和度':       'Saturation',
    '亮度':         'Brightness',
    '對比度':       'Contrast',
    '不透明度':     'Opacity',
    '轉為灰階':     'Convert to Grayscale',
    '原始':         'Original',
    '預覽':         'Preview',
    '👁 預覽第一張': '👁 Preview first',
    '替換顏色':     'Replace Color',
    '容差':         'Tolerance',
    '將接近「替換顏色」的像素全部換成目標色': 'Replace pixels close to the source color with the target color',
    '前綴':         'Prefix',
    '後綴':         'Suffix',
    '搜尋':         'Find',
    '取代':         'Replace',
    '加序號':       'Add number',
    '例：custom_':  'e.g. custom_',
    '例：_v2':      'e.g. _v2',
    '搜尋字串':     'Search text',
    '取代為':       'Replace with',
    '縮放比例':     'Scale',
    '匯出格式':     'Format',
    '畫質':         'Quality',
    '📦 打包匯出 ZIP': '📦 Export as ZIP',
    '✓ 套用並匯出':    '✓ Apply & Export',
    '未載入材質包，': 'No texture pack loaded,',
    '請先開啟材質包': 'please open a pack first',
    '正在處理…':     'Processing…',

    /* ===== editor.js — 其他訊息 ===== */
    '已加入圖層「': 'Layer "',
    '」': '" added',
    '畫布已調整為': 'Canvas resized to',
    '✓': '✓',
    '已複製「': 'Copied "',

    /* ===== help modal ===== (handled in HTML) */
  };

  var lang = window.GT_LANG || 'zh';
  window.GT_LANG = lang;
  window._t = function (key) {
    if (lang === 'en' && EN[key] !== undefined) return EN[key];
    return key;
  };
  // 也讓其他模組可查完整翻譯表（for template literals with dynamic parts）
  window._EN = EN;
})();
