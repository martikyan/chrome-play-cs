(function () {
  const LOG = '[CS Macro][Inject Models]';
  const CONFIG_ID = '__cs_ext_model_config__';

  console.log(`${LOG} Page script started on ${location.href}`);

  const overrides = window.__csExtOverrides || new Map();
  window.__csExtOverrides = overrides;
  const hookStats = window.__csExtHookStats || {
    getItem: 0,
    getItemHit: 0,
    xhr: 0,
    xhrHit: 0,
    fs: 0,
    fsHit: 0,
  };
  window.__csExtHookStats = hookStats;

  // Helper functions for matching/registering overrides (fallback if bootstrap fails)
  function normalizePath(value) {
    if (!value || typeof value !== 'string') return null;
    return value.split('?')[0];
  }

  function modelNameFromPath(path) {
    const match = path.match(/\/models\/player\/([^/]+)\/\1\.mdl$/i);
    return match ? match[1].toLowerCase() : null;
  }

  // Ensure override functions exist in the page context (e.g. if inline SYNC_BOOTSTRAP was blocked by CSP)
  if (typeof window.__csExtMatchOverride !== 'function') {
    window.__csExtMatchOverride = function (keyOrPath) {
      let path = normalizePath(keyOrPath);
      if (!path) return null;

      if (/^https?:/i.test(path)) {
        try {
          path = new URL(path).pathname;
        } catch {
          return null;
        }
      }

      if (path.endsWith('.pict')) {
        path = path.slice(0, -5);
      }

      const currentOverrides = window.__csExtOverrides;
      if (currentOverrides.has(path)) return currentOverrides.get(path);
      const model = modelNameFromPath(path);
      if (!model) return null;
      const candidates = [
        '/rez/models/player/' + model + '/' + model + '.mdl',
        '/cstrike/models/player/' + model + '/' + model + '.mdl',
      ];
      for (let i = 0; i < candidates.length; i++) {
        if (currentOverrides.has(candidates[i])) return currentOverrides.get(candidates[i]);
      }
      return null;
    };
    console.log(`${LOG} Defined fallback window.__csExtMatchOverride (bootstrap was blocked or skipped)`);
  }

  if (typeof window.__csExtRegisterOverride !== 'function') {
    window.__csExtRegisterOverride = function (gameKey, data) {
      const path = normalizePath(gameKey);
      if (!path || !data) return;
      const currentOverrides = window.__csExtOverrides;
      currentOverrides.set(path, data);
      const model = modelNameFromPath(path);
      if (model) {
        currentOverrides.set('/cstrike/models/player/' + model + '/' + model + '.mdl', data);
        currentOverrides.set('/rez/models/player/' + model + '/' + model + '.mdl', data);
      }
    };
    console.log(`${LOG} Defined fallback window.__csExtRegisterOverride (bootstrap was blocked or skipped)`);
  }

  const matchOverride = window.__csExtMatchOverride;
  const registerOverride = window.__csExtRegisterOverride;

  function readConfig() {
    const el = document.getElementById(CONFIG_ID);
    if (!el) {
      console.error(`${LOG} Config element #${CONFIG_ID} not found.`);
      return null;
    }
    try {
      const config = JSON.parse(el.textContent);
      console.log(`${LOG} Config loaded with ${Object.keys(config.urls || {}).length} URL(s).`);
      return config;
    } catch (error) {
      console.error(`${LOG} Failed to parse config JSON:`, error);
      return null;
    }
  }

  function hookLocalforageInstance(instance, label) {
    if (!instance || typeof instance.getItem !== 'function' || instance.__csExtHooked) {
      return false;
    }

    const originalGetItem = instance.getItem.bind(instance);
    instance.getItem = function (key) {
      hookStats.getItem += 1;
      const data = matchOverride(key);
      if (data) {
        hookStats.getItemHit += 1;
        console.log(`${LOG} localforage.getItem override HIT for "${key}" (${data.byteLength} bytes)`);
        return Promise.resolve(data);
      }
      if (hookStats.getItem <= 20 || hookStats.getItem % 100 === 0) {
        console.log(`${LOG} localforage.getItem pass-through for "${key}"`);
      }
      return originalGetItem(key);
    };

    instance.__csExtHooked = true;
    console.log(`${LOG} Hooked localforage.getItem (${label}).`);
    return true;
  }

  function installLocalforageTrap() {
    if (window.localforage) {
      hookLocalforageInstance(window.localforage, 'page script existing');
    }

    const poll = setInterval(() => {
      if (window.localforage && hookLocalforageInstance(window.localforage, 'page script poll')) {
        clearInterval(poll);
      }
    }, 25);

    setTimeout(() => clearInterval(poll), 120000);
  }

  function matchOverrideFromUrl(url) {
    if (!url || typeof url !== 'string') return null;
    try {
      const parsed = new URL(url, location.origin);
      return matchOverride(parsed.pathname + parsed.search);
    } catch {
      return matchOverride(url);
    }
  }

  function installFetchHook() {
    if (!window.fetch || window.__csExtFetchHookInstalled) return;
    window.__csExtFetchHookInstalled = true;

    const originalFetch = window.fetch.bind(window);
    window.fetch = function (input, init) {
      const url = typeof input === 'string' ? input : input && input.url;
      const override = matchOverrideFromUrl(url);
      if (override) {
        console.log(`${LOG} fetch override HIT for "${url}" (${override.byteLength} bytes)`);
        return Promise.resolve(new Response(override));
      }
      return originalFetch(input, init);
    };

    console.log(`${LOG} Installed fetch hook.`);
  }

  function hookFsInstance(fs, label) {
    if (!fs || typeof fs.writeFile !== 'function' || fs.__csExtHooked) {
      return false;
    }

    const originalWriteFile = fs.writeFile.bind(fs);
    fs.writeFile = function (path, data, opts) {
      hookStats.fs += 1;
      const override = matchOverride(path);
      if (override) {
        hookStats.fsHit += 1;
        console.log(`${LOG} FS.writeFile override HIT for "${path}" (${override.byteLength} bytes)`);
        return originalWriteFile(path, override, opts);
      }
      if (hookStats.fs <= 20 || /\/models\/player\//i.test(String(path))) {
        console.log(`${LOG} FS.writeFile pass-through for "${path}"`);
      }
      return originalWriteFile(path, data, opts);
    };

    fs.__csExtHooked = true;
    console.log(`${LOG} Hooked FS.writeFile (${label}).`);
    return true;
  }

  function installFsTrap() {
    if (window.FS) hookFsInstance(window.FS, 'existing window.FS');
    if (window.Module && window.Module.FS) hookFsInstance(window.Module.FS, 'existing Module.FS');

    const poll = setInterval(() => {
      if (window.FS) hookFsInstance(window.FS, 'poll window.FS');
      if (window.Module && window.Module.FS) hookFsInstance(window.Module.FS, 'poll Module.FS');
    }, 50);

    setTimeout(() => clearInterval(poll), 120000);
    console.log(`${LOG} Installed FS polling hook.`);
  }

  async function loadOverrides(config) {
    const entries = Object.entries(config.urls || {});
    console.log(`${LOG} Fetching ${entries.length} model override(s)...`);

    await Promise.all(
      entries.map(async ([gameKey, url]) => {
        try {
          const response = await fetch(url);
          if (!response.ok) {
            console.error(`${LOG} Fetch failed for ${gameKey}: HTTP ${response.status} (${url})`);
            return;
          }
          const buffer = await response.arrayBuffer();
          registerOverride(gameKey, new Uint8Array(buffer));
          console.log(`${LOG} Loaded override ${gameKey} (${buffer.byteLength} bytes)`);
        } catch (error) {
          console.error(`${LOG} Fetch error for ${gameKey} (${url}):`, error);
        }
      }),
    );

    console.log(`${LOG} Override map size: ${overrides.size} path(s)`);
    if (overrides.size === 0) {
      console.error(`${LOG} No overrides loaded — check extension paths and web_accessible_resources.`);
    }
  }

  function startDiagnostics() {
    setInterval(() => {
      console.log(
        `${LOG} Status — overrides:${overrides.size} localforage:${!!window.localforage} FS:${!!window.FS} stats:`,
        hookStats,
      );
    }, 15000);
  }

  async function main() {
    if (window.__csExtSyncBootstrap) {
      console.log(`${LOG} Sync bootstrap already active.`);
    } else {
      console.warn(`${LOG} Sync bootstrap missing — hooks may be late.`);
    }

    installLocalforageTrap();
    installFetchHook();
    installFsTrap();
    startDiagnostics();

    const config = readConfig();
    if (!config) return;

    await loadOverrides(config);
    console.log(`${LOG} Initialization complete. Waiting for game asset requests...`);
  }

  main().catch((error) => {
    console.error(`${LOG} Fatal initialization error:`, error);
  });
})();