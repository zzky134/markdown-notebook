/**
 * AI 答疑模块（云端 API 版本）
 * 基于 SiliconFlow / 通义千问 / 豆包等云端 API 实现问题解答功能
 *
 * @module AIQAGenerator
 * @version 2.1.0
 * @author Claude Code
 *
 * ============================================
 * ⚠️ 安全提示：API Key 配置
 * ============================================
 * 1. 不要在代码中直接提交 API Key 到公开仓库！
 * 2. 建议方案：
 *    - 本地开发：使用环境变量或本地配置文件（已添加到 .gitignore）
 *    - 生产部署：通过构建工具注入或使用服务端代理
 * 3. 当前配置：请在下方 AI_CONFIG 中配置您的 API Key
 */

// ============================================
// 配置常量
// ============================================

/**
 * ============================================
 * API 配置
 * ============================================
 *
 * 支持多个 API 提供商，按需切换
 */
const AI_CONFIG = {
    // ============================================
    // 【重要】API Key 配置
    // ============================================
    // 方式1：直接填写（仅本地测试，不要提交到仓库！）
    // 方式2：从环境变量读取（推荐）
    API_KEY: typeof process !== 'undefined' && process.env?.MINIMAX_API_KEY
        ? process.env.MINIMAX_API_KEY
        : 'sk-cp-IsU-GMv7b8pGt95njiryHB4HoVAFd8M9SuDtcH9mS27Q66AQccgSJDNKeys9F2b3PzWg_xNJYfaMO3YHXVdBK1ZFvY-vUD9ZVaIvj-DR2ktEGDGPhgTLElg', // <-- 修改这里

    // ============================================
    // 选择 API 提供商
    // ============================================
    // 可选值: 'siliconflow' | 'qwen' | 'doubao' | 'moonshot' | 'minimax'
    PROVIDER: 'minimax',

    // ============================================
    // 模型配置
    // ============================================
    MODELS: {
        // 硅基流动 (SiliconFlow) - 推荐
        // 模型列表: https://siliconflow.cn/models
        siliconflow: {
            // 可选模型：
            // - 'Qwen/Qwen2.5-7B-Instruct' (推荐，性价比高)
            // - 'Qwen/Qwen2.5-14B-Instruct' (更强推理)
            // - 'meta-llama/Llama-3.3-70B-Instruct' (最强效果)
            // - 'deepseek-ai/DeepSeek-V2.5' (DeepSeek)
            model: 'Qwen/Qwen2.5-7B-Instruct',
            apiUrl: 'https://api.siliconflow.cn/v1/chat/completions',
            maxTokens: 2048,
            temperature: 0.7
        },

        // 通义千问 (阿里云)
        // 文档: https://help.aliyun.com/zh/dashscope/
        qwen: {
            model: 'qwen-turbo',  // 或 'qwen-plus', 'qwen-max'
            apiUrl: 'https://dashscope.aliyuncs.com/api/v1/services/aigc/text-generation/generation',
            maxTokens: 2048,
            temperature: 0.7
        },

        // 豆包 (字节跳动)
        // 文档: https://www.volcengine.com/docs/82379
        doubao: {
            model: 'doubao-lite-4k',  // 或 'doubao-pro-4k'
            apiUrl: 'https://ark.cn-beijing.volces.com/api/v3/chat/completions',
            maxTokens: 2048,
            temperature: 0.7
        },

        // Moonshot (Kimi)
        // 文档: https://platform.moonshot.cn/docs/api/chat
        moonshot: {
            model: 'kimi-k2.5',  // Kimi K2.5 模型
            apiUrl: 'https://api.moonshot.cn/v1/chat/completions',
            maxTokens: 4096,
            temperature: 1  // K2.5 只支持 temperature = 1
        },

        // MiniMax
        // 文档: https://platform.minimaxi.com/document/ChatCompletion
        minimax: {
            model: 'MiniMax-M2.7',  // MiniMax M2.7 模型 (token plan)
            apiUrl: 'https://api.minimaxi.chat/v1/text/chatcompletion_v2',
            maxTokens: 2048,
            temperature: 0.7
        }
    },

    // ============================================
    // 生成参数
    // ============================================
    GENERATION_CONFIG: {
        temperature: 0.7,      // 创造性 vs 确定性平衡
        maxTokens: 2048,       // 最大生成 token 数
        topP: 0.9
    },

    // ============================================
    // 超时配置（毫秒）
    // ============================================
    TIMEOUT: {
        API_REQUEST: 60000     // API 请求超时：60秒
    },

    // ============================================
    // 防抖配置
    // ============================================
    DEBOUNCE_MS: 3000         // 生成按钮防抖时间
};

/**
 * ============================================
 * 系统提示词
 * ============================================
 * 指导模型回答用户问题，提供详细解答
 */
