# 商品抠图台 · 一键抠图导出素材

给剪辑同事使用的纯前端商品抠图工具：上传商品图 → 一键 AI 自动抠图 → 画笔修补 → 导出透明底 PNG / 白底 JPG。

**所有处理都在浏览器本地完成，图片不会上传到任何服务器。**

## 使用

打开网页即可使用，无需登录、无需安装。

- 上传：拖拽或点击上传商品图（PNG / JPG / WebP）
- 抠图：点「一键抠图」自动识别商品主体并去除背景（首次使用需下载约 84MB 的 AI 模型，之后浏览器缓存、秒开）
- 修补：画笔擦除误留背景 / 恢复误删部分，笔刷大小可调，支持撤销重做
- 预览：透明棋盘格 / 白底一键切换，可对比原图
- 导出：透明背景 PNG 或白底 JPG

## 技术说明

- 纯静态站点（React + Babel 浏览器端编译），无后端、无数据库、无登录
- AI 抠图：ISNet 模型（fp16，88,152,708 字节）+ onnxruntime-web 1.17.0（WASM 推理，单线程）
- 推理配方与 @imgly/background-removal 一致：输入 (px-128)/256、1024×1024

## 目录结构

```
index.html                      页面入口
js/app.jsx                      主应用（上传/抠图/修补/导出流程）
js/painter.js                   画笔修补引擎（合成显示、软边画笔、撤销重做）
js/tweaks-panel.jsx             风格设置面板（强调色/棋盘格/界面密度）
js/worker.js                    AI 推理 worker（模型加载 + ISNet 推理 + 后处理）
assets/sample-product.jpg       内置示例图
assets/vendor/ort/              onnxruntime-web 运行库
assets/vendor/models/           AI 模型（分片存储，见下）
```

## 关于模型分片

`isnet_fp16.onnx.part1` ~ `part4` 是完整模型的 4 个顺序分片（每片约 21MB），
切分原因是代码托管平台的网页上传单文件上限为 25MB。`js/worker.js` 会在运行时
按序下载 4 个分片并拼接成完整模型（拼接结果与原始文件 sha256 一致）。

还原完整模型（如需本地调试）：

```bash
cat assets/vendor/models/isnet_fp16.onnx.part* > isnet_fp16.onnx
```

## 本地运行

需要以 HTTP 方式访问（`file://` 协议下浏览器会拦截脚本加载）：

```bash
cd 本目录
python3 -m http.server 8765
# 浏览器打开 http://localhost:8765
```
