import { IdbStorage } from '../servicos/idb_storage.js';
import { SessionManager } from '../servicos/session_manager.js';
import { NotaModel } from '../modelos/nota_model.js';

/**
 * Controlador do Bloco de Notas e Senhas Secretas
 */
export class NotesController {
  static #currentNote = null;

  static init() {
    this.setupEvents();
  }

  static async open() {
    const modal = document.getElementById('modal-notes');
    if (modal) modal.classList.add('open');
    this.showListScreen();
    await this.renderNotes();
  }

  static close() {
    const modal = document.getElementById('modal-notes');
    if (modal) modal.classList.remove('open');
  }

  static async renderNotes() {
    const listEl = document.getElementById('notes-list');
    if (!listEl) return;

    const isPanic = SessionManager.isPanicMode();
    const notes = await IdbStorage.getAllNotes(isPanic);

    listEl.innerHTML = '';

    if (notes.length === 0) {
      listEl.innerHTML = `
        <div style="text-align: center; color: var(--os-muted); padding: 50px;">
          Nenhuma nota secreta cadastrada.
        </div>`;
      return;
    }

    notes.forEach((note) => {
      const item = document.createElement('div');
      item.className = 'file-list-item tap-active';
      item.innerHTML = `
        <div class="file-icon-box" style="background: rgba(245, 158, 11, 0.15); color: #f59e0b;">
          📝
        </div>
        <div class="file-info-col">
          <div class="file-name-text">${this.escapeHtml(note.title || 'Sem título')}</div>
          <div class="file-meta-sub">${new Date(note.updatedAt).toLocaleDateString('pt-BR')}</div>
        </div>
        <button class="file-action-btn" title="Excluir">🗑️</button>
      `;

      item.onclick = () => this.openEditor(note);
      item.querySelector('.file-action-btn').onclick = (e) => {
        e.stopPropagation();
        if (confirm('Deseja excluir esta nota secreta?')) {
          IdbStorage.deleteNote(note.id).then(() => this.renderNotes());
        }
      };

      listEl.appendChild(item);
    });
  }

  static openEditor(note = null) {
    this.#currentNote = note;
    const titleInput = document.getElementById('note-title-input');
    const contentInput = document.getElementById('note-body-input');
    if (titleInput && contentInput) {
      titleInput.value = note ? note.title : '';
      contentInput.value = note ? note.content : '';
    }

    document.getElementById('notes-list-view').style.display = 'none';
    document.getElementById('notes-editor-view').style.display = 'block';
  }

  static showListScreen() {
    this.#currentNote = null;
    document.getElementById('notes-list-view').style.display = 'block';
    document.getElementById('notes-editor-view').style.display = 'none';
  }

  static async saveCurrentNote() {
    const titleInput = document.getElementById('note-title-input');
    const contentInput = document.getElementById('note-body-input');
    const title = titleInput ? titleInput.value.trim() : '';
    const content = contentInput ? contentInput.value.trim() : '';

    if (!title && !content) {
      this.showListScreen();
      return;
    }

    const isPanic = SessionManager.isPanicMode();
    const note = this.#currentNote || new NotaModel({ isPanicItem: isPanic });
    note.title = title || 'Sem título';
    note.content = content;
    note.updatedAt = new Date().toISOString();

    await IdbStorage.saveNote(note);
    this.showListScreen();
    await this.renderNotes();
  }

  static setupEvents() {
    const btnBack = document.getElementById('btn-notes-back');
    if (btnBack) {
      btnBack.onclick = () => {
        const editor = document.getElementById('notes-editor-view');
        if (editor && editor.style.display === 'block') {
          this.showListScreen();
        } else {
          this.close();
        }
      };
    }

    const btnNew = document.getElementById('btn-notes-new');
    if (btnNew) btnNew.onclick = () => this.openEditor(null);

    const btnSave = document.getElementById('btn-note-save');
    if (btnSave) btnSave.onclick = () => this.saveCurrentNote();
  }

  static escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}
