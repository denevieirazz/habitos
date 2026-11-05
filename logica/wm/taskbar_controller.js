import { WindowManager } from './window_manager.js';
import { SessionManager } from '../servicos/session_manager.js';

/**
 * Controlador da Barra de Tarefas, Menu Iniciar e Bandeja do Sistema DeX
 */
export class TaskbarController {
  static #clockTimer = null;
  static #openApps = new Map();

  static init(availableApps = []) {
    this.startClock();
    this.setupEvents(availableApps);

    WindowManager.setTaskbarCallback((action, win) => {
      this.handleWindowManagerEvent(action, win);
    });
  }

  static handleWindowManagerEvent(action, win) {
    const dockContainer = document.getElementById('dex-taskbar-apps');
    if (!dockContainer) return;

    if (action === 'opened') {
      const btn = document.createElement('button');
      btn.className = 'taskbar-app-tab active tap-active';
      btn.id = `tab-${win.id}`;
      btn.innerHTML = `
        <span class="tab-icon">${win.icon}</span>
        <span class="tab-title">${win.title}</span>
      `;
      btn.onclick = () => {
        if (win.isMinimized) {
          WindowManager.restoreWindow(win.id);
        } else if (win.element.classList.contains('active')) {
          WindowManager.minimizeWindow(win.id);
        } else {
          WindowManager.focusWindow(win.id);
        }
      };
      dockContainer.appendChild(btn);
      this.#openApps.set(win.id, btn);
    } else if (action === 'focused') {
      this.#openApps.forEach((b) => b.classList.remove('active'));
      const btn = this.#openApps.get(win.id);
      if (btn) btn.classList.add('active');
    } else if (action === 'minimized') {
      const btn = this.#openApps.get(win.id);
      if (btn) btn.classList.remove('active');
    } else if (action === 'closed') {
      const btn = this.#openApps.get(win.id);
      if (btn) btn.remove();
      this.#openApps.delete(win.id);
    } else if (action === 'all_closed') {
      dockContainer.innerHTML = '';
      this.#openApps.clear();
    }
  }

  static startClock() {
    const update = () => {
      const el = document.getElementById('dex-clock-tray');
      if (el) {
        const d = new Date();
        const hh = d.getHours().toString().padStart(2, '0');
        const mm = d.getMinutes().toString().padStart(2, '0');
        el.textContent = `${hh}:${mm}`;
      }
    };
    update();
    if (this.#clockTimer) clearInterval(this.#clockTimer);
    this.#clockTimer = setInterval(update, 1000);
  }

  static setupEvents(availableApps) {
    const btnStart = document.getElementById('dex-btn-start');
    const startMenu = document.getElementById('dex-start-menu');

    if (btnStart && startMenu) {
      btnStart.onclick = (e) => {
        e.stopPropagation();
        startMenu.classList.toggle('open');
      };

      document.addEventListener('pointerdown', (e) => {
        if (!e.target.closest('#dex-start-menu') && !e.target.closest('#dex-btn-start')) {
          startMenu.classList.remove('open');
        }
      });
    }

    // Renderiza itens do Menu Iniciar
    this.renderStartMenuItems(availableApps);

    // Botão de Trancar Sistema
    const btnLock = document.getElementById('dex-tray-lock');
    if (btnLock) {
      btnLock.onclick = () => {
        WindowManager.closeAll();
        SessionManager.lock();
        window.location.hash = '#habitos';
      };
    }
  }

  static renderStartMenuItems(apps) {
    const grid = document.getElementById('start-menu-grid');
    if (!grid) return;

    grid.innerHTML = '';
    apps.forEach((app) => {
      const item = document.createElement('div');
      item.className = 'start-menu-item tap-active';
      item.innerHTML = `
        <div class="start-item-icon">${app.icon}</div>
        <div class="start-item-title">${app.title}</div>
      `;
      item.onclick = () => {
        document.getElementById('dex-start-menu')?.classList.remove('open');
        WindowManager.openApp(app);
      };
      grid.appendChild(item);
    });
  }
}
