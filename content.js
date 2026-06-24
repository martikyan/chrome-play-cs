/**
 * Binds a specific trigger key to a sequence of characters.
 */
function BindKeys(triggerKey, sequenceStr, delayMs = 35) {
  const handler = (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    if (e.key === triggerKey) {
      e.preventDefault();
      [...sequenceStr].forEach((char, i) => {
        setTimeout(() => {
          const el = document.activeElement || document.body;
          const isDigit = /\d/.test(char);
          const eventData = {
            key: char,
            code: isDigit ? `Digit${char}` : `Key${char.toUpperCase()}`,
            keyCode: char.toUpperCase().charCodeAt(0),
            bubbles: true,
            cancelable: true,
            view: window,
          };

          el.dispatchEvent(new KeyboardEvent('keydown', eventData));

          if (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA') {
            const start = el.selectionStart;
            const end = el.selectionEnd;
            const text = el.value;
            el.value = text.slice(0, start) + char + text.slice(end);
            el.setSelectionRange(start + 1, start + 1);
            el.dispatchEvent(new Event('input', { bubbles: true }));
          }
          el.dispatchEvent(new KeyboardEvent('keyup', eventData));
        }, i * delayMs);
      });
    }
  };

  document.addEventListener('keydown', handler);
  return handler;
}

const USERNAME_STORAGE_KEY = 'play-cs-extension-username';

let playerUsername = null;
const activeBindingHandlers = [];
let crosshairContainer = null;

function clearBindings() {
  for (const handler of activeBindingHandlers) {
    document.removeEventListener('keydown', handler);
  }
  activeBindingHandlers.length = 0;
}

function applyBindings(settings) {
  clearBindings();

  for (const template of BINDING_TEMPLATES) {
    const keys = splitCharacters(settings.bindings[template.id]);
    for (const key of keys) {
      if (key) {
        activeBindingHandlers.push(BindKeys(key, template.sequence));
      }
    }
  }

  console.log(`[CS Macro] Applied ${activeBindingHandlers.length} key binding(s).`);
}

// Replace applyPointerSize with applyPointerStyle
function applyPointerStyle(settings) {
  if (!crosshairContainer) return;

  const hLine = crosshairContainer.querySelector('[data-crosshair="h"]');
  const vLine = crosshairContainer.querySelector('[data-crosshair="v"]');
  if (!hLine || !vLine) return;

  // Set the main size (length of lines)
  hLine.style.width = `${settings.pointerSize}px`;
  vLine.style.height = `${settings.pointerSize}px`;

  // Set the thickness (opposite dimension)
  hLine.style.height = `${settings.pointerThickness}px`;
  vLine.style.width = `${settings.pointerThickness}px`;

  // Set the color
  hLine.style.backgroundColor = settings.pointerColor;
  vLine.style.backgroundColor = settings.pointerColor;
}

function applySettings(settings) {
  applyBindings(settings);
  applyPointerStyle(settings); // Call the updated function here
}

// Inside createCenterPointer(), remove the hardcoded background colors since
// applySettings() will now inject the user's custom color immediately upon loading.
function createCenterPointer() {
  crosshairContainer = document.createElement('div');

  crosshairContainer.style.position = 'fixed';
  crosshairContainer.style.top = '50%';
  crosshairContainer.style.left = '50%';
  crosshairContainer.style.transform = 'translate(-50%, -50%)';
  crosshairContainer.style.zIndex = '999999';
  crosshairContainer.style.pointerEvents = 'none';
  crosshairContainer.style.opacity = '0.9';

  const hLine = document.createElement('div');
  hLine.dataset.crosshair = 'h';
  hLine.style.position = 'absolute';
  hLine.style.top = '50%';
  hLine.style.left = '50%';
  hLine.style.transform = 'translate(-50%, -50%)';

  const vLine = document.createElement('div');
  vLine.dataset.crosshair = 'v';
  vLine.style.position = 'absolute';
  vLine.style.top = '50%';
  vLine.style.left = '50%';
  vLine.style.transform = 'translate(-50%, -50%)';

  crosshairContainer.appendChild(hLine);
  crosshairContainer.appendChild(vLine);
  document.body.appendChild(crosshairContainer);

  console.log('[CS Macro] Center pointer injected.');
}

function parseUsernameFromTopbarButton(button) {
  const clone = button.cloneNode(true);
  clone.querySelectorAll('i').forEach((icon) => icon.remove());
  return clone.textContent.trim();
}

function setPlayerUsername(username) {
  if (!username || username === playerUsername) return;
  playerUsername = username;
  chrome.storage.local.set({ [USERNAME_STORAGE_KEY]: username });
  console.log(`[CS Macro] Player username set to: "${username}"`);
}

function detectPlayerUsername() {
  const button = document.querySelector('#topbar-user > button');
  if (!button) return false;

  const username = parseUsernameFromTopbarButton(button);
  if (username) {
    setPlayerUsername(username);
    return true;
  }
  return false;
}

function loadStoredUsername() {
  return new Promise((resolve) => {
    chrome.storage.local.get(USERNAME_STORAGE_KEY, (result) => {
      const username = result[USERNAME_STORAGE_KEY];
      if (username) {
        playerUsername = username;
        console.log(`[CS Macro] Restored player username from storage: "${username}"`);
      }
      resolve(username ?? null);
    });
  });
}

