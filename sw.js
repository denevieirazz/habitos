// Service Worker para funcionamento 100% offline no Modo DeX Launcher
const CACHE_NAME = 'habitos-dex-v2';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './design/tokens.css',
  './design/layout.css',
  './design/habitos.css',
  './design/pinpad.css',
  './design/dex_layout.css',
  './design/dex_window.css',
  './design/dex_taskbar.css',
  './design/dex_apps.css',
  './logica/modelos/habito_model.js',
  './logica/modelos/arquivo_model.js',
  './logica/modelos/nota_model.js',
  './logica/servicos/crypto_service.js',
  './logica/servicos/auth_service.js',
  './logica/servicos/idb_storage.js',
  './logica/servicos/habitos_service.js',
  './logica/servicos/session_manager.js',
  './logica/wm/window_manager.js',
  './logica/wm/taskbar_controller.js',
  './logica/apps/app_locker.js',
  './logica/apps/explorer_app.js',
  './logica/apps/gallery_app.js',
  './logica/apps/player_app.js',
  './logica/apps/notes_app.js',
  './logica/apps/settings_app.js',
  './logica/apps/trash_app.js',
  './logica/ui_controllers/habitos_controller.js',
  './logica/ui_controllers/auth_controller.js',
  './ferramentas/importador.js',
  './ferramentas/shredder.js',
  './ferramentas/backup_manager.js'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => cache.addAll(ASSETS_TO_CACHE))
  );
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      )
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      return cachedResponse || fetch(event.request).catch(() => cachedResponse);
    })
  );
});
