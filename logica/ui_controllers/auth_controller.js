import { AuthService, AuthResult } from '../servicos/auth_service.js';
import { SessionManager } from '../servicos/session_manager.js';

/**
 * Controlador de Autenticação e Configuração Inicial de PIN
 */
export class AuthController {
  static #currentPin = '';
  static #setupStep = 0; // 0: Master, 1: Confirm Master, 2: Panic, 3: Confirm Panic
  static #tempMaster = '';
  static #tempPanic = '';

  static init() {
    this.setupKeypadEvents('auth-keypad', (num) => this.onAuthNumber(num), () => this.onAuthDelete());
    this.setupKeypadEvents('setup-keypad', (num) => this.onSetupNumber(num), () => this.onSetupDelete());

    const btnBackAuth = document.getElementById('btn-back-auth');
    if (btnBackAuth) btnBackAuth.onclick = () => (window.location.hash = '#habitos');

    const btnBackSetup = document.getElementById('btn-back-setup');
    if (btnBackSetup) btnBackSetup.onclick = () => (window.location.hash = '#habitos');

    this.checkBiometricsAvailability();
  }

  static resetAuth() {
    this.#currentPin = '';
    this.updatePinDots('auth-dots', 0);
    this.hideError('auth-error');
  }

  static resetSetup() {
    this.#setupStep = 0;
    this.#currentPin = '';
    this.#tempMaster = '';
    this.#tempPanic = '';
    this.updatePinDots('setup-dots', 0);
    this.updateSetupLabels();
    this.hideError('setup-error');
  }

  static setupKeypadEvents(containerId, onNum, onDel) {
    const el = document.getElementById(containerId);
    if (!el) return;

    el.querySelectorAll('.pin-btn').forEach((btn) => {
      btn.onclick = () => {
        if (navigator.vibrate) navigator.vibrate(20);
        const val = btn.dataset.val;
        if (val === 'del') {
          onDel();
        } else if (val === 'bio') {
          this.triggerBiometrics();
        } else if (val) {
          onNum(val);
        }
      };
    });
  }

  static onAuthNumber(num) {
    if (this.#currentPin.length >= 4) return;
    this.#currentPin += num;
    this.updatePinDots('auth-dots', this.#currentPin.length);

    if (this.#currentPin.length === 4) {
      this.verifyAuthPin();
    }
  }

  static onAuthDelete() {
    if (this.#currentPin.length > 0) {
      this.#currentPin = this.#currentPin.slice(0, -1);
      this.updatePinDots('auth-dots', this.#currentPin.length);
      this.hideError('auth-error');
    }
  }

  static async verifyAuthPin() {
    const pin = this.#currentPin;
    this.#currentPin = '';
    this.updatePinDots('auth-dots', 0);

    const result = await AuthService.validatePin(pin);

    if (result === AuthResult.SUCCESS_MASTER) {
      SessionManager.unlock(pin, false);
      window.location.hash = '#desktop';
    } else if (result === AuthResult.SUCCESS_PANIC) {
      SessionManager.unlock(pin, true);
      window.location.hash = '#desktop';
    } else if (result === AuthResult.LOCKED_OUT) {
      this.showError('auth-error', 'Muitas tentativas. Bloqueado por 30s.');
    } else {
      this.showError('auth-error', 'PIN incorreto. Tente novamente.');
    }
  }

  static onSetupNumber(num) {
    if (this.#currentPin.length >= 4) return;
    this.#currentPin += num;
    this.updatePinDots('setup-dots', this.#currentPin.length);

    if (this.#currentPin.length === 4) {
      this.processSetupStep();
    }
  }

  static onSetupDelete() {
    if (this.#currentPin.length > 0) {
      this.#currentPin = this.#currentPin.slice(0, -1);
      this.updatePinDots('setup-dots', this.#currentPin.length);
      this.hideError('setup-error');
    }
  }

  static async processSetupStep() {
    const pin = this.#currentPin;
    this.#currentPin = '';
    this.updatePinDots('setup-dots', 0);

    if (this.#setupStep === 0) {
      this.#tempMaster = pin;
      this.#setupStep = 1;
      this.updateSetupLabels();
    } else if (this.#setupStep === 1) {
      if (pin !== this.#tempMaster) {
        this.showError('setup-error', 'Os PINs Mestres não conferem.');
        this.#setupStep = 0;
      } else {
        this.#setupStep = 2;
      }
      this.updateSetupLabels();
    } else if (this.#setupStep === 2) {
      if (pin === this.#tempMaster) {
        this.showError('setup-error', 'O PIN de Pânico deve ser diferente do Mestre!');
      } else {
        this.#tempPanic = pin;
        this.#setupStep = 3;
        this.updateSetupLabels();
      }
    } else if (this.#setupStep === 3) {
      if (pin !== this.#tempPanic) {
        this.showError('setup-error', 'Os PINs de Pânico não conferem.');
        this.#setupStep = 2;
        this.updateSetupLabels();
      } else {
        await AuthService.setupPins(this.#tempMaster, this.#tempPanic);
        window.location.hash = '#auth';
      }
    }
  }

  static updateSetupLabels() {
    const title = document.getElementById('setup-title');
    const subtitle = document.getElementById('setup-subtitle');
    if (!title || !subtitle) return;

    const steps = [
      { t: 'Defina seu PIN Mestre', s: 'Acesso ao Mini OS real e a todos os seus arquivos.' },
      { t: 'Confirme o PIN Mestre', s: 'Digite novamente o PIN de 4 dígitos.' },
      { t: 'Defina seu PIN de Pânico', s: 'Se for coagido a abrir, digite este PIN falso.' },
      { t: 'Confirme o PIN de Pânico', s: 'Digite novamente o PIN de pânico de 4 dígitos.' }
    ];

    title.textContent = steps[this.#setupStep].t;
    subtitle.textContent = steps[this.#setupStep].s;
  }

  static updatePinDots(containerId, count) {
    const el = document.getElementById(containerId);
    if (!el) return;
    el.querySelectorAll('.pin-dot').forEach((dot, idx) => {
      dot.classList.toggle('filled', idx < count);
    });
  }

  static showError(id, msg) {
    const el = document.getElementById(id);
    if (el) {
      el.textContent = msg;
      el.classList.add('show');
    }
  }

  static hideError(id) {
    const el = document.getElementById(id);
    if (el) el.classList.remove('show');
  }

  static checkBiometricsAvailability() {
    const bioBtn = document.getElementById('btn-auth-bio');
    if (bioBtn) {
      bioBtn.style.visibility = AuthService.isBiometricsEnabled() ? 'visible' : 'hidden';
    }
  }

  static triggerBiometrics() {
    // Desbloqueio biométrico
    if (AuthService.isBiometricsEnabled()) {
      SessionManager.unlock('BIOMETRIC_KEY', false);
      window.location.hash = '#desktop';
    }
  }
}
