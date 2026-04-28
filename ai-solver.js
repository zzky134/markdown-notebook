/**
 * AI 解题助手模块
 * 纯前端实现，支持多厂商模型选择，OpenAI 兼容接口
 * 使用公共跨域代理解决 CORS 问题
 *
 * @module AISolver
 * @version 1.0.0
 */

// ============================================
// 厂商配置
// ============================================

/**
 * 支持的 AI 厂商配置
 * 每个厂商包含：显示名称、baseURL、模型列表
 */
const AI_PROVIDERS = {
    zhipu: {
        name: '智谱 GLM',
        baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
        models: ['glm-4-flash', 'glm-4', 'glm-3-turbo']
    },
    deepseek: {
        name: 'DeepSeek',
        baseUrl: 'https://api.deepseek.com/v1',
        models: ['deepseek-chat', 'deepseek-reasoner']
    },
    qwen: {
        name: '通义千问',
        baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1',
        models: ['qwen-turbo', 'qwen-plus', 'qwen-max']
    },
    qianfan: {
        name: '百度千帆',
        baseUrl: 'https://qianfan.baidubce.com/v2',
        models: ['ernie-speed', 'ernie-3.5', 'ernie-4.0']
    },
    doubao: {
        name: '字节豆包',
        baseUrl: 'https://ark.cn-beijing.volces.com/api/v3',
        models: ['doubao-lite-4k', 'doubao-pro-4k']
    },
    moonshot: {
        name: 'Kimi 月之暗面',
        baseUrl: 'https://api.moonshot.cn/v1',
        models: ['moonshot-v1-8k', 'moonshot-v1-32k', 'kimi-k2.5']
    },
    hunyuan: {
        name: '腾讯混元',
        baseUrl: 'https://api.hunyuan.cloud.tencent.com/v1',
        models: ['hunyuan-standard', 'hunyuan-pro']
    },
    minimax: {
        name: 'MiniMax',
        baseUrl: 'https://api.minimaxi.com/v1',
        models: ['minimax-m2.5-chat', 'minimax-m2.7-lightning']
    }
};

/**
 * 公共跨域代理前缀
 * 用于解决浏览器 CORS 跨域限制
 */
const CORS_PROXY = 'https://corsproxy.io/?';

// ============================================
// 系统提示词
// ============================================

/**
 * 数学/理科解题专用系统提示词
 * 指导模型以清晰的步骤解答问题
 */
const SYSTEM_PROMPT = `你是一位专业的解题助手，擅长解答数学、物理、化学等理科问题。

**解题要求：**
1. **准确理解题意**：仔细分析题目中的所有条件和数字
2. **清晰展示步骤**：按逻辑顺序展示完整的解题过程
3. **公式规范**：使用标准 LaTeX 格式书写数学公式
4. **最终答案**：明确给出最终答案

**输出格式：**
- 使用 Markdown 格式
- 数学公式用 $...$（行内）或 $$...$$（块级）包裹
- 关键步骤用编号列出
- 最后单独标注【答案】`;

// ============================================
// 状态管理
// ============================================

/**
 * 解题模块状态
 */
const SolverState = {
    isLoading: false,
    currentProvider: 'moonshot',
    currentModel: 'kimi-k2.5',
    abortController: null
};

/**
 * 本地存储键名
 */
const STORAGE_KEY = 'ai-solver-config';

// ============================================
// 核心功能类
// ============================================

/**
 * AI 解题助手类
 */
class AISolver {
    constructor() {
        this.state = SolverState;
        this.providers = AI_PROVIDERS;
    }

    /**
     * 获取指定厂商配置
     * @param {string} providerKey - 厂商标识
     * @returns {Object} 厂商配置
     */
    getProvider(providerKey) {
        return this.providers[providerKey] || this.providers.moonshot;
    }

    /**
     * 获取当前厂商配置
     * @returns {Object} 当前厂商配置
     */
    getCurrentProvider() {
        return this.getProvider(this.state.currentProvider);
    }

    /**
     * 设置当前厂商和模型
     * @param {string} provider - 厂商标识
     * @param {string} model - 模型名称
     */
    setProvider(provider, model) {
        this.state.currentProvider = provider;
        this.state.currentModel = model || this.providers[provider]?.models[0];
    }

