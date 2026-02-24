// =============================================================================
// LowQuality - Content Script
// Force 144p sur YouTube, calcule l'economie sur le temps reellement regarde
// =============================================================================

(function () {
  "use strict";

  // --- Constantes energie ---
  // 1080p ~ 12 Mbps  |  144p ~ 0.2 Mbps
  const BITRATE_1080P_MBPS = 12;
  const BITRATE_144P_MBPS = 0.2;
  const KWH_PER_GB = 0.015;
  const PHONE_CHARGE_KWH = 0.015;

  let overlayShown = false;
  let qualitySetFor = null;
  let watchTracker = null;
  let autoDismissTimer = null;

  // --- Watch time tracker ---
  // Suit le temps reellement visionne (play/pause/seek)
  class WatchTimeTracker {
    constructor(video) {
      this.video = video;
      this.watchedSeconds = 0;
      this.lastPlayTime = null;
      this.saved = false;

      this._onPlay = () => this._startCounting();
      this._onPause = () => this._stopCounting();
      this._onEnded = () => { this._stopCounting(); this._save(); };

      video.addEventListener("play", this._onPlay);
      video.addEventListener("playing", this._onPlay);
      video.addEventListener("pause", this._onPause);
      video.addEventListener("ended", this._onEnded);

      // Si la video joue deja
      if (!video.paused) {
        this._startCounting();
      }
    }

    _startCounting() {
      if (this.lastPlayTime === null) {
        this.lastPlayTime = Date.now();
      }
    }

    _stopCounting() {
      if (this.lastPlayTime !== null) {
        this.watchedSeconds += (Date.now() - this.lastPlayTime) / 1000;
        this.lastPlayTime = null;
      }
    }

    getWatchedSeconds() {
      let total = this.watchedSeconds;
      if (this.lastPlayTime !== null) {
        total += (Date.now() - this.lastPlayTime) / 1000;
      }
      return total;
    }

    _save() {
      if (this.saved) return;
      this.saved = true;
      const seconds = this.getWatchedSeconds();
      if (seconds > 5) {
        const savings = computeSavings(seconds);
        saveSavings(savings);
      }
    }

    destroy() {
      this._stopCounting();
      this._save();
      this.video.removeEventListener("play", this._onPlay);
      this.video.removeEventListener("playing", this._onPlay);
      this.video.removeEventListener("pause", this._onPause);
      this.video.removeEventListener("ended", this._onEnded);
    }
  }

  // --- Utilitaires ---
  function isShort() {
    return window.location.pathname.startsWith("/shorts");
  }

  function getVideoId() {
    const params = new URLSearchParams(window.location.search);
    return params.get("v");
  }

  // --- Calcul d'economie ---
  function computeSavings(durationSeconds) {
    const durationMin = durationSeconds / 60;
    const data1080 = (BITRATE_1080P_MBPS / 8) * 60 * durationMin;
    const data144 = (BITRATE_144P_MBPS / 8) * 60 * durationMin;
    const savedMB = data1080 - data144;
    const savedGB = savedMB / 1024;
    const savedKWh = savedGB * KWH_PER_GB;
    const phoneCharges = savedKWh / PHONE_CHARGE_KWH;
    return { savedMB, savedGB, savedKWh, phoneCharges, durationMin };
  }

  // --- Forcer la qualite ---
  function setQuality(target) {
    const player = document.getElementById("movie_player");
    if (player && typeof player.setPlaybackQualityRange === "function") {
      const q = target === 144 ? "tiny" : "hd1080";
      player.setPlaybackQualityRange(q, q);
      return;
    }
    trySetQualityViaMenu(target);
  }

  function trySetQualityViaMenu(target) {
    const label = target <= 144 ? "144p" : "1080p";
    const settingsBtn = document.querySelector(".ytp-settings-button");
    if (!settingsBtn) return;
    settingsBtn.click();

    setTimeout(() => {
      const menuItems = document.querySelectorAll(".ytp-menuitem");
      let qualityItem = null;
      menuItems.forEach((item) => {
        const text = item.querySelector(".ytp-menuitem-label");
        if (text && (text.textContent.includes("Qualité") || text.textContent.includes("Quality"))) {
          qualityItem = item;
        }
      });
      if (qualityItem) {
        qualityItem.click();
        setTimeout(() => {
          const options = document.querySelectorAll(
            ".ytp-quality-menu .ytp-menuitem, .ytp-panel-menu .ytp-menuitem"
          );
          options.forEach((opt) => {
            const optLabel = opt.querySelector(".ytp-menuitem-label");
            if (optLabel && optLabel.textContent.includes(label)) {
              opt.click();
            }
          });
          setTimeout(() => {
            const panel = document.querySelector(".ytp-settings-menu");
            if (panel && panel.style.display !== "none") {
              settingsBtn.click();
            }
          }, 200);
        }, 300);
      } else {
        settingsBtn.click();
      }
    }, 300);
  }

  // --- Overlay sobre ---
  function showOverlay() {
    if (overlayShown) return;
    if (document.getElementById("lowquality-overlay")) return;
    overlayShown = true;

    const overlay = document.createElement("div");
    overlay.id = "lowquality-overlay";
    overlay.innerHTML = `
      <div class="lowquality-card">
        <div class="lowquality-header">
          <span class="lowquality-title">LowQuality</span>
          <button id="lowquality-close" class="lowquality-close-btn">&#x2715;</button>
        </div>
        <div class="lowquality-body">
          <p class="lowquality-msg">Qualite reduite a <strong>144p</strong>.</p>
          <div class="lowquality-actions">
            <button id="lowquality-hd" class="lowquality-btn lowquality-btn-hd">1080p</button>
            <button id="lowquality-keep" class="lowquality-btn lowquality-btn-keep">Garder 144p</button>
          </div>
        </div>
      </div>
    `;

    document.body.appendChild(overlay);

    document.getElementById("lowquality-close").addEventListener("click", closeOverlay);
    document.getElementById("lowquality-keep").addEventListener("click", closeOverlay);

    // Auto-dismiss après 10s si activé
    chrome.storage.local.get(["autoDismiss"], (data) => {
      if (data.autoDismiss) {
        autoDismissTimer = setTimeout(() => {
          closeOverlay(); // ferme l'overlay, garde 144p
        }, 10000);
      }
    });

    document.getElementById("lowquality-hd").addEventListener("click", () => {
      setQuality(1080);
      // Arrete le tracking : pas d'economie si on repasse en 1080p
      if (watchTracker) {
        watchTracker.saved = true; // ne pas sauvegarder
        watchTracker.destroy();
        watchTracker = null;
      }
      closeOverlay();
    });
  }

  function closeOverlay() {
    if (autoDismissTimer) {
      clearTimeout(autoDismissTimer);
      autoDismissTimer = null;
    }
    const el = document.getElementById("lowquality-overlay");
    if (el) {
      el.classList.add("lowquality-fade-out");
      setTimeout(() => el.remove(), 200);
    }
    overlayShown = false;
  }

  // --- Sauvegarde ---
  function saveSavings(savings) {
    const today = new Date().toISOString().slice(0, 10);
    chrome.storage.local.get(["dailySavings", "totalSavings"], (data) => {
      const daily = data.dailySavings || {};
      const total = data.totalSavings || { savedMB: 0, savedKWh: 0, phoneCharges: 0, videoCount: 0 };

      if (!daily[today]) {
        daily[today] = { savedMB: 0, savedKWh: 0, phoneCharges: 0, videoCount: 0 };
      }
      daily[today].savedMB += savings.savedMB;
      daily[today].savedKWh += savings.savedKWh;
      daily[today].phoneCharges += savings.phoneCharges;
      daily[today].videoCount += 1;

      total.savedMB += savings.savedMB;
      total.savedKWh += savings.savedKWh;
      total.phoneCharges += savings.phoneCharges;
      total.videoCount += 1;

      chrome.storage.local.set({ dailySavings: daily, totalSavings: total });
    });
  }

  // --- Logique principale ---
  function onVideoDetected() {
    const videoId = getVideoId();
    if (!videoId || isShort()) return;
    if (videoId === qualitySetFor) return;

    // Detruire l'ancien tracker
    if (watchTracker) {
      watchTracker.destroy();
      watchTracker = null;
    }

    qualitySetFor = videoId;

    const video = document.querySelector("video");
    if (!video) return;

    const apply = () => {
      setQuality(144);
      watchTracker = new WatchTimeTracker(video);
      setTimeout(() => showOverlay(), 600);
    };

    if (video.readyState >= 1 && video.duration > 0) {
      apply();
    } else {
      video.addEventListener("loadedmetadata", apply, { once: true });
    }
  }

  // --- Navigation SPA ---
  function watchNavigation() {
    let lastUrl = location.href;

    const check = () => {
      if (location.href !== lastUrl) {
        lastUrl = location.href;
        overlayShown = false;
        qualitySetFor = null;
        closeOverlay();
        setTimeout(() => onVideoDetected(), 1500);
      }
    };

    const titleEl = document.querySelector("title");
    if (titleEl) {
      new MutationObserver(check).observe(titleEl, { childList: true });
    }

    window.addEventListener("yt-navigate-finish", () => {
      overlayShown = false;
      qualitySetFor = null;
      closeOverlay();
      setTimeout(() => onVideoDetected(), 1500);
    });

    window.addEventListener("popstate", () => setTimeout(check, 500));
    setInterval(check, 2000);
  }

  // --- Sauvegarde avant fermeture de page ---
  window.addEventListener("beforeunload", () => {
    if (watchTracker) {
      watchTracker.destroy();
    }
  });

  // --- Init ---
  function init() {
    watchNavigation();
    setTimeout(() => onVideoDetected(), 2000);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
