import { IdbStorage } from '../servicos/idb_storage.js';
import { SessionManager } from '../servicos/session_manager.js';
import { ArquivoModel } from '../modelos/arquivo_model.js';
import { ViewersController } from './viewers_controller.js';
import { Importador } from '../../ferramentas/importador.js';

/**
 * Controlador do Explorador de Pastas e Arquivos
 */
export class ExplorerController {
  static #currentFolderId = null;
  static #folderHistory = [];
  static #categoryFilter = null;
  static #searchQuery = '';

  static init() {
    this.setupEvents();
  }

  static async open(category = null, title = 'Arquivos & Pastas') {
    this.#categoryFilter = category;
    this.#currentFolderId = null;
    this.#folderHistory = [];
    this.#searchQuery = '';

    const modal = document.getElementById('modal-explorer');
    const titleEl = document.getElementById('explorer-title');
    if (titleEl) titleEl.textContent = title;
    if (modal) modal.classList.add('open');

    await this.render();
  }

  static close() {
    const modal = document.getElementById('modal-explorer');
    if (modal) modal.classList.remove('open');
  }

  static async render() {
    const listEl = document.getElementById('explorer-list');
    if (!listEl) return;

    const isPanic = SessionManager.isPanicMode();
    const allFiles = await IdbStorage.getAllFilesMeta(isPanic);

    let items = allFiles.filter((f) => !f.isDeleted);

    if (this.#categoryFilter) {
      items = items.filter((f) => f.category === this.#categoryFilter);
    } else {
      items = items.filter((f) => f.parentId === this.#currentFolderId);
    }

    if (this.#searchQuery) {
      const q = this.#searchQuery.toLowerCase();
      items = items.filter((f) => f.name.toLowerCase().includes(q));
    }

    listEl.innerHTML = '';

    if (items.length === 0) {
      listEl.innerHTML = `
        <div style="text-align: center; color: var(--os-muted); padding: 50px;">
          Nenhum arquivo ou pasta encontrado.
        </div>`;
      return;
    }

    // Pastas primeiro, depois arquivos
    items.sort((a, b) => (b.isDirectory ? 1 : 0) - (a.isDirectory ? 1 : 0));

    items.forEach((item) => {
      const el = document.createElement('div');
      el.className = 'file-list-item tap-active';
      const sizeStr = item.isDirectory ? 'Pasta' : this.formatSize(item.fileSize);
      const icon = this.getCategoryIcon(item);

      el.innerHTML = `
        <div class="file-icon-box" style="background: ${this.getIconBg(item)}; color: ${this.getIconColor(item)};">
          ${icon}
        </div>
        <div class="file-info-col">
          <div class="file-name-text">${this.escapeHtml(item.name)}</div>
          <div class="file-meta-sub">${sizeStr} • ${new Date(item.modifiedAt).toLocaleDateString('pt-BR')}</div>
        </div>
        <button class="file-action-btn" title="Opções">⋮</button>
      `;

      el.onclick = () => this.handleItemClick(item);
      el.querySelector('.file-action-btn').onclick = (e) => {
        e.stopPropagation();
        this.showItemMenu(item);
      };

      listEl.appendChild(el);
    });
  }

  static handleItemClick(item) {
    if (item.isDirectory) {
      this.#folderHistory.push(item);
      this.#currentFolderId = item.id;
      const titleEl = document.getElementById('explorer-title');
      if (titleEl) titleEl.textContent = item.name;
      this.render();
    } else {
      ViewersController.openFile(item);
    }
  }

  static showItemMenu(item) {
    const opt = prompt(`Opções para "${item.name}":\n1. Renomear\n2. Mover para Lixeira\nDigite 1 ou 2:`);
    if (opt === '1') {
      const newName = prompt('Novo nome:', item.name);
      if (newName && newName.trim()) {
        item.name = newName.trim();
        item.modifiedAt = new Date().toISOString();
        IdbStorage.updateFileMeta(item).then(() => this.render());
      }
    } else if (opt === '2') {
      item.isDeleted = true;
      item.modifiedAt = new Date().toISOString();
      IdbStorage.updateFileMeta(item).then(() => this.render());
    }
  }

  static setupEvents() {
    const btnBack = document.getElementById('btn-explorer-back');
    if (btnBack) {
      btnBack.onclick = () => {
        if (this.#folderHistory.length > 0) {
          this.#folderHistory.pop();
          const prev = this.#folderHistory[this.#folderHistory.length - 1];
          this.#currentFolderId = prev ? prev.id : null;
          const titleEl = document.getElementById('explorer-title');
          if (titleEl) titleEl.textContent = prev ? prev.name : 'Arquivos & Pastas';
          this.render();
        } else {
          this.close();
        }
      };
    }

    const btnNewFolder = document.getElementById('btn-explorer-new-folder');
    if (btnNewFolder) {
      btnNewFolder.onclick = async () => {
        const name = prompt('Nome da nova pasta:');
        if (name && name.trim()) {
          const folder = new ArquivoModel({
            name: name.trim(),
            isDirectory: true,
            parentId: this.#currentFolderId,
            category: 'folder',
            isPanicItem: SessionManager.isPanicMode()
          });
          await IdbStorage.saveFile(folder, null);
          this.render();
        }
      };
    }

    const searchInput = document.getElementById('explorer-search-input');
    if (searchInput) {
      searchInput.oninput = (e) => {
        this.#searchQuery = e.target.value.trim();
        this.render();
      };
    }

    const btnAddFile = document.getElementById('btn-explorer-add-file');
    if (btnAddFile) {
      btnAddFile.onclick = () => {
        Importador.triggerFileInput(this.#currentFolderId, () => this.render());
      };
    }
  }

  static formatSize(bytes) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
  }

  static getCategoryIcon(item) {
    if (item.isDirectory) return '📁';
    switch (item.category) {
      case 'image': return '🖼️';
      case 'video': return '🎥';
      case 'audio': return '🎵';
      case 'document': return '📄';
      default: return '📦';
    }
  }

  static getIconBg(item) {
    if (item.isDirectory) return 'rgba(245, 158, 11, 0.15)';
    switch (item.category) {
      case 'image': return 'rgba(236, 72, 153, 0.15)';
      case 'video': return 'rgba(139, 92, 246, 0.15)';
      case 'audio': return 'rgba(0, 229, 255, 0.15)';
      case 'document': return 'rgba(59, 130, 246, 0.15)';
      default: return 'rgba(100, 116, 139, 0.15)';
    }
  }

  static getIconColor(item) {
    if (item.isDirectory) return '#f59e0b';
    switch (item.category) {
      case 'image': return '#ec4899';
      case 'video': return '#8b5cf6';
      case 'audio': return '#00e5ff';
      case 'document': return '#3b82f6';
      default: return '#94a3b8';
    }
  }

  static escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}
