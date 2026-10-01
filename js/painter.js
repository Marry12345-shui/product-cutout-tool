/* MattePainter —— 画笔修补引擎（纯 JS，无 JSX）
 * 负责：合成显示（原图 × 蒙版）、软边画笔（擦除/恢复）、撤销重做。
 * 画布约定：三块同尺寸 canvas
 *   orig  —— 原图（不透明）
 *   mask  —— 蒙版，只关心 alpha 通道（RGB 恒为白）
 *   view  —— 合成结果（orig 逐像素乘 mask 的 alpha），即页面展示的画布
 */
class MattePainter {
  constructor(origCanvas, maskCanvas, viewCanvas) {
    this.orig = origCanvas;
    this.mask = maskCanvas;
    this.view = viewCanvas;
    this.width = origCanvas.width;
    this.height = origCanvas.height;
    this._raf = 0;
    this._history = [];
    this._future = [];
    this._aiAlpha = null;
    this.onHistoryChange = null;
  }

  _emitHistory() {
    if (this.onHistoryChange) this.onHistoryChange(this._history.length, this._future.length, !!this._aiAlpha);
  }

  /* 用一维 Uint8 alpha 数组设置蒙版（AI 结果或撤销恢复） */
  setAlpha(alpha) {
    const ctx = this.mask.getContext('2d', { willReadFrequently: true });
    const img = ctx.createImageData(this.width, this.height);
    const d = img.data;
    for (let i = 0; i < alpha.length; i++) {
      const o = i * 4;
      d[o] = 255; d[o + 1] = 255; d[o + 2] = 255;
      d[o + 3] = alpha[i];
    }
    ctx.putImageData(img, 0, 0);
    this.compositeNow();
  }

  setAiAlpha(alpha) {
    this._aiAlpha = alpha;
    this._history = [];
    this._future = [];
    this.setAlpha(alpha);
    this._emitHistory();
  }

  getAlpha() {
    const ctx = this.mask.getContext('2d', { willReadFrequently: true });
    const d = ctx.getImageData(0, 0, this.width, this.height).data;
    const out = new Uint8Array(this.width * this.height);
    for (let i = 0; i < out.length; i++) out[i] = d[i * 4 + 3];
    return out;
  }

  /* 把当前蒙版状态压入撤销栈（笔画开始时调用） */
  pushHistory() {
    this._history.push(this.getAlpha());
    if (this._history.length > 12) this._history.shift();
    this._future = [];
    this._emitHistory();
  }

  undo() {
    if (!this._history.length) return false;
    this._future.push(this.getAlpha());
    this.setAlpha(this._history.pop());
    this._emitHistory();
    return true;
  }

  redo() {
    if (!this._future.length) return false;
    this._history.push(this.getAlpha());
    this.setAlpha(this._future.pop());
    this._emitHistory();
    return true;
  }

  /* 丢弃全部修补，回到 AI 刚出来的样子 */
  resetToAi() {
    if (!this._aiAlpha) return false;
    this.pushHistory();
    this.setAlpha(this._aiAlpha);
    return true;
  }

  compositeNow() {
    const ctx = this.view.getContext('2d');
    ctx.save();
    ctx.globalCompositeOperation = 'source-over';
    ctx.clearRect(0, 0, this.width, this.height);
    ctx.drawImage(this.orig, 0, 0);
    ctx.globalCompositeOperation = 'destination-in';
    ctx.drawImage(this.mask, 0, 0);
    ctx.restore();
  }

  markDirty() {
    if (this._raf) return;
    this._raf = requestAnimationFrame(() => {
      this._raf = 0;
      this.compositeNow();
    });
  }

  /* 在 (x,y)（图片坐标）盖一个软边圆形笔触 */
  stamp(x, y, size, mode) {
    const ctx = this.mask.getContext('2d');
    const r = Math.max(1, size / 2);
    const inner = r * 0.55;
    const g = ctx.createRadialGradient(x, y, inner, x, y, r);
    if (mode === 'erase') {
      ctx.globalCompositeOperation = 'destination-out';
    } else {
      ctx.globalCompositeOperation = 'source-over';
    }
    g.addColorStop(0, 'rgba(255,255,255,1)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalCompositeOperation = 'source-over';
  }

  /* 从 (x0,y0) 到 (x1,y1) 连续盖章（图片坐标） */
  strokeSegment(x0, y0, x1, y1, size, mode) {
    const dist = Math.hypot(x1 - x0, y1 - y0);
    const step = Math.max(1, size * 0.12);
    const n = Math.max(1, Math.ceil(dist / step));
    for (let i = 1; i <= n; i++) {
      const t = i / n;
      this.stamp(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, size, mode);
    }
    if (dist === 0) this.stamp(x1, y1, size, mode);
    this.markDirty();
  }
}

window.MattePainter = MattePainter;
