<div align="center">

# 📑 ArXiv Tools (ArXiv 工具集)

**All-in-one productivity userscript for arXiv: AlphaXiv bidirectional jump, paper translation, and MinerU PDF2MD auto-extraction.**

在 arXiv 页面一键直达 AlphaXiv、幻觉翻译与 MinerU PDF2MD；支持 MinerU 任务自动轮询、实时进度展示与 ZIP 压缩包一键下载。

[![Version](https://img.shields.io/badge/version-5.4.0-blue.svg?style=flat-square)](https://github.com/printsdf/arxiv-tools)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg?style=flat-square)](https://opensource.org/licenses/MIT)
[![Tampermonkey](https://img.shields.io/badge/Tampermonkey-Supported-00485B?style=flat-square&logo=tampermonkey)](https://www.tampermonkey.net/)
[![Violentmonkey](https://img.shields.io/badge/Violentmonkey-Supported-BE1431?style=flat-square)](https://violentmonkey.github.io/)
[![ScriptCat](https://img.shields.io/badge/ScriptCat-Supported-F39C12?style=flat-square)](https://scriptcat.org/)

<p align="center">
  <a href="https://raw.githubusercontent.com/printsdf/arxiv-tools/main/arxiv2all.user.js">
    <img src="https://img.shields.io/badge/🚀_Install_Userscript-Click_Here-success?style=for-the-badge" alt="Install Userscript">
  </a>
</p>

[English](#-english) | [简体中文](#-简体中文)

</div>

---

## 📖 简体中文

### ✨ 功能特性

- 🔄 **AlphaXiv 双向直达**
  - 在 arXiv 论文详情页顶部工具栏一键跳转至对应的 AlphaXiv 讨论页。
  - 在 AlphaXiv 页面顶部导航栏自动注入 `Back to ArXiv` 按钮，无缝返回 arXiv 页面。
- 🌐 **幻觉翻译 (hjfy.top)**
  - 一键跳转至「幻觉翻译」，直接阅读双语对照与 AI 高精度翻译版本。
- 📑 **MinerU PDF2MD 一键转换与下载**
  - 免去手动上传 PDF 的繁琐步骤，一键将当前 arXiv 论文提交至 MinerU v4 VLM 解析引擎。
  - **实时轮询进度**：直观展示排队状态、解析进度（如 `解析中 8/24 页`）、格式转换中等各阶段。
  - **结果直接下载**：转换完成后弹出结果卡片，支持**一键下载完整 ZIP 压缩包**（内含 `full.md`、格式化公式/表格、高清图表与结构化 JSON 数据），或快速复制下载直链。
- 🛡️ **MinerU Token 智能管理**
  - 内置 API 探测端点（`/extract/task/probe`），支持在面板中一键测试 Token 有效性。
  - 智能捕获 MinerU 90 天有效期过期状态（错误码 `A0211`），提醒重新生成。
  - 支持粘贴带 `Bearer` 前缀的 Token，自动去空格规整，安全保存在本地（`GM_setValue`）。
- 🎨 **原生化现代设计 & 深色模式**
  - 完美融入 arXiv 页面风格，微交互动效细腻轻巧。
  - 自动适配系统的暗黑模式（`prefers-color-scheme: dark`）。

---

### 📦 安装方式

1. **安装用户脚本管理器**（任选其一）：
   - [Tampermonkey (油猴)](https://www.tampermonkey.net/)（推荐）
   - [Violentmonkey (暴力猴)](https://violentmonkey.github.io/)
   - [ScriptCat (脚本猫)](https://scriptcat.org/)
2. **一键安装脚本**：
   - 👉 **[点击直接安装脚本 (GitHub Raw)](https://raw.githubusercontent.com/printsdf/arxiv-tools/main/arxiv2all.user.js)**
3. 打开任意 [arXiv 论文页面](https://arxiv.org/abs/1706.03762)，即可看到顶部工具条。

---

### ⚙️ MinerU API Token 获取与配置

MinerU PDF 转 Markdown 功能需要使用 MinerU 开放平台的 API Token（官方提供免费调用额度）：

1. 访问 [MinerU 官方网站 (mineru.net)](https://mineru.net/) 注册/登录账号。
2. 进入 **[API 管理 -> API Token](https://mineru.net/apiManage/token)** 页面。
3. 点击「生成 Token」并复制。
4. 在 arXiv 页面点击工具条中的 **「设置」** 或 **「MinerU PDF2MD」** 按钮，将 Token 粘贴保存即可。
   > 💡 提示：MinerU API Token 有效期约为 **90 天**，若提示过期，在 MinerU 后台重新生成一次并更新即可。

---

## 🌐 English

### ✨ Key Features

- 🔄 **Bidirectional arXiv ⇄ AlphaXiv Navigation**
  - Seamless jump from arXiv abstract page to AlphaXiv for interactive discussion.
  - Automatically injects a sleek `Back to ArXiv` button on AlphaXiv headers.
- 🌐 **Instant Translation via Hallucination Translator (hjfy.top)**
  - Direct link to read machine-translated and bilingual versions of the paper.
- 📑 **MinerU PDF2MD Integration (Auto-poll & 1-Click Download)**
  - Sends the paper PDF directly to MinerU v4 VLM extraction API without manual download and re-upload.
  - **Live Progress Polling**: Real-time progress bar displaying current stages (`Queued`, `Extracting 8/24 pages`, `Formatting`).
  - **Instant ZIP Download**: Modal popup with direct download link for the full ZIP bundle containing `full.md` (Markdown), math formulas, figures, and structural JSON.
- 🛡️ **MinerU Token Inspector & Management**
  - Built-in connectivity & authorization probe (`/extract/task/probe`) to test token validity.
  - Automatically detects 90-day token expiration errors (`A0211`) and guides you to update.
  - Clean local persistence via `GM_setValue`.
- 🎨 **Native Typography & Dark Mode**
  - Clean UI tailored to arXiv's classic academic layout.
  - Full automatic dark theme support (`prefers-color-scheme: dark`).

---

### 📦 Installation

1. Install a compatible userscript manager extension:
   - [Tampermonkey](https://www.tampermonkey.net/) (Recommended)
   - [Violentmonkey](https://violentmonkey.github.io/)
   - [ScriptCat](https://scriptcat.org/)
2. Click to install:
   - 👉 **[Install from GitHub Raw](https://raw.githubusercontent.com/printsdf/arxiv-tools/main/arxiv2all.user.js)**
3. Navigate to any [arXiv paper page](https://arxiv.org/abs/1706.03762) to use!

---

## 🙏 Credits & Acknowledgements

This userscript builds upon and takes inspiration from several outstanding open-source projects in the academic community:

- **[AlphaXiv Supercharger](https://greasyfork.org/zh-CN/scripts/544529-alphaxiv-supercharger)** by **[jkhuyvxw](https://greasyfork.org/zh-CN/users/93419-jkhuyvxw)** — The original implementation of the `Back to ArXiv` reverse navigation button and AlphaXiv DOM injection logic.
- **[ToAlphaXiv](https://greasyfork.org/zh-CN/scripts/502558-toalphaxiv)** by **MajoranaOedipus** — Early reciprocal navigation between arXiv and AlphaXiv.
- **[ArXiv-AlphaXiv Navigator](https://greasyfork.org/zh-CN/scripts/538595-arxiv-alphaxiv-navigator)** by **Henry Browne** — Additional navigation patterns.
- **[MinerU](https://mineru.net)** by **OpenDataLab** — High-precision document extraction engine for converting complex PDF papers into clean Markdown.
- **[幻觉翻译 (hjfy.top)](https://hjfy.top)** — Academic translation platform.

---

## 📄 License

This project is open-sourced under the [MIT License](LICENSE).