const SYSTEM_PROMPT = `你是一个专业的学习助手，擅长解答各类学科问题。请根据用户的问题提供详细、清晰的解答。

**重要规则（必须遵守）：**

1. **准确复述题目**：在【问题】中必须准确复述用户问题中的所有数字、条件和关键信息，严禁擅自修改任何数字
2. **直接回答**：首先给出问题的直接答案
3. **详细解释**：提供必要的背景知识、原理说明或推导过程
4. **结构化呈现**：使用清晰的结构组织答案，便于理解

**输出格式要求：**
- 【问题】准确复述用户的问题，包含所有原始数字和条件，不要概括或改写
- 【答案】详细解答内容
- 如果涉及多个要点，使用分点说明
- 数学/物理题需要展示完整的解题步骤

**示例1 - 数学问题：**
【问题】鸡兔同笼：10只动物28条腿，求鸡兔各几只？
【答案】
设鸡有x只，兔有y只
根据题意列方程组：
x + y = 10  （总头数）
2x + 4y = 28  （总腿数）

解得：
由①得 x = 10 - y
代入②：2(10-y) + 4y = 28
20 - 2y + 4y = 28
2y = 8
y = 4

所以：兔子4只，鸡6只

**示例2 - 概念解释：**
【问题】什么是光合作用？
【答案】
光合作用是绿色植物、藻类和某些细菌利用光能将二氧化碳和水转化为有机物并释放氧气的过程。

关键要点：
1. 场所：主要在叶绿体中进行
2. 条件：需要光能
3. 原料：CO₂ 和 H₂O
4. 产物：有机物（如葡萄糖）和 O₂
5. 意义：将光能转化为化学能储存，是生态系统能量流动的基础`;

/**
 * 构建用户提示词
 * @param {string} content - 用户输入的问题
 * @returns {string} 完整的用户提示词
 */
function buildUserPrompt(content) {
    return `请回答以下问题：

${content}

**重要提醒**：
1. 在【问题】中必须准确复述题目中的所有数字和条件，不要修改任何数字
2. 用【问题】和【答案】格式输出
3. 【答案】提供详细、完整的解答
4. 如果是理科题目，需要展示完整的解题步骤
5. 如果是概念性问题，需要解释清楚原理和背景`;
}

// ============================================
// 状态管理
// ============================================

/**
 * AI 生成器状态
 */
const AIState = {
    // 加载状态
    isLoading: false,

    // 是否已就绪（API Key 已配置）
    isReady: false,

    // 当前生成任务
    currentGeneration: null,

    // 初始化错误信息
    initError: null,

    // 上次请求时间（用于防抖）
    lastRequestTime: 0
};

// ============================================
// 核心功能类
// ============================================

/**
 * AI 知识卡片生成器类
 * 封装云端 API 调用功能
 */
class AICardGenerator {
    constructor() {
        this.state = AIState;
        this.config = AI_CONFIG;
        this.checkApiKey();
    }

    /**
     * 检查 API Key 是否已配置
     */
    checkApiKey() {
        const apiKey = this.config.API_KEY;
        if (!apiKey || apiKey === 'your-api-key-here' || apiKey.trim() === '') {
            this.state.isReady = false;
            this.state.initError = 'API Key 未配置，请在 ai-cards.js 中设置您的 API Key';
        } else {
            this.state.isReady = true;
            this.state.initError = null;
        }
    }

    /**
     * 获取当前提供商配置
     * @returns {Object} 当前选中的 API 配置
     */
    getProviderConfig() {
        const provider = this.config.PROVIDER;
        return this.config.MODELS[provider];
    }

    /**
     * 初始化 AI 引擎
     * 云端 API 无需加载模型，只需检查配置
     * @param {Function} onProgress - 进度回调函数 (progress: number, message: string) => void
     * @returns {Promise<boolean>} 初始化是否成功
     */
    async initialize(onProgress = null) {
        // 如果已经就绪，直接返回
        if (this.state.isReady) {
            return true;
        }

        // 如果正在加载中，等待加载完成
        if (this.state.isLoading) {
            return new Promise((resolve) => {
                const checkInterval = setInterval(() => {
                    if (!this.state.isLoading) {
                        clearInterval(checkInterval);
                        resolve(this.state.isReady);
                    }
                }, 100);
            });
        }

        this.state.isLoading = true;

        try {
            if (onProgress) {
                onProgress(50, '正在检查 API 配置...');
            }

            // 检查 API Key
            this.checkApiKey();

            if (!this.state.isReady) {
                throw new Error(this.state.initError);
            }

            if (onProgress) {
                onProgress(100, 'API 配置就绪');
            }

            return true;
        } catch (error) {
            this.state.initError = error.message;
            console.error('AI 引擎初始化失败:', error);
            throw error;
        } finally {
            this.state.isLoading = false;
        }
    }

