import { IdbStorage } from '../servicos/idb_storage.js';
import { SessionManager } from '../servicos/session_manager.js';
import { ArquivoModel } from '../modelos/arquivo_model.js';
import { Importador } from '../../ferramentas/importador.js';
import { WindowManager } from '../wm/window_manager.js';
import { GalleryApp } from './gallery_app.js';
import { PlayerApp } from './player_app.js';

/**
 * Aplicativo Gerenciador de Arquivos em Janela DeX
 */
export class ExplorerApp {
  static getConfig(initialFolderId = null) {
    return {
      id: 'app-explorer',
      title: 'Explorador de Arquivos',
      icon: '📁',
      width: 520,
      height: 440,
      contentHtml: `
        <div class="explorer-win-container">
          <div class="explorer-toolbar">
            <button class="tool-btn btn-exp-back" title="Voltar">←</button>
            <span class="explorer-path-text" id="exp-current-path">/ Raiz</span>
            <div class="toolbar-actions">
              <button class="tool-btn btn-exp-new-folder" title="Nova Pasta">📁+</button>
              <button class="tool-btn btn-exp-import" title="Importar Arquivo">➕ Importar</button>
            </div>
          </div>
          <div class="explorer-search-bar">
            <input type="text" class="exp-search-input" placeholder="Buscar arquivos...">
          </div>
          <div class="explorer-files-grid" id="exp-files-grid">
            <div class="loading-state">Carregando cofre...</div>
          </div>
        </div>
      `,
      onInit: (winEl) => {
        this.setupWindow(winEl, initialFolderId);
      }
    };
  }

  static setupWindow(winEl, currentFolderId) {
    let folderId = currentFolderId;
    let history = [];
    let query = '';

    const render = async () => {
      const grid = winEl.querySelector('#exp-files-grid');
      const pathText = winEl.querySelector('#exp-current-path');
      if (!grid) return;

      const isPanic = SessionManager.isPanicMode();
      const allFiles = await IdbStorage.getAllFilesMeta(isPanic);

      let items = allFiles.filter((f) => !f.isDeleted && f.parentId === folderId);
      if (query) {
        items = allFiles.filter((f) => !f.isDeleted && f.name.toLowerCase().includes(query.toLowerCase()));
      }

      // Ordena: pastas primeiro
      items.sort((a, b) => (b.isDirectory ? 1 : 0) - (a.isDirectory ? 1 : 0));

      pathText.textContent = history.length > 0 ? `/ ${history.map((h) => h.name).join(' / ')}` : '/ Raiz';
      grid.innerHTML = '';

      if (items.length === 0) {
        grid.innerHTML = `<div class="empty-folder-state">Esta pasta está vazia.</div>`;
        return;
      }

      items.forEach((item) => {
        const itemEl = document.createElement('div');
        itemEl.className = 'desktop-file-icon tap-active';
        itemEl.innerHTML = `
          <div class="file-thumb-icon">${this.getFileIcon(item)}</div>
          <div class="file-thumb-title">${this.escape(item.name)}</div>
        `;

        itemEl.ondblclick = () => openItem(item);
        itemEl.onclick = () => {
          grid.querySelectorAll('.desktop-file-icon').forEach((i) => i.classList.remove('selected'));
          itemEl.classList.add('selected');
        };

        // Menu de contexto com clique com botão direito ou segurar
        itemEl.oncontextmenu = (e) => {
          e.preventDefault();
          this.showContextMenu(item, () => render());
        };

        grid.appendChild(itemEl);
      });
    };

    const openItem = (item) => {
      if (item.isDirectory) {
        history.push(item);
        folderId = item.id;
        render();
      } else if (item.category === 'image') {
        WindowManager.openApp(GalleryApp.getConfig(item));
      } else if (item.category === 'video' || item.category === 'audio') {
        WindowManager.openApp(PlayerApp.getConfig(item));
      } else {
        this.openDocPreview(item);
      }
    };

    winEl.querySelector('.btn-exp-back').onclick = () => {
      if (history.length > 0) {
        history.pop();
        folderId = history.length > 0 ? history[history.length - 1].id : null;
        render();
      }
    };

    winEl.querySelector('.btn-exp-new-folder').onclick = async () => {
      const name = prompt('Nome da nova pasta:');
      if (name && name.trim()) {
        const folder = new ArquivoModel({
          name: name.trim(),
          isDirectory: true,
          parentId: folderId,
          category: 'folder',
          isPanicItem: SessionManager.isPanicMode()
        });
        await IdbStorage.saveFile(folder, null);
        render();
      }
    };

    winEl.querySelector('.btn-exp-import').onclick = () => {
      Importador.triggerFileInput(folderId, () => render());
    };

    winEl.querySelector('.exp-search-input').oninput = (e) => {
      query = e.target.value.trim();
      render();
    };

    render();
  }

  static showContextMenu(item, onRefresh) {
    const act = prompt(`"${item.name}"\n1. Renomear\n2. Mover para Lixeira\nDigite 1 ou 2:`);
    if (act === '1') {
      const newName = prompt('Novo nome:', item.name);
      if (newName && newName.trim()) {
        item.name = newName.trim();
        item.modifiedAt = new Date().toISOString();
        IdbStorage.updateFileMeta(item).then(onRefresh);
      }
    } else if (act === '2') {
      item.isDeleted = true;
      item.modifiedAt = new Date().toISOString();
      IdbStorage.updateFileMeta(item).then(onRefresh);
    }
  }

  static getFileIcon(item) {
    if (item.isDirectory) return '📁';
    switch (item.category) {
      case 'image': return '🖼️';
      case 'video': return '🎬';
      case 'audio': return '🎵';
      case 'document': return '📄';
      default: return '📦';
    }
  }

  static escape(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }
}
