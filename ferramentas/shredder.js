import { IdbStorage } from '../logica/servicos/idb_storage.js';

/**
 * Triturador Seguro de Dados (Shredder)
 * Sobrescreve blocos binários com ruído e zeros no banco antes de excluir
 */
export class Shredder {
  static async shredFile(id) {
    const db = await IdbStorage.openDB();
    const existing = await IdbStorage.getFileBlob(id);

    if (existing && existing.byteLength > 0) {
      // Passada 1: Sobrescrever com ruído aleatório criptográfico
      const noise = crypto.getRandomValues(new Uint8Array(existing.byteLength));
      const txNoise = db.transaction('files_blob', 'readwrite');
      txNoise.objectStore('files_blob').put({ id, data: noise });
      await new Promise((res) => (txNoise.oncomplete = res));

      // Passada 2: Sobrescrever com zeros
      const zeros = new Uint8Array(existing.byteLength);
      const txZeros = db.transaction('files_blob', 'readwrite');
      txZeros.objectStore('files_blob').put({ id, data: zeros });
      await new Promise((res) => (txZeros.oncomplete = res));
    }

    // Exclusão definitiva de blob e metadados
    await IdbStorage.deleteFilePermanently(id);
  }

  static async shredAllTrash() {
    const allFiles = await IdbStorage.getAllFilesMeta(false);
    const deleted = allFiles.filter((f) => f.isDeleted);
    for (const item of deleted) {
      await this.shredFile(item.id);
    }
  }
}
