import { CryptoService } from './crypto_service.js';

export const AuthResult = {
  SUCCESS_MASTER: 'SUCCESS_MASTER',
  SUCCESS_PANIC: 'SUCCESS_PANIC',
  INVALID: 'INVALID',
  LOCKED_OUT: 'LOCKED_OUT'
};

/**
 * Serviço de Autenticação, Controle de PINs e Biometria WebAuthn
 */
export class AuthService {
  static KEY_MASTER = 'habitos_pin_master';
  static KEY_PANIC = 'habitos_pin_panic';
  static KEY_BIOMETRICS = 'habitos_biometrics';
  static KEY_FAILED = 'habitos_auth_failed';
  static KEY_LOCKOUT = 'habitos_lockout_until';

  static isConfigured() {
    return localStorage.getItem(this.KEY_MASTER) !== null;
  }

  static async setupPins(masterPin, panicPin) {
    if (masterPin === panicPin) {
      throw new Error('O PIN de Pânico não pode ser igual ao PIN Mestre');
    }
    const masterHash = await CryptoService.hashPin(masterPin);
    const panicHash = await CryptoService.hashPin(panicPin);

    localStorage.setItem(this.KEY_MASTER, masterHash);
    localStorage.setItem(this.KEY_PANIC, panicHash);
    localStorage.setItem(this.KEY_FAILED, '0');
  }

  static async validatePin(inputPin) {
    const lockoutUntil = parseInt(localStorage.getItem(this.KEY_LOCKOUT) || '0', 10);
    const now = Date.now();
    if (now < lockoutUntil) {
      return AuthResult.LOCKED_OUT;
    }

    const masterHash = localStorage.getItem(this.KEY_MASTER);
    const panicHash = localStorage.getItem(this.KEY_PANIC);
    const inputHash = await CryptoService.hashPin(inputPin);

    if (inputHash === masterHash) {
      localStorage.setItem(this.KEY_FAILED, '0');
      return AuthResult.SUCCESS_MASTER;
    }

    if (panicHash && inputHash === panicHash) {
      localStorage.setItem(this.KEY_FAILED, '0');
      return AuthResult.SUCCESS_PANIC;
    }

    let failed = parseInt(localStorage.getItem(this.KEY_FAILED) || '0', 10) + 1;
    localStorage.setItem(this.KEY_FAILED, failed.toString());

    if (failed >= 5) {
      localStorage.setItem(this.KEY_LOCKOUT, (now + 30000).toString());
      return AuthResult.LOCKED_OUT;
    }

    return AuthResult.INVALID;
  }

  static isBiometricsSupported() {
    return !!(window.PublicKeyCredential && navigator.credentials);
  }

  static isBiometricsEnabled() {
    return localStorage.getItem(this.KEY_BIOMETRICS) === 'true';
  }

  static setBiometricsEnabled(enabled) {
    localStorage.setItem(this.KEY_BIOMETRICS, enabled ? 'true' : 'false');
  }
}
