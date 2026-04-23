# 模型文件上传指南

由于模型文件较大（约 300MB），推荐使用 GitHub Releases 方式存储。

## 方案：使用 GitHub Releases（推荐）

### 步骤 1：下载模型文件

从镜像站点下载（国内可访问）：

```bash
# 创建目录
mkdir -p qwen2.5-coder-0.5b
cd qwen2.5-coder-0.5b

# 下载配置文件（小文件）
curl -L -O "https://hf-mirror.com/mlc-ai/Qwen2.5-Coder-0.5B-Instruct-q4f16_1-MLC/resolve/main/mlc-chat-config.json"
curl -L -O "https://hf-mirror.com/mlc-ai/Qwen2.5-Coder-0.5B-Instruct-q4f16_1-MLC/resolve/main/tokenizer.json"
curl -L -O "https://hf-mirror.com/mlc-ai/Qwen2.5-Coder-0.5B-Instruct-q4f16_1-MLC/resolve/main/tokenizer_config.json"
curl -L -O "https://hf-mirror.com/mlc-ai/Qwen2.5-Coder-0.5B-Instruct-q4f16_1-MLC/resolve/main/ndarray-cache.json"

# 下载模型权重（大文件，约 300MB）
curl -L -O "https://hf-mirror.com/mlc-ai/Qwen2.5-Coder-0.5B-Instruct-q4f16_1-MLC/resolve/main/params_shard_0.bin"
curl -L -O "https://hf-mirror.com/mlc-ai/Qwen2.5-Coder-0.5B-Instruct-q4f16_1-MLC/resolve/main/params_shard_1.bin"
curl -L -O "https://hf-mirror.com/mlc-ai/Qwen2.5-Coder-0.5B-Instruct-q4f16_1-MLC/resolve/main/params_shard_2.bin"
curl -L -O "https://hf-mirror.com/mlc-ai/Qwen2.5-Coder-0.5B-Instruct-q4f16_1-MLC/resolve/main/params_shard_3.bin"
```

### 步骤 2：创建 GitHub Release

1. 访问 https://github.com/zzky134/markdown-notebook/releases
2. 点击 "Create a new release"
3. 填写信息：
   - **Choose a tag**: 输入 `v1.0.0-model`，点击 "Create new tag"
   - **Release title**: `Model Files`
   - **Description**: `Qwen2.5-Coder-0.5B model weights for offline AI`
4. 上传文件：
   - 点击 "Attach binaries by dropping them here or selecting them"
   - 选择刚才下载的 8 个文件
   - 等待上传完成
5. 点击 "Publish release"

### 步骤 3：修改配置

编辑 `ai-cards.js`，切换到 Release 地址：

```javascript
const AI_CONFIG = {
    MODEL_ID: 'Qwen2.5-Coder-0.5B-Instruct-q4f16_1-MLC',
    
    // 使用 GitHub Releases
    MODEL_BASE_URL: 'https://github.com/zzky134/markdown-notebook/releases/download/v1.0.0-model',
    
    USE_LOCAL_MODEL: true,
    // ...
};
```

### 步骤 4：提交更改

```bash
git add ai-cards.js
git commit -m "Switch to GitHub Releases for model files"
git push origin main
```

---

## 备选方案：直接放入仓库

如果 Release 方式不方便，也可以直接放入仓库：

### 使用 Git LFS

```bash
# 安装 Git LFS
git lfs install

# 追踪大文件
git lfs track "*.bin"
git lfs track "tokenizer.json"

# 添加文件
git add models/qwen2.5-coder-0.5b/*
git add .gitattributes
git commit -m "Add model files via Git LFS"
git push origin main
```

**注意**：GitHub LFS 免费额度为 1GB/月，公开仓库的下载也会计入配额。

---

## 验证部署

1. 等待 GitHub Pages 部署（1-2 分钟）
2. 访问网页 https://zzky134.github.io/markdown-notebook/
3. 打开开发者工具(F12) → Network 标签
4. 点击"AI 生成卡片"
5. 输入文本，点击生成
6. 检查模型文件是否从 github.com 加载

---

## 文件清单

需要上传的 8 个文件：

| 文件名 | 大小 | 说明 |
|-------|------|------|
| mlc-chat-config.json | ~2 KB | 模型配置 |
| tokenizer.json | ~7 MB | 分词器 |
| tokenizer_config.json | ~1 KB | 分词器配置 |
| ndarray-cache.json | ~20 KB | 权重缓存索引 |
| params_shard_0.bin | ~80 MB | 权重分片 0 |
| params_shard_1.bin | ~80 MB | 权重分片 1 |
| params_shard_2.bin | ~80 MB | 权重分片 2 |
| params_shard_3.bin | ~80 MB | 权重分片 3 |
| **总计** | **~300 MB** | |

---

## 常见问题

### Q: GitHub Releases 有大小限制吗？

A: 单个文件最大 2GB，总大小无限制，非常适合存储模型文件。

### Q: 用户下载模型需要登录 GitHub 吗？

A: 不需要，Release 附件是公开可下载的。

### Q: 可以更新模型版本吗？

A: 可以，创建新的 Release（如 v1.0.1-model），然后更新配置中的版本号。

### Q: 下载速度慢怎么办？

A: GitHub 在国内访问速度一般，如果太慢可以考虑：
1. 使用 Gitee 存储模型文件
2. 使用自己的 CDN
3. 让用户使用代理

---

完成上传后，AI 功能将使用真实的 Qwen2.5 模型，而不是演示模式。
