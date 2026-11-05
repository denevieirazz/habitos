import { IdbStorage } from '../servicos/idb_storage.js';
import { Shredder } from '../../ferramentas/shredder.js';
import { SessionManager } from '../servicos/session_manager.js';

/**
 * Aplicativo Lixeira Segura com Trituração em Janela DeX
 */
export class TrashApp {
  static getConfig() {
    return {
      id: 'app-trash',
      title: 'Lixeira Segura & Shredder',
      icon: '🗑️',
      width: 440,
      height: 380,
      contentHtml: `
        <div class="trash-win-container">
          <div class="trash-toolbar">
            <span class="trash-title-text">Itens Excluídos</span>
            <button class="tool-btn btn-empty-trash" style="color: var(--os-danger);">Esvaziar e Triturar 💥</button>
          </div>
          <div class="trash-items-list" id="trash-items-list">
            <div class="loading-state">Carregando lixeira...</div>
          </div>
        </div>
      `,
      onInit: (winEl) => {
        this.setupWindow(winEl);
      }
    };
  }

  static async setupWindow(winEl) {
    const listEl = winEl.querySelector('#trash-items-list');
    const btnEmpty = winEl.querySelector('.btn-empty-trash');

    const render = async () => {
      const isPanic = SessionManager.isPanicMode();
      const files = await IdbStorage.getAllFilesMeta(isPanic);
      const deleted = files.filter((f) => f.isDeleted);

      listEl.innerHTML = '';

      if (deleted.length === 0) {
        listEl.innerHTML = `<div class="empty-folder-state">A lixeira está vazia.</div>`;
        return;
      }

      deleted.forEach((item) => {
        const row = document.createElement('div');
        row.className = 'trash-item-row tap-active';
        row.innerHTML = `
          <div class="trash-item-info">
            <span class="trash-item-title">${item.name}</span>
            <span class="trash-item-date">${new Date(item.modifiedAt).toLocaleDateString('pt-BR')}</span>
          </div>
          <div class="trash-item-actions">
            <button class="tool-btn btn-trash-restore" title="Restaurar">↩️</button>
            <button class="tool-btn btn-trash-shred" title="Triturar" style="color: var(--os-danger);">💥</button>
          </div>
        `;

        row.querySelector('.btn-trash-restore').onclick = async () => {
          item.isDeleted = false;
          item.modifiedAt = new Date().toISOString();
          await IdbStorage.updateFileMeta(item);
          render();
        };

        row.querySelector('.btn-trash-shred').onclick = async () => {
          if (confirm(`Triturar fisicamente "${item.name}" com ruído e zeros?`)) {
            await Shredder.shredFile(item.id);
            render();
          }
        };

        listEl.appendChild(row);
      });
    };

    btnEmpty.onclick = async () => {
      if (confirm('Esvaziar e triturar todos os itens da lixeira permanentemente?')) {
        await Shredder.shredAllTrash();
        render();
      }
    };

    await render();
  }
}
