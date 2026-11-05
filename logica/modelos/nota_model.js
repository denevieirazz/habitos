/**
 * Modelo de Nota Secreta Criptografada
 */
export class NotaModel {
  constructor({
    id = crypto.randomUUID(),
    title,
    content,
    createdAt = new Date().toISOString(),
    updatedAt = new Date().toISOString(),
    isPanicItem = false
  }) {
    this.id = id;
    this.title = title;
    this.content = content;
    this.createdAt = createdAt;
    this.updatedAt = updatedAt;
    this.isPanicItem = isPanicItem;
  }
}
