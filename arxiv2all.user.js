// ==UserScript==
// @name              ArXiv Tools
// @name:zh-CN        ArXiv 工具集
// @namespace         https://github.com/printsdf/arxiv-tools
// @version           1.0.0
// @description       AlphaXiv / 幻觉翻译 / MinerU PDF2MD (Auto-poll & Download)
// @description:zh-CN 在 arXiv 页面添加 AlphaXiv、幻觉翻译、MinerU 入口；MinerU 支持自动轮询结果并弹窗下载
// @author            printsdf
// @author            jkhuyvxw (AlphaXiv Supercharger original author)
// @credits           Based on "AlphaXiv Supercharger" by jkhuyvxw (https://greasyfork.org/zh-CN/scripts/544529-alphaxiv-supercharger)
// @credits           Also inspired by "ToAlphaXiv" by MajoranaOedipus (https://greasyfork.org/zh-CN/scripts/502558-toalphaxiv)
// @credits           Also inspired by "ArXiv-AlphaXiv Navigator" by Henry Browne (https://greasyfork.org/zh-CN/scripts/538595-arxiv-alphaxiv-navigator)
// @homepageURL       https://github.com/printsdf/arxiv-tools
// @supportURL        https://github.com/printsdf/arxiv-tools/issues
// @updateURL         https://raw.githubusercontent.com/printsdf/arxiv-tools/main/arxiv2all.user.js
// @downloadURL       https://raw.githubusercontent.com/printsdf/arxiv-tools/main/arxiv2all.user.js
// @match             https://arxiv.org/abs/*
// @match             https://www.arxiv.org/abs/*
// @match             https://www.alphaxiv.org/abs/*
// @match             https://alphaxiv.org/abs/*
// @icon              https://alphaxiv.org/icon.ico
// @grant             GM_setValue
// @grant             GM_getValue
// @grant             GM_xmlhttpRequest
// @connect           mineru.net
// @license           MIT
// ==/UserScript==

