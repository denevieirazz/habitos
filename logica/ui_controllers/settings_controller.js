import { AuthService } from '../servicos/auth_service.js';
import { SessionManager } from '../servicos/session_manager.js';
import { IdbStorage } from '../servicos/idb_storage.js';
import { Shredder } from '../../ferramentas/shredder.js';
import { BackupManager } from '../../ferramentas/backup_manager.js';

/**
 * Controlador de Configurações, Lixeira e Backups
 */
export class SettingsController {
  static init() {
    this.setupEvents();
  }

  static openSettings() {
    const modal = document.getElementById('modal-settings');
    if (modal) modal.classList.add('open');

    const bioCheck = document.getElementById('setting-bio-toggle');
    if (bioCheck) bioCheck.checked = AuthService.isBiometricsEnabled();

    const lockSelect = document.getElementById('setting-lock-select');
    if (lockSelect) lockSelect.value = SessionManager.getAutoLockMinutes().toString();
  }

  static closeSettings() {
    const modal = document.getElementById('modal-settings');
    if (modal) modal.classList.remove('open');
  }

  static async openTrash() {
    const modal = document.getElementById('modal-trash');
    if (modal) modal.classList.add('open');
    await this.renderTrash();
  }

  static closeTrash() {
    const modal = document.getElementById('modal-trash');
    if (modal) modal.classList.remove('open');
  }

  static async renderTrash() {
    const listEl = document.getElementById('trash-list');
    if (!listEl) return;

    const isPanic = SessionManager.isPanicMode();
    const allFiles = await IdbStorage.getAllFilesMeta(isPanic);
    const deletedFiles = allFiles.filter((f) => f.isDeleted);

    listEl.innerHTML = '';

    if (deletedFiles.length === 0) {
      listEl.innerHTML = `
        <div style="text-align: center; color: var(--os-muted); padding: 50px;">
          A lixeira está vazia.
        </div>`;
      return;
    }

    deletedFiles.forEach((item) => {
      const el = document.createElement('div');
      el.className = 'file-list-item tap-active';
      el.innerHTML = `
        <div class="file-icon-box" style="background: rgba(239, 68, 68, 0.15); color: #ef4444;">
          🗑️
        </div>
        <div class="file-info-col">
          <div class="file-name-text">${this.escapeHtml(item.name)}</div>
          <div class="file-meta-sub">Excluído em ${new Date(item.modifiedAt).toLocaleDateString('pt-BR')}</div>
        </div>
        <button class="file-action-btn btn-restore" title="Restaurar" style="color: var(--os-success);">↩️</button>
        <button class="file-action-btn btn-shred" title="Triturar" style="color: var(--os-danger);">💥</button>
      `;

      el.querySelector('.btn-restore').onclick = async (e) => {
        e.stopPropagation();
        item.isDeleted = false;
        item.modifiedAt = new Date().toISOString();
        await IdbStorage.updateFileMeta(item);
        this.renderTrash();
      };

      el.querySelector('.btn-shred').onclick = async (e) => {
        e.stopPropagation();
        if (confirm(`Triturar definitivamente "${item.name}"? Sobrescreverá os dados com ruído e zeros no banco.`)) {
          await Shredder.shredFile(item.id);
          this.renderTrash();
        }
      };

      listEl.appendChild(el);
    });
  }

  static setupEvents() {
    // Configurações
    const btnBackSettings = document.getElementById('btn-settings-back');
    if (btnBackSettings) btnBackSettings.onclick = () => this.closeSettings();

    const bioCheck = document.getElementById('setting-bio-toggle');
    if (bioCheck) {
      bioCheck.onchange = (e) => AuthService.setBiometricsEnabled(e.target.checked);
    }

    const lockSelect = document.getElementById('setting-lock-select');
    if (lockSelect) {
      lockSelect.onchange = (e) => SessionManager.setAutoLockMinutes(parseInt(e.target.value, 10));
    }

    const btnResetPins = document.getElementById('btn-setting-reset-pins');
    if (btnResetPins) {
      btnResetPins.onclick = () => {
        if (confirm('Deseja redefinir os PINs Mestre e de Pânico?')) {
          SessionManager.lock();
          window.location.hash = '#setup';
        }
      };
    }

    const btnExport = document.getElementById('btn-setting-export');
    if (btnExport) {
      btnExport.onclick = () => BackupManager.exportVault();
    }

    const btnRestore = document.getElementById('btn-setting-restore');
    if (btnRestore) {
      btnRestore.onclick = () => BackupManager.triggerRestore();
    }

    // Lixeira
    const btnBackTrash = document.getElementById('btn-trash-back');
    if (btnBackTrash) btnBackTrash.onclick = () => this.closeTrash();

    const btnEmptyTrash = document.getElementById('btn-empty-trash');
    if (btnEmptyTrash) {
      btnEmptyTrash.onclick = async () => {
        if (confirm('Esvaziar e triturar fisicamente todos os arquivos da lixeira?')) {
          await Shredder.shredAllTrash();
          this.renderTrash();
        }
      };
    }
  }

  static escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}
