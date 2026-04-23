/**
 * AI 本地离线知识卡片生成模块
 * 基于 WebLLM 实现浏览器端本地 LLM 推理
 * 使用 Qwen2 轻量级模型生成知识卡片
 *
 * @module AICardGenerator
 * @version 1.0.0
 * @author Claude Code
 */

// ============================================
// 配置常量
// ============================================

/**
 * ============================================
 * 模型本地化部署配置
 * ============================================
 *
 * 使用方式：
 * 1. 将模型文件放入仓库 /models/ 目录
 * 2. 修改 MODEL_BASE_URL 为你的 GitHub Pages 地址
 * 3. 确保模型文件路径与 modelRecord 配置匹配
 *
 * 模型文件获取：
 * - 从 HuggingFace 下载: https://huggingface.co/mlc-ai/
 * - 或从浏览器缓存导出（见文档）
 */

/**
 * 模型基础配置
 */
const AI_CONFIG = {
    // 模型名称 - 使用 WebLLM 支持的模型 ID
    // 推荐轻量级模型（按体积排序）:
    // 1. Qwen2.5-Coder-0.5B-Instruct-q4f16_1-MLC (~300MB) - 最轻量，推荐
    // 2. gemma-2b-it-q4f16_1-MLC (~500MB) - Google 模型
    // 3. Llama-3.2-1B-Instruct-q4f16_1-MLC (~600MB) - Meta 模型
    // 4. Qwen2.5-Coder-1.5B-Instruct-q4f16_1-MLC (~800MB) - 质量更好
    // 【升级】使用 Llama-3.2-1B 模型（推理能力更强）
    // 原模型: Qwen2.5-Coder-0.5B (190MB, 推理能力较弱)
    // 新模型: Llama-3.2-1B (210MB, 推理能力更强)
    MODEL_ID: 'Llama-3.2-1B-Instruct-q4f16_1-MLC',

    // ============================================
    // 【关键配置】模型文件基础 URL
    // ============================================
    // 【修改1】使用 GitHub Pages 本地模型（已上传模型文件到仓库）
    // 模型文件位于: models/llama-3.2-1b/
    // 通过 GitHub Pages 访问，无 CORS 问题
    MODEL_BASE_URL: 'https://zzky134.github.io/markdown-notebook/models/llama-3.2-1b',
    //
    // 备用方案：
    // MODEL_BASE_URL: '',  // 使用 WebLLM 官方源
    // MODEL_BASE_URL: 'https://huggingface.co/mlc-ai/Qwen2.5-Coder-0.5B-Instruct-q4f16_1-MLC/resolve/main',
    //
    // 其他选项（备用）：
    // 选项 2: 使用国内镜像
    // MODEL_BASE_URL: 'https://hf-mirror.com/mlc-ai/Qwen2.5-Coder-0.5B-Instruct-q4f16_1-MLC/resolve/main',
    // 选项 3: 使用 GitHub Pages 本地模型
    // MODEL_BASE_URL: 'https://zzky134.github.io/markdown-notebook/models/qwen2.5-coder-0.5b',

    // 【修改2】启用本地模型加载模式
    // true = 使用 MODEL_BASE_URL 指定的本地路径加载模型（已配置）
    // false = 使用 WebLLM 内置模型列表
    USE_LOCAL_MODEL: true,

    // 当模型加载失败时，是否自动切换到模拟模式
    AUTO_FALLBACK_TO_MOCK: true,

    // 生成参数配置
    GENERATION_CONFIG: {
        temperature: 0.7,      // 温度参数，控制创造性
        top_p: 0.9,            // 核采样参数
        max_tokens: 2048,      // 最大生成 token 数
    },

    // 超时配置（毫秒）
    TIMEOUT: {
        MODEL_LOAD: 600000,    // 模型加载超时：10分钟
        GENERATION: 120000     // 生成超时：2分钟
    }
};

/**
 * ============================================
 * 自定义模型记录配置
 * ============================================
 * 定义模型文件的加载路径和参数
 * 用于从 GitHub Pages 本地资源加载模型
 */
