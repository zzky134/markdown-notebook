const CACHE_NAME = 'markdown-notebook-v1';
const BASE_PATH = '/markdown-notebook';
const STATIC_ASSETS = [
  BASE_PATH + '/',
  BASE_PATH + '/index.html',
  BASE_PATH + '/manifest.json',
  BASE_PATH + '/icons/icon-72x72.png',
  BASE_PATH + '/icons/icon-96x96.png',
  BASE_PATH + '/icons/icon-128x128.png',
  BASE_PATH + '/icons/icon-144x144.png',
  BASE_PATH + '/icons/icon-152x152.png',
  BASE_PATH + '/icons/icon-192x192.png',
  BASE_PATH + '/icons/icon-384x384.png',
  BASE_PATH + '/icons/icon-512x512.png'
];

// CDN 资源缓存
const CDN_CACHE_NAME = 'markdown-notebook-cdn-v1';
const CDN_URLS = [
  'https://cdn.jsdelivr.net/npm/marked/marked.min.js',
  'https://cdn.jsdelivr.net/npm/prismjs@1.29.0/themes/prism-tomorrow.min.css',
  'https://cdn.jsdelivr.net/npm/prismjs@1.29.0/prism.min.js',
  'https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/prism-javascript.min.js',
  'https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/prism-python.min.js',
  'https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/prism-css.min.js',
  'https://cdn.jsdelivr.net/npm/prismjs@1.29.0/components/prism-markup.min.js',
  'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css',
  'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js',
  'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/contrib/auto-render.min.js',
  'https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js',
  'https://cdn.jsdelivr.net/npm/jspdf@2.5.1/dist/jspdf.umd.min.js'
];

// 安装 Service Worker
self.addEventListener('install', (event) => {
  event.waitUntil(
    Promise.all([
      caches.open(CACHE_NAME).then((cache) => {
        return cache.addAll(STATIC_ASSETS);
      }),
      caches.open(CDN_CACHE_NAME).then((cache) => {
        return cache.addAll(CDN_URLS);
      })
    ]).then(() => {
      return self.skipWaiting();
    })
  );
});

// 激活 Service Worker
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME && name !== CDN_CACHE_NAME)
          .map((name) => caches.delete(name))
      );
    }).then(() => {
      return self.clients.claim();
    })
  );
});

// 拦截网络请求
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // 处理 CDN 请求
  if (CDN_URLS.some(cdnUrl => url.href.startsWith(cdnUrl))) {
    event.respondWith(
      caches.match(request).then((cached) => {
        if (cached) {
          // 后台更新缓存
          fetch(request).then((response) => {
            if (response.ok) {
              caches.open(CDN_CACHE_NAME).then((cache) => {
                cache.put(request, response.clone());
              });
            }
          }).catch(() => {});
          return cached;
        }
        return fetch(request).then((response) => {
          if (response.ok) {
            const clone = response.clone();
            caches.open(CDN_CACHE_NAME).then((cache) => {
              cache.put(request, clone);
            });
          }
          return response;
        });
      })
    );
    return;
  }

  // 处理本地资源
  event.respondWith(
    caches.match(request).then((cached) => {
      if (cached) {
        return cached;
      }
      return fetch(request).then((response) => {
        // 只缓存本地资源
        if (url.origin === self.location.origin && response.ok) {
          const clone = response.clone();
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(request, clone);
          });
        }
        return response;
      }).catch((error) => {
        // 离线时返回缓存的 index.html（SPA 模式）
        if (request.mode === 'navigate') {
          return caches.match('/index.html');
        }
        throw error;
      });
    })
  );
});

// 处理后台同步（用于离线保存）
self.addEventListener('sync', (event) => {
  if (event.tag === 'sync-notes') {
    event.waitUntil(syncNotes());
  }
});

// 处理推送通知
self.addEventListener('push', (event) => {
  const options = {
    body: event.data?.text() || '您的笔记已同步',
    icon: '/icons/icon-192x192.png',
    badge: '/icons/icon-72x72.png',
    tag: 'markdown-notebook',
    requireInteraction: false
  };
  event.waitUntil(
    self.registration.showNotification('Markdown笔记工具', options)
  );
});

// 模拟同步笔记
async function syncNotes() {
  // 实际应用中，这里会同步到服务器
  console.log('笔记同步完成');
}