    /**
     * 构建 API 请求体
     * @param {Array} messages - 消息数组
     * @returns {Object} 请求体
     */
    buildRequestBody(messages) {
        const provider = this.config.PROVIDER;
        const providerConfig = this.getProviderConfig();

        switch (provider) {
            case 'siliconflow':
            case 'doubao':
                // OpenAI 兼容格式
                return {
                    model: providerConfig.model,
                    messages: messages,
                    stream: true,
                    temperature: providerConfig.temperature,
                    max_tokens: providerConfig.maxTokens,
                    top_p: this.config.GENERATION_CONFIG.topP
                };

            case 'moonshot':
                // Moonshot (Kimi) 格式 - OpenAI 兼容
                return {
                    model: providerConfig.model,
                    messages: messages,
                    stream: false,
                    temperature: providerConfig.temperature,
                    max_tokens: providerConfig.maxTokens
                };

            case 'qwen':
                // 通义千问格式
                return {
                    model: providerConfig.model,
                    input: {
                        messages: messages
                    },
                    parameters: {
                        temperature: providerConfig.temperature,
                        max_tokens: providerConfig.maxTokens,
                        top_p: this.config.GENERATION_CONFIG.topP,
                        result_format: 'message'
                    }
                };

            case 'minimax':
                // MiniMax 格式
                return {
                    model: providerConfig.model,
                    messages: messages,
                    stream: false,
                    temperature: providerConfig.temperature,
                    max_tokens: providerConfig.maxTokens
                };

            default:
                throw new Error(`不支持的 API 提供商: ${provider}`);
        }
    }

    /**
     * 构建请求头
     * @returns {Object} 请求头
     */
    buildHeaders() {
        const provider = this.config.PROVIDER;
        const apiKey = this.config.API_KEY;

        switch (provider) {
            case 'siliconflow':
            case 'doubao':
                return {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                };

            case 'qwen':
                return {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                };

            case 'moonshot':
                // Moonshot (Kimi) 使用 Bearer Token 认证
                return {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                };

            case 'minimax':
                // MiniMax 使用 Bearer Token 认证
                return {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                };

            default:
                throw new Error(`不支持的 API 提供商: ${provider}`);
        }
    }

    /**
     * 检查是否需要防抖
     * @returns {boolean} 是否需要阻止本次请求
     */
    checkDebounce() {
        const now = Date.now();
        const timeSinceLastRequest = now - this.state.lastRequestTime;

        if (timeSinceLastRequest < this.config.DEBOUNCE_MS) {
            const waitTime = Math.ceil((this.config.DEBOUNCE_MS - timeSinceLastRequest) / 1000);
            throw new Error(`请等待 ${waitTime} 秒后再试`);
        }

        this.state.lastRequestTime = now;
        return false;
    }

    /**
     * 生成问题答案
     * @param {string} content - 输入的问题
     * @param {Function} onToken - 流式输出回调 (token: string) => void
     * @returns {Promise<string>} 生成的原始文本
     */
    async generateAnswer(content, onToken = null) {
        // 检查防抖
        this.checkDebounce();

        // 确保已初始化
        if (!this.state.isReady) {
            throw new Error('AI 引擎尚未初始化，请检查 API Key 配置');
        }

        // 验证输入
        if (!content || content.trim().length === 0) {
            throw new Error('输入内容不能为空');
        }

        // 限制输入长度
        const maxLength = 8000;
        if (content.length > maxLength) {
            content = content.substring(0, maxLength) + '...';
        }

        // 构建消息
        const messages = [
            { role: 'system', content: SYSTEM_PROMPT },
            { role: 'user', content: buildUserPrompt(content) }
        ];

        const providerConfig = this.getProviderConfig();
        const requestBody = this.buildRequestBody(messages);
        const headers = this.buildHeaders();

        try {
            this.state.currentGeneration = true;

            // 创建 AbortController 用于超时控制
            const controller = new AbortController();
            const timeoutId = setTimeout(() => {
                controller.abort();
            }, this.config.TIMEOUT.API_REQUEST);

            const response = await fetch(providerConfig.apiUrl, {
                method: 'POST',
                headers: headers,
                body: JSON.stringify(requestBody),
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}));
                console.error('API error response:', errorData);
                const errorMsg = errorData.error?.message ||
                                errorData.base_resp?.status_msg ||
                                errorData.message ||
                                `HTTP ${response.status}`;
                throw new Error(`API 请求失败: ${errorMsg}`);
            }

            // 处理响应
            let fullResponse = '';
            const data = await response.json();
            console.log('API response:', data);

            // 检查 MiniMax 错误响应
            if (data.base_resp?.status_code !== 0 && data.base_resp?.status_code !== undefined) {
                throw new Error(`MiniMax API 错误: ${data.base_resp.status_msg} (code: ${data.base_resp.status_code})`);
            }

