# 🧠 AlgoRecall

一个本地优先、自带 AI 复盘的算法学习与间隔复习桌面应用。

## ✨ 核心特性

- **本地 C++ 沙箱运行**：基于 Rust 后端，直接在本地调用 `g++` 编译运行你的算法代码，无网络延迟。
- **AI 结构化复盘**：接入 DeepSeek 大模型（支持自定义 Base URL / 模型），一键生成算法模式、复杂度、易错点和相似题。
- **FSRS 记忆算法**：内嵌现代间隔重复算法（Free Spaced Repetition Scheduler），根据你的复习质量动态调整下次复习时间，拒绝“死记硬背”。
- **AST 函数调用图**：底层使用 `clang++` 解析 C++ 抽象语法树，自动提取用户自定义函数，并渲染出 Mermaid 可视化调用关系图。
- **沉浸式主题**：内置废土风、森林风、海洋风、经典黑白与黑客帝国等 5 套主题。
- **数据安全与隐私**：所有题目和复习记录保存在本地 SQLite 数据库中；API Key 仅保存在本地，导出的题库 JSON 绝对不会包含 Key。
- **开箱即用环境配置**：如果用户电脑没有 C++ 编译器，软件会自动从国内镜像站下载 MinGW 进行静默配置。

## 🛠️ 技术栈

- **前端**：React 19 + TypeScript + Vite
- **编辑器与图形**：Monaco Editor (VS Code 核心) + Mermaid.js
- **后端**：Rust + Tauri v2
- **数据库**：SQLite (rusqlite)
- **大模型**：DeepSeek API / 智谱 API 等兼容 OpenAI 格式的接口
- **安全机制**：防 XSS 注入、沙箱 `.current_dir()` 限制、严格 CSP 策略

## 🚀 快速开始

### 1. 克隆项目并安装依赖
```bash
git clone https://github.com/buzhidao181/algo-recall.git
cd algo-recall
npm install