chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.command === 'set_tab_muted') {
    if (!sender.tab || !sender.tab.id) {
      sendResponse({ ok: false, error: 'No tab ID available' });
      return true;
    }

    chrome.tabs.update(sender.tab.id, { muted: request.muted }, () => {
      if (chrome.runtime.lastError) {
        sendResponse({ ok: false, error: chrome.runtime.lastError.message });
      } else {
        sendResponse({ ok: true });
      }
    });

    return true; // Keep the message channel open for the async response
  }
});