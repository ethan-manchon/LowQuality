// =============================================================================
// LowQuality - Popup Script
// Charge les stats et affiche le graphique
// =============================================================================

document.addEventListener("DOMContentLoaded", () => {
  const chart = new EcoChart("savings-chart");
  let currentDays = 7;

  loadStats(currentDays);

  // Period buttons
  document.querySelectorAll(".period-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      document.querySelectorAll(".period-btn").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      currentDays = parseInt(btn.dataset.days, 10);
      loadStats(currentDays);
    });
  });

  // Auto-dismiss toggle
  const autoDismissToggle = document.getElementById("auto-dismiss-toggle");
  chrome.storage.local.get(["autoDismiss"], (data) => {
    autoDismissToggle.checked = data.autoDismiss || false;
  });
  autoDismissToggle.addEventListener("change", () => {
    chrome.storage.local.set({ autoDismiss: autoDismissToggle.checked });
  });

  // Reset button
  document.getElementById("reset-btn").addEventListener("click", () => {
    if (confirm("Réinitialiser toutes les statistiques ?")) {
      chrome.runtime.sendMessage({ type: "RESET_STATS" }, () => {
        loadStats(currentDays);
      });
    }
  });

  function loadStats(days) {
    chrome.runtime.sendMessage({ type: "GET_STATS" }, (response) => {
      if (!response) return;

      const { dailySavings = {}, totalSavings = {}, installDate } = response;

      // Update totals
      const totalKWh = totalSavings.savedKWh || 0;
      document.getElementById("total-kwh").textContent = formatValue(totalKWh * 1000, "Wh");
      document.getElementById("total-charges").textContent = (totalSavings.phoneCharges || 0).toFixed(1);
      document.getElementById("total-videos").textContent = totalSavings.videoCount || 0;
      document.getElementById("total-data").textContent = ((totalSavings.savedMB || 0) / 1024).toFixed(2);

      // Install date
      if (installDate) {
        const d = new Date(installDate);
        document.getElementById("install-date").textContent = d.toLocaleDateString("fr-FR", {
          day: "numeric",
          month: "long",
          year: "numeric",
        });
      }

      // Chart data
      const chartData = buildChartData(dailySavings, days);
      chart.setData(chartData);
    });
  }

  function buildChartData(dailySavings, days) {
    const result = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Determine date range
    let dates = [];
    if (days === 0) {
      // All dates
      dates = Object.keys(dailySavings).sort();
      if (dates.length === 0) {
        // Show last 7 days even if empty
        for (let i = 6; i >= 0; i--) {
          const d = new Date(today);
          d.setDate(d.getDate() - i);
          dates.push(d.toISOString().slice(0, 10));
        }
      }
    } else {
      for (let i = days - 1; i >= 0; i--) {
        const d = new Date(today);
        d.setDate(d.getDate() - i);
        dates.push(d.toISOString().slice(0, 10));
      }
    }

    dates.forEach((dateStr) => {
      const entry = dailySavings[dateStr] || { savedKWh: 0, phoneCharges: 0 };
      const d = new Date(dateStr + "T00:00:00");
      const label = d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
      result.push({
        label,
        fullDate: d.toLocaleDateString("fr-FR", {
          weekday: "short",
          day: "numeric",
          month: "long",
        }),
        value: (entry.savedKWh || 0) * 1000, // Wh
        value2: entry.phoneCharges || 0,
      });
    });

    return result;
  }

  function formatValue(val, unit) {
    if (val >= 1000) {
      return (val / 1000).toFixed(2) + " k" + unit;
    }
    if (val >= 1) {
      return val.toFixed(2);
    }
    return val.toFixed(3);
  }
});
