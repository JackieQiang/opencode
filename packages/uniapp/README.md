# OpenCode UniApp

OpenCode AI 编程助手的小程序版本，基于 Vue 3 + uniapp 构建。

## 功能特性

- 🤖 AI 对话 - 与 AI 智能体进行对话
- 💻 终端 - 支持 WebSocket 连接的终端模拟器
- 📁 文件管理 - 浏览和搜索项目文件
- 💬 会话管理 - 创建和管理多个会话
- 🎨 主题支持 - 深色/浅色主题
- 🌐 多语言 - 支持中文和英文

## 技术栈

- **框架**: Vue 3 + uniapp
- **状态管理**: Pinia
- **路由**: vue-router
- **样式**: SCSS
- **终端**: 自定义实现 + xterm.js (H5)

## 项目结构

```
packages/uniapp/
├── src/
│   ├── api/              # API 适配层
│   ├── components/       # 组件
│   │   ├── common/       # 通用组件
│   │   ├── terminal/     # 终端组件
│   │   └── ...
│   ├── composables/      # 组合式函数
│   ├── stores/           # Pinia Store
│   ├── pages/            # 页面
│   ├── utils/            # 工具函数
│   ├── i18n/             # 国际化
│   └── styles/           # 样式
├── static/               # 静态资源
└── uni_modules/          # uniapp 插件
```

## 安装依赖

```bash
cd packages/uniapp
npm install
```

## 开发

### H5 开发

```bash
npm run dev:h5
```

### 微信小程序开发

```bash
npm run dev:mp-weixin
```

## 构建

### H5 构建

```bash
npm run build:h5
```

### 微信小程序构建

```bash
npm run build:mp-weixin
```

## 终端实现（方案 B）

本项目使用自定义轻量级终端实现：

- **小程序端**: 使用 `<scroll-view>` + `<text>` 组件渲染
- **H5端**: 使用 xterm.js 提供完整的终端体验
- **WebSocket**: 条件编译适配不同平台

## 许可证

MIT
