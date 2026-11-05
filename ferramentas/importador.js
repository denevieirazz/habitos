import { ArquivoModel } from '../logica/modelos/arquivo_model.js';
import { CryptoService } from '../logica/servicos/crypto_service.js';
import { IdbStorage } from '../logica/servicos/idb_storage.js';
import { SessionManager } from '../logica/servicos/session_manager.js';

/**
 * Utilitário de Importação de Arquivos com Criptografia em Streaming
 */
export class Importador {
  static triggerFileInput(parentId = null, onComplete = null) {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;

    input.onchange = async (e) => {
      const files = Array.from(e.target.files);
      if (files.length === 0) return;

      const key = SessionManager.getActiveKey();
      if (!key) return;

      const isPanic = SessionManager.isPanicMode();

      for (const file of files) {
        const buffer = await file.arrayBuffer();

        // Criptografa imediatamente na memória RAM com AES-256-GCM
        const encryptedBytes = await CryptoService.encryptBuffer(buffer, key);

        const meta = new ArquivoModel({
          name: file.name,
          isDirectory: false,
          parentId: parentId,
          fileSize: file.size,
          mimeType: file.type || 'application/octet-stream',
          isPanicItem: isPanic
        });

        // Salva os dados cifrados no IndexedDB sandbox
        await IdbStorage.saveFile(meta, encryptedBytes);
      }

      if (onComplete) onComplete();
    };

    input.click();
  }
}