(function () {
    'use strict';

    const STORAGE_KEY_TOKEN = 'mineru_api_token';
    const hostname = window.location.hostname.replace('www.', '');

    // ── 图标 ───────────────────────────────────────────────────────────────────
    const svg = (paths, extra = '') => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" ${extra}>${paths}</svg>`;

    const ICONS = {
        alphaxiv: svg('<path d="M14 4h6v6"/><path d="M20 4L10 14"/><path d="M18 13v5a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h5"/>'),
        translate: svg('<circle cx="12" cy="12" r="9"/><path d="M3 12h18"/><path d="M12 3c2.3 2.5 3.6 5.6 3.6 9s-1.3 6.5-3.6 9c-2.3-2.5-3.6-5.6-3.6-9s1.3-6.5 3.6-9z"/>'),
        mineru: svg('<path d="M13 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V9z"/><path d="M13 3v6h6"/><path d="M9.2 16.2L12 19l2.8-2.8"/><path d="M12 12.5v6"/>'),
        download: svg('<path d="M12 4v11"/><path d="M7 10l5 5 5-5"/><path d="M5 19h14"/>'),
        copy: svg('<rect x="9" y="9" width="11" height="11" rx="1.5"/><path d="M5 15V6a2 2 0 0 1 2-2h9"/>'),
        gear: svg('<circle cx="12" cy="12" r="3.2"/><path d="M12 5V3.5M12 20.5V19M19 12h1.5M3.5 12H5M17.1 6.9l1.1-1.1M5.8 18.2l1.1-1.1M17.1 17.1l1.1 1.1M5.8 5.8l1.1 1.1"/>'),
        check: svg('<path d="M20 6L9 17l-5-5"/>'),
        alert: svg('<circle cx="12" cy="12" r="9"/><path d="M12 7.5v5.5"/><path d="M12 16.2h.01"/>'),
        spinner: svg('<path d="M12 3a9 9 0 1 0 9 9"/>', 'class="zx-spin"'),
        close: svg('<path d="M18 6L6 18"/><path d="M6 6l12 12"/>'),
        trash: svg('<path d="M4 7h16"/><path d="M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/><path d="M6 7l1 12a2 2 0 0 0 2 2h6a2 2 0 0 0 2-2l1-12"/>'),
        refresh: svg('<path d="M21 12a9 9 0 1 1-3-6.7"/><path d="M21 3v6h-6"/>'),
        shield: svg('<path d="M12 3l7 4v5c0 4.4-3 8.2-7 9-4-.8-7-4.6-7-9V7z"/><path d="M9 12l2 2 4-4"/>'),
    };

    // ── Token 规范化 / 读写 ───────────────────────────────────────────────────
    function normalizeToken(raw) {
        return String(raw == null ? '' : raw)
            .trim()
            .replace(/^bearer\s+/i, '')
            .replace(/^["'`]|["'`]$/g, '')
            .trim();
    }
    function getToken() {
        return normalizeToken(GM_getValue(STORAGE_KEY_TOKEN, ''));
    }
    function setToken(raw) {
        const t = normalizeToken(raw);
        GM_setValue(STORAGE_KEY_TOKEN, t);
        return t;
    }
    function clearToken() {
        GM_setValue(STORAGE_KEY_TOKEN, '');
    }
    function isAuthErrorCode(code) {
        return code === 'A0202' || code === 'A0211';
    }
    function isAuthErrorMessage(msg) {
        return /auth|token|unauthor|credential|invalid\s*(user|key|token)/i.test(String(msg || ''));
    }
    function escapeAttr(s) {
        return String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    }

    // ── AlphaXiv 页面 ───────────────────────────────────────────────────────────
    // 核心导航逻辑与按钮实现基于 jkhuyvxw 的 AlphaXiv Supercharger (MIT License)
    // https://greasyfork.org/zh-CN/scripts/544529-alphaxiv-supercharger
    if (hostname === 'alphaxiv.org') {
        const observer = new MutationObserver(() => {
            const container = document.querySelector('.flex.items-center.space-x-2');
            if (container) {
                const btn = document.createElement('a');
                btn.href = window.location.href.replace('alphaxiv.org', 'arxiv.org');
                btn.target = '_blank';
                btn.className = 'group flex h-[30px] items-center justify-between rounded-lg border px-2 text-sm transition-all border-gray-600 bg-white text-gray-600 hover:bg-gray-100';
                const span = document.createElement('span');
                span.textContent = 'Back to ArXiv';
                span.className = 'font-medium text-gray-600';
                btn.appendChild(span);
                container.appendChild(btn);
                observer.disconnect();
            }
        });
        observer.observe(document.body, { childList: true, subtree: true });
        return;
    }

    // ── arXiv 页面 ──────────────────────────────────────────────────────────────
    if (hostname !== 'arxiv.org') return;

    const idMatch = window.location.pathname.match(/\/abs\/(.+)/);
    if (!idMatch) return;
    const arxivId = idMatch[1];
    const pdfUrl = `https://arxiv.org/pdf/${arxivId}`;

    injectStyles();
    addToolbarLinks();

    function injectStyles() {
        const style = document.createElement('style');
        style.textContent = `
      :root {
        --zx-ink: #1c1c1a;
        --zx-ink-soft: #6b6a63;
        --zx-paper: #fffefb;
        --zx-paper-sunk: #f5f3ee;
        --zx-line: #e2ded2;
        --zx-accent: #a3231f;
        --zx-accent-hover: #7e1a17;
        --zx-accent-soft: rgba(163, 35, 31, 0.08);
        --zx-teal: #1f6e5c;
        --zx-teal-soft: rgba(31, 110, 92, 0.1);
        --zx-amber: #9a6a12;
        --zx-amber-soft: rgba(154, 106, 18, 0.1);
        --zx-danger: #b3382b;
        --zx-danger-soft: rgba(179, 56, 43, 0.1);
        --zx-radius: 10px;
        --zx-shadow: 0 1px 2px rgba(28, 28, 26, 0.04), 0 16px 40px -12px rgba(28, 28, 26, 0.22);
        --zx-serif: Georgia, "Iowan Old Style", "Palatino Linotype", "Times New Roman", serif;
        --zx-sans: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
      }
      @media (prefers-color-scheme: dark) {
        :root {
          --zx-ink: #ede9df;
          --zx-ink-soft: #a6a297;
          --zx-paper: #201f1c;
          --zx-paper-sunk: #292824;
          --zx-line: #38362f;
          --zx-accent: #e0655c;
          --zx-accent-hover: #ec8179;
          --zx-accent-soft: rgba(224, 101, 92, 0.14);
          --zx-teal: #4fb89e;
          --zx-teal-soft: rgba(79, 184, 158, 0.14);
          --zx-amber: #d8a338;
          --zx-amber-soft: rgba(216, 163, 56, 0.14);
          --zx-danger: #e07567;
          --zx-danger-soft: rgba(224, 117, 103, 0.14);
        }
      }

      .zx-toolbar {
        display: inline-flex;
        align-items: stretch;
        gap: 0;
        margin-left: auto;
        background: var(--zx-paper);
        border: 1px solid var(--zx-line);
        border-radius: 8px;
        box-shadow: 0 1px 3px rgba(28, 28, 26, 0.08);
        overflow: hidden;
        font-family: var(--zx-sans);
      }
      .zx-toolbar-btn {
        display: inline-flex;
        align-items: center;
        gap: 7px;
        padding: 7px 13px;
        border-left: 1px solid var(--zx-line);
        color: var(--zx-ink);
        font-size: 12.5px;
        font-weight: 600;
        letter-spacing: 0.01em;
        text-decoration: none;
        white-space: nowrap;
        cursor: pointer;
        transition: background-color 0.15s ease, color 0.15s ease;
      }
      .zx-toolbar-btn:first-child { border-left: none; }
      .zx-toolbar-btn svg { width: 14px; height: 14px; flex-shrink: 0; color: var(--zx-accent); }
      .zx-toolbar-btn:hover { background: var(--zx-accent-soft); color: var(--zx-accent-hover); text-decoration: none; }
      .zx-toolbar-btn:focus-visible { outline: 2px solid var(--zx-accent); outline-offset: -2px; }

      .zx-overlay {
        position: fixed;
        inset: 0;
        z-index: 999999;
        background: rgba(28, 28, 26, 0.4);
        backdrop-filter: blur(3px);
        display: flex;
        align-items: center;
        justify-content: center;
        animation: zx-fade 0.15s ease;
      }
      .zx-card {
        font-family: var(--zx-sans);
        background: var(--zx-paper);
        color: var(--zx-ink);
        border: 1px solid var(--zx-line);
        border-radius: var(--zx-radius);
        padding: 22px 22px 20px;
        width: 420px;
        max-width: 92vw;
        box-shadow: var(--zx-shadow);
        animation: zx-pop 0.18s cubic-bezier(0.22, 1, 0.36, 1);
      }
      @keyframes zx-fade { from { opacity: 0; } to { opacity: 1; } }
      @keyframes zx-pop {
        from { opacity: 0; transform: translateY(8px) scale(0.97); }
        to { opacity: 1; transform: translateY(0) scale(1); }
      }
      @media (prefers-reduced-motion: reduce) { .zx-overlay, .zx-card { animation: none; } }

      .zx-header { display: flex; align-items: center; gap: 8px; margin-bottom: 14px; }
      .zx-header-icon { width: 18px; height: 18px; color: var(--zx-accent); flex-shrink: 0; }
      .zx-header-title { font-family: var(--zx-serif); font-size: 17px; font-weight: 600; letter-spacing: 0.01em; flex: 1; }
      .zx-close {
        width: 26px; height: 26px; display: inline-flex; align-items: center; justify-content: center;
        border-radius: 6px; color: var(--zx-ink-soft); cursor: pointer; border: none; background: transparent; flex-shrink: 0;
      }
      .zx-close svg { width: 14px; height: 14px; }
      .zx-close:hover { background: var(--zx-paper-sunk); color: var(--zx-ink); }
      .zx-close:focus-visible { outline: 2px solid var(--zx-accent); outline-offset: 1px; }

      .zx-desc { font-size: 12.5px; line-height: 1.6; color: var(--zx-ink-soft); margin-bottom: 14px; }
      .zx-desc a { color: var(--zx-accent); text-decoration: none; border-bottom: 1px solid var(--zx-accent-soft); }
      .zx-desc a:hover { border-bottom-color: var(--zx-accent); }
      .zx-desc strong { color: var(--zx-ink); }

      .zx-label {
        display: block; font-size: 11px; font-weight: 600; text-transform: uppercase;
        letter-spacing: 0.06em; color: var(--zx-ink-soft); margin-bottom: 6px;
      }
      .zx-input {
        width: 100%; padding: 8px 10px; border-radius: 7px; border: 1px solid var(--zx-line);
        background: var(--zx-paper-sunk); color: var(--zx-ink); font-size: 12.5px;
        font-family: var(--zx-sans); box-sizing: border-box; outline: none;
        transition: border-color 0.15s ease, box-shadow 0.15s ease;
      }
      .zx-input:focus { border-color: var(--zx-accent); box-shadow: 0 0 0 3px var(--zx-accent-soft); background: var(--zx-paper); }

      .zx-actions { display: flex; gap: 8px; margin-top: 16px; }
      .zx-btn {
        flex: 1; border-radius: 7px; border: 1px solid transparent; padding: 8px 12px;
        font-size: 12.5px; font-weight: 600; font-family: var(--zx-sans); cursor: pointer;
        display: inline-flex; align-items: center; justify-content: center; gap: 6px;
        transition: background-color 0.15s ease, border-color 0.15s ease, transform 0.05s ease;
        text-decoration: none; box-sizing: border-box;
      }
      .zx-btn svg { width: 14px; height: 14px; }
      .zx-btn:active { transform: translateY(0.5px); }
      .zx-btn:focus-visible { outline: 2px solid var(--zx-accent); outline-offset: 2px; }
      .zx-btn-primary { background: var(--zx-accent); color: #fff8f6; }
      .zx-btn-primary:hover { background: var(--zx-accent-hover); }
      .zx-btn-ghost { background: transparent; color: var(--zx-ink-soft); border-color: var(--zx-line); }
      .zx-btn-ghost:hover { background: var(--zx-paper-sunk); color: var(--zx-ink); border-color: var(--zx-ink-soft); }
      .zx-btn-danger { background: transparent; color: var(--zx-danger); border-color: var(--zx-line); }
      .zx-btn-danger:hover { background: var(--zx-danger-soft); border-color: var(--zx-danger); }
      .zx-btn-teal { background: var(--zx-teal); color: #f2fbf8; }
      .zx-btn-teal:hover { opacity: 0.9; }

      .zx-id-badge {
        display: inline-block; font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
        font-size: 11px; color: var(--zx-ink-soft); background: var(--zx-paper-sunk);
        border: 1px solid var(--zx-line); border-radius: 5px; padding: 2px 7px; margin-bottom: 12px;
      }

      .zx-status-row {
        display: flex; align-items: center; gap: 7px; font-size: 12.5px;
        color: var(--zx-ink); margin-bottom: 8px; min-height: 16px;
      }
      .zx-status-row svg { width: 15px; height: 15px; flex-shrink: 0; }
      .zx-status-row[data-status="error"] svg { color: var(--zx-danger); }
      .zx-status-row[data-status="done"] svg { color: var(--zx-teal); }
      .zx-status-row[data-status="pending"] svg { color: var(--zx-amber); }
      .zx-status-row[data-status="running"] svg { color: var(--zx-accent); }
      .zx-status-row[data-status="checking"] svg { color: var(--zx-amber); }

      .zx-spin { animation: zx-rotate 0.9s linear infinite; }
      @keyframes zx-rotate { to { transform: rotate(360deg); } }
      @media (prefers-reduced-motion: reduce) { .zx-spin { animation: none; } }

      .zx-progress-track {
        height: 5px; background: var(--zx-paper-sunk); border: 1px solid var(--zx-line);
        border-radius: 999px; overflow: hidden;
      }
      .zx-progress-bar {
        height: 100%; width: 0%; background: var(--zx-accent); border-radius: 999px;
        transition: width 0.4s ease, background-color 0.2s ease;
      }
      .zx-progress-bar[data-status="pending"] { background: var(--zx-amber); }
      .zx-progress-bar[data-status="running"] {
        background-image: repeating-linear-gradient(-45deg, var(--zx-accent) 0 8px, var(--zx-accent-hover) 8px 16px);
        background-size: 200% 100%; animation: zx-stripe 0.9s linear infinite;
      }
      .zx-progress-bar[data-status="done"] { background: var(--zx-teal); }
      .zx-progress-bar[data-status="error"] { background: var(--zx-danger); }
      @keyframes zx-stripe { from { background-position: 0 0; } to { background-position: 32px 0; } }
      @media (prefers-reduced-motion: reduce) { .zx-progress-bar[data-status="running"] { animation: none; } }

      .zx-link-col { display: flex; flex-direction: column; gap: 8px; margin-top: 4px; }
      .zx-task-id { margin-top: 12px; font-size: 11px; color: var(--zx-ink-soft); text-align: center; }
      .zx-task-id code {
        font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
        background: var(--zx-paper-sunk); border: 1px solid var(--zx-line); padding: 1px 5px; border-radius: 4px;
      }

      /* Token 状态卡片 */
      .zx-token-status {
        display: flex; align-items: center; gap: 8px; padding: 10px 12px;
        border-radius: 8px; border: 1px solid var(--zx-line); margin-bottom: 14px;
        font-size: 12.5px; transition: background-color 0.2s ease, border-color 0.2s ease;
      }
      .zx-token-status[data-status="valid"] { background: var(--zx-teal-soft); border-color: var(--zx-teal); color: var(--zx-teal); }
      .zx-token-status[data-status="expired"] { background: var(--zx-danger-soft); border-color: var(--zx-danger); color: var(--zx-danger); }
      .zx-token-status[data-status="invalid"] { background: var(--zx-danger-soft); border-color: var(--zx-danger); color: var(--zx-danger); }
      .zx-token-status[data-status="checking"] { background: var(--zx-amber-soft); border-color: var(--zx-amber); color: var(--zx-amber); }
      .zx-token-status[data-status="empty"] { background: var(--zx-paper-sunk); border-color: var(--zx-line); color: var(--zx-ink-soft); }
      .zx-token-status svg { width: 16px; height: 16px; flex-shrink: 0; }
      .zx-token-status-text { flex: 1; line-height: 1.4; }
      .zx-token-status-text small { display: block; font-size: 11px; opacity: 0.75; margin-top: 2px; }

      .zx-divider { height: 1px; background: var(--zx-line); margin: 14px 0; border: none; }
    `;
        document.head.appendChild(style);
    }

    function addToolbarLinks() {
        const siteHeader = document.querySelector('.ds-site-header') || document.querySelector('header.header, header');
        if (!siteHeader) {
            console.warn('[ArXiv Tools] 未找到页面头部容器（.ds-site-header），工具条未注入。');
            return;
        }

        const toolbar = document.createElement('span');
        toolbar.className = 'zx-toolbar';

        const mkToolbarBtn = (iconKey, name, url, tooltip) => {
            const a = document.createElement('a');
            a.className = 'zx-toolbar-btn';
            a.href = url;
            a.target = '_blank';
            a.innerHTML = `${ICONS[iconKey]}<span>${name}</span>`;
            if (tooltip) a.title = tooltip;
            return a;
        };

        toolbar.appendChild(mkToolbarBtn('alphaxiv', 'AlphaXiv', window.location.href.replace('arxiv.org', 'alphaxiv.org'), '在 AlphaXiv 中打开'));
        toolbar.appendChild(mkToolbarBtn('translate', '幻觉翻译', `https://hjfy.top/arxiv/${arxivId}`, '使用幻觉翻译查看'));

        const mineruBtn = mkToolbarBtn('mineru', 'MinerU PDF2MD', '#', '使用 MinerU 解析为 Markdown');
        mineruBtn.addEventListener('click', (e) => {
            e.preventDefault();
            const token = getToken();
            if (!token) {
                showTokenPanel(() => {
                    const t = getToken();
                    if (t) submitToMinerUAPI(t, pdfUrl, arxivId);
                });
            } else {
                submitToMinerUAPI(token, pdfUrl, arxivId);
            }
        });

        toolbar.appendChild(mineruBtn);

        // 设置按钮（齿轮图标），用于随时打开 Token 管理面板
        const settingsBtn = document.createElement('button');
        settingsBtn.className = 'zx-toolbar-btn';
        settingsBtn.title = 'MinerU Token 设置';
        settingsBtn.innerHTML = `${ICONS.gear}<span>设置</span>`;
        settingsBtn.style.border = 'none';
        settingsBtn.style.background = 'transparent';
        settingsBtn.addEventListener('click', (e) => {
            e.preventDefault();
            showTokenPanel(null);
        });
        toolbar.appendChild(settingsBtn);

        siteHeader.appendChild(toolbar);
    }

    // ── Token 状态探测 ──────────────────────────────────────────────────────────
    // GET /extract/task/probe → -60012 表示已认证，401/403 表示已过期
    function probeTokenStatus(token, callback) {
        if (!token) {
            callback({ status: 'empty', text: '未配置 Token' });
            return;
        }
        GM_xmlhttpRequest({
            method: 'GET',
            url: 'https://mineru.net/api/v4/extract/task/probe',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            onload: (res) => {
                let json = null;
                try { json = JSON.parse(res.responseText); } catch (_) {}

                // 情况1：HTTP 200 + code -60012 → 已认证（probe 端点特有的“正常”返回）
                if (json && json.code === -60012) {
                    callback({ status: 'valid', text: 'Token 有效', detail: '已通过认证，可正常提交任务' });
                    return;
                }

                // 情况2：HTTP 200 + code 0 → 也视为有效（不同实现可能不同）
                if (json && json.code === 0) {
                    callback({ status: 'valid', text: 'Token 有效', detail: '认证通过' });
                    return;
                }

                // 情况3：认证层错误（A0202 / A0211 或 success=false）
                if (json && (json.success === false || isAuthErrorCode(json.msgCode))) {
                    const code = json.msgCode || 'A0202';
                    const expired = code === 'A0211' || /expire/i.test(json.msg || '');
                    callback({
                        status: expired ? 'expired' : 'invalid',
                        text: expired ? 'Token 已过期' : 'Token 无效',
                        detail: expired
                            ? 'MinerU Token 有效期约 90 天，请重新生成'
                            : (json.msg || '认证失败，请检查 Token 是否正确')
                    });
                    return;
                }

                // 情况4：HTTP 状态码判断
                if (res.status === 401 || res.status === 403) {
                    callback({ status: 'expired', text: 'Token 已过期或无权限', detail: '请重新生成 Token' });
                    return;
                }

                // 其他未知情况
                callback({
                    status: 'invalid',
                    text: 'Token 状态未知',
                    detail: json && json.msg ? json.msg : `HTTP ${res.status}`
                });
            },
            onerror: () => {
                callback({ status: 'invalid', text: '网络请求失败', detail: '无法连接 MinerU 服务' });
            },
            ontimeout: () => {
                callback({ status: 'invalid', text: '请求超时', detail: '请检查网络后重试' });
            }
        });
    }

    // ── Token 配置面板（含状态检查）──────────────────────────────────────────────
    function showTokenPanel(onSuccess, hint) {
        const existing = document.getElementById('mineru-panel');
        if (existing) {
            existing.querySelector('#mineru-token-input')?.focus();
            return;
        }

        const overlay = document.createElement('div');
        overlay.id = 'mineru-panel';
        overlay.className = 'zx-overlay';

        const current = getToken();
        const hintHTML = hint
            ? `<div class="zx-desc" style="color:var(--zx-danger);"><strong>${escapeAttr(hint)}</strong></div>`
            : '';

        overlay.innerHTML = `
      <div class="zx-card">
        <div class="zx-header">
          <span class="zx-header-icon">${ICONS.shield}</span>
          <span class="zx-header-title">MinerU Token 管理</span>
          <button class="zx-close" id="mineru-close">${ICONS.close}</button>
        </div>

        ${hintHTML}

        <!-- Token 状态显示 -->
        <div id="zx-token-status" class="zx-token-status" data-status="empty">
          ${ICONS.alert}
          <span class="zx-token-status-text" id="zx-token-status-text">
            正在检查 Token 状态…
            <small>首次打开时会自动检测</small>
          </span>
        </div>

        <div class="zx-desc">
          需要 MinerU API Token 才能提交解析任务。免费注册后在
          <a href="https://mineru.net/apiManage/token" target="_blank">mineru.net → API 管理</a>
          申请 Token（有免费额度）。<br>
          <strong>注意：</strong>Token 有效期约 <strong>90 天</strong>，且不可续期，过期后请重新生成。
        </div>

        <label class="zx-label" for="mineru-token-input">API Token</label>
        <input id="mineru-token-input" class="zx-input" type="text" spellcheck="false" autocomplete="off"
               placeholder="粘贴 Token（含 Bearer 前缀也可以）" value="${escapeAttr(current)}">

        <div class="zx-actions">
          <button id="mineru-save" class="zx-btn zx-btn-primary">保存</button>
          <button id="mineru-check" class="zx-btn zx-btn-teal">${ICONS.refresh} 检查状态</button>
          <button id="mineru-clear" class="zx-btn zx-btn-danger">${ICONS.trash} 清除</button>
        </div>

        <div class="zx-actions" style="margin-top:8px;">
          <button id="mineru-cancel" class="zx-btn zx-btn-ghost">关闭</button>
        </div>
      </div>
    `;

        document.body.appendChild(overlay);

        const close = () => overlay.remove();
        const input = overlay.querySelector('#mineru-token-input');
        const statusEl = overlay.querySelector('#zx-token-status');
        const statusTextEl = overlay.querySelector('#zx-token-status-text');

        // 更新状态显示
        const renderStatus = (result) => {
            statusEl.dataset.status = result.status;
            const icon = result.status === 'valid' ? ICONS.check
                : result.status === 'checking' ? ICONS.spinner
                : result.status === 'empty' ? ICONS.alert
                : ICONS.alert;
            statusTextEl.innerHTML = `${result.text}${result.detail ? `<small>${result.detail}</small>` : ''}`;
            // 替换图标
            const oldIcon = statusEl.querySelector('svg');
            if (oldIcon) oldIcon.remove();
            statusEl.insertAdjacentHTML('afterbegin', icon);
        };

        // 自动检查当前 Token
        const autoCheck = () => {
            renderStatus({ status: 'checking', text: '正在检查 Token 状态…' });
            probeTokenStatus(current, renderStatus);
        };

        // 关闭
        overlay.querySelector('#mineru-close').addEventListener('click', close);
        overlay.querySelector('#mineru-cancel').addEventListener('click', close);
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) close();
        });

        // 保存
        overlay.querySelector('#mineru-save').addEventListener('click', () => {
            const t = setToken(input.value);
            if (!t) {
                alert('Token 不能为空');
                return;
            }
            // 保存后自动检查新 Token
            renderStatus({ status: 'checking', text: '正在检查 Token 状态…' });
            probeTokenStatus(t, (result) => {
                renderStatus(result);
                if (result.status === 'valid') {
                    setTimeout(() => {
                        close();
                        if (onSuccess) onSuccess();
                    }, 800);
                }
            });
        });

        // 手动检查
        overlay.querySelector('#mineru-check').addEventListener('click', () => {
            const t = normalizeToken(input.value);
            if (!t) {
                renderStatus({ status: 'empty', text: '未填写 Token', detail: '请先输入 Token' });
                return;
            }
            renderStatus({ status: 'checking', text: '正在检查 Token 状态…' });
            probeTokenStatus(t, renderStatus);
        });

        // 清除
        overlay.querySelector('#mineru-clear').addEventListener('click', () => {
            clearToken();
            input.value = '';
            renderStatus({ status: 'empty', text: 'Token 已清除', detail: '请填写新的 Token' });
            input.focus();
        });

        // Enter 保存
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') overlay.querySelector('#mineru-save').click();
        });

        // 自动检测
        autoCheck();
        setTimeout(() => input.focus(), 50);
    }

    // 认证失败时的处理
    function handleAuthError(msgCode, msg) {
        clearToken();
        const expired = msgCode === 'A0211' || /expire/i.test(msg || '');
        const hint = expired
            ? 'Token 已过期（有效期约 90 天），请重新生成并填写。'
            : `认证失败：${msg || 'user authenticate failed'}，请检查 Token 是否正确。`;
        updateProgress('error', hint, 0);
        setTimeout(() => {
            closeProgressPanel();
            showTokenPanel(() => {
                const t = getToken();
                if (t) submitToMinerUAPI(t, pdfUrl, arxivId);
            }, hint);
        }, 1200);
    }

    // ── 提交 MinerU 任务 ─────────────────────────────────────────────────────────
    function submitToMinerUAPI(token, pdfUrl, arxivId) {
        showProgressPanel(arxivId);

        GM_xmlhttpRequest({
            method: 'POST',
            url: 'https://mineru.net/api/v4/extract/task',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            data: JSON.stringify({
                url: pdfUrl,
                model_version: 'vlm',
                enable_formula: true,
                enable_table: true,
                language: 'en',
                data_id: arxivId
            }),
            onload: (res) => {
                let json;
                try { json = JSON.parse(res.responseText); }
                catch (e) { updateProgress('error', '解析响应失败: ' + e.message); return; }

                // 认证层错误（success=false, msgCode=A0202/A0211）
                if (json.success === false || isAuthErrorCode(json.msgCode)) {
                    handleAuthError(json.msgCode, json.msg);
                    return;
                }

                if (json.code !== 0) {
                    const msg = json.msg || '未知错误';
                    if (isAuthErrorMessage(msg)) {
                        handleAuthError(null, msg);
                    } else {
                        updateProgress('error', `提交失败: ${msg}`);
                    }
                    return;
                }

                const taskId = json.data.task_id;
                updateProgress('pending', `任务已提交 (ID: ${taskId.slice(0, 8)}…)`, 5);
                pollTaskResult(token, taskId, arxivId);
            },
            onerror: () => updateProgress('error', '网络请求失败，请检查网络'),
            ontimeout: () => updateProgress('error', '请求超时')
        });
    }

    // ── 轮询任务结果 ─────────────────────────────────────────────────────────────
    function pollTaskResult(token, taskId, arxivId) {
        const maxAttempts = 120;
        const interval = 3000;
        let attempts = 0;

        const doPoll = () => {
            if (attempts >= maxAttempts) {
                updateProgress('error', '轮询超时，请前往 MinerU 控制台手动查看');
                return;
            }
            attempts++;

            GM_xmlhttpRequest({
                method: 'GET',
                url: `https://mineru.net/api/v4/extract/task/${taskId}`,
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                onload: (res) => {
                    let json;
                    try { json = JSON.parse(res.responseText); }
                    catch (e) { updateProgress('error', '解析状态失败: ' + e.message); return; }

                    if (json.success === false || isAuthErrorCode(json.msgCode)) {
                        handleAuthError(json.msgCode, json.msg);
                        return;
                    }

                    if (json.code !== 0) {
                        const msg = json.msg || '未知错误';
                        if (isAuthErrorMessage(msg)) {
                            handleAuthError(null, msg);
                        } else {
                            updateProgress('error', `查询失败: ${msg}`);
                        }
                        return;
                    }

                    const data = json.data;
                    const state = data.state;

                    if (state === 'done') {
                        const zipUrl = data.full_zip_url;
                        updateProgress('done', '解析完成！', 100);
                        setTimeout(() => {
                            closeProgressPanel();
                            showResultPanel(arxivId, zipUrl, taskId);
                        }, 600);
                        return;
                    }

                    if (state === 'failed') {
                        updateProgress('error', `解析失败: ${data.err_msg || '未知错误'}`);
                        return;
                    }

                    const progress = data.extract_progress;
                    let percent = 10;
                    let msg = '排队中…';
                    if (state === 'running' && progress) {
                        const { extracted_pages, total_pages } = progress;
                        percent = total_pages ? Math.round((extracted_pages / total_pages) * 80) + 10 : 50;
                        msg = `解析中… ${extracted_pages || 0}/${total_pages || '?'} 页`;
                    } else if (state === 'converting') {
                        percent = 95;
                        msg = '格式转换中…';
                    }

                    updateProgress('running', msg, percent);
                    setTimeout(doPoll, interval);
                },
                onerror: () => updateProgress('error', '查询请求失败')
            });
        };

        doPoll();
    }

    // ── 进度弹窗 ─────────────────────────────────────────────────────────────────
    let progressOverlay = null;

    function showProgressPanel(arxivId) {
        closeProgressPanel();
        progressOverlay = document.createElement('div');
        progressOverlay.id = 'mineru-progress';
        progressOverlay.className = 'zx-overlay';
        progressOverlay.innerHTML = `
      <div class="zx-card">
        <div class="zx-header">
          <span class="zx-header-icon">${ICONS.mineru}</span>
          <span class="zx-header-title">MinerU 解析</span>
          <button class="zx-close" id="mineru-progress-close">${ICONS.close}</button>
        </div>
        <div class="zx-id-badge">${arxivId}</div>
        <div id="mineru-status-row" class="zx-status-row" data-status="pending">
          ${ICONS.spinner}
          <span id="mineru-status-text">正在提交任务…</span>
        </div>
        <div class="zx-progress-track">
          <div id="mineru-progress-bar" class="zx-progress-bar" data-status="pending" style="width:5%;"></div>
        </div>
      </div>
    `;
        document.body.appendChild(progressOverlay);
        progressOverlay.querySelector('#mineru-progress-close').addEventListener('click', closeProgressPanel);
    }

    function updateProgress(status, text, percent = 0) {
        if (!progressOverlay) return;
        const row = progressOverlay.querySelector('#mineru-status-row');
        const bar = progressOverlay.querySelector('#mineru-progress-bar');
        const txt = progressOverlay.querySelector('#mineru-status-text');

        txt.textContent = text;
        bar.style.width = percent + '%';
        bar.dataset.status = status;
        row.dataset.status = status;

        const statusIcon = status === 'done' ? ICONS.check
            : status === 'error' ? ICONS.alert
            : ICONS.spinner;
        row.querySelector('svg')?.remove();
        row.insertAdjacentHTML('afterbegin', statusIcon);
    }

    function closeProgressPanel() {
        if (progressOverlay) {
            progressOverlay.remove();
            progressOverlay = null;
        }
    }

    // ── 结果弹窗（解析完成）──────────────────────────────────────────────────────
    function showResultPanel(arxivId, zipUrl, taskId) {
        const overlay = document.createElement('div');
        overlay.id = 'mineru-result';
        overlay.className = 'zx-overlay';
        overlay.innerHTML = `
      <div class="zx-card">
        <div class="zx-header">
          <span class="zx-header-icon" style="color:var(--zx-teal);">${ICONS.check}</span>
          <span class="zx-header-title">解析完成</span>
          <button class="zx-close" id="mineru-result-close">${ICONS.close}</button>
        </div>

        <div class="zx-desc">
          论文 <strong>${arxivId}</strong> 已成功转换为 Markdown。
          ZIP 包内含 full.md（正文）、JSON 结构化数据及图片。
        </div>

        <div class="zx-link-col">
          <a href="${zipUrl}" target="_blank" download class="zx-btn zx-btn-primary">
            ${ICONS.download} 下载 ZIP 结果包
          </a>
          <button id="mineru-copy-url" class="zx-btn zx-btn-ghost">
            ${ICONS.copy} 复制下载链接
          </button>
          <button id="mineru-open-mineru" class="zx-btn zx-btn-ghost">
            ${ICONS.alphaxiv} 在 MinerU 网页查看
          </button>
        </div>

        <div class="zx-task-id">Task ID: <code>${taskId}</code></div>
      </div>
    `;
        document.body.appendChild(overlay);

        const close = () => overlay.remove();
        overlay.querySelector('#mineru-result-close').addEventListener('click', close);
        overlay.addEventListener('click', (e) => {
            if (e.target === overlay) close();
        });

        overlay.querySelector('#mineru-copy-url').addEventListener('click', () => {
            navigator.clipboard.writeText(zipUrl).then(() => {
                const btn = overlay.querySelector('#mineru-copy-url');
                const old = btn.innerHTML;
                btn.innerHTML = `${ICONS.check} 已复制`;
                setTimeout(() => (btn.innerHTML = old), 1500);
            });
        });

        overlay.querySelector('#mineru-open-mineru').addEventListener('click', () => {
            window.open('https://mineru.net/apiManage/task', '_blank');
        });
    }
})();