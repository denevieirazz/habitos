import { SessionManager } from '../servicos/session_manager.js';
import { IdbStorage } from '../servicos/idb_storage.js';
import { Importador } from '../../ferramentas/importador.js';

/**
 * Controlador da Área de Trabalho do Mini OS
 */
export class OsDesktopController {
  static #clockTimer = null;

  static init() {
    this.startClock();
    this.setupEvents();
  }

  static async refreshDesktop() {
    if (!SessionManager.isUnlocked()) return;

    const isPanic = SessionManager.isPanicMode();
    const encBadge = document.getElementById('os-encryption-badge');
    if (encBadge) {
      if (isPanic) {
        encBadge.textContent = 'MODO VISITANTE';
        encBadge.className = 'os-badge-encryption panic';
      } else {
        encBadge.textContent = 'AES-256 GCM';
        encBadge.className = 'os-badge-encryption';
      }
    }

    // Carrega contagens de arquivos
    const files = await IdbStorage.getAllFilesMeta(isPanic);
    const activeFiles = files.filter((f) => !f.isDeleted);
    const totalCount = activeFiles.length;
    const imgCount = activeFiles.filter((f) => f.category === 'image').length;
    const mediaCount = activeFiles.filter((f) => f.category === 'video' || f.category === 'audio').length;
    const docCount = activeFiles.filter((f) => f.category === 'document').length;

    const filesCountEl = document.getElementById('os-files-count');
    if (filesCountEl) filesCountEl.textContent = `${totalCount} itens`;

    this.updateBadge('badge-files', totalCount);
    this.updateBadge('badge-gallery', imgCount);
    this.updateBadge('badge-media', mediaCount);
    this.updateBadge('badge-docs', docCount);
  }

  static updateBadge(id, count) {
    const el = document.getElementById(id);
    if (el) el.textContent = count.toString();
  }

  static startClock() {
    const update = () => {
      const clockEl = document.getElementById('os-clock-display');
      if (clockEl) {
        const d = new Date();
        clockEl.textContent = `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
      }
    };
    update();
    if (this.#clockTimer) clearInterval(this.#clockTimer);
    this.#clockTimer = setInterval(update, 1000);
  }

  static setupEvents() {
    // Trancar Sistema
    const btnLock = document.getElementById('btn-os-lock');
    if (btnLock) {
      btnLock.onclick = () => {
        SessionManager.lock();
        window.location.hash = '#habitos';
      };
    }

    // Botão de Importação no Dock
    const btnImport = document.getElementById('btn-import-dock');
    if (btnImport) {
      btnImport.onclick = () => {
        Importador.triggerFileInput(null, () => this.refreshDesktop());
      };
    }
  }
}
