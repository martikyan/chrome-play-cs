/**
 * Binds a specific trigger key to a sequence of characters.
 */
function BindKeys(triggerKey, sequenceStr, delayMs = 35) {
  const handler = (e) => {
    // Check if the user is typing in a chat box first to avoid accidental triggers
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
            view: window
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

// Initialization logic
console.log("CS Macro Extension Loaded");

// Attempting to "Launch" (Note: This usually fails without a URI Scheme)
console.log("Requesting Overlay Sight.app launch...");
// window.location.href = "overlaysight://"; // Requires setting up a Custom URI Scheme on macOS

// --- Your Bindings ---
BindKeys('9', 'b43b62b64');
BindKeys('»', 'b43b62b64');
BindKeys('0', 'b42b62b64');
BindKeys('օ', 'b42b62b64');
BindKeys('=', 'b14b62b64');
BindKeys('ъ', 'b14b62b64');
BindKeys('ժ', 'b14b62b64');
BindKeys('-', 'b32b62b64b65');
BindKeys('ь', 'b32b62b64b65');
BindKeys('ռ', 'b32b62b64b65');
BindKeys('>', 'b64\\\\4');
BindKeys('§', 'b64\\\\4');
BindKeys('՝', 'b64\\\\4');
BindKeys('ж', 'b7b8');
BindKeys(']', 'b7b8');
BindKeys('ջ', 'b7b8');



// --- Death Feed Audio Monitor ---
console.log("[CS Macro] Initializing Death Feed Audio Monitor...");

const soundUrl = chrome.runtime.getURL("nintendo_switch.mp3");
console.log("[CS Macro] Sound URL resolved to:", soundUrl);
const killSound = new Audio(soundUrl);

function startObservingDeaths(deathFeedContainer) {
  console.log("[CS Macro] Observer started on container:", deathFeedContainer);

  const observer = new MutationObserver((mutationsList) => {
    for (const mutation of mutationsList) {
      if (mutation.type === 'childList' && mutation.addedNodes.length > 0) {
        console.log(`[CS Macro] Mutation detected: ${mutation.addedNodes.length} node(s) added.`);

        mutation.addedNodes.forEach((node) => {
          // Ensure it's an element node (skip text nodes)
          if (node.nodeType === Node.ELEMENT_NODE) {
            
            // Log a snippet of the HTML to see what is actually being injected
            const snippet = node.outerHTML ? node.outerHTML.substring(0, 100) : "Unknown Node";
            console.log("[CS Macro] New element added:", snippet + "...");

            // Query inside the new node for the killer
            const killerElement = node.querySelector('.hud-death-killer');

            if (killerElement) {
              const killerName = killerElement.textContent.trim();
              console.log(`[CS Macro] Found a killer: "${killerName}"`);

              if (killerName.toLowerCase().includes('martikyan')) {                console.log("[CS Macro] TARGET MATCHED: martikyan! Attempting to play sound...");

                killSound.play().then(() => {
                  console.log("[CS Macro] Sound played successfully.");
                }).catch(error => {
                  console.error("[CS Macro] Sound playback blocked or failed. Error:", error);
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
  console.log("[CS Macro] Observer is now actively watching for changes in the feed.");
}

// Polling to find the container
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
    // Only log every 5 attempts to avoid spamming the console too hard
    if (attempts % 5 === 0) {
      console.log(`[CS Macro] Still looking for death feed container... (Attempt ${attempts})`);
    }
    
    // Stop checking after about 2 minutes to save memory if we aren't in a game
    if (attempts > 120) {
      console.warn("[CS Macro] Timed out waiting for death feed container. Are you in a match?");
      clearInterval(waitForDeathFeed);
    }
  }
}, 1000);

// --- Center Screen Pointer (Crosshair) ---
function createCenterPointer() {
  // 1. Create a master container for the crosshair
  const crosshairContainer = document.createElement('div');
  
  // Center it on the screen and ensure it floats above everything
  crosshairContainer.style.position = 'fixed';
  crosshairContainer.style.top = '50%';
  crosshairContainer.style.left = '50%';
  crosshairContainer.style.transform = 'translate(-50%, -50%)';
  crosshairContainer.style.zIndex = '999999'; 
  crosshairContainer.style.pointerEvents = 'none'; // Allows clicks to pass through
  crosshairContainer.style.opacity = '0.8'; // NEW: 80% opacity
  
  // 2. Create the thin horizontal line
  const hLine = document.createElement('div');
  hLine.style.position = 'absolute';
  hLine.style.top = '50%';
  hLine.style.left = '50%';
  hLine.style.transform = 'translate(-50%, -50%)';
  hLine.style.width = '6px';  // NEW: Smaller length (was 12px)
  hLine.style.height = '1px'; // NEW: Thinner (was 2px)
  hLine.style.backgroundColor = 'darkred'; 
  
  // 3. Create the thin vertical line
  const vLine = document.createElement('div');
  vLine.style.position = 'absolute';
  vLine.style.top = '50%';
  vLine.style.left = '50%';
  vLine.style.transform = 'translate(-50%, -50%)';
  vLine.style.width = '1px';  // NEW: Thinner (was 2px)
  vLine.style.height = '6px'; // NEW: Smaller length (was 12px)
  vLine.style.backgroundColor = 'darkred'; 

  // 4. Attach the lines to the container, and the container to the webpage
  crosshairContainer.appendChild(hLine);
  crosshairContainer.appendChild(vLine);
  document.body.appendChild(crosshairContainer);
  
  console.log("[CS Macro] Thinner, smaller, 80% opacity dark red center pointer injected.");
}

// Run the function immediately
createCenterPointer();