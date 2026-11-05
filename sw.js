// Service Worker para funcionamento 100% offline e sem gastar dados móveis
const CACHE_NAME = 'habitos-os-v1';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './design/tokens.css',
  './design/layout.css',
  './design/habitos.css',
  './design/pinpad.css',
  './design/mini_os.css',
  './design/componentes.css',
  './logica/modelos/habito_model.js',
  './logica/modelos/arquivo_model.js',
  './logica/modelos/nota_model.js',
  './logica/servicos/crypto_service.js',
  './logica/servicos/auth_service.js',
  './logica/servicos/idb_storage.js',
  './logica/servicos/habitos_service.js',
  './logica/servicos/session_manager.js',
  './logica/ui_controllers/habitos_controller.js',
  './logica/ui_controllers/auth_controller.js',
  './logica/ui_controllers/os_desktop_controller.js',
  './logica/ui_controllers/explorer_controller.js',
  './logica/ui_controllers/viewers_controller.js',
  './logica/ui_controllers/notes_controller.js',
  './logica/ui_controllers/settings_controller.js',
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
