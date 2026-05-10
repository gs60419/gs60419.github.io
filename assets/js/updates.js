(function () {
  const roots = document.querySelectorAll('[data-updates-list]');
  if (!roots.length) return;

  function normalizeBase(path) {
    return path ? path.replace(/\/?$/, '/') : '';
  }

  function resolveHref(href, base) {
    if (!href || /^(https?:|mailto:|#)/.test(href)) return href || '#';
    return normalizeBase(base) + href;
  }

  function render(root, updates) {
    const limit = Number(root.dataset.updatesLimit || 0);
    const base = root.dataset.updatesBase || '';
    const visible = limit > 0 ? updates.slice(0, limit) : updates;

    root.innerHTML = visible.map((item) => {
      const href = resolveHref(item.href, base);
      const label = item.label || '閱讀';
      return `
          <article class="detail-card">
            <h3>${item.date}</h3>
            <p>${item.text}</p>
            <a class="button" href="${href}">${label}</a>
          </article>`;
    }).join('');
  }

  function renderError(root) {
    root.innerHTML = `
          <article class="detail-card">
            <h3>更新資料載入失敗</h3>
            <p>目前無法讀取共用更新資料，請稍後再重新整理頁面。</p>
            <a class="button" href="${resolveHref('updates.html', root.dataset.updatesBase || '')}">看更新日誌</a>
          </article>`;
  }

  const dataPath = document.currentScript.dataset.updatesSrc || 'assets/data/updates.json';

  fetch(dataPath)
    .then((response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    })
    .then((updates) => {
      roots.forEach((root) => render(root, updates));
    })
    .catch(() => {
      roots.forEach(renderError);
    });
}());
