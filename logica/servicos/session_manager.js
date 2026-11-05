/**
 * Gerenciador de Sessão Ativa, Chave em Memória e Auto-Lock Imediato
 */
export class SessionManager {
  static #isUnlocked = false;
  static #isPanicMode = false;
  static #activeKey = '';
  static #lastActivity = null;
  static #autoLockMinutes = 3;
  static #listeners = [];

  static init() {
    // Auto-Lock Imediato ao alternar abas, minimizar navegador ou bloquear celular
    document.addEventListener('visibilitychange', () => {
      if (document.hidden && this.#isUnlocked) {
        this.lock();
      }
    });

    window.addEventListener('blur', () => {
      if (this.#isUnlocked) {
        this.lock();
      }
    });

    // Atualiza atividade ao tocar na tela
    ['click', 'touchstart', 'keydown'].forEach((evt) => {
      window.addEventListener(evt, () => this.updateActivity(), { passive: true });
    });

    // Timer de inatividade periódica
    setInterval(() => this.checkExpiry(), 30000);
  }

  static isUnlocked() {
    return this.#isUnlocked;
  }

  static isPanicMode() {
    return this.#isPanicMode;
  }

  static getActiveKey() {
    return this.#activeKey;
  }

  static unlock(key, isPanic = false) {
    this.#isUnlocked = true;
    this.#isPanicMode = isPanic;
    this.#activeKey = key;
    this.#lastActivity = Date.now();
    this.notify('unlocked');
  }

  static lock() {
    this.#isUnlocked = false;
    this.#isPanicMode = false;
    this.#activeKey = '';
    this.#lastActivity = null;
    this.notify('locked');
  }

  static updateActivity() {
    if (this.#isUnlocked) {
      this.#lastActivity = Date.now();
    }
  }

  static checkExpiry() {
    if (!this.#isUnlocked || !this.#lastActivity) return;
    const diffMs = Date.now() - this.#lastActivity;
    if (diffMs > this.#autoLockMinutes * 60 * 1000) {
      this.lock();
    }
  }

  static setAutoLockMinutes(min) {
    this.#autoLockMinutes = min;
  }

  static getAutoLockMinutes() {
    return this.#autoLockMinutes;
  }

  static subscribe(fn) {
    this.#listeners.push(fn);
  }

  static notify(event) {
    this.#listeners.forEach((fn) => fn(event));
  }
}
