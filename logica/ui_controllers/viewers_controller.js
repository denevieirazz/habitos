import { IdbStorage } from '../servicos/idb_storage.js';
import { CryptoService } from '../servicos/crypto_service.js';
import { SessionManager } from '../servicos/session_manager.js';

/**
 * Controlador de Visualizadores Internos Seguros (Zero Vazamento em Disco)
 */
export class ViewersController {
  static #activeBlobUrl = null;

  static init() {
    this.setupEvents();
  }

  static async openFile(item) {
    const key = SessionManager.getActiveKey();
    if (!key) return;

    try {
      const encryptedData = await IdbStorage.getFileBlob(item.id);
      if (!encryptedData) throw new Error('Arquivo não encontrado no cofre');

      // Descriptografa em memória RAM
      const decryptedBuffer = await CryptoService.decryptBuffer(encryptedData, key);

      // Cria Blob URL temporária apenas durante a visualização
      const blob = new Blob([decryptedBuffer], { type: item.mimeType });
      this.cleanupBlob();
      this.#activeBlobUrl = URL.createObjectURL(blob);

      if (item.category === 'image') {
        this.showImageViewer(item, this.#activeBlobUrl);
      } else if (item.category === 'video' || item.category === 'audio') {
        this.showMediaPlayer(item, this.#activeBlobUrl);
      } else {
        this.showDocViewer(item, decryptedBuffer);
      }
    } catch (err) {
      alert('Erro ao descriptografar arquivo: ' + err.message);
    }
  }

  static showImageViewer(item, url) {
    const modal = document.getElementById('modal-image-viewer');
    const imgEl = document.getElementById('viewer-img');
    const titleEl = document.getElementById('image-viewer-title');
    if (!modal || !imgEl) return;

    if (titleEl) titleEl.textContent = item.name;
    imgEl.src = url;
    modal.classList.add('open');
  }

  static showMediaPlayer(item, url) {
    const modal = document.getElementById('modal-media-player');
    const container = document.getElementById('media-player-mount');
    const titleEl = document.getElementById('media-player-title');
    if (!modal || !container) return;

    if (titleEl) titleEl.textContent = item.name;
    container.innerHTML = '';

    if (item.category === 'video') {
      const video = document.createElement('video');
      video.className = 'media-element';
      video.controls = true;
      video.autoplay = true;
      video.src = url;
      container.appendChild(video);
    } else {
      const audio = document.createElement('audio');
      audio.className = 'media-element';
      audio.controls = true;
      audio.autoplay = true;
      audio.src = url;
      container.innerHTML = `
        <div style="font-size: 60px; margin-bottom: 20px; color: var(--os-accent);">🎵</div>
      `;
      container.appendChild(audio);
    }

    modal.classList.add('open');
  }

  static showDocViewer(item, buffer) {
    let content = '';
    try {
      content = new TextDecoder('utf-8').decode(buffer);
    } catch (_) {
      content = `[Arquivo binário protegido: ${buffer.byteLength} bytes]`;
    }

    const modal = document.getElementById('modal-doc-viewer');
    const titleEl = document.getElementById('doc-viewer-title');
    const bodyEl = document.getElementById('doc-viewer-content');
    if (!modal || !bodyEl) return;

    if (titleEl) titleEl.textContent = item.name;
    bodyEl.textContent = content;
    modal.classList.add('open');
  }

  static cleanupBlob() {
    if (this.#activeBlobUrl) {
      URL.revokeObjectURL(this.#activeBlobUrl);
      this.#activeBlobUrl = null;
    }
  }

  static closeAll() {
    this.cleanupBlob();
    document.querySelectorAll('.viewer-modal').forEach((m) => m.classList.remove('open'));

    // Pausa mídias ativas
    const video = document.querySelector('#media-player-mount video');
    if (video) video.pause();
    const audio = document.querySelector('#media-player-mount audio');
    if (audio) audio.pause();
  }

  static setupEvents() {
    document.querySelectorAll('.btn-close-viewer').forEach((btn) => {
      btn.onclick = () => this.closeAll();
    });
  }
}