console.log('CS Macro Extension Loaded');

async function initExtension() {
  await loadStoredUsername();
  createCenterPointer();
  const settings = await loadSettings();
  applySettings(settings);
}

initExtension();

chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName !== 'local' || !changes[SETTINGS_STORAGE_KEY]) return;
  applySettings(mergeSettings(changes[SETTINGS_STORAGE_KEY].newValue));
});

console.log('[CS Macro] Initializing Death Feed Audio Monitor...');

const soundUrl = chrome.runtime.getURL('nintendo_switch.mp3');
console.log('[CS Macro] Sound URL resolved to:', soundUrl);
const killSound = new Audio(soundUrl);

function startObservingDeaths(deathFeedContainer) {
  console.log('[CS Macro] Observer started on container:', deathFeedContainer);

  const observer = new MutationObserver((mutationsList) => {
    for (const mutation of mutationsList) {
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        console.log(`[CS Macro] Mutation detected: ${mutation.addedNodes.length} node(s) added.`);

        mutation.addedNodes.forEach((node) => {
          if (node.nodeType === Node.ELEMENT_NODE) {
            const snippet = node.outerHTML ? node.outerHTML.substring(0, 100) : 'Unknown Node';
            console.log('[CS Macro] New element added:', snippet + '...');

            const killerElement = node.querySelector('.hud-death-killer');

            if (killerElement) {
              const killerName = killerElement.textContent.trim();
              console.log(`[CS Macro] Found a killer: "${killerName}"`);

              if (playerUsername && killerName.toLowerCase().includes(playerUsername.toLowerCase())) {
                console.log(`[CS Macro] TARGET MATCHED: ${playerUsername}! Attempting to play sound...`);

                killSound
                  .play()
                  .then(() => {
                    console.log('[CS Macro] Sound played successfully.');
                  })
                  .catch((error) => {
                    console.error('[CS Macro] Sound playback blocked or failed. Error:', error);
                  });
              } else {
                console.log(`[CS Macro] Killer "${killerName}" is not the target. Ignoring.`);
              }
            } else {
              console.log("[CS Macro] No '.hud-death-killer' found inside the added node.");
            }
          }
        });
      }
    }
  });

  observer.observe(deathFeedContainer, { childList: true, subtree: true });
  console.log('[CS Macro] Observer is now actively watching for changes in the feed.');
}

let attempts = 0;
const waitForDeathFeed = setInterval(() => {
  attempts++;
  const selector = 'body > div.hud-container > div.hud-deaths';
  const deathFeedContainer = document.querySelector(selector);

  if (deathFeedContainer) {
    console.log(`[CS Macro] Success! Found death feed container after ${attempts} attempts.`);
    clearInterval(waitForDeathFeed);
    startObservingDeaths(deathFeedContainer);
  } else {
    if (attempts % 5 === 0) {
      console.log(`[CS Macro] Still looking for death feed container... (Attempt ${attempts})`);
    }

    if (attempts > 120) {
      console.warn('[CS Macro] Timed out waiting for death feed container. Are you in a match?');
      clearInterval(waitForDeathFeed);
    }
  }
}, 1000);

console.log('[CS Macro] Initializing player username detection...');

if (!detectPlayerUsername()) {
  let usernameAttempts = 0;
  const waitForTopbarUser = setInterval(() => {
    usernameAttempts++;
    if (detectPlayerUsername()) {
      console.log(`[CS Macro] Found topbar username after ${usernameAttempts} attempt(s).`);
      clearInterval(waitForTopbarUser);
      return;
    }

    if (usernameAttempts % 5 === 0) {
      console.log(`[CS Macro] Still looking for #topbar-user > button... (Attempt ${usernameAttempts})`);
    }

    if (usernameAttempts > 60) {
      console.warn('[CS Macro] Timed out waiting for topbar username. Kill sound will not match until detected.');
      clearInterval(waitForTopbarUser);
    }
  }, 1000);
}

function createCenterPointer() {
  crosshairContainer = document.createElement('div');

  crosshairContainer.style.position = 'fixed';
  crosshairContainer.style.top = '50%';
  crosshairContainer.style.left = '50%';
  crosshairContainer.style.transform = 'translate(-50%, -50%)';
  crosshairContainer.style.zIndex = '999999';
  crosshairContainer.style.pointerEvents = 'none';
  crosshairContainer.style.opacity = '0.9';

  const hLine = document.createElement('div');
  hLine.dataset.crosshair = 'h';
  hLine.style.position = 'absolute';
  hLine.style.top = '50%';
  hLine.style.left = '50%';
  hLine.style.transform = 'translate(-50%, -50%)';
  hLine.style.height = '1px';
  hLine.style.backgroundColor = 'darkred';

  const vLine = document.createElement('div');
  vLine.dataset.crosshair = 'v';
  vLine.style.position = 'absolute';
  vLine.style.top = '50%';
  vLine.style.left = '50%';
  vLine.style.transform = 'translate(-50%, -50%)';
  vLine.style.width = '1px';
  vLine.style.backgroundColor = 'darkred';

  crosshairContainer.appendChild(hLine);
  crosshairContainer.appendChild(vLine);
  document.body.appendChild(crosshairContainer);

  console.log('[CS Macro] Center pointer injected.');
}