    /**
     * 构建请求 URL（带跨域代理）
     * @param {string} baseUrl - 厂商 baseURL
     * @returns {string} 完整的请求 URL
     */
    buildRequestUrl(baseUrl) {
        return `${CORS_PROXY}${encodeURIComponent(baseUrl + '/chat/completions')}`;
    }

    /**
     * 构建请求头
     * @param {string} apiKey - 用户 API Key
     * @returns {Object} 请求头
     */
    buildHeaders(apiKey) {
        return {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        };
    }

    /**
     * 构建请求体
     * @param {string} question - 用户问题
     * @returns {Object} 请求体
     */
    buildRequestBody(question) {
        return {
            model: this.state.currentModel,
            messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                { role: 'user', content: question }
            ],
            stream: true,
            temperature: 0.7,
            max_tokens: 4096
        };
    }

    /**
     * 解析错误信息
     * @param {Response} response - fetch 响应对象
     * @param {Object} errorData - 错误数据
     * @returns {string} 友好的错误信息
     */
    parseError(response, errorData) {
        const status = response.status;

        // 401 - API Key 错误
        if (status === 401) {
            return 'API Key 错误或已失效，请检查输入的 API Key';
        }

        // 403 - 权限不足
        if (status === 403) {
            return 'API Key 权限不足，无法访问该模型';
        }

        // 429 - 限流
        if (status === 429) {
            return '请求过于频繁，请稍后再试（429 限流）';
        }

        // 402 / 额度不足
        if (status === 402 || errorData?.error?.code === 'insufficient_quota') {
            return '账户额度不足，请充值后再试';
        }

        // 从错误数据中提取信息
        const message = errorData?.error?.message
            || errorData?.error?.code
            || errorData?.message
            || `HTTP ${status}`;

        return `请求失败: ${message}`;
    }

    /**
     * 发送解题请求（流式输出）
     * @param {string} question - 用户问题
     * @param {string} apiKey - 用户 API Key
     * @param {Function} onChunk - 流式输出回调 (chunk: string) => void
     * @param {Function} onError - 错误回调 (error: string) => void
     * @param {Function} onComplete - 完成回调 () => void
     */
    async solve(question, apiKey, onChunk, onError, onComplete) {
        if (this.state.isLoading) {
            onError('正在处理中，请稍候...');
            return;
        }

        if (!question.trim()) {
            onError('请输入问题');
            return;
        }

        if (!apiKey.trim()) {
            onError('请输入 API Key');
            return;
        }

        this.state.isLoading = true;

        const provider = this.getCurrentProvider();
        const url = this.buildRequestUrl(provider.baseUrl);
        const headers = this.buildHeaders(apiKey);
        const body = this.buildRequestBody(question);

        // 创建 AbortController 用于超时控制
        this.state.abortController = new AbortController();
        const timeoutId = setTimeout(() => {
            this.state.abortController.abort();
        }, 120000); // 120秒超时

        try {
            const response = await fetch(url, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(body),
                signal: this.state.abortController.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                throw new Error(this.parseError(response, errorData));
            }

            // 处理流式响应
            const reader = response.body.getReader();
            const decoder = new TextDecoder();
            let fullAnswer = '';

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                const lines = chunk.split('\n');

                for (const line of lines) {
                    if (line.trim() === '') continue;
                    if (line.trim() === 'data: [DONE]') continue;
                    if (!line.startsWith('data: ')) continue;

                    try {
                        const data = JSON.parse(line.slice(6));
                        const content = data.choices?.[0]?.delta?.content;

                        if (content) {
                            fullAnswer += content;
                            onChunk(fullAnswer);
                        }
                    } catch (e) {
                        // 忽略解析错误，继续处理下一行
                    }
                }
            }

            onComplete();

        } catch (error) {
            clearTimeout(timeoutId);

            if (error.name === 'AbortError') {
                onError('请求超时，请检查网络或稍后重试');
            } else if (error.message?.includes('fetch') || error.message?.includes('network')) {
                onError('网络连接失败，请检查网络后重试');
            } else {
                onError(error.message || '请求失败，请稍后重试');
            }
        } finally {
            this.state.isLoading = false;
            this.state.abortController = null;
        }
    }

    /**
     * 中止当前请求
     */
    abort() {
        if (this.state.abortController) {
            this.state.abortController.abort();
            this.state.abortController = null;
        }
    }
}

