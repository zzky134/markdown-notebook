# WebLLM 本地模型部署 - 快速开始

## 5 分钟快速部署指南

### 步骤 1：下载模型文件（2分钟）

**Windows:**
```powershell
cd models
.\download-model.ps1
# 选择选项 1 (Qwen2.5-Coder-0.5B, ~300MB)
```

**Linux/Mac:**
```bash
cd models
chmod +x download-model.sh
./download-model.sh
# 选择选项 1
```

### 步骤 2：配置 Git LFS（1分钟）

```bash
# 安装 Git LFS（如果未安装）
# 下载: https://git-lfs.github.com/

# 初始化
git lfs install

# 追踪大文件
git lfs track "*.bin"
git lfs track "tokenizer.json"
```

### 步骤 3：修改配置（1分钟）

编辑 `ai-cards.js`，修改以下配置：

```javascript
const AI_CONFIG = {
    MODEL_ID: 'Qwen2.5-Coder-0.5B-Instruct-q4f16_1-MLC',
    
    // 修改为你的 GitHub Pages 地址
    MODEL_BASE_URL: 'https://zzky134.github.io/markdown-notebook/models/qwen2.5-coder-0.5b',
    
    // 启用本地模型
    USE_LOCAL_MODEL: true,
    
    // ... 其他配置保持不变
};
```

### 步骤 4：提交并部署（1分钟）

```bash
# 添加所有文件
git add .

# 提交
git commit -m "Add local model deployment"

# 推送
git push origin main
```

### 步骤 5：验证部署

1. 等待 1-2 分钟让 GitHub Pages 部署
2. 访问: `https://zzky134.github.io/markdown-notebook/`
3. 点击"AI 生成卡片"按钮
4. 输入测试文本，点击生成
5. 打开浏览器开发者工具(F12) → Network 标签
6. 确认模型文件从 `github.io` 域名加载

---

## 目录结构

```
markdown-notebook/
├── index.html                  # 主页面
├── ai-cards.js                 # AI 模块（已配置）
├── models/
│   ├── download-model.ps1      # Windows 下载脚本
│   ├── download-model.sh       # Linux/Mac 下载脚本
│   └── qwen2.5-coder-0.5b/     # 模型文件（下载后）
│       ├── mlc-chat-config.json
│       ├── tokenizer.json
│       ├── ndarray-cache.json
│       └── params_shard_*.bin  # 权重文件
├── MODEL_DEPLOYMENT_GUIDE.md   # 详细指南
└── QUICK_START.md              # 本文件
```

---

## 常见问题

### Q: 模型文件太大，GitHub LFS 配额不够？

**A:** 有几种解决方案：
1. 使用 GitHub Releases 附件存储模型
2. 使用 Gitee 等国内代码托管平台
3. 使用自己的服务器/CDN

### Q: 下载速度太慢？

**A:** 脚本会自动尝试镜像站点 `hf-mirror.com`，也可以手动修改脚本使用其他镜像。

### Q: 如何更换模型？

**A:**
1. 运行下载脚本选择其他模型
2. 修改 `ai-cards.js` 中的 `MODEL_ID` 和 `MODEL_BASE_URL`
3. 重新提交推送

### Q: 用户需要重新下载模型吗？

**A:** 不需要。模型文件会缓存到浏览器 IndexedDB，首次下载后后续访问秒开。

---

## 验证清单

- [ ] 模型文件已下载到 `models/qwen2.5-coder-0.5b/`
- [ ] Git LFS 已初始化 (`git lfs install`)
- [ ] `ai-cards.js` 中的 `MODEL_BASE_URL` 已修改
- [ ] `USE_LOCAL_MODEL` 设置为 `true`
- [ ] 所有文件已提交并推送
- [ ] GitHub Pages 显示"Your site is published"
- [ ] 网页能正常打开并生成卡片
- [ ] Network 标签显示模型从 github.io 加载

---

## 需要帮助？

查看详细文档：[MODEL_DEPLOYMENT_GUIDE.md](./MODEL_DEPLOYMENT_GUIDE.md)
