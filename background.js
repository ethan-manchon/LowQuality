// =============================================================================
// LowQuality - Background Service Worker
// Gère l'initialisation du storage et les messages
// =============================================================================

chrome.runtime.onInstalled.addListener(() => {
  console.log("[LowQuality] Extension installée");

  // Initialiser le storage
  chrome.storage.local.get(["dailySavings", "totalSavings", "installDate", "autoDismiss"], (data) => {
    const updates = {};
    if (!data.installDate) {
      updates.installDate = new Date().toISOString().slice(0, 10);
      updates.dailySavings = {};
      updates.totalSavings = {
        savedMB: 0,
        savedKWh: 0,
        phoneCharges: 0,
        videoCount: 0,
      };
    }
    if (data.autoDismiss === undefined) {
      updates.autoDismiss = false;
    }
    if (Object.keys(updates).length > 0) {
      chrome.storage.local.set(updates);
    }
  });
});

// Écouter les messages du content script ou du popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === "GET_STATS") {
    chrome.storage.local.get(["dailySavings", "totalSavings", "installDate"], (data) => {
      sendResponse(data);
    });
    return true; // async
  }

  if (message.type === "RESET_STATS") {
    chrome.storage.local.set({
      dailySavings: {},
      totalSavings: {
        savedMB: 0,
        savedKWh: 0,
        phoneCharges: 0,
        videoCount: 0,
      },
    }, () => {
      sendResponse({ ok: true });
    });
    return true;
  }
});