            console.log('API response keys:', Object.keys(data));
            console.log('data.base_resp:', data.base_resp);
            console.log('data.reply:', data.reply);

            // 通义千问格式
            if (data.output?.choices?.[0]?.message?.content) {
                fullResponse = data.output.choices[0].message.content;
            }
            // OpenAI / MiniMax / SiliconFlow 兼容格式
            else if (data.choices?.[0]?.message?.content) {
                fullResponse = data.choices[0].message.content;
            }
            // MiniMax 可能的另一种格式
            else if (data.choices?.[0]?.text) {
                fullResponse = data.choices[0].text;
            }
            // 如果 data 直接是字符串
            else if (typeof data === 'string') {
                fullResponse = data;
            }
            // 如果有 data.content
            else if (data.content) {
                fullResponse = data.content;
            }
            // 如果有 data.result
            else if (data.result) {
                fullResponse = data.result;
            }
            // 如果有 data.data.choices
            else if (data.data?.choices?.[0]?.message?.content) {
                fullResponse = data.data.choices[0].message.content;
            }

            console.log('Full response:', fullResponse); // 调试日志

            return fullResponse;

        } catch (error) {
            console.error('生成失败:', error);

            // 处理特定错误类型
            if (error.name === 'AbortError') {
                throw new Error('请求超时，请稍后重试');
            }
            if (error.message?.includes('fetch') || error.message?.includes('network')) {
                throw new Error('网络连接失败，请检查网络后重试');
            }

            throw error;
        } finally {
            this.state.currentGeneration = false;
        }
    }

    /**
     * 解析生成的文本为问答对象
     * @param {string} generatedText - AI 生成的原始文本
     * @returns {Object|null} 解析后的问答对象 {question: string, answer: string}
     */
    parseQAResult(generatedText) {
        if (!generatedText || generatedText.trim() === '') {
            console.log('parseQAResult: empty text');
            return null;
        }

        console.log('parseQAResult input:', generatedText.substring(0, 200));

        // 提取问题 - 支持多种格式
        const questionPatterns = [
            /【问题】\s*([^\n]+)/,
            /问题[:：]\s*([^\n]+)/,
            /Question[:：]\s*([^\n]+)/i,
            /^\s*Q[:：]\s*([^\n]+)/im
        ];

        // 提取答案 - 支持多种格式
        const answerPatterns = [
            /【答案】\s*([\s\S]+)$/,
            /答案[:：]\s*([\s\S]+)$/,
            /Answer[:：]\s*([\s\S]+)$/i,
            /A[:：]\s*([\s\S]+)$/im
        ];

        let question = null;
        let answer = null;

        for (const pattern of questionPatterns) {
            const match = generatedText.match(pattern);
            if (match) {
                question = match[1].trim();
                break;
            }
        }

        for (const pattern of answerPatterns) {
            const match = generatedText.match(pattern);
            if (match) {
                answer = match[1].trim();
                break;
            }
        }

        if (question && answer) {
            console.log('parseQAResult success:', { question: question.substring(0, 50), answer: answer.substring(0, 50) });
            return { question, answer };
        }

        console.log('parseQAResult: standard parse failed, trying fallback');
        // 如果标准格式解析失败，尝试备用解析
        return this.parseQAFallback(generatedText);
    }

    /**
     * 备用问答解析方法
     * 当标准格式解析失败时使用
     * @param {string} text - AI 生成的文本
     * @returns {Object|null} 解析后的问答对象
     */
    parseQAFallback(text) {
        console.log('parseQAFallback input:', text.substring(0, 200));

        // 清理文本
        let cleanedText = text
            .replace(/以下是[:：]?/gi, '')
            .replace(/^\s*["']?|["']?\s*$/g, '') // 去除首尾引号
            .trim();

        // 尝试匹配各种问题/答案格式（更宽松）
        const qaRegex = /(?:问题|Question)[:：]?\s*([^\n]+)(?:[\n\r]+)(?:答案|Answer|解答|解析)[:：]?\s*([\s\S]+)$/i;

        const match = cleanedText.match(qaRegex);
        if (match) {
            console.log('parseQAFallback: matched qaRegex');
            return {
                question: match[1].trim(),
                answer: match[2].trim()
            };
        }

        // 如果文本很长，可能是直接返回答案，用输入的问题
        if (cleanedText.length > 50) {
            console.log('parseQAFallback: using full text as answer');
            return {
                question: '问题（请查看答案）',
                answer: cleanedText
            };
        }

        // 如果还是失败，尝试简单分割
        const lines = cleanedText.split('\n').filter(l => l.trim());
        if (lines.length >= 2) {
            console.log('parseQAFallback: using line split');
            // 第一行作为问题，其余作为答案
            return {
                question: lines[0].replace(/^[\s\S]*?[:：]\s*/, '').trim() || '问题',
                answer: lines.slice(1).join('\n').trim()
            };
        }

        console.log('parseQAFallback: all methods failed');
        return null;
    }

    /**
     * 将问答转换为 Markdown 格式
     * @param {Object} qa - 问答对象 {question: string, answer: string}
     * @returns {string} Markdown 格式的问答文本
     */
    qaToMarkdown(qa) {
        if (!qa || !qa.question || !qa.answer) {
            return '';
        }

        return `:front:: ${qa.question}\n:back:: ${qa.answer}`;
    }

    /**
     * 释放资源
     * 云端 API 无需释放资源
     */
    async dispose() {
        // 云端 API 无需释放资源
        this.state.isReady = false;
    }

    /**
     * 获取当前状态
     * @returns {Object} 当前状态信息
     */
    getStatus() {
        return {
            isLoading: this.state.isLoading,
            isReady: this.state.isReady,
            hasError: !!this.state.initError,
            errorMessage: this.state.initError,
            provider: this.config.PROVIDER,
            model: this.getProviderConfig().model
        };
    }

    /**
     * 重置引擎状态
     */
    async reset() {
        this.state.isReady = false;
        this.state.isLoading = false;
        this.state.initError = null;
        this.state.currentGeneration = false;
        this.checkApiKey();
    }
}

// ============================================
// UI 控制器
// ============================================

/**
 * AI 卡片生成器 UI 控制器
 * 处理用户界面交互
 */
class AIQAGeneratorUI {
    constructor(aiGenerator) {
        this.ai = aiGenerator;
        this.elements = {};
        this.generatedQA = null;
    }

    /**
     * 初始化 UI
     * 绑定 DOM 元素和事件
     */
    init() {
        this.bindElements();
        this.bindEvents();
        this.updateUIState('idle');
    }

    /**
     * 绑定 DOM 元素
     */
    bindElements() {
        this.elements = {
            // 模态框
            modal: document.getElementById('aiCardModal'),

            // 输入区域
            inputArea: document.getElementById('aiCardInput'),
            generateBtn: document.getElementById('aiGenerateBtn'),

            // 状态显示
            statusArea: document.getElementById('aiStatusArea'),
            progressBar: document.getElementById('aiProgressBar'),
            statusText: document.getElementById('aiStatusText'),

            // 结果区域
            resultArea: document.getElementById('aiResultArea'),
            cardsContainer: document.getElementById('aiCardsContainer'),
            cardCount: document.getElementById('aiCardCount'),

            // 操作按钮
            insertBtn: document.getElementById('aiInsertBtn'),
            copyBtn: document.getElementById('aiCopyBtn'),
            regenerateBtn: document.getElementById('aiRegenerateBtn'),
            resetModelBtn: document.getElementById('aiResetModelBtn'),
            closeBtn: document.getElementById('aiCloseBtn')
        };
    }

    /**
     * 绑定事件处理
     */
    bindEvents() {
        // 生成按钮 - 使用防抖
        let generateTimeout = null;
        this.elements.generateBtn?.addEventListener('click', () => {
            if (generateTimeout) {
                this.showError('请稍后再试，防止重复请求');
                return;
            }

            this.handleGenerate();

            // 防抖
            this.elements.generateBtn.disabled = true;
            generateTimeout = setTimeout(() => {
                generateTimeout = null;
                this.updateGenerateButtonState();
            }, this.ai.config.DEBOUNCE_MS);
        });

        // 插入按钮
        this.elements.insertBtn?.addEventListener('click', () => {
            this.handleInsert();
        });

        // 复制按钮
        this.elements.copyBtn?.addEventListener('click', () => {
            this.handleCopy();
        });

        // 重新生成按钮
        this.elements.regenerateBtn?.addEventListener('click', () => {
            this.handleGenerate();
        });

        // 重置按钮（隐藏，云端 API 不需要）
        if (this.elements.resetModelBtn) {
            this.elements.resetModelBtn.style.display = 'none';
        }

        // 关闭按钮
        this.elements.closeBtn?.addEventListener('click', () => {
            this.closeModal();
        });

        // 点击模态框外部关闭
        this.elements.modal?.addEventListener('click', (e) => {
            if (e.target === this.elements.modal) {
                this.closeModal();
            }
        });

        // 输入框变化时更新按钮状态
        this.elements.inputArea?.addEventListener('input', () => {
            this.updateGenerateButtonState();
        });

        // ESC 键关闭
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isModalOpen()) {
                this.closeModal();
            }
        });
    }

    /**
     * 更新生成按钮状态
     */
    updateGenerateButtonState() {
        if (!this.elements.generateBtn) return;

        const hasContent = this.elements.inputArea?.value.trim().length > 0;
        const isProcessing = this.ai.state.isLoading || this.ai.state.currentGeneration;

        this.elements.generateBtn.disabled = !hasContent || isProcessing;
    }

    /**
     * 处理生成请求
     */
    async handleGenerate() {
        const content = this.elements.inputArea?.value.trim();

        if (!content) {
            this.showError('请输入问题');
            return;
        }

        try {
            this.updateUIState('loading');
            this.generatedQA = null;

            // 初始化 AI（检查配置）
            if (!this.ai.state.isReady) {
                console.log('开始初始化 AI 引擎...');
                await this.ai.initialize((progress, message) => {
                    console.log(`初始化进度: ${progress}% - ${message}`);
                    this.updateProgress(progress, message);
                });
                console.log('AI 引擎初始化完成');
            }

            this.updateProgress(30, '正在获取答案...');

            // 生成答案
            console.log('开始生成答案...');
            const result = await this.ai.generateAnswer(content, (token) => {
                // 流式输出回调
                console.log('生成 token:', token);
            });
            console.log('生成完成，原始结果:', result);

            this.updateProgress(80, '正在解析答案...');

            // 解析问答
            this.generatedQA = this.ai.parseQAResult(result);
            console.log('解析后的问答:', this.generatedQA);

            if (!this.generatedQA) {
                // 如果标准解析失败，尝试备用方法
                console.log('标准解析失败，尝试备用解析...');
                console.log('原始生成内容:', JSON.stringify(result));
                this.generatedQA = this.ai.parseQAFallback(result);

                if (!this.generatedQA) {
                    // 显示原始内容供用户查看
                    this.showRawResult(result);
                    return;
                }
            }

            this.updateProgress(100, '获取完成！');

            // 显示结果
            this.renderQA();
            this.updateUIState('success');

        } catch (error) {
            console.error('获取失败:', error);
            this.showError(error.message || '获取失败，请稍后重试');
            this.updateUIState('error');
        }
    }

    /**
     * 处理插入到编辑器
     */
    handleInsert() {
        if (!this.generatedQA) return;

        const markdown = this.ai.qaToMarkdown(this.generatedQA);

        // 调用全局 app 的插入功能
        if (window.app && typeof window.app.insertAICards === 'function') {
            window.app.insertAICards(markdown);
        } else {
            // 备用方案：直接操作编辑器
            const editor = document.getElementById('editor');
            if (editor) {
                const cursorPos = editor.selectionStart;
                const textBefore = editor.value.substring(0, cursorPos);
                const textAfter = editor.value.substring(cursorPos);
                editor.value = textBefore + '\n\n' + markdown + '\n\n' + textAfter;

                // 触发输入事件以更新预览
                editor.dispatchEvent(new Event('input', { bubbles: true }));
            }
        }

        this.showSuccess('已插入到笔记中');
        setTimeout(() => this.closeModal(), 500);
    }

    /**
     * 处理复制到剪贴板
     */
    async handleCopy() {
        if (!this.generatedQA) return;

        const markdown = this.ai.qaToMarkdown(this.generatedQA);

        try {
            await navigator.clipboard.writeText(markdown);
            this.showSuccess('已复制到剪贴板');
        } catch (err) {
            // 备用方案
            const textarea = document.createElement('textarea');
            textarea.value = markdown;
            textarea.style.position = 'fixed';
            textarea.style.opacity = '0';
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            this.showSuccess('已复制到剪贴板');
        }
    }

    /**
     * 渲染问答结果
     */
    renderQA() {
        if (!this.elements.cardsContainer || !this.generatedQA) return;

        this.elements.cardsContainer.innerHTML = `
            <div class="ai-card-item">
                <div class="ai-card-header">
                    <span class="ai-card-number">问题</span>
                </div>
                <div class="ai-card-front">
                    <div class="ai-card-content" style="font-weight: 600; font-size: 16px;">${this.escapeHtml(this.generatedQA.question)}</div>
                </div>
                <div class="ai-card-header" style="margin-top: 16px;">
                    <span class="ai-card-number">答案</span>
                </div>
                <div class="ai-card-back">
                    <div class="ai-card-content">${this.formatAnswerContent(this.generatedQA.answer)}</div>
                </div>
            </div>
        `;

        // 渲染数学公式
        this.renderMathInContainer(this.elements.cardsContainer);

        // 更新结果标题
        if (this.elements.cardCount) {
            const providerName = this.getProviderDisplayName();
            this.elements.cardCount.innerHTML = `AI 解答 <span style="background: #10b981; color: white; padding: 2px 8px; border-radius: 4px; font-size: 11px;">${providerName}</span>`;
        }
    }

    /**
     * 在容器中渲染数学公式
     * @param {HTMLElement} container - 容器元素
     */
    renderMathInContainer(container) {
        if (!container || typeof katex === 'undefined') return;

        // 渲染块级公式
        container.querySelectorAll('.math-block').forEach(el => {
            try {
                const formula = el.getAttribute('data-formula');
                if (formula) {
                    katex.render(formula, el, {
                        throwOnError: false,
                        displayMode: true
                    });
                }
            } catch (e) {
                console.error('块级公式渲染失败:', e);
            }
        });

        // 渲染行内公式
        container.querySelectorAll('.math-inline').forEach(el => {
            try {
                const formula = el.getAttribute('data-formula');
                if (formula) {
                    katex.render(formula, el, {
                        throwOnError: false,
                        displayMode: false
                    });
                }
            } catch (e) {
                console.error('行内公式渲染失败:', e);
            }
        });
    }

    /**
     * 获取提供商显示名称
     * @returns {string}
     */
    getProviderDisplayName() {
        const provider = this.ai.config.PROVIDER;
        const names = {
            'siliconflow': 'SiliconFlow',
            'qwen': '通义千问',
            'doubao': '豆包',
            'moonshot': 'Kimi',
            'minimax': 'MiniMax'
        };
        return names[provider] || provider;
    }

    /**
     * 格式化答案内容（支持简单的 Markdown 和数学公式）
     * @param {string} content - 原始内容
     * @returns {string} HTML 格式内容
     */
    formatAnswerContent(content) {
        // 保护数学公式
        const mathBlocks = [];
        const mathInline = [];

        // 保护块级公式 $$ - 使用特殊标记作为占位符（避免被 escapeHtml 转义）
        content = content.replace(/\$\$([\s\S]*?)\$\$/g, (match, formula) => {
            mathBlocks.push(formula.trim());
            return '\n\n§§MATHBLOCK' + (mathBlocks.length - 1) + '§§\n\n';
        });

        // 保护行内公式 $（但不匹配 $$）- 使用特殊标记作为占位符
        content = content.replace(/(?<!\$)\$(?!\$)([^\$\n]+?)\$(?!\$)/g, (match, formula) => {
            mathInline.push(formula.trim());
            return '§§MATHINLINE' + (mathInline.length - 1) + '§§';
        });

        // 简单的 Markdown 转换
        let html = this.escapeHtml(content);

        // 加粗
        html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
        html = html.replace(/__(.+?)__/g, '<strong>$1</strong>');

        // 斜体
        html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
        html = html.replace(/_(.+?)_/g, '<em>$1</em>');

        // 代码
        html = html.replace(/`(.+?)`/g, '<code>$1</code>');

        // 换行
        html = html.replace(/\n/g, '<br>');

        // 恢复块级公式
        mathBlocks.forEach((formula, i) => {
            const placeholder = '§§MATHBLOCK' + i + '§§';
            html = html.split(placeholder).join('<div class="math-block" data-formula="' + this.escapeHtml(formula) + '"></div>');
        });

        // 恢复行内公式
        mathInline.forEach((formula, i) => {
            const placeholder = '§§MATHINLINE' + i + '§§';
            html = html.split(placeholder).join('<span class="math-inline" data-formula="' + this.escapeHtml(formula) + '"></span>');
        });

        return html;
    }

    /**
     * HTML 转义
     * @param {string} text - 原始文本
     * @returns {string} 转义后的文本
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * 更新 UI 状态
     * @param {string} state - 状态: 'idle' | 'loading' | 'success' | 'error'
     */
    updateUIState(state) {
        const { modal, inputArea, generateBtn, statusArea, resultArea,
                insertBtn, copyBtn, regenerateBtn, progressBar } = this.elements;

        if (!modal) return;

        // 重置所有状态类
        modal.classList.remove('loading', 'success', 'error');

        switch (state) {
            case 'idle':
                statusArea && (statusArea.style.display = 'none');
                resultArea && (resultArea.style.display = 'none');
                inputArea && (inputArea.disabled = false);
                this.updateGenerateButtonState();
                break;

            case 'loading':
                modal.classList.add('loading');
                statusArea && (statusArea.style.display = 'block');
                resultArea && (resultArea.style.display = 'none');
                inputArea && (inputArea.disabled = true);
                generateBtn && (generateBtn.disabled = true);
                progressBar && (progressBar.style.width = '0%');
                break;

            case 'success':
                modal.classList.add('success');
                statusArea && (statusArea.style.display = 'none');
                resultArea && (resultArea.style.display = 'block');
                inputArea && (inputArea.disabled = false);
                insertBtn && (insertBtn.disabled = false);
                copyBtn && (copyBtn.disabled = false);
                break;

            case 'error':
                modal.classList.add('error');
                statusArea && (statusArea.style.display = 'block');
                resultArea && (resultArea.style.display = 'none');
                inputArea && (inputArea.disabled = false);
                this.updateGenerateButtonState();
                break;
        }
    }

    /**
     * 更新进度显示
     * @param {number} percent - 进度百分比
     * @param {string} message - 状态消息
     */
    updateProgress(percent, message) {
        if (this.elements.progressBar) {
            this.elements.progressBar.style.width = `${percent}%`;
        }
        if (this.elements.statusText) {
            this.elements.statusText.textContent = message;
        }
    }

    /**
     * 显示错误信息
     * @param {string} message - 错误消息
     */
    showError(message) {
        if (this.elements.statusText) {
            // 添加更友好的错误提示
            let helpText = '';

            if (message.includes('API Key') || message.includes('配置')) {
                helpText = '<br><small style="color: var(--text-secondary);">请在 ai-cards.js 中配置您的 API Key</small>';
            } else if (message.includes('网络') || message.includes('fetch') || message.includes('timeout')) {
                helpText = '<br><small style="color: var(--text-secondary);">请检查网络连接后重试</small>';
            } else if (message.includes('防抖') || message.includes('稍后再试')) {
                helpText = '<br><small style="color: var(--text-secondary);">请等待几秒后再试</small>';
            }

            this.elements.statusText.innerHTML = `<span class="ai-error-text">${this.escapeHtml(message)}</span>${helpText}`;
        }
    }

    /**
     * 显示成功提示
     * @param {string} message - 成功消息
     */
    showSuccess(message) {
        // 创建临时提示
        const toast = document.createElement('div');
        toast.className = 'ai-toast success';
        toast.textContent = message;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('show');
        }, 10);

        setTimeout(() => {
            toast.classList.remove('show');
            setTimeout(() => document.body.removeChild(toast), 300);
        }, 2000);
    }

    /**
     * 显示原始生成结果（当解析失败时）
     * @param {string} rawText - 原始生成的文本
     */
    showRawResult(rawText) {
        if (!this.elements.cardsContainer) return;

        // 显示原始内容，让用户知道发生了什么
        this.elements.cardsContainer.innerHTML = `
            <div class="ai-card-item" style="border-color: #f59e0b;">
                <div class="ai-card-header">
                    <span class="ai-card-number" style="background: #f59e0b;">解析失败</span>
                </div>
                <div style="padding: 16px;">
                    <p style="margin-bottom: 12px; color: var(--text-secondary);">
                        AI 生成的内容格式无法解析。以下是原始输出：
                    </p>
                    <pre style="background: #f8f9fa; padding: 12px; border-radius: 8px; overflow-x: auto; font-size: 13px; line-height: 1.5; max-height: 300px; overflow-y: auto;">${this.escapeHtml(rawText)}</pre>
                    <p style="margin-top: 12px; font-size: 13px; color: var(--text-secondary);">
                        提示：您可以手动复制内容并调整格式。
                    </p>
                </div>
            </div>
        `;

        // 更新卡片计数
        if (this.elements.cardCount) {
            this.elements.cardCount.innerHTML = '生成失败 <span style="background: #f59e0b; color: white; padding: 2px 8px; border-radius: 4px; font-size: 11px;">原始输出</span>';
        }

        this.updateUIState('success');
    }

    /**
     * 打开模态框
     */
    openModal() {
        if (!this.elements.modal) return;

        this.elements.modal.classList.add('active');
        document.body.style.overflow = 'hidden';

        // 重置状态
        this.updateUIState('idle');
        this.elements.inputArea && (this.elements.inputArea.value = '');
        this.elements.inputArea?.focus();

        // 检查 API Key 配置
        if (!this.ai.state.isReady) {
            this.showError(this.ai.state.initError || 'API Key 未配置');
        }
    }

    /**
     * 关闭模态框
     */
    closeModal() {
        if (!this.elements.modal) return;

        this.elements.modal.classList.remove('active');
        document.body.style.overflow = '';
    }

    /**
     * 检查模态框是否打开
     * @returns {boolean}
     */
    isModalOpen() {
        return this.elements.modal?.classList.contains('active');
    }
}

// ============================================
// 全局导出
// ============================================

// 创建全局实例
const aiCardGenerator = new AICardGenerator();
const aiCardGeneratorUI = new AIQAGeneratorUI(aiCardGenerator);

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    aiCardGeneratorUI.init();
});

// 导出到全局命名空间
window.aiCardGenerator = aiCardGenerator;
window.aiCardGeneratorUI = aiCardGeneratorUI;

// 兼容 CommonJS
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AICardGenerator, AIQAGeneratorUI, aiCardGenerator, aiCardGeneratorUI };
}

// 确保全局变量已定义
console.log('ai-cards.js (AI Q&A 版本) loaded, aiCardGeneratorUI:', typeof window.aiCardGeneratorUI);