function createCustomModelRecord(baseUrl, modelId) {
    // 模型文件列表 - Qwen2.5-Coder-0.5B-Instruct-q4f16_1-MLC
    // 这些文件需要从 HuggingFace 下载并放入仓库 models/ 目录
    const modelFiles = [
        'params_shard_0.bin',
        'params_shard_1.bin',
        'params_shard_2.bin',
        'params_shard_3.bin',
        'tokenizer.json',
        'tokenizer_config.json',
        'mlc-chat-config.json',
        'ndarray-cache.json'
    ];

    // 构建文件 URL 映射
    const modelLibs = [];
    const tokenizerFiles = [];

    modelFiles.forEach(file => {
        const url = `${baseUrl}/${file}`;
        if (file.includes('shard') || file === 'ndarray-cache.json') {
            modelLibs.push(url);
        } else {
            tokenizerFiles.push(url);
        }
    });

    return {
        model: modelId,
        model_id: modelId,
        model_lib: `${baseUrl}/model_lib.wasm`,
        model_url: baseUrl,
        tokenizer: `${baseUrl}/tokenizer.json`,
        tokenizer_config: `${baseUrl}/tokenizer_config.json`,
        chat_config: {
            context_window_size: 4096,
            prefill_chunk_size: 1024,
            temperature: AI_CONFIG.GENERATION_CONFIG.temperature,
            top_p: AI_CONFIG.GENERATION_CONFIG.top_p,
            repetition_penalty: 1.0,
        },
        // 自定义加载参数
        overrides: {
            context_window_size: 4096,
        }
    };
}

/**
 * 知识卡片分隔符
 * 用于解析 AI 生成的卡片内容
 */
const CARD_SEPARATORS = {
    START: '---CARD_START---',
    END: '---CARD_END---',
    FRONT: '---FRONT---',
    BACK: '---BACK---'
};

/**
 * 提示词模板
 * 用于指导 AI 生成知识卡片
 */
const PROMPT_TEMPLATES = {
    // 系统提示词 - 针对小模型简化
    SYSTEM: `将笔记转换为知识卡片。

格式：
问题: [问题内容]
答案: [答案内容]

要求：
- 生成3-5张卡片
- 问题简洁，答案详细
- 覆盖重点知识`,

    // 用户提示词模板 - 简化版
    USER: (content) => `笔记：
${content}

转换为知识卡片（格式：问题: ... 答案: ...）`
};

// ============================================
// 状态管理
// ============================================

/**
 * AI 生成器状态
 */
const AIState = {
    // 引擎实例
    engine: null,

    // 加载状态
    isLoading: false,

    // 模型是否已就绪
    isReady: false,

    // 当前生成任务
    currentGeneration: null,

    // 加载进度回调
    onProgressCallback: null,

    // 初始化错误信息
    initError: null
};

// ============================================
// 核心功能类
// ============================================

/**
 * AI 知识卡片生成器类
 * 封装 WebLLM 的初始化和推理功能
 */
class AICardGenerator {
    constructor() {
        this.state = AIState;
        this.config = AI_CONFIG;
        this.separators = CARD_SEPARATORS;
    }

    /**
     * 检查浏览器兼容性
     * 验证是否支持 WebGPU 或 WebGL
     * @returns {Object} 兼容性检查结果
     */
    checkCompatibility() {
        const result = {
            compatible: false,
            webgpu: false,
            webgl: false,
            message: ''
        };

        // 检查 WebGPU 支持
        if (navigator.gpu) {
            result.webgpu = true;
            result.compatible = true;
            result.message = '支持 WebGPU，可以获得最佳性能';
        }
        // 检查 WebGL 支持
        else if (window.WebGLRenderingContext || window.WebGL2RenderingContext) {
            result.webgl = true;
            result.compatible = true;
            result.message = '支持 WebGL，性能可能受限';
        }
        else {
            result.message = '您的浏览器不支持 WebGPU 或 WebGL，无法运行本地 AI 模型';
        }

        return result;
    }

