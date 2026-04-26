/**
 * AI 知识卡片生成模块（云端 API 版本）
 * 基于 SiliconFlow / 通义千问 / 豆包等云端 API 实现知识卡片生成
 *
 * @module AICardGenerator
 * @version 2.0.0
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
    API_KEY: typeof process !== 'undefined' && process.env?.SILICONFLOW_API_KEY
        ? process.env.SILICONFLOW_API_KEY
        : 'sk-cknycrzjzntbclhlnsylnmhmgrvneiauuceylnmtyduterhr', // <-- 修改这里

    // ============================================
    // 选择 API 提供商
    // ============================================
    // 可选值: 'siliconflow' | 'qwen' | 'doubao'
    PROVIDER: 'siliconflow',

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
 * 指导模型将笔记内容整理成知识卡片
 * 关键：根据内容复杂度决定卡片数量，避免过度拆分
 */
const SYSTEM_PROMPT = `你是一个专业的知识整理助手。请将用户提供的笔记内容整理成知识卡片。

**重要原则 - 根据内容类型决定卡片数量：**

1. **如果是单个问题/题目**（如数学题、问答题）：
   - 只生成 **1张卡片**
   - 【标题】写问题/题目本身（保留核心信息）
   - 【内容】写答案和简要解析

2. **如果是简短笔记**（几句话到一段话）：
   - 生成 **1-2张卡片**
   - 每张卡片聚焦一个核心要点

3. **如果是长笔记/多知识点内容**：
   - 最多生成 **3-5张卡片**
   - 每张卡片一个独立知识点

**输出格式要求：**
- 每张卡片包含：【标题】和【内容】
- 卡片之间用三个横线分隔：---
- 标题简洁（10字以内），内容精炼（50-150字）

**示例1 - 单个问题（1张卡片）：**
【标题】鸡兔同笼问题：10只动物28条腿
【内容】答案：鸡4只，兔子6只。解析：设鸡x只兔y只，x+y=10，2x+4y=28，解得x=4，y=6。

**示例2 - 简短笔记（2张卡片）：**
【标题】光合作用定义
【内容】绿色植物利用光能将CO₂和H₂O转化为有机物并释放氧气的过程，发生在叶绿体中。

---

【标题】光合作用两个阶段
【内容】光反应：在类囊体膜上进行，产生ATP和NADPH。暗反应：在基质中进行，合成葡萄糖。

**示例3 - 长笔记（多张卡片）：**
（根据实际内容生成3-5张，每张一个独立知识点）`;

/**
 * 构建用户提示词
 * @param {string} content - 用户输入的笔记内容
 * @returns {string} 完整的用户提示词
 */
