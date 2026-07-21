// Prowlarr client UI — injected by core via window.BackIssue. Adds the source
// settings section (toggle + URL + API key + a per-indexer picker + Test). While
// enabled, it tells core to grey out the manually entered indexers (via
// onIndexersManaged). Reuses core CSS classes plus this plugin's ui.css.
(function () {
  const $ = (id) => document.getElementById(id);

  window.BackIssue.registerClient((api) => {
    const src = api.slot('settings-plugin-sources');
    if (src && !$('set-prowlarrEnabled')) {
      const block = document.createElement('div');
      block.className = 'src-block';
      block.innerHTML =
        '<div class="src-toggle">' +
          '<label class="switch"><input id="set-prowlarrEnabled" type="checkbox"><span class="switch__track"></span></label>' +
          '<div class="src-toggle__text"><b>Prowlarr</b><span class="modal__note src-toggle__note">Feed the Usenet and Torrent sources with the indexers your Prowlarr instance manages. Finds releases only — a download client is still needed.</span></div>' +
        '</div>' +
        '<div id="prowlarr-config" class="src-config">' +
          '<label class="field"><span>Prowlarr URL</span><input id="set-prowlarrUrl" type="text" spellcheck="false" placeholder="http://prowlarr:9696"></label>' +
          '<label class="field"><span>API key</span><input id="set-prowlarrApiKey" type="text" spellcheck="false" autocomplete="off"></label>' +
          '<label class="field"><span>Categories</span><input id="set-prowlarrCategories" type="text" spellcheck="false" placeholder="7000,7030"><span class="modal__note">Newznab/Torznab category ids searches are limited to (7000 = Books, 7030 = Comics). Blank searches without a category filter.</span></label>' +
          '<input id="set-prowlarrExcludeIds" type="hidden">' +
          '<div class="client-test"><button id="prowlarr-test" class="btn btn--ghost" type="button">Test connection</button><span id="prowlarr-test-result" class="client-status" hidden></span></div>' +
          '<div class="pw-idx__head"><b class="pw-idx__title">Indexers</b><button id="prowlarr-load" class="btn btn--ghost" type="button">Load</button></div>' +
          '<div id="prowlarr-idx" class="pw-idx"></div>' +
          '<p class="modal__note">The API key is in Prowlarr under <b>Settings → General → Security</b>. Choose which indexers to use above — all are used until you deselect some. While enabled, your manually entered indexers are ignored.</p>' +
        '</div>';
      src.appendChild(block);
    }

    const enabled = $('set-prowlarrEnabled');
    const urlEl = $('set-prowlarrUrl');
    const keyEl = $('set-prowlarrApiKey');
    const hidden = $('set-prowlarrExcludeIds');
    const idxBox = $('prowlarr-idx');
    if (!enabled || !urlEl || !keyEl || !hidden || !idxBox) return;

    const configured = () => !!(enabled.checked && urlEl.value.trim() && keyEl.value.trim());

    // Grey the manual indexer lists in core while we're actively managing them.
    api.onIndexersManaged(() => configured());
    // Reveal the config when enabled; not a standalone source, so report false to
    // the "no sources enabled" warning (Usenet/Torrent must still be enabled).
    api.onSourcesSync(() => {
      const cfg = $('prowlarr-config'); if (cfg) cfg.classList.toggle('open', enabled.checked);
      return false;
    });

    const resync = () => api.refreshSourceUI();
    enabled.onchange = resync;
    urlEl.oninput = resync;
    keyEl.oninput = resync;

    const excludeSet = () => new Set((hidden.value || '').split(',').map((s) => s.trim()).filter(Boolean));

    function renderIndexers(list) {
      const ex = excludeSet();
      idxBox.innerHTML = '';
      if (!list.length) { idxBox.innerHTML = '<p class="modal__note">No enabled indexers found — add and enable some in Prowlarr.</p>'; return; }
      for (const ix of list) {
        const row = document.createElement('label');
        row.className = 'pw-idx__row';
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.checked = !ex.has(String(ix.id));
        cb.onchange = () => {
          const s = excludeSet();
          if (cb.checked) s.delete(String(ix.id)); else s.add(String(ix.id));
          hidden.value = [...s].join(',');
        };
        const name = document.createElement('span');
        name.className = 'pw-idx__name';
        name.textContent = ix.name;
        const proto = document.createElement('span');
        proto.className = 'pw-idx__proto pw-idx__proto--' + (ix.protocol || 'unknown');
        proto.textContent = ix.protocol || '?';
        row.append(cb, name, proto);
        idxBox.appendChild(row);
      }
    }

    async function loadIndexers() {
      const url = urlEl.value.trim();
      if (!url) { idxBox.innerHTML = '<p class="modal__note">Enter a Prowlarr URL first.</p>'; return; }
      idxBox.innerHTML = '<p class="modal__note">Loading…</p>';
      let r;
      try { r = await api.post('/api/prowlarr/indexers', { url, apiKey: keyEl.value.trim() }); }
      catch (e) { r = { error: String(e) }; }
      if (r && Array.isArray(r.indexers)) renderIndexers(r.indexers);
      else idxBox.innerHTML = '<p class="modal__note pw-idx__err">' + api.escapeHtml((r && r.error) || 'Failed to load indexers.') + '</p>';
    }
    $('prowlarr-load').onclick = loadIndexers;

    $('prowlarr-test').onclick = async () => {
      const el = $('prowlarr-test-result');
      el.hidden = false; el.className = 'client-status is-testing'; el.textContent = 'Testing…';
      let r;
      try { r = await api.post('/api/prowlarr/test', { url: urlEl.value.trim(), apiKey: keyEl.value.trim() }); }
      catch (e) { r = { ok: false, message: String(e) }; }
      el.className = 'client-status ' + (r.ok ? 'is-ok' : 'is-bad');
      el.textContent = (r.ok ? '✓ ' : '✕ ') + r.message;
    };

    // Auto-load the picker when settings open with Prowlarr already configured.
    // Also seed the category filter's default: an untouched empty field would
    // otherwise SAVE as "" (= no filter), silently defeating the 7000,7030 default.
    api.onSettingsLoad((s) => {
      const catEl = $('set-prowlarrCategories');
      if (catEl && (!s || s.prowlarrCategories === undefined || s.prowlarrCategories === null)) catEl.value = '7000,7030';
      if (s && s.prowlarrEnabled && s.prowlarrUrl && s.prowlarrApiKey) loadIndexers();
    });
  });
})();
