import { CryptoService } from '../servicos/crypto_service.js';

/**
 * Gerenciador de Senhas e Bloqueio Individual de Apps no DeX
 * Permite colocar senha em aplicativos ou pastas específicas
 */
export class AppLocker {
  static KEY_STORAGE = 'dex_locked_apps_map';

  static getLockedApps() {
    try {
      return JSON.parse(localStorage.getItem(this.KEY_STORAGE) || '{}');
    } catch (_) {
      return {};
    }
  }

  static isAppProtected(appId) {
    const map = this.getLockedApps();
    return !!map[appId];
  }

  static async setAppLock(appId, pin = null) {
    const map = this.getLockedApps();
    if (pin) {
      const hash = await CryptoService.hashPin(pin);
      map[appId] = { enabled: true, hash };
    } else {
      delete map[appId];
    }
    localStorage.setItem(this.KEY_STORAGE, JSON.stringify(map));
  }

  static async requestPassword(appTitle) {
    return new Promise((resolve) => {
      const input = prompt(`🔒 "${appTitle}" está protegido com senha.\nDigite o PIN de acesso do aplicativo:`);
      if (!input) {
        resolve(false);
        return;
      }

      CryptoService.hashPin(input).then((inputHash) => {
        const masterHash = localStorage.getItem('habitos_pin_master');
        const map = this.getLockedApps();
        const appLock = Object.values(map).find((item) => item.hash === inputHash);

        // Permite o PIN específico do app OU o PIN Mestre do sistema
        if (inputHash === masterHash || appLock) {
          resolve(true);
        } else {
          alert('PIN incorreto para este aplicativo!');
          resolve(false);
        }
      });
    });
  }
}
