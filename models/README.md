# 模型文件目录

此目录用于存放 WebLLM 模型权重文件，实现完全离线的 AI 知识卡片生成。

## 目录结构

```
models/
├── README.md                    # 本文件
├── download-model.ps1           # Windows 下载脚本
├── download-model.sh            # Linux/Mac 下载脚本
└── qwen2.5-coder-0.5b/          # 模型子目录
    ├── mlc-chat-config.json     # 模型配置
    ├── tokenizer.json           # 分词器
    ├── tokenizer_config.json    # 分词器配置
    ├── ndarray-cache.json       # 权重缓存索引
    ├── params_shard_0.bin       # 权重分片 0
    ├── params_shard_1.bin       # 权重分片 1
    ├── params_shard_2.bin       # 权重分片 2
    └── params_shard_3.bin       # 权重分片 3
```

## 快速开始

### 方法一：使用下载脚本（推荐）

**Windows:**
```powershell
cd models
.\download-model.ps1
```

**Linux/Mac:**
```bash
cd models
chmod +x download-model.sh
./download-model.sh
```

### 方法二：手动下载

1. 访问 HuggingFace 模型页面：
   - https://huggingface.co/mlc-ai/Qwen2.5-Coder-0.5B-Instruct-q4f16_1-MLC

2. 下载所有文件到 `models/qwen2.5-coder-0.5b/` 目录

3. 或使用镜像加速：
   - https://hf-mirror.com/mlc-ai/Qwen2.5-Coder-0.5B-Instruct-q4f16_1-MLC

## 可用模型

| 模型 | 大小 | 下载命令 |
|-----|------|---------|
| Qwen2.5-Coder-0.5B | ~300MB | 推荐，最轻量 |
| Gemma-2B | ~500MB | 质量更好 |
| Llama-3.2-1B | ~600MB | Meta 官方 |

## Git LFS 配置

由于模型文件较大，必须使用 Git LFS：

```bash
# 安装 Git LFS
# Windows: https://git-lfs.github.com/
# macOS: brew install git-lfs
# Linux: sudo apt-get install git-lfs

# 初始化
git lfs install

# 追踪大文件（已配置在 .gitattributes）
git lfs track "*.bin"
git lfs track "*.wasm"

# 提交
git add .
git commit -m "Add model files"
git push origin main
```

## 配置使用本地模型

修改 `ai-cards.js`：

```javascript
const AI_CONFIG = {
    MODEL_ID: 'Qwen2.5-Coder-0.5B-Instruct-q4f16_1-MLC',
    
    // 改为你的 GitHub Pages 地址
    MODEL_BASE_URL: 'https://your-name.github.io/markdown-notebook/models/qwen2.5-coder-0.5b',
    
    // 启用本地模型
    USE_LOCAL_MODEL: true,
    
    // ... 其他配置
};
```

## 注意事项

1. **文件大小限制**: GitHub LFS 免费额度为 1GB/月
2. **仓库大小限制**: GitHub Pages 限制 1GB
3. **首次加载**: 用户首次访问需要下载完整模型（约 300MB）
4. **缓存**: 模型文件会缓存到浏览器本地存储，后续访问秒开

## 故障排除

### 下载速度慢
使用镜像站点：
- 将 `huggingface.co` 替换为 `hf-mirror.com`

### Git LFS 配额不足
考虑使用 GitHub Releases 存储模型文件

### 模型加载失败
检查浏览器控制台，确认：
1. 文件路径正确
2. CORS 配置正确
3. 文件已正确推送到 GitHub
