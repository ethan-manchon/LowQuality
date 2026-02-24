// =============================================================================
// EcoTube - Mini Chart Library (no dependencies)
// Dessine un bar chart sur un canvas
// =============================================================================

class EcoChart {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext("2d");
    this.data = [];
    this.colors = {
      bars: "#999",
      barsSecondary: "#555",
      grid: "rgba(255,255,255,0.05)",
      text: "rgba(255,255,255,0.35)",
      tooltip: "#222",
    };
    this.padding = { top: 20, right: 12, bottom: 32, left: 40 };
    this.hoveredIndex = -1;

    this._setupCanvas();
    this._bindEvents();
  }

  _setupCanvas() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.canvas.style.width = rect.width + "px";
    this.canvas.style.height = rect.height + "px";
    this.ctx.scale(dpr, dpr);
    this.width = rect.width;
    this.height = rect.height;
  }

  _bindEvents() {
    this.canvas.addEventListener("mousemove", (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const chartWidth =
        this.width - this.padding.left - this.padding.right;
      const barArea = chartWidth / Math.max(this.data.length, 1);
      const index = Math.floor((x - this.padding.left) / barArea);

      if (index >= 0 && index < this.data.length && index !== this.hoveredIndex) {
        this.hoveredIndex = index;
        this.render();
      } else if (index < 0 || index >= this.data.length) {
        this.hoveredIndex = -1;
        this.render();
      }
    });

    this.canvas.addEventListener("mouseleave", () => {
      this.hoveredIndex = -1;
      this.render();
    });
  }

  setData(data) {
    // data: [{ label, value, value2 }]
    this.data = data;
    this.render();
  }

  render() {
    const ctx = this.ctx;
    const { top, right, bottom, left } = this.padding;
    const w = this.width;
    const h = this.height;
    const chartW = w - left - right;
    const chartH = h - top - bottom;

    ctx.clearRect(0, 0, w, h);

    if (this.data.length === 0) {
      ctx.fillStyle = "rgba(255,255,255,0.2)";
      ctx.font = "12px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText("Pas encore de données", w / 2, h / 2);
      return;
    }

    // Max value
    const maxVal = Math.max(...this.data.map((d) => d.value), 0.001);

    // Grid lines
    const gridLines = 4;
    ctx.strokeStyle = this.colors.grid;
    ctx.lineWidth = 1;
    ctx.font = "10px sans-serif";
    ctx.fillStyle = this.colors.text;
    ctx.textAlign = "right";

    for (let i = 0; i <= gridLines; i++) {
      const y = top + (chartH / gridLines) * i;
      const val = maxVal - (maxVal / gridLines) * i;
      ctx.beginPath();
      ctx.moveTo(left, y);
      ctx.lineTo(w - right, y);
      ctx.stroke();
      ctx.fillText(val.toFixed(1), left - 6, y + 3);
    }

    // Bars
    const barArea = chartW / this.data.length;
    const barWidth = Math.min(barArea * 0.35, 20);
    const gap = 2;

    this.data.forEach((d, i) => {
      const x = left + barArea * i + barArea / 2;
      const barH1 = (d.value / maxVal) * chartH;
      const barH2 = d.value2 ? (d.value2 / maxVal) * chartH : 0;

      // Bar 1 - Wh
      const radius = Math.min(3, barWidth / 2);
      const y1 = top + chartH - barH1;

      ctx.fillStyle =
        this.hoveredIndex === i
          ? "#ccc"
          : this.colors.bars;

      this._roundedRect(ctx, x - barWidth - gap / 2, y1, barWidth, barH1, radius);

      // Bar 2 - Phone charges
      if (d.value2 !== undefined) {
        const y2 = top + chartH - barH2;
        ctx.fillStyle =
          this.hoveredIndex === i
            ? "#888"
            : this.colors.barsSecondary;
        this._roundedRect(ctx, x + gap / 2, y2, barWidth, barH2, radius);
      }

      // Label x-axis
      ctx.fillStyle = this.hoveredIndex === i ? "#fff" : this.colors.text;
      ctx.font = this.data.length > 14 ? "8px sans-serif" : "10px sans-serif";
      ctx.textAlign = "center";
      ctx.fillText(d.label, x, h - bottom + 14);
    });

    // Tooltip
    if (this.hoveredIndex >= 0 && this.hoveredIndex < this.data.length) {
      const d = this.data[this.hoveredIndex];
      const x = left + barArea * this.hoveredIndex + barArea / 2;
      this._drawTooltip(ctx, x, top - 2, d);
    }
  }

  _roundedRect(ctx, x, y, w, h, r) {
    if (h <= 0) return;
    r = Math.min(r, h / 2, w / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h);
    ctx.lineTo(x, y + h);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
    ctx.fill();
  }

  _drawTooltip(ctx, x, y, data) {
    const text1 = `${(data.value).toFixed(2)} Wh`;
    const text2 = data.value2 !== undefined ? `≈ ${data.value2.toFixed(2)} recharges` : "";
    const text3 = data.fullDate || "";

    ctx.font = "bold 11px sans-serif";
    const w1 = ctx.measureText(text1).width;
    ctx.font = "10px sans-serif";
    const w2 = ctx.measureText(text2).width;
    const w3 = ctx.measureText(text3).width;
    const tw = Math.max(w1, w2, w3) + 16;
    const th = text2 ? 48 : 28;

    let tx = x - tw / 2;
    if (tx < 5) tx = 5;
    if (tx + tw > this.width - 5) tx = this.width - tw - 5;

    ctx.fillStyle = this.colors.tooltip;
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 1;
    this._roundedRect(ctx, tx, y, tw, th, 6);
    ctx.stroke();

    ctx.fillStyle = "#e0e0e0";
    ctx.font = "bold 11px sans-serif";
    ctx.textAlign = "left";
    ctx.fillText(text1, tx + 8, y + 16);

    if (text2) {
      ctx.fillStyle = "#888";
      ctx.font = "10px sans-serif";
      ctx.fillText(text2, tx + 8, y + 30);
    }

    if (text3) {
      ctx.fillStyle = "rgba(255,255,255,0.4)";
      ctx.font = "9px sans-serif";
      ctx.fillText(text3, tx + 8, y + 43);
    }
  }
}