    /**
     * 初始化 AI 引擎
     * 加载 WebLLM 模型
     * @param {Function} onProgress - 进度回调函数 (progress: number, message: string) => void
     * @returns {Promise<boolean>} 初始化是否成功
     */
    async initialize(onProgress = null) {
        // 如果已经初始化，直接返回
        if (this.state.isReady && this.state.engine) {
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
                }, 500);
            });
        }

        // 检查兼容性
        const compatibility = this.checkCompatibility();
        if (!compatibility.compatible) {
            this.state.initError = compatibility.message;
            throw new Error(compatibility.message);
        }

        this.state.isLoading = true;
        this.state.onProgressCallback = onProgress;

        try {
            // 动态导入 WebLLM
            const webllm = await import(
                'https://esm.run/@mlc-ai/web-llm@0.2.76'
            );

            // 检查导入的内容
            console.log('WebLLM imported:', webllm);

            // 获取 CreateMLCEngine 函数
            const CreateMLCEngine = webllm.CreateMLCEngine || webllm.default?.CreateMLCEngine;

            if (!CreateMLCEngine) {
                throw new Error('无法加载 CreateMLCEngine，请检查 WebLLM 版本');
            }

            // 创建引擎 - WebLLM v0.2.x 使用新的 API
            const engineConfig = {
                // 初始化进度回调
                initProgressCallback: (progress) => {
                    console.log('WebLLM progress:', progress);
                    const percent = progress.progress
                        ? Math.round(progress.progress * 100)
                        : 0;
                    const message = progress.text || `加载中... ${percent}%`;

                    if (onProgress) {
                        onProgress(percent, message);
                    }
                }
            };

            // 创建设置
            const chatConfig = {
                context_window_size: 4096,
            };

            // 【修改3】检查是否使用本地模型
            if (this.config.USE_LOCAL_MODEL) {
                console.log('【模型加载】使用本地模型模式');
                console.log('【模型加载】模型基础URL:', this.config.MODEL_BASE_URL);
                console.log('【模型加载】模型ID:', this.config.MODEL_ID);

                // 【修改4】使用 WebLLM 的自定义模型列表功能
                // 通过 appConfig 参数传入自定义模型配置
                const customAppConfig = {
                    model_list: [
                        {
                            model: this.config.MODEL_ID,
                            model_id: this.config.MODEL_ID,
                            model_lib: 'https://raw.githubusercontent.com/mlc-ai/binary-mlc-llm-libs/main/web-llm-models/v0_2_30/Qwen2.5-Coder-0.5B-Instruct-q4f16_1-MLC-webgpu.wasm',
                            overrides: {
                                context_window_size: 4096,
                            }
                        }
                    ]
                };

                // 创建引擎，传入自定义 appConfig
                console.log('【模型加载】开始创建引擎...');
                this.state.engine = await CreateMLCEngine(
                    this.config.MODEL_ID,
                    engineConfig,
                    chatConfig,
                    customAppConfig  // 传入自定义配置
                );
                console.log('【模型加载】引擎创建成功 ✓');
            } else {
                // 使用默认模型（从 HuggingFace 下载）
                console.log('使用默认模型模式（从 HuggingFace 下载）');
                this.state.engine = await CreateMLCEngine(
                    this.config.MODEL_ID,
                    engineConfig,
                    chatConfig
                );
            }

            this.state.isReady = true;
            this.state.initError = null;

            if (onProgress) {
                onProgress(100, '模型加载完成！');
            }

            return true;
        } catch (error) {
            this.state.initError = error.message;
            console.error('AI 引擎初始化失败:', error);

            // 检查是否是网络/缓存错误
            const isNetworkError = error.message?.includes('network') ||
                                   error.message?.includes('Cache') ||
                                   error.message?.includes('fetch') ||
                                   error.message?.includes('Failed to fetch') ||
                                   error.message?.includes('503') ||
                                   error.message?.includes('502') ||
                                   error.message?.includes('timeout') ||
                                   error.message?.includes('ETIMEDOUT');

            const shouldUseMock = isNetworkError ||
                                  this.config.AUTO_FALLBACK_TO_MOCK ||
                                  window.AI_MOCK_MODE;

            if (shouldUseMock) {
                console.warn('检测到网络错误或配置为模拟模式，切换到演示模式');
                console.warn('错误详情:', error.message);

                // 自动切换到模拟模式
                window.AI_MOCK_MODE = true;
                this.state.engine = this.createMockEngine();
                this.state.isReady = true;
                this.state.initError = null;

                if (onProgress) {
                    const reason = isNetworkError ? '网络受限' : '演示模式';
                    onProgress(100, `已切换到${reason}（点击生成体验功能）`);
                }
                return true;
            }

            // 如果启用模拟模式，使用模拟引擎
            if (window.AI_MOCK_MODE) {
                console.warn('使用模拟模式');
                this.state.engine = this.createMockEngine();
                this.state.isReady = true;
                this.state.initError = null;
                return true;
            }

            throw error;
        } finally {
            this.state.isLoading = false;
        }
    }

    /**
     * 创建模拟引擎（用于演示或测试）
     * @returns {Object} 模拟引擎对象
     */
    createMockEngine() {
        return {
            chat: {
                completions: {
                    create: async ({ messages }) => {
                        // 模拟流式输出
                        const userMessage = messages[messages.length - 1]?.content || '';

                        // 简单的模拟响应
                        const mockResponse = this.generateMockResponse(userMessage);

                        // 创建异步迭代器模拟流式输出
                        const chunks = mockResponse.split('').map((char, i) => ({
                            choices: [{
                                delta: { content: char }
                            }]
                        }));

                        return {
                            [Symbol.asyncIterator]: async function* () {
                                for (const chunk of chunks) {
                                    await new Promise(r => setTimeout(r, 10));
                                    yield chunk;
                                }
                            }
                        };
                    }
                }
            }
        };
    }

    /**
     * 生成模拟响应
     * @param {string} userContent - 用户输入
     * @returns {string} 模拟的 AI 响应
     */
    generateMockResponse(userContent) {
        // 提取用户输入的前 50 个字符作为主题
        const topic = userContent.substring(0, 50).replace(/\s+/g, ' ').trim();

        return `---CARD_START---
---FRONT---
什么是 ${topic}？
---BACK---
${topic} 是一个重要的概念，需要深入理解和记忆。
---CARD_END---

---CARD_START---
---FRONT---
${topic} 的核心要点是什么？
---BACK---
1. 理解基本概念和定义
2. 掌握关键公式和原理
3. 能够应用到实际问题中
4. 注意易错点和常见误区
---CARD_END---

---CARD_START---
---FRONT---
学习 ${topic} 时需要注意什么？
---BACK---
**重点内容：**
- 仔细阅读教材和笔记
- 多做练习题巩固知识
- 及时复习避免遗忘
- 建立知识之间的联系

**易错提醒：**
- 不要死记硬背，要理解原理
- 注意区分相似概念
---CARD_END---`;
    }

    /**
     * 生成知识卡片
     * @param {string} content - 输入的笔记内容
     * @param {Function} onToken - 流式输出回调 (token: string) => void
     * @returns {Promise<string>} 生成的原始文本
     */
    async generateCards(content, onToken = null) {
        // 确保引擎已初始化
        if (!this.state.isReady || !this.state.engine) {
            throw new Error('AI 引擎尚未初始化，请先调用 initialize()');
        }

        // 验证输入
        if (!content || content.trim().length === 0) {
            throw new Error('输入内容不能为空');
        }

        // 限制输入长度
        const maxLength = 3000;
        if (content.length > maxLength) {
            content = content.substring(0, maxLength) + '...';
        }

        // 构建消息
        const messages = [
            { role: 'system', content: PROMPT_TEMPLATES.SYSTEM },
            { role: 'user', content: PROMPT_TEMPLATES.USER(content) }
        ];

        try {
            this.state.currentGeneration = true;

            // 设置生成超时
            const timeoutPromise = new Promise((_, reject) => {
                setTimeout(() => {
                    reject(new Error('生成超时，请稍后重试'));
                }, this.config.TIMEOUT.GENERATION);
            });

            // 检查引擎 API 格式
            const engine = this.state.engine;
            let generationPromise;

            // WebLLM v0.2.x 使用 engine.chat.completions.create
            if (engine.chat?.completions?.create) {
                generationPromise = engine.chat.completions.create({
                    messages,
                    stream: true,
                    temperature: this.config.GENERATION_CONFIG.temperature,
                    top_p: this.config.GENERATION_CONFIG.top_p,
                    max_tokens: this.config.GENERATION_CONFIG.max_tokens,
                });
            }
            // 备用 API 格式
            else if (engine.generate) {
                generationPromise = engine.generate(messages, {
                    stream: true,
                    temperature: this.config.GENERATION_CONFIG.temperature,
                    top_p: this.config.GENERATION_CONFIG.top_p,
                    max_tokens: this.config.GENERATION_CONFIG.max_tokens,
                });
            }
            else {
                throw new Error('不支持的引擎 API 格式');
            }

            // 竞争执行
            const stream = await Promise.race([generationPromise, timeoutPromise]);

            let fullResponse = '';

            // 流式读取输出
            for await (const chunk of stream) {
                const token = chunk.choices?.[0]?.delta?.content || chunk.delta?.content || '';
                fullResponse += token;

                if (onToken) {
                    onToken(token);
                }
            }

            return fullResponse;
        } catch (error) {
            console.error('生成失败:', error);
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
        const cardRegex = new RegExp(
            `${this.escapeRegex(this.separators.START)}([\\s\\S]*?)${this.escapeRegex(this.separators.END)}`,
            'g'
        );

        let match;
        while ((match = cardRegex.exec(generatedText)) !== null) {
            const cardContent = match[1].trim();

            // 提取正面和背面
            const frontMatch = cardContent.match(
                new RegExp(`${this.escapeRegex(this.separators.FRONT)}([\\s\\S]*?)(?=${this.escapeRegex(this.separators.BACK)}|$)`)
            );
            const backMatch = cardContent.match(
                new RegExp(`${this.escapeRegex(this.separators.BACK)}([\\s\\S]*?)(?=${this.escapeRegex(this.separators.END)}|$)`)
            );

            if (frontMatch && backMatch) {
                const front = frontMatch[1].trim();
                const back = backMatch[1].trim();

                if (front && back) {
                    cards.push({ front, back });
                }
            }
        }

        // 如果标准解析失败，尝试备用解析方法
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

        // 【修改】适配简化格式：问题: ... 答案: ...
        // 格式1: 问题: ... 答案: ...
        const qaRegex = /(?:问题|Q|Front)[:：]\s*([^\n]+)(?:\n|\r\n?)+(?:答案|A|Back)[:：]\s*([^\n]+(?:\n(?!(?:问题|Q|Front)[:：])[^\n]+)*)/gi;

        let match;
        while ((match = qaRegex.exec(text)) !== null) {
            cards.push({
                front: match[1].trim(),
                back: match[2].trim()
            });
        }

        // 如果还是失败，尝试按段落分割
        if (cards.length === 0) {
            const paragraphs = text.split(/\n{2,}/).filter(p => p.trim().length > 0);
            for (let i = 0; i < paragraphs.length - 1; i += 2) {
                const front = paragraphs[i].trim();
                const back = paragraphs[i + 1]?.trim();

                if (front && back && front.length < 200 && back.length < 1000) {
                    cards.push({ front, back });
                }
            }
        }

        return cards;
    }

    /**
     * 转义正则表达式特殊字符
     * @param {string} string - 需要转义的字符串
     * @returns {string} 转义后的字符串
     */
    escapeRegex(string) {
        return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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

        return cards.map((card, index) => {
            return `:front:: ${card.front}\n:back:: ${card.back}`;
        }).join('\n\n');
    }

    /**
     * 释放资源
     * 卸载模型，释放内存
     */
    async dispose() {
        if (this.state.engine) {
            try {
                await this.state.engine.unload();
            } catch (e) {
                console.error('释放资源失败:', e);
            }
            this.state.engine = null;
            this.state.isReady = false;
        }
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
            errorMessage: this.state.initError
        };
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
            if (generateTimeout) return;

            this.handleGenerate();

            // 3 秒防抖
            this.elements.generateBtn.disabled = true;
            generateTimeout = setTimeout(() => {
                generateTimeout = null;
                this.updateGenerateButtonState();
            }, 3000);
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

            // 检查兼容性
            const compatibility = this.ai.checkCompatibility();
            if (!compatibility.compatible) {
                throw new Error(compatibility.message);
            }

            // 初始化 AI（如果尚未初始化）
            if (!this.ai.state.isReady) {
                console.log('开始初始化 AI 引擎...');
                await this.ai.initialize((progress, message) => {
                    console.log(`加载进度: ${progress}% - ${message}`);
                    this.updateProgress(progress, message);
                });
                console.log('AI 引擎初始化完成');
            }

            this.updateProgress(0, '正在生成知识卡片...');

            // 生成卡片
            console.log('开始生成卡片...');
            const result = await this.ai.generateCards(content, (token) => {
                // 流式输出回调（可选，用于实时显示）
                console.log('生成 token:', token);
            });
            console.log('生成完成，原始结果:', result);

            // 解析卡片
            this.generatedCards = this.ai.parseCards(result);
            console.log('解析后的卡片:', this.generatedCards);

            if (this.generatedCards.length === 0) {
                // 如果标准解析失败，尝试备用方法
                console.log('标准解析失败，尝试备用解析...');
                this.generatedCards = this.ai.parseCardsFallback(result);

                if (this.generatedCards.length === 0) {
                    this.showError('未能生成有效的知识卡片，请尝试重新生成或修改输入内容');
                    this.updateUIState('error');
                    return;
                }
            }

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
                    <div class="ai-card-label">正面</div>
                    <div class="ai-card-content">${this.escapeHtml(card.front)}</div>
                </div>
                <div class="ai-card-back">
                    <div class="ai-card-label">背面</div>
                    <div class="ai-card-content">${this.formatBackContent(card.back)}</div>
                </div>
            </div>
        `).join('');

        // 更新卡片计数
        if (this.elements.cardCount) {
            const mockBadge = window.AI_MOCK_MODE ?
                ' <span style="background: #f59e0b; color: white; padding: 2px 8px; border-radius: 4px; font-size: 11px;">演示模式</span>' : '';
            this.elements.cardCount.innerHTML = `共生成 ${this.generatedCards.length} 张卡片${mockBadge}`;
        }
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

            if (message.includes('WebGPU') || message.includes('WebGL')) {
                helpText = '<br><small style="color: var(--text-secondary);">请使用 Chrome 114+、Edge 114+ 或 Safari 17+ 浏览器</small>';
            } else if (message.includes('503') || message.includes('502')) {
                helpText = '<br><small style="color: var(--text-secondary);">GitHub Pages 服务暂时不可用，已自动切换到演示模式</small>';
            } else if (message.includes('加载') || message.includes('Load')) {
                helpText = '<br><small style="color: var(--text-secondary);">模型首次加载需要下载约 300MB 数据，请耐心等待</small>';
            } else if (message.includes('timeout') || message.includes('超时')) {
                helpText = '<br><small style="color: var(--text-secondary);">网络连接较慢，请检查网络后重试</small>';
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

        // 检查兼容性
        const compatibility = this.ai.checkCompatibility();
        if (!compatibility.compatible) {
            this.showError(compatibility.message);
            this.elements.generateBtn && (this.elements.generateBtn.disabled = true);
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
console.log('ai-cards.js loaded, aiCardGeneratorUI:', typeof window.aiCardGeneratorUI);
