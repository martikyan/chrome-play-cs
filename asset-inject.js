(function () {
  const LOG = '[CS Macro][Inject Assets]';
  const CONFIG_ID = '__cs_ext_model_config__';
  const SETTINGS_KEY = 'play-cs-extension-settings';
  const DISTRACTING_SOUNDS_ATTRIBUTE = 'data-cs-ext-disable-distracting-sounds';
  let injectionStarted = false;

  /** Runs synchronously in page context before any async script load. */
  const SYNC_BOOTSTRAP = `
(function () {
  var LOG = '[CS Macro][Inject Assets]';
  var DISTRACTING_SOUNDS_ATTRIBUTE = 'data-cs-ext-disable-distracting-sounds';
  var DISTRACTING_SOUND_PATH = /(?:^|\\/)rodir\\/valve\\/misc\\/[^/]+\\.wav$/i;
  if (window.__csExtSyncBootstrap) return;
  window.__csExtSyncBootstrap = true;

  console.log(LOG + ' Sync bootstrap running on ' + location.href);

  window.__csExtOverrides = window.__csExtOverrides || new Map();
  window.__csExtDistractingSoundReplacement =
    window.__csExtDistractingSoundReplacement || null;
  window.__csExtHookStats = { getItem: 0, getItemHit: 0, xhr: 0, xhrHit: 0, fs: 0, fsHit: 0 };

  function normalizePath(value) {
    if (!value || typeof value !== 'string') return null;
    return value.split('?')[0];
  }

  function modelNameFromPath(path) {
    var match = path.match(/\\/models\\/player\\/([^/]+)\\/\\1\\.mdl$/i);
    return match ? match[1].toLowerCase() : null;
  }

  window.__csExtMatchOverride = function (keyOrPath) {
    var path = normalizePath(keyOrPath);
    if (!path) return null;

    if (/^https?:/i.test(path)) {
      try {
        path = new URL(path).pathname;
      } catch (e) {
        return null;
      }
    }

    if (path.endsWith('.pict')) {
      path = path.slice(0, -5);
    }

    if (
      document.documentElement &&
      document.documentElement.getAttribute(DISTRACTING_SOUNDS_ATTRIBUTE) === 'true' &&
      DISTRACTING_SOUND_PATH.test(path) &&
      window.__csExtDistractingSoundReplacement
    ) {
      return window.__csExtDistractingSoundReplacement;
    }

    var overrides = window.__csExtOverrides;
    if (overrides.has(path)) return overrides.get(path);
    var model = modelNameFromPath(path);
    if (!model) return null;
    var candidates = [
      '/rez/models/player/' + model + '/' + model + '.mdl',
      '/cstrike/models/player/' + model + '/' + model + '.mdl',
    ];
    for (var i = 0; i < candidates.length; i++) {
      if (overrides.has(candidates[i])) return overrides.get(candidates[i]);
    }
    return null;
  };

  window.__csExtRegisterOverride = function (gameKey, data) {
    var path = normalizePath(gameKey);
    if (!path || !data) return;
    var overrides = window.__csExtOverrides;
    overrides.set(path, data);
    var model = modelNameFromPath(path);
    if (model) {
      overrides.set('/cstrike/models/player/' + model + '/' + model + '.mdl', data);
      overrides.set('/rez/models/player/' + model + '/' + model + '.mdl', data);
    }
  };

  function hookLocalforageInstance(instance, label) {
    if (!instance || typeof instance.getItem !== 'function' || instance.__csExtHooked) return false;
    var originalGetItem = instance.getItem.bind(instance);
    instance.getItem = function (key) {
      window.__csExtHookStats.getItem += 1;
      var data = window.__csExtMatchOverride(key);
      if (data) {
        window.__csExtHookStats.getItemHit += 1;
        console.log(LOG + ' localforage.getItem override HIT for "' + key + '" (' + data.byteLength + ' bytes)');
        return Promise.resolve(data);
      }
      return originalGetItem(key);
    };
    instance.__csExtHooked = true;
    console.log(LOG + ' Hooked localforage.getItem (' + label + ').');
    return true;
  }

  var currentLocalforage = window.localforage;
  if (currentLocalforage) hookLocalforageInstance(currentLocalforage, 'bootstrap existing');

  try {
    Object.defineProperty(window, 'localforage', {
      configurable: true,
      enumerable: true,
      get: function () { return currentLocalforage; },
      set: function (value) {
        currentLocalforage = value;
        console.log(LOG + ' window.localforage assigned.');
        hookLocalforageInstance(value, 'bootstrap setter');
      },
    });
    console.log(LOG + ' Installed window.localforage property trap.');
  } catch (error) {
    console.warn(LOG + ' localforage property trap failed:', error);
  }

  if (!window.__csExtXhrHookInstalled) {
    window.__csExtXhrHookInstalled = true;
    var originalOpen = XMLHttpRequest.prototype.open;
    var originalSend = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.open = function (method, url) {
      this.__csExtUrl = url;
      return originalOpen.apply(this, arguments);
    };
    XMLHttpRequest.prototype.send = function () {
      var url = this.__csExtUrl;
      var override = window.__csExtMatchOverride(url);
      if (override) {
        window.__csExtHookStats.xhr += 1;
        window.__csExtHookStats.xhrHit += 1;
        console.log(LOG + ' XHR override HIT for "' + url + '" (' + override.byteLength + ' bytes)');
        var xhr = this;
        queueMicrotask(function () {
          try {
            Object.defineProperty(xhr, 'status', { configurable: true, value: 200 });
            Object.defineProperty(xhr, 'readyState', { configurable: true, value: 4 });
            Object.defineProperty(xhr, 'response', { configurable: true, value: override.buffer });
          } catch (e) {}
          if (typeof xhr.onload === 'function') xhr.onload();
          if (typeof xhr.onreadystatechange === 'function') xhr.onreadystatechange();
        });
        return;
      }
      return originalSend.apply(this, arguments);
    };
    console.log(LOG + ' Installed XMLHttpRequest hook.');
  }
})();
`;

  function setDistractingSoundsDisabled(disabled) {
    if (!document.documentElement) return;
    document.documentElement.setAttribute(
      DISTRACTING_SOUNDS_ATTRIBUTE,
      String(disabled)
    );
  }

  function injectPageScript(customModelsEnabled, disableDistractingSounds) {
    if (injectionStarted) {
      console.log(`${LOG} Page script already injected, skipping.`);
      return;
    }
    injectionStarted = true;
    setDistractingSoundsDisabled(disableDistractingSounds);

    const manifest = customModelsEnabled ? buildModelOverrideManifest() : {};
    const urls = {};

    for (const [gameKey, extensionPath] of Object.entries(manifest)) {
      urls[gameKey] = chrome.runtime.getURL(extensionPath);
    }

    console.log(
      `${LOG} Content script injecting ${Object.keys(urls).length} model override(s) ` +
      `and distracting-sound control on ${location.href}`
    );

    const bootstrap = document.createElement('script');
    bootstrap.textContent = SYNC_BOOTSTRAP;
    (document.documentElement || document.head || document).appendChild(bootstrap);
    bootstrap.remove();

    const configEl = document.createElement('div');
    configEl.id = CONFIG_ID;
    configEl.hidden = true;
    configEl.textContent = JSON.stringify({
      urls,
      distractingSoundsUrl: chrome.runtime.getURL('blank.wav'),
    });
    (document.documentElement || document.head || document).appendChild(configEl);

    const script = document.createElement('script');
    script.id = '__cs_ext_page_script__';
    script.src = chrome.runtime.getURL('asset-inject-page.js');
    script.onload = () => {
      console.log(`${LOG} asset-inject-page.js loaded successfully.`);
      script.remove();
    };
    script.onerror = (error) => {
      console.error(`${LOG} Failed to load asset-inject-page.js:`, error);
    };
    (document.documentElement || document.head || document).appendChild(script);
  }


  function readAssetSettings(raw) {
    let customModelsEnabled = true;
    let disableDistractingSounds = false;

    try {
      if (raw) {
        const settings = typeof raw === 'string' ? JSON.parse(raw) : raw;
        if ('customModels' in settings) {
          customModelsEnabled = !!settings.customModels;
        }
        if ('disableDistractingSounds' in settings) {
          disableDistractingSounds = !!settings.disableDistractingSounds;
        }
      }
    } catch (error) {
      console.warn(`${LOG} Failed to parse settings from storage:`, error);
    }

    return { customModelsEnabled, disableDistractingSounds };
  }

  function applyAssetSettings(raw) {
    const { customModelsEnabled, disableDistractingSounds } =
      readAssetSettings(raw);

    setDistractingSoundsDisabled(disableDistractingSounds);

    if (!customModelsEnabled && !disableDistractingSounds) {
      console.log(`${LOG} Asset overrides are disabled in settings.`);
      return;
    }

    if (document.documentElement) {
      injectPageScript(customModelsEnabled, disableDistractingSounds);
    } else {
      console.log(`${LOG} document.documentElement not ready, waiting for DOMContentLoaded...`);
      document.addEventListener(
        'DOMContentLoaded',
        () => injectPageScript(customModelsEnabled, disableDistractingSounds),
        { once: true }
      );
    }
  }

  chrome.storage.local.get([SETTINGS_KEY], (result) => {
    applyAssetSettings(result[SETTINGS_KEY]);
  });

  chrome.storage.onChanged.addListener((changes, areaName) => {
    if (areaName !== 'local' || !changes[SETTINGS_KEY]) return;
    applyAssetSettings(changes[SETTINGS_KEY].newValue);
  });
})();
