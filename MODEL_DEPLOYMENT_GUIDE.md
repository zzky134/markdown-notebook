# WebLLM 模型本地化部署指南

将 AI 模型权重文件托管在 GitHub 仓库内，通过 GitHub Pages 静态资源加载，实现完全离线、无外部依赖的 AI 知识卡片功能。

---

## 📋 目录

1. [方案概述](#方案概述)
2. [模型文件获取](#模型文件获取)
3. [仓库目录结构](#仓库目录结构)
4. [配置修改](#配置修改)
5. [部署验证](#部署验证)
6. [故障排除](#故障排除)

---

## 方案概述

### 架构图

```
┌─────────────────────────────────────────────────────────────┐
│                     用户浏览器                               │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐     │
│  │  网页应用    │───▶│  WebLLM     │───▶│  GitHub     │     │
│  │  (PWA)      │    │  引擎        │    │  Pages      │     │
│  └─────────────┘    └─────────────┘    └─────────────┘     │
│                              │                              │
│                              ▼                              │
│                       ┌─────────────┐                       │
│                       │  本地模型    │                       │
│                       │  权重文件    │                       │
│                       └─────────────┘                       │
└─────────────────────────────────────────────────────────────┘
```

### 优势

- ✅ 完全离线运行，无需外部 CDN
- ✅ 无网络依赖，国内访问流畅
- ✅ 纯前端实现，无后端成本
- ✅ GitHub Pages 免费托管
- ✅ 模型版本可控，便于管理

---

## 模型文件获取

### 方法一：从 HuggingFace 直接下载（推荐）

#### 步骤 1：确定模型

推荐使用的轻量级模型（按体积排序）：

| 模型 | 体积 | 质量 | 适用场景 |
|-----|------|------|---------|
| Qwen2.5-Coder-0.5B-Instruct-q4f16_1-MLC | ~300MB | ⭐⭐⭐ | 最轻量，推荐首选 |
| gemma-2b-it-q4f16_1-MLC | ~500MB | ⭐⭐⭐⭐ | Google 模型 |
| Llama-3.2-1B-Instruct-q4f16_1-MLC | ~600MB | ⭐⭐⭐⭐ | Meta 模型 |
| Qwen2.5-Coder-1.5B-Instruct-q4f16_1-MLC | ~800MB | ⭐⭐⭐⭐⭐ | 质量更好 |

#### 步骤 2：下载模型文件

以 Qwen2.5-Coder-0.5B 为例：

```bash
# 创建模型目录
mkdir -p models/qwen2.5-coder-0.5b

cd models/qwen2.5-coder-0.5b

# 下载模型权重文件（使用 huggingface-cli 或 wget）
# 方式 1：使用 huggingface-cli（需要安装）
pip install huggingface-hub
huggingface-cli download mlc-ai/Qwen2.5-Coder-0.5B-Instruct-q4f16_1-MLC \
  --local-dir . \
  --local-dir-use-symlinks False

# 方式 2：使用 wget/curl 手动下载
# 基础文件
wget https://huggingface.co/mlc-ai/Qwen2.5-Coder-0.5B-Instruct-q4f16_1-MLC/resolve/main/mlc-chat-config.json
wget https://huggingface.co/mlc-ai/Qwen2.5-Coder-0.5B-Instruct-q4f16_1-MLC/resolve/main/tokenizer.json
wget https://huggingface.co/mlc-ai/Qwen2.5-Coder-0.5B-Instruct-q4f16_1-MLC/resolve/main/tokenizer_config.json
wget https://huggingface.co/mlc-ai/Qwen2.5-Coder-0.5B-Instruct-q4f16_1-MLC/resolve/main/ndarray-cache.json

# 模型分片文件（根据模型大小，可能有 2-10 个分片）
wget https://huggingface.co/mlc-ai/Qwen2.5-Coder-0.5B-Instruct-q4f16_1-MLC/resolve/main/params_shard_0.bin
wget https://huggingface.co/mlc-ai/Qwen2.5-Coder-0.5B-Instruct-q4f16_1-MLC/resolve/main/params_shard_1.bin
wget https://huggingface.co/mlc-ai/Qwen2.5-Coder-0.5B-Instruct-q4f16_1-MLC/resolve/main/params_shard_2.bin
wget https://huggingface.co/mlc-ai/Qwen2.5-Coder-0.5B-Instruct-q4f16_1-MLC/resolve/main/params_shard_3.bin

# WASM 运行时（可选，WebLLM 会自动加载）
# 如果需要完全离线，也需要下载 model_lib.wasm
```

#### 步骤 3：验证文件完整性

```bash
# 检查文件大小
ls -lh

# 应该有以下文件（以 0.5B 模型为例）：
# - mlc-chat-config.json          (~1 KB)
# - tokenizer.json                (~1-5 MB)
# - tokenizer_config.json         (~1 KB)
# - ndarray-cache.json            (~10-50 KB)
# - params_shard_0.bin            (~80 MB)
# - params_shard_1.bin            (~80 MB)
# - params_shard_2.bin            (~80 MB)
# - params_shard_3.bin            (~80 MB)
# 总计约 300-350 MB
```

---

### 方法二：从浏览器缓存导出（已运行过 WebLLM）

如果你之前成功运行过 WebLLM，模型文件已缓存在浏览器中。

#### 步骤 1：定位缓存

**Chrome/Edge:**
1. 打开 `chrome://version/`，查看"个人资料路径"
2. 导航到 `Default/Service Worker/CacheStorage/`
3. 查找与 `huggingface.co` 相关的缓存

**Firefox:**
1. 地址栏输入 `about:cache`
2. 查看磁盘缓存位置

#### 步骤 2：使用开发者工具导出

更简单的方案是使用 Chrome DevTools:

```javascript
// 在控制台执行，复制缓存的模型文件
// 注意：这需要 WebLLM 已经加载过模型

async function exportModelFromCache() {
  const cacheNames = await caches.keys();
  const modelCache = cacheNames.find(name => 
    name.includes('webllm') || name.includes('huggingface')
  );
  
  if (!modelCache) {
    console.log('未找到模型缓存');
    return;
  }
  
  const cache = await caches.open(modelCache);
  const requests = await cache.keys();
  
  console.log('缓存的请求列表:');
  requests.forEach(req => console.log(req.url));
}

exportModelFromCache();
```

#### 步骤 3：使用 Service Worker 拦截下载

在 `ai-cards.js` 中添加临时代码，拦截并导出模型文件：

```javascript
// 临时添加在 initialize 方法中
const originalFetch = window.fetch;
window.fetch = async function(...args) {
  const response = await originalFetch.apply(this, args);
  
  if (args[0].includes('huggingface.co') && args[0].includes('.bin')) {
    console.log('拦截到模型文件:', args[0]);
    // 复制响应以便导出
    const blob = await response.clone().blob();
    // 可以在这里添加下载逻辑
  }
  
  return response;
};
```

---

## 仓库目录结构

### 推荐的目录布局

```
markdown-notebook/              # 仓库根目录
├── index.html                  # 主页面
├── ai-cards.js                 # AI 卡片生成模块
├── models/                     # 模型文件目录
│   └── qwen2.5-coder-0.5b/     # 具体模型目录
│       ├── mlc-chat-config.json
│       ├── tokenizer.json
│       ├── tokenizer_config.json
│       ├── ndarray-cache.json
│       ├── params_shard_0.bin
│       ├── params_shard_1.bin
│       ├── params_shard_2.bin
│       └── params_shard_3.bin
├── .gitattributes              # Git LFS 配置（大文件）
└── MODEL_DEPLOYMENT_GUIDE.md   # 本指南
```

### Git LFS 配置（必需）

由于模型文件较大（300MB+），需要使用 Git LFS：

```bash
# 1. 安装 Git LFS
# Windows: 下载安装包 https://git-lfs.github.com/
# macOS: brew install git-lfs
# Linux: sudo apt-get install git-lfs

# 2. 初始化 Git LFS
git lfs install

# 3. 追踪大文件
git lfs track "*.bin"
git lfs track "*.wasm"
git lfs track "tokenizer.json"

# 4. 提交 .gitattributes
git add .gitattributes
git commit -m "Add Git LFS tracking for model files"
```

### .gitattributes 示例

```gitattributes
# 自动检测文本文件
* text=auto

# 模型权重文件使用 LFS
*.bin filter=lfs diff=lfs merge=lfs -text
*.wasm filter=lfs diff=lfs merge=lfs -text
tokenizer.json filter=lfs diff=lfs merge=lfs -text

# 配置文件保持文本
*.json text eol=lf
*.js text eol=lf
*.html text eol=lf
*.css text eol=lf
*.md text eol=lf
```

---

## 配置修改

### 步骤 1：修改 ai-cards.js

找到 `AI_CONFIG` 配置部分，修改以下关键配置：

```javascript
const AI_CONFIG = {
    // 模型名称
    MODEL_ID: 'Qwen2.5-Coder-0.5B-Instruct-q4f16_1-MLC',

    // ============================================
    // 【关键配置】模型文件基础 URL
    // ============================================
    // 改为你的 GitHub Pages 地址 + 模型路径
    MODEL_BASE_URL: 'https://zzky134.github.io/markdown-notebook/models/qwen2.5-coder-0.5b',
    
    // 启用本地模型模式
    USE_LOCAL_MODEL: true,

    // ... 其他配置保持不变
};
```

### 步骤 2：验证模型记录配置

确保 `createCustomModelRecord` 函数正确构建模型路径：

```javascript
function createCustomModelRecord(baseUrl, modelId) {
    return {
        model: modelId,
        model_id: modelId,
        model_lib: `${baseUrl}/model_lib.wasm`,  // WASM 运行时
        model_url: baseUrl,                       // 模型基础 URL
        tokenizer: `${baseUrl}/tokenizer.json`,   // 分词器
        tokenizer_config: `${baseUrl}/tokenizer_config.json`,
        chat_config: {
            context_window_size: 4096,
            prefill_chunk_size: 1024,
            temperature: AI_CONFIG.GENERATION_CONFIG.temperature,
            top_p: AI_CONFIG.GENERATION_CONFIG.top_p,
        },
    };
}
```

### 步骤 3：可选 - 添加备用模型源

为增强可靠性，可以配置多个模型源：

```javascript
const AI_CONFIG = {
    // 主模型源（本地 GitHub Pages）
    MODEL_BASE_URL: 'https://zzky134.github.io/markdown-notebook/models/qwen2.5-coder-0.5b',
    
    // 备用模型源（镜像站）
    FALLBACK_URLS: [
        'https://hf-mirror.com/mlc-ai/Qwen2.5-Coder-0.5B-Instruct-q4f16_1-MLC/resolve/main',
        'https://huggingface.co/mlc-ai/Qwen2.5-Coder-0.5B-Instruct-q4f16_1-MLC/resolve/main',
    ],
    
    USE_LOCAL_MODEL: true,
};
```

---

## 部署验证

### 步骤 1：本地测试

```bash
# 启动本地服务器测试
python -m http.server 8000

# 访问 http://localhost:8000
# 打开浏览器开发者工具（F12）
# 查看 Console 和 Network 标签
```

### 步骤 2：检查控制台输出

正常加载时应该看到：

```
[Log] WebLLM imported: {CreateMLCEngine: ƒ, ...}
[Log] 使用本地模型模式
[Log] 模型基础URL: https://zzky134.github.io/markdown-notebook/models/qwen2.5-coder-0.5b
[Log] 自定义模型记录: {model: "Qwen2.5-Coder-0.5B-Instruct-q4f16_1-MLC", model_url: "...", ...}
[Log] WebLLM progress: {progress: 0.1, text: "Loading model from cache..."}
...
[Log] WebLLM progress: {progress: 1, text: "Finish loading"}
```

### 步骤 3：验证网络请求

在 Network 标签中检查：

1. ✅ 模型文件请求 URL 应该是你的 GitHub Pages 地址
2. ✅ 请求状态应该是 200 或 304（缓存）
3. ✅ 不应该有来自 huggingface.co 的请求（除非配置了备用源）

### 步骤 4：功能测试

1. 点击"AI 生成卡片"按钮
2. 输入测试文本
3. 点击生成
4. 验证卡片是否正确生成

---

## 故障排除

### 问题 1：模型文件 404 错误

**症状：** Network 标签显示模型文件请求 404

**解决：**
1. 检查 `MODEL_BASE_URL` 是否正确
2. 确认模型文件已推送到 GitHub
3. 确认 GitHub Pages 已重新部署（推送后等待 1-2 分钟）
4. 检查文件路径大小写（Linux 服务器区分大小写）

```javascript
// 在浏览器控制台测试模型文件是否可访问
fetch('https://your-name.github.io/markdown-notebook/models/qwen2.5-coder-0.5b/mlc-chat-config.json')
  .then(r => r.json())
  .then(data => console.log('模型配置:', data))
  .catch(e => console.error('无法加载:', e));
```

### 问题 2：CORS 跨域错误

**症状：** `Access-Control-Allow-Origin` 错误

**解决：**
GitHub Pages 默认支持 CORS，如果出现问题：
1. 检查仓库是否为 Public
2. 尝试添加 `_headers` 文件到仓库根目录：

```
# _headers 文件
/*
  Access-Control-Allow-Origin: *
```

### 问题 3：Git LFS 带宽限制

**症状：** 无法下载模型文件，提示 LFS 配额不足

**解决：**
1. GitHub Free 账户有 1GB/月的 LFS 带宽
2. 对于个人使用足够，但公开分享可能超限
3. 替代方案：使用 GitHub Releases 附件存储模型

```bash
# 使用 GitHub Releases 存储大文件
# 1. 在 GitHub 网页创建 Release
# 2. 上传模型文件作为附件
# 3. 获取附件直链，修改 MODEL_BASE_URL
```

### 问题 4：模型加载超时

**症状：** 模型加载超过 10 分钟仍未完成

**解决：**
1. 检查网络连接
2. 尝试使用备用模型源
3. 减小模型体积（换用更小的模型）
4. 增加超时时间：

```javascript
TIMEOUT: {
    MODEL_LOAD: 1200000,  // 增加到 20 分钟
    GENERATION: 120000
}
```

### 问题 5：浏览器缓存不更新

**症状：** 修改模型后仍加载旧版本

**解决：**
1. 强制刷新：Ctrl + Shift + R
2. 清除浏览器缓存
3. 修改模型文件名或添加版本参数

---

## 高级配置

### 多模型支持

可以配置多个模型供用户选择：

```javascript
const AVAILABLE_MODELS = {
    'qwen-0.5b': {
        name: 'Qwen 0.5B（轻量）',
        url: 'https://zzky134.github.io/markdown-notebook/models/qwen2.5-coder-0.5b',
        size: '300MB',
    },
    'gemma-2b': {
        name: 'Gemma 2B（标准）',
        url: 'https://zzky134.github.io/markdown-notebook/models/gemma-2b',
        size: '500MB',
    },
};
```

### 模型版本管理

在模型目录中添加版本文件：

```bash
models/
├── qwen2.5-coder-0.5b/
│   ├── version.txt          # 版本号
│   ├── mlc-chat-config.json
│   └── ...
└── qwen2.5-coder-0.5b-v2/   # 新版本
    ├── version.txt
    └── ...
```

---

## 总结

### 部署检查清单

- [ ] 下载模型文件（约 300MB）
- [ ] 创建 `models/` 目录并放入文件
- [ ] 配置 Git LFS 追踪大文件
- [ ] 修改 `ai-cards.js` 中的 `MODEL_BASE_URL`
- [ ] 设置 `USE_LOCAL_MODEL: true`
- [ ] 提交并推送所有文件
- [ ] 等待 GitHub Pages 部署（1-2 分钟）
- [ ] 访问网页测试功能
- [ ] 检查浏览器控制台确认加载来源

### 文件大小参考

| 项目 | 大小 |
|-----|------|
| Qwen2.5-Coder-0.5B | ~300 MB |
| Gemma-2B | ~500 MB |
| Llama-3.2-1B | ~600 MB |
| GitHub LFS 免费额度 | 1 GB/月 |
| GitHub Pages 存储限制 | 1 GB/仓库 |

---

如有问题，请检查浏览器控制台日志或提交 Issue。
