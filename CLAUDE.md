# Claude 项目记忆

## 项目概况
**名称**: markdown-notebook  
**类型**: 纯前端 AI 知识卡片生成工具  
**部署**: GitHub Pages (https://zzky134.github.io/markdown-notebook/)

## 核心功能
- 基于 WebLLM 的浏览器端本地 AI 推理
- 将课堂笔记转换为知识卡片（:front:: / :back:: 格式）
- 完全离线运行，无需后端服务器

## 技术栈
- HTML5 / CSS3 / Vanilla JavaScript
- WebLLM (@mlc-ai/web-llm)
- Git LFS 管理大文件
- PWA 支持

## 关键文件位置
```
markdown-notebook/
├── ai-cards.js              # AI 核心逻辑（模型配置、提示词、解析）
├── index.html               # 主页面（含移动端适配）
├── models/
│   └── llama-3.2-1b/        # Llama-3.2-1B 模型文件 (210MB)
│       ├── params_shard_0.bin ~ params_shard_3.bin
│       ├── tokenizer.json
│       ├── tokenizer_config.json
│       ├── mlc-chat-config.json
│       └── ndarray-cache.json
└── CLAUDE.md                # 本文件
```

## 当前配置（ai-cards.js）
```javascript
MODEL_ID: 'Llama-3.2-1B-Instruct-q4f16_1-MLC'
MODEL_BASE_URL: 'https://zzky134.github.io/markdown-notebook/models/llama-3.2-1b'
USE_LOCAL_MODEL: true
```

## 最近完成的任务
1. ✅ 升级模型：Qwen2.5-0.5B → Llama-3.2-1B（推理能力更强）
2. ✅ 解决 CORS：模型托管在 GitHub Pages，国内直接访问
3. ✅ 优化提示词：简化格式适配小模型
4. ✅ 移动端适配：支持安卓 Chrome，iPhone 演示模式

## 待办事项
- [ ] 监控模型生成质量（Llama-3.2-1B 效果待验证）
- [ ] 考虑添加更多模型选项（如 3B 模型）
- [ ] 优化卡片渲染样式

## 常见问题
**Q: 用户需要代理吗？**  
A: 不需要。模型从 GitHub Pages 加载，国内可直接访问。

**Q: 首次使用慢？**  
A: 正常。需下载 210MB 模型，建议 WiFi 环境。

**Q: iPhone 能用吗？**  
A: iOS 不支持 WebGPU，只能使用演示模式。

## 快速开始命令
```bash
# 查看模型文件
ls -lh models/llama-3.2-1b/

# 检查配置
grep -n "MODEL_ID\|MODEL_BASE_URL" ai-cards.js

# 本地测试
python -m http.server 8000
```

## 上次会话日期
2024-04-24
