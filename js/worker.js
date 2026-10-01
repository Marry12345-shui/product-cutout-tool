/* AI 抠图 worker —— 在后台线程加载本地模型并推理，主线程保持流畅。
 * 资源全部来自本项目本地文件，图片与模型都不经过任何外部服务器。
 * 推理配方与 @imgly/background-removal 一致：ISNet、输入 (px-128)/256、1024×1024。
 */
(function () {
  'use strict';

  /* __ASSETS_BASE__ 由主线程创建 Blob Worker 时注入（绝对路径）；
   * 直接以文件方式运行时回退到基于自身 URL 的推导。 */
  var ASSETS_BASE = (typeof __ASSETS_BASE__ !== 'undefined' && __ASSETS_BASE__)
    || new URL('../assets/', self.location.href).href;
  var ORT_URL = ASSETS_BASE + 'vendor/ort/ort.min.js';
  var ORT_DIR = ASSETS_BASE + 'vendor/ort/';

  /* 模型体积超过代码托管平台的单文件上传上限（25MB），按顺序切成了 4 个分片，
   * 下载后按序拼接即为完整模型文件（sha256 校验过一致性）。 */
  var MODEL_CHUNKS = [1, 2, 3, 4].map(function (i) {
    return ASSETS_BASE + 'vendor/models/isnet_fp16.onnx.part' + i;
  });
  var MODEL_TOTAL = 88152708;

  importScripts(ORT_URL);
  ort.env.wasm.wasmPaths = ORT_DIR;
  ort.env.wasm.numThreads = 1; // 无跨域隔离头时不依赖多线程，稳妥优先

  var session = null;
  var RES = 1024;

  function post(msg, transfer) {
    if (transfer) self.postMessage(msg, transfer);
    else self.postMessage(msg);
  }

  /* 流式下载单个分片，base 为该分片之前已累计的字节数（用于汇报总进度） */
  function fetchChunk(url, base) {
    return fetch(url).then(function (resp) {
      if (!resp.ok) throw new Error('模型分片读取失败（' + resp.status + '）');
      if (!resp.body) {
        return resp.arrayBuffer().then(function (b) {
          return new Uint8Array(b);
        });
      }
      var reader = resp.body.getReader();
      var parts = [];
      var loaded = 0;
      function pump() {
        return reader.read().then(function (r) {
          if (r.done) return null;
          parts.push(r.value);
          loaded += r.value.length;
          post({ type: 'model-progress', loaded: base + loaded, total: MODEL_TOTAL });
          return pump();
        });
      }
      return pump().then(function () {
        var buf = new Uint8Array(loaded);
        var off = 0;
        for (var i = 0; i < parts.length; i++) {
          buf.set(parts[i], off);
          off += parts[i].length;
        }
        return buf;
      });
    });
  }

  /* 顺序下载全部分片并拼接为完整模型（浏览器会缓存，通常只需下载一次） */
  function fetchModel() {
    var chunks = [];
    var base = 0;
    function next(i) {
      if (i >= MODEL_CHUNKS.length) return Promise.resolve(chunks);
      return fetchChunk(MODEL_CHUNKS[i], base).then(function (c) {
        base += c.length;
        chunks.push(c);
        return next(i + 1);
      });
    }
    return next(0).then(function (cs) {
      var total = 0;
      for (var i = 0; i < cs.length; i++) total += cs[i].length;
      var buf = new Uint8Array(total);
      var off = 0;
      for (var j = 0; j < cs.length; j++) {
        buf.set(cs[j], off);
        off += cs[j].length;
      }
      return buf;
    });
  }

  function ensureSession() {
    if (session) return Promise.resolve(session);
    post({ type: 'stage', stage: 'model' });
    return fetchModel().then(function (bytes) {
      post({ type: 'stage', stage: 'warm' });
      return ort.InferenceSession.create(bytes, { executionProviders: ['wasm'] });
    }).then(function (s) {
      session = s;
      return s;
    });
  }

  /* 连通域过滤：去掉背景里零散的高响应噪点，保留所有像样的主体块 */
  function despeckle(mask) {
    var n = RES * RES;
    var labels = new Int32Array(n); // 0=未访问, >0 组件号
    var areas = [0];
    var queue = new Int32Array(n);
    var comp = 0;
    for (var start = 0; start < n; start++) {
      if (labels[start] !== 0 || mask[start] <= 0.5) continue;
      comp++;
      var head = 0, tail = 0;
      queue[tail++] = start;
      labels[start] = comp;
      var area = 0;
      while (head < tail) {
        var p = queue[head++];
        area++;
        var x = p % RES, y = (p / RES) | 0;
        if (x > 0 && labels[p - 1] === 0 && mask[p - 1] > 0.5) { labels[p - 1] = comp; queue[tail++] = p - 1; }
        if (x < RES - 1 && labels[p + 1] === 0 && mask[p + 1] > 0.5) { labels[p + 1] = comp; queue[tail++] = p + 1; }
        if (y > 0 && labels[p - RES] === 0 && mask[p - RES] > 0.5) { labels[p - RES] = comp; queue[tail++] = p - RES; }
        if (y < RES - 1 && labels[p + RES] === 0 && mask[p + RES] > 0.5) { labels[p + RES] = comp; queue[tail++] = p + RES; }
      }
      areas.push(area);
    }
    if (!comp) return;
    // 保留：面积足够大（≥2000px）或达到最大组件的 2%
    var largest = 0;
    for (var a = 1; a < areas.length; a++) if (areas[a] > largest) largest = areas[a];
    var keepMin = Math.max(2000, largest * 0.02);
    for (var i = 0; i < n; i++) {
      var l = labels[i];
      if (l > 0 && areas[l] < keepMin) mask[i] = 0;
    }
  }

  /* 平滑阈值曲线：压掉阴影/背景的弱响应，让边缘干脆 */
  function curveAlpha(v) {
    if (v <= 0.5) return 0;
    if (v >= 0.78) return 1;
    var t = (v - 0.5) / 0.28;
    return t * t * (3 - 2 * t);
  }

  function runInference(blob, W, H) {
    return createImageBitmap(blob).then(function (bitmap) {
      var inC = new OffscreenCanvas(RES, RES);
      var ictx = inC.getContext('2d', { willReadFrequently: true });
      ictx.imageSmoothingEnabled = true;
      ictx.imageSmoothingQuality = 'high';
      ictx.drawImage(bitmap, 0, 0, RES, RES);
      var d = ictx.getImageData(0, 0, RES, RES).data;
      bitmap.close();

      var stride = RES * RES;
      var f32 = new Float32Array(3 * stride);
      for (var i = 0, j = 0; i < d.length; i += 4, j += 1) {
        f32[j] = (d[i] - 128) / 256;
        f32[j + stride] = (d[i + 1] - 128) / 256;
        f32[j + stride + stride] = (d[i + 2] - 128) / 256;
      }

      post({ type: 'stage', stage: 'inference' });
      var input = new ort.Tensor('float32', f32, [1, 3, RES, RES]);
      return session.run({ input: input }).then(function (out) {
        var mask = out.output.data;

        despeckle(mask);

        // 蒙版 → 1024 画布（白色 + alpha）→ 双线性放大回原尺寸
        var mC = new OffscreenCanvas(RES, RES);
        var mctx = mC.getContext('2d', { willReadFrequently: true });
        var img = mctx.createImageData(RES, RES);
        var dd = img.data;
        for (var k = 0; k < stride; k++) {
          var o = k * 4;
          dd[o] = 255; dd[o + 1] = 255; dd[o + 2] = 255;
          dd[o + 3] = Math.round(curveAlpha(mask[k]) * 255);
        }
        mctx.putImageData(img, 0, 0);

        var oC = new OffscreenCanvas(W, H);
        var octx = oC.getContext('2d', { willReadFrequently: true });
        octx.imageSmoothingEnabled = true;
        octx.imageSmoothingQuality = 'high';
        octx.drawImage(mC, 0, 0, W, H);
        var outData = octx.getImageData(0, 0, W, H).data;
        var alpha = new Uint8Array(W * H);
        for (var m = 0; m < alpha.length; m++) alpha[m] = outData[m * 4 + 3];
        return alpha;
      });
    });
  }

  self.onmessage = function (e) {
    var data = e.data;
    if (!data || data.type !== 'run') return;
    ensureSession()
      .then(function () { return runInference(data.blob, data.width, data.height); })
      .then(function (alpha) {
        post({ type: 'done', alpha: alpha.buffer, width: data.width, height: data.height }, [alpha.buffer]);
      })
      .catch(function (err) {
        post({ type: 'error', message: (err && err.message) ? err.message : String(err) });
      });
  };
})();
