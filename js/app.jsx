/* 商品抠图台 —— 主应用（React + Babel）
 * 流程：上传 → AI 抠图（worker）→ 画笔修补 → 导出
 */
const { useTweaks, TweaksPanel, TweakSection, TweakColor, TweakRadio, TweakToggle } = window;
const { useState, useEffect, useRef } = React;

/* ── 内联图标 ─────────────────────────────────── */
const Ico = {
  upload: (p) => (
    <svg width={p.s || 18} height={p.s || 18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 15V4m0 0L7.5 8.5M12 4l4.5 4.5" /><path d="M4 16v3a1 1 0 001 1h14a1 1 0 001-1v-3" />
    </svg>
  ),
  sparkle: (p) => (
    <svg width={p.s || 18} height={p.s || 18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 4l1.7 4.8L18.5 10.5l-4.8 1.7L12 17l-1.7-4.8L5.5 10.5l4.8-1.7L12 4z" /><path d="M18.5 3.5v3M17 5h3" />
    </svg>
  ),
  eraser: (p) => (
    <svg width={p.s || 18} height={p.s || 18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8.5 19.5l-4-4a1.5 1.5 0 010-2.1l8-8a1.5 1.5 0 012.1 0l4.9 4.9a1.5 1.5 0 010 2.1l-7 7H8.5z" /><path d="M6 21h13" /><path d="M9.5 8.5l6.9 6.9" />
    </svg>
  ),
  brush: (p) => (
    <svg width={p.s || 18} height={p.s || 18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M15.5 5.5l3 3L11 16l-3-3 7.5-7.5z" /><path d="M8 13l-2.2 2.2c-.9.9-1.1 2.5-.5 4.3 1.8.6 3.4.4 4.3-.5L12 16" />
    </svg>
  ),
  hand: (p) => (
    <svg width={p.s || 18} height={p.s || 18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3v18M3 12h18M12 3l-2.5 2.5M12 3l2.5 2.5M12 21l-2.5-2.5M12 21l2.5-2.5M3 12l2.5-2.5M3 12l2.5 2.5M21 12l-2.5-2.5M21 12l-2.5 2.5" />
    </svg>
  ),
  zin: (p) => (
    <svg width={p.s || 15} height={p.s || 15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round">
      <circle cx="11" cy="11" r="7" /><path d="M11 8v6M8 11h6M16.5 16.5L21 21" />
    </svg>
  ),
  zout: (p) => (
    <svg width={p.s || 15} height={p.s || 15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round">
      <circle cx="11" cy="11" r="7" /><path d="M8 11h6M16.5 16.5L21 21" />
    </svg>
  ),
  fit: (p) => (
    <svg width={p.s || 15} height={p.s || 15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 4H4v5M15 4h5v5M9 20H4v-5M15 20h5v-5" />
    </svg>
  ),
  undo: (p) => (
    <svg width={p.s || 15} height={p.s || 15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M8 13L3.5 8.5 8 4" /><path d="M3.5 8.5H14a6 6 0 016 6v1" />
    </svg>
  ),
  redo: (p) => (
    <svg width={p.s || 15} height={p.s || 15} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 13l4.5-4.5L16 4" /><path d="M20.5 8.5H10a6 6 0 00-6 6v1" />
    </svg>
  ),
  lock: (p) => (
    <svg width={p.s || 13} height={p.s || 13} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <rect x="5" y="11" width="14" height="9" rx="2" /><path d="M8 11V7a4 4 0 018 0v4" />
    </svg>
  ),
  image: (p) => (
    <svg width={p.s || 18} height={p.s || 18} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3.5" y="4.5" width="17" height="15" rx="2" /><circle cx="9" cy="10" r="1.6" /><path d="M4.5 17.5l4.8-4.8 3.2 3.2 3-3 4 4" />
    </svg>
  ),
  download: (p) => (
    <svg width={p.s || 16} height={p.s || 16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 4v11m0 0l-4-4m4 4l4-4" /><path d="M4 19.5h16" />
    </svg>
  ),
  refresh: (p) => (
    <svg width={p.s || 14} height={p.s || 14} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 12a8 8 0 11-2.3-5.6" /><path d="M20 3.5V8h-4.5" />
    </svg>
  ),
  checker: (p) => (
    <svg width={p.s || 15} height={p.s || 15} viewBox="0 0 24 24" fill="none">
      <rect x="3.5" y="3.5" width="8.5" height="8.5" rx="1.5" fill="currentColor" opacity="0.85" />
      <rect x="12" y="12" width="8.5" height="8.5" rx="1.5" fill="currentColor" opacity="0.85" />
      <rect x="12" y="3.5" width="8.5" height="8.5" rx="1.5" fill="currentColor" opacity="0.25" />
      <rect x="3.5" y="12" width="8.5" height="8.5" rx="1.5" fill="currentColor" opacity="0.25" />
    </svg>
  ),
};

/* ── 工具函数 ─────────────────────────────────── */
function hexToRgba(hex, a) {
  const m = hex.replace('#', '');
  const v = m.length === 3 ? m.split('').map((c) => c + c).join('') : m;
  const n = parseInt(v, 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`;
}

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

const STEP_DEFS = [
  { key: 'upload', label: '上传图片' },
  { key: 'cutout', label: '一键抠图' },
  { key: 'refine', label: '画笔微调' },
  { key: 'export', label: '导出素材' },
];

/* ════════════════════════════════════════════════ */
function App() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULTS);

  const [phase, setPhase] = useState('empty'); // empty | ready | running | refine
  const [runStage, setRunStage] = useState(null); // model | warm | inference
  const [modelProg, setModelProg] = useState(null);
  const [imgInfo, setImgInfo] = useState(null);
  const [hasMask, setHasMask] = useState(false);
  const [tool, setTool] = useState('erase'); // erase | restore | pan
  const [brushSize, setBrushSize] = useState(36);
  const [bgMode, setBgMode] = useState('checker'); // checker | white | black | original
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [hist, setHist] = useState({ undo: false, redo: false });
  const [exportFmt, setExportFmt] = useState('png');
  const [jpgQ, setJpgQ] = useState(92);
  const [status, setStatus] = useState({ kind: 'info', text: '把商品图拖进左边画布区，或点击选择文件开始' });
  const [dragging, setDragging] = useState(false);
  const [exportedOnce, setExportedOnce] = useState(false);

  const viewportRef = useRef(null);
  const stageRef = useRef(null);
  const viewCanvasRef = useRef(null);
  const origViewRef = useRef(null);
  const brushCursorRef = useRef(null);
  const fileInputRef = useRef(null);
  const painterRef = useRef(null);
  const workerRef = useRef(null);
  const blobRef = useRef(null);
  const imgInfoRef = useRef(null);
  const zoomRef = useRef(1);
  const panRef = useRef({ x: 0, y: 0 });
  const spaceRef = useRef(false);
  const strokeRef = useRef(null); // {last:{x,y}}
  const panDragRef = useRef(null); // {startX,startY,panX,panY}
  const hasMaskRef = useRef(false);
  hasMaskRef.current = hasMask;

  zoomRef.current = zoom;
  panRef.current = pan;
  imgInfoRef.current = imgInfo;

  /* ── Tweaks → CSS 变量 ── */
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--accent', t.accent);
    root.style.setProperty('--accent-dim', hexToRgba(t.accent, 0.13));
  }, [t.accent]);
  useEffect(() => {
    const px = { '小': 14, '中': 24, '大': 38 }[t.checkerSize] || 24;
    document.documentElement.style.setProperty('--checker', px + 'px');
  }, [t.checkerSize]);
  useEffect(() => { document.body.classList.toggle('compact', t.density === '紧凑'); }, [t.density]);
  useEffect(() => { document.body.classList.toggle('no-tips', !t.showTips); }, [t.showTips]);

  /* ── Worker（懒创建：首次点「一键抠图」时才建立，避免页面加载期的运行时请求被预览环境拦截） ── */
  async function ensureWorker() {
    if (workerRef.current) return workerRef.current;
    const resp = await fetch('js/worker.js');
    if (!resp.ok) throw new Error('HTTP ' + resp.status);
    const src = await resp.text();
    const workerUrl = new URL('js/worker.js', window.location.href);
    const assetsBase = new URL('../assets/', workerUrl).href;
    const prefix = 'var __ASSETS_BASE__ = ' + JSON.stringify(assetsBase) + ';\n';
    const blobUrl = URL.createObjectURL(new Blob([prefix + src], { type: 'application/javascript' }));
    const w = new Worker(blobUrl);
    w.onmessage = onWorkerMessage;
    w.onerror = () => {
      setPhase(painterRef.current && hasMaskRef.current ? 'refine' : 'ready');
      setRunStage(null); setModelProg(null);
      setStatus({ kind: 'error', text: 'AI 引擎启动失败，请刷新页面重试' });
    };
    workerRef.current = w;
    return w;
  }

  function onWorkerMessage(e) {
    {
      const m = e.data;
      if (m.type === 'stage') setRunStage(m.stage);
      else if (m.type === 'model-progress') setModelProg({ loaded: m.loaded, total: m.total });
      else if (m.type === 'done') {
        painterRef.current.setAiAlpha(new Uint8Array(m.alpha));
        setHasMask(true);
        setPhase('refine');
        setRunStage(null); setModelProg(null);
        setHist({ undo: false, redo: false });
        setStatus({
          kind: 'ok',
          text: '抠图完成！残留的背景用「擦除」涂掉，误删的商品部分用「恢复」涂回来',
        });
      } else if (m.type === 'error') {
        setPhase(painterRef.current && hasMaskRef.current ? 'refine' : 'ready');
        setRunStage(null); setModelProg(null);
        setStatus({ kind: 'error', text: '抠图出错了：' + m.message + '。可以刷新页面重试，或换一张图试试' });
      }
    }
  }

  /* ── 视图：缩放 / 平移 ── */
  function fitView() {
    const vp = viewportRef.current, info = imgInfoRef.current;
    if (!vp || !info) return;
    const z = clamp(Math.min((vp.clientWidth - 80) / info.W, (vp.clientHeight - 80) / info.H, 1), 0.05, 1);
    setZoom(z); setPan({ x: 0, y: 0 });
  }
  function zoomBy(factor, origin) {
    const vp = viewportRef.current;
    if (!vp) return;
    const rect = vp.getBoundingClientRect();
    const cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
    const sx = (origin ? origin.x : cx) - cx, sy = (origin ? origin.y : cy) - cy;
    const oldZ = zoomRef.current;
    const newZ = clamp(oldZ * factor, 0.04, 12);
    if (newZ === oldZ) return;
    const k = newZ / oldZ;
    setZoom(newZ);
    setPan({ x: sx - (sx - panRef.current.x) * k, y: sy - (sy - panRef.current.y) * k });
  }

  /* 非被动 wheel 监听（缩放） */
  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    const onWheel = (e) => {
      e.preventDefault();
      if (!imgInfoRef.current) return;
      zoomBy(Math.exp(-e.deltaY * 0.0016), { x: e.clientX, y: e.clientY });
    };
    vp.addEventListener('wheel', onWheel, { passive: false });
    return () => vp.removeEventListener('wheel', onWheel);
  }, []);

  /* 工具光标样式 */
  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp) return;
    vp.style.cursor = tool === 'pan' ? 'grab' : (hasMask && phase !== 'running') ? 'none' : '';
  }, [tool, hasMask, phase, imgInfo]);

  /* 画布 transform */
  useEffect(() => {
    const st = stageRef.current;
    if (!st) return;
    st.style.transform = `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`;
  }, [pan, zoom, imgInfo]);

  /* ── 图片坐标换算 ── */
  function toImagePoint(e) {
    const vp = viewportRef.current, info = imgInfoRef.current;
    const rect = vp.getBoundingClientRect();
    const cx = rect.left + rect.width / 2, cy = rect.top + rect.height / 2;
    const z = zoomRef.current, p = panRef.current;
    return {
      x: (e.clientX - cx - p.x) / z + info.W / 2,
      y: (e.clientY - cy - p.y) / z + info.H / 2,
    };
  }

  function updateBrushCursor(e) {
    const el = brushCursorRef.current;
    const vp = viewportRef.current;
    if (!el || !vp) return;
    const rect = vp.getBoundingClientRect();
    const d = brushSize * zoomRef.current;
    el.style.display = 'block';
    el.style.width = d + 'px';
    el.style.height = d + 'px';
    el.style.left = (e.clientX - rect.left) + 'px';
    el.style.top = (e.clientY - rect.top) + 'px';
    el.style.borderColor = tool === 'erase' ? '#FF7B72' : 'var(--accent)';
  }

  /* ── 指针交互：画笔 / 平移 ── */
  function onPointerDown(e) {
    const info = imgInfoRef.current;
    if (!info || phase === 'running') return;
    const wantPan = tool === 'pan' || spaceRef.current || e.button === 1;
    if (wantPan) {
      e.preventDefault();
      panDragRef.current = { x: e.clientX, y: e.clientY, panX: panRef.current.x, panY: panRef.current.y };
      viewportRef.current.setPointerCapture(e.pointerId);
      return;
    }
    if (e.button !== 0) return;
    if (!hasMaskRef.current) {
      setStatus({ kind: 'warn', text: '先点右边的「一键抠图」，出结果后就能用画笔修补了' });
      return;
    }
    if (bgMode === 'original') {
      setStatus({ kind: 'warn', text: '现在显示的是原图对比，切回「透明 / 白底」就能继续涂抹' });
      return;
    }
    const pt = toImagePoint(e);
    if (pt.x < -brushSize || pt.y < -brushSize || pt.x > info.W + brushSize || pt.y > info.H + brushSize) return;
    e.preventDefault();
    viewportRef.current.setPointerCapture(e.pointerId);
    painterRef.current.pushHistory();
    painterRef.current.strokeSegment(pt.x, pt.y, pt.x, pt.y, brushSize, tool);
    strokeRef.current = { last: pt };
  }

  function onPointerMove(e) {
    if (panDragRef.current) {
      const d = panDragRef.current;
      setPan({ x: d.panX + (e.clientX - d.x), y: d.panY + (e.clientY - d.y) });
      return;
    }
    if (strokeRef.current) {
      const pt = toImagePoint(e);
      const last = strokeRef.current.last;
      painterRef.current.strokeSegment(last.x, last.y, pt.x, pt.y, brushSize, tool);
      strokeRef.current.last = pt;
    }
    if (hasMaskRef.current && tool !== 'pan' && !spaceRef.current && phase !== 'running' && bgMode !== 'original') {
      updateBrushCursor(e);
    } else if (brushCursorRef.current) {
      brushCursorRef.current.style.display = 'none';
    }
  }

  function endPointer(e) {
    if (panDragRef.current) panDragRef.current = null;
    if (strokeRef.current) {
      strokeRef.current = null;
      const p = painterRef.current;
      setHist({ undo: p._history.length > 0, redo: false });
    }
  }

  /* ── 撤销 / 重做 ── */
  function doUndo() {
    const p = painterRef.current;
    if (!p) return;
    if (p.undo()) setHist({ undo: p._history.length > 0, redo: p._future.length > 0 });
  }
  function doRedo() {
    const p = painterRef.current;
    if (!p) return;
    if (p.redo()) setHist({ undo: p._history.length > 0, redo: p._future.length > 0 });
  }
  function doResetRefine() {
    const p = painterRef.current;
    if (!p || !p._aiAlpha) return;
    p.resetToAi();
    setHist({ undo: p._history.length > 0, redo: false });
    setStatus({ kind: 'ok', text: '已回到 AI 刚抠好的样子' });
  }

  /* ── 快捷键 ── */
  useEffect(() => {
    const isTyping = (el) => el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'SELECT' || el.isContentEditable);
    const onKeyDown = (e) => {
      if (isTyping(e.target)) return;
      const meta = e.ctrlKey || e.metaKey;
      if (meta && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) doRedo(); else doUndo();
        return;
      }
      if (meta && e.key.toLowerCase() === 'y') { e.preventDefault(); doRedo(); return; }
      if (e.code === 'Space') {
        if (!spaceRef.current) { spaceRef.current = true; if (viewportRef.current) viewportRef.current.style.cursor = 'grab'; }
        e.preventDefault();
        return;
      }
      if (!imgInfoRef.current) return;
      const k = e.key.toLowerCase();
      if (k === 'e') setTool('erase');
      else if (k === 'r') setTool('restore');
      else if (k === 'h') setTool('pan');
      else if (k === '[') setBrushSize((s) => clamp(Math.round(s * 0.8), 4, 300));
      else if (k === ']') setBrushSize((s) => clamp(Math.round(s * 1.25) + 1, 4, 300));
      else if (k === '0') fitView();
      else if (k === '1') { setZoom(1); setPan({ x: 0, y: 0 }); }
    };
    const onKeyUp = (e) => {
      if (e.code === 'Space') {
        spaceRef.current = false;
        if (viewportRef.current) viewportRef.current.style.cursor = '';
      }
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  /* 阻止误拖文件打开新页 */
  useEffect(() => {
    const stop = (e) => { e.preventDefault(); };
    window.addEventListener('dragover', stop);
    window.addEventListener('drop', stop);
    return () => {
      window.removeEventListener('dragover', stop);
      window.removeEventListener('drop', stop);
    };
  }, []);

  /* ── 载入图片 ── */
  async function loadBlob(blob, name) {
    let bitmap;
    try {
      bitmap = await createImageBitmap(blob);
    } catch (err) {
      setStatus({ kind: 'error', text: '这张图打不开，请换成 PNG / JPG / WebP 格式的图片' });
      return;
    }
    const CAP = 2600;
    const scale = Math.min(1, CAP / Math.max(bitmap.width, bitmap.height));
    const W = Math.max(1, Math.round(bitmap.width * scale));
    const H = Math.max(1, Math.round(bitmap.height * scale));

    const orig = document.createElement('canvas');
    orig.width = W; orig.height = H;
    const octx = orig.getContext('2d');
    octx.imageSmoothingEnabled = true; octx.imageSmoothingQuality = 'high';
    octx.drawImage(bitmap, 0, 0, W, H);

    const mask = document.createElement('canvas');
    mask.width = W; mask.height = H;
    const mctx = mask.getContext('2d', { willReadFrequently: true });
    mctx.fillStyle = '#fff';
    mctx.fillRect(0, 0, W, H);

    const view = viewCanvasRef.current;
    view.width = W; view.height = H;
    const origView = origViewRef.current;
    origView.width = W; origView.height = H;
    origView.getContext('2d').drawImage(orig, 0, 0);

    const painter = new MattePainter(orig, mask, view);
    painter.compositeNow();
    painterRef.current = painter;

    blobRef.current = blob;
    setImgInfo({ name, W, H, origW: bitmap.width, origH: bitmap.height, scaled: scale < 1 });
    setHasMask(false); setExportedOnce(false);
    setHist({ undo: false, redo: false });
    setPhase('ready');
    setBgMode('checker');
    setTool('erase');
    bitmap.close();
    setStatus({
      kind: 'ok',
      text: scale < 1
        ? `图片已就位（太大已自动缩到 ${W}×${H}）。点右侧「一键抠图」开始`
        : '图片已就位。点右侧「一键抠图」，AI 会自动把商品抠出来',
    });
    /* 直接用局部尺寸适配视图（避免早于重渲染的竞态） */
    const vp = viewportRef.current;
    if (vp) {
      const z = clamp(Math.min((vp.clientWidth - 80) / W, (vp.clientHeight - 80) / H, 1), 0.05, 1);
      setZoom(z); setPan({ x: 0, y: 0 });
    }
  }

  async function loadFile(file) {
    if (!file) return;
    if (!/^image\/(png|jpe?g|webp|bmp)$/i.test(file.type) && !/\.(png|jpe?g|webp|bmp)$/i.test(file.name)) {
      setStatus({ kind: 'error', text: '暂时只支持 PNG / JPG / WebP 格式，请换个文件' });
      return;
    }
    await loadBlob(file, file.name);
  }

  async function loadSample() {
    try {
      const resp = await fetch('assets/sample-product.jpg');
      if (!resp.ok) throw new Error('HTTP ' + resp.status);
      const blob = await resp.blob();
      await loadBlob(blob, '示例-蓝牙耳机.jpg');
    } catch (err) {
      setStatus({ kind: 'error', text: '示例图加载失败，请直接上传你自己的图片' });
    }
  }

  function onDrop(e) {
    e.preventDefault(); setDragging(false);
    const f = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    if (f && phase !== 'running') loadFile(f);
  }

  /* ── AI 抠图 ── */
  async function runAI() {
    if (!imgInfoRef.current || phase === 'running') return;
    setPhase('running');
    setRunStage('model');
    setModelProg(null);
    try {
      const w = await ensureWorker();
      w.postMessage({
        type: 'run',
        blob: blobRef.current,
        width: imgInfoRef.current.W,
        height: imgInfoRef.current.H,
      });
    } catch (err) {
      setPhase('ready');
      setRunStage(null); setModelProg(null);
      setStatus({ kind: 'error', text: 'AI 引擎加载失败，请刷新页面重试' });
    }
  }

  /* ── 导出 ── */
  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }

  function doExport() {
    const info = imgInfoRef.current;
    if (!info || !hasMaskRef.current) return;
    const painter = painterRef.current;
    painter.compositeNow();
    const view = viewCanvasRef.current;
    const base = (info.name.replace(/\.[^.]+$/, '') || '商品图').slice(0, 60);
    const done = () => {
      setExportedOnce(true);
      setStatus({ kind: 'ok', text: `导出完成！文件已保存到「下载」文件夹（${info.W}×${info.H}）` });
    };
    if (exportFmt === 'png') {
      view.toBlob((b) => { downloadBlob(b, base + '-透明底.png'); done(); }, 'image/png');
    } else {
      const c = document.createElement('canvas');
      c.width = info.W; c.height = info.H;
      const ctx = c.getContext('2d');
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, info.W, info.H);
      ctx.drawImage(view, 0, 0);
      c.toBlob((b) => { downloadBlob(b, base + '-白底.jpg'); done(); }, 'image/jpeg', jpgQ / 100);
    }
  }

  /* ── 派生状态 ── */
  const stepState = (key) => {
    if (key === 'upload') return imgInfo ? 'done' : 'current';
    if (key === 'cutout') return hasMask ? 'done' : (imgInfo ? 'current' : 'todo');
    if (key === 'refine') return exportedOnce ? 'done' : (hasMask ? 'current' : 'todo');
    return exportedOnce ? 'current' : 'todo';
  };

  const vpClass = bgMode === 'white' ? 'under-white' : bgMode === 'black' ? 'under-black' : bgMode === 'original' ? 'under-original' : '';
  const underlayClass = bgMode === 'checker' ? 'stage-underlay checker-bg' : 'stage-underlay';
  const underlayStyle = bgMode === 'white' ? { background: '#E9EAEC' } : bgMode === 'black' ? { background: '#101114' } : {};

  const busyCopy = {
    model: {
      title: '正在下载 AI 模型（只有第一次需要）',
      note: '模型文件约 84MB，下载完会缓存在浏览器里，下次打开秒进。你的图片始终只在这台电脑上处理，不会上传到任何服务器。',
      indeterminate: false,
    },
    warm: {
      title: '模型下载完成，正在启动 AI 引擎…',
      note: '第一次启动需要几秒钟，请稍等。',
      indeterminate: true,
    },
    inference: {
      title: 'AI 正在识别商品主体…',
      note: '大约需要几秒到十几秒，取决于电脑性能。不用做任何操作，稍等一下就好。',
      indeterminate: true,
    },
  }[runStage] || null;

  const metaRight = [];
  if (imgInfo) {
    metaRight.push(imgInfo.scaled ? `${imgInfo.W}×${imgInfo.H}（原 ${imgInfo.origW}×${imgInfo.origH}）` : `${imgInfo.W}×${imgInfo.H}`);
    metaRight.push(Math.round(zoom * 100) + '%');
    if (hasMask) metaRight.push('画笔 ' + brushSize + 'px');
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* ── 顶栏 ── */}
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark"></div>
          <div>
            <div className="brand-name">商品抠图台</div>
            <div className="brand-tag">MATTE BENCH · 剪辑素材组</div>
          </div>
        </div>
        <nav className="steps" aria-label="操作步骤">
          {STEP_DEFS.map((s, i) => (
            <React.Fragment key={s.key}>
              {i > 0 && <div className="step-connector"></div>}
              <div className={'step ' + stepState(s.key)}>
                <div className="step-num">{stepState(s.key) === 'done' ? '✓' : i + 1}</div>
                <div className="step-label">{s.label}</div>
              </div>
            </React.Fragment>
          ))}
        </nav>
        <div className="privacy-chip">
          <Ico.lock />
          图片只在本机处理，不上传
        </div>
      </header>

      {/* ── 主区域 ── */}
      <div className="main">
        {/* 画布视口 */}
        <div
          className={'viewport ' + vpClass}
          ref={viewportRef}
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={endPointer}
          onPointerCancel={endPointer}
          onPointerLeave={() => { if (brushCursorRef.current) brushCursorRef.current.style.display = 'none'; }}
        >
          <div className="vp-corner tl"></div>
          <div className="vp-corner tr"></div>
          <div className="vp-corner bl"></div>
          <div className="vp-corner br"></div>

          {imgInfo && (
            <div className="zoombar" role="toolbar" aria-label="缩放控制">
              <button className="icon-btn" title="缩小" aria-label="缩小" onClick={() => zoomBy(1 / 1.25)}>
                <Ico.zout />
              </button>
              <button className="zoom-readout" title="点击回到 100%" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }); }}>
                {Math.round(zoom * 100)}%
              </button>
              <button className="icon-btn" title="放大" aria-label="放大" onClick={() => zoomBy(1.25)}>
                <Ico.zin />
              </button>
              <div className="zoombar-divider"></div>
              <button className="icon-btn" title="适应窗口" aria-label="适应窗口" onClick={fitView}>
                <Ico.fit />
              </button>
            </div>
          )}

          <div
            className="stage"
            ref={stageRef}
            style={{
              width: imgInfo ? imgInfo.W : 1,
              height: imgInfo ? imgInfo.H : 1,
              marginLeft: -(imgInfo ? imgInfo.W : 1) / 2,
              marginTop: -(imgInfo ? imgInfo.H : 1) / 2,
              left: '50%', top: '50%', position: 'absolute',
              display: imgInfo ? 'block' : 'none',
            }}
          >
            <div className={underlayClass} style={underlayStyle}></div>
            <canvas ref={origViewRef} style={{ opacity: bgMode === 'original' ? 1 : 0 }}></canvas>
            <canvas ref={viewCanvasRef} style={{ opacity: bgMode === 'original' ? 0 : 1 }}></canvas>
          </div>

          <div className="brush-cursor" ref={brushCursorRef}></div>

          {/* 空态：上传 */}
          {!imgInfo && (
            <div className={'dropzone' + (dragging ? ' dragging' : '')}>
              <div
                className="drop-card"
                role="button"
                tabIndex={0}
                aria-label="上传商品图"
                onClick={() => fileInputRef.current && fileInputRef.current.click()}
                onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') fileInputRef.current.click(); }}
              >
                <div className="drop-icon"><Ico.upload s={34} /></div>
                <div className="drop-title">把商品图拖到这里</div>
                <div className="drop-sub">或者点击这个区域，从电脑里选择一张</div>
                <div className="drop-formats">PNG · JPG · WEBP · 单张</div>
                <button
                  className="drop-sample"
                  onClick={(e) => { e.stopPropagation(); loadSample(); }}
                >
                  <Ico.image s={14} />
                  没有素材？试试示例图
                </button>
                <div className="drop-privacy">
                  <Ico.lock s={12} />
                  所有处理都在浏览器里完成，图片不会上传到任何服务器
                </div>
              </div>
            </div>
          )}

          {/* 处理中遮罩 */}
          {phase === 'running' && busyCopy && (
            <div className="busy-overlay">
              <div className="busy-card">
                <div className="busy-title">
                  <div className="busy-spinner"></div>
                  {busyCopy.title}
                </div>
                <div className="progress">
                  <div className={'progress-fill' + (busyCopy.indeterminate ? ' indeterminate' : '')}
                    style={busyCopy.indeterminate ? {} : { width: modelProg ? Math.min(100, (modelProg.loaded / modelProg.total) * 100) + '%' : '0%' }}>
                  </div>
                </div>
                {modelProg && !busyCopy.indeterminate && (
                  <div className="busy-meta">
                    <span>{(modelProg.loaded / 1048576).toFixed(1)} MB / {(modelProg.total / 1048576).toFixed(1)} MB</span>
                    <span>{Math.min(100, Math.round((modelProg.loaded / modelProg.total) * 100))}%</span>
                  </div>
                )}
                <div className="busy-note">{busyCopy.note}</div>
              </div>
            </div>
          )}
        </div>

        {/* ── 右侧操作面板 ── */}
        <aside className="panel">
          {/* 01 自动抠图 */}
          <section className={'sec' + (!imgInfo || phase === 'running' ? ' sec-locked' : '')}>
            <div className="sec-head">
              <span className="sec-num">01</span>
              <span className="sec-title">自动抠图</span>
              <span className="sec-num" style={{ marginLeft: 'auto' }}>AI</span>
            </div>
            <button className="btn-primary" onClick={runAI} disabled={!imgInfo || phase === 'running'}>
              <Ico.sparkle s={17} />
              {hasMask ? '重新抠一次' : '一键抠图'}
            </button>
            <div className="sec-note">
              {hasMask
                ? '对效果不满意可以再跑一次，会覆盖当前的修补结果。'
                : 'AI 会在本机识别商品主体并去掉背景，图片不出浏览器。'}
            </div>
            {imgInfo && (
              <div className="file-card">
                <div className="file-name" title={imgInfo.name}>{imgInfo.name}</div>
                <div className="file-meta">
                  <span>{imgInfo.W}×{imgInfo.H}</span>
                  {imgInfo.scaled && <span>已缩放</span>}
                  <span>{hasMask ? '已抠图' : '待抠图'}</span>
                </div>
              </div>
            )}
            {imgInfo && (
              <button className="btn-ghost" style={{ height: 32, fontSize: 12 }} onClick={() => fileInputRef.current.click()}>
                <Ico.upload s={13} />
                换一张图
              </button>
            )}
          </section>

          {/* 02 画笔修补 */}
          <section className={'sec' + (!hasMask ? ' sec-locked' : '')}>
            <div className="sec-head">
              <span className="sec-num">02</span>
              <span className="sec-title">画笔修补</span>
              <span className="sec-num" style={{ marginLeft: 'auto' }}>BRUSH</span>
            </div>
            <div className="tool-grid">
              <button
                className={'tool-btn' + (tool === 'erase' ? ' active-erase' : '')}
                onClick={() => setTool('erase')}
                disabled={!hasMask}
              >
                <span className="tool-ico"><Ico.eraser s={17} /></span>
                <span className="tool-name">擦除</span>
                <span className="tool-sub">涂掉残留的背景</span>
              </button>
              <button
                className={'tool-btn' + (tool === 'restore' ? ' active-restore' : '')}
                onClick={() => setTool('restore')}
                disabled={!hasMask}
              >
                <span className="tool-ico"><Ico.brush s={17} /></span>
                <span className="tool-name">恢复</span>
                <span className="tool-sub">找回误删的商品</span>
              </button>
            </div>
            <div className="tool-grid" style={{ gridTemplateColumns: '1fr 1fr 1fr' }}>
              <button className="tool-btn" style={{ alignItems: 'center' }} onClick={() => setTool('pan')} disabled={!hasMask}>
                <span className="tool-ico"><Ico.hand s={16} /></span>
                <span className="tool-name" style={{ fontSize: 12 }}>抓手</span>
              </button>
              <button className="tool-btn" style={{ alignItems: 'center' }} onClick={doResetRefine} disabled={!hist.undo}>
                <span className="tool-ico"><Ico.refresh /></span>
                <span className="tool-name" style={{ fontSize: 12 }}>重置修补</span>
              </button>
            </div>
            <div className="slider-block">
              <div className="slider-label-row">
                <span className="slider-name">画笔大小</span>
                <span className="slider-value">{brushSize} px</span>
              </div>
              <input
                type="range" min={4} max={300} step={1} value={brushSize}
                onChange={(e) => setBrushSize(+e.target.value)}
                disabled={!hasMask}
                aria-label="画笔大小"
              />
            </div>
            <div className="btn-row">
              <button className="btn btn-ghost" onClick={doUndo} disabled={!hist.undo}>
                <Ico.undo /> 撤销
              </button>
              <button className="btn btn-ghost" onClick={doRedo} disabled={!hist.redo}>
                <Ico.redo /> 重做
              </button>
            </div>
            <div className="hint-box">
              按 <span className="kbd">E</span> 擦除 · <span className="kbd">R</span> 恢复 ·
              <span className="kbd">[</span> <span className="kbd">]</span> 调画笔 ·
              按住 <span className="kbd">空格</span> 拖动画面 · 滚轮缩放
            </div>
          </section>

          {/* 背景预览 */}
          <section className={'sec' + (!imgInfo ? ' sec-locked' : '')}>
            <div className="sec-head">
              <span className="sec-num">◎</span>
              <span className="sec-title">背景预览</span>
              <span className="sec-num" style={{ marginLeft: 'auto' }}>VIEW</span>
            </div>
            <div className="seg">
              <button className={'seg-btn' + (bgMode === 'checker' ? ' active' : '')} onClick={() => setBgMode('checker')} disabled={!imgInfo} title="透明背景（棋盘格）">
                <Ico.checker s={13} /> 透明
              </button>
              <button className={'seg-btn' + (bgMode === 'white' ? ' active' : '')} onClick={() => setBgMode('white')} disabled={!imgInfo} title="白色背景">白底</button>
              <button className={'seg-btn' + (bgMode === 'black' ? ' active' : '')} onClick={() => setBgMode('black')} disabled={!imgInfo} title="黑色背景">黑底</button>
              <button className={'seg-btn' + (bgMode === 'original' ? ' active' : '')} onClick={() => setBgMode('original')} disabled={!imgInfo} title="查看原图">原图</button>
            </div>
            <div className="sec-note">「原图」用来和抠图结果对比；导出白底商品图前建议用「白底」检查一遍边缘。</div>
          </section>

          {/* 03 导出 */}
          <section className={'sec' + (!hasMask ? ' sec-locked' : '')}>
            <div className="sec-head">
              <span className="sec-num">03</span>
              <span className="sec-title">导出素材</span>
              <span className="sec-num" style={{ marginLeft: 'auto' }}>SAVE</span>
            </div>
            <div className="tool-grid">
              <button className={'tool-btn' + (exportFmt === 'png' ? ' active-restore' : '')} onClick={() => setExportFmt('png')} disabled={!hasMask}>
                <span className="tool-ico"><Ico.checker s={16} /></span>
                <span className="tool-name">PNG 透明底</span>
                <span className="tool-sub">适合进剪辑 / 合成</span>
              </button>
              <button className={'tool-btn' + (exportFmt === 'jpg' ? ' active-restore' : '')} onClick={() => setExportFmt('jpg')} disabled={!hasMask}>
                <span className="tool-ico"><Ico.image s={16} /></span>
                <span className="tool-name">JPG 白底</span>
                <span className="tool-sub">适合上架 / 传图</span>
              </button>
            </div>
            {exportFmt === 'jpg' && (
              <div className="slider-block">
                <div className="slider-label-row">
                  <span className="slider-name">画质</span>
                  <span className="slider-value">{jpgQ}</span>
                </div>
                <input type="range" min={60} max={100} step={1} value={jpgQ}
                  onChange={(e) => setJpgQ(+e.target.value)} aria-label="JPG 画质" />
              </div>
            )}
            <button className="btn-primary" onClick={doExport} disabled={!hasMask}>
              <Ico.download />
              导出 {exportFmt === 'png' ? '透明底 PNG' : '白底 JPG'}
            </button>
            {imgInfo && (
              <div className="sec-note">输出尺寸 {imgInfo.W}×{imgInfo.H}，文件会保存到浏览器的「下载」文件夹。</div>
            )}
          </section>
        </aside>
      </div>

      {/* ── 底部状态栏 ── */}
      <footer className="statusbar">
        <div className={'status-dot ' + (phase === 'running' ? 'busy' : status.kind === 'ok' ? 'ok' : status.kind === 'warn' ? 'warn' : status.kind === 'error' ? 'error' : '')}></div>
        <div className="status-text">
          {phase === 'running'
            ? (busyCopy ? busyCopy.title : '处理中…')
            : status.text}
        </div>
        <div className="status-meta">
          {metaRight.map((m, i) => <span key={i}>{m}</span>)}
        </div>
      </footer>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/bmp"
        style={{ display: 'none' }}
        onChange={(e) => {
          const f = e.target.files && e.target.files[0];
          if (f && phase !== 'running') loadFile(f);
          e.target.value = '';
        }}
      />

      {/* ── 风格微调 ── */}
      <TweaksPanel>
        <TweakSection label="界面" />
        <TweakColor label="强调色" value={t.accent}
          options={['#3FCE85', '#E8A33D', '#4AA8D8']}
          onChange={(v) => setTweak('accent', v)} />
        <TweakRadio label="棋盘格大小" value={t.checkerSize}
          options={['小', '中', '大']}
          onChange={(v) => setTweak('checkerSize', v)} />
        <TweakRadio label="信息密度" value={t.density}
          options={['紧凑', '标准']}
          onChange={(v) => setTweak('density', v)} />
        <TweakToggle label="显示操作提示" value={t.showTips}
          onChange={(v) => setTweak('showTips', v)} />
      </TweaksPanel>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById('root')).render(<App />);
