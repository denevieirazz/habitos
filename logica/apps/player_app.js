import { IdbStorage } from '../servicos/idb_storage.js';
import { CryptoService } from '../servicos/crypto_service.js';
import { SessionManager } from '../servicos/session_manager.js';

/**
 * Aplicativo Player de Mídia (Vídeos e Músicas) em Janela DeX
 */
export class PlayerApp {
  static getConfig(initialFile = null) {
    return {
      id: 'app-player',
      title: 'Player de Mídia',
      icon: '🎬',
      width: 460,
      height: 380,
      contentHtml: `
        <div class="player-win-container">
          <div class="player-toolbar">
            <span class="player-title-text" id="player-status-text">Player de Mídia</span>
            <button class="tool-btn btn-player-list" title="Lista de Mídias">☰ Lista</button>
          </div>
          <div class="player-viewport" id="player-viewport">
            <div class="loading-state">Nenhuma mídia selecionada.</div>
          </div>
        </div>
      `,
      onInit: (winEl) => {
        this.setupWindow(winEl, initialFile);
      }
    };
  }

  static async setupWindow(winEl, initialFile) {
    const viewport = winEl.querySelector('#player-viewport');
    const statusText = winEl.querySelector('#player-status-text');
    const btnList = winEl.querySelector('.btn-player-list');
    let activeUrl = null;

    const cleanup = () => {
      if (activeUrl) {
        URL.revokeObjectURL(activeUrl);
        activeUrl = null;
      }
    };

    winEl.addEventListener('DOMNodeRemovedFromDocument', cleanup);

    const playMedia = async (file) => {
      cleanup();
      viewport.innerHTML = `<div class="loading-state">Descriptografando mídia...</div>`;
      statusText.textContent = file.name;

      try {
        const key = SessionManager.getActiveKey();
        const encrypted = await IdbStorage.getFileBlob(file.id);
        const decrypted = await CryptoService.decryptBuffer(encrypted, key);

        const blob = new Blob([decrypted], { type: file.mimeType });
        activeUrl = URL.createObjectURL(blob);

        if (file.category === 'video') {
          viewport.innerHTML = `
            <div class="video-container">
              <video src="${activeUrl}" controls autoplay class="dex-video-player"></video>
            </div>
          `;
        } else {
          viewport.innerHTML = `
            <div class="audio-container">
              <div class="audio-visual-icon">🎵</div>
              <audio src="${activeUrl}" controls autoplay class="dex-audio-player"></audio>
            </div>
          `;
        }
      } catch (err) {
        viewport.innerHTML = `<div class="error-state">Erro ao reproduzir: ${err.message}</div>`;
      }
    };

    const showMediaList = async () => {
      cleanup();
      statusText.textContent = 'Músicas e Vídeos';
      viewport.innerHTML = `<div class="loading-state">Carregando lista...</div>`;

      const isPanic = SessionManager.isPanicMode();
      const all = await IdbStorage.getAllFilesMeta(isPanic);
      const mediaList = all.filter((f) => !f.isDeleted && (f.category === 'video' || f.category === 'audio'));

      if (mediaList.length === 0) {
        viewport.innerHTML = `<div class="empty-folder-state">Nenhum vídeo ou áudio encontrado.</div>`;
        return;
      }

      viewport.innerHTML = `<div class="media-playlist" id="media-playlist"></div>`;
      const listEl = viewport.querySelector('#media-playlist');

      mediaList.forEach((m) => {
        const item = document.createElement('div');
        item.className = 'playlist-item tap-active';
        item.innerHTML = `
          <span class="playlist-icon">${m.category === 'video' ? '🎬' : '🎵'}</span>
          <span class="playlist-title">${m.name}</span>
        `;
        item.onclick = () => playMedia(m);
        listEl.appendChild(item);
      });
    };

    btnList.onclick = () => showMediaList();

    if (initialFile) {
      playMedia(initialFile);
    } else {
      showMediaList();
    }
  }
}
