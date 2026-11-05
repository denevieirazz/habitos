/**
 * Gerenciador de Armazenamento Local Isolado em IndexedDB
 * Armazena arquivos binários criptografados e metadados no sandbox do navegador
 */
export class IdbStorage {
  static DB_NAME = 'HabitOS_Vault_DB';
  static DB_VERSION = 1;

  static async openDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains('files_meta')) {
          db.createObjectStore('files_meta', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('files_blob')) {
          db.createObjectStore('files_blob', { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains('notes_store')) {
          db.createObjectStore('notes_store', { keyPath: 'id' });
        }
      };

      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  }

  // --- Operações de Arquivos ---

  static async saveFile(meta, encryptedBytes) {
    const db = await this.openDB();
    const tx = db.transaction(['files_meta', 'files_blob'], 'readwrite');

    tx.objectStore('files_meta').put(meta);
    if (encryptedBytes) {
      tx.objectStore('files_blob').put({ id: meta.id, data: encryptedBytes });
    }

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  static async getAllFilesMeta(isPanic = false) {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('files_meta', 'readonly');
      const store = tx.objectStore('files_meta');
      const request = store.getAll();

      request.onsuccess = () => {
        const list = request.result || [];
        // Filtra pelo modo de sessão (Real vs Pânico)
        resolve(list.filter((f) => !!f.isPanicItem === isPanic));
      };
      request.onerror = () => reject(request.error);
    });
  }

  static async getFileBlob(id) {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('files_blob', 'readonly');
      const store = tx.objectStore('files_blob');
      const request = store.get(id);

      request.onsuccess = () => resolve(request.result ? request.result.data : null);
      request.onerror = () => reject(request.error);
    });
  }

  static async updateFileMeta(meta) {
    const db = await this.openDB();
    const tx = db.transaction('files_meta', 'readwrite');
    tx.objectStore('files_meta').put(meta);
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  static async deleteFilePermanently(id) {
    const db = await this.openDB();
    const tx = db.transaction(['files_meta', 'files_blob'], 'readwrite');
    tx.objectStore('files_meta').delete(id);
    tx.objectStore('files_blob').delete(id);
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  // --- Operações de Notas Secretas ---

  static async saveNote(note) {
    const db = await this.openDB();
    const tx = db.transaction('notes_store', 'readwrite');
    tx.objectStore('notes_store').put(note);
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  static async getAllNotes(isPanic = false) {
    const db = await this.openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction('notes_store', 'readonly');
      const request = tx.objectStore('notes_store').getAll();
      request.onsuccess = () => {
        const list = request.result || [];
        resolve(list.filter((n) => !!n.isPanicItem === isPanic));
      };
      request.onerror = () => reject(request.error);
    });
  }

  static async deleteNote(id) {
    const db = await this.openDB();
    const tx = db.transaction('notes_store', 'readwrite');
    tx.objectStore('notes_store').delete(id);
    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
}
