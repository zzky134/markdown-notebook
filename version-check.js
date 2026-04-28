/**
 * 轻量版本检测脚本
 * 内置版本号，修改此变量即可标记更新
 */
(function() {
    // 内置版本号 - 修改此值标记新版本
    const APP_VERSION = '1.0.0';
    
    // 存储键名
    const VERSION_KEY = 'app_version';
    const UPDATE_SHOWN_KEY = 'update_shown_for_version';
    
    // 检测版本更新
    function checkVersion() {
        const storedVersion = localStorage.getItem(VERSION_KEY);
        
        // 首次访问或版本变化
        if (storedVersion !== APP_VERSION) {
            // 保存新版本
            localStorage.setItem(VERSION_KEY, APP_VERSION);
            
            // 检查是否已经为此版本显示过更新提示
            const shownForVersion = localStorage.getItem(UPDATE_SHOWN_KEY);
            if (shownForVersion !== APP_VERSION) {
                // 延迟显示，避免干扰页面加载
                setTimeout(() => {
                    showUpdatePrompt();
                }, 2000);
            }
        }
    }
    
    // 显示更新提示
    function showUpdatePrompt() {
        // 创建提示元素
        const prompt = document.createElement('div');
        prompt.id = 'version-update-prompt';
        prompt.innerHTML = `
            <div class="version-update-content">
                <span class="version-update-text">🎉 发现新版本！</span>
                <button class="version-update-btn" onclick="window.location.reload(true)">立即刷新</button>
                <button class="version-update-close" onclick="this.parentElement.parentElement.remove()">✕</button>
            </div>
        `;
        
        // 添加样式
        const style = document.createElement('style');
        style.textContent = `
            #version-update-prompt {
                position: fixed;
                bottom: 20px;
                right: 20px;
                z-index: 9999;
                animation: versionSlideIn 0.3s ease-out;
            }
            .version-update-content {
                background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
                color: white;
                padding: 12px 20px;
                border-radius: 8px;
                box-shadow: 0 4px 12px rgba(0,0,0,0.15);
                display: flex;
                align-items: center;
                gap: 12px;
                font-size: 14px;
            }
            .version-update-text {
                font-weight: 500;
            }
            .version-update-btn {
                background: rgba(255,255,255,0.2);
                border: 1px solid rgba(255,255,255,0.3);
                color: white;
                padding: 6px 12px;
                border-radius: 4px;
                cursor: pointer;
                font-size: 13px;
                transition: all 0.2s;
            }
            .version-update-btn:hover {
                background: rgba(255,255,255,0.3);
            }
            .version-update-close {
                background: none;
                border: none;
                color: rgba(255,255,255,0.8);
                cursor: pointer;
                font-size: 16px;
                padding: 0 4px;
                margin-left: 4px;
            }
            .version-update-close:hover {
                color: white;
            }
            @keyframes versionSlideIn {
                from {
                    opacity: 0;
                    transform: translateY(20px);
                }
                to {
                    opacity: 1;
                    transform: translateY(0);
                }
            }
            @media (max-width: 640px) {
                #version-update-prompt {
                    left: 16px;
                    right: 16px;
                    bottom: 80px;
                }
                .version-update-content {
                    justify-content: center;
                }
            }
        `;
        document.head.appendChild(style);
        document.body.appendChild(prompt);
        
        // 标记已显示
        localStorage.setItem(UPDATE_SHOWN_KEY, APP_VERSION);
    }
    
    // 页面加载完成后检测
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', checkVersion);
    } else {
        checkVersion();
    }
})();
