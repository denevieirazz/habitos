/**
 * Metadados de um Arquivo ou Pasta Criptografada no Mini OS
 */
export class ArquivoModel {
  constructor({
    id = crypto.randomUUID(),
    name,
    isDirectory = false,
    parentId = null,
    fileSize = 0,
    mimeType = 'application/octet-stream',
    category = 'other',
    createdAt = new Date().toISOString(),
    modifiedAt = new Date().toISOString(),
    isDeleted = false,
    isPanicItem = false
  }) {
    this.id = id;
    this.name = name;
    this.isDirectory = isDirectory;
    this.parentId = parentId;
    this.fileSize = fileSize;
    this.mimeType = mimeType;
    this.category = category || ArquivoModel.resolveCategory(name, mimeType);
    this.createdAt = createdAt;
    this.modifiedAt = modifiedAt;
    this.isDeleted = isDeleted;
    this.isPanicItem = isPanicItem;
  }

  static resolveCategory(fileName, mimeType = '') {
    const ext = fileName.split('.').pop().toLowerCase();
    if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'bmp'].includes(ext) || mimeType.startsWith('image/')) {
      return 'image';
    }
    if (['mp4', 'webm', 'mov', 'mkv', 'avi'].includes(ext) || mimeType.startsWith('video/')) {
      return 'video';
    }
    if (['mp3', 'wav', 'ogg', 'm4a', 'aac', 'flac'].includes(ext) || mimeType.startsWith('audio/')) {
      return 'audio';
    }
    if (['pdf', 'txt', 'doc', 'docx', 'xlsx', 'csv', 'json', 'md'].includes(ext) || mimeType.includes('pdf')) {
      return 'document';
    }
    return 'other';
  }
}
