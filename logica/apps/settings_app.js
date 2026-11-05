import { AppLocker } from './app_locker.js';
import { BackupManager } from '../../ferramentas/backup_manager.js';
import { SessionManager } from '../servicos/session_manager.js';

/**
 * Aplicativo de Configurações do DeX (Wallpapers, Bloqueio de Apps, Backup)
 */
export class SettingsApp {
  static getConfig(availableApps = []) {
    return {
      id: 'app-settings',
      title: 'Configurações do DeX',
      icon: '⚙️',
      width: 480,
      height: 440,
      contentHtml: `
        <div class="settings-win-container">
          <div class="settings-section">
            <h4 class="settings-sec-title">🖼️ Papel de Parede da Área de Trabalho</h4>
            <div class="wallpaper-options-row" id="wallpapers-row">
              <div class="wp-thumb active" data-wp="linear-gradient(135deg, #090d16 0%, #131b2e 100%)" style="background: linear-gradient(135deg, #090d16, #131b2e);"></div>
              <div class="wp-thumb" data-wp="linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)" style="background: linear-gradient(135deg, #0f172a, #1e1b4b);"></div>
              <div class="wp-thumb" data-wp="linear-gradient(135deg, #022c22 0%, #064e3b 100%)" style="background: linear-gradient(135deg, #022c22, #064e3b);"></div>
              <div class="wp-thumb" data-wp="linear-gradient(135deg, #18181b 0%, #27272a 100%)" style="background: linear-gradient(135deg, #18181b, #27272a);"></div>
            </div>
          </div>

          <div class="settings-section">
            <h4 class="settings-sec-title">🔒 Bloqueio de Apps com Senha Individual</h4>
            <p class="settings-sec-desc">Defina quais aplicativos exigem senha para abrir:</p>
            <div class="app-lock-list" id="app-lock-list"></div>
          </div>

          <div class="settings-section">
            <h4 class="settings-sec-title">📦 Backup Criptografado</h4>
            <div style="display: flex; gap: 10px; margin-top: 8px;">
              <button class="tool-btn btn-export-vault">Exportar .vault</button>
              <button class="tool-btn btn-restore-vault">Restaurar .vault</button>
            </div>
          </div>
        </div>
      `,
      onInit: (winEl) => {
        this.setupWindow(winEl, availableApps);
      }
    };
  }

  static setupWindow(winEl, availableApps) {
    // Papel de parede
    winEl.querySelectorAll('.wp-thumb').forEach((thumb) => {
      thumb.onclick = () => {
        const wp = thumb.dataset.wp;
        document.getElementById('dex-desktop-area').style.background = wp;
        localStorage.setItem('dex_wallpaper', wp);
        winEl.querySelectorAll('.wp-thumb').forEach((t) => t.classList.remove('active'));
        thumb.classList.add('active');
      };
    });

    // Lista de bloqueio de apps
    const lockList = winEl.querySelector('#app-lock-list');
    if (lockList) {
      lockList.innerHTML = '';
      availableApps.forEach((app) => {
        if (app.id === 'app-settings') return; // não bloquear settings
        const isLocked = AppLocker.isAppProtected(app.id);
        const row = document.createElement('label');
        row.className = 'app-lock-item';
        row.innerHTML = `
          <span>${app.icon} ${app.title}</span>
          <input type="checkbox" ${isLocked ? 'checked' : ''} data-id="${app.id}">
        `;

        row.querySelector('input').onchange = async (e) => {
          if (e.target.checked) {
            const customPin = prompt(`Defina o PIN para "${app.title}" (ou deixe em branco para usar o PIN Mestre):`);
            await AppLocker.setAppLock(app.id, customPin || 'MASTER');
          } else {
            await AppLocker.setAppLock(app.id, null);
          }
        };

        lockList.appendChild(row);
      });
    }

    winEl.querySelector('.btn-export-vault').onclick = () => BackupManager.exportVault();
    winEl.querySelector('.btn-restore-vault').onclick = () => BackupManager.triggerRestore();
  }
}