function buildUserPrompt(content) {
    // 检测内容类型，给出更具体的指示
    const isQuestion = /问题[:：]|\?|？|题目[:：]|问[:：]/.test(content);
    const isShortContent = content.length < 200;

    let specificInstruction = '';
    if (isQuestion) {
        specificInstruction = '这是一个问题/题目，请只生成1张卡片：标题写问题，内容写答案和解析。';
    } else if (isShortContent) {
        specificInstruction = '这是简短笔记，请生成1-2张卡片即可。';
    } else {
        specificInstruction = '这是长笔记，请生成3-5张卡片，每张一个知识点。';
    }

    return `请将以下笔记内容整理成知识卡片：

${content}

${specificInstruction}

要求：
1. 用【标题】和【内容】格式输出
2. 卡片之间用 --- 分隔
3. 标题简洁（10字以内），内容精炼（50-150字）
4. 不要过度拆分，保持内容完整性`;
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
     * 生成知识卡片
     * @param {string} content - 输入的笔记内容
     * @param {Function} onToken - 流式输出回调 (token: string) => void
     * @returns {Promise<string>} 生成的原始文本
     */
    async generateCards(content, onToken = null) {
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
                const errorMsg = errorData.error?.message || errorData.message || `HTTP ${response.status}`;
                throw new Error(`API 请求失败: ${errorMsg}`);
            }

            // 处理流式响应
            let fullResponse = '';

            if (requestBody.stream) {
                // 流式输出处理
                const reader = response.body.getReader();
                const decoder = new TextDecoder();

                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;

                    const chunk = decoder.decode(value, { stream: true });
                    const lines = chunk.split('\n');

                    for (const line of lines) {
                        if (line.trim() === '') continue;
                        if (line.trim() === 'data: [DONE]') continue;

                        if (line.startsWith('data: ')) {
                            try {
                                const data = JSON.parse(line.slice(6));
                                const token = data.choices?.[0]?.delta?.content || '';

                                if (token) {
                                    fullResponse += token;
                                    if (onToken) {
                                        onToken(token);
                                    }
                                }
                            } catch (e) {
                                // 忽略解析错误
                            }
                        }
                    }
                }
            } else {
                // 非流式响应处理
                const data = await response.json();

                // 通义千问格式
                if (data.output?.choices?.[0]?.message?.content) {
                    fullResponse = data.output.choices[0].message.content;
                }
                // OpenAI 兼容格式
                else if (data.choices?.[0]?.message?.content) {
                    fullResponse = data.choices[0].message.content;
                }
            }

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
     * 解析生成的文本为卡片数组
     * @param {string} generatedText - AI 生成的原始文本
     * @returns {Array<{front: string, back: string}>} 解析后的卡片数组
     */
    parseCards(generatedText) {
        if (!generatedText) {
            return [];
        }

        const cards = [];

        // 按 --- 分割卡片
        const cardBlocks = generatedText.split(/---+/).map(block => block.trim()).filter(block => block.length > 0);

        for (const block of cardBlocks) {
            // 提取标题
            const titleMatch = block.match(/【标题】\s*([^\n]+)/);
            // 提取内容
            const contentMatch = block.match(/【内容】\s*([\s\S]+)$/);

            if (titleMatch && contentMatch) {
                const title = titleMatch[1].trim();
                const content = contentMatch[1].trim();

                if (title && content) {
                    cards.push({
                        front: title,
                        back: content
                    });
                }
            }
        }

        // 如果标准解析失败，尝试备用解析
        if (cards.length === 0) {
            return this.parseCardsFallback(generatedText);
        }

        return cards;
    }

    /**
     * 备用卡片解析方法
     * 当标准分隔符解析失败时使用
     * @param {string} text - AI 生成的文本
     * @returns {Array<{front: string, back: string}>} 解析后的卡片数组
     */
    parseCardsFallback(text) {
        const cards = [];

        // 清理文本
        let cleanedText = text
            .replace(/以下是笔记转换为知识卡片的内容[:：]?/gi, '')
            .replace(/请输出[:：]?/gi, '')
            .trim();

        // 尝试匹配各种标题格式
        // 格式1: 【标题】... 【内容】...
        const cardRegex = /(?:【标题】|标题[:：]|Title[:：])\s*([^\n]+)(?:[\n\r]+)(?:【内容】|内容[:：]|Content[:：])\s*([\s\S]*?)(?=(?:【标题】|标题[:：]|Title[:：])|$)/gi;

        let match;
        while ((match = cardRegex.exec(cleanedText)) !== null) {
            const front = match[1].trim();
            const back = match[2].trim();

            if (front && back && front.length > 1 && back.length > 1) {
                cards.push({ front, back });
            }
        }

        // 如果还是失败，尝试按段落分割
        if (cards.length === 0) {
            const paragraphs = cleanedText.split(/\n{2,}/).map(p => p.trim()).filter(p => p.length > 0);

            for (let i = 0; i < paragraphs.length - 1; i += 2) {
                const front = paragraphs[i];
                const back = paragraphs[i + 1];

                if (front && back) {
                    cards.push({ front, back });
                }
            }
        }

        return cards;
    }

    /**
     * 将卡片转换为 Markdown 格式
     * @param {Array<{front: string, back: string}>} cards - 卡片数组
     * @returns {string} Markdown 格式的卡片文本
     */
    cardsToMarkdown(cards) {
        if (!cards || cards.length === 0) {
            return '';
        }

        return cards.map((card) => {
            return `:front:: ${card.front}\n:back:: ${card.back}`;
        }).join('\n\n');
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
class AICardGeneratorUI {
    constructor(aiGenerator) {
        this.ai = aiGenerator;
        this.elements = {};
        this.generatedCards = [];
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
            this.showError('请输入笔记内容');
            return;
        }

        try {
            this.updateUIState('loading');
            this.generatedCards = [];

            // 初始化 AI（检查配置）
            if (!this.ai.state.isReady) {
                console.log('开始初始化 AI 引擎...');
                await this.ai.initialize((progress, message) => {
                    console.log(`初始化进度: ${progress}% - ${message}`);
                    this.updateProgress(progress, message);
                });
                console.log('AI 引擎初始化完成');
            }

            this.updateProgress(30, '正在生成知识卡片...');

            // 生成卡片
            console.log('开始生成卡片...');
            const result = await this.ai.generateCards(content, (token) => {
                // 流式输出回调
                console.log('生成 token:', token);
            });
            console.log('生成完成，原始结果:', result);

            this.updateProgress(80, '正在解析卡片...');

            // 解析卡片
            this.generatedCards = this.ai.parseCards(result);
            console.log('解析后的卡片:', this.generatedCards);

            if (this.generatedCards.length === 0) {
                // 如果标准解析失败，尝试备用方法
                console.log('标准解析失败，尝试备用解析...');
                console.log('原始生成内容:', JSON.stringify(result));
                this.generatedCards = this.ai.parseCardsFallback(result);

                if (this.generatedCards.length === 0) {
                    // 显示原始内容供用户查看
                    this.showRawResult(result);
                    return;
                }
            }

            this.updateProgress(100, '生成完成！');

            // 显示结果
            this.renderCards();
            this.updateUIState('success');

        } catch (error) {
            console.error('生成失败:', error);
            this.showError(error.message || '生成失败，请稍后重试');
            this.updateUIState('error');
        }
    }

    /**
     * 处理插入到编辑器
     */
    handleInsert() {
        if (this.generatedCards.length === 0) return;

        const markdown = this.ai.cardsToMarkdown(this.generatedCards);

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
        if (this.generatedCards.length === 0) return;

        const markdown = this.ai.cardsToMarkdown(this.generatedCards);

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
     * 渲染生成的卡片
     */
    renderCards() {
        if (!this.elements.cardsContainer) return;

        this.elements.cardsContainer.innerHTML = this.generatedCards.map((card, index) => `
            <div class="ai-card-item">
                <div class="ai-card-header">
                    <span class="ai-card-number">卡片 ${index + 1}</span>
                </div>
                <div class="ai-card-front">
                    <div class="ai-card-label">标题</div>
                    <div class="ai-card-content">${this.escapeHtml(card.front)}</div>
                </div>
                <div class="ai-card-back">
                    <div class="ai-card-label">内容</div>
                    <div class="ai-card-content">${this.formatBackContent(card.back)}</div>
                </div>
            </div>
        `).join('');

        // 更新卡片计数
        if (this.elements.cardCount) {
            const providerName = this.getProviderDisplayName();
            this.elements.cardCount.innerHTML = `共生成 ${this.generatedCards.length} 张卡片 <span style="background: #10b981; color: white; padding: 2px 8px; border-radius: 4px; font-size: 11px;">${providerName}</span>`;
        }
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
            'doubao': '豆包'
        };
        return names[provider] || provider;
    }

    /**
     * 格式化背面内容（支持简单的 Markdown）
     * @param {string} content - 原始内容
     * @returns {string} HTML 格式内容
     */
    formatBackContent(content) {
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
const aiCardGeneratorUI = new AICardGeneratorUI(aiCardGenerator);

// 页面加载完成后初始化
document.addEventListener('DOMContentLoaded', () => {
    aiCardGeneratorUI.init();
});

// 导出到全局命名空间
window.aiCardGenerator = aiCardGenerator;
window.aiCardGeneratorUI = aiCardGeneratorUI;

// 兼容 CommonJS
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { AICardGenerator, AICardGeneratorUI, aiCardGenerator, aiCardGeneratorUI };
}

// 确保全局变量已定义
console.log('ai-cards.js (云端 API 版本) loaded, aiCardGeneratorUI:', typeof window.aiCardGeneratorUI);
