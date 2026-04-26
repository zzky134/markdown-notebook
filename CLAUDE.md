# Claude 项目记忆

## 项目概况
**名称**: markdown-notebook  
**类型**: 纯前端 AI 知识卡片生成工具  
**部署**: GitHub Pages (https://zzky134.github.io/markdown-notebook/)

## 核心功能
- 基于云端 API 的知识卡片生成（已迁移，不再使用本地模型）
- 将课堂笔记转换为知识卡片（:front:: / :back:: 格式）
- 支持 SiliconFlow、通义千问、豆包等多个 API 提供商

## 技术栈
- HTML5 / CSS3 / Vanilla JavaScript
- 云端 LLM API (SiliconFlow / 通义千问 / 豆包)
- PWA 支持

## 关键文件位置
```
markdown-notebook/
├── ai-cards.js              # AI 核心逻辑（API 调用、提示词、解析）
├── index.html               # 主页面（含移动端适配）
├── config.local.js          # 本地 API Key 配置文件（已添加到 .gitignore）
├── .gitignore               # Git 忽略规则
└── CLAUDE.md                # 本文件
```

## 当前配置（ai-cards.js）
```javascript
PROVIDER: 'siliconflow',
MODEL: 'Qwen/Qwen2.5-7B-Instruct',
API_KEY: 'sk-...'  // 请从 config.local.js 导入或环境变量读取
```

## 支持的 API 提供商
1. **SiliconFlow (推荐)** - https://siliconflow.cn
   - 模型：Qwen2.5-7B/14B、Llama-3.3-70B、DeepSeek-V2.5
   - 优点：速度快、价格低、国内访问好

2. **通义千问** - https://dashscope.aliyun.com
   - 模型：qwen-turbo、qwen-plus、qwen-max
   - 优点：阿里出品，中文理解强

3. **豆包** - https://www.volcengine.com/product/doubao
   - 模型：doubao-lite、doubao-pro
   - 优点：字节跳动出品，推理能力强

## 最近完成的任务
1. ✅ **架构升级**：本地 WebLLM → 云端 API（解决小模型能力问题）
2. ✅ **多提供商支持**：SiliconFlow / 通义千问 / 豆包
3. ✅ **提示词优化**：固定【标题】/【内容】格式，卡片间用 --- 分隔
4. ✅ **安全处理**：API Key 配置分离，添加 .gitignore 保护
5. ✅ **异常处理**：网络错误、超时、防抖等完善处理
6. ✅ **UI 保留**：保持原有按钮、加载状态、错误提示、卡片渲染

## 待办事项
- [ ] 添加 API Key 本地存储功能（可选）
- [ ] 支持用户自定义提示词模板
- [ ] 添加更多卡片样式主题

## 安全提示
**⚠️ API Key 管理：**
1. 不要将 API Key 直接提交到公开仓库
2. 使用 `config.local.js` 管理敏感配置（已添加到 .gitignore）
3. 生产环境建议通过构建工具注入或使用服务端代理

## 快速开始
```bash
# 本地测试
python -m http.server 8000

# 配置 API Key（编辑 config.local.js 或 ai-cards.js 中的 AI_CONFIG.API_KEY）
```

## 上次会话日期
2026-04-26
