import { IdbStorage } from '../logica/servicos/idb_storage.js';
import { CryptoService } from '../logica/servicos/crypto_service.js';
import { SessionManager } from '../logica/servicos/session_manager.js';

/**
 * Gerenciador de Exportação e Restauração de Pacotes .vault Criptografados
 */
export class BackupManager {
  static async exportVault() {
    const backupPassword = prompt('Digite uma senha de proteção para o arquivo de backup:');
    if (!backupPassword) return;

    const isPanic = SessionManager.isPanicMode();
    const filesMeta = await IdbStorage.getAllFilesMeta(isPanic);
    const notes = await IdbStorage.getAllNotes(isPanic);

    const bundle = {
      version: 1,
      createdAt: new Date().toISOString(),
      filesMeta,
      notes,
      filesBlob: {}
    };

    // Coleta os blobs de arquivos em Base64
    for (const f of filesMeta) {
      if (!f.isDirectory) {
        const blob = await IdbStorage.getFileBlob(f.id);
        if (blob) {
          let binary = '';
          for (let i = 0; i < blob.byteLength; i++) {
            binary += String.fromCharCode(blob[i]);
          }
          bundle.filesBlob[f.id] = btoa(binary);
        }
      }
    }

    const jsonStr = JSON.stringify(bundle);
    // Criptografa o pacote inteiro com a senha de backup
    const encryptedBundleBase64 = await CryptoService.encryptString(jsonStr, backupPassword);

    const blobFile = new Blob([encryptedBundleBase64], { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blobFile);
    const a = document.createElement('a');
    a.href = url;
    a.download = `habitos_backup_${Date.now()}.vault`;
    a.click();
    URL.revokeObjectURL(url);
    alert('Backup exportado com sucesso!');
  }

  static triggerRestore() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.vault';

    input.onchange = async (e) => {
      const file = e.target.files[0];
      if (!file) return;

      const password = prompt('Digite a senha com a qual o arquivo .vault foi protegido:');
      if (!password) return;

      try {
        const encryptedBase64 = await file.text();
        const decryptedJson = await CryptoService.decryptString(encryptedBase64, password);
        const bundle = JSON.parse(decryptedJson);

        // Restaura metadados e blobs
        for (const meta of bundle.filesMeta || []) {
          let blobBytes = null;
          if (bundle.filesBlob && bundle.filesBlob[meta.id]) {
            const binary = atob(bundle.filesBlob[meta.id]);
            blobBytes = new Uint8Array(binary.length);
            for (let i = 0; i < binary.length; i++) {
              blobBytes[i] = binary.charCodeAt(i);
            }
          }
          await IdbStorage.saveFile(meta, blobBytes);
        }

        // Restaura notas
        for (const note of bundle.notes || []) {
          await IdbStorage.saveNote(note);
        }

        alert('Backup restaurado com sucesso! Atualize a lista.');
      } catch (err) {
        alert('Erro ao restaurar backup (senha incorreta ou arquivo inválido): ' + err.message);
      }
    };

    input.click();
  }
}
