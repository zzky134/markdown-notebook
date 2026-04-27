# Markdown Notebook - AI 知识卡片笔记工具

一个基于浏览器的 Markdown 笔记应用，支持 AI 辅助生成知识卡片、实时预览、PWA 离线使用等功能。

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Platform](https://img.shields.io/badge/platform-Web-orange.svg)
![PWA](https://img.shields.io/badge/PWA-Supported-green.svg)

## 在线使用

https://zzky134.github.io/markdown-notebook/

## 功能特性

### 核心功能
- 📝 **Markdown 编辑器** - 支持标准 Markdown 语法，实时预览
- 🎴 **知识卡片** - 使用 `:front::` 和 `:back::` 语法创建记忆卡片
- 🤖 **AI 答疑** - 集成 Kimi AI，一键生成问答卡片
- 📱 **PWA 支持** - 可安装到桌面，离线使用
- 📊 **学习统计** - 记录学习时长和卡片复习情况

### 移动端优化
- 响应式设计，适配手机/平板
- 触摸手势支持（滑动切换卡片、侧边栏）
- 底部导航栏，方便操作

### 其他功能
- 📅 学习计划管理
- 🎨 代码高亮、数学公式（KaTeX）
- 🖼️ 图片导出、PDF 导出
- 💾 本地存储，数据自动保存

## 快速开始

### 本地运行

```bash
# 克隆仓库
git clone https://github.com/zzky134/markdown-notebook.git
cd markdown-notebook

# 启动本地服务器
python -m http.server 8000

# 浏览器访问 http://localhost:8000
```

### 配置 AI 功能

1. 复制配置文件模板：
```bash
cp config.local.js.example config.local.js
```

2. 编辑 `config.local.js`，填入你的 API Key：
```javascript
const LOCAL_CONFIG = {
    MOONSHOT_API_KEY: 'your-moonshot-api-key-here'
};
```

3. 确保 `config.local.js` 已添加到 `.gitignore`

## 技术栈

- **前端**：原生 HTML5 / CSS3 / JavaScript（无框架）
- **Markdown 渲染**：Marked.js
- **代码高亮**：Prism.js
- **数学公式**：KaTeX
- **AI 接口**：Moonshot (Kimi) API
- **PWA**：Service Worker + Manifest

## 项目结构

```
markdown-notebook/
├── index.html          # 主页面
├── ai-cards.js         # AI 答疑模块
├── schedule.js         # 学习计划模块
├── templates.js        # 模板库
├── sw.js               # Service Worker (PWA)
├── manifest.json       # PWA 配置
├── config.local.js     # 本地配置（API Key 等）
├── icons/              # PWA 图标
├── models/             # 本地模型（已弃用）
└── README.md           # 本文件
```

## 使用说明

### 创建知识卡片

在编辑器中使用以下格式：

```markdown
:front:: 问题内容
:back:: 答案内容
```

### AI 生成卡片

1. 点击工具栏的"AI 答疑"按钮
2. 输入你的问题
3. 点击生成，AI 会自动创建问答卡片
4. 一键插入到笔记中

### 复习卡片

1. 点击"卡片复习"进入复习模式
2. 点击卡片或按空格键翻转
3. 使用左右箭头或滑动手势切换卡片

### 安装到桌面

**Chrome/Edge：**
1. 访问网站
2. 点击地址栏右侧的"安装"图标
3. 或在菜单中选择"安装应用"

**iOS Safari：**
1. 点击底部分享按钮
2. 选择"添加到主屏幕"
3. 点击"添加"

**Android Chrome：**
1. 点击菜单（三个点）
2. 选择"添加到主屏幕"

## 注意事项

1. **数据存储**：所有数据保存在浏览器本地存储中，清除浏览器数据会导致笔记丢失，建议定期导出备份
2. **API Key 安全**：请勿将 API Key 提交到公开仓库，使用 `config.local.js` 管理
3. **离线使用**：PWA 安装后可离线使用，但 AI 功能需要网络连接

## 浏览器兼容性

- Chrome 80+
- Edge 80+
- Firefox 75+
- Safari 13.1+ (iOS 13.4+)

## 开发计划

- [ ] 云同步功能
- [ ] 多用户协作
- [ ] 更多 AI 提供商支持
- [ ] 主题自定义
- [ ] 插件系统

## 许可证

MIT License

## 致谢

- 感谢 [Marked](https://marked.js.org/) 提供 Markdown 解析
- 感谢 [Prism](https://prismjs.com/) 提供代码高亮
- 感谢 [KaTeX](https://katex.org/) 提供数学公式渲染
- 感谢 [Moonshot](https://platform.moonshot.cn/) 提供 AI 能力

---

**提示**：本项目为个人学习工具，持续开发中。如有问题或建议，欢迎提交 Issue。
