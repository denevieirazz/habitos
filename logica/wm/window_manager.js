import { AppLocker } from '../apps/app_locker.js';

/**
 * Gerenciador de Janelas Flutuantes Estilo Modo DeX / Desktop OS
 * Suporta arrastar (drag), redimensionar (resize), minimizar, maximizar e fechar
 * Suporte nativo para Mouse e Toque no Celular (Touch Events)
 */
export class WindowManager {
  static #windows = new Map();
  static #activeZIndex = 100;
  static #taskbarCallback = null;

  static setTaskbarCallback(cb) {
    this.#taskbarCallback = cb;
  }

  static async openApp(appConfig) {
    const { id, title, icon, onInit } = appConfig;

    // Verifica se o aplicativo está protegido por senha individual
    if (AppLocker.isAppProtected(id)) {
      const unlocked = await AppLocker.requestPassword(title);
      if (!unlocked) return;
    }

    if (this.#windows.has(id)) {
      const win = this.#windows.get(id);
      if (win.isMinimized) {
        this.restoreWindow(id);
      }
      this.focusWindow(id);
      return;
    }

    this.createWindow(appConfig);
  }

  static createWindow(config) {
    const { id, title, icon, contentHtml, width = 360, height = 480, onInit } = config;

    const desktop = document.getElementById('dex-desktop-area');
    if (!desktop) return;

    const winEl = document.createElement('div');
    winEl.className = 'dex-window active';
    winEl.id = `win-${id}`;

    // Posicionamento cascata dinâmico na tela
    const rect = desktop.getBoundingClientRect();
    const isMobile = window.innerWidth <= 768;

    const w = isMobile ? Math.min(rect.width - 20, width) : Math.min(rect.width - 40, width);
    const h = isMobile ? Math.min(rect.height - 30, height) : Math.min(rect.height - 50, height);
    const offset = (this.#windows.size % 6) * 26;
    const x = isMobile ? 10 : Math.max(16, Math.min(rect.width - w - 20, 40 + offset));
    const y = isMobile ? 10 : Math.max(16, Math.min(rect.height - h - 20, 40 + offset));

    winEl.style.width = `${w}px`;
    winEl.style.height = `${h}px`;
    winEl.style.transform = `translate3d(${x}px, ${y}px, 0)`;
    winEl.style.zIndex = (++this.#activeZIndex).toString();

    winEl.innerHTML = `
      <div class="window-titlebar">
        <div class="titlebar-info">
          <span class="window-icon">${icon}</span>
          <span class="window-title-text">${title}</span>
        </div>
        <div class="window-controls">
          <button class="win-btn win-btn-min" title="Minimizar">_</button>
          <button class="win-btn win-btn-max" title="Maximizar">□</button>
          <button class="win-btn win-btn-close" title="Fechar">✕</button>
        </div>
      </div>
      <div class="window-content-body">
        ${contentHtml || ''}
      </div>
      <div class="window-resize-handle" title="Redimensionar"></div>
    `;

    desktop.appendChild(winEl);

    const winData = {
      id,
      title,
      icon,
      element: winEl,
      isMinimized: false,
      isMaximized: false,
      prevBounds: { x, y, w, h },
      currentPos: { x, y },
      currentSize: { w, h }
    };

    this.#windows.set(id, winData);
    this.setupWindowInteractions(winData);

    if (this.#taskbarCallback) {
      this.#taskbarCallback('opened', winData);
    }

    if (onInit) onInit(winEl);
  }

  static setupWindowInteractions(win) {
    const { element, id } = win;
    const titlebar = element.querySelector('.window-titlebar');
    const resizeHandle = element.querySelector('.window-resize-handle');

    element.addEventListener('pointerdown', () => this.focusWindow(id));

    // Arrastar Janela (Mouse e Touch)
    this.setupDrag(titlebar, win);

    // Redimensionar Janela (Mouse e Touch)
    this.setupResize(resizeHandle, win);

    // Botões da Barra de Título
    element.querySelector('.win-btn-min').onclick = (e) => {
      e.stopPropagation();
      this.minimizeWindow(id);
    };

    element.querySelector('.win-btn-max').onclick = (e) => {
      e.stopPropagation();
      this.toggleMaximize(id);
    };

    element.querySelector('.win-btn-close').onclick = (e) => {
      e.stopPropagation();
      this.closeWindow(id);
    };
  }

  static setupDrag(handle, win) {
    let startX = 0, startY = 0;
    let initialX = win.currentPos.x, initialY = win.currentPos.y;
    let isDragging = false;

    const onPointerDown = (e) => {
      if (win.isMaximized) return;
      if (e.target.closest('.window-controls')) return;
      isDragging = true;
      startX = e.clientX || (e.touches && e.touches[0].clientX);
      startY = e.clientY || (e.touches && e.touches[0].clientY);
      initialX = win.currentPos.x;
      initialY = win.currentPos.y;
      this.focusWindow(win.id);
      window.addEventListener('pointermove', onPointerMove, { passive: false });
      window.addEventListener('pointerup', onPointerUp);
    };

    const onPointerMove = (e) => {
      if (!isDragging) return;
      e.preventDefault();
      const curX = e.clientX || (e.touches && e.touches[0].clientX);
      const curY = e.clientY || (e.touches && e.touches[0].clientY);
      const dx = curX - startX;
      const dy = curY - startY;

      const newX = Math.max(0, initialX + dx);
      const newY = Math.max(0, initialY + dy);
      win.currentPos = { x: newX, y: newY };
      win.element.style.transform = `translate3d(${newX}px, ${newY}px, 0)`;
    };

    const onPointerUp = () => {
      isDragging = false;
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };

    handle.addEventListener('pointerdown', onPointerDown);
  }

  static setupResize(handle, win) {
    let startX = 0, startY = 0;
    let initialW = win.currentSize.w, initialH = win.currentSize.h;
    let isResizing = false;

    const onPointerDown = (e) => {
      if (win.isMaximized) return;
      isResizing = true;
      startX = e.clientX || (e.touches && e.touches[0].clientX);
      startY = e.clientY || (e.touches && e.touches[0].clientY);
      initialW = win.currentSize.w;
      initialH = win.currentSize.h;
      this.focusWindow(win.id);
      window.addEventListener('pointermove', onPointerMove, { passive: false });
      window.addEventListener('pointerup', onPointerUp);
    };

    const onPointerMove = (e) => {
      if (!isResizing) return;
      e.preventDefault();
      const curX = e.clientX || (e.touches && e.touches[0].clientX);
      const curY = e.clientY || (e.touches && e.touches[0].clientY);
      const newW = Math.max(260, initialW + (curX - startX));
      const newH = Math.max(200, initialH + (curY - startY));

      win.currentSize = { w: newW, h: newH };
      win.element.style.width = `${newW}px`;
      win.element.style.height = `${newH}px`;
    };

    const onPointerUp = () => {
      isResizing = false;
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };

    handle.addEventListener('pointerdown', onPointerDown);
  }

  static focusWindow(id) {
    if (!this.#windows.has(id)) return;
    const win = this.#windows.get(id);
    document.querySelectorAll('.dex-window').forEach((w) => w.classList.remove('active'));
    win.element.classList.add('active');
    win.element.style.zIndex = (++this.#activeZIndex).toString();
    if (this.#taskbarCallback) this.#taskbarCallback('focused', win);
  }

  static minimizeWindow(id) {
    if (!this.#windows.has(id)) return;
    const win = this.#windows.get(id);
    win.isMinimized = true;
    win.element.classList.add('minimized');
    if (this.#taskbarCallback) this.#taskbarCallback('minimized', win);
  }

  static restoreWindow(id) {
    if (!this.#windows.has(id)) return;
    const win = this.#windows.get(id);
    win.isMinimized = false;
    win.element.classList.remove('minimized');
    this.focusWindow(id);
    if (this.#taskbarCallback) this.#taskbarCallback('restored', win);
  }

  static toggleMaximize(id) {
    if (!this.#windows.has(id)) return;
    const win = this.#windows.get(id);
    win.isMaximized = !win.isMaximized;
    win.element.classList.toggle('maximized', win.isMaximized);

    if (win.isMaximized) {
      win.prevBounds = { ...win.currentPos, ...win.currentSize };
      win.element.style.transform = 'translate3d(0, 0, 0)';
      win.element.style.width = '100%';
      win.element.style.height = '100%';
    } else {
      const { x, y, w, h } = win.prevBounds;
      win.currentPos = { x, y };
      win.currentSize = { w, h };
      win.element.style.transform = `translate3d(${x}px, ${y}px, 0)`;
      win.element.style.width = `${w}px`;
      win.element.style.height = `${h}px`;
    }
  }

  static closeWindow(id) {
    if (!this.#windows.has(id)) return;
    const win = this.#windows.get(id);
    win.element.remove();
    this.#windows.delete(id);
    if (this.#taskbarCallback) this.#taskbarCallback('closed', win);
  }

  static closeAll() {
    this.#windows.forEach((win) => win.element.remove());
    this.#windows.clear();
    if (this.#taskbarCallback) this.#taskbarCallback('all_closed');
  }
}