// ============================================
// UI 控制器
// ============================================

/**
 * AI 解题助手 UI 控制器
 */
class AISolverUI {
    constructor(solver) {
        this.solver = solver;
        this.elements = {};
        this.currentAnswer = '';
    }

    /**
     * 初始化 UI
     */
    init() {
        this.createUI();
        this.bindElements();
        this.bindEvents();
        this.loadSavedConfig();
        this.renderProviderOptions();
        this.renderModelOptions();
    }

    /**
     * 从本地存储加载配置
     */
    loadSavedConfig() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                const config = JSON.parse(saved);
                // 恢复厂商和模型
                if (config.provider && AI_PROVIDERS[config.provider]) {
                    this.solver.setProvider(config.provider, config.model);
                    this.elements.provider.value = config.provider;
                    this.renderModelOptions();
                    if (config.model) {
                        this.elements.model.value = config.model;
                    }
                }
                // 恢复 API Key
                if (config.apiKey) {
                    this.elements.apiKey.value = config.apiKey;
                }
            }
        } catch (e) {
            console.error('加载配置失败:', e);
        }
    }

    /**
     * 保存配置到本地存储
     */
    saveConfig() {
        try {
            const config = {
                provider: this.elements.provider.value,
                model: this.elements.model.value,
                apiKey: this.elements.apiKey.value
            };
            localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
        } catch (e) {
            console.error('保存配置失败:', e);
        }
    }

    /**
     * 创建 UI 结构
     */
    createUI() {
        // 检查是否已存在
        if (document.getElementById('ai-solver-container')) return;

        const container = document.createElement('div');
        container.id = 'ai-solver-container';
        container.innerHTML = `
            <style>
                /* AI 解题助手样式 */
                .ai-solver {
                    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                    max-width: 800px;
                    margin: 0 auto;
                    padding: 20px;
                    background: #fff;
                    border-radius: 12px;
                    box-shadow: 0 2px 12px rgba(0,0,0,0.1);
                }

                .ai-solver-header {
                    display: flex;
                    align-items: center;
                    gap: 10px;
                    margin-bottom: 20px;
                    padding-bottom: 15px;
                    border-bottom: 1px solid #e5e7eb;
                }

                .ai-solver-header h2 {
                    margin: 0;
                    font-size: 20px;
                    color: #1f2937;
                }

                .ai-solver-badge {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                    padding: 4px 10px;
                    border-radius: 12px;
                    font-size: 12px;
                    font-weight: 500;
                }

                .ai-solver-config {
                    display: grid;
                    grid-template-columns: 1fr 1fr;
                    gap: 12px;
                    margin-bottom: 16px;
                }

                @media (max-width: 640px) {
                    .ai-solver-config {
                        grid-template-columns: 1fr;
                    }
                }

                .ai-solver-field {
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                }

                .ai-solver-field label {
                    font-size: 13px;
                    font-weight: 500;
                    color: #4b5563;
                }

                .ai-solver-field select,
                .ai-solver-field input {
                    padding: 10px 12px;
                    border: 1px solid #d1d5db;
                    border-radius: 8px;
                    font-size: 14px;
                    background: #fff;
                    transition: border-color 0.2s, box-shadow 0.2s;
                }

                .ai-solver-field select:focus,
                .ai-solver-field input:focus {
                    outline: none;
                    border-color: #667eea;
                    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
                }

                .ai-solver-apikey {
                    position: relative;
                }

                .ai-solver-apikey input {
                    width: 100%;
                    padding-right: 80px;
                    font-family: monospace;
                }

                .ai-solver-apikey-actions {
                    position: absolute;
                    right: 8px;
                    top: 50%;
                    transform: translateY(-50%);
                    display: flex;
                    gap: 4px;
                }

                .ai-solver-toggle-key,
                .ai-solver-save-key {
                    background: none;
                    border: none;
                    cursor: pointer;
                    color: #6b7280;
                    padding: 4px;
                    border-radius: 4px;
                    transition: all 0.2s;
                }

                .ai-solver-toggle-key:hover,
                .ai-solver-save-key:hover {
                    background: #f3f4f6;
                    color: #374151;
                }

                .ai-solver-save-key.saved {
                    color: #10b981;
                }

                .ai-solver-question {
                    margin-bottom: 16px;
                }

                .ai-solver-question textarea {
                    width: 100%;
                    min-height: 120px;
                    padding: 12px;
                    border: 1px solid #d1d5db;
                    border-radius: 8px;
                    font-size: 15px;
                    line-height: 1.6;
                    resize: vertical;
                    font-family: inherit;
                    box-sizing: border-box;
                }

                .ai-solver-question textarea:focus {
                    outline: none;
                    border-color: #667eea;
                    box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
                }

                .ai-solver-question textarea::placeholder {
                    color: #9ca3af;
                }

                .ai-solver-actions {
                    display: flex;
                    gap: 10px;
                    margin-bottom: 16px;
                }

                .ai-solver-btn {
                    padding: 12px 24px;
                    border: none;
                    border-radius: 8px;
                    font-size: 15px;
                    font-weight: 500;
                    cursor: pointer;
                    transition: all 0.2s;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }

                .ai-solver-btn-primary {
                    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                    color: white;
                }

                .ai-solver-btn-primary:hover:not(:disabled) {
                    transform: translateY(-1px);
                    box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
                }

                .ai-solver-btn-primary:disabled {
                    opacity: 0.6;
                    cursor: not-allowed;
                }

                .ai-solver-btn-secondary {
                    background: #f3f4f6;
                    color: #4b5563;
                }

                .ai-solver-btn-secondary:hover:not(:disabled) {
                    background: #e5e7eb;
                }

                .ai-solver-btn-secondary:disabled {
                    opacity: 0.5;
                    cursor: not-allowed;
                }

                .ai-solver-loading {
                    display: none;
                    align-items: center;
                    gap: 8px;
                    color: #6b7280;
                    font-size: 14px;
                    margin-bottom: 16px;
                }

                .ai-solver-loading.active {
                    display: flex;
                }

                .ai-solver-spinner {
                    width: 16px;
                    height: 16px;
                    border: 2px solid #e5e7eb;
                    border-top-color: #667eea;
                    border-radius: 50%;
                    animation: ai-solver-spin 1s linear infinite;
                }

                @keyframes ai-solver-spin {
                    to { transform: rotate(360deg); }
                }

                .ai-solver-error {
                    display: none;
                    padding: 12px 16px;
                    background: #fef2f2;
                    border: 1px solid #fecaca;
                    border-radius: 8px;
                    color: #dc2626;
                    font-size: 14px;
                    margin-bottom: 16px;
                }

                .ai-solver-error.active {
                    display: block;
                }

                .ai-solver-result {
                    display: none;
                    border: 1px solid #e5e7eb;
                    border-radius: 8px;
                    background: #f9fafb;
                }

                .ai-solver-result.active {
                    display: block;
                }

                .ai-solver-result-header {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    padding: 12px 16px;
                    border-bottom: 1px solid #e5e7eb;
                    background: #fff;
                    border-radius: 8px 8px 0 0;
                }

                .ai-solver-result-title {
                    font-weight: 600;
                    color: #1f2937;
                    display: flex;
                    align-items: center;
                    gap: 6px;
                }

                .ai-solver-copy {
                    background: none;
                    border: none;
                    color: #6b7280;
                    cursor: pointer;
                    padding: 4px 8px;
                    border-radius: 4px;
                    font-size: 13px;
                    transition: all 0.2s;
                }

                .ai-solver-copy:hover {
                    background: #f3f4f6;
                    color: #374151;
                }

                .ai-solver-answer {
                    padding: 16px;
                    line-height: 1.8;
                    color: #1f2937;
                    font-size: 15px;
                }

                .ai-solver-answer p {
                    margin: 0 0 12px 0;
                }

                .ai-solver-answer p:last-child {
                    margin-bottom: 0;
                }

                .ai-solver-answer code {
                    background: #f3f4f6;
                    padding: 2px 6px;
                    border-radius: 4px;
                    font-family: 'Consolas', 'Monaco', monospace;
                    font-size: 14px;
                }

                .ai-solver-answer pre {
                    background: #1f2937;
                    color: #e5e7eb;
                    padding: 16px;
                    border-radius: 8px;
                    overflow-x: auto;
                    font-family: 'Consolas', 'Monaco', monospace;
                    font-size: 14px;
                    line-height: 1.5;
                }

                .ai-solver-answer pre code {
                    background: none;
                    padding: 0;
                }

                .ai-solver-answer ul,
                .ai-solver-answer ol {
                    margin: 12px 0;
                    padding-left: 24px;
                }

                .ai-solver-answer li {
                    margin: 6px 0;
                }

                .ai-solver-answer strong {
                    color: #111827;
                }

                .ai-solver-cursor {
                    display: inline-block;
                    width: 2px;
                    height: 1.2em;
                    background: #667eea;
                    animation: ai-solver-blink 1s step-end infinite;
                    vertical-align: middle;
                    margin-left: 2px;
                }

                @keyframes ai-solver-blink {
                    50% { opacity: 0; }
                }

                .ai-solver-tips {
                    margin-top: 16px;
                    padding: 12px;
                    background: #eff6ff;
                    border-radius: 8px;
                    font-size: 13px;
                    color: #4b5563;
                }

                .ai-solver-tips strong {
                    color: #1e40af;
                }
            </style>

            <div class="ai-solver">
                <div class="ai-solver-header">
                    <h2>AI 解题助手</h2>
                    <span class="ai-solver-badge">多模型支持</span>
                </div>

                <div class="ai-solver-config">
                    <div class="ai-solver-field">
                        <label for="ai-solver-provider">选择厂商</label>
                        <select id="ai-solver-provider">
                            <!-- 动态填充 -->
                        </select>
                    </div>
                    <div class="ai-solver-field">
                        <label for="ai-solver-model">选择模型</label>
                        <select id="ai-solver-model">
                            <!-- 动态填充 -->
                        </select>
                    </div>
                </div>

                <div class="ai-solver-field ai-solver-apikey" style="margin-bottom: 16px;">
                    <label for="ai-solver-apikey">API Key <span style="font-weight: normal; color: #9ca3af;">(本地保存)</span></label>
                    <input type="password" id="ai-solver-apikey" placeholder="请输入您的 API Key">
                    <div class="ai-solver-apikey-actions">
                        <button class="ai-solver-toggle-key" id="ai-solver-toggle-key" title="显示/隐藏">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                <circle cx="12" cy="12" r="3"></circle>
                            </svg>
                        </button>
                        <button class="ai-solver-save-key" id="ai-solver-save-key" title="保存到本地">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path>
                                <polyline points="17 21 17 13 7 13 7 21"></polyline>
                                <polyline points="7 3 7 8 15 8"></polyline>
                            </svg>
                        </button>
                    </div>
                </div>

                <div class="ai-solver-question">
                    <textarea id="ai-solver-question" placeholder="请输入您的问题，例如：&#10;求解方程：2x² + 3x - 5 = 0&#10;&#10;或粘贴题目内容..."></textarea>
                </div>

                <div class="ai-solver-actions">
                    <button class="ai-solver-btn ai-solver-btn-primary" id="ai-solver-send">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <line x1="22" y1="2" x2="11" y2="13"></line>
                            <polygon points="22 2 15 22 11 13 2 9 22 2"></polygon>
                        </svg>
                        发送问题
                    </button>
                    <button class="ai-solver-btn ai-solver-btn-secondary" id="ai-solver-stop" disabled>
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <rect x="6" y="6" width="12" height="12" rx="2"></rect>
                        </svg>
                        停止生成
                    </button>
                </div>

                <div class="ai-solver-loading" id="ai-solver-loading">
                    <div class="ai-solver-spinner"></div>
                    <span>正在思考中...</span>
                </div>

                <div class="ai-solver-error" id="ai-solver-error"></div>

                <div class="ai-solver-result" id="ai-solver-result">
                    <div class="ai-solver-result-header">
                        <span class="ai-solver-result-title">
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#10b981" stroke-width="2">
                                <polyline points="20 6 9 17 4 12"></polyline>
                            </svg>
                            解答结果
                        </span>
                        <button class="ai-solver-copy" id="ai-solver-copy">复制答案</button>
                    </div>
                    <div class="ai-solver-answer" id="ai-solver-answer"></div>
                </div>

                <div class="ai-solver-tips">
                    <strong>提示：</strong>本工具纯前端运行，API Key 仅保存在本地浏览器中，不会上传到任何服务器。建议使用自己的 API Key。
                </div>
            </div>
        `;

        document.body.appendChild(container);
    }

    /**
     * 绑定 DOM 元素
     */
    bindElements() {
        this.elements = {
            container: document.getElementById('ai-solver-container'),
            provider: document.getElementById('ai-solver-provider'),
            model: document.getElementById('ai-solver-model'),
            apiKey: document.getElementById('ai-solver-apikey'),
            toggleKey: document.getElementById('ai-solver-toggle-key'),
            saveKey: document.getElementById('ai-solver-save-key'),
            question: document.getElementById('ai-solver-question'),
            sendBtn: document.getElementById('ai-solver-send'),
            stopBtn: document.getElementById('ai-solver-stop'),
            loading: document.getElementById('ai-solver-loading'),
            error: document.getElementById('ai-solver-error'),
            result: document.getElementById('ai-solver-result'),
            answer: document.getElementById('ai-solver-answer'),
            copyBtn: document.getElementById('ai-solver-copy')
        };
    }

    /**
     * 绑定事件处理
     */
    bindEvents() {
        // 厂商切换
        this.elements.provider?.addEventListener('change', () => {
            this.handleProviderChange();
            this.saveConfig();
        });

        // 模型切换
        this.elements.model?.addEventListener('change', () => {
            this.saveConfig();
        });

        // API Key 显示/隐藏
        this.elements.toggleKey?.addEventListener('click', () => {
            const type = this.elements.apiKey.type;
            this.elements.apiKey.type = type === 'password' ? 'text' : 'password';
        });

        // API Key 保存按钮
        this.elements.saveKey?.addEventListener('click', () => {
            this.saveConfig();
            this.showSaveFeedback();
        });

        // API Key 输入时自动保存（防抖）
        let saveTimeout;
        this.elements.apiKey?.addEventListener('input', () => {
            clearTimeout(saveTimeout);
            saveTimeout = setTimeout(() => {
                this.saveConfig();
            }, 1000);
        });

        // 发送按钮
        this.elements.sendBtn?.addEventListener('click', () => {
            this.handleSend();
        });

        // 停止按钮
        this.elements.stopBtn?.addEventListener('click', () => {
            this.handleStop();
        });

        // 复制按钮
        this.elements.copyBtn?.addEventListener('click', () => {
            this.handleCopy();
        });

        // 回车发送（Ctrl+Enter）
        this.elements.question?.addEventListener('keydown', (e) => {
            if (e.ctrlKey && e.key === 'Enter') {
                this.handleSend();
            }
        });
    }

    /**
     * 显示保存成功反馈
     */
    showSaveFeedback() {
        const btn = this.elements.saveKey;
        if (!btn) return;

        btn.classList.add('saved');
        const originalTitle = btn.title;
        btn.title = '已保存!';

        setTimeout(() => {
            btn.classList.remove('saved');
            btn.title = originalTitle;
        }, 1500);
    }

    /**
     * 渲染厂商选项
     */
    renderProviderOptions() {
        const select = this.elements.provider;
        if (!select) return;

        select.innerHTML = Object.entries(this.solver.providers)
            .map(([key, provider]) =>
                `<option value="${key}" ${key === this.solver.state.currentProvider ? 'selected' : ''}>${provider.name}</option>`
            )
            .join('');
    }

    /**
     * 渲染模型选项
     */
    renderModelOptions() {
        const select = this.elements.model;
        if (!select) return;

        const provider = this.solver.getCurrentProvider();
        select.innerHTML = provider.models
            .map(model =>
                `<option value="${model}" ${model === this.solver.state.currentModel ? 'selected' : ''}>${model}</option>`
            )
            .join('');
    }

    /**
     * 处理厂商切换
     */
    handleProviderChange() {
        const provider = this.elements.provider.value;
        this.solver.setProvider(provider, null);
        this.renderModelOptions();
    }

    /**
     * 处理发送请求
     */
    handleSend() {
        const question = this.elements.question.value;
        const apiKey = this.elements.apiKey.value;
        const provider = this.elements.provider.value;
        const model = this.elements.model.value;

        // 更新当前配置
        this.solver.setProvider(provider, model);

        // 清空之前的结果
        this.hideError();
        this.elements.result.classList.remove('active');
        this.currentAnswer = '';

        // 显示加载状态
        this.elements.loading.classList.add('active');
        this.elements.sendBtn.disabled = true;
        this.elements.stopBtn.disabled = false;

        // 发送请求
        this.solver.solve(
            question,
            apiKey,
            (chunk) => this.onChunk(chunk),
            (error) => this.onError(error),
            () => this.onComplete()
        );
    }

    /**
     * 处理停止生成
     */
    handleStop() {
        this.solver.abort();
        this.elements.stopBtn.disabled = true;
    }

    /**
     * 处理复制
     */
    async handleCopy() {
        if (!this.currentAnswer) return;

        try {
            await navigator.clipboard.writeText(this.currentAnswer);
            const originalText = this.elements.copyBtn.textContent;
            this.elements.copyBtn.textContent = '已复制!';
            setTimeout(() => {
                this.elements.copyBtn.textContent = originalText;
            }, 2000);
        } catch (err) {
            // 备用方案
            const textarea = document.createElement('textarea');
            textarea.value = this.currentAnswer;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
        }
    }

    /**
     * 流式输出回调
     */
    onChunk(chunk) {
        this.currentAnswer = chunk;
        this.elements.result.classList.add('active');
        this.elements.answer.innerHTML = this.formatAnswer(chunk) + '<span class="ai-solver-cursor"></span>';
        this.renderMath();
    }

    /**
     * 错误回调
     */
    onError(error) {
        this.elements.loading.classList.remove('active');
        this.elements.sendBtn.disabled = false;
        this.elements.stopBtn.disabled = true;
        this.showError(error);
    }

    /**
     * 完成回调
     */
    onComplete() {
        this.elements.loading.classList.remove('active');
        this.elements.sendBtn.disabled = false;
        this.elements.stopBtn.disabled = true;
        // 移除光标
        const cursor = this.elements.answer.querySelector('.ai-solver-cursor');
        if (cursor) cursor.remove();
    }

    /**
     * 格式化答案（简单的 Markdown 转换）
     */
    formatAnswer(text) {
        // HTML 转义
        let html = this.escapeHtml(text);

        // 代码块
        html = html.replace(/```([\s\S]*?)```/g, '<pre><code>$1</code></pre>');

        // 行内代码
        html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

        // 加粗
        html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

        // 斜体
        html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

        // 标题
        html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
        html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
        html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

        // 列表
        html = html.replace(/^\s*[-*] (.+)$/gm, '<li>$1</li>');
        html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');
        html = html.replace(/<\/ul>\s*<ul>/g, '');

        // 数字列表
        html = html.replace(/^\s*\d+\. (.+)$/gm, '<li>$1</li>');

        // 换行
        html = html.replace(/\n/g, '<br>');

        return html;
    }

    /**
     * 渲染数学公式（如果页面有 KaTeX）
     */
    renderMath() {
        if (typeof katex === 'undefined') return;

        // 这里可以添加 KaTeX 渲染逻辑
        // 由于公式是流式输出的，建议最后统一渲染或手动处理
    }

    /**
     * HTML 转义
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * 显示错误
     */
    showError(message) {
        this.elements.error.textContent = message;
        this.elements.error.classList.add('active');
    }

    /**
     * 隐藏错误
     */
    hideError() {
        this.elements.error.classList.remove('active');
    }
}

// ============================================
// 初始化
// ============================================

// 创建全局实例
const aiSolver = new AISolver();
const aiSolverUI = new AISolverUI(aiSolver);

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    aiSolverUI.init();
});

// 导出到全局
window.aiSolver = aiSolver;
window.aiSolverUI = aiSolverUI;

console.log('AI Solver module loaded');
