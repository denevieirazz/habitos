/**
 * Serviço de Criptografia Baseado na Web Crypto API Nativa (AES-256-GCM + PBKDF2)
 */
export class CryptoService {
  static SALT = new TextEncoder().encode('HabitOS_WebVault_Salt_2026');

  /**
   * Deriva uma chave AES-GCM de 256 bits a partir de uma senha usando PBKDF2
   */
  static async deriveKey(password) {
    const enc = new TextEncoder();
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      enc.encode(password),
      'PBKDF2',
      false,
      ['deriveKey']
    );

    return await crypto.subtle.deriveKey(
      {
        name: 'PBKDF2',
        salt: this.SALT,
        iterations: 100000,
        hash: 'SHA-256'
      },
      keyMaterial,
      { name: 'AES-GCM', length: 256 },
      false,
      ['encrypt', 'decrypt']
    );
  }

  /**
   * Criptografa um ArrayBuffer usando AES-GCM com IV único de 12 bytes
   */
  static async encryptBuffer(arrayBuffer, password) {
    const key = await this.deriveKey(password);
    const iv = crypto.getRandomValues(new Uint8Array(12));

    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      arrayBuffer
    );

    // Concatena: [12 bytes IV] + [Bytes Criptografados com Tag GCM]
    const result = new Uint8Array(iv.byteLength + encrypted.byteLength);
    result.set(iv, 0);
    result.set(new Uint8Array(encrypted), iv.byteLength);
    return result;
  }

  /**
   * Descriptografa um Uint8Array usando AES-GCM
   */
  static async decryptBuffer(encryptedBytes, password) {
    if (encryptedBytes.byteLength < 12) {
      throw new Error('Arquivo corrompido ou inválido');
    }

    const key = await this.deriveKey(password);
    const iv = encryptedBytes.slice(0, 12);
    const ciphertext = encryptedBytes.slice(12);

    return await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      ciphertext
    );
  }

  /**
   * Criptografa uma String retornando Base64
   */
  static async encryptString(plainText, password) {
    const enc = new TextEncoder();
    const buffer = enc.encode(plainText);
    const encrypted = await this.encryptBuffer(buffer, password);
    let binary = '';
    for (let i = 0; i < encrypted.byteLength; i++) {
      binary += String.fromCharCode(encrypted[i]);
    }
    return btoa(binary);
  }

  /**
   * Descriptografa uma String em Base64
   */
  static async decryptString(base64Text, password) {
    const binary = atob(base64Text);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    const decryptedBuffer = await this.decryptBuffer(bytes, password);
    return new TextDecoder().decode(decryptedBuffer);
  }

  /**
   * Gera hash SHA-256 para verificação de PIN
   */
  static async hashPin(pin) {
    const data = new TextEncoder().encode(`salt#${pin}#HabitOS`);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash))
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');
  }
}
