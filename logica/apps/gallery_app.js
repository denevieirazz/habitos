import { IdbStorage } from '../servicos/idb_storage.js';
import { CryptoService } from '../servicos/crypto_service.js';
import { SessionManager } from '../servicos/session_manager.js';

/**
 * Aplicativo Galeria Segura de Fotos em Janela DeX
 */
export class GalleryApp {
  static getConfig(initialFile = null) {
    return {
      id: 'app-gallery',
      title: 'Galeria Segura',
      icon: '🖼️',
      width: 480,
      height: 420,
      contentHtml: `
        <div class="gallery-win-container">
          <div class="gallery-toolbar">
            <span class="gallery-title-text" id="gal-status-text">Galeria de Fotos</span>
            <button class="tool-btn btn-gal-grid" title="Ver Grade">⊞ Grade</button>
          </div>
          <div class="gallery-viewport" id="gal-viewport">
            <div class="loading-state">Carregando fotos...</div>
          </div>
        </div>
      `,
      onInit: (winEl) => {
        this.setupWindow(winEl, initialFile);
      }
    };
  }

  static async setupWindow(winEl, initialFile) {
    const viewport = winEl.querySelector('#gal-viewport');
    const statusText = winEl.querySelector('#gal-status-text');
    const btnGrid = winEl.querySelector('.btn-gal-grid');
    let activeUrl = null;

    const cleanup = () => {
      if (activeUrl) {
        URL.revokeObjectURL(activeUrl);
        activeUrl = null;
      }
    };

    winEl.addEventListener('DOMNodeRemovedFromDocument', cleanup);

    const showSinglePhoto = async (file) => {
      cleanup();
      viewport.innerHTML = `<div class="loading-state">Descriptografando foto...</div>`;
      statusText.textContent = file.name;

      try {
        const key = SessionManager.getActiveKey();
        const encrypted = await IdbStorage.getFileBlob(file.id);
        const decrypted = await CryptoService.decryptBuffer(encrypted, key);

        const blob = new Blob([decrypted], { type: file.mimeType });
        activeUrl = URL.createObjectURL(blob);

        viewport.innerHTML = `
          <div class="single-photo-view">
            <img src="${activeUrl}" class="gal-full-img" alt="${file.name}">
          </div>
        `;
      } catch (err) {
        viewport.innerHTML = `<div class="error-state">Erro ao abrir: ${err.message}</div>`;
      }
    };

    const showGrid = async () => {
      cleanup();
      viewport.innerHTML = `<div class="loading-state">Carregando miniaturas...</div>`;
      statusText.textContent = 'Todas as Fotos';

      const isPanic = SessionManager.isPanicMode();
      const files = await IdbStorage.getAllFilesMeta(isPanic);
      const images = files.filter((f) => !f.isDeleted && f.category === 'image');

      if (images.length === 0) {
        viewport.innerHTML = `<div class="empty-folder-state">Nenhuma foto no cofre.</div>`;
        return;
      }

      viewport.innerHTML = `<div class="gallery-grid-thumbs" id="gal-grid-thumbs"></div>`;
      const grid = viewport.querySelector('#gal-grid-thumbs');

      images.forEach((img) => {
        const card = document.createElement('div');
        card.className = 'gal-thumb-card tap-active';
        card.innerHTML = `
          <div class="gal-thumb-placeholder">🖼️</div>
          <div class="gal-thumb-label">${img.name}</div>
        `;
        card.onclick = () => showSinglePhoto(img);
        grid.appendChild(card);
      });
    };

    btnGrid.onclick = () => showGrid();

    if (initialFile) {
      showSinglePhoto(initialFile);
    } else {
      showGrid();
    }
  }
}
